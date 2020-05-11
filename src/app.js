// import { create, Whatsapp } from '@open-wa/wa-automate';
const wa = require('@open-wa/wa-automate');
var CronJob = require('cron').CronJob;
const mongoose = require('mongoose');
const messageControler = require('./controllers/messages')
const curatorControler = require('./controllers/curators')

const DB_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME;
const DB_ROOT_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD;
const DB_ADDRES = process.env.MONGO_INITDB_DB_ADDRES || 'localhost:27017';
const DB_NAME = process.env.DB_NAME;
const MONGO_URL = process.env.MONGO_URL || `mongodb://${DB_USERNAME}:${DB_ROOT_PASSWORD}@${DB_ADDRES}/${DB_NAME}?authSource=admin`;

console.log(MONGO_URL);

mongoose
  .connect(
    MONGO_URL
  )
  .then(result => {
    wa.create().then(client => start(client));
  })
  .catch(err => console.log(err));

function start(client) {
    
    var intervalCheckReports = setInterval(function(){messageControler.check_reports(client)}, 60000);

    var sendStatusJob = new CronJob('00 37 18 * * *', curatorControler.sendStatusAll(client), undefined, true, "America/Sao_Paulo");
    sendStatusJob.start();

    client.onMessage(message => {
    //console.log(message);
    if (message.isForwarded){
        messageControler.check_message(message,client);
    }
    else{
        if(!message.isGroupMsg) {
            if(message.body.charAt(0) == '#'){
                curatorControler.execute_command(message, client)
                .then()
                .catch( err => {
                  client.sendText(message.sender.id, `Não foi possível processar menssagem:\n${err}`);
                  client.sendSeen(message.chatId);
                }
                )
            }
            else{
                
                if (client.getAllMessagesInChat(message.chatId, true, false).length < 3){
                    messageControler.intro(message,client);
                }
            }
        }       
    }
  });
}

module.exports = start;