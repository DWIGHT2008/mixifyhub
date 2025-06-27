const mongoose = require('mongoose');
const { requireRole } = require('../middleware/roles.js');

const userSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  passwordClue: { type: String },
    authType: { type: String, default: 'local' }, // 'local' or 'google'
    googleId: String,
    profileImage: String,
  

  avatar: {
    name:  { type: String, default: 'avatar1' },
    color: { type: String, default: '#764ba2' }
  },

  socialLinks: {
    facebook:  { type: String, default: '' },
    twitter:   { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin:  { type: String, default: '' },
    youtube:   { type: String, default: '' }
  },
  
  // New admin/analytics fields
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  banned: { type: Boolean, default: false },
  lastActiveAt: { type: Date }, // ← Track last login or action

  connectedAccounts: [{
    platform: String,
    accessToken: String,
    refreshToken: String,
    accountId: String,
    username: String
  }]
}, { timestamps: true }); // includes createdAt and updatedAt

module.exports = mongoose.model('User', userSchema);