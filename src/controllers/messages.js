const Message = require('../models/message');
const MessageGroup = require('../models/messageGroup');

const sendersController = require('./senders')
const gcController = require('./gcProcessing');
const msgsTexts = require('../msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


exports.sendMultiMessage = async (client, chatId, msgs, delay = 2000) => {
    for (let msg of msgs){
        await client.sendText(chatId, msg);
        await sleep(delay)
    }
}

exports.genTopicInfo = (topic_id) =>{
    return msgsTexts.user.TOPIC_INFO.join('\n').format(`${process.env.DISCOURSE_API_URL}/t/${topic_id}`)
}

exports.sendTopicInfo = async (client, senderId, topic_id) =>{
    return await client.sendText( senderId, this.genTopicInfo(topic_id) );
}

exports.genPreGrpReplyMessage = (groupInfo, userObj) =>{
    if (userObj.senderId === groupInfo.senderId){
        return msgsTexts.user.PRE_GRP_REPLY_AUTHOR.join('\n').format(userObj.name, groupInfo.groupName)
    }
    else{
        return msgsTexts.user.PRE_GRP_REPLY.join('\n').format(userObj.name, groupInfo.groupName)
    }
}

exports.replyGroupMessage = async (messageGroup, client, groupInfo) =>{
    if (messageGroup.replyMessage){
        groupInfo.groupParticipants.forEach( async(userId) => {
            let userObj = await sendersController.getSubscribedUser(userId);
            if (userObj){
                let msgs = [];
                msgs.push(this.genPreGrpReplyMessage(groupInfo, userObj));
                msgs.push(messageGroup.replyMessage);
                msgs.push(this.genTopicInfo(messageGroup.discourseId));
                this.sendMultiMessage(client, userId, msgs)
            }
        })
        return true;
    }
    return false;
}

exports.replyPrivateMessage = async (messageGroup, client, senderInfo, isNew) =>{
    let msgs = []
    if (isNew){
        msgs.push(msgsTexts.user.NEW_MSG.join('\n'))
    }
    else{
        if (messageGroup.replyMessage){
            msgs.push( messageGroup.replyMessage )
        }
        else {
            msgs.push(msgsTexts.user.UPROCESSED_MSG.join('\n'));
        }
        msgs.push( this.genTopicInfo(messageGroup.discourseId) )
    }

    this.sendMultiMessage(client,senderInfo.senderId,msgs)

    return Boolean(messageGroup.replyMessage)
}


const organizeReportData = (reportUsers, reportGroups) =>{
    const allReportData = {};
    for (let reportUser of reportUsers){
        allReportData[reportUser.senderId] = {receivGroups:[], sentGroups:[], private:true};
    }

    for (let group of reportGroups){
        for (let participant of group.groupParticipants){
            if (!Object.keys(allReportData).includes(participant)){
                allReportData[participant] = {receivGroups:[], sentGroups:[], private:false}
            }
            if (group.senderId === participant){
                allReportData[participant].sentGroups.push(group.groupName);
            }
            else{
                allReportData[participant].receivGroups.push(group.groupName);
            }
        }
    }

    return allReportData;
}

exports.genPrePublishMessage = (reportData, userName) => {
    let grp_info = [];
    let lines = [];

    if (reportData.private){
        grp_info.push(msgsTexts.user.MSG_LIST_PRIVATE_SENT.join('\n'));
    }

    if (reportData.sentGroups.length > 0){
        grp_info.push( 
            msgsTexts.user.MSG_LIST_GRP_SENT.join('\n').format(reportData.sentGroups.join('; '))
        );
    }
    if (reportData.receivGroups.length > 0){
        grp_info.push( 
            msgsTexts.user.MSG_LIST_GRP_RECEIVED.join('\n').format(reportData.receivGroups.join('; '))
        );
    }

    lines.push(
        grp_info.length > 1
        ?
        msgsTexts.user.PRE_PUBLISH_MSG_1.join('\n').format(
            userName,
            grp_info.slice(0, -1).join(', ')+ ` ${msgsTexts.general.AND} ` + grp_info.slice(-1)
        )
        :
        msgsTexts.user.PRE_PUBLISH_MSG_1.join('\n').format(
            userName,
            grp_info[0]
        )
    )

    if (reportData.private){
        lines.push(msgsTexts.user.PRE_PUBLISH_MSG_2.join('\n'));
    }
    else{
        lines.push(msgsTexts.user.PRE_PUBLISH_MSG_2_NO_PRIVATE_MSG.join('\n'));
    }

    return lines.join('\n');
}

exports.publishReply = async ( messageGroup, client ) =>{

    let publishToUser = async (userId) => {
        let userObj = await sendersController.getSubscribedUser(userId);
        if (userObj){
            await client.sendText( 
                userId,
                this.genPrePublishMessage(allReportData[userId], userObj.name)
            );
            await sleep(2500);
            await client.sendText( userId, messageGroup.replyMessage );
        }
    }

    let allReportData = organizeReportData(messageGroup.reportUsers, messageGroup.reportGroups);
    for (let user of Object.keys(allReportData)){
        publishToUser(user)
    }

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
    let msgGroup = await MessageGroup.findOne({messages:{ $all:messageIds}});

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
