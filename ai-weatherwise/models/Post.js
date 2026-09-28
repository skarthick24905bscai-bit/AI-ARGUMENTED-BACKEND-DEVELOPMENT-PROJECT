const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Please provide content'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['Draft', 'Pending Approval', 'Scheduled', 'Published'],
      default: 'Draft',
    },
    views: {
      type: Number,
      default: 0,
    },
    scheduledAt: {
      type: Date,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ tags: 1 });

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
