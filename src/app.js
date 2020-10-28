// import { create, Whatsapp } from '@open-wa/wa-automate';
const path = require('path')
require('dotenv').config({path: path.join(__dirname, "../.env")})
require('./helpers/general')
const wa = require('@open-wa/wa-automate');
// var CronJob = require('cron').CronJob;
const mongoose = require('mongoose');
const fs = require('fs');
const msgsTexts = require('./msgsTexts.json');

const messageBufferController =  require('./controllers/messageBuffers');
const senderControler = require('./controllers/senders');
const discourseController = require('./controllers/discourse');
const messageControler = require('./controllers/messages')
const reportController = require('./controllers/reports')

const versionMigrations = require('./controllers/versionMigrations')
// const curatorControler = require('./controllers/curators')

if (require.main === module) {
  start()
} 

const sendTestMsgs = async (client) => {
    client.sendText(process.env.TEST_WAID, 'Esse é um teste de uma mensagem que poderia ser enviada por um usuário');
    client.sendText(process.env.TEST_WAID, 'Esse é um teste de uma segunda mensagem que poderia ser enviada por um usuário');
    client.sendText(process.env.TEST_WAID, 'Esse é um teste de uma terceira mensagem que poderia ser enviada por um usuário');
    const imageContent = fs.readFileSync('test/__test_media/c0eb8f61fcffc66ac41fd2f5d1421bb7.jpeg', {encoding: 'base64'});
    await client.sendImage(
      process.env.TEST_WAID,
          `data:image/jpeg;base64,${imageContent}`,
          'teste.jpeg',
        );
}


function start(done = function() { return; }) {

  const DB_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME;
  const DB_ROOT_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD;
  const DB_ADDRES = process.env.MONGO_INITDB_DB_ADDRES;
  const DB_NAME = process.env.DB_NAME;
  const MONGO_URL = process.env.MONGO_URL || `mongodb://${DB_USERNAME}:${DB_ROOT_PASSWORD}@${DB_ADDRES}/${DB_NAME}?authSource=admin`;

  console.log(MONGO_URL);

  mongoose
    .connect(
      MONGO_URL
    )
    .then( () => {
        wa.create({sessionDataPath: 'SessionData', disableSpins:true})
        .then(async client => {

          reportController.setClient(client);
          
          await versionMigrations(client);

          if (process.env.NODE_ENV !== 'test'){
            reportController.setPublishReportCron( '0 10 * * 6' ,()=> [new Date(new Date() - 7*24*60*60*1000), new Date()]);
          }

          setInterval(function(){messageBufferController.processBuffer(client)}, 500);
          setInterval(function(){discourseController.processAllNewReplyTopics(client)}, 5000);

          client.onAddedToGroup( (chat) =>{
            client.sendText(chat.id, msgsTexts.group.INTRO_MSG.join('\n'));
            client.sendContact(chat.id, process.env.BOT_WA_ID);
          }
          );

          client.onMessage(message => {

            if (process.env.NODE_ENV === 'test' && message.content === 'sendTestMessages'){
              sendTestMsgs(client);
              return
            }

            if (message.isGroupMsg && !message.isForwarded){
              return;
            }
            
            if (!message.isGroupMsg){
              senderControler.registerSender(message, client);
            }

            if (!message.isGroupMsg && !message.isForwarded){
              messageControler.processCommands(message, client);
            }

            if (message.isForwarded){
                messageBufferController.addMessage(message,client);
                fs.writeFile(`./Received_msgs/${message.id}.json`, JSON.stringify(message), (err) => { if (err) throw err; });
                return;
            }
                        
          });
        done();
      });
    })
    .catch(err => console.log(err));  
  }

module.exports.start = start;
