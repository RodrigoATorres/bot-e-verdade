const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const messageBufferSchema = new Schema({

    text:{
        type: String,
    },

    textMd5:{
        type: String
    },

    mediaMd5:{
        type: String
    },

    mediaExtension:{
        type: String
    },

    forwardingScore: {
        type: Number,
    },

    senderId:{
        type: String
    },

    chatId:{
        type: String
    },

    messageId:{
        type: String
    },

    warningSent:{
        type:Boolean,
        default: false
    },

    isGroupMsg:{
        type:Boolean
    },

    groupParticipants:{
        type:[String]
    },
    
    groupName:{
        type:String
    },

    msgTimestamp:{
        type: Number
    },

    processing:{
        type: Boolean,
        default: false
    }
},
{
timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
}
)

module.exports = mongoose.model('MessageBuffer', messageBufferSchema);