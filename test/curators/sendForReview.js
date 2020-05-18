require('dotenv').config()
const should = require('chai').should();
const expect = require('chai').expect;
const client = require('../waTestClient');
const msgsTexts = require('../../src/msgsTexts.json');

describe('Curators-manda', function () {

    it('Deve retornar uma menssagem para revisão', function (done) {

        var n_msgs = 0;
        var expected_n_msg = 3;
        var messages = []
        
        function check_messages(messages){
            try{
                expect(messages[1].body).to.equal(msgsTexts.curator.ASK_REVIEW_MSG_2.join('\n'));
                expect(messages[2].body).to.equal(msgsTexts.curator.ASK_REVIEW_MSG_3.join('\n').format(Object.keys(msgsTexts.replies).join(', ')));
                done();
            }catch (err) {
                done(err)
            }
        }
        
        client.page._pageBindings.set("onMessage", message => {
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