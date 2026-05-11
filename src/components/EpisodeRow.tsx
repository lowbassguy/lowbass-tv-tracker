import { CheckCircle2, Circle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Episode, hasEpisodeAired } from './types'
import { cn } from '@/lib/utils'

interface EpisodeRowProps {
  episode: Episode
  onToggle: () => void
}

export function EpisodeRow({ episode, onToggle }: EpisodeRowProps) {
  const aired = hasEpisodeAired(episode)
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
        episode.watched ? 'bg-success/5' : 'hover:bg-secondary/40',
        !aired && 'opacity-70'
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggle}
          className="flex-shrink-0 transition-transform active:scale-90"
          aria-label={episode.watched ? 'Mark as unwatched' : 'Mark as watched'}
        >
          {episode.watched ? (
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 480, damping: 16 }}
              className="block"
            >
              <CheckCircle2 className="h-4 w-4 text-success" />
            </motion.span>
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <span className="font-semibold tabular-nums text-xs text-muted-foreground">
          S{String(episode.season).padStart(2, '0')}·E{String(episode.episode).padStart(2, '0')}
        </span>
        <span className="truncate" title={episode.title}>
          {episode.title}
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums">
        {episode.airDate}
      </span>
    </div>
  )
}
