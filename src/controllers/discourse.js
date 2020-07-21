const fetch = require('node-fetch');

const userApiKey = process.env.DISCOURSE_API_KEY;
const apiUsername = process.env.DISCOURSE_API_USERNAME;
const baseUrl = process.env.DISCOURSE_API_URL;

const logger = require('../helpers/logger');

const Message = require('../models/message');
const MessageGroup = require('../models/messageGroup');

const messagesController = require('./messages');

const msgsTexts = require('../msgsTexts.json');

const headers = {}
headers["Content-Type"] = "application/json";
headers["Api-Key"]= userApiKey;
headers["Api-Username"] = apiUsername;
headers["Accept"] = "application/json";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const fetchDiscordApi = async (path, method, params={}, body = {}, ntries = 0) =>{
    try{
        let url = new URL(`${baseUrl}/${path}`);
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
};

const search = (params) =>{
    return fetchDiscordApi(`search`, 'get', params);
}

const getNewReplyTopics = async () => {
    let res = await search({
            q:`#${process.env.DISCOURSE_API_CAT_NO_SOLUTION} status:solved`,
        });
    return res.topics ? res.topics: [];
};

const getPollResult = (poll) =>{
    return poll.options.reduce(
        (prev, cur) =>{
            return ( prev.votes <= cur.votes ? cur : prev );
        },
        {votes:-1}
    );
}

const getVeracityKey = (pollLabel) =>{
    let veracityLabel = pollLabel.slice(2);
    return Object.keys(msgsTexts.veracityLabels).find(key => msgsTexts.veracityLabels[key][0] === veracityLabel);
}

exports.processNewReplyTopics = async (client) =>{
    let new_topics = await getNewReplyTopics();
    new_topics.forEach( async (topic) => {
        let msgGroup = await MessageGroup.findOne({discourseId:topic.id});

        topic = await fetchDiscordApi(
            `t/${topic.id}.json`,
            'get'
        );

        let veracityKey = getVeracityKey(
            getPollResult(topic.post_stream.posts[0].polls[0]).html
        );

        let topicReply = await fetchDiscordApi(
            `posts/${topic.post_stream.stream[topic.accepted_answer.post_number-1]}.json`,
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
            `t/-/${topic.id}.json`,
            'put',
            {"category_id": process.env.DISCOURSE_API_CAT_SOLUTION_ID}
        );
    }
    );
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
    
    let json = await fetchDiscordApi(
        'posts.json',
        'post',
        {},
        {
            title: `${messageGroup._id}: ${messageGroup.tags.map(tag=>tag.name).join(' ')}`,
            tags: messageGroup.tags.slice(0,9).map(tag=>tag.name),
            category: process.env.DISCOURSE_API_CAT_NO_SOLUTION_ID,
            raw: body.join('\n')
        }
    )
    logger.info(`New topic added to discourse ${json.topic_id}`)
    messageGroup.discourseId = json.topic_id;
    await messageGroup.save();
    return json.topic_id;
}