import { useState, useMemo, useRef } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MessageCircle, ZoomIn, ZoomOut } from 'lucide-react'
import type { LifeEvent } from '@/types'

interface TimelineViewProps {
  onBack: () => void
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  family:       { label: 'Család',     color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/40',   border: 'border-blue-400', dot: 'bg-blue-500' },
  career:       { label: 'Karrier',    color: 'text-green-700 dark:text-green-300',  bg: 'bg-green-100 dark:bg-green-900/40',  border: 'border-green-400', dot: 'bg-green-500' },
  education:    { label: 'Tanulmányok', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400', dot: 'bg-purple-500' },
  health:       { label: 'Egészség',   color: 'text-red-700 dark:text-red-300',     bg: 'bg-red-100 dark:bg-red-900/40',     border: 'border-red-400', dot: 'bg-red-500' },
  travel:       { label: 'Utazás',     color: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-100 dark:bg-amber-900/40',  border: 'border-amber-400', dot: 'bg-amber-500' },
  relationship: { label: 'Kapcsolat',  color: 'text-pink-700 dark:text-pink-300',   bg: 'bg-pink-100 dark:bg-pink-900/40',   border: 'border-pink-400', dot: 'bg-pink-500' },
}

const DEFAULT_CAT = { label: 'Egyéb', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-900/40', border: 'border-gray-400', dot: 'bg-gray-400' }

function getCat(category: string) {
  return CATEGORY_CONFIG[category?.toLowerCase()] || DEFAULT_CAT
}

// Life phase → rough year offset from birth
const LIFE_PHASE_YEAR: Record<string, number> = {
  birth: 0, születés: 0,
  infancy: 1, csecsemőkor: 1,
  childhood: 5, gyermekkor: 5,
  elementary: 8, 'általános iskola': 8,
  adolescence: 13, serdülőkor: 13,
  teenager: 15, tinédzser: 15,
  'high_school': 16, középiskola: 16,
  'young_adult': 20, 'fiatal felnőtt': 20,
  university: 20, egyetem: 20,
  adult: 30, felnőttkor: 30,
  'middle_age': 45, középkor: 45,
  retirement: 65, nyugdíj: 65,
  elderly: 75, időskor: 75,
}

/** Extract a numeric year from an event, or null */
function getEventYear(event: LifeEvent, birthYear: number | null): number | null {
  if (event.time_type === 'exact_date' && event.exact_date) {
    return new Date(event.exact_date).getFullYear()
  }
  if (event.time_type === 'estimated_year' && event.estimated_year) {
    return event.estimated_year
  }
  if (event.time_type === 'life_phase' && event.life_phase && birthYear) {
    const offset = LIFE_PHASE_YEAR[event.life_phase.toLowerCase()]
    if (offset !== undefined) return birthYear + offset
  }
  return null
}

function formatEventTime(event: LifeEvent): string {
  if (event.time_type === 'exact_date' && event.exact_date) {
    const d = new Date(event.exact_date)
    return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short' })
  }
  if (event.time_type === 'estimated_year' && event.estimated_year) {
    return `~${event.estimated_year}`
  }
  if (event.life_phase) return event.life_phase
  if (event.uncertain_time) return event.uncertain_time
  return '?'
}

export function TimelineView({ onBack }: TimelineViewProps) {
  const { events, timePeriods, lifeStory } = useLifeStoryStore()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Try to extract birth year from life story text or earliest event
  const birthYear = useMemo(() => {
    // Try from time periods
    for (const p of timePeriods) {
      if (p.label.toLowerCase().includes('születés') || p.category === 'birth') {
        const y = parseInt(p.start_value)
        if (!isNaN(y) && y > 1900 && y < 2030) return y
      }
    }
    // Try from events
    const birthEvent = events.find(e =>
      e.title.toLowerCase().includes('születés') || e.category === 'birth'
    )
    if (birthEvent) {
      if (birthEvent.exact_date) return new Date(birthEvent.exact_date).getFullYear()
      if (birthEvent.estimated_year) return birthEvent.estimated_year
    }
    // Try from life story text
    if (lifeStory) {
      const match = lifeStory.content?.match(/szület\w*\s+(\d{4})/i) ||
                    lifeStory.content?.match(/(\d{4})\s*[-–.]\s*(ben|ban)?\s*szület/i) ||
                    lifeStory.content?.match(/(\d{4})/i)
      if (match) {
        const y = parseInt(match[1])
        if (y > 1900 && y < 2030) return y
      }
    }
    // Fallback: earliest year from events
    const years = events.map(e => getEventYear(e, null)).filter((y): y is number => y !== null)
    if (years.length > 0) return Math.min(...years)
    return null
  }, [events, timePeriods, lifeStory])

  const currentYear = new Date().getFullYear()
  const startYear = birthYear || currentYear - 50
  const totalYears = currentYear - startYear + 1

  // Filter and place events
  const placedEvents = useMemo(() => {
    const filtered = activeCategory
      ? events.filter(e => e.category?.toLowerCase() === activeCategory)
      : events

    return filtered
      .map(e => ({
        event: e,
        year: getEventYear(e, birthYear),
      }))
      .filter((item): item is { event: LifeEvent; year: number } => item.year !== null)
      .sort((a, b) => a.year - b.year)
  }, [events, activeCategory, birthYear])

  // Events without dates
  const undatedEvents = useMemo(() => {
    const filtered = activeCategory
      ? events.filter(e => e.category?.toLowerCase() === activeCategory)
      : events
    return filtered.filter(e => getEventYear(e, birthYear) === null)
  }, [events, activeCategory, birthYear])

  // All unique categories in the data
  const categories = useMemo(() => {
    const cats = new Set<string>()
    events.forEach(e => { if (e.category) cats.add(e.category.toLowerCase()) })
    return Array.from(cats).sort()
  }, [events])

  // Distribute events into "lanes" to avoid overlap
  const eventLanes = useMemo(() => {
    const lanes: { event: LifeEvent; year: number; lane: number }[] = []
    const laneTails: number[] = [] // last year occupied per lane

    for (const { event, year } of placedEvents) {
      // Find the first lane where the event fits (needs ~2 years gap at zoom 1)
      const minGap = Math.max(1, Math.round(3 / zoom))
      let placed = false
      for (let i = 0; i < laneTails.length; i++) {
        if (year - laneTails[i] >= minGap) {
          lanes.push({ event, year, lane: i })
          laneTails[i] = year
          placed = true
          break
        }
      }
      if (!placed) {
        lanes.push({ event, year, lane: laneTails.length })
        laneTails.push(year)
      }
    }
    return lanes
  }, [placedEvents, zoom])

  const maxLane = Math.max(0, ...eventLanes.map(e => e.lane))
  const YEAR_WIDTH = 80 * zoom
  const LANE_HEIGHT = 90
  const AXIS_Y = (maxLane + 1) * LANE_HEIGHT + 40
  const SVG_HEIGHT = AXIS_Y + 60
  const SVG_WIDTH = totalYears * YEAR_WIDTH + 100

  // Period bands
  const periodBands = useMemo(() => {
    return timePeriods.map(p => {
      let sy = parseInt(p.start_value)
      let ey = p.end_type === 'ongoing' ? currentYear : parseInt(p.end_value || '')
      if (isNaN(sy)) sy = startYear
      if (isNaN(ey)) ey = currentYear
      return { ...p, sy, ey }
    }).filter(p => p.sy >= startYear - 5 && p.sy <= currentYear + 5)
  }, [timePeriods, startYear, currentYear])

  if (events.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold">Idővonal</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-20 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-2">Az idővonalad még üres</p>
            <p className="text-sm">
              Kezdj el beszélgetni az AI-val, és az események automatikusan megjelennek itt!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold">Idővonal</h2>
          <Badge variant="secondary" className="text-xs">{events.length} esemény</Badge>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom(z => Math.min(3, z + 0.2))}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="px-4 py-2 border-b flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory(null)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            activeCategory === null
              ? 'bg-foreground text-background border-foreground'
              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          Mind ({events.length})
        </button>
        {categories.map(cat => {
          const cfg = getCat(cat)
          const count = events.filter(e => e.category?.toLowerCase() === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                activeCategory === cat
                  ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Timeline area - horizontally scrollable */}
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <svg
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
          className="min-w-full"
          style={{ minHeight: SVG_HEIGHT }}
        >
          {/* Period bands (background) */}
          {periodBands.map((p, i) => {
            const x1 = (p.sy - startYear) * YEAR_WIDTH + 50
            const x2 = (p.ey - startYear + 1) * YEAR_WIDTH + 50
            const cfg = getCat(p.category)
            return (
              <g key={`period-${i}`}>
                <rect
                  x={x1}
                  y={10}
                  width={Math.max(0, x2 - x1)}
                  height={AXIS_Y - 10}
                  rx={6}
                  className={`${cfg.dot} opacity-[0.07]`}
                  fill="currentColor"
                />
                <text
                  x={(x1 + x2) / 2}
                  y={24}
                  textAnchor="middle"
                  className={`text-[10px] fill-current ${cfg.color} opacity-60`}
                >
                  {p.label}
                </text>
              </g>
            )
          })}

          {/* Horizontal axis line */}
          <line
            x1={50}
            y1={AXIS_Y}
            x2={SVG_WIDTH - 50}
            y2={AXIS_Y}
            className="stroke-border"
            strokeWidth={2}
          />

          {/* Year ticks */}
          {Array.from({ length: totalYears }, (_, i) => {
            const year = startYear + i
            const x = i * YEAR_WIDTH + 50
            const isDecade = year % 10 === 0
            const showLabel = zoom >= 0.8 ? true : (zoom >= 0.5 ? year % 5 === 0 : year % 10 === 0)

            return (
              <g key={`tick-${year}`}>
                <line
                  x1={x}
                  y1={AXIS_Y - (isDecade ? 8 : 4)}
                  x2={x}
                  y2={AXIS_Y + (isDecade ? 8 : 4)}
                  className="stroke-border"
                  strokeWidth={isDecade ? 2 : 1}
                />
                {showLabel && (
                  <text
                    x={x}
                    y={AXIS_Y + 22}
                    textAnchor="middle"
                    className={`fill-current text-muted-foreground ${isDecade ? 'text-[11px] font-semibold' : 'text-[9px]'}`}
                  >
                    {year}
                  </text>
                )}
              </g>
            )
          })}

          {/* Today marker */}
          {(() => {
            const todayX = (currentYear - startYear) * YEAR_WIDTH + 50
            return (
              <g>
                <line
                  x1={todayX}
                  y1={10}
                  x2={todayX}
                  y2={AXIS_Y}
                  className="stroke-red-400 dark:stroke-red-500"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                <text
                  x={todayX}
                  y={AXIS_Y + 38}
                  textAnchor="middle"
                  className="text-[10px] fill-current text-red-500 font-medium"
                >
                  ma
                </text>
              </g>
            )
          })()}

          {/* Event dots and cards */}
          {eventLanes.map(({ event, year, lane }) => {
            const x = (year - startYear) * YEAR_WIDTH + 50
            const y = AXIS_Y - 30 - lane * LANE_HEIGHT
            const cfg = getCat(event.category)
            const isTurning = event.is_turning_point
            const isSelected = selectedEvent === event.id

            return (
              <g
                key={event.id}
                className="cursor-pointer"
                onClick={() => setSelectedEvent(isSelected ? null : event.id)}
              >
                {/* Stem line from axis to dot */}
                <line
                  x1={x}
                  y1={AXIS_Y}
                  x2={x}
                  y2={y + (isTurning ? 12 : 7)}
                  className="stroke-border"
                  strokeWidth={1}
                  strokeDasharray={isTurning ? undefined : '2 2'}
                />

                {/* Dot on axis */}
                <circle
                  cx={x}
                  cy={AXIS_Y}
                  r={isTurning ? 5 : 3}
                  className={`${cfg.dot} fill-current`}
                />

                {/* Event dot / star */}
                {isTurning ? (
                  <g>
                    <circle
                      cx={x}
                      cy={y}
                      r={12}
                      className={`${cfg.dot} fill-current`}
                    />
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      className="text-[10px] fill-white"
                    >
                      ★
                    </text>
                  </g>
                ) : (
                  <circle
                    cx={x}
                    cy={y}
                    r={7}
                    className={`${cfg.dot} fill-current`}
                    strokeWidth={2}
                    stroke="white"
                  />
                )}

                {/* Label / card */}
                <foreignObject
                  x={x - 60}
                  y={y - (isSelected ? 100 : 65)}
                  width={120}
                  height={isSelected ? 90 : 55}
                >
                  <div
                    className={`text-center transition-all ${
                      isSelected ? 'scale-105' : ''
                    }`}
                  >
                    {isSelected ? (
                      <div className={`rounded-lg border p-2 shadow-lg ${cfg.bg} ${cfg.border}`}>
                        <p className={`text-[10px] font-bold ${cfg.color} leading-tight`}>
                          {event.title}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {formatEventTime(event)}
                        </p>
                        {event.description && (
                          <p className="text-[8px] text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className={`text-[10px] font-semibold ${cfg.color} leading-tight line-clamp-2`}>
                          {event.title}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {formatEventTime(event)}
                        </p>
                      </div>
                    )}
                  </div>
                </foreignObject>
              </g>
            )
          })}
        </svg>

        {/* Undated events */}
        {undatedEvents.length > 0 && (
          <div className="px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground font-medium mb-2">
              📌 Dátum nélküli események ({undatedEvents.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {undatedEvents.map(e => {
                const cfg = getCat(e.category)
                return (
                  <span
                    key={e.id}
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                  >
                    {e.is_turning_point && '⭐ '}{e.title}
                    {e.uncertain_time && ` (${e.uncertain_time})`}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
