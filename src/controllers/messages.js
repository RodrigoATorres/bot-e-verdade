const wa = require('@open-wa/wa-automate');
const hash = md5 = require('md5');
const path = require('path');
const msg_helper = require('../helpers/msg_helper')

const mime = require('mime-types');
const fs = require('fs');

const Message = require('../models/message');

const msgsTexts = require('../msgsTexts.json');

const urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;


function urlify(text) {
    return text.match(urlRegex, function(url) {
        return url;
    });
}

async function searchMsg(message){
    var doc = null;
    var mediaData = {};

    if (message.mimetype) {
        doc = await Message.findOne( {mediaKeys: message.mediaKey } )

        if (!doc && !message.isGroupMsg){
            mediaData['content'] = await wa.decryptMedia(message);       
            mediaData['media_md5'] = md5(mediaData['content'] );
            doc = await Message.findOne({mediaMd5: mediaData['media_md5']})
            // if (doc){doc.mediaKeys.push(message.mediaKey)};
        }
    }
    else{
        var msg_text = message.body;
        var urls = urlify(msg_text);
        if (urls){
            //doc = await Message.findOne({all_url: urls}); // evitei um loop com consulta na DB pois se a mensagem for igual, o url[0] tbm será... mas deixei model  como array para futuro
            mediaData['urls'] = urls;
        }
        doc = await Message.findOne({text: msg_text});
        
    }
    return [doc, mediaData]
}

async function sendReplyMsg(doc, message, client){

    if (doc){
        if (doc.replymessage){
            var destinatary = (message.isGroupMsg) ? (message.chat.id) : (message.sender.id);
            await client.sendText(destinatary, msgsTexts.replies[doc.veracity].join('\n').format(doc.replymessage));
        }
        else if(!message.isGroupMsg) {
            await client.sendText(message.sender.id, msgsTexts.user.UPROCESSED_MSG.join('\n'));
        }
    }
    else{
        if (!message.isGroupMsg){
            await client.sendText(message.sender.id, msgsTexts.user.NEW_MSG.join('\n'));
        }

    }

}


async function updateMsgsDatabase(doc, message, mediaData){

    if (doc){
        if(!doc.replymessage && !doc.reportUsers.includes(message.sender.id)){
            doc.reportUsers.push({userId: message.sender.id,
                                  msgId: message.id});
        }
        doc.forwardingScores.push(message.forwardingScore);
        doc.update( { $inc: {timesReceived:1}});
        doc.save();
    }
    else{
        if (!message.isGroupMsg){
            Message.create({
                text:  message.body,
                mediaMd5: mediaData['media_md5'],
                mediaMime: message.mimetype,
                timesReceived: 1,
                reportUsers:[{userId: message.sender.id,
                              msgId: message.id}],
                forwardingScores:[message.forwardingScore],
                medialink: 'http://s1.tuts.host/wamedia/' + `${mediaData['media_md5']}.${mime.extension(message.mimetype)}`,
                all_url: mediaData['urls'],
            })

            if (message.mimetype) {   
                var filename = `${mediaData['media_md5']}.${mime.extension(message.mimetype)}`;
                fs.writeFile(path.join('Media',filename), mediaData['content'], function(err) {
                    console.log(path.join('Media',filename));
                    if (err) {
                      return console.log(err);
                    }
                    console.log('The file was saved!');
                  });
            }
        }
    }

}

exports.check_message = async (message,client) => {  
    var [doc, mediaData] = await searchMsg(message);
    sendReplyMsg(doc, message, client);
    updateMsgsDatabase(doc,message,mediaData);    
    await client.sendSeen(message.chatId);
}

exports.check_reports = async (client) => {
    
    console.log('RUNNNING CHECK REPORTS');
    const docs = await Message.find({
          replymessage: { $exists: true },
          announced: false
        });
    
    for (const doc of docs){
        console.log('ANNOUNCING REPLIES');
        for (const index in doc.reportUsers){
            await client.sendText(doc.reportUsers[index], msgsTexts.replies[doc.veracity].join('\n').format(doc.replymessage));
        }
        doc.announced = true;
        await doc.save();
        
    }

}

exports.intro = async (message, client) => {
    await client.sendSeen(message.chatId);
    await client.sendText(message.sender.id, msgsTexts.user.INTRO_MSG.join('\n') );
        
}