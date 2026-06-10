/*
 * lowbass' TV Tracker
 * Author: Joshua 'lowbass' Sommerfeldt
 */

import { useState, useEffect, useRef } from 'react';
import { apiClient } from './services/api';
import { AppHeader } from './components/AppHeader';
import { SearchPanel } from './components/SearchPanel';
import { StatsBar } from './components/StatsBar';
import { EpisodeRail } from './components/EpisodeRail';
import { WatchlistTabs } from './components/WatchlistTabs';
import { WatchlistGrid } from './components/WatchlistGrid';
import { ShowDrawer } from './components/ShowDrawer';
import { EmptyState } from './components/EmptyState';
import { AppFooter } from './components/AppFooter';
import { TooltipProvider } from './components/ui/tooltip';

// Define types for better TypeScript support
interface Episode {
  id: number;
  season: number;
  episode: number;
  title: string;
  airDate: string;
  airTime?: string;
  runtime?: number;
  summary?: string;
  watched: boolean;
  watchedDate?: string;
}

interface Season {
  number: number;
  episodes: Episode[];
  totalEpisodes: number;
  watchedEpisodes: number;
}

interface NextEpisode {
  season?: number;
  episode?: number;
  title?: string;
  airDate?: string;
  airTime?: string;
  runtime?: number;
  hasNext?: boolean;
}

interface Show {
  id: string;
  title: string;
  type: string;
  year: string | number;
  platform: string;
  genres: string[];
  status: string;
  nextEpisode: NextEpisode | null;
  poster: string;
  rating: string | number;
  summary: string;
  language: string;
  runtime: number;
  premiered: string;
  officialSite: string;
  tvmazeUrl: string;
  tvmazeId: number;
  addedDate?: string;
  watched?: boolean;
  watchedEpisodes?: any[]; // Legacy field, will be replaced
  watchedDate?: string;
  lastWatchedEpisode?: NextEpisode | null;
  // New comprehensive episode tracking
  seasons: Season[];
  episodes: Episode[];
  totalEpisodes: number;
  watchedEpisodesCount: number;
  lastUpdated?: string;
  expandedSeasons?: number[]; // UI state for expanded seasons
}

