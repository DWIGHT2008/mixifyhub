const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  appName: String,
  adminEmail: String,
  theme: { type: String, default: 'light' },
  maintenance: { type: Boolean, default: false },
  footerText: String
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);