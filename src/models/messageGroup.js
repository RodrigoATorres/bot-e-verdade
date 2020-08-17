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
    
    children:[{
        type:Schema.Types.ObjectId,
        ref:'MessageGroup',
    }],

    isSubSetOf:{
        type:[
            {
                type:Schema.Types.ObjectId,
                ref:'MessageGroup',
            }
        ],
        default: [],
    },

    discourseId:{
        type:Number,
        unique:true,
    },

    discourseTopicVersion:{
        type:String
    },

},
{
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
}
)

messageGroupSchema.methods.getVeracity = async function() {
    if (this.parent){
        return this.parent.veracity;
    }
    else{
        return this.veracity;
    }
};

messageGroupSchema.methods.getReplyMessage =  async function() {
    if (this.parent){
        return this.parent.replyMessage;
    }
    else{
        return this.replyMessage;
    }
};

messageGroupSchema.methods.getReportGroups = function() {
    return  new Promise((resolve) => {
        let reportGroups = this.reportGroups;
        this.populate('children', function(err, result) {
            result.children.forEach( (child) => {
                reportGroups = reportGroups.concat(child.reportGroups);
            })
            resolve(reportGroups);
        });
    });
};

messageGroupSchema.methods.getReportUsers = function () {
    return  new Promise((resolve) => {
        let reportUsers = this.reportUsers;
        this.populate('children', function(err, result) {
            result.children.forEach( (child) => {
                reportUsers = reportUsers.concat(child.reportUsers);
            })
            resolve(reportUsers);
        });
    });
}


var autoPopulateParent = function(next) {
    this.populate('parent');
    next();
  };

messageGroupSchema.
    pre('findOne', autoPopulateParent).
    pre('find', autoPopulateParent);

module.exports = mongoose.model('MessageGroup', messageGroupSchema);