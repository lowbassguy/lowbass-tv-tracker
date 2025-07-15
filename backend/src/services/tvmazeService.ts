// Service for interacting with the TVmaze API
export const fetchShowFromTvmaze = async (tvmazeId: number) => {
  try {
    const response = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}`);
    if (!response.ok) {
      throw new Error(`TVmaze API error: ${response.status}`);
    }
    
    const show = await response.json();
    
    // Transform TVmaze data to our schema format
    return {
      tvmazeId: show.id,
      title: show.name,
      type: 'tv',
      year: show.premiered ? new Date(show.premiered).getFullYear().toString() : 'Unknown',
      platform: show.network?.name || show.webChannel?.name || 'Unknown Platform',
      genres: show.genres || [],
      status: show.status || 'Unknown',
      poster: show.image?.medium || `https://via.placeholder.com/150x225/8a0707/ffffff?text=${encodeURIComponent(show.name)}`,
      rating: show.rating?.average?.toString() || 'N/A',
      summary: show.summary ? show.summary.replace(/<[^>]*>/g, '') : 'No summary available',
      language: show.language || 'Unknown',
      runtime: show.runtime || null,
      premiered: show.premiered || null,
      officialSite: show.officialSite || null,
      tvmazeUrl: show.url || null,
      lastApiUpdate: new Date()
    };
  } catch (error) {
    console.error('Error fetching show from TVmaze:', error);
    return null;
  }
};

export const fetchEpisodesFromTvmaze = async (tvmazeId: number) => {
  try {
    const response = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}/episodes`);
    if (!response.ok) {
      throw new Error(`TVmaze API error: ${response.status}`);
    }
    
    const episodes = await response.json();
    
    // Transform episodes to our schema format
    return episodes.map((ep: any) => ({
      id: ep.id,
      season: ep.season,
      episode: ep.number,
      title: ep.name,
      airDate: ep.airdate,
      airTime: ep.airtime || null,
      runtime: ep.runtime || null,
      summary: ep.summary ? ep.summary.replace(/<[^>]*>/g, '') : null
    }));
  } catch (error) {
    console.error('Error fetching episodes from TVmaze:', error);
    return [];
  }
};

export const searchShowsFromTvmaze = async (query: string) => {
  try {
    const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`TVmaze API error: ${response.status}`);
    }
    
    const results = await response.json();
    
    // Transform search results to our format
    return results.map((item: any) => {
      const show = item.show;
      return {
        tvmazeId: show.id,
        title: show.name,
        type: 'tv',
        year: show.premiered ? new Date(show.premiered).getFullYear().toString() : 'Unknown',
        platform: show.network?.name || show.webChannel?.name || 'Unknown Platform',
        genres: show.genres || [],
        status: show.status || 'Unknown',
        poster: show.image?.medium || `https://via.placeholder.com/150x225/8a0707/ffffff?text=${encodeURIComponent(show.name)}`,
        rating: show.rating?.average?.toString() || 'N/A',
        summary: show.summary ? show.summary.replace(/<[^>]*>/g, '') : 'No summary available',
        language: show.language || 'Unknown',
        runtime: show.runtime || null,
        premiered: show.premiered || null,
        officialSite: show.officialSite || null,
        tvmazeUrl: show.url || null
      };
    });
  } catch (error) {
    console.error('Error searching shows from TVmaze:', error);
    return [];
  }
}; 