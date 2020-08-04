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

const Message = require('../models/message');
const MessageGroup = require('../models/messageGroup');

const messagesController = require('./messages');

const msgsTexts = require('../msgsTexts.json');

const headers = {}
headers["Content-Type"] = "application/json";
headers["Api-Key"]= config.API_KEY;
headers["Api-Username"] = config.API_USERNAME;
headers["Accept"] = "application/json";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const fetchDiscordApi = async (path, method, params={}, body = {}, ntries = 0) =>{
    return await fetchQueue.add( async() => { 
        try{
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
            logger.info(`Discourse api ${method} request to "${path}" ${res.status}:${res.statusText} Try number ${ntries+1}`)
            return await res.json();
        }
        catch (err){
            if (ntries<3){
                await sleep(2000);
                return await fetchDiscordApi(path, method, params, body, ntries +1);
            }
            else{
                logger.error(err);
                throw err;
            }
        }
    })
};

const search = (params) =>{
    return fetchDiscordApi(`search`, 'get', params);
}

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

exports.processNewReplyTopic = async (topic, client) => {
    let msgGroup = await MessageGroup.findOne({discourseId:topic.id});
    let topicInfo = await this.getTopic(topic.id);
    try {
        let veracityKey = getVeracityKey(
            getPollResult(
                pickPoll(topicInfo.post_stream.posts[0].polls, "veracity")
            ).html
        );

        let topicReply = await fetchDiscordApi(
            `posts/${topicInfo.post_stream.stream[topicInfo.accepted_answer.post_number-1]}.json`,
            'get'
        );
        let replyText = msgsTexts.replies[veracityKey].join('\n').format(topicReply.raw);
    
        if (msgGroup){
            msgGroup.replyMessage = replyText;
            msgGroup.veracity = veracityKey;
            await msgGroup.save()
            messagesController.publishReply(msgGroup, client);
        }
        await fetchDiscordApi(
            `t/-/${topicInfo.id}.json`,
            'put',
            {"category_id": config.API_CAT_SOLUTION_ID}
        );
    } catch (err) {
        await fetchDiscordApi(
            `t/-/${topicInfo.id}.json`,
            'put',
            {"category_id": config.API_CAT_PROCESSING_ERROR_ID}
        );
        throw err
    }

}



exports.processAllNewReplyTopics = async (client) =>{
    let new_topics = await this.getNewReplyTopics();
    new_topics.forEach( topic => this.processNewReplyTopic(topic, client));
}

exports.createTopic = (data) =>{
    return fetchDiscordApi(
        'posts.json',
        'post',
        {},
        data
    )
}

exports.addMessage = async (messageGroup) => {
    const messages = await Message.find({_id: {$in: messageGroup.messages}});
    let body = [];
    messages.forEach( (message, idx) =>{
        body.push(`Menssagem ${idx+1}`)
        if (message.texts && message.texts.length > 0){
            body.push(`>${message.texts[0].replace(/(\r\n?|\n|\t)/g,'\n>')}\n`);
        }
        else{
            switch (message.mediaExtensions[0]){
                case 'mp4':
                    body.push(`<div>\n\n![|video](${process.env.MEDIA_FOLDER_URL}/${message.mediaMd5s[0]}.${message.mediaExtensions[0]})</div>`)
                    break;
                case 'oga':
                    body.push(`<div align="center">\n\n![|audio](${process.env.MEDIA_FOLDER_URL}/${message.mediaMd5s[0]}.${message.mediaExtensions[0]})</div>`)
                    break;
                default:
                    body.push(`<div align="center">\n\n![](${process.env.MEDIA_FOLDER_URL}/${message.mediaMd5s[0]}.${message.mediaExtensions[0]})</div>`)
            }
        }
    });

    body.push("Baseado na sua pesquisa, essa publicação parece:\n");
    body.push("[poll name=veracity results=on_vote public=true chartType=bar]");
    body.push(Object.keys(msgsTexts.veracityLabels).map( (key,idx) => `* ${idx}-${msgsTexts.veracityLabels[key]}`).join('\n')),
    body.push("[/poll]");

    if (messages.length>1){
        body.push('Quais mensagens devem estar juntas para essa notícia ser considerada?\n');
        body.push(
            [
                "[poll name=relevant_msgs type=multiple min=1 max = 10 results=on_vote public=true chartType=bar]",
                ...Array.from(Array(messages.length), (_, i) => `* ${i + 1}`),
                "[/poll]"
            ].join('\n')
        );
    }
    
    let title = `${messageGroup.tags.slice(0,9).map(tag=>tag.name).join(' ')}`.slice(0,200) + `|id:${messageGroup._id}`

    let json = await this.createTopic(
        {
            title,
            tags: messageGroup.tags.slice(0,9).map(tag=>tag.name),
            category: config.API_CAT_NO_SOLUTION_ID,
            raw: body.join('\n')
        }
    )
    logger.info(`New topic added to discourse ${json.topic_id}`)
    messageGroup.discourseId = json.topic_id;
    await messageGroup.save();
    return json.topic_id;
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

exports.voteVeracity = async (topicId, veracity) => {
    let topicInfo = await this.getTopic(topicId);
    let veracity_idx = Object.keys(msgsTexts.veracityLabels).indexOf(veracity);

    return this.voteOnPoll(
        topicInfo.post_stream.posts[0].id,
        "veracity",
        [pickPoll(topicInfo.post_stream.posts[0].polls, "veracity").options[veracity_idx].id]
    )

}