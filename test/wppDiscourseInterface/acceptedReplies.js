const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const Message = require('../../src/models/message');
const MessageGroup = require('../../src/models/messageGroup');

const msgsTexts = require('../../src/msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Wpp-discourse-accepted-replies', function () {

    it('Deve armazenar a resposta do discourse no banco de dados do bot.', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let mensagemResposta = 'Testando uma resposta com ácènto e çedilha e tĩl, alem de "aspas", simbolo > < ; :';
        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), mensagemResposta, "false");
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        let msgGroup = await MessageGroup.findOne({});

        let replyMsg = msgGroup.replyMessage;

        expect(replyMsg).to.include(mensagemResposta);
    });

    
    it('Deve enviar mensagem para os membros do grupo cadastrados, quando algumas mensagem já verificada for enviada', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), 'Testando uma resposta', "false")
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        testClient.forwardMessages(testGroups[0], testMsgs[1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);
        let re0 = helpers.regexFromMessage(msgsTexts.user.PRE_GRP_REPLY_AUTHOR);
        let re1 = helpers.regexFromMessage(msgsTexts.replies.false);
        let re2 = helpers.regexFromMessage(msgsTexts.user.TOPIC_INFO);

        expect(messages[0].content).to.match(re0)
        expect(messages[1].content).to.match(re1)
        expect(messages[2].content).to.match(re2)

    });

    it('Deve enviar mensagem para os membros do grupo cadastrados, quando alguma mensagem já verificada for enviada, mesmo que seguida de outras mensagens', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), 'Testando uma resposta', "false")
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        testClient.forwardMessages(testGroups[0], testMsgs[1]);
        testClient.forwardMessages(testGroups[0], testMsgs[2]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);
        let re0 = helpers.regexFromMessage(msgsTexts.user.PRE_GRP_REPLY_AUTHOR);
        let re1 = helpers.regexFromMessage(msgsTexts.replies.false);
        let re2 = helpers.regexFromMessage(msgsTexts.user.TOPIC_INFO);

        expect(messages[0].content).to.match(re0)
        expect(messages[1].content).to.match(re1)
        expect(messages[2].content).to.match(re2)

    });

    it('Deve enviar a resposta do grupo de mensagens mais completo, quando as mensagens se ecaixam em 2 grupos (ou mais) em que um está contido no outro', async function () {
       
        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.addMessageReply(testClient, testMsgs.slice(0,1), 'Testando uma resposta', "false")
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), 'Segundo teste de uma resposta', "false")
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        testClient.forwardMessages(testGroups[0], testMsgs[1]);
        testClient.forwardMessages(testGroups[0], testMsgs[2]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);
        let re0 = helpers.regexFromMessage(msgsTexts.user.PRE_GRP_REPLY_AUTHOR);
        let re1 = helpers.regexFromMessage(msgsTexts.replies.false);
        let re2 = helpers.regexFromMessage(msgsTexts.user.TOPIC_INFO);

        expect(messages[0].content).to.match(re0)
        expect(messages[1].content).to.match(re1)
        expect(messages[1].content).to.include('Segundo teste de uma resposta')
        expect(messages[2].content).to.match(re2)

    })

    it('Deve enviar a resposta do grupo de mensagens mais completo, quando as mensagens se ecaixam em 2 grupos (ou mais) em que um está contido no outro (independente da ordem que forem recebidas)', async function () {
       
        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), 'Segundo teste de uma resposta', "false")
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.addMessageReply(testClient, testMsgs.slice(0,1), 'Testando uma resposta', "false")
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        testClient.forwardMessages(testGroups[0], testMsgs[1]);
        testClient.forwardMessages(testGroups[0], testMsgs[2]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);
        let re0 = helpers.regexFromMessage(msgsTexts.user.PRE_GRP_REPLY_AUTHOR);
        let re1 = helpers.regexFromMessage(msgsTexts.replies.false);
        let re2 = helpers.regexFromMessage(msgsTexts.user.TOPIC_INFO);

        expect(messages[0].content).to.match(re0)
        expect(messages[1].content).to.match(re1)
        expect(messages[1].content).to.include('Segundo teste de uma resposta')
        expect(messages[2].content).to.match(re2)

    })


    it('Deve enviar a resposta do grupo de mensagens mais completo, quando as mensagens se ecaixam em 2 grupos (ou mais) em que um está contido no outro (mesmo com mais de 2 níveis)', async function () {
       
        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), 'Primeiro teste de resposta', "false")
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.addMessageReply(testClient, testMsgs.slice(0,3), 'Segundo teste de uma resposta', "false")
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.addMessageReply(testClient, testMsgs.slice(0,1), 'Testando uma resposta', "false")
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        testClient.forwardMessages(testGroups[0], testMsgs[1]);
        testClient.forwardMessages(testGroups[0], testMsgs[2]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);
        let re0 = helpers.regexFromMessage(msgsTexts.user.PRE_GRP_REPLY_AUTHOR);
        let re1 = helpers.regexFromMessage(msgsTexts.replies.false);
        let re2 = helpers.regexFromMessage(msgsTexts.user.TOPIC_INFO);

        expect(messages[0].content).to.match(re0)
        expect(messages[1].content).to.match(re1)
        expect(messages[1].content).to.include('Segundo teste de uma resposta')
        expect(messages[2].content).to.match(re2)

    })
        
        
    it('Deve enviar a resposta de todos os grupos de mensagens encontrados, caso não estejam contidos um no outro', async function () {
    
    })

    it('Não deve enviar mensagem para os membros do grupo cadastrados, quando não forem enviadas todas as mensagens de um grupo verificado', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), 'Testando uma resposta', "false")
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(0);

    });

    it('Não enviar mensagem para os membros do grupo não cadastrados, quando uma mensagem falsa já verificada for enviada', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), 'Testando uma resposta', "false");
        await helpers.removeFromSenders(process.env.TEST_WAID);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(0);
    });

    it('Não enviar mensagem para os membros do grupo cadastrados, quando a veracidade não for relevante', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), 'Testando uma resposta', "true");
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(0);
    });
});
