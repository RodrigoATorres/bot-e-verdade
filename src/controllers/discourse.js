require('dotenv').config()
const fetch = require('node-fetch');
const config = {};
if (process.env.NODE_ENV === 'production'){
    config.API_URL = process.env.DISCOURSE_API_URL
    config.API_USERNAME = process.env.DISCOURSE_API_USERNAME
    config.API_KEY = process.env.DISCOURSE_API_KEY
    config.API_CAT_NO_SOLUTION_ID = process.env.DISCOURSE_API_CAT_NO_SOLUTION_ID
    config.API_CAT_SOLUTION_ID = process.env.DISCOURSE_API_CAT_SOLUTION_ID
    config.API_CAT_PROCESSING_ERROR_ID = process.env.API_CAT_PROCESSING_ERROR_ID
} else{
    config.API_URL = process.env.TESTING_DISCOURSE_API_URL
    config.API_USERNAME = process.env.TESTING_DISCOURSE_API_USERNAME
    config.API_KEY = process.env.TESTING_DISCOURSE_API_KEY
    config.API_CAT_NO_SOLUTION_ID = process.env.TESTING_DISCOURSE_API_CAT_NO_SOLUTION_ID
    config.API_CAT_SOLUTION_ID = process.env.TESTING_DISCOURSE_API_CAT_SOLUTION_ID
    config.API_CAT_PROCESSING_ERROR_ID = process.env.TESTING_API_CAT_PROCESSING_ERROR_ID
}

const {default: PQueue} = require('p-queue');
const fetchQueue = new PQueue({concurrency: 1});

const logger = require('../helpers/logger');
const generalHelpers = require('../helpers/general');

const Message = require('../models/message');
const MessageGroup = require('../models/messageGroup');

const messagesController = require('./messages');
const sendersController = require('./senders')

const msgsTexts = require('../msgsTexts.json');

const headers = {}
headers["Content-Type"] = "application/json";
headers["Api-Key"]= config.API_KEY;
headers["Api-Username"] = config.API_USERNAME;
headers["Accept"] = "application/json";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

fetchQueue.on('active', () => {
    if (fetchQueue.pending>2){
        logger.info(`Discourse api queue jobs pending: ${fetchQueue.pending}`)
    }
});

exports.config = config;

