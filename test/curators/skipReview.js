require('dotenv').config()
const should = require('chai').should();
const expect = require('chai').expect;
const client = require('../waTestClient');
const msgsTexts = require('../../src/msgsTexts.json');

describe('Curators-pular', function () {

    it('Deve retornar uma outra menssagem para ser curada se o comando pular for usado ', function (done) {
        
        var n_msgs = 0;
        var expected_n_msg = 6;
        var messages = []
        
        function check_messages(messages){
            try{
                expect(messages[0].body).not.to.equal(messages[3].body);
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
                client.sendText(process.env.TEST_WAID,'#pular')
            }

            if (expected_n_msg === n_msgs){
                check_messages(messages)
            }
        }
        )

        client.sendText(process.env.TEST_WAID,'#manda')
    });


});