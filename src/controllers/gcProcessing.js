const mime = require('mime-types');
const language = require('@google-cloud/language');
const vision = require('@google-cloud/vision');
const speech = require('@google-cloud/speech');
const speechclient = new speech.SpeechClient();
const visionClient = new vision.ImageAnnotatorClient();
const languageClient = new language.LanguageServiceClient();
const { exec } = require("child_process");
const fs = require('fs');

const logger = require('../helpers/logger')

const REMOVE_TYPES = ['NUMBER'];
const TYPES_HIERARCHY = ['WORK_OF_ART','EVENT','LOCATION','ORGANIZATION','PERSON']
const MIN_SALIENCE = 0.01;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function filterTags(tags){
  Object.keys(tags).forEach(key => {
    if ( REMOVE_TYPES.includes(tags[key].tagType) || (tags[key].salience < MIN_SALIENCE )){
      delete tags[key];
    }
  });
}

function tagsObj2Array(tags){
  let out = []
  Object.keys(tags).forEach(key => {
    out.push({
      name:key,
      ...tags[key]
    })
  })
  return out;
}

exports.mergeTagLists = (tagLists) => {
  let allTags = Array.prototype.concat(...tagLists);
  let tags = allTags.reduce(
    (prev, elm) => {
      if (prev[elm.name]){
        prev[elm.name].salience += elm.salience/tagLists.length
      }
      else{
        prev[elm.name] = {tagType:elm.tagType, salience: elm.salience/tagLists.length}
      }
      return prev;
  },
  {}
  )
  return tagsObj2Array(tags).sort( 
    (a,b) => {
      a_type_idx = TYPES_HIERARCHY.indexOf(a.tagType);
      b_type_idx = TYPES_HIERARCHY.indexOf(b.tagType);
      return (a_type_idx === b_type_idx) ? (b.salience - a.salience) : (b_type_idx - a_type_idx);
    }
  );
}

exports.getTextTags = async (text) => {

    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };
  
    // Detects the sentiment of the text
    const [result] = await languageClient.analyzeEntities({document: document});
    let tags = result.entities.reduce(
      (prev, elm) => {
        if (prev[elm.name]){
          prev[elm.name].salience += elm.salience
        }
        else{
          prev[elm.name] = {tagType:elm.type, salience: elm.salience}
        }
        return prev;
      },
      {}
    );
    
    filterTags(tags);
    return tagsObj2Array(tags);
  }


exports.getImageText = async (filename) => {
    // Performs label detection on the image file
    const [result] = await visionClient.documentTextDetection(filename);
    return result.fullTextAnnotation.text;
  }

exports.getAudioText = async (fileName) =>{

  const file = fs.readFileSync(fileName);
  const audioBytes = file.toString('base64');

  const audio = {
    content: audioBytes,
  };
  const config = {
    encoding: 'OGG_OPUS',
    sampleRateHertz: 16000,
    languageCode: 'pt-BR',
  };
  const request = {
    audio: audio,
    config: config,
  };
  const [response] = await speechclient.recognize(request);

  return response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');

}

exports.extractVideoAudio = async (filein, fileout) => {
  await exec(`ffmpeg -i ${filein} -ss 00:00:00 -to 00:00:20 -c:a libopus -b:a 32K -ar 16k -ac 1 ${fileout} -y`, { shell: true })
}

exports.trimAudio = async (filein, fileout) =>{
  await exec(`ffmpeg -i ${filein} -ss 00:00:00 -to 00:00:20 -c copy ${fileout} -y`);
}

exports.getMediaInfo = async (md5, mimetype) =>{
  if (mimetype === 'image/jpeg'){
    text = await this.getImageText( `./Media/${md5}.${mime.extension(mimetype)}` );
    tags = await this.getTextTags(text);
  }
  else  if (mimetype === 'video/mp4'){
    await this.extractVideoAudio(
      `./Media/${md5}.${mime.extension(mimetype)}`,
      `./Media/${md5}.oga`
    );
    await sleep(1000);
    text = await this.getAudioText(`./Media/${md5}.oga`);
    tags = await this.getTextTags(text);
  }
  else if (mimetype === "audio/ogg; codecs=opus"){
    await this.trimAudio(
      `./Media/${md5}.${mime.extension(mimetype)}`,
      `./Media/${md5}_trim.${mime.extension(mimetype)}`
    );
    await sleep(1000);
    text = await this.getAudioText(`./Media/${md5}_trim.${mime.extension(mimetype)}`);
    tags = await this.getTextTags(text);
  }
  else{
    logger.error(`Could not extrat text and tags from "${md5}.${mime.extension(mimetype)}"`)
    return [null, null];
  }

  logger.info(`Text and tags extracted from "${md5}.${mime.extension(mimetype)}"`)
  return [text, tags];
}