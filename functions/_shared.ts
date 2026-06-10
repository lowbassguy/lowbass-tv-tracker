export interface Env {
  DB: D1Database
  AUTH_USERNAME?: string
  AUTH_PASSWORD?: string
  IMPORT_TOKEN?: string
  ENABLE_DB_BACKUP_DOWNLOAD?: string
}

interface SerializedShow {
  id: string
  title: string
  type?: string | null
  year?: string | null
  platform?: string | null
  genres?: string
  status?: string | null
  poster?: string | null
  rating?: string | null
  summary?: string | null
  language?: string | null
  runtime?: number | null
  premiered?: string | null
  officialSite?: string | null
  tvmazeUrl?: string | null
  tvmazeId?: number | null
  addedDate?: string | null
  watched?: number
  watchedDate?: string | null
  seasons?: string
  episodes?: string
  totalEpisodes?: number
  watchedEpisodesCount?: number
  lastUpdated?: string | null
  expandedSeasons?: string
  nextEpisode?: string
}

type DbValue = string | number | null

export const jsonResponse = (body: unknown, init: ResponseInit = {}) => new Response(
  JSON.stringify(body),
  {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  }
)

export const methodNotAllowed = () => jsonResponse({ error: 'Method not allowed' }, { status: 405 })

export const requireAuth = (request: Request, env: Env): Response | null => {
  if (!env.AUTH_USERNAME || !env.AUTH_PASSWORD) {
    return null
  }

  const authHeader = request.headers.get('Authorization')
  const expected = `Basic ${btoa(`${env.AUTH_USERNAME}:${env.AUTH_PASSWORD}`)}`

  if (authHeader === expected) {
    return null
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="TV Tracker"',
    },
  })
}

export const withAuth = async (
  context: EventContext<Env, string, unknown>,
  handler: () => Promise<Response>
) => {
  const authResponse = requireAuth(context.request, context.env)
  if (authResponse) {
    return authResponse
  }

  return handler()
}

export const withImportAuth = async (
  context: EventContext<Env, string, unknown>,
  handler: () => Promise<Response>
) => {
  if (!context.env.IMPORT_TOKEN) {
    return jsonResponse({ error: 'Import endpoint is disabled' }, { status: 404 })
  }

  const authHeader = context.request.headers.get('Authorization')
  if (authHeader !== `Bearer ${context.env.IMPORT_TOKEN}`) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 })
  }

  return handler()
}

export const serializeShow = (show: Record<string, any>): SerializedShow => ({
  id: String(show.id),
  title: String(show.title),
  type: show.type ?? null,
  year: show.year == null ? null : String(show.year),
  platform: show.platform ?? null,
  genres: JSON.stringify(show.genres || []),
  status: show.status ?? null,
  poster: show.poster ?? null,
  rating: show.rating == null ? null : String(show.rating),
  summary: show.summary ?? null,
  language: show.language ?? null,
  runtime: show.runtime ?? null,
  premiered: show.premiered ?? null,
  officialSite: show.officialSite ?? null,
  tvmazeUrl: show.tvmazeUrl ?? null,
  tvmazeId: show.tvmazeId ?? null,
  addedDate: show.addedDate ?? null,
  watched: show.watched ? 1 : 0,
  watchedDate: show.watchedDate ?? null,
  seasons: JSON.stringify(show.seasons || []),
  episodes: JSON.stringify(show.episodes || []),
  totalEpisodes: show.totalEpisodes || 0,
  watchedEpisodesCount: show.watchedEpisodesCount || 0,
  lastUpdated: show.lastUpdated ?? null,
  expandedSeasons: JSON.stringify(show.expandedSeasons || []),
  nextEpisode: JSON.stringify(show.nextEpisode || null),
})

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export const deserializeShow = (row: Record<string, any>) => ({
  id: row.id,
  title: row.title,
  type: row.type,
  year: row.year,
  platform: row.platform,
  genres: parseJson(row.genres, []),
  status: row.status,
  poster: row.poster,
  rating: row.rating,
  summary: row.summary,
  language: row.language,
  runtime: row.runtime,
  premiered: row.premiered,
  officialSite: row.officialSite,
  tvmazeUrl: row.tvmazeUrl,
  tvmazeId: row.tvmazeId,
  addedDate: row.addedDate,
  watched: row.watched === 1,
  watchedDate: row.watchedDate,
  seasons: parseJson(row.seasons, []),
  episodes: parseJson(row.episodes, []),
  totalEpisodes: row.totalEpisodes,
  watchedEpisodesCount: row.watchedEpisodesCount,
  lastUpdated: row.lastUpdated,
  expandedSeasons: parseJson(row.expandedSeasons, []),
  nextEpisode: parseJson(row.nextEpisode, null),
})

export const showColumns = [
  'id',
  'title',
  'type',
  'year',
  'platform',
  'genres',
  'status',
  'poster',
  'rating',
  'summary',
  'language',
  'runtime',
  'premiered',
  'officialSite',
  'tvmazeUrl',
  'tvmazeId',
  'addedDate',
  'watched',
  'watchedDate',
  'seasons',
  'episodes',
  'totalEpisodes',
  'watchedEpisodesCount',
  'lastUpdated',
  'expandedSeasons',
  'nextEpisode',
] as const

export const showValues = (show: SerializedShow): DbValue[] => showColumns.map((column) => {
  const value = show[column]
  return value === undefined ? null : value
})
