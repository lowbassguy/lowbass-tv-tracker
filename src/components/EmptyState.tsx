import { Tv2 } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
}

export function EmptyState({
  title = 'Nothing here yet',
  description = 'Search for TV shows to add them to your watchlist.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/40 ring-1 ring-border mb-4">
        <Tv2 className="h-9 w-9 text-muted-foreground" />
      </div>
      <p className="text-base font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
    </div>
  )
}
