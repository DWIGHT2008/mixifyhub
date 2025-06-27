const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid user' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check if user has specific role
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user?.role === role) return next();
    return res.status(403).json({ message: 'Access denied.' });
  };
};

// Optional middleware to check admin shortcut
const isAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret');
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = {
  verifyToken,
  requireRole,
  isAdmin
};