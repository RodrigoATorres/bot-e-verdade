const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const Message = require('../../src/models/message');
const MessageGroup = require('../../src/models/messageGroup');

const msgsTexts = require('../../src/msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Wpp-discourse-duplicates', function () {

    it('Deve publicar a resposta de um tópico para os tópicos filhos', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let mensagemResposta = 'Testando uma resposta com ácènto e çedilha e tĩl, alem de "aspas", simbolo > < ; :';
        let topic1_id = await helpers.addMessage2Discourse(testClient, [testMsgs[0]]);
        let topic2_id = await helpers.addMessage2Discourse(testClient, [testMsgs[1]]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.replyTopic(topic1_id, `Texto com link para tópico: ${process.env.DISCOURSE_API_URL}/t/teste/${topic2_id}`, 'duplicate');
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.removeTopicReportUsers(topic2_id);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        await helpers.replyTopic(topic2_id, mensagemResposta, 'false');
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);
        let re0 = helpers.regexFromMessage(msgsTexts.user.PRE_PUBLISH_MSG_1.concat(msgsTexts.user.PRE_PUBLISH_MSG_2));
        let re1 = helpers.regexFromMessage(msgsTexts.replies.false);
        let re2 = helpers.regexFromMessage(msgsTexts.user.TOPIC_INFO);

        expect(messages[0].content).to.match(re0)
        expect(messages[1].content).to.match(re1)
        expect(messages[1].content).to.include(mensagemResposta)
        expect(messages[2].content).to.match(re2)
    });


    it('Deve publicar a resposta de um tópico para os tópicos filhos quando o tópico é listado como duplicado depois que o tópico pai foi respondido', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let mensagemResposta = 'Testando uma resposta com ácènto e çedilha e tĩl, alem de "aspas", simbolo > < ; :';
        let topic1_id = await helpers.addMessage2Discourse(testClient, [testMsgs[0]]);
        let topic2_id = await helpers.addMessage2Discourse(testClient, [testMsgs[1]]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.replyTopic(topic2_id, mensagemResposta, 'false');
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.removeTopicReportUsers(topic2_id);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        await helpers.replyTopic(topic1_id, `Texto com link para tópico: ${process.env.DISCOURSE_API_URL}/t/teste/${topic2_id}`, 'duplicate');
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);
        let re0 = helpers.regexFromMessage(msgsTexts.user.PRE_PUBLISH_MSG_1.concat(msgsTexts.user.PRE_PUBLISH_MSG_2));
        let re1 = helpers.regexFromMessage(msgsTexts.replies.false);
        let re2 = helpers.regexFromMessage(msgsTexts.user.TOPIC_INFO);

        expect(messages[0].content).to.match(re0)
        expect(messages[1].content).to.match(re1)
        expect(messages[1].content).to.include(mensagemResposta)
        expect(messages[2].content).to.match(re2)
    });


    it('Deve enviar a resposta de um tópico quando receber a mensagem de um tópico filho', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let mensagemResposta = 'Testando uma resposta com ácènto e çedilha e tĩl, alem de "aspas", simbolo > < ; :';
        let topic1_id = await helpers.addMessage2Discourse(testClient, [testMsgs[0]]);
        let topic2_id = await helpers.addMessage2Discourse(testClient, [testMsgs[1]]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.replyTopic(topic1_id, `Texto com link para tópico: ${process.env.DISCOURSE_API_URL}/t/teste/${topic2_id}`, 'duplicate');
        await helpers.replyTopic(topic2_id, mensagemResposta, 'false');
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(2);
        let re0 = helpers.regexFromMessage(msgsTexts.replies.false);
        let re1 = helpers.regexFromMessage(msgsTexts.user.TOPIC_INFO);

        expect(messages[0].content).to.match(re0)
        expect(messages[0].content).to.include(mensagemResposta)
        expect(messages[1].content).to.match(re1)
    });

    it('Deve enviar a resposta de um tópico quando receber a mensagem de um tópico filho em grupos', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let mensagemResposta = 'Testando uma resposta com ácènto e çedilha e tĩl, alem de "aspas", simbolo > < ; :';
        let topic1_id = await helpers.addMessage2Discourse(testClient, [testMsgs[0]]);
        let topic2_id = await helpers.addMessage2Discourse(testClient, [testMsgs[1]]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.replyTopic(topic1_id, `Texto com link para tópico: ${process.env.DISCOURSE_API_URL}/t/teste/${topic2_id}`, 'duplicate');
        await helpers.replyTopic(topic2_id, mensagemResposta, 'false');
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.forwardMessages(testGroups[0], testMsgs[0]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(3);
        let re0 = helpers.regexFromMessage(msgsTexts.user.PRE_GRP_REPLY_AUTHOR);
        let re1 = helpers.regexFromMessage(msgsTexts.replies.false);
        let re2 = helpers.regexFromMessage(msgsTexts.user.TOPIC_INFO);

        expect(messages[0].content).to.match(re0)
        expect(messages[1].content).to.match(re1)
        expect(messages[1].content).to.include(mensagemResposta)
        expect(messages[2].content).to.match(re2)
    });


});
