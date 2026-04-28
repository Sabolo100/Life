/**
 * Async storage adapter interface for "Saját adatbázis" mode.
 * Two implementations: Google Drive (gdrive-adapter) and File System Access API (fs-adapter).
 *
 * The cloud (Supabase) mode does NOT go through this interface — it has its own paths
 * in the stores. This adapter only abstracts the user-owned-storage backends.
 */

/** Known collection names that map 1:1 to Supabase tables. */
export type CollectionName =
  | 'chat_sessions'
  | 'messages'
  | 'persons'
  | 'events'
  | 'locations'
  | 'time_periods'
  | 'emotions'
  | 'open_questions'
  | 'family_relationships'

export interface StorageAdapter {
  /** Initialize / re-validate the backend connection. Call before first use. */
  initialize(): Promise<void>

  /** True if backend is connected, authenticated, and ready for read/write. */
  isConnected(): Promise<boolean>

  /** Human-readable description of where data lives. Shown in Header / Settings. */
  getDisplayLocation(): string

  // ── Life Story (single document) ──────────────────────────────────
  getLifeStory(): Promise<Record<string, unknown> | null>
  setLifeStory(data: Record<string, unknown>): Promise<void>

  // ── Generic collections (rows) ────────────────────────────────────
  getAll<T>(collection: CollectionName): Promise<T[]>

  upsert<T extends { id?: string }>(
    collection: CollectionName,
    item: T
  ): Promise<T & { id: string }>

  update<T extends { id: string }>(
    collection: CollectionName,
    id: string,
    updates: Partial<T>
  ): Promise<void>

  remove(collection: CollectionName, id: string): Promise<void>

  removeWhere(
    collection: CollectionName,
    predicate: (item: Record<string, unknown>) => boolean
  ): Promise<void>

  findByField<T>(
    collection: CollectionName,
    field: string,
    value: unknown
  ): Promise<T[]>

  // ── Utilities ─────────────────────────────────────────────────────
  genId(): string
  now(): string
}
