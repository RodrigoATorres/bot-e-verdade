const mongoUnit = require('mongo-unit')
const glob = require('glob');
const path = require('path');
var fs = require('fs');
var json2mongo = require('json2mongo');
const mongoose = require('mongoose');

var test_data = {}
files = glob.sync('./test/__test_data/*.json')
for (let file of files){
    test_data[path.parse(file).name] = JSON.parse(fs.readFileSync(file))
}
fs.writeFileSync('./test/test_data.json', JSON.stringify(test_data));

mongoUnit.start()
.then(testMongoUrl => {
    process.env.MONGO_URL = testMongoUrl
    const testData = require("../test/test_data.json");
    mongoUnit.load(json2mongo(testData))
})
.then(()=>{
    var start = require('./app.js')
})