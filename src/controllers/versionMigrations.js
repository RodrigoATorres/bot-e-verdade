const DbInfo = require('../models/dbInfo');
const MessageGroup = require('../models/messageGroup');
const Media = require('../models/media');

const discourseController = require('./discourse');
const messagesController = require('./messages');

const logger = require('../helpers/logger');
const generalHelper = require('../helpers/general');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const recreateTopics = async (client) => {

    let noTopicGroups = await MessageGroup.find({ "discourseId" : { "$exists" : false } })
    noTopicGroups.forEach( async (messageGroup) => {
        let topic_id = await discourseController.addMessage(messageGroup);
        messageGroup.reportUsers.forEach( async (userInfo) =>{
            await messagesController.sendTopicInfo(client, userInfo.senderId, topic_id);
            await sleep(15000);
        })
    })

}


module.exports = async (client) => {
    
    let latestDbInfo = await DbInfo.findOne({}, {}, { sort: { 'created_at' : -1 } })

    if (latestDbInfo === null){
        latestDbInfo = { releaseVersion: '0.0.0'}
    }

    logger.info(`Current Version ${latestDbInfo.releaseVersion}`);

    if (generalHelper.compareVersionNumbers(latestDbInfo.releaseVersion, '0.1.3.1') < 0){
        logger.info('running db uptdate 0.1.3.1');
        console.log('running db uptdate 0.1.3.1');
        await recreateTopics(client);

        await DbInfo.create({
            releaseVersion: '0.1.3.1'
        }
        );
    }

    if (generalHelper.compareVersionNumbers(latestDbInfo.releaseVersion, '0.2.0') < 0){
        logger.info('running db uptdate 0.2.0');
        console.log('running db uptdate 0.2.0');

        await Media.update({ fileHashes: { $exists: false } }, { fileHashes: [] }, { multi: true })
        await Media.update({ children: { $exists: false } }, { children: [] }, { multi: true })
        await Media.update({ isSubSetOf: { $exists: false } }, { isSubSetOf: [] }, { multi: true })
        await MessageGroup.update({ discourseTopicVersion: { $exists: false } }, { discourseTopicVersion: '0.0.1' }, { multi: true })

        await DbInfo.create({
            releaseVersion: '0.2.0'
        }
        );
    }

}