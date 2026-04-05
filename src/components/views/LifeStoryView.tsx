import { useState, useMemo } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Users, MapPin, Calendar, Heart, Download, FileText, FileJson, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { EmotionBadge } from './EmotionBadge'
import { useAuthStore } from '@/stores/auth-store'
import { exportAsJSON, exportAsPDF, exportAsDOCX } from '@/lib/export-service'
import type { Person, LifeEvent } from '@/types'

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

interface LifeStoryViewProps {
  onBack: () => void
}

function sortEventsByTime(events: { exact_date?: string | null; estimated_year?: number | null; life_phase?: string | null; created_at?: string }[]) {
  return [...events].sort((a, b) => {
    const yearA = a.estimated_year ?? (a.exact_date ? new Date(a.exact_date).getFullYear() : 9999)
    const yearB = b.estimated_year ?? (b.exact_date ? new Date(b.exact_date).getFullYear() : 9999)
    if (yearA !== yearB) return yearA - yearB
    // If same year, sort by exact_date if available
    if (a.exact_date && b.exact_date) return a.exact_date.localeCompare(b.exact_date)
    return 0
  })
}

const EMPTY_PERSON: Partial<Person> = {
  name: '',
  nickname: null,
  relationship_type: '',
  related_period: null,
  notes: null,
}

