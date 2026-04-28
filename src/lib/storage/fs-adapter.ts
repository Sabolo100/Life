/**
 * File System Access API storage adapter.
 *
 * Desktop Chrome/Edge (and eventually Firefox) only — feature-detected via
 * `'showDirectoryPicker' in window`. iOS Safari and most mobile browsers don't have it,
 * so the OnboardingPage hides this option there.
 *
 * Flow:
 *   1) Onboarding calls `connectAndPickFolder()` → showDirectoryPicker().
 *   2) The returned FileSystemDirectoryHandle is stored in IndexedDB (handles cannot be
 *      serialized to localStorage). Profile gets storage_preference='fs_local'.
 *   3) On reload, we restore the handle from IDB and call `queryPermission`. If not
 *      already granted, the app must call `requestPermissionInteractive()` from a
 *      user-gesture (click) — typically a "Hozzáférés engedélyezése" button on app boot.
 *
 * Data files: same 10 JSON-per-collection layout as Drive adapter.
 */

import type { StorageAdapter, CollectionName } from './types'
import { openDB, type IDBPDatabase } from 'idb'

const IDB_NAME = 'lifechat-fs'
const IDB_STORE = 'handles'
const IDB_KEY = 'root_dir'

const FILE_NAMES: Record<CollectionName | 'life_story', string> = {
  chat_sessions: 'chat_sessions.json',
  messages: 'messages.json',
  persons: 'persons.json',
  events: 'events.json',
  locations: 'locations.json',
  time_periods: 'time_periods.json',
  emotions: 'emotions.json',
  open_questions: 'open_questions.json',
  family_relationships: 'family_relationships.json',
  life_story: 'life_story.json',
}

// Minimal feature-detection types for FileSystem Access API
// (TS DOM lib has FileSystemDirectoryHandle but not always the permission helpers).
interface PermissionHandle {
  queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
  }
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

class FileSystemAdapter implements StorageAdapter {
  private rootHandle: FileSystemDirectoryHandle | null = null
  private displayName = 'Saját mappa'
  private collectionCache = new Map<string, unknown[]>()
  private lifeStoryCache: Record<string, unknown> | null | undefined = undefined
  private writeTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private dbPromise: Promise<IDBPDatabase> | null = null

