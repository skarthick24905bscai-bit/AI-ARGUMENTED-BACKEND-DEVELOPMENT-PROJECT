const Post = require('../models/Post');
const Category = require('../models/Category');
const { isMongoConnected } = require('../config/db');
const { store, generateId } = require('../config/fallbackStore');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

// @desc    Get all posts (filtered by role & query)
// @route   GET /api/posts
// @access  Public
const getPosts = async (req, res, next) => {
  try {
    const { category, tag, search, status } = req.query;
    const isAdmin = req.user && req.user.role === 'admin';

    if (isMongoConnected()) {
      const query = {};

      // Non-admins can strictly only read Published posts
      if (!isAdmin) {
        query.status = 'Published';
      } else if (status) {
        query.status = status;
      }

      if (category) {
        query.category = category;
      }

      if (tag) {
        query.tags = { $in: [tag] };
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { summary: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ];
      }

      const posts = await Post.find(query)
        .populate('author', 'name email')
        .populate('category', 'name slug')
        .sort({ publishedAt: -1, createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: posts.length,
        data: posts,
      });
    } else {
      let filtered = [...store.posts];

      if (!isAdmin) {
        filtered = filtered.filter((p) => p.status === 'Published');
      } else if (status) {
        filtered = filtered.filter((p) => p.status === status);
      }

      if (category) {
        filtered = filtered.filter((p) => String(p.category) === String(category));
      }

      if (tag) {
        filtered = filtered.filter((p) => (p.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase()));
      }

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.title.toLowerCase().includes(s) ||
            (p.summary && p.summary.toLowerCase().includes(s)) ||
            p.content.toLowerCase().includes(s)
        );
      }

      // Populate author and category objects
      const populated = filtered.map((post) => {
        const authorObj = store.users.find((u) => String(u._id) === String(post.author));
        const catObj = store.categories.find((c) => String(c._id) === String(post.category));
        return {
          ...post,
          author: authorObj ? { _id: authorObj._id, name: authorObj.name, email: authorObj.email } : null,
          category: catObj ? { _id: catObj._id, name: catObj.name, slug: catObj.slug } : null,
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

// @desc    Get single post by ID or Slug
// @route   GET /api/posts/:id
// @access  Public
const getPostById = async (req, res, next) => {
  try {
    const identifier = req.params.id;
    const isAdmin = req.user && req.user.role === 'admin';

    if (isMongoConnected()) {
      let post;
      if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
        post = await Post.findById(identifier)
          .populate('author', 'name email')
          .populate('category', 'name slug');
      } else {
        post = await Post.findOne({ slug: identifier })
          .populate('author', 'name email')
          .populate('category', 'name slug');
      }

      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      if (post.status !== 'Published' && !isAdmin) {
        return res.status(403).json({ success: false, message: 'This post is not published yet.' });
      }

      // Increment view counter
      post.views = (post.views || 0) + 1;
      await post.save();

      return res.status(200).json({ success: true, data: post });
    } else {
      const post = store.posts.find((p) => String(p._id) === String(identifier) || p.slug === identifier);

      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      if (post.status !== 'Published' && !isAdmin) {
        return res.status(403).json({ success: false, message: 'This post is not published yet.' });
      }

      post.views = (post.views || 0) + 1;

      const authorObj = store.users.find((u) => String(u._id) === String(post.author));
      const catObj = store.categories.find((c) => String(c._id) === String(post.category));

      return res.status(200).json({
        success: true,
        data: {
          ...post,
          author: authorObj ? { _id: authorObj._id, name: authorObj.name, email: authorObj.email } : null,
          category: catObj ? { _id: catObj._id, name: catObj.name, slug: catObj.slug } : null,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create new post
// @route   POST /api/posts
// @access  Private/Admin
const createPost = async (req, res, next) => {
  try {
    const { title, content, summary, category, tags, status, scheduledAt } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const postStatus = status || 'Draft';
    const slug = slugify(title) + '-' + Math.random().toString(36).substring(2, 6);
    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const publishedAt = postStatus === 'Published' ? new Date() : null;

    if (isMongoConnected()) {
      const post = await Post.create({
        title: title.trim(),
        slug,
        summary: summary ? summary.trim() : title.trim().slice(0, 140) + '...',
        content,
        category: category || null,
        tags: parsedTags,
        author: req.user._id,
        status: postStatus,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt,
      });

      return res.status(201).json({ success: true, message: 'Post created successfully', data: post });
    } else {
      const newPost = {
        _id: generateId(),
        title: title.trim(),
        slug,
        summary: summary ? summary.trim() : title.trim().slice(0, 140) + '...',
        content,
        category: category || null,
        tags: parsedTags,
        author: req.user._id,
        status: postStatus,
        views: 0,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.posts.unshift(newPost);

      return res.status(201).json({ success: true, message: 'Post created successfully', data: newPost });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private/Admin
const updatePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const { title, content, summary, category, tags, status, scheduledAt } = req.body;

    if (isMongoConnected()) {
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      if (title) {
        post.title = title.trim();
        post.slug = slugify(title) + '-' + postId.slice(-4);
      }
      if (content) post.content = content;
      if (summary) post.summary = summary.trim();
      if (category) post.category = category;
      if (tags) {
        post.tags = Array.isArray(tags)
          ? tags
          : tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
      if (status) {
        post.status = status;
        if (status === 'Published' && !post.publishedAt) {
          post.publishedAt = new Date();
        }
      }
      if (scheduledAt) post.scheduledAt = new Date(scheduledAt);

      await post.save();

      return res.status(200).json({ success: true, message: 'Post updated successfully', data: post });
    } else {
      const postIndex = store.posts.findIndex((p) => String(p._id) === String(postId));
      if (postIndex === -1) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      const post = store.posts[postIndex];
      if (title) {
        post.title = title.trim();
        post.slug = slugify(title) + '-' + postId.slice(-4);
      }
      if (content) post.content = content;
      if (summary) post.summary = summary.trim();
      if (category) post.category = category;
      if (tags) {
        post.tags = Array.isArray(tags)
          ? tags
          : tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
      if (status) {
        post.status = status;
        if (status === 'Published' && !post.publishedAt) {
          post.publishedAt = new Date();
        }
      }
      if (scheduledAt) post.scheduledAt = new Date(scheduledAt);
      post.updatedAt = new Date();

      return res.status(200).json({ success: true, message: 'Post updated successfully', data: post });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private/Admin
const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;

    if (isMongoConnected()) {
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      await Post.findByIdAndDelete(postId);
      return res.status(200).json({ success: true, message: 'Post deleted successfully' });
    } else {
      const postIndex = store.posts.findIndex((p) => String(p._id) === String(postId));
      if (postIndex === -1) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      store.posts.splice(postIndex, 1);
      // Clean up comments for this post
      store.comments = store.comments.filter((c) => String(c.post) !== String(postId));

      return res.status(200).json({ success: true, message: 'Post deleted successfully' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
};
