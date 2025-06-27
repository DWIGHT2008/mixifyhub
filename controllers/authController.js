const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust to your user model
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const googleAuth = async (req, res) => {
  const { credential } = req.body;

  try {
    // 1. Verify the token with Google
    const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const { email, name, picture, sub: googleId } = googleResponse.data;

    if (!email || !googleId) {
      return res.status(400).json({ message: 'Invalid Google token' });
    }

    // 2. Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // 3. If not, register them
      user = new User({
        name,
        email,
        googleId,
        avatar: picture,
        provider: 'google'
      });
      await user.save();
    }

    // 4. Generate JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error.message);
    res.status(500).json({ message: 'Google login failed' });
  }
};
module.exports = {
  googleAuth
};