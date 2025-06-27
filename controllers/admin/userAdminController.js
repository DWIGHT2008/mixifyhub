const User = require('../../models/User');

const getAllUsers = async (req, res) => {
  const users = await User.find({});
  res.json(users);
};

const banUser = async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { banned: true });
  res.json({ message: 'User banned' });
};

const deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
};

const promoteUser = async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { role: 'moderator' });
  res.json({ message: 'User promoted' });
};

module.exports = { getAllUsers, banUser, deleteUser, promoteUser };