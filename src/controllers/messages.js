const wa = require('@open-wa/wa-automate');
const hash = md5 = require('md5');
const path = require('path');
const msg_helper = require('../helpers/msg_helper')

const mime = require('mime-types');
const fs = require('fs');

const Message = require('../models/message');

exports.check_message = async (message,client) => {
    var media_md5 = null;
    var msg_text = null;
    var mediaData;
    var mediaLink = null;
    
    var doc = null
    if (message.mimetype) {
        doc = await Message.findOne( {mediaKeys: message.mediaKey } )

        if (!doc && !message.isGroupMsg){
            console.log('to aqui')
            mediaData = await wa.decryptMedia(message);       
            media_md5 = md5(mediaData);
            mediaLink = 'http://s1.tuts.host/wamedia/' + `${media_md5}.${mime.extension(message.mimetype)}`;
            doc = await Message.findOne({mediaMd5: media_md5})
            if (doc){doc.mediaKeys.push(message.mediaKey)};
        }
    }
    else{
        msg_text = message.body;
        doc = await Message.findOne({text: msg_text})
    }

    if (doc){
        if (doc.replymessage){
            var destinatary = (message.isGroupMsg) ? (message.chat.id) : (message.sender.id);
            await client.reply(destinatary,
                               msg_helper.genReply(doc.veracity,doc.replymessage),
                               message);
        }
        else if(!message.isGroupMsg) {
            await client.sendText(message.sender.id, 'Ainda estamos analisando esse conteúdo. Retornaremos em breve.');
        }

        if(!doc.reportUsers.find(elmt => elmt['userId'] === message.sender.id)){
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
                text: msg_text,
                mediaMd5: media_md5,
                mediaMime: message.mimetype,
                timesReceived: 1,
                reportUsers:{userId: message.sender.id,
                             msgId: message.id},
                forwardingScores:[message.forwardingScore],
                medialink: mediaLink,
            })
            await client.sendText(message.sender.id, 'É a primeira vez que recebemos esse conteúdo. Retornaremos em breve, obrigado pelo envio!');

            if (message.mimetype) {   
                var filename = `${media_md5}.${mime.extension(message.mimetype)}`;
                fs.writeFile(path.join('Media',filename), mediaData, function(err) {
                    console.log(path.join('Media',filename));
                    if (err) {
                      return console.log(err);
                    }
                    console.log('The file was saved!');
                  });
            }
        }
    }
    
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
            console.log(doc.reportUsers)
            await client.reply(doc.reportUsers[index]['userId'], 'msg_helper.genReply(doc.veracity,doc.replymessage)', doc.reportUsers[index]['msgId']);
        }
        doc.announced = true;
        await doc.save();
        
    }

}

exports.intro = async (message, client) => {
    await client.sendSeen(message.chatId);
    await client.sendText(message.sender.id, 'Olá, o É Verdade analisa somente mensagens encaminhadas e diz se é fake ou não! Se for a primeira vez que vemos a mensagem, pode demorar um pouquinho... Mas retornaremos!');
        
}

