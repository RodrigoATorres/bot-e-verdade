// import { create, Whatsapp } from '@open-wa/wa-automate';
require('dotenv').config()
require('./helpers/general')
const wa = require('@open-wa/wa-automate');
// var CronJob = require('cron').CronJob;
const mongoose = require('mongoose');
const fs = require('fs');
const msgsTexts = require('./msgsTexts.json');

const messageBufferController =  require('./controllers/messageBuffers');
const senderControler = require('./controllers/senders');
const discourseController = require('./controllers/discourse');
// const messageControler = require('./controllers/messages')
// const curatorControler = require('./controllers/curators')

const DB_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME;
const DB_ROOT_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD;
const DB_ADDRES = process.env.MONGO_INITDB_DB_ADDRES || 'localhost:27017';
const DB_NAME = process.env.DB_NAME;
const MONGO_URL = process.env.MONGO_URL || `mongodb://${DB_USERNAME}:${DB_ROOT_PASSWORD}@${DB_ADDRES}/${DB_NAME}?authSource=admin`;

if (require.main === module) {
  start()
} 

function start(done = function() { return; }) {
  console.log(MONGO_URL);

  mongoose
    .connect(
      MONGO_URL
    )
    .then( () => {
        wa.create({sessionDataPath: 'SessionData'})
        .then(client => {
          setInterval(function(){messageBufferController.processBuffer(client)}, 1000);
          setInterval(function(){discourseController.processNewReplyTopics(client)}, 5000);
          // var intervalCheckReviewers = setInterval(function(){curatorControler.resetReviewers(client)}, 120000);
          if (process.env.NODE_ENV !== 'test'){
            // var intervalCheckReports = setInterval(function(){messageControler.check_reports(client)}, 150000);
            // var sendStatusJob = new CronJob('00 37 18 * * *', curatorControler.sendStatusAll(client), undefined, true, "America/Sao_Paulo");
            // sendStatusJob.start();
          }

          client.onAddedToGroup( (chat) =>{
            client.sendText(chat.id, msgsTexts.group.INTRO_MSG.join('\n'));
            client.sendContact(chat.id,process.env.BOT_WA_ID)
          }
          );

          client.onMessage(message => {

            if (message.isGroupMsg && !message.isForwarded){
              return;
            }

            message.bot = {};
            senderControler.registerSender(message, client);

            if (message.isForwarded){
                messageBufferController.addMessage(message,client);
                fs.writeFile(`./Received_msgs/${message.id}.json`, JSON.stringify(message), (err) => { if (err) throw err; });
                return;
            }
            
            if(message.body.charAt(0) == '#' && message.bot.sender.isCurator){
                // curatorControler.execute_command(message, client)
                // .then()
                // .catch( err => {
                //   client.sendText(message.sender.id, `Não foi possível processar menssagem:\n${err}`);
                //   client.sendSeen(message.chatId);
                // }
                // )
            }

          });
        done();
      });
    })
    .catch(err => console.log(err));  
  }

module.exports = start;
