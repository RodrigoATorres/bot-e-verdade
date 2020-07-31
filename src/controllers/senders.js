const Sender = require('../models/sender');
const msgsTexts = require('../msgsTexts.json');
const {default: PQueue} = require('p-queue');
 
const queue = new PQueue({concurrency: 1});


function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }   

const sendIntroduction = async (sender, client) =>{
    await client.sendText( sender.senderId, msgsTexts.user.INTRO_MSG.join('\n').format(sender.name) )
}

exports.getSubscribedUser = async (senderId) => {
    return await Sender.findOne({senderId: senderId, subscribed:true});
}

const registerSender = async (message, client) =>{
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
        sender = await queue.add(async () =>{return await registerSender(message,client)})
    }
}

exports.subscribeUser = async function (senderId, client){
    await Sender.update({senderId}, {subscribed:true});
    await client.sendText(senderId, msgsTexts.user.SUBSCRIBED.join('\n'))
}

exports.unsubscribeUser = async function (senderId, client){
    await Sender.update({senderId}, {subscribed:false});
    await client.sendText(senderId, msgsTexts.user.UNSUBSCRIBED.join('\n'))
}