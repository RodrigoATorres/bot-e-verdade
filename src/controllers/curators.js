const wa = require('@open-wa/wa-automate');
const hash = md5 = require('md5');
const path = require('path');
const msg_helper = require('../helpers/msg_helper')

const mime = require('mime-types');
const fs = require('fs');

const Message = require('../models/message');
const Curators = require('../models/curators');

const msgsTexts = require('../msgsTexts.json');

exports.resetReviewers = async(client) => {
    var now = new Date();
    var tmp_cura = await Curators.find({})
    var alert_cura = await Curators.find({underreview_exp_at: { '$lte': new Date(now.getTime() + 120 * 1000)}, underreview_exp_alert: false})
    var exp_cura = await Curators.find({underreview_exp_at: { '$lte': now}})

    for (cura of tmp_cura){
        console.log(now, cura.underreview_exp_at, cura.underreview)
    }

    for (cura of alert_cura){
        console.log('alert')
        client.sendText(cura['curatorid'],msgsTexts.curator.EXPIRING_ALERT_MSG.join('\n'));
        cura.underreview_exp_alert = true;
        await cura.save()
    }

    for (cura of exp_cura){
        console.log('exp')
        cura.populate('underreview');
        var doc = await Message.findOne(
            {_id: cura.underreview._id
            }
        )
        cura.underreview = null;
        cura.underreview_exp_at = null;
        cura.underreview_exp_alert = false;
        await cura.save()
        doc.reviewer = null;
        await doc.save()
    }
}


exports.sendStatusAll = async (client) => {
    var all_cura = await Curators.find({}).select('curatorid -_id');
    for (cura of all_cura){
        getStatus(cura['curatorid'], client)
    }
}

async function getStatus(receiver_id,client){
    total_msgs = await Message.countDocuments({});
    noreply_msgs = await Message.countDocuments({replymessage: null})

    var start = new Date(Date.now() - (24*60*60 * 1000)*7)
    week_total_mesgs = await Message.countDocuments({created_at: { '$gte': start}});

    await client.sendText(receiver_id, msgsTexts.curator.STATUS_MSG.join('\n').format(total_msgs, total_msgs - noreply_msgs,week_total_mesgs,noreply_msgs));
}

exports.getStatus = getStatus

exports.execute_command = async (message,client) => {
    
    async function sendHelp(){
        await client.sendText(message.sender.id,msgsTexts.curator.HELP_MSG.join('\n')
        );
    }

    async function sendGuidelines(){
        await client.sendText(message.sender.id, msg_helper.genGuidelines());
    }

    async function renewReviewExp(){
        now = new Date()
        cura.underreview_exp_at =   new Date(now.getTime() + 600 * 1000);
        cura.underreview_exp_alert = false;
        await cura.save();
    }

    async function sendForReview(){
        var requested_id = message.body.match(/#id:\s*([a-zA-Z0-9]+)/);
        if (requested_id){
            var doc = await Message.findOne(
                {replymessage: null,
                 reviewer: null,
                 _id: requested_id[1]
                }
            )
        }
        else{
        var doc = await Message.findOne(
            {replymessage: null,
             reviewer: null,
             _id: {"$nin": cura.messagesBlackList}
            }
        )
        }

        if(doc){
            await client.sendText(message.sender.id, [
                                                        msgsTexts.curator.ASK_REVIEW_MSG_1.join('\n'),
                                                        doc.medialink ? msgsTexts.curator.ASK_REVIEW_MSG_1_MEDIA.join('\n').format(doc.medialink) : '',
                                                        doc.text ? msgsTexts.curator.ASK_REVIEW_MSG_1_TEXT.join('\n').format(doc.text) : ''
                                                        ].join('')
            );
            await client.sendText(message.sender.id, msgsTexts.curator.ASK_REVIEW_MSG_2.join('\n'));
            await client.sendText(message.sender.id, 
                                   msgsTexts.curator.ASK_REVIEW_MSG_3.join('\n').format(Object.keys(msgsTexts.replies).join(', ')));
            cura.underreview = doc;
            var now = new Date();
            cura.underreview_exp_at =   new Date(now.getTime() + 600 * 1000);
            cura.underreview_exp_alert = false;
            cura.save();
            doc.reviewer = cura;
            doc.save()
        }
    }

    async function skipReview(){
        cura.populate('underreview');
        var doc = await Message.findOne(
            {_id: cura.underreview._id
            }
        )
        cura.messagesBlackList.push(doc);
        await cura.save()
        doc.reviewer = null;
        await doc.save()
        await sendForReview();
        return

    }


    async function getAnswer(){
        var status = message.body.match(/#status:([a-z]+)/)[1];
        if (!Object.keys(msgsTexts.replies).includes(status)){
            throw new Error(msgsTexts.curator.NOT_A_STATUS_OPTION.join('\n').format(status))
        }

        cura.populate('underreview');
        var doc = await Message.findOne(
            {_id: cura.underreview._id
            }
        )
        
        if (!doc){
            throw new Error(msgsTexts.curator.NO_MSG_BEING_REVIEWD.join('\n'))
        }

        var replyText = message.body.match(/#textoresposta:([\S\s]+)/)[1]
        if(replyText.length <4){
            throw new Error(msgsTexts.curator.SHORT_ANSWER.join('\n'))
        }

        doc.replymessage = replyText;
        doc.announced = false;
        doc.veracity = status;
        doc.save();
        cura.messagessolved.push(cura.underreview);
        cura.underreview_exp_at = null;
        cura.underreview_exp_alert = true;
        await cura.save()
        cura.save();
        await client.sendText(message.sender.id, msgsTexts.curator.ANSWER_ACCEPTED_1.join('\n'));
        await client.sendText(message.sender.id, msgsTexts.replies[doc.veracity].join('\n').format(doc.replymessage));
        await client.sendText(message.sender.id, msgsTexts.curator.ANSWER_ACCEPTED_3.join('\n'));

    }

    var cura = await Curators.findOne(
            {curatorid: message.sender.id
            }
        )
    if(cura){
        var command = message.body.match(/^#(?![0-9_]+\b)([a-zA-Z0-9_]{1,30})/)[1].toLowerCase()

        if (command){
            switch (command){
                case msgsTexts.commands.HELP_CMD:
                    await sendHelp();
                    break;
                case msgsTexts.commands.SEND_CMD:
                        await sendForReview()
                        break;
                case msgsTexts.commands.GUIDELINES_CMD:
                        await sendGuidelines()
                        break;
                case msgsTexts.commands.STATUS_CMD:
                        await getStatus(message.sender.id,client);
                        break;
                case msgsTexts.commands.ANSWER_CMD:
                    await getAnswer()
                    break;
                case msgsTexts.commands.SKIP_CMD:
                    await skipReview();
                    break;
                case msgsTexts.commands.RENEW_EXP_CMD:
                    await renewReviewExp();
                    break;
                default:
                    throw new Error(msgsTexts.curator.INVALID_COMMAND.join('\n').format(command))
            }
        }
    }
    await client.sendSeen(message.chatId);
}