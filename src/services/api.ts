// Simple API client for TV Tracker
const API_BASE_URL = 'http://localhost:3002/api';

interface Show {
  id: string;
  title: string;
  type: string;
  year: string | number;
  platform: string;
  genres: string[];
  status: string;
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
  watchedDate?: string;
  seasons: any[];
  episodes: any[];
  totalEpisodes: number;
  watchedEpisodesCount: number;
  lastUpdated?: string;
  expandedSeasons?: number[];
  nextEpisode: any;
}

class ApiClient {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies and authentication
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // Load all shows from database
  async loadWatchlist(): Promise<Show[]> {
    console.log('📥 Loading watchlist from API...');
    try {
      const watchlist = await this.request('/watchlist');
      console.log('✅ Loaded', watchlist.length, 'shows from API');
      return watchlist;
    } catch (error) {
      console.error('❌ Error loading watchlist:', error);
      throw error;
    }
  }

  // Save a show to database
  async saveShow(show: Show): Promise<void> {
    console.log('💾 Saving show to API:', show.title);
    try {
      await this.request('/watchlist', {
        method: 'POST',
        body: JSON.stringify(show),
      });
      console.log('✅ Show saved to API');
    } catch (error) {
      console.error('❌ Error saving show:', error);
      throw error;
    }
  }

  // Update a show in database
  async updateShow(show: Show): Promise<void> {
    console.log('🔄 Updating show in API:', show.title);
    try {
      await this.request(`/watchlist/${show.id}`, {
        method: 'PUT',
        body: JSON.stringify(show),
      });
      console.log('✅ Show updated in API');
    } catch (error) {
      console.error('❌ Error updating show:', error);
      throw error;
    }
  }

  // Remove a show from database
  async removeShow(showId: string): Promise<void> {
    console.log('🗑️ Removing show from API:', showId);
    try {
      await this.request(`/watchlist/${showId}`, {
        method: 'DELETE',
      });
      console.log('✅ Show removed from API');
    } catch (error) {
      console.error('❌ Error removing show:', error);
      throw error;
    }
  }

  // Save entire watchlist (for bulk operations)
  async saveWatchlist(watchlist: Show[]): Promise<void> {
    console.log('💾 Saving entire watchlist to API...');
    try {
      // Save each show individually
      for (const show of watchlist) {
        await this.saveShow(show);
      }
      console.log('✅ Entire watchlist saved to API');
    } catch (error) {
      console.error('❌ Error saving watchlist:', error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient(); 