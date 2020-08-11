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

    it('Deve cancelar buffer quando o comando cancelar for usado', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[0]);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[1]);
        await sleep(process.env.TEST_BUFFER_DELAY1);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.CANCEL_BUFFER_CMD[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(1);
        expect(messages[0].content).to.equal(msgsTexts.user.CANCEL_BUFFER_SUCCESS.join('\n'));

    });


    it('Deve avisar que não há nenhuma mensagem no Buffer pra ser cancelada', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.CANCEL_BUFFER_CMD[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(1);
        expect(messages[0].content).to.equal(msgsTexts.user.CANCEL_BUFFER_FAIL.join('\n'));

    });


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
        testClient.forwardMessages(testGroups[0], testMsgs[1]);
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
        testClient.forwardMessages(testGroups[0], testMsgs[1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(0);

        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.SUBSCRIBE_CMD[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        testClient.forwardMessages(testGroups[0], testMsgs[1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);

    });

});
