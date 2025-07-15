import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Mark individual episode as watched/unwatched
router.put('/:episodeId/watched', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const { episodeId } = req.params;
    const { watched } = req.body;

    const episode = await prisma.episode.findUnique({
      where: { id: parseInt(episodeId) },
      include: {
        show: {
          include: {
            userShows: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const userShow = episode.show.userShows[0];
    if (!userShow) {
      return res.status(404).json({ error: 'Show not in user watchlist' });
    }

    // Update or create user episode
    await prisma.userEpisode.upsert({
      where: {
        userId_episodeId: {
          userId,
          episodeId: parseInt(episodeId)
        }
      },
      create: {
        userId,
        episodeId: parseInt(episodeId),
        userShowId: userShow.id,
        watched,
        watchedDate: watched ? new Date() : null
      },
      update: {
        watched,
        watchedDate: watched ? new Date() : null
      }
    });

    res.json({ message: `Episode marked as ${watched ? 'watched' : 'unwatched'} successfully` });
  } catch (error) {
    console.error('Mark episode watched error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark entire season as watched/unwatched
router.put('/season/:showId/:seasonNumber/watched', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const { showId, seasonNumber } = req.params;
    const { watched } = req.body;

    const tvmazeId = parseInt(showId.replace('tvmaze-', ''));

    const userShow = await prisma.userShow.findFirst({
      where: {
        userId,
        show: { tvmazeId }
      },
      include: {
        show: {
          include: {
            episodes: {
              where: { season: parseInt(seasonNumber) }
            }
          }
        }
      }
    });

    if (!userShow) {
      return res.status(404).json({ error: 'Show not found in watchlist' });
    }

    // Update all episodes in the season
    for (const episode of userShow.show.episodes) {
      await prisma.userEpisode.upsert({
        where: {
          userId_episodeId: {
            userId,
            episodeId: episode.id
          }
        },
        create: {
          userId,
          episodeId: episode.id,
          userShowId: userShow.id,
          watched,
          watchedDate: watched ? new Date() : null
        },
        update: {
          watched,
          watchedDate: watched ? new Date() : null
        }
      });
    }

    res.json({ message: `Season ${seasonNumber} marked as ${watched ? 'watched' : 'unwatched'} successfully` });
  } catch (error) {
    console.error('Mark season watched error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 