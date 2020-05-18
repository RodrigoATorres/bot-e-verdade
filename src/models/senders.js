const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const sendersSchema = new Schema({

    senderid:{
        type: String,
    },

    banned:{
        type: Boolean,
        default: false
    }
    
    
})

module.exports = mongoose.model('Sender', sendersSchema);