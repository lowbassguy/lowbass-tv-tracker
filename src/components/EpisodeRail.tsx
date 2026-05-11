import { motion } from 'framer-motion'
import { ArrowDownNarrowWide, ArrowUpNarrowWide, CalendarClock, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { EpisodeWithShow } from './types'

interface EpisodeRailProps {
  title: string
  icon?: 'play' | 'upcoming'
  episodes: EpisodeWithShow[]
  posterByShowId: Map<string, string>
  sortOrder: string
  sortLabels: [string, string] // [primary, alt]
  setSortOrder: (v: any) => void
  readonly?: boolean
  onToggle?: (showId: string, episodeId: number) => void
  onSelectShow: (showId: string) => void
}

export function EpisodeRail({
  title,
  episodes,
  posterByShowId,
  sortOrder,
  sortLabels,
  setSortOrder,
  readonly,
  onToggle,
  onSelectShow,
}: EpisodeRailProps) {
  if (episodes.length === 0) return null
  const [primary, alt] = sortLabels
  const Sort = sortOrder === primary ? ArrowDownNarrowWide : ArrowUpNarrowWide
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortOrder(sortOrder === primary ? alt : primary)}
          className="text-xs text-muted-foreground"
        >
          <Sort className="h-3.5 w-3.5" />
          {sortOrder === primary ? primary : alt}
        </Button>
      </div>
      <ScrollArea className="w-full">
        <ul className="flex gap-3 pb-3">
          {episodes.map((episode) => {
            const poster = posterByShowId.get(episode.showId)
            return (
              <motion.li
                key={`${episode.showId}-${episode.id}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                className="w-[260px] flex-shrink-0"
              >
                <button
                  onClick={() => onSelectShow(episode.showId)}
                  className="group block w-full text-left rounded-xl bg-card/60 ring-1 ring-border/60 hover:ring-primary/50 transition-all hover:-translate-y-0.5 overflow-hidden"
                >
                  <div className="flex gap-3 p-3">
                    {poster ? (
                      <img
                        src={poster}
                        alt={episode.showTitle}
                        className="h-24 w-16 object-cover rounded-md flex-shrink-0 ring-1 ring-border/40"
                      />
                    ) : (
                      <div className="h-24 w-16 rounded-md bg-secondary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary-foreground/90 uppercase tracking-wider">
                        S{episode.season}·E{episode.episode}
                      </p>
                      <h3 className="font-semibold text-sm truncate" title={episode.showTitle}>
                        {episode.showTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate" title={episode.title}>
                        {episode.title}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {episode.airDate}
                      </p>
                    </div>
                  </div>
                  {!readonly && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggle?.(episode.showId, episode.id)
                      }}
                      className="border-t border-border/50 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground group-hover:text-foreground"
                      role="button"
                    >
                      {episode.watched ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" />
                      )}
                      {episode.watched ? 'Watched' : 'Mark watched'}
                    </div>
                  )}
                </button>
              </motion.li>
            )
          })}
        </ul>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  )
}
