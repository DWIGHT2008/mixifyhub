const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  channelId: String,
  title: String,
  description: String,
  thumbnail: String,
  subscribers: String
});

module.exports = mongoose.model('Channel', channelSchema);
