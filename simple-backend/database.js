const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path - use persistent disk mount path on Render
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/simple-backend/tv-tracker.db'
  : path.join(__dirname, 'tv-tracker.db');

// Create and connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database:', dbPath);
  }
});

// Initialize database tables
const initializeDatabase = () => {
  console.log('🔧 Initializing database tables...');
  
  // Create shows table
  db.run(`
    CREATE TABLE IF NOT EXISTS shows (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT,
      year TEXT,
      platform TEXT,
      genres TEXT,
      status TEXT,
      poster TEXT,
      rating TEXT,
      summary TEXT,
      language TEXT,
      runtime INTEGER,
      premiered TEXT,
      officialSite TEXT,
      tvmazeUrl TEXT,
      tvmazeId INTEGER,
      addedDate TEXT,
      watched INTEGER DEFAULT 0,
      watchedDate TEXT,
      seasons TEXT,
      episodes TEXT,
      totalEpisodes INTEGER DEFAULT 0,
      watchedEpisodesCount INTEGER DEFAULT 0,
      lastUpdated TEXT,
      expandedSeasons TEXT,
      nextEpisode TEXT
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating shows table:', err.message);
    } else {
      console.log('✅ Shows table ready');
    }
  });
};

// Initialize database on startup
initializeDatabase();

module.exports = db; 