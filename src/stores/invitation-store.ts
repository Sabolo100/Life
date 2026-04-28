import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { isLocalStorageMode } from '@/lib/storage'
import type {
  Invitation,
  LifeStoryShare,
  Contribution,
  PermissionLevel,
  ContributionStatus,
  ContributionType,
  PerspectiveType,
} from '@/types'

interface InvitationState {
  // Owner's data
  invitations: Invitation[]
  outgoingShares: LifeStoryShare[]
  pendingContributions: Contribution[]
  allContributions: Contribution[]

  // Shared with me (I'm a guest on someone else's life story)
  incomingShares: LifeStoryShare[]

  loading: boolean

  // Owner actions
  loadInvitations: () => Promise<void>
  createInvitation: (params: {
    invitedEmail?: string
    invitedName?: string
    permissionLevel: PermissionLevel
    expiresAt?: string | null
  }) => Promise<{ data: Invitation | null; error: string | null }>
  revokeInvitation: (id: string) => Promise<void>
  revokeShare: (id: string) => Promise<void>
  updateSharePermission: (id: string, level: PermissionLevel) => Promise<void>

  // Contribution review (owner)
  loadContributions: () => Promise<void>
  reviewContribution: (
    id: string,
    decision: 'approved' | 'rejected' | 'modified',
    reviewerNotes?: string
  ) => Promise<void>

  // Received invitations (where I am the invited person)
  receivedInvitations: Invitation[]
  loadReceivedInvitations: () => Promise<void>

