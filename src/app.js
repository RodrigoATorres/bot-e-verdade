// import { create, Whatsapp } from '@open-wa/wa-automate';
const wa = require('@open-wa/wa-automate');
const messageControler = require('./controllers/messages')
const mongoose = require('mongoose');

mongoose
  .connect(
    'mongodb://root:example@192.168.0.52:27017/BotEVerdade?authSource=admin'
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
    }
  });
}