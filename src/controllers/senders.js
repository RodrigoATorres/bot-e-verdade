const Senders = require('../models/sender');
const msgsTexts = require('../msgsTexts.json');

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }   

sendIntroduction = async (sender, client) =>{
    await client.sendText( sender.senderId, msgsTexts.user.INTRO_MSG.join('\n').format(sender.name) )
}

exports.registerSender = async function (message, client){

    let sender = await Senders.findOne(
        {senderid: message.sender.id
        }
    )
    try{
        if (!sender && !message.isGroupMsg){
            sender = await Senders.create({
                senderId:  message.sender.id,
                name: message.sender.pushname
            });
            sendIntroduction(sender, client);
        }
    }
    catch{
        await sleep(100);
        sender = await Senders.findOne(
            {
                senderid: message.sender.id
            }
        )
    }
    message.bot.sender = sender;

}