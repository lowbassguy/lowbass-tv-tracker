require('dotenv').config();
const express = require('express');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Frontend URLs
  credentials: true // Allow credentials (cookies, authorization headers)
}));
app.use(express.json({ limit: '10mb' }));

// Basic Authentication - only if credentials are provided
if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) {
  console.log('🔒 Basic authentication enabled');
  app.use(basicAuth({
    users: { [process.env.AUTH_USERNAME]: process.env.AUTH_PASSWORD },
    challenge: true,
    realm: 'TV Tracker'
  }));
} else {
  console.log('⚠️  No authentication configured - app is unsecured');
  console.log('   Set AUTH_USERNAME and AUTH_PASSWORD environment variables to enable security');
}

// Utility function to serialize show data for database
const serializeShow = (show) => ({
  id: show.id,
  title: show.title,
  type: show.type,
  year: String(show.year),
  platform: show.platform,
  genres: JSON.stringify(show.genres || []),
  status: show.status,
  poster: show.poster,
  rating: String(show.rating),
  summary: show.summary,
  language: show.language,
  runtime: show.runtime,
  premiered: show.premiered,
  officialSite: show.officialSite,
  tvmazeUrl: show.tvmazeUrl,
  tvmazeId: show.tvmazeId,
  addedDate: show.addedDate,
  watched: show.watched ? 1 : 0,
  watchedDate: show.watchedDate,
  seasons: JSON.stringify(show.seasons || []),
  episodes: JSON.stringify(show.episodes || []),
  totalEpisodes: show.totalEpisodes || 0,
  watchedEpisodesCount: show.watchedEpisodesCount || 0,
  lastUpdated: show.lastUpdated,
  expandedSeasons: JSON.stringify(show.expandedSeasons || []),
  nextEpisode: JSON.stringify(show.nextEpisode || null)
});

// Utility function to deserialize show data from database
const deserializeShow = (row) => ({
  id: row.id,
  title: row.title,
  type: row.type,
  year: row.year,
  platform: row.platform,
  genres: JSON.parse(row.genres || '[]'),
  status: row.status,
  poster: row.poster,
  rating: row.rating,
  summary: row.summary,
  language: row.language,
  runtime: row.runtime,
  premiered: row.premiered,
  officialSite: row.officialSite,
  tvmazeUrl: row.tvmazeUrl,
  tvmazeId: row.tvmazeId,
  addedDate: row.addedDate,
  watched: row.watched === 1,
  watchedDate: row.watchedDate,
  seasons: JSON.parse(row.seasons || '[]'),
  episodes: JSON.parse(row.episodes || '[]'),
  totalEpisodes: row.totalEpisodes,
  watchedEpisodesCount: row.watchedEpisodesCount,
  lastUpdated: row.lastUpdated,
  expandedSeasons: JSON.parse(row.expandedSeasons || '[]'),
  nextEpisode: JSON.parse(row.nextEpisode || 'null')
});

// Serve static files from the dist directory (built frontend)
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes

// GET /api/watchlist - Load all shows
app.get('/api/watchlist', (req, res) => {
  console.log('📥 GET /api/watchlist - Loading watchlist...');
  
  db.all('SELECT * FROM shows ORDER BY addedDate DESC', (err, rows) => {
    if (err) {
      console.error('❌ Error loading watchlist:', err.message);
      res.status(500).json({ error: 'Failed to load watchlist' });
    } else {
      const watchlist = rows.map(deserializeShow);
      console.log('✅ Loaded', watchlist.length, 'shows from database');
      res.json(watchlist);
    }
  });
});

// POST /api/watchlist - Add a show
app.post('/api/watchlist', (req, res) => {
  console.log('📤 POST /api/watchlist - Adding show:', req.body.title);
  
  const show = req.body;
  const serializedShow = serializeShow(show);
  
  // Build the INSERT statement
  const columns = Object.keys(serializedShow).join(', ');
  const placeholders = Object.keys(serializedShow).map(() => '?').join(', ');
  const values = Object.values(serializedShow);
  
  const sql = `INSERT OR REPLACE INTO shows (${columns}) VALUES (${placeholders})`;
  
  db.run(sql, values, function(err) {
    if (err) {
      console.error('❌ Error adding show:', err.message);
      res.status(500).json({ error: 'Failed to add show' });
    } else {
      console.log('✅ Show added successfully');
      res.json({ success: true, id: show.id });
    }
  });
});

// PUT /api/watchlist/:id - Update a show
app.put('/api/watchlist/:id', (req, res) => {
  console.log('🔄 PUT /api/watchlist/:id - Updating show:', req.params.id);
  
  const show = req.body;
  const serializedShow = serializeShow(show);
  
  // Build the UPDATE statement
  const updates = Object.keys(serializedShow).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(serializedShow), req.params.id];
  
  const sql = `UPDATE shows SET ${updates} WHERE id = ?`;
  
  db.run(sql, values, function(err) {
    if (err) {
      console.error('❌ Error updating show:', err.message);
      res.status(500).json({ error: 'Failed to update show' });
    } else {
      console.log('✅ Show updated successfully');
      res.json({ success: true });
    }
  });
});

// DELETE /api/watchlist/:id - Remove a show
app.delete('/api/watchlist/:id', (req, res) => {
  console.log('🗑️ DELETE /api/watchlist/:id - Removing show:', req.params.id);
  
  const sql = 'DELETE FROM shows WHERE id = ?';
  
  db.run(sql, [req.params.id], function(err) {
    if (err) {
      console.error('❌ Error removing show:', err.message);
      res.status(500).json({ error: 'Failed to remove show' });
    } else {
      console.log('✅ Show removed successfully');
      res.json({ success: true });
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TV Tracker API is running' });
});

// Catch-all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TV Tracker Simple Backend running on http://localhost:${PORT}`);
  console.log(`📊 Database location: ${__dirname}/tv-tracker.db`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
}); 