import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Import routes
import authRoutes from './routes/auth';
import showRoutes from './routes/shows';
import watchlistRoutes from './routes/watchlist';
import episodeRoutes from './routes/episodes';
import userRoutes from './routes/user';

// Import services
import { updateAllShowsEpisodes } from './services/showService';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/shows', authenticate, showRoutes);
app.use('/api/watchlist', authenticate, watchlistRoutes);
app.use('/api/episodes', authenticate, episodeRoutes);
app.use('/api/user', authenticate, userRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Scheduled tasks
// Update all shows' episode data daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🔄 Running daily episode update job...');
  try {
    await updateAllShowsEpisodes();
    console.log('✅ Daily episode update completed successfully');
  } catch (error) {
    console.error('❌ Daily episode update failed:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
});

export default app; 