const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const Sender = require('../../src/models/sender')


const msgsTexts = require('../../src/msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Wpp-discourse-reply-via-wpp', function () {


    it('Deve aceitar resposta a tópicos via wpp', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.REPLY_DISCOURSE_TOPIC_CMD[0] + ' Testando uma resposta');
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);


        expect(messages).to.have.lengthOf(1);
        expect(messages[0].content).to.equal(msgsTexts.user.DISCOURSE_REPLY_SUCCESS.join('\n'));
    });

});