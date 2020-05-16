var deasync = require('deasync');
const wa = require('@open-wa/wa-automate');

var done = false;
var client;

wa.create({sessionId:'testing'}).then(res =>{
    client = res;
    done = true;
    client.onMessage(message => console.log('NO ON MESSAGE CALLBACK SET'))
})

require('deasync').loopWhile(function(){return !done;});

module.exports = client