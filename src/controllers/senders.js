const wa = require('@open-wa/wa-automate');
const hash = md5 = require('md5');
const path = require('path');

const mime = require('mime-types');
const fs = require('fs');

const Message = require('../models/message');
const Curators = require('../models/curators');
const Senders = require('../models/senders');

const msgsTexts = require('../msgsTexts.json');

exports.isNew = async function (senderId){
    var doc = await Message.findOne(
        {senderid: senderId
        }
    )
    console.log(doc);
    if (doc){
        return false;
    }
    else{
        Senders.create({
            senderid:  senderId,
            banned: false,
        });
        return true;
    }
}