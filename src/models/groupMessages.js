const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const groupMessageSchema = new Schema({

    mediaKey:{
      type: String
    },

    mediaMime:{
        type: String
    },

    timesReceived:{
        type: Number,
        required: true
    },

    forwardingScores: {
        type: [Number],
        required: true
    },

    veracity: {
        type: String,
    },

    replymessage:{
        type: String
    },
    
    reportUsers:{
        type: [{userId: String,
                msgId: String}]
    },

    announced:{
        type: Boolean
    },
    
    medialink:{
        type: String
    },
    
    similarMessages:[{
        type:Schema.Types.ObjectId,
        ref:'Message',
    }],
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
}
)

module.exports = mongoose.model('GroupMessage', groupMessageSchema);