const mongoose = require('mongoose');

const ContactsSchema = new mongoose.Schema({
    phone: { type: String, required: false },
    whatsappPhone: { type: String, required: false },
    whatsappLink: { type: String, required: false },
    instagram: { type: String, required: false },
    telegramId: { type: String, required: false },
    telegramLink: { type: String, required: false },  
});

const Contacts = mongoose.model('Contacts', ContactsSchema);

module.exports = Contacts;
