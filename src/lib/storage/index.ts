/**
 * Storage adapter factory.
 *
 * Returns the active StorageAdapter for "Saját adatbázis" mode (gdrive or fs_local),
 * or null when the user is on cloud mode (Supabase) — in which case stores fall through
 * to their existing Supabase-backed branches.
 */

import { useAuthStore } from '@/stores/auth-store'
import { gdriveAdapter } from './gdrive-adapter'
import { fsAdapter, isFileSystemAccessSupported } from './fs-adapter'
import type { StorageAdapter } from './types'

export type { StorageAdapter, CollectionName } from './types'
export { gdriveAdapter, fsAdapter, isFileSystemAccessSupported }

/**
 * Returns the active adapter for the current user, or null in cloud mode.
 * Stores call this once per action and branch on the result.
 */
export function getAdapter(): StorageAdapter | null {
  const pref = useAuthStore.getState().profile?.storage_preference
  if (pref === 'gdrive') return gdriveAdapter
  if (pref === 'fs_local') return fsAdapter
  return null
}

/** True when the user picked one of the user-owned-storage backends (not cloud). */
export function isLocalStorageMode(): boolean {
  const pref = useAuthStore.getState().profile?.storage_preference
  return pref === 'gdrive' || pref === 'fs_local'
}

/**
 * Initialize the active adapter on app boot. Safe to call when no adapter is needed
 * (cloud mode) — it's a no-op then.
 */
export async function initializeActiveAdapter(): Promise<void> {
  const adapter = getAdapter()
  if (!adapter) return
  try {
    await adapter.initialize()
  } catch (err) {
    console.warn('[storage] adapter initialize failed:', err)
  }
}
