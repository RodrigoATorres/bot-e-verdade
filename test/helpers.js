const mongoUnit = require("mongo-unit");
var json2mongo = require('json2mongo');
startAll = require('./prepare')

const testData = require("./test_data.json");

beforeEach((done) => {
    startAll()
    mongoUnit.load(json2mongo(testData)).
    then(()=>{done()})
    .catch(err =>{
        done()
    })
})

afterEach(() => mongoUnit.drop());
