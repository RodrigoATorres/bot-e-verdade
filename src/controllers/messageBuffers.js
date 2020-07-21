const wa = require('@open-wa/wa-automate');
const hash = require('md5');
const mime = require('mime-types');
const path = require('path');
const fs = require('fs');

const logger = require('../helpers/logger');

const Media = require('../models/media');
const MessageBuffer = require('../models/messageBuffer');

const messagesController = require('./messages');
const discourseController = require('./discourse');
const gcController = require('./gcProcessing');

const msgsTexts = require('../msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getMediaLink = (md5, mimetype) =>{
    return `${process.env.MEDIA_FOLDER_URL}/${md5}.${mime.extension(mimetype)}`;
}

const saveImage = async( content, md5, mimetype ) =>{
    const eofBuf = Buffer.from([0xFF, 0xD9]);

    var filename = `${md5}.${mime.extension(mimetype)}`;
    fs.writeFile(path.join('Media',filename), Buffer.concat([content,eofBuf]), function(err) {
        if (err) {
          return logger.error(err);
        }
        logger.info(`File ${path.join('Media',filename)} saved!`);
    });
}

const getMd5 = async( message, downloadMedia = false, processMedia = false) => {
    let doc = await  Media.findOne({mediaKeys: message.mediaKey}).select('_id');
    if (doc){
        return doc._id;
    }
    else if (downloadMedia){
        let content = await wa.decryptMedia(message);
        let md5 = hash(content);

        doc = await Media.findOne({_id:md5});
        if (doc){
            doc.mediaKeys.push(md5)
            doc.save()
        }
        else{
            let text = null, tags  = null;
            await saveImage(content, md5, message.mimetype);
            await sleep(2000);
            if (processMedia){
                [text, tags] = await gcController.getMediaInfo(md5, message.mimetype);
            }

            Media.create({
                _id: md5,
                mediaKeys: [message.mediaKey],
                mediaMime: message.mimetype,
                mediaLink: getMediaLink(md5, message.mimetype),
                mediaText:text,
                mediaTags:tags,
            })
        }
        return md5;
    }
}

const setAsProcessing = async (docs) =>{
    for (let doc of docs){
        doc.processing = true;
        await doc.save();
    }
}

const processGroup = async (group, client) =>{
    logger.info(`Started processing buffer group from ${group._id.senderId} at ${group._id.chatId}`);

    let docs = await MessageBuffer.find({
        chatId: group._id.chatId,
        senderId: group._id.senderId,
        warningSent: group._id.warningSent,
    });

    await setAsProcessing(docs);

    let msgIds = await messagesController.matchMessages(docs, !group.isGroupMsg);
    let [grpObj, isNew] = await messagesController.matchMessageGroup( msgIds, !group.isGroupMsg);

    if (group.isGroupMsg){
        await messagesController.replyGroupMessage(
            grpObj,
            client,
            {
                groupParticipants: docs[0].groupParticipants,
                groupName: docs[0].groupName,
                senderId: docs[0].senderId
            }
        );
        grpObj.reportGroups.push({
            groupParticipants: docs[0].groupParticipants,
            groupName: docs[0].groupName,
            senderId: docs[0].senderId
        });
    }
    else{
        await messagesController.replyPrivateMessage(
            grpObj,
            client,
            {senderId:docs[0].senderId ,msgId:docs[0].messageId},
            isNew
        );
        grpObj.reportUsers.push({senderId:docs[0].senderId ,msgId:docs[0].messageId});
    }
    await grpObj.save()

    if (isNew){
        discourseController.addMessage(grpObj)
        .then( (topic_id) =>{
            messagesController.sendTopicInfo(client, docs[0].senderId, topic_id)
        }
        );
    }

    docs.forEach(async (doc) => await doc.remove())

    logger.info(`Finished processing buffer group from ${group._id.senderId} at ${group._id.chatId}`);
}

exports.processBuffer = async (client) => {
    let groups = await MessageBuffer.aggregate(
        [
            {$match:
                {processing: false}
            }, 
            {$group:{
                _id:{chatId:'$chatId',senderId:'$senderId', warningSent:'$warningSent'},
                count: {$sum:1},
                last:{ $max: '$createdAt'},
                isGroupMsg: {$first: '$isGroupMsg'},
            }}
        ]
    )
    
    groups.forEach( async group =>{
        if (( Date.now() - group.last ) > 8000){
            processGroup(group, client);
        }
        else if (( Date.now() - group.last ) > 5000){
            if (group.isGroupMsg){
                processGroup(group, client);
            }
            else if (group.count ==1){
                processGroup(group, client);
            }
            else if (group.count >1 && !group._id.warningSent){
                client.sendText(group._id.senderId, msgsTexts.user.GROUP_MSG_WARNING.join('\n').format(group.count))
                await MessageBuffer.updateMany(
                    {warningSent: false},
                    {"$set": {warningSent: true}},
                )
            }
        }
    }
    )
}

exports.addMessage = async (message,client) => {
    let downloadMedia = !message.isGroupMsg;
    let mediaMd5 = message.mimetype ? await getMd5(message, downloadMedia, downloadMedia) : null;
    let mediaExtension = message.mimetype ? mime.extension(message.mimetype) : null;
    let text = message.mimetype ? null : message.content;
    let textMd5 = message.mimetype ? null : hash(text);
    let groupParticipants = message.isGroupMsg ? message.chat.groupMetadata.participants.reduce((prv, cur) => {prv.push(cur.id);return prv},[]) : null
    let groupName = message.isGroupMsg ? message.chat.name : null

    MessageBuffer.create({
        text,
        textMd5,
        mediaMd5,
        mediaExtension,
        forwardingScore: message.forwardingScore,
        senderId: message.sender.id,
        chatId: message.chatId,
        isGroupMsg: message.isGroupMsg,
        groupParticipants,
        groupName,
        messageId: message.id,
        msgTimestamp: message.timestamp,
    });
    client.sendSeen(message.chatId);
}