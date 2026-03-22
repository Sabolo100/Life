import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { AuthPage } from '@/pages/AuthPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { MainPage } from '@/pages/MainPage'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function App() {
  const { user, profile, loading, initialized, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

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
      {!user ? (
        <AuthPage />
      ) : profile && !profile.onboarding_completed ? (
        <OnboardingPage />
      ) : (
        <MainPage />
      )}
    </TooltipProvider>
  )
}
