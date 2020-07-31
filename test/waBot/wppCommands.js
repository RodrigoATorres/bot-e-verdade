const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const Message = require('../../src/models/message');
const MessageGroup = require('../../src/models/messageGroup');

const msgsTexts = require('../../src/msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Wpp-comandos', function () {


    it('Deve desinscrever usuário - parar de receber atualizações por mensagens de grupo', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), 'Testando uma resposta', "false")
        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.UNSUBSCRIBE_CMD[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(0);
    });

    it('Deve reinscrever usuário - voltar a  receber atualizações por mensagens de grupo', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), 'Testando uma resposta', "false")
        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.UNSUBSCRIBE_CMD[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(0);

        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.SUBSCRIBE_CMD[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);

    });


});
