const wa = require('@open-wa/wa-automate');
const hash = md5 = require('md5');
const path = require('path');


const mime = require('mime-types');
const fs = require('fs');

const Message = require('../../models/message.js');

exports.check_message = async (message,client) => {
    var media_md5 = null;
    var msg_text = null;
    var mediaData;

    if (message.mimetype) {
        mediaData = await wa.decryptMedia(message);
        media_md5 = md5(mediaData);
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
            await client.sendText(message.sender.id, doc.replymessage, message);
        }
        else if(!message.isGroupMsg) {
            await client.sendText(message.sender.id, 'Ainda estamos analisando esse conteudo. Retornaremos em breve.');
        }
        doc.forwardingScores.push(message.forwardingScore);
        doc.reportUsers.push(message.sender.id);
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
            })
            await client.sendText(message.sender.id, 'Ainda estamos analisando esse conteudo. Retornaremos em breve.');
        }
    }
            
    if (message.mimetype) {   
        var filename = `${media_md5}.${mime.extension(message.mimetype)}`;
        console.log('we are here2', filename);
        fs.writeFile(path.join('Media',filename), mediaData, function(err) {
            if (err) {
              return console.log(err);
            }
            console.log('The file was saved!');
          });
    }
    
    //await wa.sendSeen(message.chatId);
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
            await client.sendText(doc.reportUsers[i], 'Oi! Chegamos a conclusao do conteudo enviado: ' + doc.replymessage);
        }
        doc.announced = true;
        await doc.save();
        
    }

}

