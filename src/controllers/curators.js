const wa = require('@open-wa/wa-automate');
const hash = md5 = require('md5');
const path = require('path');
const msg_helper = require('../helpers/msg_helper')

const mime = require('mime-types');
const fs = require('fs');

const Message = require('../models/message');
const Curators = require('../models/curators');

exports.sendStatusAll = async (client) => {
    var all_cura = await Curators.find({}).select('curatorid -_id');
    for (cura of all_cura){
        getStatus(cura['curatorid'], client)
    }
}

async function getStatus(receiver_id,client){
    total_msgs = await Message.countDocuments({});
    noreply_msgs = await Message.countDocuments({replymessage: null})

    var start = new Date() - 7;
    week_total_mesgs = await Message.countDocuments({createdAt: { '$gte': start}});

    await client.sendText(receiver_id, ['--------------------------------------------',
                                              '-------------- *É Verdade* --------------',
                                              '--------------------------------------------',
                                              'Olá, muito obrigado pela sua ajuda!',
                                              `Recebemos até hoje um total de *${total_msgs} mensagens!*`,
                                              `E já *revisamos ${total_msgs - noreply_msgs}*!`,
                                              `Nos últimos *7 dias* recebemos *${week_total_mesgs}*!`,
                                              '',
                                              `Ainda *precisamos da sua ajuda* para revisar as *${noreply_msgs} mensagens* que faltam!!!`].join('\n'));
}

exports.getStatus = getStatus

exports.execute_command = async (message,client) => {
    
    async function sendHelp(){
        await client.sendText(message.sender.id,
            ['Obrigado por colaborar com o É VERDADE.',
            'Esses são os comandos que você pode utilizar:',
            '   *#manda*',
            '   *#diretizes*',
            '   *#status*'].join('\n')
        );
    }

    async function sendGuidelines(){
        await client.sendText(message.sender.id, msg_helper.genGuidelines());
    }

    async function sendForReview(){
        var doc = await Message.findOne(
            {replymessage: null,
             _id: {"$nin": cura.messagesBlackList}
            }
        )
        if(doc){
            await client.sendText(message.sender.id, ['Olá, estamos precisando que você revise a mensagem',
                                                      doc.medialink ? `com a seguinte mídia:\n${doc.medialink}\n` : '',
                                                      doc.text ? `com o seguinte texto:\n${doc.text}` : ''
                                                      ].join(''));
            await client.sendText(message.sender.id, 'Quando terminar de revisar, por favor me mande a seguinte mensagem, preenchendo os campos indicados:');
            await client.sendText(message.sender.id, ['#resposta',
                                                      '#status:<verdadeiro,falso,indeterminado,semcontexto,empartes,verdadecomressalvas,naoaplica,pular>',
                                                      '#textoresposta:',
                                                      '<sua resposta>'].join('\n'));
            cura.underreview = doc;
            cura.save();
        }
    }

    async function getAnswer(){
        var status = message.body.match(/#status:([a-z]+)/)[1];
        if (!['verdadeiro','falso','indeterminado','antigo','empartes','pular'].includes(status)){
            throw new Error(`Opção de status "${status}" não existente!`)
        }

        cura.populate('underreview');
        var doc = await Message.findOne(
            {_id: cura.underreview._id
            }
        )
        
        if (!doc){
            throw new Error('Você não tem nenhuma mensagem sendo revisada"')
        }

        if (status === 'pular'){
            cura.messagesBlackList.push(doc);
            await sendForReview();
            return
        }

        var replyText = message.body.match(/#textoresposta:([\S\s]+)/)[1]
        if(replyText.length <4){
            throw new Error('Resposta muito curta ou inexistente!')
        }

        doc.replymessage = replyText;
        doc.announced = false;
        doc.veracity = status;
        doc.save();
        cura.messagessolved.push(cura.underreview);
        cura.save();
        await client.sendText(message.sender.id, 'Mensagem salva. Essa será a resposta que demais usuários vão receber:');
        await client.sendText(message.sender.id, msg_helper.genReply(doc.veracity,doc.replymessage));
        await client.sendText(message.sender.id, 'Se quiser alterar algo, basta reenviar a mensagem.\nObrigado pela ajuda!');

    }

    var cura = await Curators.findOne(
            {curatorid: message.sender.id
            }
        )
    if(cura){
        if(message.body == '#ajuda'){await sendHelp()};
        if(message.body == '#manda'){await sendForReview()};
        if(message.body == '#diretrizes'){await sendGuidelines()};
        if(message.body == '#status'){await getStatus(message.sender.id,client)};
        if(message.body.slice(0,9) == '#resposta'){await getAnswer()};
    }
    await client.sendSeen(message.chatId);
}