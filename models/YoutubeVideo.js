const mongoose = require('mongoose');

const YoutubeVideoSchema = new mongoose.Schema({
  videoId: String,
  title: String,
  thumbnail: String,
  views: Number,
  likes: Number,
  comments: Number,
  type: { type: String }, // 'shorts' or 'videos'
  channelId: String,
  publishedAt: Date,
});

module.exports = mongoose.model('YoutubeVideo', YoutubeVideoSchema);