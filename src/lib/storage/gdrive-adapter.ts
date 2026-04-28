/**
 * Google Drive storage adapter.
 *
 * Uses Google Identity Services (GIS) for OAuth2 token flow with `drive.file` scope —
 * the app can ONLY access files it created itself, never the user's other Drive content.
 *
 * Data layout in the user's Drive:
 *   /Emlékkönyv/                      <- folder, ID stored in profiles.drive_folder_id
 *     life_story.json                 <- single LifeStory document
 *     chat_sessions.json              <- array of ChatSession
 *     messages.json                   <- array of Message
 *     persons.json
 *     events.json
 *     locations.json
 *     time_periods.json
 *     emotions.json
 *     open_questions.json
 *     family_relationships.json
 *
 * Each collection is rewritten in full on every write (debounced 500ms).
 * Reads cache the whole collection in memory for the session.
 *
 * Token flow: GIS popup the first time, silent refresh on expiry.
 *
 * GSI types are loaded via @types/google.accounts (added as devDep).
 * The script tag for `gsi/client` lives in index.html.
 */

import type { StorageAdapter, CollectionName } from './types'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'

const FOLDER_NAME = 'Emlékkönyv'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
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

// Minimal type defs for the parts of GSI we use, in case the global @types
// aren't installed yet in the workspace (dev-time `any` fallback).
interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
}
interface TokenClient {
  callback: (response: TokenResponse) => void
  requestAccessToken: (overrides?: { prompt?: string }) => void
}
interface GoogleAccounts {
  oauth2: {
    initTokenClient: (config: {
      client_id: string
      scope: string
      callback: (response: TokenResponse) => void
    }) => TokenClient
  }
}
declare global {
  interface Window {
    google?: { accounts: GoogleAccounts }
  }
}

class GoogleDriveAdapter implements StorageAdapter {
  private tokenClient: TokenClient | null = null
  private accessToken: string | null = null
  private tokenExpiresAt = 0
  private folderId: string | null = null
  private fileIdCache = new Map<string, string>() // filename -> Drive file ID
  private collectionCache = new Map<string, unknown[]>() // filename -> rows
  private lifeStoryCache: Record<string, unknown> | null | undefined = undefined // undefined = not yet loaded
  private writeTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private gisLoadPromise: Promise<void> | null = null

  // ── Initialization ────────────────────────────────────────────────

  async initialize(): Promise<void> {
    await this.ensureGisLoaded()
    this.folderId = useAuthStore.getState().profile?.drive_folder_id || null
    if (this.folderId && !this.accessToken) {
      // Silent token request — if the user already authorized us, this works without UI.
      await this.requestToken({ silent: true }).catch(() => {
        // Falls back to interactive on next call.
      })
    }
  }

  async isConnected(): Promise<boolean> {
    return Boolean(this.accessToken && this.folderId && Date.now() < this.tokenExpiresAt)
  }

  getDisplayLocation(): string {
    return `Google Drive · ${FOLDER_NAME}`
  }

  // ── Public: connect flow (called from OnboardingPage) ─────────────

