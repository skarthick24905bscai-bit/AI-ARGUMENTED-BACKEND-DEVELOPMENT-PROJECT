const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post reference is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content cannot be empty'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Spam'],
      default: 'Approved',
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ post: 1, status: 1 });

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
