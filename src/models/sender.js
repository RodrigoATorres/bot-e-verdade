const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const sendersSchema = new Schema({

    senderId:{
        type: String,
        index: { unique: true },
    },

    name:{
        type: String
    },

    banned:{
        type: Boolean,
        default: false
    },

    subscribed:{
        type: Boolean,
        default: true
    },
    
    isCurator:{
        type: Boolean,
        default: false,
    }
    
})

module.exports = mongoose.model('Sender', sendersSchema);