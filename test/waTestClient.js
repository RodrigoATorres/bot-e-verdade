var deasync = require('deasync');
const wa = require('@open-wa/wa-automate');

var done = false;
var client;

wa.create({sessionDataPath: 'SessionData', sessionId:'testing'}).then(res =>{
    client = res;
    done = true;
    client.onMessage(message => console.log(message.id))
})

require('deasync').loopWhile(function(){return !done;});

module.exports = client