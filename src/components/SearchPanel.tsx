import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, Plus, Search, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Show } from './types'

interface SearchPanelProps {
  open: boolean
  query: string
  setQuery: (v: string) => void
  loading: boolean
  error: string | null
  results: Show[]
  watchlistIds: Set<string>
  onSearch: () => void
  onAdd: (s: Show) => void
}

export function SearchPanel({
  open,
  query,
  setQuery,
  loading,
  error,
  results,
  watchlistIds,
  onSearch,
  onAdd,
}: SearchPanelProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.section
          key="search-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          className="overflow-hidden border-b border-border/60 glass"
        >
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                  placeholder="Search TV shows — try 'Severance' or 'Better Call Saul'…"
                  className="pl-9 h-11"
                  autoFocus
                />
              </div>
              <Button
                onClick={onSearch}
                disabled={loading || !query.trim()}
                size="lg"
                className="sm:w-auto w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? 'Searching' : 'Search'}
              </Button>
            </div>

            {error && (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                  {results.length} result{results.length === 1 ? '' : 's'}
                </p>
                <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-thin snap-x">
                  {results.map((result) => {
                    const inWatchlist = watchlistIds.has(result.id)
                    return (
                      <motion.div
                        key={result.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                        className="snap-start w-[280px] flex-shrink-0 rounded-xl bg-card/70 ring-1 ring-border overflow-hidden flex"
                      >
                        <img
                          src={result.poster}
                          alt={result.title}
                          className="w-24 h-36 object-cover flex-shrink-0"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src =
                              `https://via.placeholder.com/150x225/8a0707/ffffff?text=${encodeURIComponent(result.title)}`
                          }}
                        />
                        <div className="flex-1 p-3 flex flex-col min-w-0">
                          <h3 className="font-semibold text-sm truncate" title={result.title}>
                            {result.title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.year} · {result.platform}
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-xs text-warning">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="tabular-nums">{result.rating}</span>
                          </div>
                          {result.nextEpisode?.season && (
                            <p className="mt-1 text-[11px] text-success line-clamp-1">
                              Next: S{result.nextEpisode.season}E{result.nextEpisode.episode} · {result.nextEpisode.airDate}
                            </p>
                          )}
                          <div className="mt-auto pt-2">
                            {inWatchlist ? (
                              <Badge variant="success" className="text-[11px]">
                                <Check className="h-3 w-3" /> In watchlist
                              </Badge>
                            ) : (
                              <Button size="sm" className="w-full" onClick={() => onAdd(result)}>
                                <Plus className="h-3.5 w-3.5" /> Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
