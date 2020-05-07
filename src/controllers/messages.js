const wa = require('@open-wa/wa-automate');
const hash = md5 = require('md5');
const path = require('path');


const mime = require('mime-types');
const fs = require('fs');

const Message = require('../models/message');

exports.check_message = async (message,client) => {
    var media_md5 = null;
    var msg_text = null;
    var mediaData;
    var mediaLink = null;
    
    if (message.mimetype) {
        mediaData = await wa.decryptMedia(message);
        media_md5 = md5(mediaData);
        mediaLink = 'http://s1.tuts.host/wamedia/' + `${media_md5}.${mime.extension(message.mimetype)}`;
    }
    else{
        msg_text = message.body;
    }

    var doc = await Message.findOne(
            {mediaMd5: media_md5,
            text: msg_text,
            }
        )

    if (doc){
        if (doc.replymessage){
            var destinatary = (message.isGroupMsg) ? (message.chat.id) : (message.sender.id);
            await client.reply(destinatary, doc.replymessage, message);
        }
        else if(!message.isGroupMsg) {
            await client.sendText(message.sender.id, 'Ainda estamos analisando esse conteúdo. Retornaremos em breve.');
        }
        if(!doc.reportUsers.includes(message.sender.id)){
            doc.reportUsers.push(message.sender.id);
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
                reportUsers:[message.sender.id],
                forwardingScores:[message.forwardingScore],
                medialink: mediaLink,
            })
            await client.sendText(message.sender.id, 'É a primeira vez que recebemos esse conteúdo. Retornaremos em breve, obrigado pelo envio!');
        }
    }
            
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
            await client.sendText(doc.reportUsers[index], 'Oi! Chegamos a conclusao do conteudo enviado: ' + doc.replymessage);
        }
        doc.announced = true;
        await doc.save();
        
    }

}

exports.intro = async (message, client) => {
    await client.sendSeen(message.chatId);
    await client.sendText(message.sender.id, 'Olá, o É Verdade analisa somente mensagens encaminhadas e diz se é fake ou não! Se for a primeira vez que vemos a mensagem, pode demorar um pouquinho... Mas retornaremos!');
        
}

