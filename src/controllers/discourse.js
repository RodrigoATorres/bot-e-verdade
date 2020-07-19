const mime = require('mime-types');
const fetch = require('node-fetch');

const userApiKey = process.env.DISCOURSE_API_KEY;
const apiUsername = process.env.DISCOURSE_API_USERNAME;
const baseUrl = process.env.DISCOURSE_API_URL;

const Message = require('../models/message');
const MessageGroup = require('../models/messageGroup');

const messagesController = require('./messages');

const headers = {}
headers["Content-Type"] = "application/json";
headers["Api-Key"]= userApiKey;
headers["Api-Username"] = apiUsername;
headers["Accept"] = "application/json";

fetchDiscordApi = async (path, method, params={}, body = {}) =>{
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
};

search = (params) =>{
    return fetchDiscordApi(`search`, 'get', params);
}

getNewReplyTopics = async () => {
    res = await search({
            q:`#${process.env.DISCOURSE_API_CAT_NO_SOLUTION} status:solved`,
        });
    return res.topics ? res.topics: [];
};

getPollResult = (poll) =>{
    return poll.options.reduce(
        (prev, cur) =>{
            return ( prev.votes <= cur.votes ? cur : prev );
        },
        {votes:-1}
    );
}

exports.processNewReplyTopics = async (client) =>{
    let new_topics = await getNewReplyTopics();
    new_topics.forEach( async (topic) => {
        let msgGroup = await MessageGroup.findOne({discourseId:topic.id});

        topic = await fetchDiscordApi(
            `t/${topic.id}.json`,
            'get'
        );

        let veracity = getPollResult(topic.post_stream.posts[0].polls[0]).html;

        let reply = await fetchDiscordApi(
            `posts/${topic.post_stream.stream[topic.accepted_answer.post_number-1]}.json`,
            'get'
        );
        if (msgGroup){
            msgGroup.replyMessage = reply.raw;
            msgGroup.veracity = veracity;
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
            body.push(`<div align="center"><img src=${process.env.MEDIA_FOLDER_URL}/${message.mediaMd5s[0]}.${message.mediaExtensions[0]}'></div>`)
        }
    });

    body.push(
        [
            "Baseado na sua pesquisa, essa publicação parece:\n",
            "[poll name=veracity results=on_vote public=true chartType=bar]",
            "* Verdade",
            "* Mentira",
            "* Marromenos",
            "* Será?",
            "* Duplicada",
            "[/poll]"
        ].join('\n')
    );
    
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
    
    let now = new Date().toISOString()
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
    messageGroup.discourseId = json.topic_id;
    await messageGroup.save();
}