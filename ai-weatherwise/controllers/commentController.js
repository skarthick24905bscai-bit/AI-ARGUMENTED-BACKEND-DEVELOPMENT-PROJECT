const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { isMongoConnected } = require('../config/db');
const { store, generateId } = require('../config/fallbackStore');

// @desc    Get comments for a specific post
// @route   GET /api/comments/post/:postId
// @access  Public
const getPostComments = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const isAdmin = req.user && req.user.role === 'admin';

    if (isMongoConnected()) {
      const filter = { post: postId };
      if (!isAdmin) {
        filter.status = 'Approved';
      }

      const comments = await Comment.find(filter)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: comments.length,
        data: comments,
      });
    } else {
      let comments = store.comments.filter((c) => String(c.post) === String(postId));
      if (!isAdmin) {
        comments = comments.filter((c) => c.status === 'Approved');
      }

      const populated = comments.map((c) => {
        const u = store.users.find((user) => String(user._id) === String(c.user));
        return {
          ...c,
          user: u ? { _id: u._id, name: u.name, role: u.role } : null,
        };
      });

      return res.status(200).json({
        success: true,
        count: populated.length,
        data: populated,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all comments (Admin moderation queue)
// @route   GET /api/comments
// @access  Private/Admin
const getAllComments = async (req, res, next) => {
  try {
    const { status } = req.query;

    if (isMongoConnected()) {
      const filter = status ? { status } : {};
      const comments = await Comment.find(filter)
        .populate('user', 'name email')
        .populate('post', 'title slug')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: comments.length,
        data: comments,
      });
    } else {
      let list = [...store.comments];
      if (status) {
        list = list.filter((c) => c.status === status);
      }

      const populated = list.map((c) => {
        const u = store.users.find((user) => String(user._id) === String(c.user));
        const p = store.posts.find((post) => String(post._id) === String(c.post));
        return {
          ...c,
          user: u ? { _id: u._id, name: u.name, email: u.email } : null,
          post: p ? { _id: p._id, title: p.title, slug: p.slug } : null,
        };
      });

      return res.status(200).json({
        success: true,
        count: populated.length,
        data: populated,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Add a comment
// @route   POST /api/comments
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const { postId, content } = req.body;

    if (!postId || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Post ID and comment content are required' });
    }

    const cleanContent = content.trim();

    if (isMongoConnected()) {
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      const comment = await Comment.create({
        post: postId,
        user: req.user._id,
        userName: req.user.name,
        content: cleanContent,
        status: 'Approved',
      });

      return res.status(201).json({
        success: true,
        message: 'Comment posted successfully',
        data: comment,
      });
    } else {
      const post = store.posts.find((p) => String(p._id) === String(postId));
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      const newComment = {
        _id: generateId(),
        post: postId,
        user: req.user._id,
        userName: req.user.name,
        content: cleanContent,
        status: 'Approved',
        createdAt: new Date(),
      };

      store.comments.unshift(newComment);

      return res.status(201).json({
        success: true,
        message: 'Comment posted successfully',
        data: newComment,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Moderate comment (Approve, Spam, Pending)
// @route   PUT /api/comments/:id
// @access  Private/Admin
const moderateComment = async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const { status } = req.body;

    if (!status || !['Approved', 'Pending', 'Spam'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'Approved', 'Pending', or 'Spam'",
      });
    }

    if (isMongoConnected()) {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
      }

      comment.status = status;
      await comment.save();

      return res.status(200).json({
        success: true,
        message: `Comment marked as ${status}`,
        data: comment,
      });
    } else {
      const comment = store.comments.find((c) => String(c._id) === String(commentId));
      if (!comment) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
      }

      comment.status = status;

      return res.status(200).json({
        success: true,
        message: `Comment marked as ${status}`,
        data: comment,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = async (req, res, next) => {
  try {
    const commentId = req.params.id;

    if (isMongoConnected()) {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
      }

      if (String(comment.user) !== String(req.user._id) && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
      }

      await Comment.findByIdAndDelete(commentId);
      return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } else {
      const commentIndex = store.comments.findIndex((c) => String(c._id) === String(commentId));
      if (commentIndex === -1) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
      }

      const comment = store.comments[commentIndex];
      if (String(comment.user) !== String(req.user._id) && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
      }

      store.comments.splice(commentIndex, 1);
      return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPostComments,
  getAllComments,
  addComment,
  moderateComment,
  deleteComment,
};
