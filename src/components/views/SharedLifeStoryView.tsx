import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useInvitationStore } from '@/stores/invitation-store'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, BookOpen, Clock, Users, Send, MessageSquare,
  PenLine, Plus, ChevronDown, ChevronUp, Check, X, Eye,
} from 'lucide-react'
import type {
  LifeStoryShare, LifeEvent, Person, Location, LifeStory,
  ContributionType, PerspectiveType,
} from '@/types'
import { PERMISSION_LABELS, PERSPECTIVE_LABELS } from '@/types'

interface SharedLifeStoryViewProps {
  share: LifeStoryShare
  onBack: () => void
}

export function SharedLifeStoryView({ share, onBack }: SharedLifeStoryViewProps) {
  const { addContribution } = useInvitationStore()
  const { user } = useAuthStore()

  const [lifeStory, setLifeStory] = useState<LifeStory | null>(null)
  const [events, setEvents] = useState<LifeEvent[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [_locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  // Contribution form
  const [showContributionForm, setShowContributionForm] = useState(false)
  const [contributionType, setContributionType] = useState<ContributionType>('memory')
  const [perspective, setPerspective] = useState<PerspectiveType>('other_memory')
  const [contTitle, setContTitle] = useState('')
  const [contDescription, setContDescription] = useState('')
  const [contTimeInfo, setContTimeInfo] = useState('')
  const [contCategory, setContCategory] = useState('')
  const [contTargetEventId, setContTargetEventId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    story: true, events: true, persons: false,
  })

  const canComment = share.permission_level !== 'reader'
  const canContribute = share.permission_level === 'contributor' || share.permission_level === 'editor'
  // const canEdit = share.permission_level === 'editor'

  // Load shared data
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [storyRes, eventsRes, personsRes, locationsRes] = await Promise.all([
        supabase.from('life_stories').select('*').eq('user_id', share.owner_id).single(),
        supabase.from('events').select('*').eq('user_id', share.owner_id).order('created_at'),
        supabase.from('persons').select('*').eq('user_id', share.owner_id).order('name'),
        supabase.from('locations').select('*').eq('user_id', share.owner_id).order('name'),
      ])
      setLifeStory(storyRes.data as LifeStory | null)
      setEvents((eventsRes.data as LifeEvent[]) || [])
      setPersons((personsRes.data as Person[]) || [])
      setLocations((locationsRes.data as Location[]) || [])
      setLoading(false)
    }
    load()
  }, [share.owner_id])

  const toggleSection = (key: string) =>
    setExpandedSections(s => ({ ...s, [key]: !s[key] }))

  const handleSubmitContribution = async () => {
    if (!user) return
    setSending(true)
    try {
      if (contributionType === 'comment' && contTargetEventId) {
        await addContribution({
          ownerId: share.owner_id,
          contributionType: 'comment',
          targetEntityType: 'event',
          targetEntityId: contTargetEventId,
          content: { text: commentText },
          perspectiveType: 'other_memory',
        })
      } else if (contributionType === 'memory') {
        await addContribution({
          ownerId: share.owner_id,
          contributionType: 'memory',
          title: contTitle || undefined,
          content: {
            description: contDescription,
            time_info: contTimeInfo || undefined,
            category: contCategory || undefined,
          },
          perspectiveType: perspective,
        })
      }
      setSent(true)
      setShowContributionForm(false)
      setContTitle('')
      setContDescription('')
      setContTimeInfo('')
      setContCategory('')
      setCommentText('')
      setContTargetEventId(null)
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      console.error('Contribution error:', err)
    } finally {
      setSending(false)
    }
  }

  // Sort events by time
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const ya = a.estimated_year || (a.exact_date ? parseInt(a.exact_date) : 9999)
      const yb = b.estimated_year || (b.exact_date ? parseInt(b.exact_date) : 9999)
      return ya - yb
    })
  }, [events])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <BookOpen className="w-5 h-5 text-primary" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">
            {share.owner_name || 'Valaki'} életútja
          </h2>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {PERMISSION_LABELS[share.permission_level].label}
          </p>
        </div>
        {sent && (
          <Badge className="bg-green-100 text-green-700 text-[10px] gap-1">
            <Check className="w-3 h-3" /> Elküldve!
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Life story text */}
        <div className="border-b">
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30"
            onClick={() => toggleSection('story')}
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Életút szöveg
            </span>
            {expandedSections.story ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.story && (
            <div className="px-4 pb-4">
              {lifeStory?.content ? (
                <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                  {lifeStory.content}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Még nincs életút szöveg.</p>
              )}
            </div>
          )}
        </div>

        {/* Events */}
        <div className="border-b">
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30"
            onClick={() => toggleSection('events')}
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Események ({events.length})
            </span>
            {expandedSections.events ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.events && (
            <div className="px-4 pb-4 space-y-2">
              {sortedEvents.map(event => (
                <div key={event.id} className="border rounded-lg p-3 bg-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{event.title}</span>
                        {event.category && (
                          <Badge variant="secondary" className="text-[10px]">{event.category}</Badge>
                        )}
                        {event.perspective_type && event.perspective_type !== 'own_memory' && (
                          <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600">
                            {PERSPECTIVE_LABELS[event.perspective_type as keyof typeof PERSPECTIVE_LABELS]?.badge}
                          </Badge>
                        )}
                      </div>
                      {(event.estimated_year || event.exact_date || event.life_phase) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.exact_date || event.estimated_year || event.life_phase}
                        </p>
                      )}
                      {event.narrative_text && (
                        <p className="text-sm text-foreground/80 mt-1">{event.narrative_text}</p>
                      )}
                      {event.description && !event.narrative_text && (
                        <p className="text-sm text-foreground/80 mt-1">{event.description}</p>
                      )}
                    </div>

                    {/* Comment button */}
                    {canComment && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          setContTargetEventId(event.id)
                          setContributionType('comment')
                          setShowContributionForm(true)
                        }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {events.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  Még nincsenek események.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Persons */}
        <div className="border-b">
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30"
            onClick={() => toggleSection('persons')}
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Személyek ({persons.length})
            </span>
            {expandedSections.persons ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.persons && (
            <div className="px-4 pb-4 space-y-1">
              {persons.map(person => (
                <div key={person.id} className="flex items-center gap-2 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                    {person.name[0]}
                  </div>
                  <span className="text-sm">{person.name}</span>
                  {person.relationship_type && (
                    <span className="text-xs text-muted-foreground">({person.relationship_type})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add contribution button */}
        {canContribute && !showContributionForm && (
          <div className="p-4">
            <Button
              className="w-full gap-2"
              onClick={() => {
                setContributionType('memory')
                setShowContributionForm(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Saját emlék hozzáadása
            </Button>
          </div>
        )}
      </div>

      {/* Contribution form (bottom sheet) */}
      {showContributionForm && (
        <div className="border-t bg-background shrink-0 p-4 space-y-3 max-h-[50vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              {contributionType === 'comment' ? (
                <><MessageSquare className="w-4 h-4" /> Megjegyzés hozzáadása</>
              ) : (
                <><PenLine className="w-4 h-4" /> Saját emlék hozzáadása</>
              )}
            </h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowContributionForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {contributionType === 'comment' ? (
            /* Comment form */
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Kapcsolódó esemény: {events.find(e => e.id === contTargetEventId)?.title}
              </p>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Írd le az emlékedet, megjegyzésedet..."
                className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={3}
                autoFocus
              />
              <Button
                className="w-full gap-1"
                disabled={!commentText.trim() || sending}
                onClick={handleSubmitContribution}
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Küldés...' : 'Megjegyzés elküldése'}
              </Button>
            </div>
          ) : (
            /* Memory form */
            <div className="space-y-3">
              {/* Perspective type */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Milyen típusú emlék?</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(
                    [
                      { value: 'other_memory', label: 'Az én emlékem róla' },
                      { value: 'shared_memory', label: 'Közös emlékünk' },
                      { value: 'disputed_memory', label: 'Más emlékszem rá' },
                    ] as { value: PerspectiveType; label: string }[]
                  ).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPerspective(opt.value)}
                      className={`px-2.5 py-1.5 text-xs rounded-full border transition-colors ${
                        perspective === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Cím</label>
                <input
                  type="text"
                  value={contTitle}
                  onChange={e => setContTitle(e.target.value)}
                  placeholder="pl. Közös nyaralásunk Horvátországban"
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Leírás</label>
                <textarea
                  value={contDescription}
                  onChange={e => setContDescription(e.target.value)}
                  placeholder="Mesélj az emlékről..."
                  className="w-full mt-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Mikor történt?</label>
                  <input
                    type="text"
                    value={contTimeInfo}
                    onChange={e => setContTimeInfo(e.target.value)}
                    placeholder="pl. 2005 nyara"
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Kategória</label>
                  <select
                    value={contCategory}
                    onChange={e => setContCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary bg-background"
                  >
                    <option value="">Válassz...</option>
                    <option value="family">Család</option>
                    <option value="relationship">Kapcsolat</option>
                    <option value="travel">Utazás</option>
                    <option value="career">Munkahely</option>
                    <option value="education">Tanulmányok</option>
                    <option value="health">Egészség</option>
                    <option value="sport">Sport</option>
                    <option value="entertainment">Szórakozás</option>
                    <option value="childhood">Gyermekkor</option>
                    <option value="other">Egyéb</option>
                  </select>
                </div>
              </div>

              <Button
                className="w-full gap-1"
                disabled={!contDescription.trim() || sending}
                onClick={handleSubmitContribution}
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Küldés...' : 'Emlék beküldése (jóváhagyásra vár)'}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                Az emléked jóváhagyásra kerül a tulajdonosnak, mielőtt megjelenik az életútban.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
