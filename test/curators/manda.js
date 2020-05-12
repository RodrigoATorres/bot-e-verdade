require('dotenv').config()
const should = require('chai').should();
const expect = require('chai').expect;
const client = require('../waTestClient');

describe('Curators-manda', function () {

    it('Deve retornar uma mensagem para ser verificada', function (done) {
        
        var n_msgs = 0;
        var expected_n_msg = 3;
        var messages = []
        
        function check_messages(messages){
            try{
                expect(messages[0].body).to.include('Olá, estamos precisando que você revise a mensagem');
                expect(messages[1].body).not.to.be.empty;
                expect(messages[2].body).to.include('#resposta');
                done();
            }catch (err) {
                done(err)
            }
        }
        
        client.onMessage(message => {
            if (message.sender.id !== process.env.TEST_WAID){retrun};
            n_msgs += 1;
            messages.push(message)
            if (expected_n_msg === n_msgs){
                check_messages(messages)
            }
        }
        )

        client.sendText(process.env.TEST_WAID,'#manda')
    });

});