const DbInfo = require('../models/dbInfo');
const MessageGroup = require('../models/messageGroup');

const discourseController = require('./discourse');
const messagesController = require('./messages');

const logger = require('../helpers/logger');

function isPositiveInteger(x) {
    // http://stackoverflow.com/a/1019526/11236
    return /^\d+$/.test(x);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Compare two software version numbers (e.g. 1.7.1)
 * Returns:
 *
 *  0 if they're identical
 *  negative if v1 < v2
 *  positive if v1 > v2
 *  Nan if they in the wrong format
 *
 *  E.g.:
 *
 *  assert(version_number_compare("1.7.1", "1.6.10") > 0);
 *  assert(version_number_compare("1.7.1", "1.7.10") < 0);
 *
 *  "Unit tests": http://jsfiddle.net/ripper234/Xv9WL/28/
 *
 *  Taken from http://stackoverflow.com/a/6832721/11236
 */
function compareVersionNumbers(v1, v2){
    var v1parts = v1.split('.');
    var v2parts = v2.split('.');

    // First, validate both numbers are true version numbers
    function validateParts(parts) {
        for (var i = 0; i < parts.length; ++i) {
            if (!isPositiveInteger(parts[i])) {
                return false;
            }
        }
        return true;
    }
    if (!validateParts(v1parts) || !validateParts(v2parts)) {
        return NaN;
    }

    for (var i = 0; i < v1parts.length; ++i) {
        if (v2parts.length === i) {
            return 1;
        }

        if (v1parts[i] === v2parts[i]) {
            continue;
        }
        if (v1parts[i] > v2parts[i]) {
            return 1;
        }
        return -1;
    }

    if (v1parts.length != v2parts.length) {
        return -1;
    }

    return 0;
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

    if (compareVersionNumbers(latestDbInfo.releaseVersion, '0.1.3') < 0){
        logger.info('running db uptdate 0.1.3');
        console.log('running db uptdate 0.1.3');
        await recreateTopics(client);

        await DbInfo.create({
            releaseVersion: '0.1.3'
        }
        );
    }

}