const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const reportController = require('../../src/controllers/reports');

const msgsTexts = require('../../src/msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Week-Report', function () {

    it.only('Deve enviar resumo semanal', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let mensagemResposta = 'Testando uma resposta com ácènto e çedilha e tĩl, alem de "aspas", simbolo > < ; :';
        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), mensagemResposta, "false");
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.addMessageReply(testClient, testMsgs.slice(0,1), mensagemResposta, "false");
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[0]);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[1]);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[2]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        testClient.forwardMessages(process.env.BOT_WA_ID, testMsgs[1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        reportController.genReport(()=> [new Date(new Date() - 7*24*60*60*1000), new Date()])
        await sleep(process.env.TESTING_DEFAULT_DELAY);

    });

});
