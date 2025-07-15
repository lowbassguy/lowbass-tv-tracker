/*
 * lowbass' TV Tracker
 * Author: Joshua 'lowbass' Sommerfeldt
 */

import React, { useState, useEffect } from 'react';
import { Search, Tv, Calendar, Check, X, Play, Clock, Star, Info, ChevronDown, ChevronUp, CheckCircle, Circle } from 'lucide-react';

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
  const [expandedShows, setExpandedShows] = useState<Set<string>>(new Set()); // Track which shows are expanded
  const [latestEpisodesSortOrder, setLatestEpisodesSortOrder] = useState<'newest' | 'oldest'>('newest'); // Sort order for latest episodes

  // 💾 Load watchlist from localStorage on component mount
  useEffect(() => {
    console.log('📂 Loading watchlist from localStorage...');
    try {
      const savedWatchlist = localStorage.getItem('lowbass-watchlist');
      if (savedWatchlist) {
        setWatchlist(JSON.parse(savedWatchlist));
        console.log('✅ Watchlist loaded successfully!', JSON.parse(savedWatchlist));
      } else {
        console.log('📭 No saved watchlist found, starting fresh!');
      }
    } catch (err) {
      console.error('❌ Error loading watchlist:', err);
      setError('Failed to load saved data');
    }
    
    // 🧹 Cleanup function
    return () => {
      console.log('🧹 Component cleanup initiated');
    };
  }, []);

  // 📅 Daily update system - refresh episode data
  useEffect(() => {
    const updateShowsDaily = async () => {
      console.log('📅 Running daily update check...');
      
      if (watchlist.length === 0) return;
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Find shows that need updating (not updated in last 24 hours)
      const showsToUpdate = watchlist.filter(show => {
        if (!show.lastUpdated) return true;
        const lastUpdated = new Date(show.lastUpdated);
        return lastUpdated < oneDayAgo;
      });
      
      console.log('🔄 Found', showsToUpdate.length, 'shows needing updates');
      
      if (showsToUpdate.length === 0) return;
      
      // Update shows in batches to avoid overwhelming the API
      const batchSize = 3;
      for (let i = 0; i < showsToUpdate.length; i += batchSize) {
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
        
        // Update the watchlist with the updated shows
        setWatchlist(prevWatchlist => 
          prevWatchlist.map(show => {
            const updatedShow = updates.find(u => u.id === show.id);
            return updatedShow || show;
          })
        );
        
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
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Set to midnight
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      console.log('⏰ Next update scheduled in', Math.floor(msUntilMidnight / 1000 / 60 / 60), 'hours');
      
      return setTimeout(() => {
        updateShowsDaily();
        scheduleNextUpdate(); // Schedule the next update
      }, msUntilMidnight);
    };
    
    const timeoutId = scheduleNextUpdate();
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [watchlist.length]); // Only depend on watchlist length to avoid infinite loops

  // 💾 Save watchlist to localStorage whenever it changes
  useEffect(() => {
    console.log('💾 Saving watchlist to localStorage...');
    try {
      localStorage.setItem('lowbass-watchlist', JSON.stringify(watchlist));
      console.log('✅ Watchlist saved successfully!');
    } catch (err) {
      console.error('❌ Error saving watchlist:', err);
    }
  }, [watchlist]);

  // 🔍 Search for shows using TVmaze API
  const handleSearch = async () => {
    console.log('🔍 Starting search for:', searchQuery);
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
      
      const data = await response.json();
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
      
      setSearchResults(transformedResults);
      console.log('✅ Search completed! Found', transformedResults.length, 'results');
      
      // 🎯 If we have results, fetch next episode info for each show
      if (transformedResults.length > 0) {
        console.log('🔍 Fetching next episode info for results...');
        fetchNextEpisodeInfo(transformedResults);
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
  const fetchNextEpisodeInfo = async (shows: Show[]) => {
    console.log('📅 Fetching next episode info for', shows.length, 'shows');
    
    try {
      const updatedShows = await Promise.all(
        shows.map(async (show) => {
          try {
            // 📡 Get show details with episode information
            const response = await fetch(`https://api.tvmaze.com/shows/${show.tvmazeId}?embed=nextepisode`);
            const data = await response.json();
            
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
      
      setSearchResults(updatedShows);
      console.log('✅ Episode info updated!');
    } catch (err) {
      console.error('❌ Error fetching episode info:', err);
    }
  };

  // 📺 Fetch comprehensive episode list for a show
  const fetchEpisodeList = async (tvmazeId: number): Promise<Episode[]> => {
    console.log('📺 Fetching episode list for show ID:', tvmazeId);
    
    try {
      const response = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}/episodes`);
      const episodes = await response.json();
      
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
      return [];
    }
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
    
    const episodes = await fetchEpisodeList(show.tvmazeId);
    const seasons = organizeEpisodesIntoSeasons(episodes);
    
    // Find next unwatched episode
    let nextEpisode: NextEpisode | null = null;
    const nextUnwatched = episodes.find(ep => !ep.watched && new Date(ep.airDate) <= new Date());
    
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
    setWatchlist([...watchlist, newItem]);
    setSearchResults([]); // Clear search results
    setSearchQuery(''); // Clear search input
    console.log('✅ Successfully added to watchlist!');
    
    // Fetch episode data in background
    try {
      console.log('📺 Fetching episode data for', item.title);
      const updatedItem = await updateShowWithEpisodes(newItem);
      
      // Update the watchlist with episode data
      setWatchlist(prevWatchlist => 
        prevWatchlist.map(w => w.id === item.id ? updatedItem : w)
      );
      console.log('✅ Episode data loaded for', item.title);
    } catch (err) {
      console.error('❌ Error loading episode data:', err);
    }
  };

  // 📺 Mark entire series as watched/unwatched
  const markSeriesWatched = (showId: string, watched: boolean) => {
    console.log('📺 Marking entire series as', watched ? 'watched' : 'unwatched', 'for show', showId);
    
    setWatchlist(prevWatchlist => 
      prevWatchlist.map(show => {
        if (show.id === showId) {
          const updatedEpisodes = show.episodes.map(episode => ({
            ...episode,
            watched,
            watchedDate: watched ? new Date().toISOString() : undefined
          }));
          
          // Recalculate seasons with updated watched counts
          const updatedSeasons = organizeEpisodesIntoSeasons(updatedEpisodes);
          
          // Calculate overall stats
          const watchedCount = updatedEpisodes.filter(ep => ep.watched).length;
          const totalEpisodes = updatedEpisodes.length;
          
          // Find next unwatched episode
          const nextUnwatched = updatedEpisodes.find(ep => !ep.watched && new Date(ep.airDate) <= new Date());
          const nextEpisode = nextUnwatched ? {
            season: nextUnwatched.season,
            episode: nextUnwatched.episode,
            title: nextUnwatched.title,
            airDate: nextUnwatched.airDate,
            airTime: nextUnwatched.airTime,
            runtime: nextUnwatched.runtime,
            hasNext: true
          } : null;
          
          return {
            ...show,
            episodes: updatedEpisodes,
            seasons: updatedSeasons,
            watchedEpisodesCount: watchedCount,
            watched: watchedCount === totalEpisodes && totalEpisodes > 0,
            nextEpisode,
            lastUpdated: new Date().toISOString(),
            watchedDate: watched ? new Date().toISOString() : undefined
          };
        }
        return show;
      })
    );
  };

  // ✅ Mark episode/movie as watched (updated to use new system)
  const markAsWatched = (itemId: string, episodeInfo: NextEpisode | null = null) => {
    console.log('✅ Marking as watched:', itemId, episodeInfo);
    
    // Use the new series marking function
    markSeriesWatched(itemId, true);
    
    console.log('✅ Watch status updated!');
  };

  // Note: fetchNextEpisodeForItem function removed as it's replaced by the new episode tracking system

  // 🗑️ Remove from watchlist
  const removeFromWatchlist = (itemId: string) => {
    console.log('🗑️ Removing from watchlist:', itemId);
    setWatchlist(watchlist.filter(item => item.id !== itemId));
    console.log('✅ Item removed successfully!');
  };

  // 🎯 Filter items based on active tab
  const getFilteredItems = () => {
    console.log('🎯 Filtering items for tab:', activeTab);
    
    switch (activeTab) {
      case 'unwatched':
        return watchlist.filter(item => !item.watched);
      case 'watched':
        return watchlist.filter(item => item.watched);
      case 'upcoming':
        return []; // Upcoming tab shows episodes, not shows
      default:
        return watchlist;
    }
  };

  // 📺 Get latest unwatched episodes across all shows
  const getLatestUnwatchedEpisodes = () => {
    console.log('📺 Getting latest unwatched episodes...');
    
    const allUnwatchedEpisodes: (Episode & { showTitle: string; showId: string })[] = [];
    
    watchlist.forEach(show => {
      if (!show.watched && show.episodes) {
        const unwatchedEpisodes = show.episodes
          .filter(ep => !ep.watched && new Date(ep.airDate) <= new Date())
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

  // 📅 Get upcoming episodes from all tracked shows
  const getUpcomingEpisodes = () => {
    console.log('📅 Getting upcoming episodes from all tracked shows...');
    
    const upcomingEpisodes: Array<{
      id: string;
      showId: string;
      showTitle: string;
      showPoster: string;
      showPlatform: string;
      season: number;
      episode: number;
      title: string;
      airDate: string;
      airTime?: string;
      runtime?: number;
      daysUntilAir: number;
      isToday: boolean;
      isPast: boolean;
    }> = [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    watchlist.forEach(show => {
      if (show.episodes && show.episodes.length > 0) {
        // Find episodes with future air dates or episodes that air today
        const futureEpisodes = show.episodes.filter(episode => {
          if (!episode.airDate) return false;
          
          const airDate = new Date(episode.airDate);
          const airDateOnly = new Date(airDate.getFullYear(), airDate.getMonth(), airDate.getDate());
          
          // Include episodes that air today or in the future
          return airDateOnly >= today;
        });

        // Sort by air date and take the next few episodes
        futureEpisodes
          .sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime())
          .slice(0, 5) // Limit to next 5 episodes per show
          .forEach(episode => {
            const airDate = new Date(episode.airDate);
            const airDateOnly = new Date(airDate.getFullYear(), airDate.getMonth(), airDate.getDate());
            const timeDiff = airDateOnly.getTime() - today.getTime();
            const daysUntilAir = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            upcomingEpisodes.push({
              id: `${show.id}-${episode.id}`,
              showId: show.id,
              showTitle: show.title,
              showPoster: show.poster,
              showPlatform: show.platform,
              season: episode.season,
              episode: episode.episode,
              title: episode.title,
              airDate: episode.airDate,
              airTime: episode.airTime,
              runtime: episode.runtime,
              daysUntilAir,
              isToday: daysUntilAir === 0,
              isPast: daysUntilAir < 0
            });
          });
      }
    });

    // Sort by air date (closest first)
    const sortedEpisodes = upcomingEpisodes.sort((a, b) => {
      const dateA = new Date(a.airDate);
      const dateB = new Date(b.airDate);
      return dateA.getTime() - dateB.getTime();
    });

    console.log('📅 Found', sortedEpisodes.length, 'upcoming episodes');
    return sortedEpisodes;
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
  const toggleEpisodeWatched = (showId: string, episodeId: number) => {
    console.log('📺 Toggling episode watched status for show', showId, 'episode', episodeId);
    
    setWatchlist(prevWatchlist => 
      prevWatchlist.map(show => {
        if (show.id === showId) {
          const updatedEpisodes = show.episodes.map(episode => {
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
          const nextUnwatched = updatedEpisodes.find(ep => !ep.watched && new Date(ep.airDate) <= new Date());
          const nextEpisode = nextUnwatched ? {
            season: nextUnwatched.season,
            episode: nextUnwatched.episode,
            title: nextUnwatched.title,
            airDate: nextUnwatched.airDate,
            airTime: nextUnwatched.airTime,
            runtime: nextUnwatched.runtime,
            hasNext: true
          } : null;
          
          return {
            ...show,
            episodes: updatedEpisodes,
            seasons: updatedSeasons,
            watchedEpisodesCount: watchedCount,
            watched: watchedCount === totalEpisodes && totalEpisodes > 0,
            nextEpisode,
            lastUpdated: new Date().toISOString()
          };
        }
        return show;
      })
    );
  };

  // 🗂️ Mark entire season as watched/unwatched
  const markSeasonWatched = (showId: string, seasonNumber: number, watched: boolean) => {
    console.log('🗂️ Marking season', seasonNumber, 'as', watched ? 'watched' : 'unwatched', 'for show', showId);
    
    setWatchlist(prevWatchlist => 
      prevWatchlist.map(show => {
        if (show.id === showId) {
          const updatedEpisodes = show.episodes.map(episode => {
            if (episode.season === seasonNumber) {
              return {
                ...episode,
                watched,
                watchedDate: watched ? new Date().toISOString() : undefined
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
          const nextUnwatched = updatedEpisodes.find(ep => !ep.watched && new Date(ep.airDate) <= new Date());
          const nextEpisode = nextUnwatched ? {
            season: nextUnwatched.season,
            episode: nextUnwatched.episode,
            title: nextUnwatched.title,
            airDate: nextUnwatched.airDate,
            airTime: nextUnwatched.airTime,
            runtime: nextUnwatched.runtime,
            hasNext: true
          } : null;
          
          return {
            ...show,
            episodes: updatedEpisodes,
            seasons: updatedSeasons,
            watchedEpisodesCount: watchedCount,
            watched: watchedCount === totalEpisodes && totalEpisodes > 0,
            nextEpisode,
            lastUpdated: new Date().toISOString()
          };
        }
        return show;
      })
    );
  };

  // 🎨 Main render function
  return (
    <div className="min-h-screen bg-black text-white">
      {/* 🎬 Header */}
      <header className="bg-gradient-to-r from-red-900 to-red-700 p-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Tv className="w-8 h-8" />
            lowbass' TV Tracker
          </h1>
          <p className="text-sm mt-1 opacity-90">Track all your favorite TV shows! 📺</p>
        </div>
      </header>

      {/* 🔍 Search Section */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search for TV Shows
          </h2>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                console.log('⌨️ Search input changed:', e.target.value);
                setSearchQuery(e.target.value);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  console.log('⏎ Enter key pressed, triggering search');
                  handleSearch();
                }
              }}
              placeholder="Enter TV show title..."
              className="flex-1 bg-black border border-red-800 rounded px-3 py-2 focus:outline-none focus:border-red-600"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="bg-red-700 hover:bg-red-600 disabled:bg-gray-700 px-4 py-2 rounded font-semibold transition-colors"
            >
              {loading ? '🔄 Searching...' : '🔍 Search'}
            </button>
          </div>

          {/* 🔍 Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map(result => (
                <div key={result.id} className="bg-black border border-red-900 rounded-lg p-3 flex gap-3">
                  <img 
                    src={result.poster} 
                    alt={result.title}
                    className="w-20 h-30 object-cover rounded"
                    onError={(e) => {
                      console.log('🖼️ Image failed to load for', result.title);
                      (e.target as HTMLImageElement).src = `https://via.placeholder.com/150x225/8a0707/ffffff?text=${encodeURIComponent(result.title)}`;
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Tv className="w-4 h-4" />
                      {result.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {result.year} • {result.platform} • {result.status}
                    </p>
                    <p className="text-sm text-gray-500">
                      {result.genres.slice(0, 3).join(', ')}
                    </p>
                    <p className="text-sm text-yellow-500 flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3" /> {result.rating}/10
                    </p>
                    {result.nextEpisode && result.nextEpisode.season && (
                      <p className="text-xs text-green-400 mt-1">
                        📺 Next: S{result.nextEpisode.season}E{result.nextEpisode.episode} - {result.nextEpisode.airDate}
                      </p>
                    )}
                    <button
                      onClick={() => addToWatchlist(result)}
                      className="mt-2 bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-sm"
                    >
                      ➕ Add to Watchlist
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ❌ Error Display */}
          {error && (
            <div className="mt-3 text-red-500 text-sm">
              ❌ {error}
            </div>
          )}
        </div>

        {/* 📺 Latest Unwatched Episodes */}
        {getLatestUnwatchedEpisodes().length > 0 && (
          <div className="bg-gray-900 border border-red-900 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Latest Unwatched Episodes
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Sort by:</span>
                <button
                  onClick={() => setLatestEpisodesSortOrder(latestEpisodesSortOrder === 'newest' ? 'oldest' : 'newest')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    latestEpisodesSortOrder === 'newest' 
                      ? 'bg-red-700 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setLatestEpisodesSortOrder(latestEpisodesSortOrder === 'oldest' ? 'newest' : 'oldest')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    latestEpisodesSortOrder === 'oldest' 
                      ? 'bg-red-700 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Oldest
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getLatestUnwatchedEpisodes().map((episode, index) => (
                <div key={`${episode.showId}-${episode.id}`} className="bg-black border border-gray-700 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleEpisodeWatched(episode.showId, episode.id)}
                        className="flex-shrink-0"
                      >
                        <Circle className="w-4 h-4 text-gray-400" />
                      </button>
                      <span className="text-sm font-medium text-gray-300">
                        {episode.showTitle}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(episode.airDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="ml-6">
                    <p className="text-sm text-white">
                      S{episode.season}E{episode.episode.toString().padStart(2, '0')}: {episode.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📑 Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              console.log('📑 Switching to unwatched tab');
              setActiveTab('unwatched');
            }}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              activeTab === 'unwatched' 
                ? 'bg-red-700 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📺 Unwatched ({watchlist.filter(i => !i.watched).length})
          </button>
          <button
            onClick={() => {
              console.log('📑 Switching to watched tab');
              setActiveTab('watched');
            }}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              activeTab === 'watched' 
                ? 'bg-red-700 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ✅ Watched ({watchlist.filter(i => i.watched).length})
          </button>
          <button
            onClick={() => {
              console.log('📑 Switching to all tab');
              setActiveTab('all');
            }}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              activeTab === 'all' 
                ? 'bg-red-700 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📚 All ({watchlist.length})
          </button>
          <button
            onClick={() => {
              console.log('📑 Switching to upcoming tab');
              setActiveTab('upcoming');
            }}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              activeTab === 'upcoming' 
                ? 'bg-red-700 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📅 Upcoming ({getUpcomingEpisodes().length})
          </button>
        </div>

        {/* 📅 Upcoming Episodes Display */}
        {activeTab === 'upcoming' ? (
          <div className="space-y-3">
            {getUpcomingEpisodes().length > 0 ? (
              getUpcomingEpisodes().map((episode) => (
                <div key={episode.id} className="bg-gray-900 border border-red-900 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {/* Show Poster */}
                    <div className="flex-shrink-0">
                      <img 
                        src={episode.showPoster} 
                        alt={episode.showTitle}
                        className="w-16 h-24 object-cover rounded"
                      />
                    </div>
                    
                    {/* Episode Details */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{episode.showTitle}</h3>
                        <span className="text-xs text-gray-400">{episode.showPlatform}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-700 text-white px-2 py-1 rounded text-xs font-medium">
                          S{episode.season}E{episode.episode.toString().padStart(2, '0')}
                        </span>
                        <span className="text-sm text-gray-300">{episode.title}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(episode.airDate).toLocaleDateString()}</span>
                          {episode.airTime && <span>at {episode.airTime}</span>}
                        </div>
                        
                        {episode.runtime && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{episode.runtime} min</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Days until air indicator */}
                      <div className="mt-2">
                        {episode.isToday ? (
                          <span className="bg-green-700 text-white px-2 py-1 rounded text-xs font-medium">
                            🎬 Airs Today!
                          </span>
                        ) : episode.daysUntilAir === 1 ? (
                          <span className="bg-yellow-700 text-white px-2 py-1 rounded text-xs font-medium">
                            📅 Tomorrow
                          </span>
                        ) : episode.daysUntilAir <= 7 ? (
                          <span className="bg-orange-700 text-white px-2 py-1 rounded text-xs font-medium">
                            📅 In {episode.daysUntilAir} days
                          </span>
                        ) : (
                          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-medium">
                            📅 In {episode.daysUntilAir} days
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming episodes found!</p>
                <p className="text-sm mt-1">Add some shows to your watchlist to see their upcoming episodes.</p>
              </div>
            )}
          </div>
        ) : (
          /* 📺 Watchlist Display with Episode Tracking */
          <div className="space-y-2">
          {getFilteredItems().map(item => (
            <div key={item.id} className="bg-gray-900 border border-red-900 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleShowExpansion(item.id)}
                className="w-full bg-gradient-to-r from-red-900 to-red-700 p-3 text-left hover:from-red-800 hover:to-red-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {expandedShows.has(item.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <Tv className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold">{item.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {item.totalEpisodes > 0 && (
                      <span className="bg-black bg-opacity-50 px-2 py-1 rounded">
                        {item.watchedEpisodesCount}/{item.totalEpisodes} episodes
                      </span>
                    )}
                    {item.watched && (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                </div>
              </button>
              
              {/* Show detailed information only when expanded */}
              {expandedShows.has(item.id) && (
                <div className="p-3 border-t border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">
                    {item.platform} • {item.status} • {item.runtime ? `${item.runtime} min` : 'N/A'}
                  </p>
                  
                  {/* 🎭 Genres */}
                  {item.genres && item.genres.length > 0 && (
                    <p className="text-xs text-gray-500 mb-2">
                      {item.genres.join(' • ')}
                    </p>
                  )}
                  
                  {/* 📅 Next Episode / Release Date */}
                  {item.nextEpisode && item.nextEpisode.season && !item.watched && (
                    <div className="bg-black rounded p-2 mb-2">
                      <p className="text-sm font-semibold flex items-center gap-1">
                        <Play className="w-3 h-3" /> Next Episode:
                      </p>
                      <p className="text-xs text-gray-400">
                        S{item.nextEpisode.season}E{item.nextEpisode.episode}: {item.nextEpisode.title}
                      </p>
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" /> {item.nextEpisode.airDate} {item.nextEpisode.airTime && `at ${item.nextEpisode.airTime}`}
                      </p>
                    </div>
                  )}

                  {/* 📺 Seasons and Episodes */}
                  {item.seasons && item.seasons.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-semibold mb-2">Seasons & Episodes</h4>
                      <div className="space-y-2">
                        {item.seasons.map(season => (
                          <div key={season.number} className="border border-gray-700 rounded">
                            <div className="flex items-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSeasonExpansion(item.id, season.number);
                                }}
                                className="flex-1 flex items-center justify-between p-2 hover:bg-gray-800 text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Season {season.number}</span>
                                  <span className="text-xs text-gray-400">
                                    {season.watchedEpisodes}/{season.totalEpisodes} watched
                                  </span>
                                </div>
                                {item.expandedSeasons?.includes(season.number) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex gap-1 p-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markSeasonWatched(item.id, season.number, true);
                                  }}
                                  className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs"
                                  title="Mark season as watched"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markSeasonWatched(item.id, season.number, false);
                                  }}
                                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                                  title="Mark season as unwatched"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            
                            {item.expandedSeasons?.includes(season.number) && (
                              <div className="p-2 bg-gray-800 border-t border-gray-700">
                                <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto">
                                  {season.episodes.map(episode => (
                                    <div key={episode.id} className="flex items-center justify-between p-2 hover:bg-gray-700 rounded text-sm">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleEpisodeWatched(item.id, episode.id);
                                          }}
                                          className="flex-shrink-0"
                                        >
                                          {episode.watched ? (
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                          ) : (
                                            <Circle className="w-4 h-4 text-gray-400" />
                                          )}
                                        </button>
                                        <span className="font-medium">
                                          S{episode.season}E{episode.episode.toString().padStart(2, '0')}
                                        </span>
                                        <span className="text-gray-300">{episode.title}</span>
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {episode.airDate}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 🔗 Links */}
                  <div className="flex gap-2 text-xs mb-2 mt-3">
                    {item.tvmazeUrl && (
                      <a 
                        href={item.tvmazeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 underline"
                      >
                        TVmaze ↗
                      </a>
                    )}
                    {item.officialSite && (
                      <a 
                        href={item.officialSite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 underline"
                      >
                        Official Site ↗
                      </a>
                    )}
                  </div>

                  {/* 🎮 Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    {!item.watched ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsWatched(item.id, item.type === 'tv' ? item.nextEpisode : null);
                        }}
                        className="flex-1 bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-sm flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Mark Series Watched
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markSeriesWatched(item.id, false);
                        }}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-sm flex items-center justify-center gap-1"
                      >
                        <X className="w-3 h-3" /> Unwatch Series
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(item.id);
                      }}
                      className="flex-1 bg-red-800 hover:bg-red-700 px-2 py-1 rounded text-sm flex items-center justify-center gap-1"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        )}

        {/* 📭 Empty State */}
        {activeTab !== 'upcoming' && getFilteredItems().length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No shows in this category yet!</p>
            <p className="text-sm mt-1">Search for TV shows to add them to your watchlist.</p>
          </div>
        )}
      </div>

      {/* 📝 Footer */}
      <footer className="mt-12 bg-gray-900 border-t border-red-900 p-4 text-center text-sm text-gray-500">
        <p>🎬 lowbass' TV Tracker • Created by Joshua 'lowbass' Sommerfeldt</p>
        <p className="mt-1">Track your shows across Netflix, HBO, theaters & more! 🍿</p>
      </footer>
    </div>
  );
};

// 🚀 Export the app component
export default App; 