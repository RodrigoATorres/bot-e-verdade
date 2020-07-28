const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const Message = require('../../src/models/message');
const MessageGroup = require('../../src/models/messageGroup');

const msgsTexts = require('../../src/msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Mensagens-mídia', function () {

    it('Deve avisar que já recebemos mensagem, mas ainda estamos revisando', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        
        let messages = []

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);

        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(2);
        expect(messages[0].content).to.equal(msgsTexts.user.UPROCESSED_MSG.join('\n'));
        let re = new RegExp(msgsTexts.user.TOPIC_INFO.join('\n').format(`${process.env.DISCOURSE_API_URL}/t/[0-9]*`));
        expect(messages[1].content).to.match(re)
    

    });


    it('Deve avisar que não têm essa mensagem quando ela for encaminhada e não estiver no banco de dados', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        
        let messages = []
        
        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);

        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(2);
        expect(messages[0].content).to.equal(msgsTexts.user.NEW_MSG.join('\n'));
        let re = new RegExp(msgsTexts.user.TOPIC_INFO.join('\n').format(`${process.env.DISCOURSE_API_URL}/t/[0-9]*`));
        expect(messages[1].content).to.match(re)
    
    });

    it('Deve perguntar se é um grupo de mensagens, caso forem enviadas juntas. Na ausência de resposta analisar o grupo', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        
        let messages = []

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);

        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);
        expect(messages[0].content).to.equal(msgsTexts.user.GROUP_MSG_WARNING.join('\n').format(2));
        expect(messages[1].content).to.equal(msgsTexts.user.NEW_MSG.join('\n'));
        let re = new RegExp(msgsTexts.user.TOPIC_INFO.join('\n').format(`${process.env.DISCOURSE_API_URL}/t/[0-9]*`));
        expect(messages[2].content).to.match(re)
    
    });

    it('Deve adicionar a mensagem no banco de dados', async function () {
            
        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();     

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);

        let msgRecord = await Message.findOne({mediaMd5s:"7c0469fcd8beb5fc8ae8917c1e5d6276"})
        let grpmsgRecord = await MessageGroup.findOne({messages:msgRecord._id})

        expect(msgRecord).not.to.be.null;
        expect(grpmsgRecord).not.to.be.null;

    });


    it('Deve avisar que já recebemos mensagem, mas ainda estamos revisando', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        
        let messages = []

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);

        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(2);
        expect(messages[0].content).to.equal(msgsTexts.user.UPROCESSED_MSG.join('\n'));
        let re = new RegExp(msgsTexts.user.TOPIC_INFO.join('\n').format(`${process.env.DISCOURSE_API_URL}/t/[0-9]*`));
        expect(messages[1].content).to.match(re)
    
    });

    it('Deve avisar que já recebemos grupo de mensagens, mas ainda estamos revisando', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        
        let messages = []

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);

        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[testMsgs.length - 1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY * 2);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);
        expect(messages[0].content).to.equal(msgsTexts.user.GROUP_MSG_WARNING.join('\n').format(2));
        expect(messages[1].content).to.equal(msgsTexts.user.UPROCESSED_MSG.join('\n'));
        let re = new RegExp(msgsTexts.user.TOPIC_INFO.join('\n').format(`${process.env.DISCOURSE_API_URL}/t/[0-9]*`));
        expect(messages[2].content).to.match(re)
    
    });

});
