const Message = require('../models/message');
const Sender = require('../models/sender');
const MessageGroup = require('../models/messageGroup');

const gcController = require('./gcProcessing');
const msgsTexts = require('../msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

exports.sendTopicInfo = async (client, senderId, topic_id) =>{
    await client.sendText(
        senderId,
        msgsTexts.user.TOPIC_INFO.join('\n').format(`${process.env.DISCOURSE_API_URL}/t/${topic_id}`)
    );
}

exports.replyGroupMessage = async (messageGroup, client, groupInfo) =>{
    if (messageGroup.replyMessage){
        groupInfo.groupParticipants.forEach( async(participant) => {
            let partDoc = await Sender.findOne({senderId: participant});
            if (partDoc && partDoc!=null){
                if (partDoc.senderId === groupInfo.senderId){
                    await client.sendText(
                        partDoc.senderId,
                        msgsTexts.user.PRE_GRP_REPLY_AUTHOR.join('\n').format(partDoc.name, groupInfo.groupName))
                    await sleep(2000);
                }
                else {
                    await client.sendText(
                        partDoc.senderId,
                        msgsTexts.user.PRE_GRP_REPLY.join('\n').format(partDoc.name, groupInfo.groupName)
                    );
                    await sleep(2000);
                }
                
                await client.sendText(
                    partDoc.senderId,
                    messageGroup.replyMessage
                );
                await sleep(2000);
                await this.sendTopicInfo(
                    client,
                    partDoc.senderId,
                    messageGroup.discourseId
                )
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
        await sleep(2000);
        await this.sendTopicInfo(
            client,
            senderInfo.senderId,
            messageGroup.discourseId
        )
        await sleep(2000);
        return true;
    }
    else {
        if (isNew){
            await client.sendText(
                senderInfo.senderId,
                msgsTexts.user.NEW_MSG.join('\n')
                )
            await sleep(2000);
        } else{
            await client.sendText(
                senderInfo.senderId,
                msgsTexts.user.UPROCESSED_MSG.join('\n')
            )
            await sleep(2000);
            await this.sendTopicInfo(
                client,
                senderInfo.senderId,
                messageGroup.discourseId
            )
        }

        return false;
    }
}

exports.publishReply = async ( messageGroup, client ) =>{
    messageGroup.reportUsers.forEach( (senderInfo) => {
        this.replyPrivateMessage(messageGroup, client, senderInfo)
    });

    await sleep(10000);

    messageGroup.reportGroups.forEach( ( groupInfo ) => {
        this.replyGroupMessage(messageGroup, client, groupInfo)
    });
}

exports.getMessagesTags = async (messageIds) => {
    let docs = await Message.find(
        {
            '_id': { $in: 
                messageIds
            }
        },
        ['textTags','mediaMd5s']
    )
    .populate({ path: 'mediaMd5s', select: 'mediaTags' })
    .exec(); 

    let tagList = docs.reduce(
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

    for (let doc of messageDocs){
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
