import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { getAdapter } from '@/lib/storage'
import type { LifeStory, Person, LifeEvent, Location, TimePeriod, Emotion, OpenQuestion, FamilyRelationship, FamilyRelType } from '@/types'

interface LifeStoryState {
  lifeStory: LifeStory | null
  persons: Person[]
  events: LifeEvent[]
  locations: Location[]
  timePeriods: TimePeriod[]
  emotions: Emotion[]
  openQuestions: OpenQuestion[]
  familyRelationships: FamilyRelationship[]
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
  confirmLocation: (locationId: string) => Promise<void>
  updateLocationCoordinates: (locationId: string, coordinates: { lat: number; lng: number }) => Promise<void>
  deleteLocation: (id: string) => Promise<void>
  updateEvent: (id: string, updates: Partial<LifeEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  addPerson: (person: Partial<Person>) => Promise<void>
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>
  deletePerson: (id: string) => Promise<void>
  addFamilyRelationship: (fromPersonId: string | null, toPersonId: string | null, type: FamilyRelType) => Promise<void>
  batchAddFamilyRelationships: (entries: { fromPersonId: string | null; toPersonId: string | null; type: FamilyRelType }[]) => Promise<void>
  removeFamilyRelationship: (id: string) => Promise<void>
}

// ── Category normalization ─────────────────────────────────────────────────
const VALID_CATEGORIES = ['career', 'education', 'relationship', 'family', 'residence', 'travel', 'health', 'sport', 'childhood', 'entertainment', 'other']
const CATEGORY_ALIASES: Record<string, string> = {
  work: 'career', munka: 'career', munkahely: 'career', karrier: 'career', job: 'career',
  állás: 'career', cég: 'career', foglalkozás: 'career', bank: 'career', hivatal: 'career',
  iskola: 'education', egyetem: 'education', tanulmányok: 'education', school: 'education',
  tanulás: 'education', képzés: 'education', study: 'education',
  kapcsolat: 'relationship', házasság: 'relationship', marriage: 'relationship',
  partner: 'relationship', love: 'relationship', válás: 'relationship',
  család: 'family', születés: 'family', birth: 'family', loss: 'family',
  halál: 'family', gyerek: 'family', child: 'family',
  gyermekkor: 'childhood', gyerekkor: 'childhood',
  lakóhely: 'residence', költözés: 'residence', lakás: 'residence', ház: 'residence',
  otthon: 'residence', home: 'residence', moving: 'residence',
  utazás: 'travel', trip: 'travel', nyaralás: 'travel', kirándulás: 'travel', vacation: 'travel',
  egészség: 'health', betegség: 'health', kórház: 'health', hospital: 'health',
  illness: 'health', hardship: 'health',
  edzés: 'sport', fitness: 'sport', exercise: 'sport',
  szórakozás: 'entertainment', buli: 'entertainment', party: 'entertainment',
  koncert: 'entertainment', concert: 'entertainment', fesztivál: 'entertainment',
  festival: 'entertainment', mozi: 'entertainment', cinema: 'entertainment',
  hobby: 'entertainment', hobbi: 'entertainment',
  egyéb: 'other', misc: 'other', other: 'other',
}

function normalizeCategory(cat: string): string {
  const lower = (cat || '').toLowerCase().trim()
  if (VALID_CATEGORIES.includes(lower)) return lower
  const alias = CATEGORY_ALIASES[lower]
  if (alias) return alias
  for (const [key, target] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(key) || key.includes(lower)) return target
  }
  return lower
}

function normalizeEvents(events: LifeEvent[]): LifeEvent[] {
  return events.map(ev => {
    const newCat = normalizeCategory(ev.category)
    return newCat !== ev.category ? { ...ev, category: newCat } : ev
  })
}

