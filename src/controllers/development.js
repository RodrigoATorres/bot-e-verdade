const mongoose = require('mongoose');
const fs = require('fs');

module.exports.saveDb = async (req, res, next) => {
    const collections = await mongoose.connection.db.listCollections().toArray();

    for (let collection of collections){
        let modelName = collection.name;

        try{
            fs.renameSync(`./tests/__test_data/${modelName}.json`,`./tests/__test_data/backup/${modelName}.json`);
        }
        catch{
            console.log(`Could not move ./tests/__test_data/${modelName}.json to ./tests/__test_data/backup/${modelName}.json`)
        }
        var spawn = require('child_process').spawn
        let bat = spawn('./tools/mongodb_tools/mongoexport',['-d','test','-h','127.0.0.1:27017','-o',`./tests/__test_data/${modelName}.json`,'--jsonArray','-c',modelName]);
        
        bat.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        bat.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        bat.on('exit', (code) => {
            if(code ==0){
                console.log(`${modelName} saved`);

                fs.readFile(`./tests/__test_data/${modelName}.json`, 'utf8', (err, jsonString) => {
                    if (err) {
                        console.log("File read failed:", err)
                        return
                    }
                    let data = JSON.parse(jsonString)
                    fs.writeFileSync(`./tests/__test_data/${modelName}.json`, JSON.stringify(data, null, 4));
                }
                )
            };
        }
        )
    }
    res.status(200).json({ msg: "Current database saved sucessfuly!" });
    next();
};