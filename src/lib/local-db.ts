/**
 * Local storage adapter for offline/local-only mode.
 * Mirrors the data model stored in Supabase, but keeps everything in localStorage.
 */
import { useAuthStore } from '@/stores/auth-store'

const PREFIX = 'lifechat_'

/** Check if the current user is in local storage mode */
export function isLocalMode(): boolean {
  const profile = useAuthStore.getState().profile
  return profile?.storage_preference === 'local'
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write<T>(key: string, data: T[]) {
  localStorage.setItem(PREFIX + key, JSON.stringify(data))
}

function readOne<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeOne<T>(key: string, data: T) {
  localStorage.setItem(PREFIX + key, JSON.stringify(data))
}

function genId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

export const localDb = {
  // ── Life Story ──────────────────────────────────────────────────
  getLifeStory: () => readOne<Record<string, unknown>>('life_story'),
  setLifeStory: (data: Record<string, unknown>) => writeOne('life_story', data),

  // ── Generic collections ─────────────────────────────────────────
  getAll: <T>(collection: string): T[] => read<T>(collection),

  upsert: <T extends { id?: string }>(collection: string, item: T): T & { id: string } => {
    const items = read<T & { id: string }>(collection)
    const id = item.id || genId()
    const withId = { ...item, id } as T & { id: string }
    const idx = items.findIndex(i => i.id === id)
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...withId }
    } else {
      items.push(withId)
    }
    write(collection, items)
    return idx >= 0 ? items[idx] : withId
  },

  update: <T extends { id: string }>(collection: string, id: string, updates: Partial<T>) => {
    const items = read<T>(collection)
    const idx = items.findIndex(i => (i as { id: string }).id === id)
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...updates }
      write(collection, items)
    }
  },

  remove: (collection: string, id: string) => {
    const items = read<{ id: string }>(collection)
    write(collection, items.filter(i => i.id !== id))
  },

  removeWhere: (collection: string, predicate: (item: Record<string, unknown>) => boolean) => {
    const items = read<Record<string, unknown>>(collection)
    write(collection, items.filter(i => !predicate(i)))
  },

  findByField: <T>(collection: string, field: string, value: unknown): T[] => {
    const items = read<Record<string, unknown>>(collection)
    return items.filter(i => i[field] === value) as T[]
  },

  genId,
  now,
}