  // ── Initialization ────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (!isFileSystemAccessSupported()) {
      throw new Error('A böngésződ nem támogatja a File System Access API-t.')
    }
    if (this.rootHandle) return
    this.rootHandle = await this.loadHandleFromIdb()
    if (this.rootHandle) {
      this.displayName = this.rootHandle.name
      // We don't auto-request permission here (requires user gesture).
      // Stores will check isConnected and prompt if needed.
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.rootHandle) return false
    const state = await this.queryPermission()
    return state === 'granted'
  }

  getDisplayLocation(): string {
    return this.rootHandle ? `Saját mappa · ${this.displayName}` : 'Saját mappa (nincs kiválasztva)'
  }

  // ── Public: connect flow (called from OnboardingPage) ─────────────

  async connectAndPickFolder(): Promise<void> {
    if (!isFileSystemAccessSupported()) {
      throw new Error('A böngésződ nem támogatja a File System Access API-t.')
    }
    const handle = await window.showDirectoryPicker!({ mode: 'readwrite' })
    this.rootHandle = handle
    this.displayName = handle.name
    await this.saveHandleToIdb(handle)
  }

  /** Re-prompt permission. Must be called from a click handler (user gesture). */
  async requestPermissionInteractive(): Promise<boolean> {
    if (!this.rootHandle) return false
    const handle = this.rootHandle as FileSystemDirectoryHandle & PermissionHandle
    if (!handle.requestPermission) return true
    const state = await handle.requestPermission({ mode: 'readwrite' })
    return state === 'granted'
  }

  // ── StorageAdapter: life story ────────────────────────────────────

  async getLifeStory(): Promise<Record<string, unknown> | null> {
    if (this.lifeStoryCache !== undefined) return this.lifeStoryCache
    const data = await this.readJson<Record<string, unknown> | null>(FILE_NAMES.life_story)
    this.lifeStoryCache = data
    return data
  }

  async setLifeStory(data: Record<string, unknown>): Promise<void> {
    this.lifeStoryCache = data
    this.scheduleWrite(FILE_NAMES.life_story, data)
  }

  // ── StorageAdapter: collections ───────────────────────────────────

  async getAll<T>(collection: CollectionName): Promise<T[]> {
    return this.readCollection<T>(collection)
  }

  async upsert<T extends { id?: string }>(
    collection: CollectionName,
    item: T,
  ): Promise<T & { id: string }> {
    const items = await this.readCollection<T & { id: string }>(collection)
    const id = item.id || this.genId()
    const withId = { ...item, id } as T & { id: string }
    const idx = items.findIndex(i => i.id === id)
    if (idx >= 0) items[idx] = { ...items[idx], ...withId }
    else items.push(withId)
    this.collectionCache.set(FILE_NAMES[collection], items)
    this.scheduleWrite(FILE_NAMES[collection], items)
    return idx >= 0 ? items[idx] : withId
  }

  async update<T extends { id: string }>(
    collection: CollectionName,
    id: string,
    updates: Partial<T>,
  ): Promise<void> {
    const items = await this.readCollection<T>(collection)
    const idx = items.findIndex(i => (i as { id: string }).id === id)
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...updates }
      this.collectionCache.set(FILE_NAMES[collection], items)
      this.scheduleWrite(FILE_NAMES[collection], items)
    }
  }

  async remove(collection: CollectionName, id: string): Promise<void> {
    const items = await this.readCollection<{ id: string }>(collection)
    const filtered = items.filter(i => i.id !== id)
    this.collectionCache.set(FILE_NAMES[collection], filtered)
    this.scheduleWrite(FILE_NAMES[collection], filtered)
  }

  async removeWhere(
    collection: CollectionName,
    predicate: (item: Record<string, unknown>) => boolean,
  ): Promise<void> {
    const items = await this.readCollection<Record<string, unknown>>(collection)
    const filtered = items.filter(i => !predicate(i))
    this.collectionCache.set(FILE_NAMES[collection], filtered)
    this.scheduleWrite(FILE_NAMES[collection], filtered)
  }

  async findByField<T>(
    collection: CollectionName,
    field: string,
    value: unknown,
  ): Promise<T[]> {
    const items = await this.readCollection<Record<string, unknown>>(collection)
    return items.filter(i => i[field] === value) as T[]
  }

  genId(): string {
    return crypto.randomUUID()
  }

  now(): string {
    return new Date().toISOString()
  }

  // ── Internal helpers ──────────────────────────────────────────────

  private async getDb(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(IDB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE)
          }
        },
      })
    }
    return this.dbPromise
  }

  private async loadHandleFromIdb(): Promise<FileSystemDirectoryHandle | null> {
    const db = await this.getDb()
    const handle = (await db.get(IDB_STORE, IDB_KEY)) as FileSystemDirectoryHandle | undefined
    return handle || null
  }

  private async saveHandleToIdb(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await this.getDb()
    await db.put(IDB_STORE, handle, IDB_KEY)
  }

  private async queryPermission(): Promise<PermissionState | 'unknown'> {
    if (!this.rootHandle) return 'unknown'
    const handle = this.rootHandle as FileSystemDirectoryHandle & PermissionHandle
    if (!handle.queryPermission) return 'granted' // older spec, assume OK
    return handle.queryPermission({ mode: 'readwrite' })
  }

  private async ensureWritableHandle(): Promise<FileSystemDirectoryHandle> {
    if (!this.rootHandle) {
      throw new Error('Saját mappa nincs kiválasztva — onboardingban válassz egyet.')
    }
    const state = await this.queryPermission()
    if (state !== 'granted') {
      throw new Error('A mappához nincs hozzáférésed — kattints a "Hozzáférés engedélyezése" gombra.')
    }
    return this.rootHandle
  }

  private async readJson<T>(filename: string): Promise<T> {
    const root = await this.ensureWritableHandle()
    try {
      const fileHandle = await root.getFileHandle(filename, { create: false })
      const file = await fileHandle.getFile()
      const text = await file.text()
      if (!text.trim()) return null as T
      return JSON.parse(text) as T
    } catch (err) {
      if ((err as DOMException)?.name === 'NotFoundError') return null as T
      throw err
    }
  }

  private async readCollection<T>(collection: CollectionName): Promise<T[]> {
    const filename = FILE_NAMES[collection]
    if (this.collectionCache.has(filename)) {
      return this.collectionCache.get(filename) as T[]
    }
    const data = await this.readJson<T[] | null>(filename)
    const arr = Array.isArray(data) ? data : []
    this.collectionCache.set(filename, arr)
    return arr
  }

  private scheduleWrite(filename: string, data: unknown): void {
    const existing = this.writeTimers.get(filename)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      this.writeTimers.delete(filename)
      this.writeJson(filename, data).catch(err => {
        console.error(`[fs-adapter] write failed for ${filename}:`, err)
      })
    }, 500)
    this.writeTimers.set(filename, timer)
  }

  private async writeJson(filename: string, data: unknown): Promise<void> {
    const root = await this.ensureWritableHandle()
    const fileHandle = await root.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
  }
}

export const fsAdapter = new FileSystemAdapter()
