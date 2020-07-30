const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const mediaSchema = new Schema({

    _id:{
        type: String,
        index: { unique: true },
        required: true,
    },

    mediaKeys:[{
        type: String,
        index: { unique: true },
    }],

    mediaMime:{
        type: String
    },

    mediaLink:{
        type: String
    },

    mediaText:{
        type:String
    },

    mediaTags:[{
        name:String,
        tagType:String,
        salience:Number
    }]
},
{
timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
}
)

module.exports = mongoose.model('Media', mediaSchema);