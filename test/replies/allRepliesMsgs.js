const expect = require('chai').expect;

const prepare = require('../prepare');
const helpers = require('../helpers');

const Message = require('../../src/models/message');
const MessageGroup = require('../../src/models/messageGroup');

const msgsTexts = require('../../src/msgsTexts.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Mensagens-texto', function () {


    it('Envio de mensagens para verificação manual', async function () {

        prepare.startApp();
        let testClient = prepare.startTestWp();
        let testGroups =  prepare.getTestWpGroups();

        testClient.sendText(testGroups[2], this.test.title);
        await sleep(500);

        for (let key of Object.keys(msgsTexts.replies)){
            await testClient.sendText(testGroups[2], msgsTexts.replies[key].join('\n').format('teste de uma resposta qualquer'));
            await sleep(500);
        }

    });

});
