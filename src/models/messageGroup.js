const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const messageGroupSchema = new Schema({

    messages:[
        {
            type:Schema.Types.ObjectId,
            ref:'Message',
        }
    ],

    tags:[{
        name:String,
        tagType:String,
        salience:Number
    }],

    timesReceived:{
        type: Number,
        defautl: 1
    },

    veracity: {
        type: String,
    },

    replyMessage:{
        type: String
    },

    reportUsers:{
        type: [{senderId: String,
                msgId: String}],
        default:[]
    },

    reportGroups:{
        type:[
            {
                groupName: String,
                senderId: String,
                groupParticipants: [String]
            }
        ],
        default:[]
    },

    announced:{
        type: Boolean,
        default: false
    },
        
    parent:{
        type:Schema.Types.ObjectId,
        ref:'MessageGroup',
    },
    
    discourseId:{
        type:Number,
        unique:true,
    }

},
{
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
}
)

module.exports = mongoose.model('MessageGroup', messageGroupSchema);