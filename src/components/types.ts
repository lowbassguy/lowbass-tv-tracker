// Shared types used across the UI components. Kept in sync with App.tsx.

export interface Episode {
  id: number
  season: number
  episode: number
  title: string
  airDate: string
  airTime?: string
  runtime?: number
  summary?: string
  watched: boolean
  watchedDate?: string
}

export interface Season {
  number: number
  episodes: Episode[]
  totalEpisodes: number
  watchedEpisodes: number
}

export interface NextEpisode {
  season?: number
  episode?: number
  title?: string
  airDate?: string
  airTime?: string
  runtime?: number
  hasNext?: boolean
}

export interface Show {
  id: string
  title: string
  type: string
  year: string | number
  platform: string
  genres: string[]
  status: string
  nextEpisode: NextEpisode | null
  poster: string
  rating: string | number
  summary: string
  language: string
  runtime: number
  premiered: string
  officialSite: string
  tvmazeUrl: string
  tvmazeId: number
  addedDate?: string
  watched?: boolean
  watchedEpisodes?: any[]
  watchedDate?: string
  lastWatchedEpisode?: NextEpisode | null
  seasons: Season[]
  episodes: Episode[]
  totalEpisodes: number
  watchedEpisodesCount: number
  lastUpdated?: string
  expandedSeasons?: number[]
}

export type EpisodeWithShow = Episode & { showTitle: string; showId: string }

// Treat an episode as "aired" only when its air date is on/before the current
// local date. Mirrors the helper inside App.tsx so child components can call it.
export const hasEpisodeAired = (
  ep: Pick<Episode, 'airDate'>,
  reference: Date = new Date()
): boolean => {
  if (!ep.airDate) return false
  const airLocalMidnight = new Date(`${ep.airDate}T00:00:00`)
  if (Number.isNaN(airLocalMidnight.getTime())) return false
  const refMidnight = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
  return airLocalMidnight.getTime() <= refMidnight.getTime()
}
