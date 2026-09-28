const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB } = require('./config/db');
const { sanitizeInput } = require('./middleware/sanitizeMiddleware');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const locationRoutes = require('./routes/locationRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const aiRoutes = require('./routes/aiRoutes');
const postRoutes = require('./routes/postRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const commentRoutes = require('./routes/commentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const PORT = 3000;

// Security & Parsing Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);

// Static files configuration
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// API Routing Layer
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI WeatherWise server running smoothly',
    timestamp: new Date(),
  });
});

// Direct HTML page helpers for convenient URL routing
app.get('/dashboard', (req, res) => res.sendFile(path.join(publicPath, 'dashboard.html')));
app.get('/weather', (req, res) => res.sendFile(path.join(publicPath, 'weather.html')));
app.get('/favorites', (req, res) => res.sendFile(path.join(publicPath, 'favorites.html')));
app.get('/posts', (req, res) => res.sendFile(path.join(publicPath, 'posts.html')));
app.get('/post', (req, res) => res.sendFile(path.join(publicPath, 'post.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(publicPath, 'admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(publicPath, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(publicPath, 'register.html')));

// Fallback to index.html for root or non-API paths
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start Express Gateway & Initialize Database
const server = app.listen(PORT, 'localhost', () => {
  console.log(`[AI WeatherWise] Server running on http://localhost:${PORT}`);
  console.log(`[AI WeatherWise] Static UI served from: ${publicPath}`);
});

connectDB().catch((err) => {
  console.log('[AI WeatherWise] Operating with Resilient In-Memory Store.');
});

module.exports = app;
