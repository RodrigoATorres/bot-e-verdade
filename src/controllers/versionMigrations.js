const DbInfo = require('../models/dbInfo');
const MessageGroup = require('../models/messageGroup');
const Media = require('../models/media');
const Sender = require('../models/sender');

const discourseController = require('./discourse');
const messagesController = require('./messages');
const sendersController = require('./senders');

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

        // Reports
        await Sender.update({ acceptedRepliesCount: { $exists: false } }, { acceptedRepliesCount: 0 }, { multi: true })
        
        let noDiscourseAuthorDocs = await MessageGroup.find({replyDiscourseAuthor:{ $exists: false } })
        for (let doc of noDiscourseAuthorDocs){
            if (doc.veracity){
                try{
                    let topicInfo = await discourseController.getTopic(doc.discourseId);

                    let topicReply = await discourseController.fetchDiscordApi(
                        `posts/${topicInfo.post_stream.stream[topicInfo.accepted_answer.post_number-1]}.json`,
                        'get'
                    );
                    
                    doc.replyDiscourseAuthor = topicReply.username;
                    doc.replyDate = new Date(topicReply.updated_at)
                    await sendersController.incrementRepyCount(topicReply.username)
                    await doc.save()
                    console.log(doc.discourseId)
                    await sleep(2000)
                }
                catch(err){
                    console.log(err)
                    console.log(doc.discourseId)
                }
            }
            else{
                console.log(doc);
            }
        }

        await DbInfo.create({
            releaseVersion: '0.2.0'
        }
        );
    }

}