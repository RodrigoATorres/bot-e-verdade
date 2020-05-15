const wa = require('@open-wa/wa-automate');
const hash = md5 = require('md5');
const path = require('path');
const msg_helper = require('../helpers/msg_helper')

const mime = require('mime-types');
const fs = require('fs');

const Message = require('../models/message');

async function searchMsg(message){
    var doc = null;
    var mediaData = {};

    if (message.mimetype) {
        doc = await Message.findOne( {mediaKeys: message.mediaKey } )

        if (!doc && !message.isGroupMsg){
            mediaData['content'] = await wa.decryptMedia(message);       
            mediaData['media_md5'] = md5(mediaData['content'] );
            doc = await Message.findOne({mediaMd5: media_md5})
            if (doc){doc.mediaKeys.push(message.mediaKey)};
        }
    }
    else{
        var msg_text = message.body;
        doc = await Message.findOne({text: msg_text})
    }

    return doc, mediaData
}

async function sendReplyMsg(doc, message, client){

    if (doc){
        if (doc.replymessage){
            var destinatary = (message.isGroupMsg) ? (message.chat.id) : (message.sender.id);
            await client.sendText(destinatary, msg_helper.genReply(doc.veracity,doc.replymessage));
        }
        else if(!message.isGroupMsg) {
            await client.sendText(message.sender.id, 'Ainda estamos analisando esse conteúdo. Retornaremos em breve.');
        }
    }
    else{
        if (!message.isGroupMsg){
            await client.sendText(message.sender.id, 'É a primeira vez que recebemos esse conteúdo. Retornaremos em breve, obrigado pelo envio!');
        }

    }

}


async function updateMsgsDatabase(doc, message, mediaData){

    if (doc){
        if(!doc.replymessage && !doc.reportUsers.includes(message.sender.id)){
            doc.reportUsers.push(message.sender.id);
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
                reportUsers:[message.sender.id],
                forwardingScores:[message.forwardingScore],
                medialink: 'http://s1.tuts.host/wamedia/' + `${mediaData['media_md5']}.${mime.extension(message.mimetype)}`,
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
    var doc, mediaData = await searchMsg(message);
    sendReplyMsg(doc, message, client);
    updateMsgsDatabase(doc,message,mediaData);    
    await client.sendSeen(message.chatId);
}

exports.check_reports = async (client) => {
    
    console.log('passei aqui ferao');
    const docs = await Message.find({
          replymessage: { $exists: true },
          announced: false
        });
    
    for (const doc of docs){
        console.log('entrei');
        for (const index in doc.reportUsers){
            await client.sendText(doc.reportUsers[index], msg_helper.genReply(doc.veracity,doc.replymessage));
        }
        doc.announced = true;
        await doc.save();
        
    }

}

exports.intro = async (message, client) => {
    await client.sendSeen(message.chatId);
    await client.sendText(message.sender.id, 'Olá, o É Verdade analisa somente mensagens encaminhadas e diz se é fake ou não! Se for a primeira vez que vemos a mensagem, pode demorar um pouquinho... Mas retornaremos!');
        
}