// middleware/roles.js

function requireRole(requiredRole) {
    return function (req, res, next) {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: No user found' });
      }
  
      if (req.user.role !== requiredRole) {
        return res.status(403).json({ error: `Forbidden: ${requiredRole} role required` });
      }
  
      next();
    };
  }
  
  module.exports = requireRole;