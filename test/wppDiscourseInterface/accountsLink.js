const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const Sender = require('../../src/models/sender')

// const discourseController = require('../../src/controllers/discourse')

const msgsTexts = require('../../src/msgsTexts.json');



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Wpp-discourse-accounts-link', function () {


    it('Deve fazer o link entre a conta de wpp e discourse, caso o código apresentado estaja correto', async function () {
        //Não é possível o bot_testador enviar uma mensagem para ele mesmo. Adicionar um novoa api de bot traria muita complexidade.
        //Optou-se por verificar apenas manualmente se os códigos estavam sendo enviados corretamente, e pegar o código direto do banco de dados

        prepare.startApp();
        let testClient = prepare.startTestWp();

        
        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.LINK_DISCOURSE_CMD[0] + ' ' + process.env.TESTING_DISCOURSE_API_USERNAME);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        // Código retirado devido à complexidade de fazê-lo funcionar
        // let privateMsgs = await discourseController.getPrivateMessages(process.env.TESTING_DISCOURSE_API_USERNAME);
        // let lastPM = await discourseController.getTopic( privateMsgs.topic_list.topics[0].id)
        // let confirmCodeRe = new RegExp( msgsTexts.commands.LINK_DISCOURSE_CODE_CMD[0] +  ' ([A-Za-z0-9]*)');
        let confirmCode = (await Sender.findOne({senderId: process.env.TEST_WAID})).discourLinkRequest.confirmCode
        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.LINK_DISCOURSE_CODE_CMD[0] +  ' ' + confirmCode);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);


        let linkedUserName = (await Sender.findOne({senderId: process.env.TEST_WAID})).discourseUserName

        expect(messages).to.have.lengthOf(2);
        expect(messages[0].content).to.equal(msgsTexts.user.LINK_DISCOURSE_WPP_INFO.join('\n'))
        expect(messages[1].content).to.equal(msgsTexts.user.LINK_DISCOURSE_WPP_SUCCESS.join('\n'))
        expect(linkedUserName).to.equal(process.env.TESTING_DISCOURSE_API_USERNAME)

    });



    it('Não deve fazer o link entre a conta de wpp e discourse, caso o código apresentado estaja correto, mas tenha sido apresentado muito tempo depois', async function () {
        //Não é possível o bot_testador enviar uma mensagem para ele mesmo. Adicionar um novoa api de bot traria muita complexidade.
        //Optou-se por verificar apenas manualmente se os códigos estavam sendo enviados corretamente, e pegar o código direto do banco de dados

        prepare.startApp();
        let testClient = prepare.startTestWp();

        
        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.LINK_DISCOURSE_CMD[0] + ' ' + process.env.TESTING_DISCOURSE_API_USERNAME);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        await sleep(60000);
        let confirmCode = (await Sender.findOne({senderId: process.env.TEST_WAID})).discourLinkRequest.confirmCode
        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.LINK_DISCOURSE_CODE_CMD[0] +  ' ' + confirmCode);
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);


        let linkedUserName = (await Sender.findOne({senderId: process.env.TEST_WAID})).discourseUserName

        expect(messages).to.have.lengthOf(2);
        expect(messages[0].content).to.equal(msgsTexts.user.LINK_DISCOURSE_WPP_INFO.join('\n'))
        expect(messages[1].content).to.equal(msgsTexts.user.LINK_DISCOURSE_WPP_FAIL.join('\n'))
        expect(linkedUserName).not.to.equal(process.env.TESTING_DISCOURSE_API_USERNAME)

    });



    it('Não deve fazer o link entre a conta de wpp e discourse, caso o código apresentado estaja incorreto', async function () {
        //Não é possível o bot_testador enviar uma mensagem para ele mesmo. Adicionar um novoa api de bot traria muita complexidade.
        //Optou-se por verificar apenas manualmente se os códigos estavam sendo enviados corretamente, e pegar o código direto do banco de dados

        prepare.startApp();
        let testClient = prepare.startTestWp();

        
        testClient.sendText(process.env.BOT_WA_ID, this.test.title);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        let messages = [];
        helpers.storeMessage(testClient, messages);
        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.LINK_DISCOURSE_CMD[0] + ' ' + process.env.TESTING_DISCOURSE_API_USERNAME);
        await sleep(process.env.TESTING_DEFAULT_DELAY);

        testClient.sendText(process.env.BOT_WA_ID, msgsTexts.commands.LINK_DISCOURSE_CODE_CMD[0] +  ' ' + '00000');
        await sleep(process.env.TESTING_DEFAULT_DELAY);
        helpers.stopStoreMessage(testClient);


        let linkedUserName = (await Sender.findOne({senderId: process.env.TEST_WAID})).discourseUserName

        expect(messages).to.have.lengthOf(2);
        expect(messages[0].content).to.equal(msgsTexts.user.LINK_DISCOURSE_WPP_INFO.join('\n'))
        expect(messages[1].content).to.equal(msgsTexts.user.LINK_DISCOURSE_WPP_FAIL.join('\n'))
        expect(linkedUserName).not.to.equal(process.env.TESTING_DISCOURSE_API_USERNAME)

    });

});
