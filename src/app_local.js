const mongoUnit = require('mongo-unit')
const glob = require('glob');
const path = require('path');
var fs = require('fs');
var json2mongo = require('json2mongo');

let test_data = {}
let files = glob.sync('./test/__test_data/*.json')
for (let file of files){
    test_data[path.parse(file).name] = JSON.parse(fs.readFileSync(file))
}
fs.writeFileSync('./test/test_data.json', JSON.stringify(test_data));

var ps = require('ps-node');

// A simple pid lookup
ps.lookup({
    command: 'mongodb-memory-server',
    }, function(err, resultList ) {
    if (err) {
        throw new Error( err );
    }

    resultList.forEach(function( process ){
        if( process ){
            ps.kill( process.pid, function( err ) {
                if (err) {
                    throw new Error( err );
                }
                else {
                    console.log( 'Process %s has been killed!', process.pid, );
                }
            });
        }
    });
});


mongoUnit.start()
.then(testMongoUrl => {
    process.env.NODE_ENV = 'test'
    process.env.MONGO_URL = testMongoUrl
    const testData = require("../test/test_data.json");
    mongoUnit.load(json2mongo(testData))
})
.then(()=>{
    var {start} = require('./app.js')
    start();
})