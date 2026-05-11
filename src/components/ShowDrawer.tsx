import {
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  PlayCircle,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { EpisodeRow } from './EpisodeRow'
import { Show } from './types'

interface ShowDrawerProps {
  show: Show | null
  onClose: () => void
  onMarkSeries: (showId: string, watched: boolean) => void
  onMarkSeason: (showId: string, seasonNumber: number, watched: boolean) => void
  onToggleEpisode: (showId: string, episodeId: number) => void
  onRemove: (showId: string) => void
}

export function ShowDrawer({
  show,
  onClose,
  onMarkSeries,
  onMarkSeason,
  onToggleEpisode,
  onRemove,
}: ShowDrawerProps) {
  const open = !!show

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="p-0 flex flex-col">
        {show && <DrawerBody
          show={show}
          onClose={onClose}
          onMarkSeries={onMarkSeries}
          onMarkSeason={onMarkSeason}
          onToggleEpisode={onToggleEpisode}
          onRemove={onRemove}
        />}
      </SheetContent>
    </Sheet>
  )
}

function DrawerBody({
  show,
  onClose,
  onMarkSeries,
  onMarkSeason,
  onToggleEpisode,
  onRemove,
}: { show: Show } & Omit<ShowDrawerProps, 'show'>) {
  const total = show.totalEpisodes || 0
  const watchedCount = show.watchedEpisodesCount || 0
  const percent = total > 0 ? Math.round((watchedCount / total) * 100) : 0

  const seasons = [...(show.seasons || [])].sort((a, b) => a.number - b.number)

  return (
    <>
      {/* Hero */}
      <div className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${show.poster})`, filter: 'blur(28px)' }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-card" />
        <SheetHeader className="relative p-5 sm:p-6 flex flex-row gap-4 items-start">
          <img
            src={show.poster}
            alt={show.title}
            className="h-44 w-28 sm:h-52 sm:w-32 rounded-lg object-cover ring-1 ring-border shadow-xl flex-shrink-0"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = `https://via.placeholder.com/200x300/8a0707/ffffff?text=${encodeURIComponent(
                show.title
              )}`
            }}
          />
          <div className="min-w-0 flex-1 pr-10">
            <SheetTitle className="text-2xl leading-tight">{show.title}</SheetTitle>
            <SheetDescription className="mt-1">
              {show.year} · {show.platform} · {show.status}
            </SheetDescription>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {show.rating && show.rating !== 'N/A' && (
                <Badge variant="warning">
                  <Star className="h-3 w-3 fill-current" /> {show.rating}
                </Badge>
              )}
              {show.runtime ? <Badge variant="secondary">{show.runtime} min</Badge> : null}
              {show.genres?.slice(0, 4).map((g) => (
                <Badge key={g} variant="outline">
                  {g}
                </Badge>
              ))}
            </div>
            {total > 0 && (
              <div className="mt-3 space-y-1">
                <Progress value={percent} />
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {watchedCount}/{total} episodes · {percent}%
                </p>
              </div>
            )}
          </div>
        </SheetHeader>
      </div>

      {/* Action row */}
      <div className="px-5 sm:px-6 py-3 border-y border-border/60 flex flex-wrap gap-2">
        {!show.watched ? (
          <Button variant="success" size="sm" onClick={() => onMarkSeries(show.id, true)}>
            <Eye className="h-4 w-4" /> Mark series watched
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => onMarkSeries(show.id, false)}>
            <EyeOff className="h-4 w-4" /> Unwatch series
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            onRemove(show.id)
            onClose()
          }}
        >
          <Trash2 className="h-4 w-4" /> Remove
        </Button>
        {show.tvmazeUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={show.tvmazeUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> TVmaze
            </a>
          </Button>
        )}
        {show.officialSite && (
          <Button variant="ghost" size="sm" asChild>
            <a href={show.officialSite} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Official site
            </a>
          </Button>
        )}
      </div>

      {/* Scrollable body */}
      <ScrollArea className="flex-1">
        <div className="px-5 sm:px-6 py-5 space-y-5">
          {/* Next episode callout */}
          {show.nextEpisode?.season && !show.watched && (
            <section className="rounded-lg bg-primary/10 ring-1 ring-primary/30 p-3">
              <p className="text-xs uppercase tracking-wider text-primary-foreground/80 mb-1 flex items-center gap-1.5">
                <PlayCircle className="h-3.5 w-3.5" /> Next up
              </p>
              <p className="text-sm font-semibold">
                S{show.nextEpisode.season}·E{show.nextEpisode.episode}: {show.nextEpisode.title}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" /> {show.nextEpisode.airDate}
                {show.nextEpisode.airTime ? ` · ${show.nextEpisode.airTime}` : ''}
              </p>
            </section>
          )}

          {/* Summary */}
          {show.summary && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Summary</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{show.summary}</p>
            </section>
          )}

          <Separator />

          {/* Seasons */}
          {seasons.length > 0 ? (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Seasons</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {seasons.length} season{seasons.length === 1 ? '' : 's'}
                </span>
              </div>
              <Accordion type="multiple" className="space-y-2">
                {seasons.map((season) => {
                  const seasonPct =
                    season.totalEpisodes > 0
                      ? Math.round((season.watchedEpisodes / season.totalEpisodes) * 100)
                      : 0
                  return (
                    <AccordionItem key={season.number} value={`s-${season.number}`}>
                      <div className="flex items-stretch">
                        <AccordionTrigger className="flex-1">
                          <div className="flex flex-col items-start min-w-0">
                            <span className="font-medium">Season {season.number}</span>
                            <div className="mt-1 flex items-center gap-2 w-44">
                              <Progress value={seasonPct} className="h-1" />
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                {season.watchedEpisodes}/{season.totalEpisodes}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 pr-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMarkSeason(show.id, season.number, true)
                            }}
                            title="Mark season watched"
                            className="text-success hover:bg-success/10"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMarkSeason(show.id, season.number, false)
                            }}
                            title="Mark season unwatched"
                            className="text-muted-foreground hover:bg-secondary"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <AccordionContent className="p-1.5 space-y-1">
                        {season.episodes.map((ep) => (
                          <EpisodeRow
                            key={ep.id}
                            episode={ep}
                            onToggle={() => onToggleEpisode(show.id, ep.id)}
                          />
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Episode data is loading…
            </p>
          )}

          {show.lastUpdated && (
            <p className="text-[11px] text-muted-foreground text-center pt-2">
              Last updated {new Date(show.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
      </ScrollArea>
    </>
  )
}
