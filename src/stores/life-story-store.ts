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
    if (!user) return

    if (entities.persons?.length) {
      const toInsert = entities.persons.map(p => ({ ...p, user_id: user.id }))
      await supabase.from('persons').upsert(toInsert as Person[])
    }
    if (entities.events?.length) {
      const toInsert = entities.events.map(e => ({ ...e, user_id: user.id }))
      await supabase.from('events').upsert(toInsert as LifeEvent[])
    }
    if (entities.locations?.length) {
      const toInsert = entities.locations.map(l => ({ ...l, user_id: user.id }))
      await supabase.from('locations').upsert(toInsert as Location[])
    }
    if (entities.timePeriods?.length) {
      const toInsert = entities.timePeriods.map(t => ({ ...t, user_id: user.id }))
      await supabase.from('time_periods').upsert(toInsert as TimePeriod[])
    }
    if (entities.emotions?.length) {
      const toInsert = entities.emotions.map(e => ({ ...e, user_id: user.id }))
      await supabase.from('emotions').upsert(toInsert as Emotion[])
    }

    await get().loadAll()
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
