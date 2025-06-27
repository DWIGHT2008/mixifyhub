const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const requireRole = require('../middleware/roles.js'); // role-check middleware
const verifyToken = require('../middleware/verifyToken.js'); // token auth middleware
const { googleAuth } = require('../controllers/authController');
const session = require('express-session');
const passport = require('passport');
router.post('/google', googleAuth);

// REGISTER

//basic registration
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const passwordclue = password.slice(0, 8); // optional clue

  if (!username || username.length < 3)
    return res.status(400).json({ message: 'Username must be at least 3 characters' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email))
    return res.status(400).json({ message: 'Invalid email address' });

  if (!password || password.length < 8)
    return res.status(400).json({ message: 'Password must be at least 8 characters' });

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser)
      return res.status(400).json({ message: 'Username or email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine if user is admin based on env vars
    const isAdmin =
      email === process.env.DEFAULT_ADMIN_EMAIL &&
      username === process.env.DEFAULT_ADMIN_USERNAME &&
      password === process.env.DEFAULT_ADMIN_PASSWORD;

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      passwordclue,
      role: isAdmin ? 'admin' : 'user'
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        passwordclue: newUser.passwordclue,
        role: newUser.role, // fixed here
        avatar: newUser.avatar || { name: 'default', color: '#764ba2' }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

const token = jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '2d' }
);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || { name: 'default', color: '#764ba2' }
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// GET LOGGED-IN USER INFO
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      avatar: user.avatar || { name: 'default', color: '#764ba2' }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE USER INFO
router.put('/update', verifyToken, async (req, res) => {
  const { username, email } = req.body;

  try {
    const emailUsed = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (emailUsed) return res.status(400).json({ message: 'Email is already in use' });

    const nameUsed = await User.findOne({ username, _id: { $ne: req.user.id } });
    if (nameUsed) return res.status(400).json({ message: 'Username is already in use' });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { username, email },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'User updated', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

// CHANGE PASSWORD
router.put('/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ message: 'New password must be at least 8 characters' });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Password change failed', error: err.message });
  }
});

// UPDATE AVATAR
router.put('/update-avatar', verifyToken, async (req, res) => {
  const { avatar, color } = req.body;

  if (!avatar || !color)
    return res.status(400).json({ message: 'Avatar name and color are required' });

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: { name: avatar, color } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Avatar updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Avatar update failed', error: err.message });
  }
});

// Email Recovery
router.post('/recover-email', async (req, res) => {
  const { username, password, emailHint } = req.body;

  try {
    // Step 1: Find by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'Username not found' });
    }

    // Step 2: Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Step 3: Check if email contains the hint
    const emailClueMatch = user.email.toLowerCase().includes(emailHint.toLowerCase());
    if (!emailClueMatch) {
      return res.status(401).json({ message: 'Email clue does not match' });
    }

    // Success: generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'Email recovery successful',
      token,
      user: {
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Recovery error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// LOGIN WITH CLUE
router.post('/login-with-clue', async (req, res) => {
  const { username, email, passwordClue } = req.body;

  try {
    const user = await User.findOne({
      username,
      email,
      passwordclue: { $regex: passwordClue, $options: 'i' }
    });

    if (user) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({
        message: 'Clue login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      });
    } else {
      res.status(400).json({ message: 'No matching user found with provided clue' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE SOCIAL LINKS
router.post('/social-links', async (req, res) => {
  const { userId, socialLinks } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { socialLinks },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Social links updated', socialLinks: user.socialLinks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});



module.exports = router;