  /**
   * Triggers the OAuth popup, creates the Emlékkönyv folder if missing,
   * and stores the folder ID in the user's Supabase profile.
   * Returns the folder ID on success.
   */
  async connectAndCreateFolder(): Promise<string> {
    await this.ensureGisLoaded()
    await this.requestToken({ silent: false })

    // Look for an existing Emlékkönyv folder we previously created
    const existing = await this.driveFetch(
      `/files?q=${encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`)}&fields=files(id,name)`,
    )
    let folderId: string | null = existing.files?.[0]?.id || null

    if (!folderId) {
      const created = await this.driveFetch('/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
      })
      folderId = created.id ?? null
    }

    if (!folderId) throw new Error('Drive mappa létrehozása sikertelen')

    this.folderId = folderId

    // Persist into the user's profile
    const userId = useAuthStore.getState().user?.id
    if (userId) {
      await supabase
        .from('profiles')
        .update({ drive_folder_id: folderId, updated_at: new Date().toISOString() })
        .eq('id', userId)
    }

    return folderId
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

  private ensureGisLoaded(): Promise<void> {
    if (this.gisLoadPromise) return this.gisLoadPromise
    this.gisLoadPromise = new Promise((resolve, reject) => {
      const check = () => {
        if (window.google?.accounts?.oauth2) {
          this.initTokenClient()
          resolve()
          return true
        }
        return false
      }
      if (check()) return
      const timeout = setTimeout(() => {
        clearInterval(interval)
        reject(new Error('Google Identity Services nem töltődött be (timeout). Ellenőrizd, hogy a gsi/client script benne van-e az index.html-ben.'))
      }, 5000)
      const interval = setInterval(() => {
        if (check()) {
          clearTimeout(timeout)
          clearInterval(interval)
        }
      }, 100)
    })
    return this.gisLoadPromise
  }

  private initTokenClient(): void {
    if (this.tokenClient) return
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID nincs beállítva — nézd meg a .env fájlt.')
    }
    this.tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: () => {/* overridden per-request */},
    })
  }

  private async requestToken(opts: { silent: boolean }): Promise<void> {
    if (!this.tokenClient) this.initTokenClient()
    return new Promise((resolve, reject) => {
      this.tokenClient!.callback = (resp) => {
        if (resp.error) {
          reject(new Error(`Google bejelentkezési hiba: ${resp.error}`))
          return
        }
        this.accessToken = resp.access_token
        this.tokenExpiresAt = Date.now() + resp.expires_in * 1000 - 60_000 // 60s safety buffer
        resolve()
      }
      this.tokenClient!.requestAccessToken({ prompt: opts.silent ? 'none' : '' })
    })
  }

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return
    // Try silent first; fall back to interactive.
    try {
      await this.requestToken({ silent: true })
    } catch {
      await this.requestToken({ silent: false })
    }
  }

  /** Generic Drive REST helper. Returns parsed JSON. */
  private async driveFetch(path: string, init: RequestInit = {}): Promise<{ files?: Array<{ id: string; name: string }>; id?: string; [k: string]: unknown }> {
    await this.ensureToken()
    const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${this.accessToken}`,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Drive API hiba (${res.status}): ${text.slice(0, 200)}`)
    }
    return res.json()
  }

  private async getOrCreateFileId(filename: string): Promise<string> {
    if (this.fileIdCache.has(filename)) return this.fileIdCache.get(filename)!
    if (!this.folderId) throw new Error('Drive folder ID hiányzik. Onboarding nem fejeződött be?')

    const search = await this.driveFetch(
      `/files?q=${encodeURIComponent(`'${this.folderId}' in parents and name='${filename}' and trashed=false`)}&fields=files(id,name)`,
    )
    let fileId: string | null = search.files?.[0]?.id || null

    if (!fileId) {
      const created = await this.driveFetch('/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: filename,
          parents: [this.folderId],
          mimeType: 'application/json',
        }),
      })
      fileId = created.id || null
    }

    if (!fileId) throw new Error(`Drive fájl létrehozása sikertelen: ${filename}`)
    this.fileIdCache.set(filename, fileId)
    return fileId
  }

  private async readJson<T>(filename: string): Promise<T> {
    await this.ensureToken()
    const fileId = await this.getOrCreateFileId(filename)
    // alt=media downloads the raw content
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } },
    )
    if (res.status === 404) return null as T
    if (!res.ok) {
      // Newly-created empty file returns 200 with empty body, but some accounts return 416 — handle both.
      if (res.status === 416) return (Array.isArray([] as unknown) ? [] : null) as T
      const text = await res.text()
      throw new Error(`Drive read error (${res.status}): ${text.slice(0, 200)}`)
    }
    const text = await res.text()
    if (!text.trim()) return null as T
    try {
      return JSON.parse(text) as T
    } catch {
      return null as T
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

  /** Debounce repeated writes to the same file (500ms) and combine them. */
  private scheduleWrite(filename: string, data: unknown): void {
    const existing = this.writeTimers.get(filename)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      this.writeTimers.delete(filename)
      this.writeJson(filename, data).catch(err => {
        console.error(`[gdrive-adapter] write failed for ${filename}:`, err)
      })
    }, 500)
    this.writeTimers.set(filename, timer)
  }

  private async writeJson(filename: string, data: unknown): Promise<void> {
    await this.ensureToken()
    const fileId = await this.getOrCreateFileId(filename)
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
    )
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Drive write error (${res.status}): ${text.slice(0, 200)}`)
    }
  }
}

export const gdriveAdapter = new GoogleDriveAdapter()
