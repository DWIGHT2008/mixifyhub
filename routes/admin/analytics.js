const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const Post = require("../../models/Post");
const Comment = require("../../models/Comment");
const { verifyToken, requireRole } = require("../../middleware/auth.js");


router.get("/analytics", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const bannedUsers = await User.countDocuments({ banned: true });

    const totalPosts = await Post.countDocuments();
    const totalComments = await Comment.countDocuments();

    const reportedPosts = await Post.countDocuments({ reportCount: { $gt: 0 } });
    const reportedComments = await Comment.countDocuments({ reportCount: { $gt: 0 } });

    const reportedItems = reportedPosts + reportedComments;

    // Generate user registrations in the last 5 days
    const days = 5;
    const dailyUsers = await Promise.all(
      [...Array(days).keys()].map(async i => {
        const start = new Date();
        start.setDate(start.getDate() - (days - i));
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const count = await User.countDocuments({
          createdAt: { $gte: start, $lt: end }
        });

        return {
          date: start.toISOString().slice(0, 10),
          count
        };
      })
    );

    res.json({
      totalUsers,
      bannedUsers,
      totalPosts,
      totalComments,
      reportedItems,
      dailyUsers
    });
  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;