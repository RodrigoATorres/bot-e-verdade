const mongoUnit = require("mongo-unit");
const json2mongo = require('json2mongo');

const prepare = require('./prepare')
const discourseController = require('../src/controllers/discourse');

const Sender = require('../src/models/sender');

const testData = require("./test_data.json");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

beforeEach((done) => {
    prepare.startDb();
    mongoUnit.load(json2mongo(testData)).
    then(()=>{done()})
    .catch(err =>{
        done()
    })
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
    return await Sender.remove({senderId})
}

module.exports.addMessageReply = async (testClient, msgIds, reply, veracity) =>{
    let messages = []
    this.storeMessage(testClient, messages);
    msgIds.forEach( msgId =>{
        testClient.forwardMessages(process.env.BOT_WA_ID, msgId);
    })
    await sleep(process.env.TESTING_DEFAULT_DELAY);
    this.stopStoreMessage(testClient);

    let re = new RegExp(`${process.env.DISCOURSE_API_URL}/t/([0-9]*)`);
    let topic_id = messages[2].content.match(re)[1];

    await discourseController.voteVeracity(topic_id, veracity);
    let postInfo = await discourseController.answerTopic(reply, topic_id)
    await discourseController.acceptAnswer(postInfo.id)
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