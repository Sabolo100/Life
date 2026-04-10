import { useState, useEffect, useRef, useCallback } from 'react'
import { MosaicBackground } from '@/components/MosaicBackground'
import { Header } from '@/components/layout/Header'
import { ChatView } from '@/components/chat/ChatView'
import { SessionSidebar } from '@/components/chat/SessionSidebar'
import { LifeStoryView } from '@/components/views/LifeStoryView'
import { TimelineView } from '@/components/views/TimelineView'
import { MapView } from '@/components/views/MapView'
import { RelationshipView } from '@/components/views/RelationshipView'
import { SettingsView } from '@/components/views/SettingsView'
import { OpenQuestionsPanel } from '@/components/views/OpenQuestionsPanel'
import { InvitationManager } from '@/components/views/InvitationManager'
import { SharedLifeStoryView } from '@/components/views/SharedLifeStoryView'
import { useChatStore } from '@/stores/chat-store'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { useInvitationStore } from '@/stores/invitation-store'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import type { LifeStoryShare } from '@/types'

type View = 'chat' | 'lifeStory' | 'timeline' | 'map' | 'relationships' | 'settings' | 'invitations' | 'sharedStory'

export function MainPage() {
  const [currentView, setCurrentView] = useState<View>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [questionsPanelOpen, setQuestionsPanelOpen] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [aiStatus] = useState<'ok' | 'unknown' | 'error'>('unknown')
  const [storageStatus] = useState<'ok' | 'error'>('ok')
  const [selectedShare, setSelectedShare] = useState<LifeStoryShare | null>(null)
  const sessionInitialized = useRef(false)

  const { loadSessions, sessions, loading, createSession, currentSession } = useChatStore()
  const { loadAll, openQuestions } = useLifeStoryStore()
  const {
    loadInvitations, loadIncomingShares, loadContributions, loadReceivedInvitations,
    pendingContributions, incomingShares, receivedInvitations,
  } = useInvitationStore()

  const openCount = openQuestions.filter(q => q.status === 'open').length
  const pendingContribCount = pendingContributions.length

  const pendingReceivedInvites = receivedInvitations.filter(i => i.status === 'pending').length

  useEffect(() => {
    loadSessions()
    loadAll()
    loadInvitations()
    loadIncomingShares()
    loadContributions()
    loadReceivedInvitations()
  }, [loadSessions, loadAll, loadInvitations, loadIncomingShares, loadContributions, loadReceivedInvitations])

  useEffect(() => {
    if (loading) return
    if (sessionInitialized.current) return
    sessionInitialized.current = true

    if (sessions.length > 0 && !currentSession) {
      useChatStore.getState().selectSession(sessions[0].id)
    } else if (sessions.length === 0) {
      createSession('free', null)
    }
  }, [sessions, currentSession, createSession, loading])

  const handleQuestionClick = useCallback((question: string) => {
    setPendingQuestion(question)
    setCurrentView('chat')
  }, [])

  const handlePendingConsumed = useCallback(() => {
    setPendingQuestion(null)
  }, [])

  const toggleView = (view: View) => setCurrentView(currentView === view ? 'chat' : view)

  const handleShowShared = (share: LifeStoryShare) => {
    setSelectedShare(share)
    setCurrentView('sharedStory')
  }

  return (
    <div className="h-screen flex flex-col relative">
      <MosaicBackground opacity={0.3} />
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onGoHome={() => setCurrentView('chat')}
        onShowLifeStory={() => toggleView('lifeStory')}
        onShowTimeline={() => toggleView('timeline')}
        onShowMap={() => toggleView('map')}
        onShowRelationships={() => toggleView('relationships')}
        onShowSettings={() => toggleView('settings')}
        onShowInvitations={() => toggleView('invitations')}
        onShowShared={handleShowShared}
        aiStatus={aiStatus}
        storageStatus={storageStatus}
        pendingContribCount={pendingContribCount}
        pendingReceivedInvites={pendingReceivedInvites}
        incomingShares={incomingShares}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:flex md:flex-col w-64 border-r bg-[#f8f4ee]/80 backdrop-blur-sm relative z-10">
          <SessionSidebar onSessionSelect={() => setCurrentView('chat')} />
        </div>
        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <SessionSidebar onClose={() => setSidebarOpen(false)} onSessionSelect={() => setCurrentView('chat')} />
          </SheetContent>
        </Sheet>
        {/* Main content */}
        <main className="flex-1 overflow-hidden relative z-10 bg-[#f8f4ee]/60">
          {currentView === 'chat' && (
            <ChatView
              onShowLifeStory={() => setCurrentView('lifeStory')}
              pendingQuestion={pendingQuestion}
              onPendingConsumed={handlePendingConsumed}
            />
          )}
          {currentView === 'lifeStory' && (
            <LifeStoryView onBack={() => setCurrentView('chat')} />
          )}
          {currentView === 'timeline' && (
            <TimelineView onBack={() => setCurrentView('chat')} />
          )}
          {currentView === 'map' && (
            <MapView onBack={() => setCurrentView('chat')} />
          )}
          {currentView === 'relationships' && (
            <RelationshipView onBack={() => setCurrentView('chat')} />
          )}
          {currentView === 'settings' && (
            <SettingsView onBack={() => setCurrentView('chat')} />
          )}
          {currentView === 'invitations' && (
            <InvitationManager onBack={() => setCurrentView('chat')} />
          )}
          {currentView === 'sharedStory' && selectedShare && (
            <SharedLifeStoryView share={selectedShare} onBack={() => setCurrentView('chat')} />
          )}
          {/* Open Questions toggle button */}
          {!questionsPanelOpen && (
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-3 right-3 z-10"
                  onClick={() => setQuestionsPanelOpen(true)}
                >
                  <HelpCircle className="w-4 h-4" />
                  {openCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                    >
                      {openCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Nyitott kérdések</TooltipContent>
            </Tooltip>
          )}
        </main>
        {/* Open Questions Panel — inline on desktop, Sheet on mobile */}
        <div className="hidden md:block">
          <OpenQuestionsPanel
            open={questionsPanelOpen}
            onClose={() => setQuestionsPanelOpen(false)}
            onQuestionClick={handleQuestionClick}
          />
        </div>
        <div className="md:hidden">
          <Sheet open={questionsPanelOpen} onOpenChange={setQuestionsPanelOpen}>
            <SheetContent side="right" className="p-0 w-[85vw] max-w-80">
              <OpenQuestionsPanel
                open={true}
                onClose={() => setQuestionsPanelOpen(false)}
                onQuestionClick={handleQuestionClick}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  )
}
