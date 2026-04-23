import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, ZoomIn, ZoomOut, Maximize2, List, Clock, Check, X, Pencil, Trash2 } from 'lucide-react'
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
  {
    id: 'entertainment',
    label: 'Szórakozás',
    fill: '#8b5cf6',
    bgFill: '#f5f3ff',
    borderFill: '#7c3aed',
    textClass: 'text-violet-700',
    categories: ['entertainment', 'szórakozás', 'buli', 'party', 'concert', 'koncert', 'fesztivál', 'festival', 'mozi', 'cinema', 'hobby'],
  },
  {
    id: 'other',
    label: 'Egyéb',
    fill: '#6b7280',
    bgFill: '#f9fafb',
    borderFill: '#4b5563',
    textClass: 'text-gray-700',
    categories: ['other', 'egyéb', 'misc'],
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

/** Extract the START year from an event — tries ALL fields regardless of time_type */
function getEventYear(event: LifeEvent, birthYear: number | null): number | null {
  // 1. exact_date → year
  if (event.exact_date) {
    const d = new Date(event.exact_date)
    if (!isNaN(d.getTime())) return d.getFullYear()
  }

  // 2. estimated_year
  if (event.estimated_year && event.estimated_year > 1800) {
    return event.estimated_year
  }

  // 3. life_phase — try to extract a 4-digit year from it (e.g. "2000-2010", "2000")
  if (event.life_phase) {
    const yearMatch = event.life_phase.match(/(\d{4})/)
    if (yearMatch) {
      const y = parseInt(yearMatch[1])
      if (y > 1800 && y < 2100) return y
    }
    // Named life phase (e.g. "childhood") → offset from birth year
    if (birthYear) {
      const offset = LIFE_PHASE_YEAR[event.life_phase.toLowerCase()]
      if (offset !== undefined) return birthYear + offset
    }
  }

  // 4. uncertain_time — last resort, try to find a year in free text
  if (event.uncertain_time) {
    const yearMatch = event.uncertain_time.match(/(\d{4})/)
    if (yearMatch) {
      const y = parseInt(yearMatch[1])
      if (y > 1800 && y < 2100) return y
    }
  }

  // 5. description — sometimes the year is only mentioned here
  if (event.description) {
    const yearMatch = event.description.match(/(\d{4})/)
    if (yearMatch) {
      const y = parseInt(yearMatch[1])
      if (y > 1800 && y < 2100) return y
    }
  }

  return null
}

/** Extract the END year from an event — tries life_phase, description, etc. */
function getEventEndYear(event: LifeEvent): number | null {
  // Check life_phase for range patterns: "2000-2010", "2000–2010"
  if (event.life_phase) {
    const m = event.life_phase.match(/(\d{4})\s*[-–]\s*(\d{4})/)
    if (m) return parseInt(m[2])
  }
  // Check description for range patterns
  if (event.description) {
    const m = event.description.match(/(\d{4})\s*[-–]\s*(\d{4})/)
    if (m) return parseInt(m[2])
  }
  // Check uncertain_time
  if (event.uncertain_time) {
    const m = event.uncertain_time.match(/(\d{4})\s*[-–]\s*(\d{4})/)
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

const TRACK_HEIGHT = 56
const TRACK_GAP = 2
const RULER_HEIGHT = 32
const LABEL_WIDTH = 130
const MIN_BLOCK_WIDTH = 4
// Minimum display width for point events so the title always fits
const MIN_POINT_DISPLAY_WIDTH = 76

// ── CATEGORY_OPTIONS for list view ────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'career', label: 'Munkahely' },
  { value: 'education', label: 'Tanulmányok' },
  { value: 'relationship', label: 'Kapcsolat' },
  { value: 'family', label: 'Család' },
  { value: 'residence', label: 'Lakóhely' },
  { value: 'travel', label: 'Utazás' },
  { value: 'health', label: 'Egészség' },
  { value: 'sport', label: 'Sport' },
  { value: 'entertainment', label: 'Szórakozás' },
  { value: 'childhood', label: 'Gyermekkor' },
  { value: 'other', label: 'Egyéb' },
]

function sortEventsByTime(events: { exact_date?: string | null; estimated_year?: number | null; life_phase?: string | null; created_at?: string }[]) {
  return [...events].sort((a, b) => {
    const yearA = a.estimated_year ?? (a.exact_date ? new Date(a.exact_date).getFullYear() : 9999)
    const yearB = b.estimated_year ?? (b.exact_date ? new Date(b.exact_date).getFullYear() : 9999)
    if (yearA !== yearB) return yearA - yearB
    if (a.exact_date && b.exact_date) return a.exact_date.localeCompare(b.exact_date)
    return 0
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TimelineView({ onBack: _onBack }: TimelineViewProps) {
  const { events, timePeriods, lifeStory, updateEvent, deleteEvent } = useLifeStoryStore()
  const [zoom, setZoom] = useState(1)
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline')
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<Partial<LifeEvent> | null>(null)
  const [eventSaving, setEventSaving] = useState(false)
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

  const { placedEvents, activeTracks } = useMemo(() => {
    const placed: PlacedEvent[] = []
    const trackIds = new Set<string>()

    for (const event of events) {
      const year = getEventYear(event, birthYear)
      if (year === null) continue

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
    // "other" is already the last entry in TRACKS — don't push OTHER_TRACK again (would duplicate)
    const active = [...TRACKS]

    return { placedEvents: placed, activeTracks: active }
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

  const COLLAPSED_HEIGHT = 22 // thin strip for collapsed tracks
  const svgWidth = totalYears * YEAR_WIDTH + LABEL_WIDTH + 20

  // Compute Y offset for each track (collapsed tracks get thin height)
  const trackLayout = useMemo(() => {
    const layout: { track: TrackDef; y: number; height: number; collapsed: boolean }[] = []
    let y = RULER_HEIGHT
    for (const track of activeTracks) {
      const collapsed = collapsedTracks.has(track.id)
      const h = collapsed ? COLLAPSED_HEIGHT : TRACK_HEIGHT
      layout.push({ track, y, height: h, collapsed })
      y += h + TRACK_GAP
    }
    return layout
  }, [activeTracks, collapsedTracks])

  const svgHeight = (trackLayout.length > 0
    ? trackLayout[trackLayout.length - 1].y + trackLayout[trackLayout.length - 1].height
    : RULER_HEIGHT) + 20

  // ── X position helper ─────────────────────────────────────────────────────

  const yearToX = useCallback((year: number) => {
    return LABEL_WIDTH + (year - startYear) * YEAR_WIDTH
  }, [startYear, YEAR_WIDTH])

  // ── Empty state ───────────────────────────────────────────────────────────

  if (events.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center gap-2">
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
    // overflow-hidden is CRITICAL on mobile — prevents wide SVG from leaking out
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge variant="secondary" className="text-xs shrink-0">{events.length}</Badge>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setViewMode(viewMode === 'timeline' ? 'list' : 'timeline')}
            title={viewMode === 'timeline' ? 'Lista nézet' : 'Idővonal nézet'}
          >
            {viewMode === 'timeline' ? <><List className="w-3.5 h-3.5" /> Lista nézet</> : <><Clock className="w-3.5 h-3.5" /> Idővonal nézet</>}
          </Button>
          {viewMode === 'timeline' && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} title="Kicsinyítés">
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-9 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} title="Nagyítás">
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomFit} title="Illesztés">
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* List view */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-3">
            {events.length === 0 ? (
              <p className="text-center py-20 text-muted-foreground">Még nincsenek események az életutadban.</p>
            ) : (sortEventsByTime(events) as typeof events).map(event => {
              const isEditing = editingEventId === event.id

              if (isEditing && editingEvent) {
                return (
                  <div key={event.id} className="border-2 border-primary rounded-lg p-3 space-y-2 bg-muted/30">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingEvent.title || ''}
                        onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                        placeholder="Cím"
                        className="w-full text-sm font-medium border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <select
                          value={editingEvent.category || ''}
                          onChange={e => setEditingEvent({ ...editingEvent, category: e.target.value })}
                          className="flex-1 text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                        >
                          {CATEGORY_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={editingEvent.is_turning_point || false}
                            onChange={e => setEditingEvent({ ...editingEvent, is_turning_point: e.target.checked })}
                          />
                          Fordulópont
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingEvent.exact_date || ''}
                          onChange={e => setEditingEvent({ ...editingEvent, exact_date: e.target.value || null, time_type: e.target.value ? 'exact_date' : editingEvent.time_type })}
                          placeholder="Pontos dátum (ÉÉÉÉ-HH-NN)"
                          className="flex-1 text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <input
                          type="number"
                          value={editingEvent.estimated_year ?? ''}
                          onChange={e => {
                            const y = e.target.value ? parseInt(e.target.value) : null
                            setEditingEvent({ ...editingEvent, estimated_year: y, time_type: y ? 'estimated_year' : editingEvent.time_type })
                          }}
                          placeholder="Év"
                          className="w-20 text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                      </div>
                      <input
                        type="text"
                        value={editingEvent.life_phase || ''}
                        onChange={e => setEditingEvent({ ...editingEvent, life_phase: e.target.value || null })}
                        placeholder="Időszak (pl. 2000-2010)"
                        className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                      <textarea
                        value={editingEvent.description || ''}
                        onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value || null })}
                        placeholder="Leírás"
                        rows={2}
                        className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                      <textarea
                        value={editingEvent.narrative_text || ''}
                        onChange={e => setEditingEvent({ ...editingEvent, narrative_text: e.target.value || null })}
                        placeholder="Elbeszélő szöveg (E/1)"
                        rows={2}
                        className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary resize-none italic"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="text-xs"
                        disabled={eventSaving || !editingEvent.title?.trim()}
                        onClick={async () => {
                          setEventSaving(true)
                          try {
                            const updates: Partial<LifeEvent> = {
                              title: editingEvent.title,
                              category: editingEvent.category,
                              is_turning_point: editingEvent.is_turning_point,
                              exact_date: editingEvent.exact_date,
                              estimated_year: editingEvent.estimated_year,
                              life_phase: editingEvent.life_phase,
                              description: editingEvent.description,
                              narrative_text: editingEvent.narrative_text,
                            }
                            if (editingEvent.exact_date) updates.time_type = 'exact_date'
                            else if (editingEvent.estimated_year) updates.time_type = 'estimated_year'
                            else if (editingEvent.life_phase) updates.time_type = 'life_phase'
                            await updateEvent(event.id, updates)
                            setEditingEventId(null)
                            setEditingEvent(null)
                          } catch (err) {
                            console.error('Update event error:', err)
                          } finally {
                            setEventSaving(false)
                          }
                        }}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Mentés
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => { setEditingEventId(null); setEditingEvent(null) }}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Mégse
                      </Button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={event.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{event.title}</span>
                        <Badge variant="secondary" className="text-xs">{CATEGORY_OPTIONS.find(c => c.value === event.category)?.label || event.category}</Badge>
                        {event.is_turning_point && <Badge variant="default" className="text-xs">Fordulópont</Badge>}
                      </div>
                      {event.narrative_text && <p className="text-xs mt-1 italic text-muted-foreground">{event.narrative_text}</p>}
                      {event.description && <p className="text-xs mt-1">{event.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.exact_date || (event.estimated_year ? `~${event.estimated_year}` : event.life_phase || event.uncertain_time || 'Ismeretlen időpont')}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Szerkesztés"
                        onClick={() => {
                          setEditingEventId(event.id)
                          setEditingEvent({
                            title: event.title,
                            category: event.category,
                            is_turning_point: event.is_turning_point,
                            exact_date: event.exact_date,
                            estimated_year: event.estimated_year,
                            life_phase: event.life_phase,
                            time_type: event.time_type,
                            description: event.description,
                            narrative_text: event.narrative_text,
                          })
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        title="Törlés"
                        onClick={async () => {
                          if (confirm(`Biztosan törölni szeretnéd "${event.title}" eseményt?`)) {
                            try {
                              await deleteEvent(event.id)
                            } catch (err) {
                              console.error('Delete event error:', err)
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mobile scroll hint */}
      {viewMode === 'timeline' && (
      <div className="sm:hidden text-center text-[10px] text-muted-foreground py-1 bg-muted/30 shrink-0">
        ← csúsztass vízszintesen →
      </div>
      )}

      {/* Main timeline area — min-w-0 keeps the flex child from expanding beyond parent */}
      {viewMode === 'timeline' && (
      <div className="flex-1 min-w-0 overflow-auto relative overscroll-contain" ref={scrollRef}
        style={{ WebkitOverflowScrolling: 'touch' }}>
        <svg
          width={Math.max(svgWidth, 400)}
          height={Math.max(svgHeight, 200)}
          className="select-none"
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
          {trackLayout.map(({ track, y: trackY, height: trackH, collapsed }) => {
            const trackEvents = placedEvents.filter(pe => pe.trackId === track.id)

            // ── Collapsed track: thin clickable strip ──
            if (collapsed) {
              return (
                <g key={track.id} className="cursor-pointer" onClick={() => toggleTrack(track.id)}>
                  <rect x={0} y={trackY} width={svgWidth} height={trackH}
                    fill={track.bgFill} opacity={0.3} />
                  <rect x={0} y={trackY} width={LABEL_WIDTH} height={trackH}
                    fill="white" stroke="#e2e8f0" strokeWidth={0.5} />
                  <text x={9} y={trackY + trackH / 2 + 3.5} textAnchor="middle"
                    fontSize={8} fill="#94a3b8">▸</text>
                  <text x={22} y={trackY + trackH / 2 + 3.5}
                    fontSize={9} fill={track.fill} fontWeight={500} opacity={0.6}>
                    {track.label}
                  </text>
                  {trackEvents.length > 0 && (
                    <text x={LABEL_WIDTH - 8} y={trackY + trackH / 2 + 3}
                      textAnchor="end" fontSize={8} fill="#94a3b8">
                      {trackEvents.length}
                    </text>
                  )}
                  <line x1={0} y1={trackY + trackH} x2={svgWidth} y2={trackY + trackH}
                    stroke="#e2e8f0" strokeWidth={0.5} />
                </g>
              )
            }

            // ── Expanded track ──

            // Lane assignment within this track to avoid overlap
            const lanes: PlacedEvent[][] = []
            for (const pe of trackEvents.sort((a, b) => a.startYear - b.startYear)) {
              let placed = false
              // Point events get a wider pill display — use display-pixel gap to avoid overlap
              const pointGapYears = pe.isRange
                ? 0
                : Math.max(1, Math.ceil(MIN_POINT_DISPLAY_WIDTH / YEAR_WIDTH) + 1)
              for (const lane of lanes) {
                const last = lane[lane.length - 1]
                const gapNeeded = last.isRange ? 0 : pointGapYears
                if (pe.startYear > last.endYear + gapNeeded) {
                  lane.push(pe)
                  placed = true
                  break
                }
              }
              if (!placed) lanes.push([pe])
            }

            const subTrackH = trackH / Math.max(1, lanes.length)

            return (
              <g key={track.id}>
                {/* Track background */}
                <rect x={0} y={trackY} width={svgWidth} height={trackH}
                  fill={track.bgFill} opacity={0.5} />

                {/* Track label (sticky left) */}
                <rect x={0} y={trackY} width={LABEL_WIDTH} height={trackH}
                  fill="white" stroke="#e2e8f0" strokeWidth={0.5} />
                <text x={24} y={trackY + trackH / 2 + 4}
                  fontSize={11} fontWeight={600} fill={track.fill}>
                  {track.label}
                </text>
                {trackEvents.length > 0 && (
                  <text x={LABEL_WIDTH - 8} y={trackY + trackH / 2 + 3}
                    textAnchor="end" fontSize={9} fill="#94a3b8">
                    {trackEvents.length}
                  </text>
                )}

                {/* Collapse/expand toggle */}
                <g className="cursor-pointer" onClick={() => toggleTrack(track.id)}>
                  <rect x={2} y={trackY + trackH / 2 - 6} width={14} height={12}
                    fill="transparent" />
                  <text x={9} y={trackY + trackH / 2 + 4} textAnchor="middle"
                    fontSize={10} fill="#94a3b8">▾</text>
                </g>

                {/* Track bottom border */}
                <line x1={0} y1={trackY + trackH} x2={svgWidth} y2={trackY + trackH}
                  stroke="#e2e8f0" strokeWidth={0.5} />

                {/* Empty track placeholder */}
                {trackEvents.length === 0 && (
                  <text
                    x={LABEL_WIDTH + (svgWidth - LABEL_WIDTH) / 2}
                    y={trackY + trackH / 2 + 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#d1d5db"
                    fontStyle="italic"
                  >
                    Még nincs rögzített esemény
                  </text>
                )}

                {/* Event blocks */}
                {lanes.map((lane, laneIdx) =>
                  lane.map(pe => {
                    const x1 = yearToX(pe.startYear)
                    const x2 = pe.isRange
                      ? yearToX(pe.endYear + 1)
                      : x1 + Math.max(MIN_BLOCK_WIDTH, YEAR_WIDTH * 0.3)
                    // Collision-detection width (proportional to duration)
                    const blockW = Math.max(MIN_BLOCK_WIDTH, x2 - x1)
                    // Display width: point events get a wider pill so the title always fits
                    const displayW = pe.isRange
                      ? blockW
                      : Math.max(MIN_POINT_DISPLAY_WIDTH, blockW)
                    const blockY = trackY + laneIdx * subTrackH + 2
                    const blockH = subTrackH - 4
                    const isSelected = selectedEvent?.id === pe.event.id
                    const isTurning = pe.event.is_turning_point

                    return (
                      <g
                        key={pe.event.id}
                        className="cursor-pointer"
                        onMouseEnter={(e) => {
                          setSelectedEvent(pe.event)
                          const container = scrollRef.current
                          if (container) {
                            const rect = container.getBoundingClientRect()
                            setPopupPos({
                              x: e.clientX - rect.left + container.scrollLeft,
                              y: e.clientY - rect.top + container.scrollTop,
                            })
                          }
                        }}
                        onMouseLeave={() => {
                          setSelectedEvent(null)
                          setPopupPos(null)
                        }}
                      >
                        {/* Anchor tick for point events so the exact position is visible */}
                        {!pe.isRange && displayW > blockW && (
                          <rect
                            x={x1} y={blockY + Math.round(blockH * 0.3)}
                            width={3} height={Math.round(blockH * 0.4)}
                            rx={1} fill={track.borderFill} opacity={0.6}
                          />
                        )}

                        <rect x={!pe.isRange && displayW > blockW ? x1 + 5 : x1}
                          y={blockY} width={!pe.isRange && displayW > blockW ? displayW - 5 : displayW}
                          height={blockH}
                          rx={4} fill={track.fill}
                          opacity={isSelected ? 1 : 0.8}
                          stroke={isSelected ? track.borderFill : 'rgba(255,255,255,0.25)'}
                          strokeWidth={isSelected ? 2 : 1} />

                        {isTurning && (
                          <text x={(!pe.isRange && displayW > blockW ? x1 + 5 : x1) + 4}
                            y={blockY + blockH / 2 + 3.5}
                            fontSize={10} fill="white">★</text>
                        )}

                        {/* Title — always visible inside the block */}
                        <foreignObject
                          x={(!pe.isRange && displayW > blockW ? x1 + 5 : x1) + (isTurning ? 15 : 5)}
                          y={blockY + 2}
                          width={((!pe.isRange && displayW > blockW ? displayW - 5 : displayW) - (isTurning ? 20 : 10))}
                          height={blockH - 4}>
                          <div style={{
                            fontSize: '9px', color: 'white', fontWeight: 600,
                            lineHeight: 1.25, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            paddingTop: blockH > 22 ? '3px' : '1px',
                          }}>
                            {pe.event.title}
                          </div>
                        </foreignObject>

                        {/* Browser tooltip for accessibility */}
                        <title>{pe.event.title} ({formatEventTime(pe.event)})</title>
                      </g>
                    )
                  })
                )}
              </g>
            )
          })}

        </svg>
      </div>
      )}

      {/* ─── Floating tooltip on hover ─── */}
      {viewMode === 'timeline' && selectedEvent && popupPos && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: Math.min(popupPos.x, (scrollRef.current?.scrollWidth ?? 400) - 270),
            top: Math.max(8, popupPos.y - 130),
          }}
        >
          <div className="bg-background border rounded-lg shadow-xl p-2.5 w-[250px]">
            <div className="flex items-start gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0"
                style={{ backgroundColor: findTrack(selectedEvent.category).fill }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-xs leading-tight">{selectedEvent.title}</span>
                  {selectedEvent.is_turning_point && (
                    <span className="text-[10px] text-amber-600">★</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatEventTime(selectedEvent)}
                  {' · '}
                  {findTrack(selectedEvent.category).label}
                </p>
                {selectedEvent.description && (
                  <p className="text-[11px] text-foreground/80 mt-1 line-clamp-2">
                    {selectedEvent.description}
                  </p>
                )}
                {selectedEvent.narrative_text && (
                  <p className="text-[11px] text-foreground/60 mt-0.5 italic line-clamp-2">
                    {selectedEvent.narrative_text}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
