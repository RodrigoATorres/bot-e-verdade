const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const sendersSchema = new Schema({

    senderId:{
        type: String,
        index: { unique: true },
    },

    name:{
        type: String,
        default:''
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
    },

    lastTopicId:{
        type: String,
    },

    discourseUserName:{
        type: String,
    },

    lastOnlyForwardedNorify:{
        type:Date
    },

    discourLinkRequest:{
        userName:String,
        confirmCode:String,
        expiration:Date
    },
    
})

module.exports = mongoose.model('Sender', sendersSchema);