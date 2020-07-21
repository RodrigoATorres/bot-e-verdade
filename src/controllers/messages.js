const mongoose = require('mongoose');
const Message = require('../models/message');
const Sender = require('../models/sender');
const MessageGroup = require('../models/messageGroup');

const gcController = require('./gcProcessing');

const msgsTexts = require('../msgsTexts.json');

exports.replyGroupMessage = async (messageGroup, client, groupInfo) =>{
    if (messageGroup.replyMessage){
        groupInfo.groupParticipants.forEach( async(participant) => {
            partDoc = await Sender.findOne({senderId: participant});
            if (partDoc && partDoc.senderId === groupInfo.senderId){
                await client.sendText(
                    parDoc.senderId,
                    msgsTexts.user.PRE_GRP_REPLY_AUTHOR.join('\n').format(partDoc.name, groupInfo.groupName))
                await client.sendText(
                    parDoc.senderId,
                    messageGroup.replyMessage
                )
            }
            else if (partDoc){
                await client.sendText(
                    parDoc.senderId,
                    msgsTexts.user.PRE_GRP_REPLY.join('\n').format(partDoc.name, groupInfo.groupName)
                );
                await client.sendText(
                    parDoc.senderId,
                    messageGroup.replyMessage
                );
            }
        })
        return true;
    }
    return false;
}

exports.replyPrivateMessage = async (messageGroup, client, senderInfo, isNew) =>{
    if (messageGroup.replyMessage){
        await client.sendText(
            senderInfo.senderId,
            messageGroup.replyMessage
        )
        return true;
    }
    else {
        if (isNew){
            await client.sendText(
                senderInfo.senderId,
                msgsTexts.user.NEW_MSG.join('\n')
                )
        } else{
            await client.sendText(
                senderInfo.senderId,
                msgsTexts.user.UPROCESSED_MSG.join('\n')
            )
        }

        return false;
    }
}

exports.publishReply = async ( messageGroup, client ) =>{
    messageGroup.reportUsers.forEach( (senderInfo) => {
        this.replyPrivateMessage(messageGroup, client, senderInfo)
    });
    messageGroup.reportGroups.forEach( ( groupInfo ) => {
        this.replyPrivateMessage(messageGroup, client, groupInfo)
    });
}

exports.getMessagesTags = async (messageIds) => {
    docs = await Message.find(
        {
            '_id': { $in: 
                messageIds
            }
        },
        ['textTags','mediaMd5s']
    )
    .populate({ path: 'mediaMd5s', select: 'mediaTags' })
    .exec(); 

    tagList = docs.reduce(
        (prev, doc) =>{
            return prev.concat( 
                doc.mediaMd5s ? 
                doc.mediaMd5s.map( elm => elm.mediaTags) : 
                doc.textTags
            );
        },
        []
    )

    return gcController.mergeTagLists(tagList);
}


exports.matchMessageGroup = async (messageIds, createIfNull = false ) => {

    let msgGroup = await MessageGroup.findOne({messages:{$elemMatch:{$all:messageIds}}});
    if (msgGroup){
        return [msgGroup, false];
    }
    else if (createIfNull){
        msgGroup = await MessageGroup.create( { 
            messages: messageIds,
            tags: await this.getMessagesTags(messageIds)
        } );
        return [msgGroup, true];
    }
    return [null, null];
}

exports.matchMessages = async(messageDocs, createIfNull) => {
    let msgIds = [];

    for (doc of messageDocs){
        let msgMatch = await Message.findOne({ textMd5s: doc.textMd5, mediaMd5s: doc.mediaMd5 }).select(['forwardingScores']);
        if (msgMatch){
            msgIds.push(msgMatch._id);
            msgMatch.forwardingScores.push(doc.forwardingScore);
            msgMatch.save()
        }
        else if (createIfNull){
            let newDoc = await Message.create({
                texts: doc.text ? [doc.text]: null,
                textMd5s: doc.text ? [doc.textMd5]: null,
                textTags: doc.text ? [await gcController.getTextTags(doc.text)]: null,
                mediaMd5s: doc.mediaMd5 ? [doc.mediaMd5]: null,
                mediaExtensions: doc.mediaExtension ? [doc.mediaExtension] : null,
                forwardingScores: [doc.forwardingScore],
            });
            msgIds.push(newDoc._id);
        }
        else{
            msgIds.push(null);
        }
    }
    return msgIds;
}
