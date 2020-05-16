require('dotenv').config()
const wa = require('@open-wa/wa-automate');
const should = require('chai').should();
const expect = require('chai').expect;
const client = require('../waTestClient');
const hash = md5 = require('md5');

const Message = require('../../src/models/message');

const msgsTexts = require('../../src/msgsTexts.json');

describe('Menssagens-usuario-texo', function () {

    it('Deve avisar que revisamos apenas mensagens encaminhadas', function (done) {
        
        var n_msgs = 0;
        var expected_n_msg = 1;
        var messages = []
        
        function check_messages(messages){
            try{
                expect(messages[0].body).to.include(msgsTexts.user.INTRO_MSG);
                done();
            }catch (err) {
                done(err)
            }
        }
        
        client.page._pageBindings.set("onMessage", message => {
            if ((message.sender.id !== process.env.TEST_WAID)) {retrun};
            n_msgs += 1;
            messages.push(message)
            if (expected_n_msg === n_msgs){
                check_messages(messages)
            }
        }
        )

        client.sendText(process.env.TEST_WAID, 'Olá, a pai da prima da amiga do colega da minha vizinha disse que o Bill Gates é bobo. É verdade?');
    });


    it('Deve avisar que não têm essa mensagem quando ela for encaminhada e não estiver no banco de dados', function (done) {
        
        var n_msgs = 0;
        var expected_n_msg = 1;
        var messages = []
        
        function check_messages(messages){
            try{
                expect(messages[0].body).to.include(msgsTexts.user.NEW_MSG.join('\n'));
                done();
            }catch (err) {
                done(err)
            }
        }

        client.page._pageBindings.set("onMessage", message => {
            if ((message.sender.id !== process.env.TEST_WAID)) {return};
            n_msgs += 1;
            messages.push(message)
            if (expected_n_msg === n_msgs){
                check_messages(messages)
            }
        }
        )

        client.forwardMessages(process.env.TEST_WAID, process.env.TEST_TEXT_MSG_ID, true);
    });

    it('Deve adicionar a mensagem no banco de dados', function (done) {
            
            var n_msgs = 0;
            var expected_n_msg = 1;
            var messages = []
            
            async function check_db(messages){
                try{
                    old_msg = await client.getMessageById(process.env.TEST_TEXT_MSG_ID);
                    doc = await Message.findOne({text: old_msg.body})
                    expect(doc).not.to.be.null;
                    done();
                }catch (err) {
                    done(err)
                }
            }

            client.page._pageBindings.set("onMessage", message => {
                if ((message.sender.id !== process.env.TEST_WAID)) {return};
                n_msgs += 1;
                messages.push(message)
                if (expected_n_msg === n_msgs){
                    check_db(messages)
                }
            }
            )

            client.forwardMessages(process.env.TEST_WAID, process.env.TEST_TEXT_MSG_ID, true);
    });


    it('Deve avisar que já recebemos a mensagens, mas ainda estamos revisando', function (done) {
        
        var n_msgs = 0;
        var expected_n_msg = 2;
        var messages = []
        
        function check_messages(messages){
            try{
                expect(messages[1].body).to.include(msgsTexts.user.UPROCESSED_MSG.join('\n'));
                done();
            }catch (err) {
                done(err)
            }
        }
        
        client.page._pageBindings.set("onMessage", message => {
            if ((message.sender.id !== process.env.TEST_WAID)) {return};
            n_msgs += 1;
            messages.push(message)
            if (n_msgs ==1){
                client.forwardMessages(process.env.TEST_WAID, process.env.TEST_TEXT_MSG_ID, true);
            }

            if (expected_n_msg === n_msgs){
                check_messages(messages)
            }
        }
        )

        client.forwardMessages(process.env.TEST_WAID, process.env.TEST_TEXT_MSG_ID, true);

    });

    it('Deve retornar a resposta correta pra cada status (verdadeiro, falso etc...), caso ela exista no banco de dados', function (done) {
            
        var n_msgs = 0;
        var reply_opts = Object.keys(msgsTexts.replies);
        var expected_n_msg = reply_opts.length + 1;
        var messages = []
        
        async function add_db_reply(status){
            try{
                old_msg = await client.getMessageById(process.env.TEST_TEXT_MSG_ID);
                doc = await Message.findOne({text: old_msg.body})
                doc.replymessage = 'testing reply message\nOk!?';
                doc.veracity = status;
                await doc.save()
                expect(doc).not.to.be.null;
            }catch (err) {
                done(err)
            }
        }


        client.page._pageBindings.set("onMessage", message => {
            if ((message.sender.id !== process.env.TEST_WAID)) {return};
            n_msgs += 1;

            if (n_msgs!==1){
                try{
                    expect(message.body).to.equal(msgsTexts.replies[reply_opts[n_msgs-2]].join('\n').format('testing reply message\nOk!?'));
                } catch (err){
                    done(err)
                }
                console.log(reply_opts[n_msgs-2], "OK")
            }

            if (expected_n_msg === n_msgs){
                done()
            }
            else{
                add_db_reply(reply_opts[n_msgs-1]);
                client.forwardMessages(process.env.TEST_WAID, process.env.TEST_TEXT_MSG_ID, true);
            }
        }
        )

        client.forwardMessages(process.env.TEST_WAID, process.env.TEST_TEXT_MSG_ID, true);
});

});
