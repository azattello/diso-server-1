const mongoose = require('mongoose');

const Status = new mongoose.Schema({
  statusNumber: {type: Number, require: true},
  statusText: {type: String, require: true},
  createdAt: { type: Date, default: Date.now }
  
})

module.exports = mongoose.model('Status', Status);
