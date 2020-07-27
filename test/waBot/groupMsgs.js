const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const Message = require('../../src/models/message');
const MessageGroup = require('../../src/models/messageGroup');

const msgsTexts = require('../../src/msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Mensagens-grupo', function () {


    it('Não deve fazer nada quando mensagens são enviadas para gurpos (mesmo que quem enviou esteja cadastrado)', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testGroups =  prepare.getTestWpGroups();
        
        let messages = []

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        helpers.storeMessage(testClient, messages);
        testClient.sendText(testGroups[0], 'testando');
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(0);

    });

    it('Não deve fazer nada quando mensagens são encaminhadas para grupos, mas não estão no banco de dados', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testGroups =  prepare.getTestWpGroups();
        let testMsgs = prepare.getTestMessages();

        let messages = []
    
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(0);
    });

    it('Não deve fazer nada quando mensagens são encaminhadas para grupos, mas não estão no banco de dados (mesmo que quem enviou esteja cadastrado)', async function () {
        
        
        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testGroups =  prepare.getTestWpGroups();
        let testMsgs = prepare.getTestMessages();

        let messages = []
    
        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(0);

    });

});
