import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { fetchShowFromTvmaze, fetchEpisodesFromTvmaze } from '../services/tvmazeService';

const router = express.Router();
const prisma = new PrismaClient();

// Get user's complete watchlist
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    
    const watchlist = await prisma.userShow.findMany({
      where: { userId },
      include: {
        show: {
          include: {
            episodes: {
              orderBy: [
                { season: 'asc' },
                { episode: 'asc' }
              ]
            }
          }
        },
        userEpisodes: {
          include: {
            episode: true
          }
        }
      },
      orderBy: {
        addedDate: 'desc'
      }
    });

    // Transform data to match frontend format
    const transformedWatchlist = watchlist.map(userShow => {
      const show = userShow.show;
      const userEpisodes = userShow.userEpisodes;
      
      // Create episodes array with watch status
      const episodes = show.episodes.map(episode => {
        const userEpisode = userEpisodes.find(ue => ue.episodeId === episode.id);
        return {
          ...episode,
          watched: userEpisode?.watched || false,
          watchedDate: userEpisode?.watchedDate?.toISOString()
        };
      });

      // Group episodes by season
      const seasonsMap = new Map();
      episodes.forEach(episode => {
        if (!seasonsMap.has(episode.season)) {
          seasonsMap.set(episode.season, []);
        }
        seasonsMap.get(episode.season).push(episode);
      });

      const seasons = Array.from(seasonsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([seasonNumber, seasonEpisodes]) => ({
          number: seasonNumber,
          episodes: seasonEpisodes.sort((a, b) => a.episode - b.episode),
          totalEpisodes: seasonEpisodes.length,
          watchedEpisodes: seasonEpisodes.filter(ep => ep.watched).length
        }));

      // Find next unwatched episode
      const nextUnwatched = episodes.find(ep => !ep.watched && new Date(ep.airDate) <= new Date());
      const nextEpisode = nextUnwatched ? {
        season: nextUnwatched.season,
        episode: nextUnwatched.episode,
        title: nextUnwatched.title,
        airDate: nextUnwatched.airDate,
        airTime: nextUnwatched.airTime,
        runtime: nextUnwatched.runtime,
        hasNext: true
      } : null;

      const watchedCount = episodes.filter(ep => ep.watched).length;
      const totalEpisodes = episodes.length;

      return {
        id: `tvmaze-${show.tvmazeId}`,
        title: show.title,
        type: show.type,
        year: show.year,
        platform: show.platform,
        genres: show.genres,
        status: show.status,
        poster: show.poster,
        rating: show.rating,
        summary: show.summary,
        language: show.language,
        runtime: show.runtime,
        premiered: show.premiered,
        officialSite: show.officialSite,
        tvmazeUrl: show.tvmazeUrl,
        tvmazeId: show.tvmazeId,
        addedDate: userShow.addedDate.toISOString(),
        watched: userShow.watched,
        watchedDate: userShow.watchedDate,
        lastWatchedEpisode: userShow.lastWatchedEpisode ? JSON.parse(userShow.lastWatchedEpisode) : null,
        seasons,
        episodes,
        totalEpisodes,
        watchedEpisodesCount: watchedCount,
        nextEpisode,
        lastUpdated: show.lastApiUpdate.toISOString(),
        expandedSeasons: userShow.expandedSeasons || []
      };
    });

    res.json({ watchlist: transformedWatchlist });
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add show to watchlist
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const { tvmazeId } = req.body;

    if (!tvmazeId) {
      return res.status(400).json({ error: 'TVmaze ID is required' });
    }

    // Check if show already in watchlist
    const existingUserShow = await prisma.userShow.findFirst({
      where: {
        userId,
        show: { tvmazeId }
      }
    });

    if (existingUserShow) {
      return res.status(409).json({ error: 'Show already in watchlist' });
    }

    // Check if show exists in database
    let show = await prisma.show.findUnique({
      where: { tvmazeId }
    });

    // If show doesn't exist, fetch from TVmaze and create
    if (!show) {
      const showData = await fetchShowFromTvmaze(tvmazeId);
      if (!showData) {
        return res.status(404).json({ error: 'Show not found' });
      }

      show = await prisma.show.create({
        data: showData
      });

      // Fetch and create episodes
      const episodesData = await fetchEpisodesFromTvmaze(tvmazeId);
      if (episodesData.length > 0) {
        await prisma.episode.createMany({
          data: episodesData.map(ep => ({
            ...ep,
            showId: show.id
          }))
        });

        // Update total episodes count
        await prisma.show.update({
          where: { id: show.id },
          data: { totalEpisodes: episodesData.length }
        });
      }
    }

    // Add to user's watchlist
    const userShow = await prisma.userShow.create({
      data: {
        userId,
        showId: show.id,
        addedDate: new Date()
      }
    });

    res.status(201).json({ 
      message: 'Show added to watchlist successfully',
      userShow
    });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove show from watchlist
router.delete('/:showId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const { showId } = req.params;

    // Extract tvmazeId from showId format (tvmaze-123)
    const tvmazeId = parseInt(showId.replace('tvmaze-', ''));

    const userShow = await prisma.userShow.findFirst({
      where: {
        userId,
        show: { tvmazeId }
      }
    });

    if (!userShow) {
      return res.status(404).json({ error: 'Show not found in watchlist' });
    }

    // Delete user episodes first (cascade should handle this, but being explicit)
    await prisma.userEpisode.deleteMany({
      where: { userShowId: userShow.id }
    });

    // Delete from watchlist
    await prisma.userShow.delete({
      where: { id: userShow.id }
    });

    res.json({ message: 'Show removed from watchlist successfully' });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark entire show as watched/unwatched
router.put('/:showId/watched', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const { showId } = req.params;
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
            episodes: true
          }
        }
      }
    });

    if (!userShow) {
      return res.status(404).json({ error: 'Show not found in watchlist' });
    }

    // Update show watch status
    await prisma.userShow.update({
      where: { id: userShow.id },
      data: {
        watched,
        watchedDate: watched ? new Date().toISOString() : null
      }
    });

    // Update all episodes
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

    res.json({ message: `Show marked as ${watched ? 'watched' : 'unwatched'} successfully` });
  } catch (error) {
    console.error('Mark show watched error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update expanded seasons
router.put('/:showId/expanded-seasons', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const { showId } = req.params;
    const { expandedSeasons } = req.body;

    const tvmazeId = parseInt(showId.replace('tvmaze-', ''));

    const userShow = await prisma.userShow.findFirst({
      where: {
        userId,
        show: { tvmazeId }
      }
    });

    if (!userShow) {
      return res.status(404).json({ error: 'Show not found in watchlist' });
    }

    await prisma.userShow.update({
      where: { id: userShow.id },
      data: { expandedSeasons }
    });

    res.json({ message: 'Expanded seasons updated successfully' });
  } catch (error) {
    console.error('Update expanded seasons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 