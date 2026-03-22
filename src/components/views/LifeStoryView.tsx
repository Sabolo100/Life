import { useState, useMemo } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit3, Save, X, Users, MapPin, Calendar, Heart } from 'lucide-react'
import { EmotionBadge } from './EmotionBadge'

interface LifeStoryViewProps {
  onBack: () => void
}

export function LifeStoryView({ onBack }: LifeStoryViewProps) {
  const { lifeStory, persons, events, locations, emotions, updateLifeStory } = useLifeStoryStore()
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  const handleStartEdit = () => {
    setEditContent(lifeStory?.content || '')
    setEditing(true)
  }

  const handleSave = async () => {
    await updateLifeStory(editContent)
    setEditing(false)
  }

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
        {editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="w-4 h-4 mr-1" /> Mégse
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" /> Mentés
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleStartEdit}>
            <Edit3 className="w-4 h-4 mr-1" /> Szerkesztés
          </Button>
        )}
      </div>
      <Tabs defaultValue="story" className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="story">Életút</TabsTrigger>
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
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto">
            <TabsContent value="story" className="mt-0">
              {editing ? (
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />
              ) : lifeStory?.content ? (
                <div className="prose prose-sm max-w-none">
                  {lifeStory.content.split('\n').map((line, i) => (
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
              {persons.length === 0 ? (
                <p className="text-center py-20 text-muted-foreground">Még nem szerepelnek személyek az életutadban.</p>
              ) : persons.map(person => (
                <div key={person.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{person.name}</span>
                    {person.nickname && <span className="text-xs text-muted-foreground">({person.nickname})</span>}
                    <Badge variant="secondary" className="text-xs">{person.relationship_type}</Badge>
                  </div>
                  {person.related_period && <p className="text-xs text-muted-foreground">{person.related_period}</p>}
                  {person.notes && <p className="text-xs mt-1">{person.notes}</p>}
                </div>
              ))}
            </TabsContent>
            <TabsContent value="events" className="mt-0 space-y-3">
              {events.length === 0 ? (
                <p className="text-center py-20 text-muted-foreground">Még nincsenek események az életutadban.</p>
              ) : events.map(event => {
                const eventEmotions = emotionsByEventId.get(event.id) || []
                return (
                  <div key={event.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{event.title}</span>
                      <Badge variant="secondary" className="text-xs">{event.category}</Badge>
                      {event.is_turning_point && <Badge variant="default" className="text-xs">Fordulópont</Badge>}
                    </div>
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
                <p className="text-center py-20 text-muted-foreground">Még nincsenek érzelmek rögzítve. Mesélj az AI-nak az élményeidről, és automatikusan felismeri az érzelmeket!</p>
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
        </ScrollArea>
      </Tabs>
    </div>
  )
}
