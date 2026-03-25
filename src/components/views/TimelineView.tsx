import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MessageCircle, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import type { LifeEvent } from '@/types'

interface TimelineViewProps {
  onBack: () => void
}

// ── Track definitions ─────────────────────────────────────────────────────────

interface TrackDef {
  id: string
  label: string
  /** SVG fill color for event blocks */
  fill: string
  /** Lighter background for the track row */
  bgFill: string
  /** Darker shade for borders */
  borderFill: string
  /** CSS class for header text */
  textClass: string
  /** Category strings this track matches (lowercase) */
  categories: string[]
}

const TRACKS: TrackDef[] = [
  {
    id: 'career',
    label: 'Munkahely',
    fill: '#22c55e',
    bgFill: '#f0fdf4',
    borderFill: '#16a34a',
    textClass: 'text-green-700',
    categories: ['career', 'karrier', 'work', 'munka', 'munkahely'],
  },
  {
    id: 'education',
    label: 'Tanulmányok',
    fill: '#a855f7',
    bgFill: '#faf5ff',
    borderFill: '#9333ea',
    textClass: 'text-purple-700',
    categories: ['education', 'tanulmányok', 'iskola', 'egyetem'],
  },
  {
    id: 'relationship',
    label: 'Kapcsolat',
    fill: '#ec4899',
    bgFill: '#fdf2f8',
    borderFill: '#db2777',
    textClass: 'text-pink-700',
    categories: ['relationship', 'kapcsolat', 'házasság', 'marriage'],
  },
  {
    id: 'family',
    label: 'Család',
    fill: '#3b82f6',
    bgFill: '#eff6ff',
    borderFill: '#2563eb',
    textClass: 'text-blue-700',
    categories: ['family', 'család', 'birth', 'születés', 'loss', 'childhood'],
  },
  {
    id: 'residence',
    label: 'Lakóhely',
    fill: '#14b8a6',
    bgFill: '#f0fdfa',
    borderFill: '#0d9488',
    textClass: 'text-teal-700',
    categories: ['residence', 'lakóhely', 'költözés', 'moving', 'home'],
  },
  {
    id: 'travel',
    label: 'Utazás',
    fill: '#f59e0b',
    bgFill: '#fffbeb',
    borderFill: '#d97706',
    textClass: 'text-amber-700',
    categories: ['travel', 'utazás'],
  },
  {
    id: 'health',
    label: 'Egészség',
    fill: '#ef4444',
    bgFill: '#fef2f2',
    borderFill: '#dc2626',
    textClass: 'text-red-700',
    categories: ['health', 'egészség', 'hardship'],
  },
  {
    id: 'sport',
    label: 'Sport',
    fill: '#06b6d4',
    bgFill: '#ecfeff',
    borderFill: '#0891b2',
    textClass: 'text-cyan-700',
    categories: ['sport'],
  },
]

const OTHER_TRACK: TrackDef = {
  id: 'other',
  label: 'Egyéb',
  fill: '#6b7280',
  bgFill: '#f9fafb',
  borderFill: '#4b5563',
  textClass: 'text-gray-600',
  categories: [],
}

function findTrack(category: string): TrackDef {
  const cat = (category || '').toLowerCase().trim()
  // Exact match first
  const exact = TRACKS.find(t => t.categories.includes(cat))
  if (exact) return exact
  // Partial / fuzzy match — if category contains or is contained by a track category
  const partial = TRACKS.find(t =>
    t.categories.some(tc => cat.includes(tc) || tc.includes(cat))
  )
  if (partial) return partial
  // Keyword-based fallback
  const keywordMap: Record<string, string> = {
    job: 'career', employment: 'career', profession: 'career', company: 'career',
    cég: 'career', állás: 'career', foglalkozás: 'career', bank: 'career', hivatal: 'career',
    school: 'education', study: 'education', degree: 'education', diploma: 'education',
    tanulás: 'education', képzés: 'education',
    love: 'relationship', partner: 'relationship', divorce: 'relationship', válás: 'relationship',
    child: 'family', parent: 'family', death: 'family', halál: 'family', gyerek: 'family',
    house: 'residence', apartment: 'residence', lakás: 'residence', ház: 'residence', otthon: 'residence',
    trip: 'travel', vacation: 'travel', nyaralás: 'travel', kirándulás: 'travel',
    illness: 'health', disease: 'health', betegség: 'health', kórház: 'health', hospital: 'health',
    exercise: 'sport', fitness: 'sport', edzés: 'sport',
  }
  for (const [keyword, trackCat] of Object.entries(keywordMap)) {
    if (cat.includes(keyword)) {
      const t = TRACKS.find(tr => tr.categories.includes(trackCat))
      if (t) return t
    }
  }
  return OTHER_TRACK
}

