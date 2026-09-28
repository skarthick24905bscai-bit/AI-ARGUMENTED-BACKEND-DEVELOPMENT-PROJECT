const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Location = require('../models/Location');
const Analytics = require('../models/Analytics');
const { isMongoConnected, getDbStatus } = require('../config/db');
const { store } = require('../config/fallbackStore');

// @desc    Get complete analytics & system metrics
// @route   GET /api/analytics
// @access  Private/Admin
const getAnalytics = async (req, res, next) => {
  try {
    let usersCount = 0;
    let readersCount = 0;
    let adminsCount = 0;
    let postsTotal = 0;
    let postsPublished = 0;
    let postsDraft = 0;
    let commentsTotal = 0;
    let commentsApproved = 0;
    let commentsPending = 0;
    let commentsSpam = 0;
    let locationsSaved = 0;
    let weatherSearches = 0;
    let aiSummaries = 0;

    if (isMongoConnected()) {
      usersCount = await User.countDocuments();
      readersCount = await User.countDocuments({ role: 'reader' });
      adminsCount = await User.countDocuments({ role: 'admin' });

      postsTotal = await Post.countDocuments();
      postsPublished = await Post.countDocuments({ status: 'Published' });
      postsDraft = await Post.countDocuments({ status: 'Draft' });

      commentsTotal = await Comment.countDocuments();
      commentsApproved = await Comment.countDocuments({ status: 'Approved' });
      commentsPending = await Comment.countDocuments({ status: 'Pending' });
      commentsSpam = await Comment.countDocuments({ status: 'Spam' });

      locationsSaved = await Location.countDocuments();
      weatherSearches = await Analytics.countDocuments({ eventType: 'weather_search' });
      aiSummaries = await Analytics.countDocuments({ eventType: 'ai_summary' });
    } else {
      usersCount = store.users.length;
      readersCount = store.users.filter((u) => u.role === 'reader').length;
      adminsCount = store.users.filter((u) => u.role === 'admin').length;

      postsTotal = store.posts.length;
      postsPublished = store.posts.filter((p) => p.status === 'Published').length;
      postsDraft = store.posts.filter((p) => p.status === 'Draft').length;

      commentsTotal = store.comments.length;
      commentsApproved = store.comments.filter((c) => c.status === 'Approved').length;
      commentsPending = store.comments.filter((c) => c.status === 'Pending').length;
      commentsSpam = store.comments.filter((c) => c.status === 'Spam').length;

      locationsSaved = store.locations.length;
      weatherSearches = store.analytics.filter((a) => a.eventType === 'weather_search').length;
      aiSummaries = store.analytics.filter((a) => a.eventType === 'ai_summary').length;
    }

    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    const weatherConfigured = Boolean(
      process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== 'your_openweather_api_key'
    );

    const dbInfo = getDbStatus();

    const systemHealth = {
      status: 'operational',
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      database: dbInfo.status,
      databaseNote: dbInfo.note,
      geminiAI: geminiConfigured ? 'Gemini 3.8 Flash (Connected)' : 'Fallback Meteorological AI Engine (Active)',
      weatherService: weatherConfigured ? 'OpenWeatherMap API (Live)' : 'Open-Meteo Real-Time Engine (Live)',
    };

    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: usersCount,
          readers: readersCount,
          admins: adminsCount,
        },
        content: {
          totalPosts: postsTotal,
          published: postsPublished,
          draft: postsDraft,
          pending: postsTotal - postsPublished - postsDraft,
        },
        comments: {
          total: commentsTotal,
          approved: commentsApproved,
          pending: commentsPending,
          spam: commentsSpam,
        },
        activity: {
          locationsSaved,
          weatherSearches,
          aiSummaries,
        },
        system: systemHealth,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
};
