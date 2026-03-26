import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
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
  }) => Promise<Invitation | null>
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

  // Guest actions
  loadIncomingShares: () => Promise<void>
  acceptInvitation: (token: string) => Promise<{ success: boolean; error?: string; share?: LifeStoryShare }>
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
  loading: false,

  // ── Owner: Load invitations & shares ──────────────────────────────

  loadInvitations: async () => {
    const { data: { user } } = await supabase.auth.getUser()
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

    // Enrich shares with profile names
    const shares = (sharesRes.data as LifeStoryShare[]) || []
    if (shares.length > 0) {
      const userIds = shares.map(s => s.shared_with_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)
      if (profiles) {
        const nameMap = new Map(profiles.map(p => [p.id, p.display_name]))
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const token = generateToken()

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
      console.error('[createInvitation] error:', error)
      return null
    }

    const invitation = data as Invitation
    set(state => ({ invitations: [invitation, ...state.invitations] }))
    return invitation
  },

  // ── Owner: Revoke invitation ──────────────────────────────────────

  revokeInvitation: async (id) => {
    await supabase.from('invitations').delete().eq('id', id)
    set(state => ({
      invitations: state.invitations.filter(i => i.id !== id),
    }))
  },

  // ── Owner: Revoke share ───────────────────────────────────────────

  revokeShare: async (id) => {
    await supabase.from('life_story_shares').delete().eq('id', id)
    set(state => ({
      outgoingShares: state.outgoingShares.filter(s => s.id !== id),
    }))
  },

  // ── Owner: Update share permission ────────────────────────────────

  updateSharePermission: async (id, level) => {
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
    const { data: { user } } = await supabase.auth.getUser()
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
    const { data: { user } } = await supabase.auth.getUser()
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
      await supabase.from('events').insert({
        user_id: user.id,
        title: contribution.title || content.description?.slice(0, 60) || 'Megosztott emlék',
        description: content.description || null,
        time_type: content.time_type || 'uncertain',
        exact_date: content.exact_date || null,
        estimated_year: content.estimated_year ? parseInt(content.estimated_year) : null,
        life_phase: content.life_phase || null,
        uncertain_time: content.uncertain_time || null,
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

  // ── Guest: Load incoming shares ───────────────────────────────────

  loadIncomingShares: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('life_story_shares')
      .select('*')
      .eq('shared_with_id', user.id)

    const shares = (data as LifeStoryShare[]) || []

    // Enrich with owner names
    if (shares.length > 0) {
      const ownerIds = shares.map(s => s.owner_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', ownerIds)
      if (profiles) {
        const nameMap = new Map(profiles.map(p => [p.id, p.display_name]))
        for (const share of shares) {
          share.owner_name = nameMap.get(share.owner_id) || undefined
        }
      }
    }

    set({ incomingShares: shares })
  },

  // ── Guest: Accept invitation (via Edge Function — bypasses RLS) ──

  acceptInvitation: async (token) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { success: false, error: 'Nem vagy bejelentkezve.' }

    try {
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: { token },
      })

      if (error) {
        // Supabase functions.invoke wraps HTTP errors
        const msg = (data as { error?: string })?.error || error.message || 'Hiba történt.'
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
    const { data: { user } } = await supabase.auth.getUser()
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
