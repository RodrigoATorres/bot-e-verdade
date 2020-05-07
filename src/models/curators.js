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

    messagessolved:[{
        type:Schema.Types.ObjectId,
        ref:'Messages',
    }]
})

module.exports = mongoose.model('Curators', curatorsSchema);