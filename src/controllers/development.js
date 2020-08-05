const mongoose = require('mongoose');
const fs = require('fs');

module.exports.saveDb = async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();

    for (let collection of collections){
        let modelName = collection.name;

        try{
            fs.renameSync(`./test/__test_data/${modelName}.json`,`./test/__test_data/backup/${modelName}.json`);
        }
        catch{
            console.log(`Could not move ./test/__test_data/${modelName}.json to ./test/__test_data/backup/${modelName}.json`)
        }
        var spawn = require('child_process').spawn
        let bat = spawn('./tools/mongodb_tools/mongoexport',['-d','test','-h','127.0.0.1:27017','-o',`./test/__test_data/${modelName}.json`,'--jsonArray','-c',modelName]);
        
        bat.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        bat.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        bat.on('exit', (code) => {
            if(code ==0){
                console.log(`${modelName} saved`);

                fs.readFile(`./test/__test_data/${modelName}.json`, 'utf8', (err, jsonString) => {
                    if (err) {
                        console.log("File read failed:", err)
                        return
                    }
                    let data = JSON.parse(jsonString)
                    fs.writeFileSync(`./test/__test_data/${modelName}.json`, JSON.stringify(data, null, 4));
                }
                )
            }
        }
        )
    }

};