// ── Time utilities ────────────────────────────────────────────────────────────

const LIFE_PHASE_YEAR: Record<string, number> = {
  birth: 0, születés: 0,
  infancy: 1, csecsemőkor: 1,
  childhood: 5, gyermekkor: 5,
  elementary: 8, 'általános iskola': 8,
  adolescence: 13, serdülőkor: 13,
  teenager: 15, tinédzser: 15,
  high_school: 16, középiskola: 16,
  young_adult: 20, 'fiatal felnőtt': 20,
  university: 20, egyetem: 20,
  adult: 30, felnőttkor: 30,
  middle_age: 45, középkor: 45,
  retirement: 65, nyugdíj: 65,
  elderly: 75, időskor: 75,
}

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

/** Try to parse an end year from life_phase text like "1977-1984" */
function getEventEndYear(event: LifeEvent): number | null {
  if (event.life_phase) {
    const m = event.life_phase.match(/(\d{4})\s*[-–]\s*(\d{4})/)
    if (m) return parseInt(m[2])
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

// ── Constants ─────────────────────────────────────────────────────────────────

const TRACK_HEIGHT = 48
const TRACK_GAP = 2
const RULER_HEIGHT = 32
const LABEL_WIDTH = 120
const MIN_BLOCK_WIDTH = 8

// ── Component ─────────────────────────────────────────────────────────────────

export function TimelineView({ onBack }: TimelineViewProps) {
  const { events, timePeriods, lifeStory } = useLifeStoryStore()
  const [zoom, setZoom] = useState(1)
  const [selectedEvent, setSelectedEvent] = useState<LifeEvent | null>(null)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null)
  const [collapsedTracks, setCollapsedTracks] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Birth year detection ──────────────────────────────────────────────────

  const birthYear = useMemo(() => {
    for (const p of timePeriods) {
      if (p.label.toLowerCase().includes('születés') || p.category === 'birth') {
        const y = parseInt(p.start_value)
        if (!isNaN(y) && y > 1900 && y < 2030) return y
      }
    }
    const birthEvent = events.find(e =>
      e.title.toLowerCase().includes('születés') || e.category === 'birth'
    )
    if (birthEvent) {
      if (birthEvent.exact_date) return new Date(birthEvent.exact_date).getFullYear()
      if (birthEvent.estimated_year) return birthEvent.estimated_year
    }
    if (lifeStory) {
      const match = lifeStory.content?.match(/szület\w*\s+(\d{4})/i) ||
                    lifeStory.content?.match(/(\d{4})\s*[-–.]\s*(ben|ban)?\s*szület/i) ||
                    lifeStory.content?.match(/(\d{4})/i)
      if (match) {
        const y = parseInt(match[1])
        if (y > 1900 && y < 2030) return y
      }
    }
    const years = events.map(e => getEventYear(e, null)).filter((y): y is number => y !== null)
    if (years.length > 0) return Math.min(...years)
    return null
  }, [events, timePeriods, lifeStory])

  const currentYear = new Date().getFullYear()
  const startYear = (birthYear || currentYear - 50) - 1
  const endYear = currentYear + 1
  const totalYears = endYear - startYear + 1
  const YEAR_WIDTH = 60 * zoom

  // ── Assign events to tracks ───────────────────────────────────────────────

  interface PlacedEvent {
    event: LifeEvent
    trackId: string
    startYear: number
    endYear: number // same as startYear for point events
    isRange: boolean
  }

  const { placedEvents, activeTracks, undatedEvents } = useMemo(() => {
    const placed: PlacedEvent[] = []
    const undated: LifeEvent[] = []
    const trackIds = new Set<string>()

    for (const event of events) {
      const year = getEventYear(event, birthYear)
      if (year === null) {
        undated.push(event)
        continue
      }

      const track = findTrack(event.category)
      trackIds.add(track.id)

      const ey = getEventEndYear(event)

      placed.push({
        event,
        trackId: track.id,
        startYear: year,
        endYear: ey || year,
        isRange: ey !== null && ey > year,
      })
    }

    // ALWAYS show ALL base tracks (even empty ones — visual cue that info is needed)
    const active = [...TRACKS]
    // Only add "Egyéb" if there are events that didn't match any track
    if (trackIds.has('other')) active.push(OTHER_TRACK)

    return { placedEvents: placed, activeTracks: active, undatedEvents: undated }
  }, [events, birthYear])

  // ── Zoom handlers ─────────────────────────────────────────────────────────

  const zoomIn = useCallback(() => setZoom(z => Math.min(4, z + 0.3)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.2, z - 0.3)), [])
  const zoomFit = useCallback(() => {
    if (scrollRef.current) {
      const containerW = scrollRef.current.clientWidth - LABEL_WIDTH - 20
      const idealZoom = containerW / (totalYears * 60)
      setZoom(Math.max(0.2, Math.min(4, idealZoom)))
    }
  }, [totalYears])

  // Auto zoom-to-fit on first render
  useEffect(() => { zoomFit() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTrack = useCallback((trackId: string) => {
    setCollapsedTracks(prev => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }, [])

  // ── Derived layout values ─────────────────────────────────────────────────

  const visibleTracks = activeTracks.filter(t => !collapsedTracks.has(t.id))
  const svgWidth = totalYears * YEAR_WIDTH + LABEL_WIDTH + 20
  const svgHeight = RULER_HEIGHT + visibleTracks.length * (TRACK_HEIGHT + TRACK_GAP) + 20
  const collapsedCount = collapsedTracks.size

  // ── X position helper ─────────────────────────────────────────────────────

  const yearToX = useCallback((year: number) => {
    return LABEL_WIDTH + (year - startYear) * YEAR_WIDTH
  }, [startYear, YEAR_WIDTH])

  // ── Empty state ───────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold text-sm">Idővonal</h2>
          <Badge variant="secondary" className="text-xs">{events.length}</Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} title="Kicsinyítés">
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} title="Nagyítás">
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomFit} title="Illesztés">
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main timeline area */}
      <div className="flex-1 overflow-auto relative" ref={scrollRef}>
        <svg
          width={Math.max(svgWidth, 400)}
          height={Math.max(svgHeight + (undatedEvents.length > 0 ? 60 : 0), 200)}
          className="select-none"
          onClick={() => { setSelectedEvent(null); setPopupPos(null) }}
        >
          {/* ─── Ruler (year markers) ─── */}
          <g>
            {/* Ruler background */}
            <rect x={LABEL_WIDTH} y={0} width={svgWidth - LABEL_WIDTH} height={RULER_HEIGHT}
              fill="#f8fafc" />

            {Array.from({ length: totalYears }, (_, i) => {
              const year = startYear + i
              const x = yearToX(year)
              const isDecade = year % 10 === 0
              const isFive = year % 5 === 0
              const showLabel = zoom >= 0.8 || (zoom >= 0.4 ? isFive : isDecade)

              return (
                <g key={`r-${year}`}>
                  {/* Vertical grid line through all tracks */}
                  {(isDecade || (zoom >= 0.6 && isFive)) && (
                    <line
                      x1={x} y1={RULER_HEIGHT} x2={x} y2={svgHeight}
                      stroke={isDecade ? '#e2e8f0' : '#f1f5f9'}
                      strokeWidth={isDecade ? 1 : 0.5}
                    />
                  )}
                  {/* Tick on ruler */}
                  <line
                    x1={x} y1={RULER_HEIGHT - (isDecade ? 10 : isFive ? 6 : 3)}
                    x2={x} y2={RULER_HEIGHT}
                    stroke="#94a3b8" strokeWidth={isDecade ? 1.5 : 0.5}
                  />
                  {showLabel && (
                    <text
                      x={x} y={RULER_HEIGHT - (isDecade ? 13 : 8)}
                      textAnchor="middle"
                      fontSize={isDecade ? 11 : 9}
                      fontWeight={isDecade ? 600 : 400}
                      fill={isDecade ? '#334155' : '#94a3b8'}
                    >
                      {year}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Today marker */}
            {(() => {
              const todayX = yearToX(currentYear) + (YEAR_WIDTH * (new Date().getMonth() / 12))
              return (
                <g>
                  <line
                    x1={todayX} y1={0} x2={todayX} y2={svgHeight}
                    stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6}
                  />
                  <text x={todayX} y={10} textAnchor="middle" fontSize={8} fill="#ef4444" fontWeight={600}>
                    ma
                  </text>
                </g>
              )
            })()}

            {/* Ruler bottom border */}
            <line x1={LABEL_WIDTH} y1={RULER_HEIGHT} x2={svgWidth} y2={RULER_HEIGHT}
              stroke="#cbd5e1" strokeWidth={1} />
          </g>

          {/* ─── Tracks ─── */}
          {visibleTracks.map((track, trackIdx) => {
            const trackY = RULER_HEIGHT + trackIdx * (TRACK_HEIGHT + TRACK_GAP)
            const trackEvents = placedEvents.filter(pe => pe.trackId === track.id)

            // Lane assignment within this track to avoid overlap
            const lanes: PlacedEvent[][] = []
            for (const pe of trackEvents.sort((a, b) => a.startYear - b.startYear)) {
              let placed = false
              for (const lane of lanes) {
                const last = lane[lane.length - 1]
                if (pe.startYear > last.endYear + (pe.isRange ? 0 : Math.max(1, Math.round(2 / zoom)))) {
                  lane.push(pe)
                  placed = true
                  break
                }
              }
              if (!placed) lanes.push([pe])
            }

            const subTrackH = TRACK_HEIGHT / Math.max(1, lanes.length)

            return (
              <g key={track.id}>
                {/* Track background */}
                <rect
                  x={0} y={trackY}
                  width={svgWidth} height={TRACK_HEIGHT}
                  fill={track.bgFill} opacity={0.5}
                />

                {/* Track label (sticky left) */}
                <rect x={0} y={trackY} width={LABEL_WIDTH} height={TRACK_HEIGHT}
                  fill="white" stroke="#e2e8f0" strokeWidth={0.5} />
                <text
                  x={24} y={trackY + TRACK_HEIGHT / 2 + 4}
                  fontSize={11} fontWeight={600} fill={track.fill}
                >
                  {track.label}
                </text>
                {trackEvents.length > 0 && (
                  <text
                    x={LABEL_WIDTH - 8} y={trackY + TRACK_HEIGHT / 2 + 3}
                    textAnchor="end" fontSize={9} fill="#94a3b8"
                  >
                    {trackEvents.length}
                  </text>
                )}

                {/* Collapse/expand toggle */}
                <g
                  className="cursor-pointer"
                  onClick={() => toggleTrack(track.id)}
                >
                  <rect x={2} y={trackY + TRACK_HEIGHT / 2 - 6} width={14} height={12}
                    fill="transparent" />
                  <text x={9} y={trackY + TRACK_HEIGHT / 2 + 4} textAnchor="middle"
                    fontSize={10} fill="#94a3b8">
                    {'▸'}
                  </text>
                </g>

                {/* Track bottom border */}
                <line x1={0} y1={trackY + TRACK_HEIGHT} x2={svgWidth} y2={trackY + TRACK_HEIGHT}
                  stroke="#e2e8f0" strokeWidth={0.5} />

                {/* Empty track hint */}
                {trackEvents.length === 0 && (
                  <text
                    x={LABEL_WIDTH + 16} y={trackY + TRACK_HEIGHT / 2 + 4}
                    fontSize={11} fill="#cbd5e1" fontStyle="italic"
                  >
                    Mesélj az AI-nak erről a témáról...
                  </text>
                )}

                {/* Event blocks/dots */}
                {lanes.map((lane, laneIdx) =>
                  lane.map(pe => {
                    const x1 = yearToX(pe.startYear)
                    const x2 = pe.isRange
                      ? yearToX(pe.endYear + 1)
                      : x1 + Math.max(MIN_BLOCK_WIDTH, YEAR_WIDTH * 0.3)
                    const blockW = Math.max(MIN_BLOCK_WIDTH, x2 - x1)
                    const blockY = trackY + laneIdx * subTrackH + 2
                    const blockH = subTrackH - 4
                    const isSelected = selectedEvent?.id === pe.event.id
                    const isTurning = pe.event.is_turning_point

                    return (
                      <g
                        key={pe.event.id}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isSelected) {
                            setSelectedEvent(null)
                            setPopupPos(null)
                          } else {
                            setSelectedEvent(pe.event)
                            // Position popup relative to scroll container
                            const container = scrollRef.current
                            if (container) {
                              const rect = container.getBoundingClientRect()
                              setPopupPos({
                                x: e.clientX - rect.left + container.scrollLeft,
                                y: e.clientY - rect.top + container.scrollTop,
                              })
                            }
                          }
                        }}
                      >
                        {/* Block rectangle */}
                        <rect
                          x={x1} y={blockY}
                          width={blockW} height={blockH}
                          rx={4}
                          fill={track.fill}
                          opacity={isSelected ? 1 : 0.75}
                          stroke={isSelected ? track.borderFill : 'transparent'}
                          strokeWidth={isSelected ? 2 : 0}
                        />

                        {/* Turning point star */}
                        {isTurning && (
                          <text
                            x={x1 + 3} y={blockY + blockH / 2 + 3.5}
                            fontSize={10} fill="white"
                          >
                            ★
                          </text>
                        )}

                        {/* Title text inside block (only if wide enough) */}
                        {blockW > 40 && (
                          <foreignObject
                            x={x1 + (isTurning ? 14 : 4)} y={blockY + 1}
                            width={blockW - (isTurning ? 18 : 8)} height={blockH - 2}
                          >
                            <div style={{
                              fontSize: '9px',
                              color: 'white',
                              fontWeight: 500,
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              paddingTop: blockH > 20 ? '2px' : '0px',
                            }}>
                              {pe.event.title}
                            </div>
                          </foreignObject>
                        )}

                        {/* Tooltip on hover (title if block is too small) */}
                        {blockW <= 40 && (
                          <title>{pe.event.title} ({formatEventTime(pe.event)})</title>
                        )}
                      </g>
                    )
                  })
                )}
              </g>
            )
          })}

          {/* ─── Collapsed track indicators ─── */}
          {collapsedCount > 0 && (
            <g>
              {activeTracks
                .filter(t => collapsedTracks.has(t.id))
                .map((track, i) => (
                  <g
                    key={`collapsed-${track.id}`}
                    className="cursor-pointer"
                    onClick={() => toggleTrack(track.id)}
                  >
                    <rect
                      x={4} y={svgHeight - 4 + i * 16}
                      width={LABEL_WIDTH - 8} height={14}
                      rx={3} fill={track.fill} opacity={0.15}
                    />
                    <text
                      x={12} y={svgHeight + 7 + i * 16}
                      fontSize={9} fill={track.fill} fontWeight={500}
                    >
                      ▸ {track.label} (rejtett)
                    </text>
                  </g>
                ))}
            </g>
          )}

          {/* ─── Undated events section ─── */}
          {undatedEvents.length > 0 && (
            <g>
              <line
                x1={0} y1={svgHeight + 2} x2={svgWidth} y2={svgHeight + 2}
                stroke="#e2e8f0" strokeWidth={1}
              />
              <text x={8} y={svgHeight + 20} fontSize={10} fill="#94a3b8" fontWeight={500}>
                Dátum nélküli ({undatedEvents.length})
              </text>
              {undatedEvents.slice(0, 10).map((ev, i) => {
                const track = findTrack(ev.category)
                return (
                  <g
                    key={ev.id}
                    className="cursor-pointer"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      if (selectedEvent?.id === ev.id) {
                        setSelectedEvent(null)
                        setPopupPos(null)
                      } else {
                        setSelectedEvent(ev)
                        const container = scrollRef.current
                        if (container) {
                          const rect = container.getBoundingClientRect()
                          setPopupPos({
                            x: e.clientX - rect.left + container.scrollLeft,
                            y: e.clientY - rect.top + container.scrollTop,
                          })
                        }
                      }
                    }}
                  >
                    <rect
                      x={LABEL_WIDTH + i * 90} y={svgHeight + 10}
                      width={82} height={28} rx={4}
                      fill={track.fill} opacity={0.6}
                    />
                    <foreignObject
                      x={LABEL_WIDTH + i * 90 + 4} y={svgHeight + 12}
                      width={74} height={24}
                    >
                      <div style={{ fontSize: '8px', color: 'white', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.title}
                      </div>
                    </foreignObject>
                  </g>
                )
              })}
            </g>
          )}
        </svg>
      </div>

      {/* ─── Floating popup for selected event ─── */}
      {selectedEvent && popupPos && (
        <div
          className="absolute z-50 pointer-events-auto"
          style={{
            left: Math.min(popupPos.x, (scrollRef.current?.scrollWidth ?? 400) - 280),
            top: Math.max(8, popupPos.y - 140),
          }}
        >
          <div className="bg-background border rounded-lg shadow-xl p-3 w-[260px] animate-in fade-in zoom-in-95 duration-150">
            {/* Arrow/caret pointing down */}
            <div className="flex items-start gap-2">
              <div
                className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                style={{ backgroundColor: findTrack(selectedEvent.category).fill }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm leading-tight">{selectedEvent.title}</span>
                  {selectedEvent.is_turning_point && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-400 text-amber-600">
                      ★
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatEventTime(selectedEvent)}
                  {' · '}
                  {findTrack(selectedEvent.category).label}
                </p>
                {selectedEvent.description && (
                  <p className="text-xs text-foreground/80 mt-1.5 line-clamp-3">
                    {selectedEvent.description}
                  </p>
                )}
                {selectedEvent.narrative_text && (
                  <p className="text-xs text-foreground/60 mt-1 italic line-clamp-3">
                    {selectedEvent.narrative_text}
                  </p>
                )}
              </div>
              <button
                className="text-muted-foreground hover:text-foreground text-xs flex-shrink-0 -mt-0.5 -mr-1"
                onClick={() => { setSelectedEvent(null); setPopupPos(null) }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