export function LifeStoryView({ onBack }: LifeStoryViewProps) {
  const { lifeStory, persons, events, locations, timePeriods, emotions, openQuestions, addPerson, updatePerson, deletePerson, updateEvent, deleteEvent } = useLifeStoryStore()
  const { profile } = useAuthStore()
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Partial<Person> | null>(null)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null) // null = adding new
  const [personSaving, setPersonSaving] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<Partial<LifeEvent> | null>(null)
  const [eventSaving, setEventSaving] = useState(false)

  const exportData = {
    lifeStory, persons, events, locations, timePeriods, emotions, openQuestions,
    displayName: profile?.display_name || undefined,
  }

  // Build narrative text from event records
  const narrativeText = useMemo(() => {
    const sorted = sortEventsByTime(events) as typeof events
    const paragraphs: string[] = []

    for (const event of sorted) {
      const text = event.narrative_text || event.description
      if (text) {
        paragraphs.push(text)
      }
    }

    return paragraphs.join('\n\n')
  }, [events])

  // Group emotions by event_id for quick lookup
  const emotionsByEventId = useMemo(() => {
    const map = new Map<string, typeof emotions>()
    for (const emotion of emotions) {
      if (emotion.event_id) {
        const existing = map.get(emotion.event_id) || []
        existing.push(emotion)
        map.set(emotion.event_id, existing)
      }
    }
    return map
  }, [emotions])

  // Sort emotions by importance (highest first)
  const sortedEmotions = useMemo(
    () => [...emotions].sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0)),
    [emotions]
  )

  // Map event_id to event title for display
  const eventTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const event of events) {
      map.set(event.id, event.title)
    }
    return map
  }, [events])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold">Életutam</h2>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowExportMenu(!showExportMenu)}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-popover border rounded-lg shadow-lg py-1 z-50 w-48">
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                  onClick={() => { exportAsPDF(exportData); setShowExportMenu(false) }}
                >
                  <FileText className="w-4 h-4" /> PDF letöltés
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                  onClick={() => { exportAsDOCX(exportData); setShowExportMenu(false) }}
                >
                  <FileText className="w-4 h-4" /> Word (DOCX) letöltés
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                  onClick={() => { exportAsJSON(exportData); setShowExportMenu(false) }}
                >
                  <FileJson className="w-4 h-4" /> JSON letöltés
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Tabs defaultValue="story" className="flex-1 min-h-0 flex flex-col">
        <div className="border-b px-4 flex-shrink-0">
          <TabsList className="h-10">
            <TabsTrigger value="story">Emlékkönyv</TabsTrigger>
            <TabsTrigger value="persons">
              <Users className="w-3 h-3 mr-1" /> Személyek ({persons.length})
            </TabsTrigger>
            <TabsTrigger value="events">
              <Calendar className="w-3 h-3 mr-1" /> Események ({events.length})
            </TabsTrigger>
            <TabsTrigger value="places">
              <MapPin className="w-3 h-3 mr-1" /> Helyszínek ({locations.length})
            </TabsTrigger>
            <TabsTrigger value="emotions">
              <Heart className="w-3 h-3 mr-1" /> Érzelmek ({emotions.length})
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto">
            <TabsContent value="story" className="mt-0">
              {narrativeText ? (
                <div className="prose prose-sm max-w-none">
                  {narrativeText.split('\n').map((line, i) => (
                    <p key={i} className={line.trim() === '' ? 'h-4' : ''}>{line}</p>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <p>Az életutad még üres. Kezdj el beszélgetni az AI-val, és automatikusan összeáll!</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="persons" className="mt-0 space-y-3">
              {/* Add new person button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { setEditingPerson({ ...EMPTY_PERSON }); setEditingPersonId(null) }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Új személy hozzáadása
              </Button>

              {/* Inline editor for add/edit */}
              {editingPerson && (
                <div className="border-2 border-primary/30 rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {editingPersonId ? 'Szerkesztés' : 'Új személy'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="col-span-2 text-sm border rounded px-2 py-1.5 bg-background focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Név *"
                      value={editingPerson.name || ''}
                      onChange={e => setEditingPerson({ ...editingPerson, name: e.target.value })}
                      autoFocus
                    />
                    <input
                      className="text-sm border rounded px-2 py-1.5 bg-background focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Becenév"
                      value={editingPerson.nickname || ''}
                      onChange={e => setEditingPerson({ ...editingPerson, nickname: e.target.value || null })}
                    />
                    <input
                      className="text-sm border rounded px-2 py-1.5 bg-background focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Kapcsolat (pl. anya, barát)"
                      value={editingPerson.relationship_type || ''}
                      onChange={e => setEditingPerson({ ...editingPerson, relationship_type: e.target.value })}
                    />
                    <input
                      className="text-sm border rounded px-2 py-1.5 bg-background focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Időszak (pl. 2000-2010)"
                      value={editingPerson.related_period || ''}
                      onChange={e => setEditingPerson({ ...editingPerson, related_period: e.target.value || null })}
                    />
                    <input
                      className="text-sm border rounded px-2 py-1.5 bg-background focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Jegyzetek"
                      value={editingPerson.notes || ''}
                      onChange={e => setEditingPerson({ ...editingPerson, notes: e.target.value || null })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingPerson(null); setEditingPersonId(null) }}
                      disabled={personSaving}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Mégse
                    </Button>
                    <Button
                      size="sm"
                      disabled={!editingPerson.name?.trim() || !editingPerson.relationship_type?.trim() || personSaving}
                      onClick={async () => {
                        if (!editingPerson.name?.trim() || !editingPerson.relationship_type?.trim()) return
                        setPersonSaving(true)
                        try {
                          if (editingPersonId) {
                            await updatePerson(editingPersonId, editingPerson)
                          } else {
                            await addPerson(editingPerson)
                          }
                          setEditingPerson(null)
                          setEditingPersonId(null)
                        } catch (err) {
                          console.error('Person save error:', err)
                        } finally {
                          setPersonSaving(false)
                        }
                      }}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> {personSaving ? 'Mentés...' : 'Mentés'}
                    </Button>
                  </div>
                </div>
              )}

              {persons.length === 0 && !editingPerson ? (
                <p className="text-center py-12 text-muted-foreground">Még nem szerepelnek személyek az életutadban.</p>
              ) : persons.map(person => (
                <div key={person.id} className="border rounded-lg p-3 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{person.name}</span>
                        {person.nickname && <span className="text-xs text-muted-foreground">({person.nickname})</span>}
                        <Badge variant="secondary" className="text-xs">{person.relationship_type}</Badge>
                      </div>
                      {person.related_period && <p className="text-xs text-muted-foreground">{person.related_period}</p>}
                      {person.notes && <p className="text-xs mt-1">{person.notes}</p>}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Szerkesztés"
                        onClick={() => {
                          setEditingPerson({
                            name: person.name,
                            nickname: person.nickname,
                            relationship_type: person.relationship_type,
                            related_period: person.related_period,
                            notes: person.notes,
                          })
                          setEditingPersonId(person.id)
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
                          if (confirm(`Biztosan törölni szeretnéd "${person.name}" személyt? A családfából és minden kapcsolatból is törlődik.`)) {
                            try {
                              await deletePerson(person.id)
                            } catch (err) {
                              console.error('Delete person error:', err)
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="events" className="mt-0 space-y-3">
              {events.length === 0 ? (
                <p className="text-center py-20 text-muted-foreground">Még nincsenek események az életutadban.</p>
              ) : (sortEventsByTime(events) as typeof events).map(event => {
                const eventEmotions = emotionsByEventId.get(event.id) || []
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
                              // Set time_type based on what's filled
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
                        {eventEmotions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {eventEmotions.map(emotion => (
                              <EmotionBadge
                                key={emotion.id}
                                feeling={emotion.feeling}
                                valence={emotion.valence}
                                compact
                              />
                            ))}
                          </div>
                        )}
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
            </TabsContent>
            <TabsContent value="places" className="mt-0 space-y-3">
              {locations.length === 0 ? (
                <p className="text-center py-20 text-muted-foreground">Még nincsenek helyszínek az életutadban.</p>
              ) : locations.map(location => (
                <div key={location.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{location.name}</span>
                    <Badge variant="secondary" className="text-xs">{location.type}</Badge>
                  </div>
                  {location.related_period && <p className="text-xs text-muted-foreground">{location.related_period}</p>}
                  {location.notes && <p className="text-xs mt-1">{location.notes}</p>}
                </div>
              ))}
            </TabsContent>
            <TabsContent value="emotions" className="mt-0 space-y-3">
              {sortedEmotions.length === 0 ? (
                <p className="text-center py-20 text-muted-foreground">Még nincsenek érzelmek rögzítve.</p>
              ) : sortedEmotions.map(emotion => {
                const eventTitle = emotion.event_id ? eventTitleMap.get(emotion.event_id) : null
                return (
                  <div key={emotion.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <EmotionBadge
                        feeling={emotion.feeling}
                        valence={emotion.valence}
                        importance={emotion.importance}
                      />
                    </div>
                    {eventTitle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {eventTitle}
                      </p>
                    )}
                    {emotion.long_term_impact && (
                      <p className="text-xs mt-1.5">
                        <span className="font-medium">Hosszú távú hatás:</span> {emotion.long_term_impact}
                      </p>
                    )}
                    {emotion.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{emotion.notes}</p>
                    )}
                  </div>
                )
              })}
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
