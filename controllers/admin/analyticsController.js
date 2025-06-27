// /controllers/admin/analyticsController.js
const User = require('../../models/User');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const mongoose = require('mongoose');

const getAnalytics = async (req, res) => {
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now - 1 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisWeek,
    activeUsersToday,
    bannedUsers,
    totalPosts,
    totalComments,
    postEngagement,
    userChart
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
    User.countDocuments({ lastActiveAt: { $gte: yesterday } }),
    User.countDocuments({ banned: true }),
    Post.countDocuments(),
    Comment.countDocuments(),
    Post.aggregate([
      {
        $group: {
          _id: null,
          totalLikes: { $sum: "$likesCount" },
          totalReports: { $sum: "$reportCount" }
        }
      }
    ]),
    User.aggregate([
      {
        $match: {
          createdAt: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])
  ]);

  res.json({
    users: {
      total: totalUsers,
      newThisWeek: newUsersThisWeek,
      activeToday: activeUsersToday,
      banned: bannedUsers,
      dailyNewUsers: userChart,
    },
    content: {
      totalPosts,
      totalComments,
      totalLikes: postEngagement[0]?.totalLikes || 0,
      totalReports: postEngagement[0]?.totalReports || 0,
    }
  });
};

module.exports = { getAnalytics };