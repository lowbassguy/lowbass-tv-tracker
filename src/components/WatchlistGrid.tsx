import { AnimatePresence } from 'framer-motion'
import { PosterCard } from './PosterCard'
import { Show } from './types'

interface WatchlistGridProps {
  items: Show[]
  onSelect: (showId: string) => void
}

export function WatchlistGrid({ items, onSelect }: WatchlistGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <PosterCard key={item.id} show={item} onClick={() => onSelect(item.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}
