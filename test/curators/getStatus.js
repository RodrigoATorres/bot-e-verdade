const should = require('chai').should();
const expect = require('chai').expect;
const client = require('../waTestClient');
const msgsTexts = require('../../src/msgsTexts.json');

describe('Curators-status', function () {

    it('Deve retornar um resumo do bando de dados, quando a hashtag de status for utilizada', function (done) {
        
        
        var n_msgs = 0;
        var cmd_tests = ["#status", "#StaTus", "#STATUS"];
        var expected_n_msg = cmd_tests.length;
         
        client.page._pageBindings.set("onMessage", message => {
            if ((message.sender.id !== process.env.TEST_WAID)) {return};

            if (n_msgs!==1){
                try{
                    expect(message.body).to.include(msgsTexts.curator.STATUS_MSG.join('\n').split('{')[0]);
                } catch (err){
                    done(err)
                    return
                }
            }

            n_msgs += 1;

            if (expected_n_msg === n_msgs){
                done()
            }
            else{
                client.sendText(process.env.TEST_WAID,cmd_tests[n_msgs])
            }
        })

        client.sendText(process.env.TEST_WAID,cmd_tests[0])

    });

});