  // Guest actions
  loadIncomingShares: () => Promise<void>
  acceptInvitation: (token: string) => Promise<{ success: boolean; error?: string; share?: LifeStoryShare }>
  checkEmailInvitations: () => Promise<{ token: string }[]>
  addContribution: (params: {
    ownerId: string
    contributionType: ContributionType
    targetEntityType?: string
    targetEntityId?: string
    title?: string
    content: Record<string, unknown>
    perspectiveType: PerspectiveType
  }) => Promise<void>
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const useInvitationStore = create<InvitationState>((set, get) => ({
  invitations: [],
  outgoingShares: [],
  pendingContributions: [],
  allContributions: [],
  incomingShares: [],
  receivedInvitations: [],
  loading: false,

  // ── Owner: Load invitations & shares ──────────────────────────────

  loadInvitations: async () => {
    if (isLocalStorageMode()) {
      // Invitations/shares are not available in local mode
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const [invRes, sharesRes] = await Promise.all([
      supabase
        .from('invitations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('life_story_shares')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    // Enrich shares with profile names using RPC (bypasses RLS, includes email fallback)
    const shares = (sharesRes.data as LifeStoryShare[]) || []
    if (shares.length > 0) {
      const userIds = shares.map(s => s.shared_with_id)
      const { data: names } = await supabase.rpc('get_profile_display_names', {
        user_ids: userIds,
      })
      if (names && Array.isArray(names)) {
        const nameMap = new Map(names.map((n: { id: string; display_name: string }) => [n.id, n.display_name]))
        for (const share of shares) {
          share.shared_with_name = nameMap.get(share.shared_with_id) || undefined
        }
      }
    }

    set({
      invitations: (invRes.data as Invitation[]) || [],
      outgoingShares: shares,
    })
  },

  // ── Owner: Create invitation ──────────────────────────────────────

  createInvitation: async ({ invitedEmail, invitedName, permissionLevel, expiresAt }) => {
    if (isLocalStorageMode()) return { data: null, error: 'Meghívók nem érhetők el lokális módban.' }
    try {
      // Read user directly from auth store — no network call, no hanging
      const user = useAuthStore.getState().user
      if (!user) return { data: null, error: 'Nem vagy bejelentkezve.' }

      const token = generateToken()

      console.log('[createInvitation] inserting for user:', user.id)

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          user_id: user.id,
          invited_email: invitedEmail || null,
          invited_name: invitedName || null,
          token,
          permission_level: permissionLevel,
          status: 'pending',
          expires_at: expiresAt || null,
        })
        .select()
        .single()

      if (error) {
        console.error('[createInvitation] db error:', error)
        // Provide a human-readable hint for common failures
        let msg = error.message || 'Ismeretlen hiba'
        if (error.code === '42703') {
          msg = `Adatbázis hiba: hiányzó oszlop (${error.message}). Futtasd le a migrációkat a Supabase SQL szerkesztőben!`
        } else if (error.code === '42501' || error.message?.includes('row-level security')) {
          msg = `Jogosultsági hiba (RLS): ${error.message}`
        } else if (error.code) {
          msg = `${error.message} (kód: ${error.code})`
        }
        return { data: null, error: msg }
      }

      if (!data) {
        return { data: null, error: 'A szerver nem adott vissza adatot (INSERT sikerült, de SELECT nem). Ellenőrizd az RLS policy-t!' }
      }

      const invitation = data as Invitation
      set(state => ({ invitations: [invitation, ...state.invitations] }))
      return { data: invitation, error: null }
    } catch (err) {
      console.error('[createInvitation] exception:', err)
      return { data: null, error: `Kivétel: ${(err as Error).message || String(err)}` }
    }
  },

  // ── Owner: Revoke invitation ──────────────────────────────────────

  revokeInvitation: async (id) => {
    if (isLocalStorageMode()) {
      // Invitations/shares are not available in local mode
      return
    }
    await supabase.from('invitations').delete().eq('id', id)
    set(state => ({
      invitations: state.invitations.filter(i => i.id !== id),
    }))
  },

  // ── Owner: Revoke share ───────────────────────────────────────────

  revokeShare: async (id) => {
    if (isLocalStorageMode()) {
      // Invitations/shares are not available in local mode
      return
    }
    await supabase.from('life_story_shares').delete().eq('id', id)
    set(state => ({
      outgoingShares: state.outgoingShares.filter(s => s.id !== id),
    }))
  },

  // ── Owner: Update share permission ────────────────────────────────

  updateSharePermission: async (id, level) => {
    if (isLocalStorageMode()) {
      // Invitations/shares are not available in local mode
      return
    }
    await supabase
      .from('life_story_shares')
      .update({ permission_level: level })
      .eq('id', id)
    set(state => ({
      outgoingShares: state.outgoingShares.map(s =>
        s.id === id ? { ...s, permission_level: level } : s
      ),
    }))
  },

  // ── Owner: Load contributions ─────────────────────────────────────

  loadContributions: async () => {
    if (isLocalStorageMode()) {
      // Invitations/shares are not available in local mode
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const { data } = await supabase
      .from('contributions')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    const all = (data as Contribution[]) || []
    set({
      allContributions: all,
      pendingContributions: all.filter(c => c.status === 'pending'),
    })
  },

  // ── Owner: Review a contribution ──────────────────────────────────

  reviewContribution: async (id, decision, reviewerNotes) => {
    if (isLocalStorageMode()) {
      // Invitations/shares are not available in local mode
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const contribution = get().allContributions.find(c => c.id === id)
    if (!contribution) return

    // Update contribution status
    await supabase
      .from('contributions')
      .update({
        status: decision as ContributionStatus,
        reviewer_notes: reviewerNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    // If approved and it's a memory, create an event from it
    if (decision === 'approved' && contribution.contribution_type === 'memory') {
      const content = contribution.content as Record<string, string>

      // Parse time_info to extract year (e.g. "2005", "2005 nyara", "kb. 2010")
      let estimatedYear: number | null = content.estimated_year ? parseInt(content.estimated_year) : null
      let timeType = content.time_type || 'uncertain'
      const timeInfo = content.time_info || ''

      if (!estimatedYear && timeInfo) {
        const yearMatch = timeInfo.match(/\b(19|20)\d{2}\b/)
        if (yearMatch) {
          estimatedYear = parseInt(yearMatch[0])
          if (!content.time_type) timeType = 'estimated_year'
        }
      }

      await supabase.from('events').insert({
        user_id: user.id,
        title: contribution.title || content.description?.slice(0, 60) || 'Megosztott emlék',
        description: content.description || null,
        time_type: timeType,
        exact_date: content.exact_date || null,
        estimated_year: estimatedYear,
        life_phase: content.life_phase || null,
        uncertain_time: timeInfo || content.uncertain_time || null,
        category: content.category || '',
        source: 'invited_person',
        contributor_id: contribution.contributor_id,
        perspective_type: contribution.perspective_type,
        contribution_id: contribution.id,
        narrative_text: content.narrative_text || null,
      })
    }

    // If approved and it's a comment, we could store it differently
    // For now comments are stored as contributions and displayed inline

    // Refresh
    await get().loadContributions()
  },

  // ── Guest: Load received invitations (where my email was invited) ──

  loadReceivedInvitations: async () => {
    if (isLocalStorageMode()) {
      // Invitations/shares are not available in local mode
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user?.email) return

    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('invited_email', user.email)
      .order('created_at', { ascending: false })

    const invites = (data as Invitation[]) || []

    // Enrich with owner names using RPC (bypasses RLS, includes email fallback)
    if (invites.length > 0) {
      const ownerIds = invites.map(i => i.user_id)
      const { data: names } = await supabase.rpc('get_profile_display_names', {
        user_ids: ownerIds,
      })
      if (names && Array.isArray(names)) {
        const nameMap = new Map(names.map((n: { id: string; display_name: string }) => [n.id, n.display_name]))
        for (const inv of invites) {
          ;(inv as Invitation & { owner_name?: string }).owner_name = nameMap.get(inv.user_id) || undefined
        }
      }
    }

    set({ receivedInvitations: invites })
  },

  // ── Guest: Load incoming shares ───────────────────────────────────

  loadIncomingShares: async () => {
    if (isLocalStorageMode()) {
      // Invitations/shares are not available in local mode
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const { data } = await supabase
      .from('life_story_shares')
      .select('*')
      .eq('shared_with_id', user.id)

    const shares = (data as LifeStoryShare[]) || []

    // Enrich with owner names using RPC (bypasses RLS, includes email fallback)
    if (shares.length > 0) {
      const ownerIds = shares.map(s => s.owner_id)
      const { data: names } = await supabase.rpc('get_profile_display_names', {
        user_ids: ownerIds,
      })
      if (names && Array.isArray(names)) {
        const nameMap = new Map(names.map((n: { id: string; display_name: string }) => [n.id, n.display_name]))
        for (const share of shares) {
          share.owner_name = nameMap.get(share.owner_id) || undefined
        }
      }
    }

    set({ incomingShares: shares })
  },

  // ── Guest: Accept invitation (via Edge Function — bypasses RLS) ──

  acceptInvitation: async (token) => {
    if (isLocalStorageMode()) return { success: false, error: 'Meghívó elfogadása nem lehetséges lokális módban.' }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { success: false, error: 'Nem vagy bejelentkezve.' }

    try {
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: { token },
      })

      if (error) {
        // Try to extract the actual error message from the response body
        let msg = error.message
        try {
          // FunctionsHttpError has a context property with the response
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = (error as unknown as any).context
          if (ctx) {
            const body = await ctx.json()
            msg = body?.error || msg
          }
        } catch { /* ignore parse error */ }
        console.error('[acceptInvitation] function error:', msg)
        return { success: false, error: msg }
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Ismeretlen hiba.' }
      }

      // Reload incoming shares so sidebar updates immediately
      await get().loadIncomingShares()

      return { success: true, share: data.share as LifeStoryShare }
    } catch (err) {
      console.error('[acceptInvitation] error:', err)
      return { success: false, error: 'Hálózati hiba. Kérjük, próbáld újra.' }
    }
  },

  // ── Guest: Auto-accept all pending invitations matching user email ──

  checkEmailInvitations: async () => {
    if (isLocalStorageMode()) return []
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user?.email) return []

    // Find pending invitations for this email
    const { data } = await supabase
      .from('invitations')
      .select('token')
      .eq('invited_email', user.email)
      .eq('status', 'pending')

    if (!data || data.length === 0) return []

    const accepted: { token: string }[] = []
    for (const inv of data) {
      const result = await get().acceptInvitation(inv.token)
      if (result.success) {
        accepted.push({ token: inv.token })
      }
    }

    return accepted
  },

  // ── Guest: Add contribution ───────────────────────────────────────

  addContribution: async ({
    ownerId,
    contributionType,
    targetEntityType,
    targetEntityId,
    title,
    content,
    perspectiveType,
  }) => {
    if (isLocalStorageMode()) {
      // Invitations/shares are not available in local mode
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    // Get contributor's display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const { error } = await supabase
      .from('contributions')
      .insert({
        owner_id: ownerId,
        contributor_id: user.id,
        contributor_name: profile?.display_name || user.email || 'Ismeretlen',
        contribution_type: contributionType,
        target_entity_type: targetEntityType || null,
        target_entity_id: targetEntityId || null,
        title: title || null,
        content,
        perspective_type: perspectiveType,
        status: 'pending',
      })

    if (error) {
      console.error('[addContribution] error:', error)
      throw error
    }
  },
}))
