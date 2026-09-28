const User = require('../models/User');
const { isMongoConnected } = require('../config/db');
const { store } = require('../config/fallbackStore');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    if (isMongoConnected()) {
      const users = await User.find({}).select('-password').sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } else {
      const safeUsers = store.users.map(({ password, ...u }) => u);
      return res.status(200).json({
        success: true,
        count: safeUsers.length,
        data: safeUsers,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (isMongoConnected()) {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.status(200).json({ success: true, data: user });
    } else {
      const user = store.users.find((u) => String(u._id) === String(userId));
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const { password, ...safeUser } = user;
      return res.status(200).json({ success: true, data: safeUser });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role or status (Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { role, status, name } = req.body;

    if (isMongoConnected()) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (role && ['reader', 'admin'].includes(role)) user.role = role;
      if (status && ['active', 'suspended'].includes(status)) user.status = status;
      if (name) user.name = name.trim();

      await user.save();
      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      });
    } else {
      const userIndex = store.users.findIndex((u) => String(u._id) === String(userId));
      if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (role && ['reader', 'admin'].includes(role)) store.users[userIndex].role = role;
      if (status && ['active', 'suspended'].includes(status)) store.users[userIndex].status = status;
      if (name) store.users[userIndex].name = name.trim();
      store.users[userIndex].updatedAt = new Date();

      const { password, ...safeUser } = store.users[userIndex];
      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: safeUser,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Prevent deleting oneself
    if (String(req.user._id) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot delete their own active account',
      });
    }

    if (isMongoConnected()) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      await User.findByIdAndDelete(userId);
      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } else {
      const userIndex = store.users.findIndex((u) => String(u._id) === String(userId));
      if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      store.users.splice(userIndex, 1);
      // Clean up user's locations
      store.locations = store.locations.filter((l) => String(l.user) !== String(userId));
      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
