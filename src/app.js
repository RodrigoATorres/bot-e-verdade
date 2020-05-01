// import { create, Whatsapp } from '@open-wa/wa-automate';
const wa = require('@open-wa/wa-automate');
const messageControler = require('./controllers/messages')
const curatorControler = require('./controllers/curators')
const mongoose = require('mongoose');
const DB_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME;
const DB_ROOT_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD;
const DB_ADDRES = process.env.MONGO_INITDB_DB_ADDRES || 'localhost:27017';
const DB_NAME = process.env.DB_NAME;


console.log(    `mongodb://${DB_USERNAME}:${DB_ROOT_PASSWORD}@${DB_ADDRES}/${DB_NAME}?authSource=admin`);

mongoose
  .connect(
    `mongodb://${DB_USERNAME}:${DB_ROOT_PASSWORD}@${DB_ADDRES}/${DB_NAME}?authSource=admin`
  )
  .then(result => {
    wa.create().then(client => start(client));
  })
  .catch(err => console.log(err));

  
function start(client) {
    client.onMessage(message => {
    console.log(message);
    if (message.isForwarded){
        console.log('here')
        messageControler.check_message(message,client);
        messageControler.check_reports(client);
    }
    else{
        if(!message.isGroupMsg) {
            messageControler.intro(message,client);
        }
        messageControler.check_reports(client);
        if(message.body.charAt(0) == '#'){
            curatorControler.execute_command(message, client);
        }
    }
  });
}