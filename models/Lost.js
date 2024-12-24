const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lostSchema = new Schema({
    track: { type: String, required: true },
    date: {type: Date,default: Date.now}
});

// Добавляем индекс для поля trackId
lostSchema.index({ trackId: 1 });

const Lost = mongoose.model('Lost', lostSchema);

module.exports = Lost;
