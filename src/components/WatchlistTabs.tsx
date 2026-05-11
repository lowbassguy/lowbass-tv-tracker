import { CheckCircle2, Library, Tv } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Show } from './types'

interface WatchlistTabsProps {
  value: string
  onChange: (v: string) => void
  watchlist: Show[]
}

export function WatchlistTabs({ value, onChange, watchlist }: WatchlistTabsProps) {
  const unwatched = watchlist.filter((i) => !i.watched).length
  const watched = watchlist.filter((i) => i.watched).length

  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        <TabsTrigger value="unwatched" isActive={value === 'unwatched'}>
          <Tv className="h-3.5 w-3.5" />
          Unwatched <span className="tabular-nums opacity-70">({unwatched})</span>
        </TabsTrigger>
        <TabsTrigger value="watched" isActive={value === 'watched'}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Watched <span className="tabular-nums opacity-70">({watched})</span>
        </TabsTrigger>
        <TabsTrigger value="all" isActive={value === 'all'}>
          <Library className="h-3.5 w-3.5" />
          All <span className="tabular-nums opacity-70">({watchlist.length})</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
