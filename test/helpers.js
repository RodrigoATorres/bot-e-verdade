const mongoUnit = require("mongo-unit");
const json2mongo = require('json2mongo');

const prepare = require('./prepare')
const discourseController = require('../src/controllers/discourse');

const Sender = require('../src/models/sender');
const MessageGroup = require('../src/models/messageGroup');


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

beforeEach((done) => {
    prepare.startDb();
    done()
})

afterEach(() => mongoUnit.drop());

module.exports.storeMessage = (client, msgs) =>{
    client._page._pageBindings.set("onMessage", message => {
        if ((message.sender.id !== process.env.BOT_WA_ID)) {return}
        msgs.push(message)
        });
}

module.exports.stopStoreMessage = (client) =>{
    client._page._pageBindings.set("onMessage", () => {

    });
}

module.exports.removeFromSenders = async (senderId) =>{
    return await Sender.deleteOne({senderId})
}

module.exports.addMessageReply = async (testClient, msgIds, reply, veracity) =>{
    let topic_id = await this.addMessage2Discourse(testClient, msgIds);
    await this.replyTopic(topic_id, reply, veracity);
}

module.exports.addMessage2Discourse = async (testClient, msgIds) =>{
    let messages = []
    this.storeMessage(testClient, messages);
    msgIds.forEach( msgId =>{
        testClient.forwardMessages(process.env.BOT_WA_ID, msgId);
    })
    await sleep(process.env.TESTING_DEFAULT_DELAY);
    this.stopStoreMessage(testClient);

    let re = new RegExp(`${process.env.DISCOURSE_API_URL}/t/([0-9]*)`);

    let topic_id;
    if (msgIds.length > 1){
        topic_id = messages[2].content.match(re)[1];
    }
    else{
        topic_id = messages[1].content.match(re)[1];
    }
    return topic_id
}

module.exports.replyTopic = async (topic_id, reply, veracity) =>{
    await discourseController.voteVeracity(topic_id, veracity);
    let postInfo = await discourseController.answerTopic(reply, topic_id)
    await discourseController.acceptAnswer(postInfo.id)
}

module.exports.removeTopicReportUsers = async (topic_id) =>{
    let messageGrp = await MessageGroup.findOne({discourseId:topic_id});
    messageGrp.reportUsers = [];
    await messageGrp.save()
}

module.exports.regexFromMessage = (message) =>{
    let re = new RegExp(
        message.join('\n')
        .replace(
            /(\[|\\|\^|\$|\.|\||\?|\*|\+|\(|\))/g,
            (_, p1) =>{
                return '\\' + p1
            }
        )
        .format('[\\S\\s]+','[\\S\\s]+')
    );
    return re
}