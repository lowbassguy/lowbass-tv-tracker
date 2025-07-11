/*
 * lowbass' TV Tracker
 * Author: Joshua 'lowbass' Sommerfeldt
 */

import React, { useState, useEffect } from 'react';
import { Search, Tv, Calendar, Check, X, Play, Clock, Star, Info } from 'lucide-react';

const App = () => {
  // 🎬 State management for all our tracking needs
  const [searchQuery, setSearchQuery] = useState(''); // Current search input
  const [searchResults, setSearchResults] = useState([]); // Results from API search
  const [watchlist, setWatchlist] = useState([]); // User's saved shows/movies
  const [activeTab, setActiveTab] = useState('unwatched'); // Current view tab
  const [loading, setLoading] = useState(false); // Loading state for API calls
  const [error, setError] = useState(null); // Error handling state

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
      const transformedResults = data.map(item => {
        const show = item.show;
        console.log('🔄 Transforming show:', show.name);
        
        // 📺 Extract network/streaming info
        const platform = show.network?.name || 
                        show.webChannel?.name || 
                        'Unknown Platform';
        
        // 📅 Get next episode info if available
        let nextEpisode = null;
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
          tvmazeId: show.id
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
      console.error('Error details:', err.message);
      
      // More specific error messages
      if (err.message.includes('fetch')) {
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
  const fetchNextEpisodeInfo = async (shows) => {
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

  // ➕ Add item to watchlist
  const addToWatchlist = (item) => {
    console.log('➕ Adding to watchlist:', item.title);
    
    // Check if already in watchlist
    if (watchlist.find(w => w.id === item.id)) {
      console.log('⚠️ Item already in watchlist!');
      return;
    }
    
    const newItem = {
      ...item,
      addedDate: new Date().toISOString(),
      watched: false,
      watchedEpisodes: []
    };
    
    setWatchlist([...watchlist, newItem]);
    setSearchResults([]); // Clear search results
    setSearchQuery(''); // Clear search input
    console.log('✅ Successfully added to watchlist!');
  };

  // ✅ Mark episode/movie as watched
  const markAsWatched = (itemId, episodeInfo = null) => {
    console.log('✅ Marking as watched:', itemId, episodeInfo);
    
    setWatchlist(watchlist.map(item => {
      if (item.id === itemId) {
        console.log('📺 Marking show/episode as watched');
        const updatedItem = {
          ...item,
          watched: true,
          watchedDate: new Date().toISOString(),
          lastWatchedEpisode: episodeInfo || item.nextEpisode
        };
        
        // 🔄 Fetch next episode after marking current as watched
        if (item.tvmazeId && episodeInfo) {
          console.log('🔍 Fetching next episode after marking watched...');
          fetchNextEpisodeForItem(item.tvmazeId, itemId);
        }
        
        return updatedItem;
      }
      return item;
    }));
    
    console.log('✅ Watch status updated!');
  };

  // 📅 Fetch next episode for a specific watchlist item
  const fetchNextEpisodeForItem = async (tvmazeId, itemId) => {
    console.log('📅 Fetching updated episode info for show ID:', tvmazeId);
    
    try {
      const response = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}?embed=nextepisode`);
      const data = await response.json();
      
      if (data._embedded?.nextepisode) {
        const nextEp = data._embedded.nextepisode;
        console.log('📺 Found new next episode:', nextEp.name);
        
        setWatchlist(prevWatchlist => 
          prevWatchlist.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                watched: false, // Reset watched status for new episode
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
            return item;
          })
        );
      } else {
        console.log('🏁 No more episodes available for this show');
        // Keep it marked as watched if no more episodes
      }
    } catch (err) {
      console.error('❌ Error fetching next episode:', err);
    }
  };

  // 🗑️ Remove from watchlist
  const removeFromWatchlist = (itemId) => {
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
      default:
        return watchlist;
    }
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
                      e.target.src = `https://via.placeholder.com/150x225/8a0707/ffffff?text=${encodeURIComponent(result.title)}`;
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
        </div>

        {/* 📺 Watchlist Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getFilteredItems().map(item => (
            <div key={item.id} className="bg-gray-900 border border-red-900 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-red-900 to-red-700 p-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Tv className="w-4 h-4" />
                  {item.title}
                </h3>
              </div>
              
              <div className="p-3">
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
                
                {/* 📺 Last Watched Episode */}
                {item.lastWatchedEpisode && item.watched && (
                  <div className="bg-gray-800 rounded p-2 mb-2">
                    <p className="text-sm font-semibold">Last Watched:</p>
                    <p className="text-xs text-gray-400">
                      S{item.lastWatchedEpisode.season}E{item.lastWatchedEpisode.episode}: {item.lastWatchedEpisode.title}
                    </p>
                  </div>
                )}

                {/* ✅ Watched Status */}
                {item.watched && !item.nextEpisode && (
                  <div className="bg-green-900 rounded p-2 mb-2">
                    <p className="text-sm flex items-center gap-1">
                      <Check className="w-3 h-3" /> All caught up! Watched on {new Date(item.watchedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* 🔗 Links */}
                <div className="flex gap-2 text-xs mb-2">
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
                  {!item.watched && (
                    <button
                      onClick={() => markAsWatched(item.id, item.type === 'tv' ? item.nextEpisode : null)}
                      className="flex-1 bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-sm flex items-center justify-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Mark Watched
                    </button>
                  )}
                  <button
                    onClick={() => removeFromWatchlist(item.id)}
                    className="flex-1 bg-red-800 hover:bg-red-700 px-2 py-1 rounded text-sm flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 📭 Empty State */}
        {getFilteredItems().length === 0 && (
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