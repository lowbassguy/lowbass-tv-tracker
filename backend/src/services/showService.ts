import { PrismaClient } from '@prisma/client';
import { fetchEpisodesFromTvmaze } from './tvmazeService';

const prisma = new PrismaClient();

// Update all shows with fresh episode data
export const updateAllShowsEpisodes = async () => {
  try {
    console.log('🔄 Starting daily episode update for all shows...');
    
    // Get all shows that need updating (last updated > 24 hours ago)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const showsToUpdate = await prisma.show.findMany({
      where: {
        lastApiUpdate: {
          lt: oneDayAgo
        }
      },
      select: {
        id: true,
        tvmazeId: true,
        title: true,
        totalEpisodes: true
      }
    });

    console.log(`📊 Found ${showsToUpdate.length} shows to update`);

    let updatedCount = 0;
    let errorCount = 0;

    // Process shows in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < showsToUpdate.length; i += batchSize) {
      const batch = showsToUpdate.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (show) => {
        try {
          await updateSingleShow(show.id, show.tvmazeId, show.title);
          updatedCount++;
        } catch (error) {
          console.error(`❌ Failed to update ${show.title}:`, error);
          errorCount++;
        }
      });

      await Promise.all(batchPromises);
      
      // Add delay between batches to be respectful to the API
      if (i + batchSize < showsToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Update completed: ${updatedCount} shows updated, ${errorCount} errors`);
    return { updatedCount, errorCount };
  } catch (error) {
    console.error('❌ Error during batch update:', error);
    throw error;
  }
};

// Update a single show's episodes
export const updateSingleShow = async (showId: string, tvmazeId: number, title: string) => {
  try {
    console.log(`🔄 Updating episodes for ${title}...`);
    
    // Fetch latest episodes from TVmaze
    const latestEpisodes = await fetchEpisodesFromTvmaze(tvmazeId);
    
    if (latestEpisodes.length === 0) {
      console.log(`⚠️ No episodes found for ${title}`);
      return;
    }

    // Get existing episodes
    const existingEpisodes = await prisma.episode.findMany({
      where: { showId },
      select: { id: true }
    });

    const existingEpisodeIds = new Set(existingEpisodes.map(ep => ep.id));
    
    // Find new episodes
    const newEpisodes = latestEpisodes.filter(ep => !existingEpisodeIds.has(ep.id));
    
    if (newEpisodes.length > 0) {
      console.log(`➕ Adding ${newEpisodes.length} new episodes for ${title}`);
      
      // Create new episodes
      await prisma.episode.createMany({
        data: newEpisodes.map(ep => ({
          ...ep,
          showId
        })),
        skipDuplicates: true
      });
    }

    // Update show metadata
    await prisma.show.update({
      where: { id: showId },
      data: {
        totalEpisodes: latestEpisodes.length,
        lastApiUpdate: new Date()
      }
    });

    console.log(`✅ Updated ${title} (${latestEpisodes.length} total episodes)`);
  } catch (error) {
    console.error(`❌ Error updating ${title}:`, error);
    throw error;
  }
};

// Clean up old data (optional maintenance task)
export const cleanupOldData = async () => {
  try {
    console.log('🧹 Starting data cleanup...');
    
    // Remove shows that haven't been in anyone's watchlist for 30+ days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const orphanedShows = await prisma.show.findMany({
      where: {
        userShows: {
          none: {}
        },
        updatedAt: {
          lt: thirtyDaysAgo
        }
      },
      select: { id: true, title: true }
    });

    if (orphanedShows.length > 0) {
      console.log(`🗑️ Removing ${orphanedShows.length} orphaned shows`);
      
      // Delete episodes first (due to foreign key constraints)
      await prisma.episode.deleteMany({
        where: {
          showId: {
            in: orphanedShows.map(s => s.id)
          }
        }
      });

      // Then delete shows
      await prisma.show.deleteMany({
        where: {
          id: {
            in: orphanedShows.map(s => s.id)
          }
        }
      });
    }

    console.log('✅ Data cleanup completed');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}; 