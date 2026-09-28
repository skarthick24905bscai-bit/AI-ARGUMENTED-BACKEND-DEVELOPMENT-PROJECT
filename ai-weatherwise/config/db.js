const mongoose = require('mongoose');

let isConnected = false;
let dbDiagnosticInfo = 'Resilient In-Memory Storage (Active)';
let dbDiagnosticNote = '';

// Catch any unhandled connection errors to prevent node unhandled event warnings
mongoose.connection.on('error', () => {
  isConnected = false;
});

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri || mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost')) {
    isConnected = false;
    dbDiagnosticInfo = 'Resilient In-Memory Storage (Active)';
    console.log('[Storage Engine] Resilient In-Memory Storage Mode active.');
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    isConnected = true;
    dbDiagnosticInfo = 'MongoDB Atlas (Connected)';
    dbDiagnosticNote = `Cluster host: ${conn.connection.host}`;
    console.log(`[Storage Engine] Remote MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    isConnected = false;
    await mongoose.disconnect().catch(() => {});

    const isWhitelist = (error.message || '').includes('whitelist') || (error.message || '').includes('IP');
    dbDiagnosticInfo = 'Resilient In-Memory Storage (Active)';
    if (isWhitelist) {
      dbDiagnosticNote = 'Atlas connection paused: Add 0.0.0.0/0 to MongoDB Atlas Network Access IP whitelist to enable cloud database sync.';
    } else {
      dbDiagnosticNote = 'Remote database unreachable. Operating in resilient in-memory mode.';
    }

    console.log(`[Storage Engine] Initialized in Resilient Storage Mode. (${dbDiagnosticNote})`);
    return null;
  }
};

const isMongoConnected = () => isConnected && mongoose.connection.readyState === 1;

const getDbStatus = () => ({
  status: dbDiagnosticInfo,
  note: dbDiagnosticNote,
  isConnected: isMongoConnected(),
});

module.exports = {
  connectDB,
  isMongoConnected,
  getDbStatus,
};

