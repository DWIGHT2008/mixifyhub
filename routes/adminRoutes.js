const express = require('express');
const { isAdmin } = require('../middleware/auth.js');
const {
  getAllUsers, banUser, deleteUser, promoteUser
} = require('../controllers/admin/userAdminController');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/roles.js');

const router = express.Router();

router.use(isAdmin);

router.get('/users', getAllUsers);
router.patch('/users/:id/ban', banUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/promote', promoteUser);

module.exports = router;