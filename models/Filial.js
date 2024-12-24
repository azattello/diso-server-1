const mongoose = require('mongoose');

const FilialSchema = new mongoose.Schema({
  filialText: { type: String, required: true },
  userPhone: { type: Number, required: true },
  filialId: { type: String, required: true },
  filialAddress : { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Ссылка на пользователя
  createdAt: { type: Date, default: Date.now }
});

const Filial = mongoose.model('Filial', FilialSchema);

module.exports = Filial;
