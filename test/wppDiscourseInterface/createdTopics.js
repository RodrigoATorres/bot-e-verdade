const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const Message = require('../../src/models/message');
const MessageGroup = require('../../src/models/messageGroup');

const msgsTexts = require('../../src/msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Wpp-discourse-create-topics', function () {


    it('Deve criar um tópico quando uma mensagem for enviada pela primeira vez', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(2);
        let re0 = helpers.regexFromMessage(msgsTexts.user.NEW_MSG);
        let re1 = helpers.regexFromMessage(msgsTexts.user.TOPIC_INFO);

        expect(messages[0].content).to.match(re0)
        expect(messages[1].content).to.match(re1)

    });
});