const App = () => {
  // 🎬 State management for all our tracking needs
  const [searchQuery, setSearchQuery] = useState(''); // Current search input
  const [searchResults, setSearchResults] = useState<Show[]>([]); // Results from API search
  const [watchlist, setWatchlist] = useState<Show[]>([]); // User's saved shows/movies
  const [activeTab, setActiveTab] = useState('unwatched'); // Current view tab
  const [loading, setLoading] = useState(false); // Loading state for API calls
  const [error, setError] = useState<string | null>(null); // Error handling state
  const [expandedShows, setExpandedShows] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('expandedShows');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  }); // Track which shows are expanded
  const [latestEpisodesSortOrder, setLatestEpisodesSortOrder] = useState<'newest' | 'oldest'>(() => {
    const saved = localStorage.getItem('latestEpisodesSortOrder');
    return (saved as 'newest' | 'oldest') || 'newest';
  }); // Sort order for latest episodes
  const [upcomingEpisodesSortOrder, setUpcomingEpisodesSortOrder] = useState<'soonest' | 'latest'>(() => {
    const saved = localStorage.getItem('upcomingEpisodesSortOrder');
    return (saved as 'soonest' | 'latest') || 'soonest';
  }); // Sort order for upcoming episodes
  const [dbBackupEnabled, setDbBackupEnabled] = useState(false);

  // Modern shell state
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeShowId, setActiveShowId] = useState<string | null>(null);

  // Monotonic token so late-arriving search continuations can detect they're stale.
  const searchTokenRef = useRef(0);
  // Always-fresh handle on the watchlist so the daily-update timer doesn't
  // execute against a stale snapshot captured at mount.
  const watchlistRef = useRef<Show[]>([]);

  // 💾 Load watchlist from database on component mount
  useEffect(() => {
    const loadWatchlist = async () => {
      console.log('📂 Loading watchlist from database...');
      try {
        const watchlist = await apiClient.loadWatchlist();
        setWatchlist(watchlist);
        console.log('✅ Watchlist loaded successfully!', watchlist);
      } catch (err) {
        console.error('❌ Error loading watchlist:', err);
        setError('Failed to load saved data');
      }
    };
    
    loadWatchlist();
    
    // 🧹 Cleanup function
    return () => {
      console.log('🧹 Component cleanup initiated');
    };
  }, []);

  // 💾 Save UI settings to localStorage
  useEffect(() => {
    localStorage.setItem('expandedShows', JSON.stringify(Array.from(expandedShows)));
  }, [expandedShows]);

  useEffect(() => {
    const loadHealthStatus = async () => {
      try {
        const healthStatus = await apiClient.getHealthStatus();
        setDbBackupEnabled(Boolean(healthStatus.dbBackupEnabled));
      } catch (err) {
        console.warn('Failed to load API health status:', err);
      }
    };

    loadHealthStatus();
  }, []);

  useEffect(() => {
    localStorage.setItem('latestEpisodesSortOrder', latestEpisodesSortOrder);
  }, [latestEpisodesSortOrder]);

  useEffect(() => {
    localStorage.setItem('upcomingEpisodesSortOrder', upcomingEpisodesSortOrder);
  }, [upcomingEpisodesSortOrder]);

  // Keep the watchlist ref in sync on every render so the daily-update closure
  // (C1/M1/M6) always sees the latest data without re-arming the timer.
  useEffect(() => {
    watchlistRef.current = watchlist;
  });

  // 📅 Daily update system - refresh episode data
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const updateShowsDaily = async () => {
      console.log('📅 Running daily update check...');

      const currentWatchlist = watchlistRef.current;
      if (currentWatchlist.length === 0) return;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Find shows that need updating (not updated in last 24 hours)
      const showsToUpdate = currentWatchlist.filter(show => {
        if (!show.lastUpdated) return true;
        const lastUpdated = new Date(show.lastUpdated);
        return lastUpdated < oneDayAgo;
      });

      console.log('🔄 Found', showsToUpdate.length, 'shows needing updates');

      if (showsToUpdate.length === 0) return;

      // Update shows in batches to avoid overwhelming the API
      const batchSize = 3;
      for (let i = 0; i < showsToUpdate.length; i += batchSize) {
        if (cancelled) return;
        const batch = showsToUpdate.slice(i, i + batchSize);
        console.log('📡 Updating batch', Math.floor(i / batchSize) + 1, '/', Math.ceil(showsToUpdate.length / batchSize));

        const updates = await Promise.all(
          batch.map(async (show) => {
            try {
              console.log('🔄 Updating episode data for', show.title);
              const updatedShow = await updateShowWithEpisodes(show);
              return updatedShow;
            } catch (err) {
              console.error('❌ Failed to update', show.title, ':', err);
              return show; // Return original show if update fails
            }
          })
        );

        if (cancelled) return;

        // Merge into the latest state and persist what actually landed —
        // avoids overwriting concurrent user toggles (M6).
        const persistTargets: Show[] = [];
        setWatchlist(prevWatchlist =>
          prevWatchlist.map(show => {
            const updatedShow = updates.find(u => u.id === show.id);
            if (!updatedShow) return show;
            // Preserve any watched changes the user made during the network call
            // by re-merging existing episode flags onto the fresh data.
            const merged: Show = {
              ...updatedShow,
              episodes: updatedShow.episodes.map(ep => {
                const userEp = show.episodes.find(e => e.id === ep.id);
                if (!userEp) return ep;
                return { ...ep, watched: userEp.watched, watchedDate: userEp.watchedDate };
              })
            };
            const watchedCount = merged.episodes.filter(e => e.watched).length;
            merged.watchedEpisodesCount = watchedCount;
            merged.watched = watchedCount === merged.episodes.length && merged.episodes.length > 0;
            merged.seasons = organizeEpisodesIntoSeasons(merged.episodes);
            persistTargets.push(merged);
            return merged;
          })
        );

        // Save updated shows to database
        try {
          await Promise.all(
            persistTargets.map(updatedShow => apiClient.updateShow(updatedShow))
          );
          console.log('✅ Daily updates saved to database');
        } catch (err) {
          console.error('❌ Error saving daily updates to database:', err);
        }

        // Add delay between batches to be respectful to the API
        if (i + batchSize < showsToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('✅ Daily update completed!');
    };

    // Run on component mount
    updateShowsDaily();

    // Set up daily update at midnight
    const scheduleNextUpdate = () => {
      if (cancelled) return;
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Set to midnight

      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      console.log('⏰ Next update scheduled in', Math.floor(msUntilMidnight / 1000 / 60 / 60), 'hours');

      timeoutId = setTimeout(() => {
        if (cancelled) return;
        updateShowsDaily();
        scheduleNextUpdate(); // Schedule the next update
      }, msUntilMidnight);
    };

    scheduleNextUpdate();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []); // Stable schedule — fresh data comes from watchlistRef.

  // Note: Watchlist is now saved to database immediately when changed (no auto-save useEffect needed)

  // 🔍 Search for shows using TVmaze API
  const handleSearch = async () => {
    console.log('🔍 Starting search for:', searchQuery);
    const searchToken = ++searchTokenRef.current;
    setLoading(true);
    setError(null);

    try {
      // 📡 Search TVmaze API for shows - using HTTPS to avoid CORS issues
      console.log('📡 Fetching data from TVmaze API...');
      
      // TVmaze API endpoint with HTTPS
      const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchQuery)}`;
      console.log('🌐 API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`);
      }
      
      const data = await response.json() as any[];
      console.log('📥 Raw API response:', data);
      
      // 🎨 Transform TVmaze data to our format
      const transformedResults: Show[] = data.map((item: any) => {
        const show = item.show;
        console.log('🔄 Transforming show:', show.name);
        
        // 📺 Extract network/streaming info
        const platform = show.network?.name || 
                        show.webChannel?.name || 
                        'Unknown Platform';
        
        // 📅 Get next episode info if available
        let nextEpisode: NextEpisode | null = null;
        if (show._links?.nextepisode?.href) {
          // Note: This would require another API call to get full episode details
          // For now, we'll mark that it has upcoming episodes
          nextEpisode = { hasNext: true };
        }
        
        return {
          id: `tvmaze-${show.id}`,
          title: show.name,
          type: 'tv',
          year: show.premiered ? new Date(show.premiered).getFullYear() : 'Unknown',
          platform: platform,
          genres: show.genres || [],
          status: show.status,
          nextEpisode: nextEpisode,
          poster: show.image?.medium || `https://via.placeholder.com/150x225/8a0707/ffffff?text=${encodeURIComponent(show.name)}`,
          rating: show.rating?.average || 'N/A',
          summary: show.summary ? show.summary.replace(/<[^>]*>/g, '') : 'No summary available',
          language: show.language,
          runtime: show.runtime,
          premiered: show.premiered,
          officialSite: show.officialSite,
          tvmazeUrl: show.url,
          tvmazeId: show.id,
          // Initialize new comprehensive episode tracking fields
          seasons: [],
          episodes: [],
          totalEpisodes: 0,
          watchedEpisodesCount: 0,
          lastUpdated: new Date().toISOString(),
          expandedSeasons: []
        };
      });
      
      if (searchToken !== searchTokenRef.current) {
        console.log('🚫 Discarding stale search results for token', searchToken);
        return;
      }
      setSearchResults(transformedResults);
      console.log('✅ Search completed! Found', transformedResults.length, 'results');

      // 🎯 If we have results, fetch next episode info for each show
      if (transformedResults.length > 0) {
        console.log('🔍 Fetching next episode info for results...');
        fetchNextEpisodeInfo(transformedResults, searchToken);
      }
      
    } catch (err) {
      console.error('❌ Search error:', err);
      console.error('Error details:', (err as Error).message);
      
      // More specific error messages
      if ((err as Error).message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to search. Please try again.');
      }
    } finally {
      setLoading(false);
      console.log('🏁 Search process completed');
    }
  };

  // 📅 Fetch next episode information for search results
  const handleDatabaseDownload = () => {
    window.location.href = apiClient.getDatabaseBackupUrl();
  };

  const fetchNextEpisodeInfo = async (shows: Show[], searchToken?: number) => {
    console.log('📅 Fetching next episode info for', shows.length, 'shows');

    try {
      const updatedShows = await Promise.all(
        shows.map(async (show) => {
          try {
            // 📡 Get show details with episode information
            const response = await fetch(`https://api.tvmaze.com/shows/${show.tvmazeId}?embed=nextepisode`);
            if (!response.ok) {
              throw new Error(`TVmaze ${response.status} for show ${show.tvmazeId}`);
            }
            const data = await response.json() as any;

            if (data._embedded?.nextepisode) {
              const nextEp = data._embedded.nextepisode;
              console.log('📺 Found next episode for', show.title, ':', nextEp.name);

              return {
                ...show,
                nextEpisode: {
                  season: nextEp.season,
                  episode: nextEp.number,
                  title: nextEp.name,
                  airDate: nextEp.airdate,
                  airTime: nextEp.airtime,
                  runtime: nextEp.runtime
                }
              };
            }

            return show;
          } catch (err) {
            console.warn('⚠️ Failed to fetch episode info for', show.title, err);
            return show;
          }
        })
      );

      if (searchToken !== undefined && searchToken !== searchTokenRef.current) {
        console.log('🚫 Discarding stale episode info for token', searchToken);
        return;
      }
      setSearchResults(updatedShows);
      console.log('✅ Episode info updated!');
    } catch (err) {
      console.error('❌ Error fetching episode info:', err);
    }
  };

  // 📺 Fetch comprehensive episode list for a show
  // Returns null when the fetch failed (so callers can preserve existing data
  // instead of mistaking the failure for an empty episode list).
  const fetchEpisodeList = async (tvmazeId: number): Promise<Episode[] | null> => {
    console.log('📺 Fetching episode list for show ID:', tvmazeId);

    try {
      const response = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}/episodes`);
      if (!response.ok) {
        throw new Error(`TVmaze ${response.status} for episodes of show ${tvmazeId}`);
      }
      const episodes = await response.json();

      if (!Array.isArray(episodes)) {
        throw new Error('TVmaze returned non-array episode payload');
      }

      console.log('📦 Fetched', episodes.length, 'episodes');

      return episodes.map((ep: any) => ({
        id: ep.id,
        season: ep.season,
        episode: ep.number,
        title: ep.name,
        airDate: ep.airdate,
        airTime: ep.airtime,
        runtime: ep.runtime,
        summary: ep.summary ? ep.summary.replace(/<[^>]*>/g, '') : '',
        watched: false,
        watchedDate: undefined
      }));
    } catch (err) {
      console.error('❌ Error fetching episode list:', err);
      return null;
    }
  };

  // Treat an episode as "aired" only when its air date is strictly before the
  // current local date. TVmaze returns airdate as YYYY-MM-DD, which the Date
  // constructor parses as UTC midnight — so a naive `<= new Date()` flickers
  // around the date boundary depending on the viewer's timezone.
  const hasEpisodeAired = (ep: Pick<Episode, 'airDate'>, reference: Date = new Date()): boolean => {
    if (!ep.airDate) return false;
    const airLocalMidnight = new Date(`${ep.airDate}T00:00:00`);
    if (Number.isNaN(airLocalMidnight.getTime())) return false;
    const refMidnight = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
    return airLocalMidnight.getTime() <= refMidnight.getTime();
  };

  // 🗂️ Organize episodes into seasons
  const organizeEpisodesIntoSeasons = (episodes: Episode[]): Season[] => {
    console.log('🗂️ Organizing', episodes.length, 'episodes into seasons');
    
    const seasonMap = new Map<number, Episode[]>();
    
    episodes.forEach(episode => {
      const seasonNumber = episode.season;
      if (!seasonMap.has(seasonNumber)) {
        seasonMap.set(seasonNumber, []);
      }
      seasonMap.get(seasonNumber)!.push(episode);
    });
    
    const seasons: Season[] = Array.from(seasonMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([seasonNumber, seasonEpisodes]) => ({
        number: seasonNumber,
        episodes: seasonEpisodes.sort((a, b) => a.episode - b.episode),
        totalEpisodes: seasonEpisodes.length,
        watchedEpisodes: seasonEpisodes.filter(ep => ep.watched).length
      }));
    
    console.log('✅ Organized into', seasons.length, 'seasons');
    return seasons;
  };

  // 🔄 Update show with comprehensive episode data
  const updateShowWithEpisodes = async (show: Show): Promise<Show> => {
    console.log('🔄 Updating show with episode data:', show.title);

    const freshEpisodes = await fetchEpisodeList(show.tvmazeId);

    // If the fetch failed, leave the show untouched rather than clobbering
    // existing episode data with an empty list.
    if (freshEpisodes === null) {
      console.warn('⚠️ Skipping episode merge for', show.title, '— TVmaze fetch failed');
      return show;
    }

    // Preserve user's watch status. Fall back to (season, episode) when the
    // TVmaze episode id has drifted so watched history isn't lost on renumber.
    const episodes = freshEpisodes.map(freshEp => {
      const existingEp =
        show.episodes.find(ep => ep.id === freshEp.id) ??
        show.episodes.find(ep => ep.season === freshEp.season && ep.episode === freshEp.episode);
      return {
        ...freshEp,
        watched: existingEp?.watched || false,
        watchedDate: existingEp?.watchedDate || undefined
      };
    });

    const seasons = organizeEpisodesIntoSeasons(episodes);

    // Find next unwatched episode (counted as aired only once the air date is
    // strictly before today in the user's local timezone).
    let nextEpisode: NextEpisode | null = null;
    const nextUnwatched = episodes.find(ep => !ep.watched && hasEpisodeAired(ep));

    if (nextUnwatched) {
      nextEpisode = {
        season: nextUnwatched.season,
        episode: nextUnwatched.episode,
        title: nextUnwatched.title,
        airDate: nextUnwatched.airDate,
        airTime: nextUnwatched.airTime,
        runtime: nextUnwatched.runtime,
        hasNext: true
      };
    }

    const watchedCount = episodes.filter(ep => ep.watched).length;

    return {
      ...show,
      episodes,
      seasons,
      totalEpisodes: episodes.length,
      watchedEpisodesCount: watchedCount,
      nextEpisode,
      watched: watchedCount === episodes.length && episodes.length > 0,
      lastUpdated: new Date().toISOString()
    };
  };

  // ➕ Add item to watchlist
  const addToWatchlist = async (item: Show) => {
    console.log('➕ Adding to watchlist:', item.title);
    
    // Check if already in watchlist
    if (watchlist.find(w => w.id === item.id)) {
      console.log('⚠️ Item already in watchlist!');
      return;
    }
    
    const newItem: Show = {
      ...item,
      addedDate: new Date().toISOString(),
      watched: false,
      watchedEpisodes: [], // Legacy field, will be replaced
      seasons: [], // Initialize new comprehensive episode tracking fields
      episodes: [],
      totalEpisodes: 0,
      watchedEpisodesCount: 0,
      lastUpdated: new Date().toISOString(),
      expandedSeasons: []
    };
    
    // Add to watchlist immediately for better UX
    setWatchlist(prev => [...prev, newItem]);
    setSearchResults([]); // Clear search results
    setSearchQuery(''); // Clear search input
    console.log('✅ Successfully added to watchlist!');

    // Fetch episode data, then persist once with the complete record.
    let toPersist: Show = newItem;
    try {
      console.log('📺 Fetching episode data for', item.title);
      const updatedItem = await updateShowWithEpisodes(newItem);
      toPersist = updatedItem;
      setWatchlist(prevWatchlist =>
        prevWatchlist.map(w => w.id === item.id ? updatedItem : w)
      );
    } catch (err) {
      console.error('❌ Error loading episode data:', err);
    }

    try {
      await apiClient.saveShow(toPersist);
      console.log('✅ Show saved to database');
    } catch (err) {
      console.error('❌ Error saving show to database:', err);
      setError(`Failed to save "${item.title}" to the server. Reverting.`);
      setWatchlist(prev => prev.filter(w => w.id !== item.id));
    }
  };

  // 📺 Mark entire series as watched/unwatched
  const markSeriesWatched = async (showId: string, watched: boolean) => {
    console.log('📺 Marking entire series as', watched ? 'watched' : 'unwatched', 'for show', showId);
    
    // Find the current show
    const currentShow = watchlist.find(show => show.id === showId);
    if (!currentShow) {
      console.error('❌ Show not found in watchlist');
      return;
    }
    
    const now = new Date();
    
    // Create updated episodes - only mark aired episodes when marking as watched
    const updatedEpisodes = currentShow.episodes.map(episode => {
      // Only mark as watched if the episode has aired (or if we're unmarking)
      const shouldMarkWatched = watched ? hasEpisodeAired(episode, now) : false;

      return {
        ...episode,
        watched: shouldMarkWatched,
        watchedDate: shouldMarkWatched ? new Date().toISOString() : undefined
      };
    });

    // Recalculate seasons with updated watched counts
    const updatedSeasons = organizeEpisodesIntoSeasons(updatedEpisodes);

    // Calculate overall stats
    const watchedCount = updatedEpisodes.filter(ep => ep.watched).length;
    const totalEpisodes = updatedEpisodes.length;

    // Find next unwatched episode
    const nextUnwatched = updatedEpisodes.find(ep => !ep.watched && hasEpisodeAired(ep, now));
    const nextEpisode = nextUnwatched ? {
      season: nextUnwatched.season,
      episode: nextUnwatched.episode,
      title: nextUnwatched.title,
      airDate: nextUnwatched.airDate,
      airTime: nextUnwatched.airTime,
      runtime: nextUnwatched.runtime,
      hasNext: true
    } : null;

    // Create the updated show object
    const updatedShow: Show = {
      ...currentShow,
      episodes: updatedEpisodes,
      seasons: updatedSeasons,
      watchedEpisodesCount: watchedCount,
      watched: watchedCount === totalEpisodes && totalEpisodes > 0,
      nextEpisode,
      lastUpdated: new Date().toISOString(),
      watchedDate: watched ? new Date().toISOString() : undefined
    };

    // Update the state
    setWatchlist(prevWatchlist =>
      prevWatchlist.map(show =>
        show.id === showId ? updatedShow : show
      )
    );

    // Save to database
    try {
      console.log('🔄 Saving series watch status to database...');
      await apiClient.updateShow(updatedShow);
      console.log('✅ Show watch status updated in database');
    } catch (err) {
      console.error('❌ Error updating show in database:', err);
      setError(`Failed to update "${currentShow.title}" on the server.`);
    }
  };

  // ✅ Mark episode/movie as watched (updated to use new system)
  const markAsWatched = async (itemId: string, episodeInfo: NextEpisode | null = null) => {
    console.log('✅ Marking as watched:', itemId, episodeInfo);
    
    // Use the new series marking function
    await markSeriesWatched(itemId, true);
    
    console.log('✅ Watch status updated!');
  };

  // Note: fetchNextEpisodeForItem function removed as it's replaced by the new episode tracking system

  // 🗑️ Remove from watchlist
  const removeFromWatchlist = async (itemId: string) => {
    console.log('🗑️ Removing from watchlist:', itemId);

    // Snapshot the removed item so we can restore it if the DB call fails.
    const removed = watchlist.find(item => item.id === itemId);
    setWatchlist(prev => prev.filter(item => item.id !== itemId));

    try {
      await apiClient.removeShow(itemId);
      console.log('✅ Item removed from database successfully!');
    } catch (err) {
      console.error('❌ Error removing item from database:', err);
      if (removed) {
        setError(`Failed to remove "${removed.title}" on the server. Restored.`);
        setWatchlist(prev => prev.some(w => w.id === itemId) ? prev : [...prev, removed]);
      } else {
        setError('Failed to remove show on the server.');
      }
    }
  };

  // 🎯 Filter items based on active tab
  const getFilteredItems = () => {
    console.log('🎯 Filtering items for tab:', activeTab);
    
    switch (activeTab) {
      case 'unwatched':
        return watchlist.filter(item => !item.watched);
      case 'watched':
        return watchlist.filter(item => item.watched);
      default:
        return watchlist;
    }
  };

  // 📺 Get latest unwatched episodes across all shows
  const getLatestUnwatchedEpisodes = () => {
    console.log('📺 Getting latest unwatched episodes...');
    
    const allUnwatchedEpisodes: (Episode & { showTitle: string; showId: string })[] = [];
    
    const now = new Date();
    watchlist.forEach(show => {
      if (!show.watched && show.episodes) {
        const unwatchedEpisodes = show.episodes
          .filter(ep => !ep.watched && hasEpisodeAired(ep, now))
          .map(ep => ({
            ...ep,
            showTitle: show.title,
            showId: show.id
          }));

        allUnwatchedEpisodes.push(...unwatchedEpisodes);
      }
    });
    
    // Sort by air date based on selected sort order
    const sortedEpisodes = allUnwatchedEpisodes.sort((a, b) => {
      if (latestEpisodesSortOrder === 'newest') {
        return new Date(b.airDate).getTime() - new Date(a.airDate).getTime(); // Newest first
      } else {
        return new Date(a.airDate).getTime() - new Date(b.airDate).getTime(); // Oldest first
      }
    });
    
    return sortedEpisodes.slice(0, 10); // Limit to 10 episodes
  };

  // 📅 Get upcoming unaired episodes across all shows
  const getUpcomingUnwatchedEpisodes = () => {
    console.log('📅 Getting upcoming unaired episodes...');
    
    const allUpcomingEpisodes: (Episode & { showTitle: string; showId: string })[] = [];
    const now = new Date();

    watchlist.forEach(show => {
      if (!show.watched && show.episodes) {
        const upcomingEpisodes = show.episodes
          .filter(ep => !ep.watched && !hasEpisodeAired(ep, now))
          .map(ep => ({
            ...ep,
            showTitle: show.title,
            showId: show.id
          }));

        allUpcomingEpisodes.push(...upcomingEpisodes);
      }
    });
    
    // Sort by air date based on selected sort order
    const sortedEpisodes = allUpcomingEpisodes.sort((a, b) => {
      if (upcomingEpisodesSortOrder === 'soonest') {
        return new Date(a.airDate).getTime() - new Date(b.airDate).getTime(); // Soonest first
      } else {
        return new Date(b.airDate).getTime() - new Date(a.airDate).getTime(); // Latest first
      }
    });
    
    return sortedEpisodes.slice(0, 10); // Limit to 10 episodes
  };

  // 🔄 Toggle show expansion
  const toggleShowExpansion = (showId: string) => {
    console.log('🔄 Toggling show expansion for', showId);
    
    setExpandedShows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(showId)) {
        newSet.delete(showId);
      } else {
        newSet.add(showId);
      }
      return newSet;
    });
  };

  // 🔄 Toggle season expansion
  const toggleSeasonExpansion = (showId: string, seasonNumber: number) => {
    console.log('🔄 Toggling season expansion for', showId, 'season', seasonNumber);
    
    setWatchlist(prevWatchlist => 
      prevWatchlist.map(show => {
        if (show.id === showId) {
          const currentExpanded = show.expandedSeasons || [];
          const isExpanded = currentExpanded.includes(seasonNumber);
          
          return {
            ...show,
            expandedSeasons: isExpanded 
              ? currentExpanded.filter(s => s !== seasonNumber)
              : [...currentExpanded, seasonNumber]
          };
        }
        return show;
      })
    );
  };

  // 📺 Toggle individual episode watched status
  const toggleEpisodeWatched = async (showId: string, episodeId: number) => {
    console.log('📺 Toggling episode watched status for show', showId, 'episode', episodeId);
    
    // First, find the current show and create the updated version
    const currentShow = watchlist.find(show => show.id === showId);
    if (!currentShow) {
      console.error('❌ Show not found in watchlist');
      return;
    }
    
    // Create updated episodes
    const updatedEpisodes = currentShow.episodes.map(episode => {
      if (episode.id === episodeId) {
        return {
          ...episode,
          watched: !episode.watched,
          watchedDate: !episode.watched ? new Date().toISOString() : undefined
        };
      }
      return episode;
    });
    
    // Recalculate seasons with updated watched counts
    const updatedSeasons = organizeEpisodesIntoSeasons(updatedEpisodes);
    
    // Calculate overall stats
    const watchedCount = updatedEpisodes.filter(ep => ep.watched).length;
    const totalEpisodes = updatedEpisodes.length;
    
    // Find next unwatched episode
    const nextUnwatched = updatedEpisodes.find(ep => !ep.watched && hasEpisodeAired(ep));
    const nextEpisode = nextUnwatched ? {
      season: nextUnwatched.season,
      episode: nextUnwatched.episode,
      title: nextUnwatched.title,
      airDate: nextUnwatched.airDate,
      airTime: nextUnwatched.airTime,
      runtime: nextUnwatched.runtime,
      hasNext: true
    } : null;

    // Create the updated show object
    const updatedShow: Show = {
      ...currentShow,
      episodes: updatedEpisodes,
      seasons: updatedSeasons,
      watchedEpisodesCount: watchedCount,
      watched: watchedCount === totalEpisodes && totalEpisodes > 0,
      nextEpisode,
      lastUpdated: new Date().toISOString()
    };

    // Update the state
    setWatchlist(prevWatchlist =>
      prevWatchlist.map(show =>
        show.id === showId ? updatedShow : show
      )
    );

    // Save to database
    console.log('🔄 About to save to database, updatedShow exists:', !!updatedShow);
    try {
      console.log('🔄 Calling API to update show...');
      await apiClient.updateShow(updatedShow);
      console.log('✅ Episode watch status updated in database');
    } catch (err) {
      console.error('❌ Error updating episode in database:', err);
      setError(`Failed to update episode for "${currentShow.title}" on the server.`);
    }
  };

  // 🗂️ Mark entire season as watched/unwatched
  const markSeasonWatched = async (showId: string, seasonNumber: number, watched: boolean) => {
    console.log('🗂️ Marking season', seasonNumber, 'as', watched ? 'watched' : 'unwatched', 'for show', showId);
    
    // Find the current show
    const currentShow = watchlist.find(show => show.id === showId);
    if (!currentShow) {
      console.error('❌ Show not found in watchlist');
      return;
    }
    
    const now = new Date();
    
    // Create updated episodes - only mark aired episodes in the season
    const updatedEpisodes = currentShow.episodes.map(episode => {
      if (episode.season === seasonNumber) {
        // Only mark as watched if the episode has aired (or if we're unmarking)
        const shouldMarkWatched = watched ? hasEpisodeAired(episode, now) : false;

        return {
          ...episode,
          watched: shouldMarkWatched,
          watchedDate: shouldMarkWatched ? new Date().toISOString() : undefined
        };
      }
      return episode;
    });

    // Recalculate seasons with updated watched counts
    const updatedSeasons = organizeEpisodesIntoSeasons(updatedEpisodes);

    // Calculate overall stats
    const watchedCount = updatedEpisodes.filter(ep => ep.watched).length;
    const totalEpisodes = updatedEpisodes.length;

    // Find next unwatched episode
    const nextUnwatched = updatedEpisodes.find(ep => !ep.watched && hasEpisodeAired(ep, now));
    const nextEpisode = nextUnwatched ? {
      season: nextUnwatched.season,
      episode: nextUnwatched.episode,
      title: nextUnwatched.title,
      airDate: nextUnwatched.airDate,
      airTime: nextUnwatched.airTime,
      runtime: nextUnwatched.runtime,
      hasNext: true
    } : null;

    // Create the updated show object
    const updatedShow: Show = {
      ...currentShow,
      episodes: updatedEpisodes,
      seasons: updatedSeasons,
      watchedEpisodesCount: watchedCount,
      watched: watchedCount === totalEpisodes && totalEpisodes > 0,
      nextEpisode,
      lastUpdated: new Date().toISOString()
    };

    // Update the state
    setWatchlist(prevWatchlist =>
      prevWatchlist.map(show =>
        show.id === showId ? updatedShow : show
      )
    );

    // Save to database
    try {
      console.log('🔄 Saving season watch status to database...');
      await apiClient.updateShow(updatedShow);
      console.log('✅ Season watch status updated in database');
    } catch (err) {
      console.error('❌ Error updating season in database:', err);
      setError(`Failed to update season for "${currentShow.title}" on the server.`);
    }
  };

  // 🎨 Main render function — modern shell, same data flow
  const watchlistIds = new Set(watchlist.map(w => w.id));
  const posterByShowId = new Map(watchlist.map(s => [s.id, s.poster]));
  const filteredItems = getFilteredItems();
  const activeShow = activeShowId ? watchlist.find(s => s.id === activeShowId) ?? null : null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen pb-12">
        <AppHeader
          dbBackupEnabled={dbBackupEnabled}
          searchOpen={searchOpen}
          onDownload={handleDatabaseDownload}
          onToggleSearch={() => setSearchOpen(o => !o)}
        />

        <SearchPanel
          open={searchOpen}
          query={searchQuery}
          setQuery={setSearchQuery}
          loading={loading}
          error={error}
          results={searchResults}
          watchlistIds={watchlistIds}
          onSearch={handleSearch}
          onAdd={addToWatchlist}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
          {watchlist.length > 0 && <StatsBar watchlist={watchlist} />}

          {watchlist.length > 0 && (
            <EpisodeRail
              title="Continue watching"
              episodes={getLatestUnwatchedEpisodes()}
              posterByShowId={posterByShowId}
              sortOrder={latestEpisodesSortOrder}
              sortLabels={['newest', 'oldest']}
              setSortOrder={(v: 'newest' | 'oldest') => setLatestEpisodesSortOrder(v)}
              onToggle={toggleEpisodeWatched}
              onSelectShow={setActiveShowId}
            />
          )}

          {watchlist.length > 0 && (
            <EpisodeRail
              title="Upcoming episodes"
              episodes={getUpcomingUnwatchedEpisodes()}
              posterByShowId={posterByShowId}
              sortOrder={upcomingEpisodesSortOrder}
              sortLabels={['soonest', 'latest']}
              setSortOrder={(v: 'soonest' | 'latest') => setUpcomingEpisodesSortOrder(v)}
              onSelectShow={setActiveShowId}
              readonly
            />
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold">Your watchlist</h2>
              <WatchlistTabs value={activeTab} onChange={setActiveTab} watchlist={watchlist} />
            </div>

            {filteredItems.length > 0 ? (
              <WatchlistGrid items={filteredItems} onSelect={setActiveShowId} />
            ) : (
              <EmptyState
                title={watchlist.length === 0 ? "Your watchlist is empty" : "Nothing in this tab"}
                description={
                  watchlist.length === 0
                    ? "Tap Search shows at the top to find something to track."
                    : "Switch tabs above or add new shows via Search."
                }
              />
            )}
          </section>
        </main>

        <ShowDrawer
          show={activeShow}
          onClose={() => setActiveShowId(null)}
          onMarkSeries={markSeriesWatched}
          onMarkSeason={markSeasonWatched}
          onToggleEpisode={toggleEpisodeWatched}
          onRemove={removeFromWatchlist}
        />

        <AppFooter />
      </div>
    </TooltipProvider>
  );
};

export default App;