/** Sanitize event dates and extract years from text fields */
function sanitizeEventDates(event: Partial<LifeEvent>): Partial<LifeEvent> {
  const e = { ...event }

  // Sanitize exact_date: must be YYYY-MM-DD format
  if (e.exact_date && !/^\d{4}-\d{2}-\d{2}$/.test(e.exact_date as string)) {
    const yearMatch = (e.exact_date as string).match(/(\d{4})/)
    if (yearMatch) {
      e.estimated_year = parseInt(yearMatch[1])
      e.life_phase = e.life_phase || (e.exact_date as string)
      e.time_type = 'estimated_year'
    }
    e.exact_date = null
  }

  // Ensure estimated_year is filled if we have a year anywhere
  if (!e.estimated_year || (e.estimated_year as number) < 1800) {
    const sources = [e.life_phase, e.description, e.uncertain_time]
    for (const src of sources) {
      if (!src) continue
      const m = (src as string).match(/(\d{4})/)
      if (m) {
        const y = parseInt(m[1])
        if (y > 1800 && y < 2100) {
          e.estimated_year = y
          e.time_type = e.time_type === 'life_phase' || e.time_type === 'uncertain' ? 'estimated_year' : (e.time_type || 'estimated_year')
          break
        }
      }
    }
  }

  return e
}