const fetchDiscordApiQueue = async (path, method, params, body , ntries, expect_json) =>{
    let url = new URL(`${config.API_URL}/${path}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
    let res;
    if (method === 'get'){
        res = await fetch(url,{
            method,
            headers
        })
    }
    else {
        res = await fetch(url,{
            method,
            body: JSON.stringify(body),
            headers
        })
    }

    if ( (path !== 'search') || (res.status !==200 )){
        logger.info(`Discourse api ${method} request to "${path}" ${res.status}:${res.statusText} Try number ${ntries+1}`)
    }

    if (expect_json){
        let json = await res.json()
        return json;
    }

}

const fetchDiscordApi = async (path, method, params={}, body = {}, ntries = 0, expect_json = true) =>{
    
        if ( (path !== 'search')){
            logger.info(`Discourse api ${method} request to "${path}" added to queue`)
        }

        try{
            return await fetchQueue.add( async() => fetchDiscordApiQueue(path, method, params, body, ntries, expect_json)) 
        }
        catch (err){
            if (ntries<3){
                await sleep(2000);
                return await fetchDiscordApi(path, method, params, body, ntries +1, expect_json);
            }
            else{
                logger.error(err);
                throw err;
            }
        }
};
exports.fetchDiscordApi = fetchDiscordApi;

exports.getNewReplyTopics = async (categ = config.API_CAT_NO_SOLUTION_ID) => {
    let res = await search({
            q:`category:${categ} status:solved`,
        });
    return res.topics ? res.topics: [];
};

const pickPoll = (polls, pollname) => {
    let pollNames = polls.map((poll) => poll.name)
    let idx = pollNames.indexOf(pollname)
    return polls[idx]
}

const getPollResult = (poll) =>{
    poll.options.sort(
        (a, b) =>{
            return ( b.votes - a.votes);
        }
    );
    return  poll.options[0].votes === poll.options[1].votes ? null: poll.options[0]
}

const getVeracityKey = (pollLabel) =>{
    let veracityLabel = pollLabel.slice(2);
    return Object.keys(msgsTexts.veracityLabels).find(key => msgsTexts.veracityLabels[key][0] === veracityLabel);
}

const getPollIndex = (discourseTopicVersion) =>{
    if (generalHelpers.compareVersionNumbers(discourseTopicVersion,'0.2.0') >= 0){
        return 2;
    }else {
        return 0;
    }
}

const updateMsgGroupTopic = async (messageGroup) =>{
    let topicInfo = await this.getTopic(messageGroup.discourseId);
    if (generalHelpers.compareVersionNumbers(messageGroup.discourseTopicVersion,'0.2.0') >= 0){
        const messages = await Message.find({_id: {$in: messageGroup.messages}}).populate('mediaMd5s');
        let new_body = genTopicBody(messageGroup, messages);
        await this.updateTopic( topicInfo.post_stream.posts[0].id, new_body.join('\n'));
    }
    else{
        messageGroup.populate('children')
        let body = [];
        messageGroup.children.forEach((child)=>{
            body.push(`${config.API_URL}/t/${child.discourseId}`)
        })
        this.answerTopic(
            body.join('\n'),
            messageGroup.discourseId
        )
    }
}

const getParentMsgGroup = async (body) => {
    let parentDiscouresId = body.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)\/t\/([-a-zA-Z0-9@:%_\+.~#?&=]*)\/([0-9]*)/)[6];
    return await MessageGroup.findOne({discourseId:parentDiscouresId});
}

const processDuplicate = async(msgGroup, topicReply) =>{
    let parentMsgGroup = await getParentMsgGroup(topicReply.raw)
    if (parentMsgGroup.parent){
        parentMsgGroup = await MessageGroup.findOneById({discourseId:parentMsgGroup.parent});
    }
    parentMsgGroup.children.push(msgGroup);
    msgGroup.parent = parentMsgGroup;
    await parentMsgGroup.save();
    msgGroup.replyDiscourseAuthor = topicReply.username;
    msgGroup.replyDate = new Date()
    sendersController.incrementRepyCount(topicReply.username)
    await msgGroup.save();
    await updateMsgGroupTopic(parentMsgGroup);
}

exports.processNewReplyTopic = async (topic, client) => {
    let msgGroup = await MessageGroup.findOne({discourseId:topic.id});
    let topicInfo = await this.getTopic(topic.id);

    await fetchDiscordApi(
        `t/-/${topicInfo.id}.json`,
        'put',
        {"category_id": config.API_CAT_PROCESSING_ERROR_ID}
    );

    let pollPostIdx = getPollIndex(msgGroup.discourseTopicVersion);
    let veracityKey = getVeracityKey(
        getPollResult(
            pickPoll(topicInfo.post_stream.posts[pollPostIdx].polls, "veracity")
        ).html
    );

    let topicReply = await fetchDiscordApi(
        `posts/${topicInfo.post_stream.stream[topicInfo.accepted_answer.post_number-1]}.json`,
        'get'
    );

    if (veracityKey == 'duplicate'){
        await processDuplicate(msgGroup, topicReply)
    }
    else{
        let replyText = msgsTexts.replies[veracityKey].join('\n').format(topicReply.raw);
        if (msgGroup){
            msgGroup.replyMessage = replyText;
            msgGroup.veracity = veracityKey;
            msgGroup.replyDiscourseAuthor = topicReply.username;
            msgGroup.replyDate = new Date()
            sendersController.incrementRepyCount(topicReply.username)
            await msgGroup.save()
        }
    }

    await messagesController.publishReply(msgGroup, client);
    await fetchDiscordApi(
        `t/-/${topicInfo.id}.json`,
        'put',
        {"category_id": config.API_CAT_SOLUTION_ID}
    );

}

exports.processAllNewReplyTopics = async (client) =>{
    let new_topics = await this.getNewReplyTopics();
    new_topics.forEach( topic => this.processNewReplyTopic(topic, client));
}

exports.updateForwardingScoreTag = async (messageGroup) => {
    let new_tag = await messagesController.getForwardingScoreTag(messageGroup)

    if (new_tag !== messageGroup.forwardingScoreTag) {

        let topicInfo = await this.getTopic(messageGroup.discourseId);
        let tags = topicInfo.tags.filter(tag => tag !== messageGroup.forwardingScoreTag)

        let res = await this.updateTopic(
            messageGroup.discourseId,
            { tags: tags.concat(new_tag) }
        )
        messageGroup.forwardingScoreTag = new_tag
        await messageGroup.save()
    }

}

const genTopicBody = (messageGroup, messages) =>{
    messageGroup.populate('children')

    let body = [];
    messages.forEach( (message, idx) =>{
        body.push(`Menssagem ${idx+1}`)
        if (message.texts && message.texts.length > 0){
            body.push(`>${message.texts[0].replace(/(\r\n?|\n|\t)/g,'\n>')}\n`);
        }
        else{
            switch (message.mediaExtensions[0]){
                case 'mp4':
                    body.push(`<div>\n\n![|video](${process.env.MEDIA_FOLDER_URL}/${message.mediaMd5s[0]._id}.${message.mediaExtensions[0]})</div>`)
                    break;
                case 'oga':
                    body.push(`<div align="center">\n\n![|audio](${process.env.MEDIA_FOLDER_URL}/${message.mediaMd5s[0]._id}.${message.mediaExtensions[0]})</div>`)
                    break;
                case 'm4a':
                    body.push(`<div align="center">\n\n![|audio](${process.env.MEDIA_FOLDER_URL}/${message.mediaMd5s[0]._id}.${message.mediaExtensions[0]})</div>`)
                    break;
                default:
                    body.push(`<div align="center">\n\n![](${process.env.MEDIA_FOLDER_URL}/${message.mediaMd5s[0]._id}.${message.mediaExtensions[0]})</div>`)
            }
            body.push(`<div align="center">\n\n[Media Link](${process.env.MEDIA_FOLDER_URL}/${message.mediaMd5s[0]._id}.${message.mediaExtensions[0]})</div>`)
            body.push(`<details><summary>Texto Extraído</summary><p>${message.mediaMd5s[0].mediaText}</p></details>`)
        }
    });

    if ( 
        (!messageGroup.discourseTopicVersion || generalHelpers.compareVersionNumbers(messageGroup.discourseTopicVersion,'0.2.0') >= 0) 
        && (messageGroup.children.length>0) 
        )
        {
        body.push('\n\n');
        body.push(`<details><summary>Duplicadas</summary><p>\n`);
        messageGroup.children.forEach((child) =>{
            body.push(`${config.API_URL}/t/${child.discourseId}`)
        });
        body.push(`\n</p></details>`);
    }
    
    return body;
}

exports.addMessage = async (messageGroup) => {

    const messages = await Message.find({_id: {$in: messageGroup.messages}}).populate('mediaMd5s');
    let title = `${messageGroup.tags.slice(0,9).map(tag=>tag.name).join(' ')}`.slice(0,200) + ` | id:${messageGroup._id}`
    let topicBody = genTopicBody(messageGroup, messages)

    let scoreTag = await messagesController.getForwardingScoreTag(messageGroup)
    messageGroup.forwardingScoreTag = scoreTag

    let json = await this.createTopic(
        {
            title,
            tags: messageGroup.tags.slice(0,9).map(tag=>tag.name).concat(scoreTag),
            category: config.API_CAT_NO_SOLUTION_ID,
            raw: topicBody.join('\n')
        }
    )
    logger.info(`New topic added to discourse ${json.topic_id}`)


    let checklist_body = []
    checklist_body.push(`|${msgsTexts.discourse.task_checklist.started}|${msgsTexts.discourse.task_checklist.finished}|${msgsTexts.discourse.task_checklist.task}|`)
    checklist_body.push('|-|-|-|')
    msgsTexts.discourse.task_checklist.list.forEach( (task) =>{
        checklist_body.push(`|[]|[]|${task}|`)
    }
    )

    let wiki_json = await this.answerTopic(
        checklist_body.join('\n'),
        json.topic_id
    )

    await this.setPostAsWiki(wiki_json.id);

    let body = []
    body.push("Baseado na sua pesquisa, essa publicação parece:\n");
    body.push("[poll name=veracity public=true chartType=bar]");
    body.push(Object.keys(msgsTexts.veracityLabels).map( (key,idx) => `* ${idx}-${msgsTexts.veracityLabels[key]}`).join('\n')),
    body.push("[/poll]");

    if (messages.length>1){
        body.push('Quais mensagens devem estar juntas para essa notícia ser considerada?\n');
        body.push(
            [
                "[poll name=relevant_msgs type=multiple min=1 max = 10 public=true chartType=bar]",
                ...Array.from(Array(messages.length), (_, i) => `* ${i + 1}`),
                "[/poll]"
            ].join('\n')
        );
    }

    await this.answerTopic(
        body.join('\n'),
        json.topic_id
    );
    
    messageGroup.discourseId = json.topic_id;
    messageGroup.discourseTopicVersion = generalHelpers.__version__;
    await messageGroup.save();
    return json.topic_id;
}


exports.updateTopic = async (topic_id, data) => {
    return fetchDiscordApi(
        `t/-/${topic_id}`,
        'put',
        {},
        data
    )
}

const search = (params) =>{
    return fetchDiscordApi(`search`, 'get', params);
}

exports.updateTopic = (postId, newRaw) =>{
    return fetchDiscordApi(
        `posts/${postId}.json`,
        'put',
        {},
        {post: {raw: newRaw}},
    )
}

exports.setPostAsWiki = (postId, wiki = true) =>{
    return fetchDiscordApi(
        `posts/${postId}/wiki`,
        'put',
        {},
        {wiki},
        0,
        false
    )
}

exports.createTopic = (data) =>{
    return fetchDiscordApi(
        'posts.json',
        'post',
        {},
        data
    )
}

exports.getNoReplyTopics = async (categ = config.API_CAT_NO_SOLUTION_ID) =>{
    let res = await search({
        q:`category:${categ} status:unsolved`,
    });
    return res.topics ? res.topics: [];
}

exports.answerTopic = (message, topicId) =>{
    return fetchDiscordApi(
        'posts.json',
        'post',
        {},
        {
            topic_id: topicId,
            raw: message
        }
    )

}

exports.getTopic = (topicId) =>{
    return fetchDiscordApi(
        `t/${topicId}.json`,
        'get',
        {},
        {}
)};

exports.acceptAnswer = async (post_id) =>{
    return fetchDiscordApi(
        'solution/accept',
        'post',
        {},
        {
            id: post_id,
        }
    )
}

exports.voteOnPoll = async (post_id, poll_name, options) => {
    return fetchDiscordApi(
        'polls/vote',
        'put',
        {},
        {
            post_id,
            poll_name,
            options
        }
    )
}

exports.voteVeracity = async (topicId, veracity, topicVersion = generalHelpers.__version__) => {
    let topicInfo = await this.getTopic(topicId);
    let veracity_idx = Object.keys(msgsTexts.veracityLabels).indexOf(veracity);
    let pollPostIdx = getPollIndex(topicVersion);

    return this.voteOnPoll(
        topicInfo.post_stream.posts[pollPostIdx].id,
        "veracity",
        [pickPoll(topicInfo.post_stream.posts[pollPostIdx].polls, "veracity").options[veracity_idx].id]
    )

}

exports.sendPrivateMessage = ( userNames, title, message) =>{
    let target_recipients = userNames.join(',');
    return fetchDiscordApi(
        'posts.json',
        'post',
        {},
        {
            archetype: "private_message",
            title,
            target_recipients,
            raw:message
        }
    )
}

exports.getPrivateMessages = (userName) =>{
    return fetchDiscordApi(
        `topics/private-messages/${userName}.json`,
        'get',
        {},
        {}
    )
}