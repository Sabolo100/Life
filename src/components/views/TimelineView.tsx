import { useMemo } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Star, MessageCircle } from 'lucide-react'
import type { LifeEvent, TimePeriod } from '@/types'

interface TimelineViewProps {
  onBack: () => void
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; band: string }> = {
  family:    { bg: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-300 dark:border-blue-700',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500',   band: 'bg-blue-100/50 dark:bg-blue-900/20' },
  career:    { bg: 'bg-green-50 dark:bg-green-950/30',  border: 'border-green-300 dark:border-green-700',  text: 'text-green-700 dark:text-green-300',  dot: 'bg-green-500',  band: 'bg-green-100/50 dark:bg-green-900/20' },
  education: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500', band: 'bg-purple-100/50 dark:bg-purple-900/20' },
  health:    { bg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-300 dark:border-red-700',     text: 'text-red-700 dark:text-red-300',     dot: 'bg-red-500',    band: 'bg-red-100/50 dark:bg-red-900/20' },
  travel:    { bg: 'bg-amber-50 dark:bg-amber-950/30',  border: 'border-amber-300 dark:border-amber-700',  text: 'text-amber-700 dark:text-amber-300',  dot: 'bg-amber-500',  band: 'bg-amber-100/50 dark:bg-amber-900/20' },
  relationship: { bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-300 dark:border-pink-700',   text: 'text-pink-700 dark:text-pink-300',   dot: 'bg-pink-500',   band: 'bg-pink-100/50 dark:bg-pink-900/20' },
}

const DEFAULT_COLORS = {
  bg: 'bg-gray-50 dark:bg-gray-950/30',
  border: 'border-gray-300 dark:border-gray-700',
  text: 'text-gray-700 dark:text-gray-300',
  dot: 'bg-gray-500',
  band: 'bg-gray-100/50 dark:bg-gray-900/20',
}

const LIFE_PHASE_ORDER: Record<string, number> = {
  'birth': 0,
  'infancy': 1,
  'childhood': 2,
  'gyermekkor': 2,
  'elementary': 3,
  'általános iskola': 3,
  'adolescence': 4,
  'serdülőkor': 4,
  'teenager': 5,
  'tinédzser': 5,
  'high_school': 6,
  'középiskola': 6,
  'young_adult': 7,
  'fiatal felnőtt': 7,
  'university': 8,
  'egyetem': 8,
  'adult': 9,
  'felnőttkor': 9,
  'middle_age': 10,
  'középkor': 10,
  'retirement': 11,
  'nyugdíj': 11,
  'elderly': 12,
  'időskor': 12,
}

const CATEGORY_LABELS: Record<string, string> = {
  family: 'Család',
  career: 'Karrier',
  education: 'Tanulmányok',
  health: 'Egészség',
  travel: 'Utazás',
  relationship: 'Kapcsolat',
}

function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category.toLowerCase()] || DEFAULT_COLORS
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category.toLowerCase()] || category
}

function getEventSortKey(event: LifeEvent): number {
  if (event.time_type === 'exact_date' && event.exact_date) {
    return new Date(event.exact_date).getTime()
  }
  if (event.time_type === 'estimated_year' && event.estimated_year) {
    return new Date(event.estimated_year, 0, 1).getTime()
  }
  if (event.time_type === 'life_phase' && event.life_phase) {
    const phase = event.life_phase.toLowerCase()
    const order = LIFE_PHASE_ORDER[phase]
    if (order !== undefined) {
      // Use a base year far in the future to sort life phases after exact dates
      return new Date(3000 + order, 0, 1).getTime()
    }
    return new Date(3100, 0, 1).getTime()
  }
  // uncertain / unknown - sort last
  return new Date(4000, 0, 1).getTime()
}

