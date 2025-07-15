import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import Joi from 'joi';

const router = express.Router();
const prisma = new PrismaClient();

// Get user preferences
router.get('/preferences', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      // Create default preferences if they don't exist
      const defaultPreferences = await prisma.userPreferences.create({
        data: { userId }
      });
      return res.json({ preferences: defaultPreferences });
    }

    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user preferences
router.put('/preferences', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    
    const preferencesSchema = Joi.object({
      defaultTab: Joi.string().valid('unwatched', 'watched', 'all'),
      latestEpisodesSortOrder: Joi.string().valid('newest', 'oldest'),
      upcomingEpisodesSortOrder: Joi.string().valid('soonest', 'latest'),
      autoMarkWatched: Joi.boolean(),
      notificationsEnabled: Joi.boolean()
    });

    const { error } = preferencesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updatedPreferences = await prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...req.body
      },
      update: req.body
    });

    res.json({ 
      message: 'Preferences updated successfully',
      preferences: updatedPreferences 
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user statistics
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await prisma.userShow.findMany({
      where: { userId },
      include: {
        show: {
          include: {
            episodes: true
          }
        },
        userEpisodes: {
          where: { watched: true }
        }
      }
    });

    const totalShows = stats.length;
    const watchedShows = stats.filter(s => s.watched).length;
    const totalEpisodes = stats.reduce((sum, s) => sum + s.show.episodes.length, 0);
    const watchedEpisodes = stats.reduce((sum, s) => sum + s.userEpisodes.length, 0);
    
    // Calculate watch time (assuming 45 min average episode length)
    const avgEpisodeLength = 45;
    const totalWatchTime = watchedEpisodes * avgEpisodeLength;
    const watchTimeHours = Math.floor(totalWatchTime / 60);
    const watchTimeDays = Math.floor(watchTimeHours / 24);

    res.json({
      stats: {
        totalShows,
        watchedShows,
        totalEpisodes,
        watchedEpisodes,
        watchTimeMinutes: totalWatchTime,
        watchTimeHours,
        watchTimeDays,
        completionPercentage: totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 