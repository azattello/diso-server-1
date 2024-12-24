const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trackSchema = new Schema({
    track: { type: String, required: true },
    status: { type: Schema.Types.ObjectId, ref: 'Status', required: true },
    filial: { type: mongoose.Schema.Types.ObjectId, ref: 'Filial' },
    user: { type: String, required: false, unique: false },
    history: {
        type: [{
            status: {
                type: Schema.Types.ObjectId,
                ref: 'Status'
            },
            date: {
                type: Date,
                default: Date.now
            }
        }],
        default: []
    }
});

// Добавляем индекс для поля trackId
trackSchema.index({ trackId: 1 });

const Track = mongoose.model('Track', trackSchema);

module.exports = Track;