function formatEventTime(event: LifeEvent): string {
  if (event.time_type === 'exact_date' && event.exact_date) {
    const d = new Date(event.exact_date)
    return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  if (event.time_type === 'estimated_year' && event.estimated_year) {
    return `~${event.estimated_year}`
  }
  if (event.time_type === 'life_phase' && event.life_phase) {
    return event.life_phase
  }
  if (event.uncertain_time) {
    return event.uncertain_time
  }
  return 'Ismeretlen időpont'
}

function getTimePeriodLabel(period: TimePeriod): string {
  const start = period.start_value
  const end = period.end_type === 'ongoing' ? 'jelenleg' : (period.end_value || '?')
  return `${start} – ${end}`
}

export function TimelineView({ onBack }: TimelineViewProps) {
  const { events, timePeriods, locations, persons } = useLifeStoryStore()

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => getEventSortKey(a) - getEventSortKey(b))
  }, [events])

  const locationMap = useMemo(() => {
    const map = new Map<string, string>()
    locations.forEach(l => map.set(l.id, l.name))
    return map
  }, [locations])

  const personMap = useMemo(() => {
    const map = new Map<string, string>()
    persons.forEach(p => map.set(p.id, p.name))
    return map
  }, [persons])

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold">Idővonal</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {events.length} esemény
          </Badge>
          {timePeriods.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {timePeriods.length} időszak
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto">
          {/* Empty state */}
          {sortedEvents.length === 0 && timePeriods.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium mb-2">Az idővonalad még üres</p>
              <p className="text-sm">
                Kezdj el beszélgetni az AI-val az élettörténetedről, és az események automatikusan megjelennek itt!
              </p>
            </div>
          ) : (
            <>
              {/* Time periods as colored bands */}
              {timePeriods.length > 0 && (
                <div className="mb-6 space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Időszakok
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {timePeriods.map(period => {
                      const colors = getCategoryColors(period.category)
                      return (
                        <div
                          key={period.id}
                          className={`rounded-lg px-3 py-2 border ${colors.bg} ${colors.border}`}
                        >
                          <span className={`text-xs font-medium ${colors.text}`}>
                            {period.label}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {getTimePeriodLabel(period)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[7px] md:left-[120px] top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-0">
                  {sortedEvents.map((event) => {
                    const colors = getCategoryColors(event.category)
                    const isTurning = event.is_turning_point
                    const locationName = event.location_id ? locationMap.get(event.location_id) : null
                    const relatedPersons = event.person_ids
                      ?.map(id => personMap.get(id))
                      .filter(Boolean) || []

                    return (
                      <div key={event.id} className="relative flex items-start group">
                        {/* Date label - hidden on mobile, shown on md+ */}
                        <div className="hidden md:block w-[108px] shrink-0 text-right pr-4 pt-3">
                          <span className="text-xs text-muted-foreground font-medium">
                            {formatEventTime(event)}
                          </span>
                        </div>

                        {/* Timeline node */}
                        <div className="shrink-0 relative z-10 mt-3.5">
                          {isTurning ? (
                            <div className={`w-6 h-6 rounded-full ${colors.dot} flex items-center justify-center ring-4 ring-background shadow-lg`}>
                              <Star className="w-3 h-3 text-white fill-white" />
                            </div>
                          ) : (
                            <div className={`w-3.5 h-3.5 rounded-full ${colors.dot} ring-4 ring-background shadow-sm`} />
                          )}
                        </div>

                        {/* Event card */}
                        <div className={`ml-4 mb-6 flex-1 min-w-0`}>
                          <div
                            className={`rounded-lg border p-3 transition-shadow hover:shadow-md ${
                              isTurning
                                ? `${colors.bg} ${colors.border} border-2`
                                : 'bg-card border-border'
                            }`}
                          >
                            {/* Mobile date */}
                            <div className="md:hidden mb-1">
                              <span className="text-xs text-muted-foreground">
                                {formatEventTime(event)}
                              </span>
                            </div>

                            {/* Title row */}
                            <div className="flex items-start gap-2 flex-wrap">
                              <h4 className={`text-sm font-semibold ${isTurning ? colors.text : ''}`}>
                                {event.title}
                              </h4>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] shrink-0 ${colors.text} ${colors.bg} border ${colors.border}`}
                              >
                                {getCategoryLabel(event.category)}
                              </Badge>
                              {isTurning && (
                                <Badge variant="default" className="text-[10px] shrink-0">
                                  Fordulópont
                                </Badge>
                              )}
                            </div>

                            {/* Description */}
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                                {event.description}
                              </p>
                            )}

                            {/* Meta row */}
                            {(locationName || relatedPersons.length > 0) && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                                {locationName && (
                                  <span>📍 {locationName}</span>
                                )}
                                {relatedPersons.length > 0 && (
                                  <span>👤 {relatedPersons.join(', ')}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* End cap */}
                <div className="relative flex items-center">
                  <div className="hidden md:block w-[108px] shrink-0" />
                  <div className="w-2 h-2 rounded-full bg-border ring-4 ring-background" />
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
