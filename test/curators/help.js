require('dotenv').config()
const should = require('chai').should();
const expect = require('chai').expect;
const client = require('../waTestClient');
const msgsTexts = require('../../src/msgsTexts.json');

describe('Curators-ajuda', function () {

    it('Deve retornar o texto de ajuda, quando a hashtag de ajuda for utilizada', function (done) {
        
        
        var n_msgs = 0;
        var cmd_tests = ["#ajuda", "#Ajuda", "#AJUDA"];
        var expected_n_msg = cmd_tests.length;
         
        client.page._pageBindings.set("onMessage", message => {
            if ((message.sender.id !== process.env.TEST_WAID)) {return};

            if (n_msgs!==1){
                try{
                    expect(message.body).to.equal(msgsTexts.curator.HELP_MSG.join('\n').format(Object.keys(msgsTexts.replies).join(', ')));
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


    it('Não deve retornar ajuda se a hashtag estiver no meio do texto', function (done) {
        
        var n_msgs = 0;
        var cmd_tests = ["ssfda#ajuda", "asdf#Ajuda", ".\n#AJUDA", ".   #AJUDA"];
        var expected_n_msg = cmd_tests.length;
         
        client.page._pageBindings.set("onMessage", message => {
            if ((message.sender.id !== process.env.TEST_WAID)) {return};

            if (n_msgs!==1){
                try{
                    expect(message.body).to.equal(msgsTexts.user.INTRO_MSG.join('\n'));
                } catch (err){
                    done(err)
                    return;
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