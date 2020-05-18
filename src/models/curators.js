const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const curatorsSchema = new Schema({

    curatorid:{
        type: String,
    },

    authorized:{
        type: Boolean
    },
    
    underreview:{
        type:Schema.Types.ObjectId,
        ref:'Messages'
    },

    underreview_exp_at:{
        type : Date
    },

    underreview_exp_alert:{
        type : Boolean,
        default: false
    },

    messagessolved:[{
        type:Schema.Types.ObjectId,
        ref:'Messages',
    }],

    messagesBlackList:[{
        type:Schema.Types.ObjectId,
        ref:'Messages',
    }]
})

module.exports = mongoose.model('Curators', curatorsSchema);