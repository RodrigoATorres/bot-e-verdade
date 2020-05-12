var deasync = require('deasync');
const wa = require('@open-wa/wa-automate');

var done = false;
var client;

wa.create({sessionId:'testing'}).then(res =>{
    client = res;
    done = true;
})

require('deasync').loopWhile(function(){return !done;});

module.exports = client