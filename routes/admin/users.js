const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const { isAdmin, requireRole } = require("../../middleware/auth"); // correct path and destructuring
const verifyToken = require('../../middleware/verifyToken');

// GET /admin/users — List all users
router.get("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find({}, "-password -refreshToken"); // Exclude sensitive fields
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// PATCH /admin/users/:id/ban — Ban/unban a user
router.patch("/:id/ban", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.banned = !user.banned;
    await user.save();

    res.json({ message: `User ${user.banned ? "banned" : "unbanned"} successfully.` });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// PATCH /admin/users/:id/role — Promote/demote a user
router.patch("/:id/role", verifyToken, requireRole("admin"), async (req, res) => {
  const { role } = req.body; // expects: "admin" or "user"
  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: `User role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE /admin/users/:id — Delete user
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;