export const useLifeStoryStore = create<LifeStoryState>((set, get) => ({
  lifeStory: null,
  persons: [],
  events: [],
  locations: [],
  timePeriods: [],
  emotions: [],
  openQuestions: [],
  familyRelationships: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })

    const adapter = getAdapter()
    if (adapter) {
      const [lifeStory, persons, events, locations, timePeriods, emotions, openQuestions, familyRelationships] = await Promise.all([
        adapter.getLifeStory(),
        adapter.getAll<Person>('persons'),
        adapter.getAll<LifeEvent>('events'),
        adapter.getAll<Location>('locations'),
        adapter.getAll<TimePeriod>('time_periods'),
        adapter.getAll<Emotion>('emotions'),
        adapter.getAll<OpenQuestion>('open_questions'),
        adapter.getAll<FamilyRelationship>('family_relationships'),
      ])
      set({
        lifeStory: (lifeStory as LifeStory | null),
        persons,
        events: normalizeEvents(events),
        locations,
        timePeriods,
        emotions,
        openQuestions: openQuestions.filter(q => q.status === 'open'),
        familyRelationships,
        loading: false,
      })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false }); return }

    const [storyRes, personsRes, eventsRes, locationsRes, periodsRes, emotionsRes, questionsRes, famRelRes] = await Promise.all([
      supabase.from('life_stories').select('*').eq('user_id', user.id).single(),
      supabase.from('persons').select('*').eq('user_id', user.id).order('name'),
      supabase.from('events').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('locations').select('*').eq('user_id', user.id).order('name'),
      supabase.from('time_periods').select('*').eq('user_id', user.id),
      supabase.from('emotions').select('*').eq('user_id', user.id),
      supabase.from('open_questions').select('*').eq('user_id', user.id).eq('status', 'open').order('priority', { ascending: false }),
      supabase.from('family_relationships').select('*').eq('user_id', user.id),
    ])

    const rawEvents = (eventsRes.data as LifeEvent[]) || []
    const normalizedEvents = normalizeEvents(rawEvents)

    // Batch update mis-categorized events in DB (fire-and-forget)
    const eventsToUpdate = normalizedEvents.filter((ev, i) => ev.category !== rawEvents[i]?.category)
    for (const ev of eventsToUpdate) {
      supabase.from('events').update({ category: ev.category }).eq('id', ev.id).then(() => {})
    }

    set({
      lifeStory: storyRes.data as LifeStory | null,
      persons: (personsRes.data as Person[]) || [],
      events: normalizedEvents,
      locations: (locationsRes.data as Location[]) || [],
      timePeriods: (periodsRes.data as TimePeriod[]) || [],
      emotions: (emotionsRes.data as Emotion[]) || [],
      openQuestions: (questionsRes.data as OpenQuestion[]) || [],
      familyRelationships: (famRelRes.data as FamilyRelationship[]) || [],
      loading: false,
    })
  },

  updateLifeStory: async (content) => {
    const adapter = getAdapter()
    if (adapter) {
      const existing = get().lifeStory
      const story = existing
        ? { ...existing, content, last_updated: adapter.now() }
        : { id: adapter.genId(), content, title: 'Az én életutam', created_at: adapter.now(), last_updated: adapter.now() }
      await adapter.setLifeStory(story as unknown as Record<string, unknown>)
      set({ lifeStory: story as LifeStory })
      return
    }

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
    const adapter = getAdapter()
    if (adapter) {
      const userId = 'local'

      if (entities.persons?.length) {
        const existingPersons = await adapter.getAll<Person>('persons')
        for (const p of entities.persons) {
          const existing = existingPersons.find(ep => ep.name === p.name)
          if (existing) {
            await adapter.update<Person>('persons', existing.id, { ...p } as Partial<Person>)
          } else {
            await adapter.upsert('persons', { ...p, id: adapter.genId(), user_id: userId, created_at: adapter.now() })
          }
        }
      }
      if (entities.events?.length) {
        const existingEvents = await adapter.getAll<LifeEvent>('events')
        for (const e of entities.events) {
          const sanitized = sanitizeEventDates(e)
          const existing = existingEvents.find(ee => ee.title === e.title)
          if (existing) {
            await adapter.update<LifeEvent>('events', existing.id, { ...sanitized } as Partial<LifeEvent>)
          } else {
            await adapter.upsert('events', { ...sanitized, id: adapter.genId(), user_id: userId, created_at: adapter.now() })
          }
        }
      }
      if (entities.locations?.length) {
        const existingLocations = await adapter.getAll<Location>('locations')
        for (const l of entities.locations) {
          const existing = existingLocations.find(el => el.name === l.name)
          if (existing) {
            await adapter.update<Location>('locations', existing.id, { ...l } as Partial<Location>)
          } else {
            await adapter.upsert('locations', { ...l, id: adapter.genId(), user_id: userId })
          }
        }
      }
      if (entities.timePeriods?.length) {
        const existingPeriods = await adapter.getAll<TimePeriod>('time_periods')
        for (const t of entities.timePeriods) {
          const existing = existingPeriods.find(et => et.label === (t as { label?: string }).label)
          if (existing) {
            await adapter.update<TimePeriod>('time_periods', existing.id, { ...t } as Partial<TimePeriod>)
          } else {
            await adapter.upsert('time_periods', { ...t, id: adapter.genId(), user_id: userId })
          }
        }
      }
      if (entities.emotions?.length) {
        for (const em of entities.emotions) {
          await adapter.upsert('emotions', { ...em, id: adapter.genId(), user_id: userId })
        }
      }

      await get().loadAll()
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[upsertEntities] No authenticated user!')
      return
    }

    if (entities.persons?.length) {
      const toInsert = entities.persons.map(p => ({ ...p, user_id: user.id }))
      const { error } = await supabase.from('persons').upsert(toInsert as Person[], { onConflict: 'user_id,name' })
      if (error) console.error('[upsertEntities] persons error:', error)
    }
    if (entities.events?.length) {
      const toInsert = entities.events.map(e => sanitizeEventDates({ ...e, user_id: user.id }))
      const { error } = await supabase.from('events').upsert(toInsert as LifeEvent[], { onConflict: 'user_id,title' })
      if (error) console.error('[upsertEntities] events error:', error)
    }
    if (entities.locations?.length) {
      const toInsert = entities.locations.map(l => ({ ...l, user_id: user.id }))
      const { error } = await supabase.from('locations').upsert(toInsert as Location[], { onConflict: 'user_id,name' })
      if (error) console.error('[upsertEntities] locations error:', error)
    }
    if (entities.timePeriods?.length) {
      const toInsert = entities.timePeriods.map(t => ({ ...t, user_id: user.id }))
      const { error } = await supabase.from('time_periods').upsert(toInsert as TimePeriod[], { onConflict: 'user_id,label' })
      if (error) console.error('[upsertEntities] timePeriods error:', error)
    }
    if (entities.emotions?.length) {
      const toInsert = entities.emotions.map(e => ({ ...e, user_id: user.id }))
      const { error } = await supabase.from('emotions').upsert(toInsert as Emotion[], { onConflict: 'user_id,feeling,event_id' })
      if (error) console.error('[upsertEntities] emotions error:', error)
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

      const adapter = getAdapter()
      if (adapter) {
        await adapter.update<Location>('locations', locationId, { coordinates, coordinates_confirmed: false } as Partial<Location>)
      } else {
        await supabase
          .from('locations')
          .update({ coordinates, coordinates_confirmed: false })
          .eq('id', locationId)
      }

      set(state => ({
        locations: state.locations.map(l =>
          l.id === locationId ? { ...l, coordinates, coordinates_confirmed: false } : l
        ),
      }))
    } else {
      throw new Error('Nem található')
    }
  },

  confirmLocation: async (locationId) => {
    const adapter = getAdapter()
    if (adapter) {
      await adapter.update<Location>('locations', locationId, { coordinates_confirmed: true } as Partial<Location>)
    } else {
      await supabase
        .from('locations')
        .update({ coordinates_confirmed: true })
        .eq('id', locationId)
    }
    set(state => ({
      locations: state.locations.map(l =>
        l.id === locationId ? { ...l, coordinates_confirmed: true } : l
      ),
    }))
  },

  updateLocationCoordinates: async (locationId, coordinates) => {
    const adapter = getAdapter()
    if (adapter) {
      await adapter.update<Location>('locations', locationId, { coordinates, coordinates_confirmed: false } as Partial<Location>)
    } else {
      await supabase
        .from('locations')
        .update({ coordinates, coordinates_confirmed: false })
        .eq('id', locationId)
    }
    set(state => ({
      locations: state.locations.map(l =>
        l.id === locationId ? { ...l, coordinates, coordinates_confirmed: false } : l
      ),
    }))
  },

  updateOpenQuestions: async (questions) => {
    const adapter = getAdapter()
    if (adapter) {
      for (const q of questions) {
        if (q.id) {
          await adapter.update<OpenQuestion>('open_questions', q.id, q as Partial<OpenQuestion>)
        } else {
          await adapter.upsert('open_questions', { ...q, id: adapter.genId(), user_id: 'local', status: 'open' })
        }
      }
      const all = await adapter.getAll<OpenQuestion>('open_questions')
      set({ openQuestions: all.filter(q => q.status === 'open') })
      return
    }

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

  batchAddFamilyRelationships: async (entries) => {
    if (entries.length === 0) return

    const adapter = getAdapter()
    if (adapter) {
      const newRels: FamilyRelationship[] = entries.map(e => ({
        id: adapter.genId(),
        user_id: 'local',
        from_person_id: e.fromPersonId,
        to_person_id: e.toPersonId,
        relationship_type: e.type,
      } as unknown as FamilyRelationship))
      for (const r of newRels) {
        await adapter.upsert('family_relationships', r)
      }
      set(state => ({ familyRelationships: [...state.familyRelationships, ...newRels] }))
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const rows = entries.map(e => ({
      user_id: user.id,
      from_person_id: e.fromPersonId,
      to_person_id: e.toPersonId,
      relationship_type: e.type,
    }))
    const { data, error } = await supabase.from('family_relationships').insert(rows).select()
    if (error) { console.error('[batchAddFamilyRelationships] error:', error); return }
    if (data) {
      set(state => ({ familyRelationships: [...state.familyRelationships, ...(data as FamilyRelationship[])] }))
    }
  },

  addFamilyRelationship: async (fromPersonId, toPersonId, type) => {
    const adapter = getAdapter()
    if (adapter) {
      const rel = {
        id: adapter.genId(),
        user_id: 'local',
        from_person_id: fromPersonId,
        to_person_id: toPersonId,
        relationship_type: type,
      } as unknown as FamilyRelationship
      await adapter.upsert('family_relationships', rel)
      set(state => ({ familyRelationships: [...state.familyRelationships, rel] }))
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('family_relationships')
      .insert({
        user_id: user.id,
        from_person_id: fromPersonId,
        to_person_id: toPersonId,
        relationship_type: type,
      })
      .select()
      .single()
    if (error) { console.error('[addFamilyRelationship] error:', error); throw error }
    if (data) {
      set(state => ({ familyRelationships: [...state.familyRelationships, data as FamilyRelationship] }))
    }
  },

  deleteLocation: async (id) => {
    const eventsToFix = get().events.filter(e => e.location_id === id)

    const adapter = getAdapter()
    if (adapter) {
      for (const ev of eventsToFix) {
        await adapter.update<LifeEvent>('events', ev.id, { location_id: null } as Partial<LifeEvent>)
      }
      await adapter.remove('locations', id)
    } else {
      for (const ev of eventsToFix) {
        await supabase.from('events').update({ location_id: null }).eq('id', ev.id)
      }
      const { error } = await supabase.from('locations').delete().eq('id', id)
      if (error) { console.error('[deleteLocation] error:', error); throw error }
    }

    set(state => ({
      locations: state.locations.filter(l => l.id !== id),
      events: state.events.map(e => e.location_id === id ? { ...e, location_id: null } : e),
    }))
  },

  updateEvent: async (id, updates) => {
    const adapter = getAdapter()
    if (adapter) {
      await adapter.update<LifeEvent>('events', id, updates as Partial<LifeEvent>)
    } else {
      const { error } = await supabase.from('events').update(updates).eq('id', id)
      if (error) { console.error('[updateEvent] error:', error); throw error }
    }
    set(state => ({
      events: state.events.map(e => e.id === id ? { ...e, ...updates } : e),
    }))
  },

  deleteEvent: async (id) => {
    const adapter = getAdapter()
    if (adapter) {
      await adapter.removeWhere('emotions', i => i.event_id === id)
      await adapter.remove('events', id)
    } else {
      await supabase.from('emotions').delete().eq('event_id', id)
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) { console.error('[deleteEvent] error:', error); throw error }
    }
    set(state => ({
      events: state.events.filter(e => e.id !== id),
      emotions: state.emotions.filter(em => em.event_id !== id),
    }))
  },

  addPerson: async (person) => {
    const adapter = getAdapter()
    if (adapter) {
      const newPerson = await adapter.upsert('persons', {
        ...person,
        id: adapter.genId(),
        user_id: 'local',
        created_at: adapter.now(),
      })
      set(state => ({ persons: [...state.persons, newPerson as Person] }))
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('persons')
      .insert({ ...person, user_id: user.id })
      .select()
      .single()
    if (error) { console.error('[addPerson] error:', error); throw error }
    if (data) {
      set(state => ({ persons: [...state.persons, data as Person] }))
    }
  },

  updatePerson: async (id, updates) => {
    const adapter = getAdapter()
    if (adapter) {
      await adapter.update<Person>('persons', id, { ...updates, updated_at: adapter.now() } as Partial<Person>)
    } else {
      const { error } = await supabase
        .from('persons')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) { console.error('[updatePerson] error:', error); throw error }
    }
    set(state => ({
      persons: state.persons.map(p => p.id === id ? { ...p, ...updates } : p),
    }))
  },

  deletePerson: async (id) => {
    const adapter = getAdapter()
    if (adapter) {
      await adapter.remove('persons', id)
      await adapter.removeWhere('family_relationships', r => r.from_person_id === id || r.to_person_id === id)
      const eventsToFix = get().events.filter(e => e.person_ids?.includes(id))
      for (const ev of eventsToFix) {
        const newIds = ev.person_ids.filter(pid => pid !== id)
        await adapter.update<LifeEvent>('events', ev.id, { person_ids: newIds } as Partial<LifeEvent>)
      }
    } else {
      const { error } = await supabase.from('persons').delete().eq('id', id)
      if (error) { console.error('[deletePerson] error:', error); throw error }
      const eventsToFix = get().events.filter(e => e.person_ids?.includes(id))
      for (const ev of eventsToFix) {
        const newIds = ev.person_ids.filter(pid => pid !== id)
        await supabase.from('events').update({ person_ids: newIds }).eq('id', ev.id)
      }
    }

    set(state => ({
      persons: state.persons.filter(p => p.id !== id),
      familyRelationships: state.familyRelationships.filter(
        r => r.from_person_id !== id && r.to_person_id !== id
      ),
      events: state.events.map(e =>
        e.person_ids?.includes(id)
          ? { ...e, person_ids: e.person_ids.filter(pid => pid !== id) }
          : e
      ),
    }))
  },

  removeFamilyRelationship: async (id) => {
    const adapter = getAdapter()
    if (adapter) {
      await adapter.remove('family_relationships', id)
    } else {
      await supabase.from('family_relationships').delete().eq('id', id)
    }
    set(state => ({ familyRelationships: state.familyRelationships.filter(r => r.id !== id) }))
  },
}))
