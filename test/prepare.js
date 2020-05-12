var deasync = require('deasync');
const mongoUnit = require('mongo-unit')

var isdone = false;

function startAll(){
    if (isdone){return}

    function done(){
        console.log('aqui')
        isdone = true;
    }

    mongoUnit.start()
    .then(testMongoUrl => {
        process.env.MONGO_URL = testMongoUrl;
        var start = require('../src/app')
        start(done)
    });
    require('deasync').loopWhile(function(){return !isdone;});
}

module.exports = startAll;