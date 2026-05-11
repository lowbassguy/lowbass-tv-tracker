import { motion } from 'framer-motion'
import { CheckCircle2, PlayCircle, Star } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Show } from './types'

interface PosterCardProps {
  show: Show
  onClick: () => void
}

export function PosterCard({ show, onClick }: PosterCardProps) {
  const total = show.totalEpisodes || 0
  const watchedCount = show.watchedEpisodesCount || 0
  const percent = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const isComplete = show.watched

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group relative w-full aspect-[2/3] overflow-hidden rounded-xl ring-1 ring-border/60 bg-card text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Open ${show.title}`}
    >
      {/* Poster */}
      <img
        src={show.poster}
        alt={show.title}
        className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.04] group-hover:brightness-110"
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = `https://via.placeholder.com/300x450/8a0707/ffffff?text=${encodeURIComponent(
            show.title
          )}`
        }}
      />

      {/* Bottom veil */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

      {/* Top-right badge */}
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
        {isComplete ? (
          <span className="flex items-center gap-1 rounded-full bg-success/90 px-2 py-0.5 text-[10px] font-semibold text-success-foreground shadow-md">
            <CheckCircle2 className="h-3 w-3" /> Watched
          </span>
        ) : show.nextEpisode?.season ? (
          <span className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground ring-1 ring-border backdrop-blur">
            <PlayCircle className="h-3 w-3 text-primary" /> S{show.nextEpisode.season}·E{show.nextEpisode.episode}
          </span>
        ) : null}
        {show.rating && show.rating !== 'N/A' && (
          <span className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium ring-1 ring-border backdrop-blur">
            <Star className="h-3 w-3 fill-warning text-warning" />
            <span className="tabular-nums">{show.rating}</span>
          </span>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-3 space-y-1.5">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 drop-shadow" title={show.title}>
          {show.title}
        </h3>
        <p className="text-[11px] text-muted-foreground line-clamp-1">
          {show.year}
          {show.platform ? ` · ${show.platform}` : ''}
        </p>
        {total > 0 && (
          <div className="space-y-1">
            <Progress value={percent} />
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {watchedCount}/{total} episodes · {percent}%
            </p>
          </div>
        )}
      </div>

      {/* Hover overlay accent */}
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-primary/0 transition-all duration-300 group-hover:ring-2 group-hover:ring-primary/40" />
    </motion.button>
  )
}
