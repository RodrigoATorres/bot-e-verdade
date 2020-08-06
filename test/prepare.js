require('dotenv').config()
const wa = require('@open-wa/wa-automate');
const deasync = require('deasync');
const mongoUnit = require('mongo-unit');
const {start} = require('../src/app');
const discourseController = require('../src/controllers/discourse')

let isDbStarted = false;
let isAppStarted = false;
let isTestWpStarted = false;
let testWpClient = null;
let testWpGroupsCreated = false;
let testWpGroups = [];
let testWpMsgsCreated = false;
let testWpMsgs = [];

module.exports.startDb = () =>{
    if (isDbStarted){
        return
    } else{
        mongoUnit.start()
        .then(testMongoUrl => {
            process.env.MONGO_URL = testMongoUrl;
            isDbStarted = true;
        });
    }
    deasync.loopWhile(function(){return !isDbStarted;});
}

module.exports.startApp = () =>{
    if (isAppStarted){
        return
    } else{
        start(()=>{isAppStarted = true});
    }
    deasync.loopWhile(function(){return !isAppStarted;});
}

module.exports.startTestWp = () =>{
    if (isTestWpStarted){
        return testWpClient;
    } else{
        wa.create({sessionDataPath: 'SessionData', sessionId:'testing', disableSpins:true})
        .then( (client) => {
            testWpClient = client;
            return client.onMessage( () => {})
        })
        .then( () => {
            isTestWpStarted = true;
        })    
    }
    deasync.loopWhile(function(){return !isTestWpStarted;});
    return testWpClient;
}

const verifyGroupId = async (id, name) => {
    try{
        await testWpClient.getGroupAdmins(id);
        testWpGroups.push(id);
    } catch{
        console.log('Criando grupo de teste')
        let group_data = await testWpClient.createGroup(name, [process.env.BOT_WA_ID])
        testWpGroups.push(group_data.gid._serialized);
        console.log(`Altere a variável TEST_WA_GROUP13_ID no seu env para "${group_data.gid._serialized}"`)
    }
}

module.exports.getTestWpGroups = () =>{
    if (testWpGroupsCreated){
        return testWpGroups;
    } else{
        verifyGroupId(process.env.TEST_WA_GROUP1_ID, 'TEST_WA_GROUP1_ID' )
        .then( () =>{
            return verifyGroupId(process.env.TEST_WA_GROUP2_ID, 'TEST_WA_GROUP2_ID' )
        })
        .then( () =>{
            return verifyGroupId(process.env.TEST_WA_GROUP3_ID, 'TEST_WA_GROUP3_ID' )
        })
        .then( () =>{
            testWpGroupsCreated = true;
        })

    deasync.loopWhile(function(){return !testWpGroupsCreated;});
    return testWpGroups;
    }
}

module.exports.getTestMessages = () =>{
    if (testWpMsgsCreated){
        return testWpMsgs;
    }
    testWpClient._page._pageBindings.set("onMessage", (message) => {
        if (message.sender.id === process.env.BOT_WA_ID){
            testWpMsgs.push(message.id)
            if (testWpMsgs.length === 4){
                testWpMsgsCreated = true;
                testWpClient._page._pageBindings.set("onMessage", message => console.log(message.id))
            }
        }
    })
    testWpClient.sendText(process.env.BOT_WA_ID,'sendTestMessages')
    deasync.loopWhile(function(){return !testWpMsgsCreated;});
    return testWpMsgs;
}


let myInfo = false;
module.exports.getMyInfo = () =>{
    testWpClient.getMe()
    .then((me) =>{
        myInfo = me
    });
    deasync.loopWhile(function(){return !myInfo;});
    return myInfo;
}

module.exports.simulateDiscourseDown = () =>{
    discourseController.config.API_URL = 'www.urlthatwillnevereverwork.never.work'
}

module.exports.simulateDiscourseRestore = () =>{
    discourseController.config.API_URL = process.env.TESTING_DISCOURSE_API_URL
}