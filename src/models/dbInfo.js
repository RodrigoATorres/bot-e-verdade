const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const dbInfo = new Schema({

    releaseVersion:{
        type: String,
    },

},
{
timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
}
)

module.exports = mongoose.model('DbInfo', dbInfo);