import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { LifeStory, Person, LifeEvent, Location, TimePeriod, Emotion, OpenQuestion } from '@/types'

interface LifeStoryState {
  lifeStory: LifeStory | null
  persons: Person[]
  events: LifeEvent[]
  locations: Location[]
  timePeriods: TimePeriod[]
  emotions: Emotion[]
  openQuestions: OpenQuestion[]
  loading: boolean
  loadAll: () => Promise<void>
  updateLifeStory: (content: string) => Promise<void>
  upsertEntities: (entities: {
    persons?: Partial<Person>[]
    events?: Partial<LifeEvent>[]
    locations?: Partial<Location>[]
    timePeriods?: Partial<TimePeriod>[]
    emotions?: Partial<Emotion>[]
  }) => Promise<void>
  updateOpenQuestions: (questions: Partial<OpenQuestion>[]) => Promise<void>
  geocodeLocation: (locationId: string) => Promise<void>
}

export const useLifeStoryStore = create<LifeStoryState>((set, get) => ({
  lifeStory: null,
  persons: [],
  events: [],
  locations: [],
  timePeriods: [],
  emotions: [],
  openQuestions: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false }); return }

    const [storyRes, personsRes, eventsRes, locationsRes, periodsRes, emotionsRes, questionsRes] = await Promise.all([
      supabase.from('life_stories').select('*').eq('user_id', user.id).single(),
      supabase.from('persons').select('*').eq('user_id', user.id).order('name'),
      supabase.from('events').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('locations').select('*').eq('user_id', user.id).order('name'),
      supabase.from('time_periods').select('*').eq('user_id', user.id),
      supabase.from('emotions').select('*').eq('user_id', user.id),
      supabase.from('open_questions').select('*').eq('user_id', user.id).eq('status', 'open').order('priority', { ascending: false }),
    ])

    set({
      lifeStory: storyRes.data as LifeStory | null,
      persons: (personsRes.data as Person[]) || [],
      events: (eventsRes.data as LifeEvent[]) || [],
      locations: (locationsRes.data as Location[]) || [],
      timePeriods: (periodsRes.data as TimePeriod[]) || [],
      emotions: (emotionsRes.data as Emotion[]) || [],
      openQuestions: (questionsRes.data as OpenQuestion[]) || [],
      loading: false,
    })
  },

  updateLifeStory: async (content) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const existing = get().lifeStory
    if (existing) {
      const { data } = await supabase
        .from('life_stories')
        .update({ content, last_updated: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (data) set({ lifeStory: data as LifeStory })
    } else {
      const { data } = await supabase
        .from('life_stories')
        .insert({ user_id: user.id, content, title: 'Az én életutam' })
        .select()
        .single()
      if (data) set({ lifeStory: data as LifeStory })
    }
  },

  upsertEntities: async (entities) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[upsertEntities] No authenticated user!')
      return
    }

    console.log('[upsertEntities] Starting upsert for user:', user.id, 'Entities:', {
      persons: entities.persons?.length || 0,
      events: entities.events?.length || 0,
      locations: entities.locations?.length || 0,
      emotions: entities.emotions?.length || 0,
    })

    if (entities.persons?.length) {
      const toInsert = entities.persons.map(p => ({ ...p, user_id: user.id }))
      const { error } = await supabase.from('persons').upsert(toInsert as Person[], { onConflict: 'user_id,name' })
      if (error) console.error('[upsertEntities] persons error:', error)
      else console.log('[upsertEntities] persons upserted:', toInsert.length)
    }
    if (entities.events?.length) {
      const toInsert = entities.events.map(e => ({ ...e, user_id: user.id }))
      const { error } = await supabase.from('events').upsert(toInsert as LifeEvent[], { onConflict: 'user_id,title' })
      if (error) console.error('[upsertEntities] events error:', error)
      else console.log('[upsertEntities] events upserted:', toInsert.length)
    }
    if (entities.locations?.length) {
      const toInsert = entities.locations.map(l => ({ ...l, user_id: user.id }))
      const { error } = await supabase.from('locations').upsert(toInsert as Location[], { onConflict: 'user_id,name' })
      if (error) console.error('[upsertEntities] locations error:', error)
      else console.log('[upsertEntities] locations upserted:', toInsert.length)
    }
    if (entities.timePeriods?.length) {
      const toInsert = entities.timePeriods.map(t => ({ ...t, user_id: user.id }))
      const { error } = await supabase.from('time_periods').upsert(toInsert as TimePeriod[], { onConflict: 'user_id,label' })
      if (error) console.error('[upsertEntities] timePeriods error:', error)
      else console.log('[upsertEntities] timePeriods upserted:', toInsert.length)
    }
    if (entities.emotions?.length) {
      const toInsert = entities.emotions.map(e => ({ ...e, user_id: user.id }))
      const { error } = await supabase.from('emotions').upsert(toInsert as Emotion[], { onConflict: 'user_id,feeling,event_id' })
      if (error) console.error('[upsertEntities] emotions error:', error)
      else console.log('[upsertEntities] emotions upserted:', toInsert.length)
    }

    await get().loadAll()
  },

  geocodeLocation: async (locationId: string) => {
    const location = get().locations.find(l => l.id === locationId)
    if (!location) return

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.name)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'EletutAI/1.0' } }
    )
    const results = await response.json()
    if (results.length > 0) {
      const { lat, lon } = results[0]
      const coordinates = { lat: parseFloat(lat), lng: parseFloat(lon) }
      await supabase
        .from('locations')
        .update({ coordinates })
        .eq('id', locationId)
      set(state => ({
        locations: state.locations.map(l =>
          l.id === locationId ? { ...l, coordinates } : l
        ),
      }))
    } else {
      throw new Error('Nem található')
    }
  },

  updateOpenQuestions: async (questions) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const q of questions) {
      if (q.id) {
        await supabase.from('open_questions').update(q).eq('id', q.id)
      } else {
        await supabase.from('open_questions').insert({ ...q, user_id: user.id })
      }
    }
    const { data } = await supabase
      .from('open_questions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('priority', { ascending: false })
    set({ openQuestions: (data as OpenQuestion[]) || [] })
  },
}))
