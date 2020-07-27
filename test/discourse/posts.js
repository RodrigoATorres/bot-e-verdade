const expect = require('chai').expect;
const discourseController = require('../../src/controllers/discourse')
const randomstring = require("randomstring");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Discourse-posts', function () {

    it('Deve criar tópicos', function (done) {
        
        discourseController.createTopic({
            title: `Teste - discourse deve criar tópicos com títulos claros: "${randomstring.generate({length:5})}"`,
            tags: ['testing'],
            category: process.env.TESTING_DISCOURSE_API_CAT_TESTING_ID,
            raw: 'Esse é apenas o primeiro de muitos testes que tem que ser rodados'
        })
        .then( json =>{
            try{
                expect(json.topic_id).to.be.at.least(1);
                done();
            } catch (err){
                done(err)
            }   
        }
        )

    });

    it('Deve responder tópicos', function (done) {
        let topic_id = null;
        discourseController.createTopic({
            title: `Teste - discourse deve criar e responder tópicos com títulos claros: "${randomstring.generate({length:5})}"`,
            tags: ['testing'],
            category: process.env.TESTING_DISCOURSE_API_CAT_TESTING_ID,
            raw: 'Esse é apenas o primeiro de muitos testes que tem que ser rodados'
        })
        .then( json =>{
            topic_id = json.topic_id;
            return discourseController.answerTopic(
                'Teste de uma resposta para determinado tópico',
                json.topic_id
            )
        })
        .then(json => {
            try{
                expect(json.id).to.be.at.least(1);
                expect(json.topic_id).to.equal(topic_id);
                done();
            } catch (err){
                done(err)
            }
        });

    });

    it('Deve aceitar respostas de tópicos', function (done) {
        let topic_id = null;
        discourseController.createTopic({
            title: `Teste - discourse deve criar e responder tópicos com títulos claros: "${randomstring.generate({length:5})}"`,
            tags: ['testing'],
            category: process.env.TESTING_DISCOURSE_API_CAT_TESTING_ID,
            raw: 'Esse é apenas o primeiro de muitos testes que tem que ser rodados'
        })
        .then( json =>{
            topic_id = json.topic_id;
            return discourseController.answerTopic(
                'Teste de uma resposta para ser aceita em determinado tópico',
                json.topic_id
            )
        })
        .then(json => {
            return discourseController.acceptAnswer(json.id)
        })
        .then( () =>{
            return discourseController.getTopic(topic_id)
        })
        .then(json => {
            try{
                expect(json.accepted_answer.post_number).to.equal(2);
                done();
            } catch (err){
                done(err)
            }
        });

    });

    it('Deve encontrar tópicos já resolvidos, na categoria não resolvidos', function (done) {
        let topic_id = null;
        discourseController.createTopic({
            title: `Teste - discourse deve criar e responder tópicos com títulos claros: "${randomstring.generate({length:5})}"`,
            tags: ['testing'],
            category: process.env.TESTING_DISCOURSE_API_CAT_TESTING_ID,
            raw: 'Esse é apenas o primeiro de muitos testes que tem que ser rodados'
        })
        .then( json =>{
            topic_id = json.topic_id;
            return discourseController.answerTopic(
                'Teste de uma resposta para ser aceita em determinado tópico',
                json.topic_id
            )
        })
        .then(json => {
            return discourseController.acceptAnswer(json.id)
        })
        .then( () =>{
            return discourseController.getNewReplyTopics(process.env.TESTING_DISCOURSE_API_CAT_TESTING)
        })
        .then( topics_list => {
            let topicIdsList = topics_list.map( elm => elm.id);
            try{
                expect(topicIdsList).to.include(topic_id);
                done();
            } catch (err){
                done(err)
            }
        });

    });
    
});
