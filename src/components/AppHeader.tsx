import { Database, Search, Tv } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface AppHeaderProps {
  dbBackupEnabled: boolean
  searchOpen: boolean
  onDownload: () => void
  onToggleSearch: () => void
}

export function AppHeader({ dbBackupEnabled, searchOpen, onDownload, onToggleSearch }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass-strong">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/15 via-transparent to-transparent" />
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/40 shadow-glow-sm">
            <Tv className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
              lowbass' TV Tracker
            </h1>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              Track all your favorite TV shows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={searchOpen ? 'default' : 'secondary'}
            size="sm"
            onClick={onToggleSearch}
            aria-pressed={searchOpen}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search shows</span>
          </Button>
          {dbBackupEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onDownload} aria-label="Download database backup">
                  <Database className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download database backup</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  )
}
