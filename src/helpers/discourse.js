const mime = require('mime-types');
const fetch = require('node-fetch');

const userApiKey = process.env.DISCOURSE_API_KEY;
const apiUsername = process.env.DISCOURSE_API_USERNAME;
const baseUrl = process.env.DISCOURSE_API_URL;

const headers = {}
headers["Content-Type"] = "application/json";
headers["Api-Key"]= userApiKey;
headers["Api-Username"] = apiUsername

fetchDiscordApi = (path, method, body ) =>{

    return fetch(`${baseUrl}/${path}`,{
        method,
        body: JSON.stringify(body),
        headers
    })
}

addMessage = (message, mediaData) => {
    try{
        console.log(message.body)

    if (message.mimetype){
        body = `![](http://s1.tuts.host/wamedia/${mediaData['media_md5']}.${mime.extension(message.mimetype)})\n`
    }
    else{
        body = `>${message.body.replace(/(\r\n?|\n|\t)/g,'\n>')}\n`
    }

    body = body.concat(
        [
            "[poll results=on_vote public=true chartType=bar]",
            "* Verdade",
            "* Mentira",
            "* Marromenos",
            "* Será?",
            "[/poll]"
        ].join('\n')
    );
    console.log(body)
    now = new Date().toISOString()
    fetchDiscordApi(
        'posts.json',
        'post',
        {
            title: `${now}: encaminhamentos ${message.forwardingScore}`,
            raw: body
        }
    )
    .then(result =>{
        console.log(result)
    })
    }
    catch (error){
        console.log(error)
    }

}


module.exports = {
    addMessage
};