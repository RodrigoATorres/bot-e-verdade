require('../../src/helpers/general')
const {genPrePublishMessage} = require('../../src/controllers/messages');

let reportData = {
    receivGroups:[], sentGroups:[], private:true
};

const reveicGroupsOpts = [
    [],
    ['Family','Ulala','Grupo estranho', 'Nome esquisito'],
    ['Family']
]

const sentGroupsOpts = [
    [],
    ['Family2','Ulala2','Grupo estranho2', 'Nome esquisito2'],
    ['Family2']
]

const privateOpts = [
    true,
    false
]

reveicGroupsOpts.forEach( opt1 => {
    reportData.receivGroups = opt1
    sentGroupsOpts.forEach( opt2 => {
        reportData.sentGroups = opt2
        privateOpts.forEach( opt3 => {
            reportData.private = opt3
            console.log('___________________________________________________________')
            console.log(reportData)
            console.log(genPrePublishMessage(reportData, 'Teste'))
            console.log('___________________________________________________________')
        })
    })
})