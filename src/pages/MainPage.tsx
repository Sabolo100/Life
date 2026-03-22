import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { ChatView } from '@/components/chat/ChatView'
import { SessionSidebar } from '@/components/chat/SessionSidebar'
import { LifeStoryView } from '@/components/views/LifeStoryView'
import { SettingsView } from '@/components/views/SettingsView'
import { useChatStore } from '@/stores/chat-store'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Sheet, SheetContent } from '@/components/ui/sheet'

type View = 'chat' | 'lifeStory' | 'settings'

export function MainPage() {
  const [currentView, setCurrentView] = useState<View>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiStatus] = useState<'ok' | 'unknown' | 'error'>('unknown')
  const [storageStatus] = useState<'ok' | 'error'>('ok')
  const sessionInitialized = useRef(false)

  const { loadSessions, sessions, loading, createSession, currentSession } = useChatStore()
  const { loadAll } = useLifeStoryStore()

  useEffect(() => {
    loadSessions()
    loadAll()
  }, [loadSessions, loadAll])

  useEffect(() => {
    // Várjuk meg, amíg a sessziók betöltése befejeződik
    if (loading) return
    // Ne fussunk le kétszer
    if (sessionInitialized.current) return
    sessionInitialized.current = true

    if (sessions.length > 0 && !currentSession) {
      useChatStore.getState().selectSession(sessions[0].id)
    } else if (sessions.length === 0) {
      createSession('free', null)
    }
  }, [sessions, currentSession, createSession, loading])

  return (
    <div className="h-screen flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onShowLifeStory={() => setCurrentView(currentView === 'lifeStory' ? 'chat' : 'lifeStory')}
        onShowSettings={() => setCurrentView(currentView === 'settings' ? 'chat' : 'settings')}
        aiStatus={aiStatus}
        storageStatus={storageStatus}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-64 border-r bg-muted/30">
          <SessionSidebar />
        </div>
        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <SessionSidebar onClose={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {currentView === 'chat' && (
            <ChatView onShowLifeStory={() => setCurrentView('lifeStory')} />
          )}
          {currentView === 'lifeStory' && (
            <LifeStoryView onBack={() => setCurrentView('chat')} />
          )}
          {currentView === 'settings' && (
            <SettingsView onBack={() => setCurrentView('chat')} />
          )}
        </main>
      </div>
    </div>
  )
}
