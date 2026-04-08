import { useEffect, useState } from 'react'
import { useInvitationStore } from '@/stores/invitation-store'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, UserPlus, Copy, Check, X, Trash2, Clock, Eye,
  MessageSquare, PenLine, Edit3,
  Link2, Mail, Shield, Users, Bell, CheckCircle2, XCircle, AlertCircle, Inbox,
} from 'lucide-react'
import type {
  PermissionLevel, Contribution, Invitation,
} from '@/types'
import { PERMISSION_LABELS, PERSPECTIVE_LABELS } from '@/types'

// ── Permission selector ─────────────────────────────────────────────

function PermissionSelect({
  value,
  onChange,
}: {
  value: PermissionLevel
  onChange: (v: PermissionLevel) => void
}) {
  const levels: PermissionLevel[] = ['reader', 'commenter', 'contributor', 'editor']
  return (
    <div className="space-y-1">
      {levels.map(level => (
        <button
          key={level}
          onClick={() => onChange(level)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            value === level
              ? 'bg-primary/10 border border-primary/30 text-primary'
              : 'hover:bg-muted border border-transparent'
          }`}
        >
          <div className="font-medium">{PERMISSION_LABELS[level].label}</div>
          <div className="text-xs text-muted-foreground">{PERMISSION_LABELS[level].description}</div>
        </button>
      ))}
    </div>
  )
}

// ── Permission icon ─────────────────────────────────────────────────

function PermissionIcon({ level }: { level: PermissionLevel }) {
  switch (level) {
    case 'reader': return <Eye className="w-3.5 h-3.5" />
    case 'commenter': return <MessageSquare className="w-3.5 h-3.5" />
    case 'contributor': return <PenLine className="w-3.5 h-3.5" />
    case 'editor': return <Edit3 className="w-3.5 h-3.5" />
  }
}

// ── Main component ──────────────────────────────────────────────────

interface InvitationManagerProps {
  onBack: () => void
}

export function InvitationManager({ onBack }: InvitationManagerProps) {
  const {
    invitations, outgoingShares, pendingContributions, allContributions,
    receivedInvitations,
    loadInvitations, createInvitation, revokeInvitation, revokeShare,
    updateSharePermission, loadContributions, reviewContribution,
    loadReceivedInvitations, acceptInvitation,
  } = useInvitationStore()

  const { events, persons } = useLifeStoryStore()
  const { profile } = useAuthStore()

  const [tab, setTab] = useState<'invite' | 'shares' | 'contributions' | 'received'>('invite')
  const [creating, setCreating] = useState(false)
  const [invitedName, setInvitedName] = useState('')
  const [invitedEmail, setInvitedEmail] = useState('')
  const [permission, setPermission] = useState<PermissionLevel>('reader')
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const [acceptingToken, setAcceptingToken] = useState<string | null>(null)

  useEffect(() => {
    loadInvitations()
    loadContributions()
    loadReceivedInvitations()
  }, [loadInvitations, loadContributions, loadReceivedInvitations])

  const pendingReceivedCount = receivedInvitations.filter(i => i.status === 'pending').length

  const handleAcceptReceived = async (inv: Invitation) => {
    setAcceptingToken(inv.token)
    await acceptInvitation(inv.token)
    await loadReceivedInvitations()
    setAcceptingToken(null)
  }

  const appUrl = window.location.origin

  const handleCreate = async () => {
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
      : null

    const inv = await createInvitation({
      invitedName: invitedName || undefined,
      invitedEmail: invitedEmail || undefined,
      permissionLevel: permission,
      expiresAt,
    })

    if (inv) {
      setCreating(false)
      setInvitedName('')
      setInvitedEmail('')
      setPermission('reader')
      setExpiresInDays(null)
    }
  }

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(`${appUrl}?invite=${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleReview = async (id: string, decision: 'approved' | 'rejected' | 'modified') => {
    await reviewContribution(id, decision, reviewNotes || undefined)
    setReviewingId(null)
    setReviewNotes('')
  }

  const pendingInvitations = invitations.filter(i => i.status === 'pending')
  const acceptedInvitations = invitations.filter(i => i.status === 'accepted')

  // Find entity name for contribution target
  const getTargetName = (c: Contribution) => {
    if (!c.target_entity_id) return null
    if (c.target_entity_type === 'event') {
      return events.find(e => e.id === c.target_entity_id)?.title
    }
    if (c.target_entity_type === 'person') {
      return persons.find(p => p.id === c.target_entity_id)?.name
    }
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Meghívók & Megosztás</h2>
        {pendingContributions.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {pendingContributions.length} jóváhagyásra vár
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b flex shrink-0">
        <button
          onClick={() => setTab('invite')}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'invite'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserPlus className="w-4 h-4 inline mr-1.5" />
          Meghívók
        </button>
        <button
          onClick={() => setTab('shares')}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'shares'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-1.5" />
          Hozzáférések ({outgoingShares.length})
        </button>
        <button
          onClick={() => setTab('contributions')}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${
            tab === 'contributions'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-1.5" />
          Hozzájárulások
          {pendingContributions.length > 0 && (
            <span className="absolute -top-0.5 right-2 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center">
              {pendingContributions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('received')}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${
            tab === 'received'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Inbox className="w-4 h-4 inline mr-1.5" />
          Kapott
          {pendingReceivedCount > 0 && (
            <span className="absolute -top-0.5 right-2 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center">
              {pendingReceivedCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ── INVITE TAB ────────────────────────────────────────── */}
        {tab === 'invite' && (
          <div className="space-y-4">
            {/* Create new invitation */}
            {!creating ? (
              <Button onClick={() => setCreating(true)} className="w-full gap-2">
                <UserPlus className="w-4 h-4" />
                Új meghívó létrehozása
              </Button>
            ) : (
              <div className="border rounded-xl p-4 space-y-3 bg-card">
                <h3 className="font-medium text-sm">Új meghívó</h3>

                <div>
                  <label className="text-xs text-muted-foreground">Név (opcionális)</label>
                  <input
                    type="text"
                    value={invitedName}
                    onChange={e => setInvitedName(e.target.value)}
                    placeholder="pl. Kovács Anna"
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Email (opcionális — ha megadod, csak ez a cím fogadhatja el)</label>
                  <input
                    type="email"
                    value={invitedEmail}
                    onChange={e => setInvitedEmail(e.target.value)}
                    placeholder="pelda@email.com"
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Jogosultsági szint</label>
                  <PermissionSelect value={permission} onChange={setPermission} />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Lejárat</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: 'Nincs', value: null },
                      { label: '7 nap', value: 7 },
                      { label: '30 nap', value: 30 },
                      { label: '90 nap', value: 90 },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setExpiresInDays(opt.value)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          expiresInDays === opt.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button onClick={handleCreate} className="flex-1 gap-1">
                    <Link2 className="w-3.5 h-3.5" />
                    Meghívó létrehozása
                  </Button>
                  <Button variant="ghost" onClick={() => setCreating(false)}>
                    Mégse
                  </Button>
                </div>
              </div>
            )}

            {/* Pending invitations */}
            {pendingInvitations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Függő meghívók</h3>
                {pendingInvitations.map(inv => (
                  <div key={inv.id} className="border rounded-lg p-3 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PermissionIcon level={inv.permission_level} />
                        <span className="text-sm font-medium">
                          {inv.invited_name || inv.invited_email || 'Bárki a linkkel'}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {PERMISSION_LABELS[inv.permission_level].label}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => revokeInvitation(inv.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1 flex-1"
                        onClick={() => handleCopyLink(inv.token)}
                      >
                        {copiedToken === inv.token ? (
                          <><Check className="w-3 h-3" /> Másolva!</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Link másolása</>
                        )}
                      </Button>
                      {inv.invited_email && (
                        <Button variant="outline" size="sm" className="text-xs h-7 gap-1"
                          onClick={() => {
                            const subject = encodeURIComponent(`${profile?.display_name || 'Valaki'} meghívott, hogy tekintsd meg az emlékkönyvét`)
                            const body = encodeURIComponent(
                              `Szia${inv.invited_name ? ` ${inv.invited_name}` : ''}!\n\n` +
                              `${profile?.display_name || 'Valaki'} szeretné megosztani veled az emlékkönyvét.\n\n` +
                              `Kattints ide az elfogadáshoz:\n${appUrl}?invite=${inv.token}\n\n` +
                              `Üdvözlettel,\nEmlékkönyv`
                            )
                            window.open(`mailto:${inv.invited_email}?subject=${subject}&body=${body}`)
                          }}
                        >
                          <Mail className="w-3 h-3" /> Email
                        </Button>
                      )}
                    </div>

                    {inv.expires_at && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Lejár: {new Date(inv.expires_at).toLocaleDateString('hu-HU')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Accepted invitations */}
            {acceptedInvitations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Elfogadott meghívók</h3>
                {acceptedInvitations.map(inv => (
                  <div key={inv.id} className="border rounded-lg p-3 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{inv.invited_name || inv.invited_email || 'Elfogadva'}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {PERMISSION_LABELS[inv.permission_level].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {inv.accepted_at ? new Date(inv.accepted_at).toLocaleDateString('hu-HU') : ''}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => revokeInvitation(inv.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {invitations.length === 0 && !creating && (
              <div className="text-center py-10 text-muted-foreground">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Még nem hoztál létre meghívót.</p>
                <p className="text-xs mt-1">Hívd meg családtagjaidat, barátaidat, hogy hozzáadják saját emlékeiket!</p>
              </div>
            )}
          </div>
        )}

        {/* ── SHARES TAB ────────────────────────────────────────── */}
        {tab === 'shares' && (
          <div className="space-y-3">
            {outgoingShares.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Még senki nem fogadta el a meghívódat.</p>
              </div>
            ) : (
              outgoingShares.map(share => (
                <div key={share.id} className="border rounded-xl p-4 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {(share.shared_with_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{share.shared_with_name || 'Ismeretlen felhasználó'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Hozzáadva: {new Date(share.created_at).toLocaleDateString('hu-HU')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive"
                      onClick={() => revokeShare(share.id)}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Visszavonás
                    </Button>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Jogosultsági szint</label>
                    <div className="flex gap-1 flex-wrap">
                      {(['reader', 'commenter', 'contributor', 'editor'] as PermissionLevel[]).map(level => (
                        <button
                          key={level}
                          onClick={() => updateSharePermission(share.id, level)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors flex items-center gap-1 ${
                            share.permission_level === level
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <PermissionIcon level={level} />
                          {PERMISSION_LABELS[level].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {share.expires_at && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Lejár: {new Date(share.expires_at).toLocaleDateString('hu-HU')}
                      {new Date(share.expires_at) < new Date() && (
                        <Badge variant="destructive" className="text-[9px] ml-1">Lejárt</Badge>
                      )}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── CONTRIBUTIONS TAB ─────────────────────────────────── */}
        {tab === 'contributions' && (
          <div className="space-y-3">
            {/* Pending contributions */}
            {pendingContributions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2 text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  Jóváhagyásra vár ({pendingContributions.length})
                </h3>
                {pendingContributions.map(c => (
                  <ContributionCard
                    key={c.id}
                    contribution={c}
                    targetName={getTargetName(c)}
                    reviewing={reviewingId === c.id}
                    reviewNotes={reviewNotes}
                    onToggleReview={() => {
                      setReviewingId(reviewingId === c.id ? null : c.id)
                      setReviewNotes('')
                    }}
                    onReviewNotesChange={setReviewNotes}
                    onApprove={() => handleReview(c.id, 'approved')}
                    onReject={() => handleReview(c.id, 'rejected')}
                    onModify={() => handleReview(c.id, 'modified')}
                  />
                ))}
              </div>
            )}

            {/* Past contributions */}
            {allContributions.filter(c => c.status !== 'pending').length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Korábbi hozzájárulások</h3>
                {allContributions
                  .filter(c => c.status !== 'pending')
                  .map(c => (
                    <ContributionCard
                      key={c.id}
                      contribution={c}
                      targetName={getTargetName(c)}
                      reviewing={false}
                      reviewNotes=""
                      onToggleReview={() => {}}
                      onReviewNotesChange={() => {}}
                      onApprove={() => {}}
                      onReject={() => {}}
                      onModify={() => {}}
                      readonly
                    />
                  ))}
              </div>
            )}

            {allContributions.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Még nem érkezett hozzájárulás.</p>
                <p className="text-xs mt-1">Ha meghívottjaid megosztanak emlékeket, itt fognak megjelenni.</p>
              </div>
            )}
          </div>
        )}

        {/* ── RECEIVED INVITATIONS TAB ─────────────────────────── */}
        {tab === 'received' && (
          <div className="space-y-3">
            {/* Pending received invitations */}
            {receivedInvitations.filter(i => i.status === 'pending').length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2 text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  Elfogadásra vár
                </h3>
                {receivedInvitations
                  .filter(i => i.status === 'pending')
                  .map(inv => {
                    const ownerName = (inv as Invitation & { owner_name?: string }).owner_name || 'Valaki'
                    return (
                      <div key={inv.id} className="border border-orange-200 rounded-xl p-4 bg-card space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {ownerName[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{ownerName} meghívott téged</p>
                            <p className="text-xs text-muted-foreground">
                              Jogosultság: {PERMISSION_LABELS[inv.permission_level].label}
                            </p>
                            {inv.expires_at && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                Lejár: {new Date(inv.expires_at).toLocaleDateString('hu-HU')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          className="w-full gap-1.5"
                          disabled={acceptingToken === inv.token}
                          onClick={() => handleAcceptReceived(inv)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {acceptingToken === inv.token ? 'Elfogadás...' : 'Meghívó elfogadása'}
                        </Button>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Accepted received invitations */}
            {receivedInvitations.filter(i => i.status === 'accepted').length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Elfogadott meghívók</h3>
                {receivedInvitations
                  .filter(i => i.status === 'accepted')
                  .map(inv => {
                    const ownerName = (inv as Invitation & { owner_name?: string }).owner_name || 'Valaki'
                    return (
                      <div key={inv.id} className="border rounded-lg p-3 bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{ownerName} emlékkönyve</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {PERMISSION_LABELS[inv.permission_level].label}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {inv.accepted_at ? new Date(inv.accepted_at).toLocaleDateString('hu-HU') : ''}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}

            {receivedInvitations.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nem kaptál még meghívót.</p>
                <p className="text-xs mt-1">Ha valaki megosztja veled az emlékkönyvét, itt fog megjelenni.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ContributionCard component ──────────────────────────────────────

function ContributionCard({
  contribution: c,
  targetName,
  reviewing,
  reviewNotes,
  onToggleReview,
  onReviewNotesChange,
  onApprove,
  onReject,
  onModify,
  readonly = false,
}: {
  contribution: Contribution
  targetName: string | null | undefined
  reviewing: boolean
  reviewNotes: string
  onToggleReview: () => void
  onReviewNotesChange: (v: string) => void
  onApprove: () => void
  onReject: () => void
  onModify: () => void
  readonly?: boolean
}) {
  const content = c.content as Record<string, string>
  const statusColors: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-700 border-orange-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    modified: 'bg-blue-100 text-blue-700 border-blue-200',
  }
  const statusLabels: Record<string, string> = {
    pending: 'Jóváhagyásra vár',
    approved: 'Elfogadva',
    rejected: 'Elutasítva',
    modified: 'Módosítva elfogadva',
  }
  const typeLabels: Record<string, string> = {
    memory: 'Emlék',
    comment: 'Megjegyzés',
    edit_suggestion: 'Szerkesztési javaslat',
  }

  return (
    <div className={`border rounded-lg p-3 bg-card space-y-2 ${c.status === 'pending' ? 'border-orange-200' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{c.contributor_name || 'Ismeretlen'}</span>
          <Badge variant="outline" className="text-[10px]">{typeLabels[c.contribution_type] || c.contribution_type}</Badge>
          <Badge className={`text-[10px] border ${statusColors[c.status]}`}>
            {statusLabels[c.status]}
          </Badge>
          {c.perspective_type !== 'own_memory' && (
            <Badge variant="secondary" className="text-[10px]">
              {PERSPECTIVE_LABELS[c.perspective_type as keyof typeof PERSPECTIVE_LABELS]?.badge || c.perspective_type}
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {new Date(c.created_at).toLocaleDateString('hu-HU')}
        </span>
      </div>

      {targetName && (
        <p className="text-xs text-muted-foreground">
          Kapcsolódó: <span className="font-medium">{targetName}</span>
        </p>
      )}

      {c.title && <p className="text-sm font-medium">{c.title}</p>}

      <div className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-2.5">
        {c.contribution_type === 'memory' && (
          <div className="space-y-1">
            {content.description && <p>{content.description}</p>}
            {content.time_info && (
              <p className="text-xs text-muted-foreground">Időpont: {content.time_info}</p>
            )}
            {content.category && (
              <p className="text-xs text-muted-foreground">Kategória: {content.category}</p>
            )}
          </div>
        )}
        {c.contribution_type === 'comment' && <p>{content.text}</p>}
        {c.contribution_type === 'edit_suggestion' && (
          <div className="space-y-1 text-xs">
            <p>Mező: <span className="font-mono">{content.field}</span></p>
            <p>Jelenlegi: <span className="line-through">{content.old_value}</span></p>
            <p>Javasolt: <span className="font-medium">{content.new_value}</span></p>
            {content.reason && <p className="text-muted-foreground">Ok: {content.reason}</p>}
          </div>
        )}
      </div>

      {c.reviewer_notes && (
        <p className="text-xs text-muted-foreground italic">
          Megjegyzés: {c.reviewer_notes}
        </p>
      )}

      {/* Review actions */}
      {!readonly && c.status === 'pending' && (
        <div className="space-y-2">
          {!reviewing ? (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-xs h-7 gap-1 bg-green-600 hover:bg-green-700" onClick={onApprove}>
                <CheckCircle2 className="w-3 h-3" /> Elfogadás
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={onToggleReview}>
                Megjegyzéssel...
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-destructive" onClick={onReject}>
                <XCircle className="w-3 h-3" /> Elutasítás
              </Button>
            </div>
          ) : (
            <div className="space-y-2 border-t pt-2">
              <textarea
                value={reviewNotes}
                onChange={e => onReviewNotesChange(e.target.value)}
                placeholder="Megjegyzés a döntéshez (opcionális)..."
                className="w-full text-xs border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" className="text-xs h-7 gap-1 bg-green-600 hover:bg-green-700" onClick={onApprove}>
                  <CheckCircle2 className="w-3 h-3" /> Elfogadás
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={onModify}>
                  Módosítva elfogadás
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-destructive" onClick={onReject}>
                  Elutasítás
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={onToggleReview}>
                  Mégse
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
