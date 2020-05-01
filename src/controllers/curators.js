const wa = require('@open-wa/wa-automate');
const hash = md5 = require('md5');
const path = require('path');


const mime = require('mime-types');
const fs = require('fs');

const Message = require('../../models/message.js');
const Curators = require('../../models/curators.js');

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
        else if(message.body == '#resposta'){
            var replyText = message.body.slice(0,9);
            if(replyText.length > 3){
                
                cura.underreview.replytext = replyText;
                cura.underreview.announced = false;
                cura.underreview.save();
                cura.messagessolved.push(cura.underreview);
                cura.underreview = null;
                cura.save();
            }
        }
    }
    await client.sendSeen(message.chatId);
}

