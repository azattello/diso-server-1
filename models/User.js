const mongoose = require('mongoose');  // Импортируем mongoose

const { Schema, model } = mongoose; // Деструктурируем Schema и model из mongoose

// Схема для закладок треков
const TrackBookmarkSchema = new Schema({
    createdAt: { type: Date, default: Date.now },
    description: { type: String, required: true },
    trackNumber: { type: String, required: true },
    trackId: { type: Schema.Types.ObjectId, ref: 'Track', required: false },
    currentStatus: { type: Schema.Types.ObjectId, ref: 'Status', default: null }
  });

// Схема для архива закладок
const ArchiveBookmarkSchema = new Schema({
    createdAt: { type: Date, default: Date.now },
    description: { type: String, required: true },
    trackNumber: { type: String, required: true },
    history: {
        type: [{
            status: { type: Schema.Types.ObjectId, ref: 'Status' },
            date: { type: Date, default: Date.now }
        }],
        default: []
    }
});



// Основная схема пользователя
const UserSchema = new Schema({
    phone: { type: Number, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: false },
    role: { type: String, default: "client" },
    createdAt: { type: Date, default: Date.now },
    bookmarks: [TrackBookmarkSchema],  // Закладки треков
    archive: [ArchiveBookmarkSchema],  // Архив закладок
    profilePhoto: { type: String, required: false },
    selectedFilial: { type: String, required: false },  // Филиал
    referrer: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Кто пригласил
    bonuses: { type: Number, required: false },  // Накопленные бонусы
    referralBonusPercentage: { type: Number, default: null },  // %
    personalId: {type: Number, default: null},
    personalRate: { type: String, required: false } // Новое поле для личного тарифа пользователя
});

module.exports = model('User', UserSchema);
