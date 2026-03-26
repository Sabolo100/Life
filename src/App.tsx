import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useInvitationStore } from '@/stores/invitation-store'
import { AuthPage } from '@/pages/AuthPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { MainPage } from '@/pages/MainPage'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function App() {
  const { user, profile, loading, initialized, initialize } = useAuthStore()
  const { acceptInvitation } = useInvitationStore()
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<{ success: boolean; error?: string; message?: string } | null>(null)
  const [inviteProcessing, setInviteProcessing] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  // ── Clean up Supabase auth redirect hash (#access_token=...) ──────
  // After email confirmation, Supabase redirects back with the session
  // token in the URL hash. The Supabase client picks it up automatically,
  // but we need to clean the URL so the user doesn't see the raw token.
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // Let Supabase client process the hash first (it does this on init),
      // then clean the URL after a brief delay
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname + window.location.search)
      }, 100)
    }
  }, [])

  // ── Check URL for invite token ────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('invite')
    if (token) {
      setInviteToken(token)
      // Store in localStorage so it survives the full email confirmation flow
      // (sessionStorage is lost when Supabase redirects back after email confirm)
      localStorage.setItem('invite_token', token)
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname)
    } else {
      // Check localStorage (survives email confirmation redirect)
      const stored = localStorage.getItem('invite_token')
      if (stored) setInviteToken(stored)
    }
  }, [])

  // ── Process invite token after user is authenticated ──────────────
  useEffect(() => {
    if (!user || !inviteToken || inviteProcessing) return

    const process = async () => {
      setInviteProcessing(true)
      const result = await acceptInvitation(inviteToken)
      if (result.success) {
        setInviteResult({ success: true, message: 'Meghívó elfogadva! Most már hozzáférsz az életúthoz.' })
      } else {
        setInviteResult({ success: false, error: result.error })
      }
      localStorage.removeItem('invite_token')
      setInviteToken(null)
      setInviteProcessing(false)
    }
    process()
  }, [user, inviteToken, acceptInvitation, inviteProcessing])

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      {/* Invite result notification */}
      {inviteResult && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-3 rounded-xl shadow-xl border max-w-md ${
          inviteResult.success
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {inviteResult.success ? inviteResult.message : inviteResult.error}
            </span>
            <button
              onClick={() => setInviteResult(null)}
              className="ml-2 text-current opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {!user ? (
        <AuthPage inviteToken={inviteToken} />
      ) : profile && !profile.onboarding_completed ? (
        <OnboardingPage />
      ) : (
        <MainPage />
      )}
    </TooltipProvider>
  )
}
