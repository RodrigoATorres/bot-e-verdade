const Sender = require('../models/sender');
const msgsTexts = require('../msgsTexts.json');
const {default: PQueue} = require('p-queue');
 
const registerQueue = new PQueue({concurrency: 1});
const notifyQueue = new PQueue({concurrency: 1});

const discourseController = require('./discourse');

const sendIntroduction = async (sender, client) =>{
    await client.sendText( sender.senderId, msgsTexts.user.INTRO_MSG.join('\n').format(sender.name) )
}

exports.createDiscourseSender = async(discourseUserName) => {
    let senderObj = await Sender.create(
        {
            senderId: 'DISC_' + Date.now().toString() + Math.random().toString(36),
            discourseUserName
        }
    )
    return senderObj
    }

exports.incrementRepyCount = async (discourseUserName) => {
    let senderObj = await Sender.findOne({discourseUserName});
    if (!senderObj){
        senderObj = await this.createDiscourseSender(discourseUserName);
    }
    if (senderObj) {
        senderObj.acceptedRepliesCount = senderObj.acceptedRepliesCount + 1;
        await senderObj.save()
    }
}

exports.notifyOnlyForwarded = async (senderId, client) =>{
    await notifyQueue.add(async () =>{
        let senderObj = await Sender.findOne({senderId: senderId});
        if (
            senderObj && (
                senderObj.lastOnlyForwardedNorify &&(senderObj.lastOnlyForwardedNorify + 10000 < Date.now())
                || !senderObj.lastOnlyForwardedNorify
            )){
            await client.sendText( senderObj.senderId, msgsTexts.user.FORWARDED_ONLY_MSG.join('\n').format(senderObj.name) );
            senderObj.lastOnlyForwardedNorify = Date.now();
            await senderObj.save();
        }
    })
}

exports.getSubscribedUser = async (senderId) => {
    return await Sender.findOne({senderId: senderId, subscribed:true});
}

const registerSenderQueue = async (message, client) =>{
    let sender = await Sender.findOne(
        {senderId: message.sender.id}
    )
    if (!sender){
        sender = await Sender.create({
            senderId:  message.sender.id,
            name: message.sender.pushname
        });
        sendIntroduction(sender, client);
    }
    return sender
}

exports.registerSender = async function (message, client){

    let sender = await Sender.findOne(
        {senderId: message.sender.id}
    )
    if (!sender && !message.isGroupMsg){
        sender = await registerQueue.add(async () =>{return await registerSenderQueue(message,client)})
    }
}

exports.subscribeUser = async function (senderId, client){
    await Sender.updateOne({senderId}, {subscribed:true});
    await client.sendText(senderId, msgsTexts.user.SUBSCRIBED.join('\n'))
}

exports.unsubscribeUser = async function (senderId, client){
    await Sender.updateOne({senderId}, {subscribed:false});
    await client.sendText(senderId, msgsTexts.user.UNSUBSCRIBED.join('\n'))
}

exports.confirmLinkDiscourseAccount = async function (senderId, confirmCode, client) {
    let senderObj = await Sender.findOne({senderId});
    let confirmReq = senderObj.discourLinkRequest;
    if (confirmReq && confirmReq.confirmCode === confirmCode && confirmReq.expiration > Date.now()){
        let senderObjDiscourseOnly = await Sender.findOne({discourseUserName: confirmReq.userName});
        if (senderObjDiscourseOnly){
            senderObj.acceptedRepliesCount = senderObjDiscourseOnly.acceptedRepliesCount;
            senderObjDiscourseOnly.remove();
        }
        senderObj.discourseUserName = confirmReq.userName
        await senderObj.save();
        await client.sendText(senderId, msgsTexts.user.LINK_DISCOURSE_WPP_SUCCESS.join('\n'))
    } else{
        await client.sendText(senderId, msgsTexts.user.LINK_DISCOURSE_WPP_FAIL.join('\n'))
    }
}

exports.linkDiscourseAccount = async function (senderId, userName, client) {
    let confirmCode = Math.random().toString(36).substr(2, 5);
    let senderObj = await Sender.findOne({senderId});
    senderObj.discourLinkRequest = {
        userName:userName,
        confirmCode,
        expiration: Date.now() + 60000
    }

    discourseController.sendPrivateMessage(
        [userName],
        msgsTexts.user.LINK_DISCOURSE_WPP_CODE_TITLE.join('\n'),
        msgsTexts.user.LINK_DISCOURSE_WPP_CODE.join('\n').format(
            senderId,
            `${msgsTexts.commands.LINK_DISCOURSE_CODE_CMD[0]} ${confirmCode}`
        )
        )
    senderObj.save()

    await client.sendText(senderId, msgsTexts.user.LINK_DISCOURSE_WPP_INFO.join('\n'))
}

exports.addLastTopicId = async function(senderId, topicId){
    await Sender.updateOne({senderId: senderId}, {lastTopicId: topicId});
}