import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { CalendarClock, CheckCircle2, Library, Tv } from 'lucide-react'
import { hasEpisodeAired, type Show } from './types'

interface StatsBarProps {
  watchlist: Show[]
}

function AnimatedCount({ value }: { value: number }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (latest) => Math.round(latest).toLocaleString())
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.6, ease: 'easeOut' })
    return controls.stop
  }, [value, mv])
  return <motion.span className="tabular-nums">{rounded}</motion.span>
}

export function StatsBar({ watchlist }: StatsBarProps) {
  const total = watchlist.length
  const watched = watchlist.filter((s) => s.watched).length
  const airedUnwatched = watchlist.reduce((sum, show) => {
    if (show.watched) return sum
    return sum + (show.episodes?.filter((e) => !e.watched && hasEpisodeAired(e)).length || 0)
  }, 0)
  const upcomingCount = watchlist.reduce((sum, show) => {
    if (show.watched) return sum
    return sum + (show.episodes?.filter((e) => !e.watched && !hasEpisodeAired(e)).length || 0)
  }, 0)

  const cards = [
    { label: 'Shows', value: total, icon: Library, accent: 'text-primary-foreground' },
    { label: 'Watched', value: watched, icon: CheckCircle2, accent: 'text-success' },
    { label: 'Aired to catch up', value: airedUnwatched, icon: Tv, accent: 'text-warning' },
    { label: 'Upcoming episodes', value: upcomingCount, icon: CalendarClock, accent: 'text-primary' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} {...c} />
      ))}
    </div>
  )
}

function Card({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: typeof Library
  accent: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="rounded-xl bg-card/60 ring-1 ring-border/60 backdrop-blur p-4 flex items-center gap-3"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/60">
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold leading-tight">
          {mounted ? <AnimatedCount value={value} /> : value}
        </p>
      </div>
    </motion.div>
  )
}
