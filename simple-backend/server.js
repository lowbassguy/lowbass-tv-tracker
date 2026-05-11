require('dotenv').config();
const express = require('express');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3002;
const databasePath = process.env.DB_PATH || path.join(__dirname, 'tv-tracker.db');
const isAuthConfigured = Boolean(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD);
const isDbBackupEnabled = process.env.ENABLE_DB_BACKUP_DOWNLOAD === 'true';

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Frontend URLs
  credentials: true // Allow credentials (cookies, authorization headers)
}));
app.use(express.json({ limit: '10mb' }));

// Basic Authentication - only if credentials are provided
if (isAuthConfigured) {
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
const execSql = (sql) => new Promise((resolve, reject) => {
  db.exec(sql, (err) => {
    if (err) {
      reject(err);
      return;
    }

    resolve();
  });
});

const deleteFileIfExists = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Failed to clean up backup file:', err.message);
    }
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeSqliteString = (value) => `'${String(value).replace(/'/g, "''")}'`;

const createDatabaseSnapshot = async (snapshotPath) => {
  const vacuumIntoSql = `VACUUM INTO ${escapeSqliteString(snapshotPath)}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await execSql(vacuumIntoSql);
      return;
    } catch (err) {
      if (err.code !== 'SQLITE_BUSY' || attempt === 3) {
        throw err;
      }

      await sleep(attempt * 500);
    }
  }
};

// Don't coerce missing scalars to the literal string "undefined" — leave them
// as NULL so the DB stays accurate.
const toNullableString = (value) =>
  value === undefined || value === null ? null : String(value);

const serializeShow = (show) => ({
  id: show.id,
  title: show.title,
  type: show.type,
  year: toNullableString(show.year),
  platform: show.platform,
  genres: JSON.stringify(show.genres || []),
  status: show.status,
  poster: show.poster,
  rating: toNullableString(show.rating),
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

// Minimal payload validation — rejects clearly malformed mutation bodies
// before they hit SQLite. Returns an error string when invalid.
const validateShowPayload = (show) => {
  if (!show || typeof show !== 'object') return 'Request body must be a JSON object';
  if (typeof show.id !== 'string' || show.id.length === 0) return 'Field "id" is required and must be a non-empty string';
  if (typeof show.title !== 'string' || show.title.length === 0) return 'Field "title" is required and must be a non-empty string';
  if (show.tvmazeId !== undefined && show.tvmazeId !== null && typeof show.tvmazeId !== 'number') {
    return 'Field "tvmazeId" must be a number when provided';
  }
  return null;
};

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
  const validationError = validateShowPayload(req.body);
  if (validationError) {
    console.warn('⚠️ POST /api/watchlist - invalid payload:', validationError);
    return res.status(400).json({ error: validationError });
  }

  const show = req.body;
  console.log('📤 POST /api/watchlist - Adding show:', show.title);

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
  const validationError = validateShowPayload(req.body);
  if (validationError) {
    console.warn('⚠️ PUT /api/watchlist - invalid payload:', validationError);
    return res.status(400).json({ error: validationError });
  }
  if (req.body.id !== req.params.id) {
    console.warn('⚠️ PUT /api/watchlist - id mismatch between path and body');
    return res.status(400).json({ error: 'Path id does not match body id' });
  }

  const show = req.body;
  console.log('🔄 PUT /api/watchlist/:id - Updating show:', req.params.id);

  const serializedShow = serializeShow(show);

  // Build the UPDATE statement
  const updates = Object.keys(serializedShow).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(serializedShow), req.params.id];

  const sql = `UPDATE shows SET ${updates} WHERE id = ?`;

  db.run(sql, values, function(err) {
    if (err) {
      console.error('❌ Error updating show:', err.message);
      res.status(500).json({ error: 'Failed to update show' });
    } else if (this.changes === 0) {
      console.warn('⚠️ Update affected no rows for id', req.params.id);
      res.status(404).json({ error: 'Show not found' });
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
    } else if (this.changes === 0) {
      console.warn('⚠️ Delete affected no rows for id', req.params.id);
      res.status(404).json({ error: 'Show not found' });
    } else {
      console.log('✅ Show removed successfully');
      res.json({ success: true });
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TV Tracker API is running',
    dbBackupEnabled: isDbBackupEnabled && isAuthConfigured
  });
});

if (isDbBackupEnabled && isAuthConfigured) {
  // Create a consistent SQLite snapshot, then stream it as a download.
  app.get('/api/admin/db-backup', async (req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `tv-tracker-backup-${timestamp}.db`;
    const snapshotPath = path.join(os.tmpdir(), backupFileName);

    try {
      console.log('Creating database snapshot for download...');
      await deleteFileIfExists(snapshotPath);
      await createDatabaseSnapshot(snapshotPath);

      res.download(snapshotPath, backupFileName, async (err) => {
        await deleteFileIfExists(snapshotPath);

        if (err) {
          console.error('Failed to send database backup:', err.message);

          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to send database backup' });
          }
        } else {
          console.log('Database backup downloaded successfully');
        }
      });
    } catch (err) {
      await deleteFileIfExists(snapshotPath);
      console.error('Failed to create database backup:', err.message);
      res.status(500).json({ error: 'Failed to create database backup' });
    }
  });
} else if (isDbBackupEnabled) {
  console.log('DB backup download route not enabled because authentication is not configured');
}

// Catch-all handler: send back React's index.html file for client-side routing.
// Unknown /api/* paths should 404 instead of silently returning the SPA shell.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TV Tracker Simple Backend running on http://localhost:${PORT}`);
  console.log(`📊 Database location: ${__dirname}/tv-tracker.db`);
});

// Graceful shutdown — handle both SIGINT (Ctrl-C) and SIGTERM (container stop).
const shutdown = (signal) => {
  console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

