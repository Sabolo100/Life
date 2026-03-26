import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
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
  addPerson: (person: Partial<Person>) => Promise<void>
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>
  deletePerson: (id: string) => Promise<void>
  addFamilyRelationship: (fromPersonId: string | null, toPersonId: string | null, type: FamilyRelType) => Promise<void>
  batchAddFamilyRelationships: (entries: { fromPersonId: string | null; toPersonId: string | null; type: FamilyRelType }[]) => Promise<void>
  removeFamilyRelationship: (id: string) => Promise<void>
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

    // Normalize event categories to canonical values
    const rawEvents = (eventsRes.data as LifeEvent[]) || []
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

    const eventsToUpdate: { id: string; category: string }[] = []
    const normalizedEvents = rawEvents.map(ev => {
      const cat = (ev.category || '').toLowerCase().trim()
      if (VALID_CATEGORIES.includes(cat)) return ev // already valid

      // Try alias map
      let newCat = CATEGORY_ALIASES[cat]
      // Try partial match
      if (!newCat) {
        for (const [alias, target] of Object.entries(CATEGORY_ALIASES)) {
          if (cat.includes(alias) || alias.includes(cat)) { newCat = target; break }
        }
      }
      if (newCat && newCat !== ev.category) {
        eventsToUpdate.push({ id: ev.id, category: newCat })
        return { ...ev, category: newCat }
      }
      return ev
    })

    // Batch update mis-categorized events in DB (fire-and-forget)
    if (eventsToUpdate.length > 0) {
      for (const { id, category } of eventsToUpdate) {
        supabase.from('events').update({ category }).eq('id', id).then(() => {})
      }
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
      const toInsert = entities.events.map(e => {
        const event = { ...e, user_id: user.id }

        // Sanitize exact_date: must be YYYY-MM-DD format, otherwise move to estimated_year
        if (event.exact_date && !/^\d{4}-\d{2}-\d{2}$/.test(event.exact_date as string)) {
          const yearMatch = (event.exact_date as string).match(/(\d{4})/)
          if (yearMatch) {
            event.estimated_year = parseInt(yearMatch[1])
            event.life_phase = event.life_phase || (event.exact_date as string)
            event.time_type = 'estimated_year'
          }
          event.exact_date = null
          console.log('[upsertEntities] Sanitized invalid exact_date to estimated_year:', event.estimated_year)
        }

        // Ensure estimated_year is filled if we have a year anywhere
        if (!event.estimated_year || (event.estimated_year as number) < 1800) {
          // Try to extract from life_phase (e.g. "2000-2010", "2000")
          if (event.life_phase) {
            const m = (event.life_phase as string).match(/(\d{4})/)
            if (m) {
              event.estimated_year = parseInt(m[1])
              if (event.time_type === 'life_phase' || event.time_type === 'uncertain') {
                event.time_type = 'estimated_year'
              }
              console.log('[upsertEntities] Extracted year from life_phase:', event.estimated_year)
            }
          }
          // Try from description
          if ((!event.estimated_year || (event.estimated_year as number) < 1800) && event.description) {
            const m = (event.description as string).match(/(\d{4})/)
            if (m) {
              const y = parseInt(m[1])
              if (y > 1800 && y < 2100) {
                event.estimated_year = y
                event.time_type = 'estimated_year'
                console.log('[upsertEntities] Extracted year from description:', y)
              }
            }
          }
          // Try from uncertain_time
          if ((!event.estimated_year || (event.estimated_year as number) < 1800) && event.uncertain_time) {
            const m = (event.uncertain_time as string).match(/(\d{4})/)
            if (m) {
              const y = parseInt(m[1])
              if (y > 1800 && y < 2100) {
                event.estimated_year = y
                event.time_type = 'estimated_year'
                console.log('[upsertEntities] Extracted year from uncertain_time:', y)
              }
            }
          }
        }

        return event
      })
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
        .update({ coordinates, coordinates_confirmed: false })
        .eq('id', locationId)
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
    await supabase
      .from('locations')
      .update({ coordinates_confirmed: true })
      .eq('id', locationId)
    set(state => ({
      locations: state.locations.map(l =>
        l.id === locationId ? { ...l, coordinates_confirmed: true } : l
      ),
    }))
  },

  updateLocationCoordinates: async (locationId, coordinates) => {
    await supabase
      .from('locations')
      .update({ coordinates, coordinates_confirmed: false })
      .eq('id', locationId)
    set(state => ({
      locations: state.locations.map(l =>
        l.id === locationId ? { ...l, coordinates, coordinates_confirmed: false } : l
      ),
    }))
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

  batchAddFamilyRelationships: async (entries) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || entries.length === 0) return
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

  addPerson: async (person) => {
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
    const { error } = await supabase
      .from('persons')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { console.error('[updatePerson] error:', error); throw error }
    set(state => ({
      persons: state.persons.map(p => p.id === id ? { ...p, ...updates } : p),
    }))
  },

  deletePerson: async (id) => {
    // 1. Delete the person (family_relationships cascade automatically via FK)
    const { error } = await supabase.from('persons').delete().eq('id', id)
    if (error) { console.error('[deletePerson] error:', error); throw error }

    // 2. Clean up person_ids arrays in events (not FK-constrained)
    const eventsToFix = get().events.filter(e => e.person_ids?.includes(id))
    for (const ev of eventsToFix) {
      const newIds = ev.person_ids.filter(pid => pid !== id)
      await supabase.from('events').update({ person_ids: newIds }).eq('id', ev.id)
    }

    // 3. Update local state
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
    await supabase.from('family_relationships').delete().eq('id', id)
    set(state => ({ familyRelationships: state.familyRelationships.filter(r => r.id !== id) }))
  },
}))
