const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const messageSchema = new Schema({

    text:{
        type: String,
    },

    mediaMd5:{
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

    similarMessages:[{
        type:Schema.Types.ObjectId,
        ref:'Messages',
    }],
})

module.exports = mongoose.model('Messages', messageSchema);