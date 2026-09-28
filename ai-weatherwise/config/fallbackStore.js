const bcrypt = require('bcryptjs');

// In-memory persistent state for Resilient Fallback Mode
// Pre-seeded with realistic initial data so the app is immediately rich and engaging
const generateId = () => {
  const timestamp = (new Date().getTime() / 1000 | 0).toString(16);
  return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16)).toLowerCase();
};

const store = {
  users: [],
  locations: [],
  categories: [],
  posts: [],
  comments: [],
  analytics: [],
};

// Seed initial default accounts and data
const initFallbackSeed = () => {
  if (store.users.length > 0) return;

  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('Admin@123', salt);
  const readerPasswordHash = bcrypt.hashSync('Reader@123', salt);
  const alexPasswordHash = bcrypt.hashSync('Alex@123', salt);

  const adminId = generateId();
  const readerId = generateId();

  store.users.push(
    {
      _id: adminId,
      name: 'Sarah Admin',
      email: 'admin@weatherwise.ai',
      password: adminPasswordHash,
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: generateId(),
      name: 'Sarah Admin (Legacy)',
      email: 'admin@weatherwise.com',
      password: adminPasswordHash,
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: readerId,
      name: 'Alex Grealish',
      email: 'reader@weatherwise.ai',
      password: readerPasswordHash,
      role: 'reader',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: generateId(),
      name: 'Alex Grealish',
      email: 'alex@weatherwise.com',
      password: alexPasswordHash,
      role: 'reader',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );

  // Seed default favorite cities for Alex / reader
  const loc1 = generateId();
  const loc2 = generateId();
  const loc3 = generateId();

  store.locations.push(
    { _id: loc1, user: readerId, city: 'London', country: 'United Kingdom', createdAt: new Date() },
    { _id: loc2, user: readerId, city: 'Tokyo', country: 'Japan', createdAt: new Date() },
    { _id: loc3, user: readerId, city: 'New York', country: 'United States', createdAt: new Date() }
  );

  // Seed categories
  const cat1 = generateId();
  const cat2 = generateId();
  const cat3 = generateId();

  store.categories.push(
    { _id: cat1, name: 'Meteorology Insights', slug: 'meteorology-insights', description: 'Deep dives into atmospheric science and storm tracking.', createdAt: new Date() },
    { _id: cat2, name: 'Smart Travel & Outdoor', slug: 'smart-travel-outdoor', description: 'Activity planning, hiking guides, and climate adaptability.', createdAt: new Date() },
    { _id: cat3, name: 'Climate & Air Quality', slug: 'climate-air-quality', description: 'Environmental health, AQI indexing, and seasonal trends.', createdAt: new Date() }
  );

  // Seed posts
  const post1 = generateId();
  const post2 = generateId();
  const post3 = generateId();

  store.posts.push(
    {
      _id: post1,
      title: 'Navigating Sudden Microclimate Shifts in Coastal Cities',
      slug: 'navigating-microclimate-shifts-coastal-cities',
      summary: 'Why coastal humidity and sea breezes alter localized precipitation faster than standard forecast models predict.',
      content: 'Coastal meteorology presents unique challenges for travelers and athletes. When marine air masses collide with thermal updrafts from inland terrain, cloud condensation accelerates. In this study, we explore how real-time pressure deltas combined with humidity measurements help predict sudden downpours with over 90% accuracy.',
      category: cat1,
      tags: ['microclimate', 'coastal', 'humidity', 'forecast'],
      author: adminId,
      status: 'Published',
      views: 142,
      publishedAt: new Date(Date.now() - 86400000 * 2),
      createdAt: new Date(Date.now() - 86400000 * 2),
      updatedAt: new Date(),
    },
    {
      _id: post2,
      title: 'Understanding AQI Levels: Protection Measures for Outdoor Runners',
      slug: 'understanding-aqi-levels-outdoor-runners',
      summary: 'A comprehensive guide to interpreting PM2.5, ground-level ozone, and finding optimal training hours.',
      content: 'Air quality index (AQI) evaluates five major air pollutants. For endurance athletes, exercising during PM2.5 spikes can strain cardiovascular performance. We recommend tracking early morning wind patterns and planning high-intensity workouts when AQI stays below 50.',
      category: cat3,
      tags: ['AQI', 'running', 'health', 'particulate'],
      author: adminId,
      status: 'Published',
      views: 98,
      publishedAt: new Date(Date.now() - 86400000),
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
    },
    {
      _id: post3,
      title: 'Winter Travel Checklist: Preparing for Sub-Zero Mountain Passes',
      slug: 'winter-travel-checklist-mountain-passes',
      summary: 'Essential gear, atmospheric pressure awareness, and elevation wind-chill factors.',
      content: 'Elevation drops ambient temperatures by roughly 6.5°C per 1,000 meters of altitude gain. Proper layering with moisture-wicking fabrics and monitoring rapid barometric drops can prevent hypothermia.',
      category: cat2,
      tags: ['winter', 'hiking', 'mountain', 'gear'],
      author: adminId,
      status: 'Published',
      views: 64,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );

  // Seed comments
  store.comments.push(
    {
      _id: generateId(),
      post: post1,
      user: readerId,
      userName: 'Alex Grealish',
      content: 'This explains why the fog in San Francisco rolls in so rapidly during summer afternoons. Great analysis!',
      status: 'Approved',
      createdAt: new Date(Date.now() - 3600000 * 5),
    },
    {
      _id: generateId(),
      post: post2,
      user: readerId,
      userName: 'Alex Grealish',
      content: 'The early morning tip is super helpful. I noticed my lung capacity feels so much better before 8 AM.',
      status: 'Approved',
      createdAt: new Date(Date.now() - 3600000 * 2),
    }
  );

  // Seed initial analytics
  store.analytics.push(
    { _id: generateId(), eventType: 'weather_search', city: 'London', timestamp: new Date(Date.now() - 3600000 * 4) },
    { _id: generateId(), eventType: 'weather_search', city: 'Tokyo', timestamp: new Date(Date.now() - 3600000 * 3) },
    { _id: generateId(), eventType: 'ai_summary', city: 'London', timestamp: new Date(Date.now() - 3600000 * 2) },
    { _id: generateId(), eventType: 'weather_search', city: 'New York', timestamp: new Date(Date.now() - 3600000 * 1) }
  );
};

initFallbackSeed();

module.exports = {
  store,
  generateId,
};
