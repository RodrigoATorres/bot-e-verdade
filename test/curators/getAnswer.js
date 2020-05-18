const should = require('chai').should();
const expect = require('chai').expect;
const client = require('../waTestClient');
const msgsTexts = require('../../src/msgsTexts.json');
const Message = require('../../src/models/message');

describe('Curators-resposta', function () {

    it('Deve aceitar respostas para todos os status (verdadeiro, falso etc...)', function (done) {

        var n_msgs = 0;
        var reply_opts = Object.keys(msgsTexts.replies);
        var expected_n_msg = reply_opts.length*6 -1;
        var messages = []
        
        async function reset_replies(){
            return await Message.updateMany({}, {'$set': {replymessage: null}});
        }

        client.page._pageBindings.set("onMessage", message => {
            if ((message.sender.id !== process.env.TEST_WAID)) {return};
            if (expected_n_msg === n_msgs){
                done()
                return
            }
            if (n_msgs % 6 === 5){
                reset_replies()
                client.sendText(process.env.TEST_WAID, '#manda');
            }
            if (n_msgs % 6 === 2){
                client.sendText(process.env.TEST_WAID, msgsTexts.curator.ASK_REVIEW_MSG_3.join('\n').format(reply_opts[(n_msgs-2)/6]));
            }
            if (n_msgs % 6 === 3){
                try{
                    expect(message.body).to.equal(msgsTexts.curator.ANSWER_ACCEPTED_1.join('\n'));
                } catch (err){
                    done(err)
                }
            }
            n_msgs+=1;

        }
        )
        reset_replies()
        client.sendText(process.env.TEST_WAID, '#manda');
});

});