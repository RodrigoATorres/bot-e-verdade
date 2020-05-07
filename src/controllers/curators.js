const wa = require('@open-wa/wa-automate');
const hash = md5 = require('md5');
const path = require('path');


const mime = require('mime-types');
const fs = require('fs');

const Message = require('../models/message');
const Curators = require('../models/curators');

exports.execute_command = async (message,client) => {
    
    var cura = await Curators.findOne(
            {curatorid: message.sender.id
            }
        )
    if(cura){
        if(message.body == '#manda'){
            var doc = await Message.findOne(
                {replymessage: null
                }
            )
            if(doc){
                await client.sendText(message.sender.id, 'Quando obter a resposta, digite: #resposta <explicação>. Medialink: ' + doc.medialink);
                await client.sendText(message.sender.id, 'Texto: ' + doc.text);
                cura.underreview = doc;
                cura.save();
            }
        }
        else if(message.body.slice(0,9) == '#resposta'){
            var replyText = message.body.slice(10);
            if(replyText.length > 3){
                cura.populate('underreview');
                var doc = await Message.findOne(
                    {_id: cura.underreview._id
                    }
                )
                if(doc){
                    doc.replymessage = replyText;
                    doc.announced = false;
                    doc.save();
                    cura.messagessolved.push(cura.underreview);
                    cura.underreview = null;
                    cura.save();
                    await client.sendText(message.sender.id, 'Mensagem salva. Obrigado pela ajuda!');
                }
            }
        }
    }
    await client.sendSeen(message.chatId);
}

