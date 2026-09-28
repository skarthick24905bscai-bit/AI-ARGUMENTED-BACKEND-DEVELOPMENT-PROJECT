const express = require('express');
const router = express.Router();
const {
  getPostComments,
  getAllComments,
  addComment,
  moderateComment,
  deleteComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public or user comments for a post
router.get('/post/:postId', getPostComments);

// Add comment requires login
router.post('/', protect, addComment);

// Admin comment moderation queue
router.get('/', protect, authorize('admin'), getAllComments);

// Moderate comment status
router.put('/:id', protect, authorize('admin'), moderateComment);

// Delete comment
router.delete('/:id', protect, deleteComment);

module.exports = router;
