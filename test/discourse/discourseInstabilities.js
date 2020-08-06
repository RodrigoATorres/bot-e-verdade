const expect = require('chai').expect;
const discourseController = require('../../src/controllers/discourse')
const randomstring = require("randomstring");
const prepare = require('../prepare')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Discourse-instabilities-posts', function () {

    it('Deve retornar erro ao criar posts, caso discourse permaneça fora do ar por muito tempo',  async function () {

        let test_funtion = async () => {
            try{
                await discourseController.createTopic({
                    title: `Teste - discourse deve criar tópicos com títulos claros: "${randomstring.generate({length:5})}"`,
                    tags: ['testing'],
                    category: process.env.TESTING_DISCOURSE_API_CAT_TESTING_ID,
                    raw: 'Esse é apenas o primeiro de muitos testes que tem que ser rodados'
                })
                return 'No error'
            }
            catch{
                return 'Error thrown'
            }
        }

        prepare.simulateDiscourseDown();
        expect(await test_funtion()).to.equal('Error thrown');
    });

    it('Deve criar posts, caso discourse permaneça fora do ar mas volte em aluns segundos',  async function () {

        let test_funtion = async () => {
            let json = await discourseController.createTopic({
                title: `Teste - discourse deve criar tópicos com títulos claros: "${randomstring.generate({length:5})}"`,
                tags: ['testing'],
                category: process.env.TESTING_DISCOURSE_API_CAT_TESTING_ID,
                raw: 'Esse é apenas o primeiro de muitos testes que tem que ser rodados'
            })
            return json.id
        }

        prepare.simulateDiscourseDown();
        sleep(3000).then(() => prepare.simulateDiscourseRestore());
        expect(await test_funtion()).to.be.at.least(1);
    });
    
});
