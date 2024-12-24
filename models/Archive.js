const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArchiveSchema = new Schema({
    trackNumber: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    price: { type: String, required: false},
    weight: { type: String, required: false},
    history: {
        type: [{
            status: { type: Schema.Types.ObjectId, ref: 'Status' },
            date: { type: Date, default: Date.now }
        }],
        default: []
    }
});

const Archive = mongoose.model('Archive', ArchiveSchema);

module.exports = Archive;
