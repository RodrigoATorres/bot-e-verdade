const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const reportController = require('../../src/controllers/reports');

const msgsTexts = require('../../src/msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Week-Report', function () {

    it('Deve enviar relatórios na periodicidade esperada', async function () {
        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();

        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let mensagemResposta = 'Testando uma resposta com ácènto e çedilha e tĩl, alem de "aspas", simbolo > < ; :';
        await helpers.addMessageReply(testClient, testMsgs.slice(0,2), mensagemResposta, "false");
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.linkAccounts(testClient);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = []
        helpers.storeMessage(testClient, messages);
        reportController.setPublishReportCron( '*/5 * * * * *' ,()=> [new Date(new Date() - 7*24*60*60*1000), new Date()])
        await sleep(20000);
        helpers.stopStoreMessage(testClient);
        reportController.cancelPublishReportCron();
        expect([3,4,5].indexOf(messages.length)).to.be.greaterThan(-1);
    }
    );   
    
    it('Deve enviar resumo semanal', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testMsgs = prepare.getTestMessages();
        let testGroups =  prepare.getTestWpGroups();

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
        testClient.forwardMessages(testGroups[1], testMsgs[1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await helpers.linkAccounts(testClient);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        testClient.forwardMessages(testGroups[1], testMsgs[1]);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = []
        helpers.storeMessage(testClient, messages);
        reportController.publishReports(()=> [new Date(new Date() - 7*24*60*60*1000), new Date()])
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);

        expect(messages).to.have.lengthOf(1);
        let re = new RegExp(msgsTexts.curators.report
        .join('\n')
        .replace(
            /(\[|\\|\^|\$|\.|\||\?|\*|\+|\(|\))/g,
            (_, p1) =>{
                return '\\' + p1
            }
        )
        .format(
            process.env.TESTING_DISCOURSE_API_USERNAME,
            2,2,   // mensagems verificadas usuário
            4,4,   // mensagems unicas recebidas
            5,2,   // mensagems privadas e de grupos recebidas
            2,      // mensagems não verificadas
            `[\\S\\s]+${process.env.TESTING_DISCOURSE_API_USERNAME}[\\S\\s]+`,
            `[\\S\\s]+${process.env.TESTING_DISCOURSE_API_USERNAME}[\\S\\s]+`
        )
        );
        expect(messages[0].content).to.match(re)

    });

});
