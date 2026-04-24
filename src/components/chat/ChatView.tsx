import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useAuthStore } from '@/stores/auth-store'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SuggestionChips } from './SuggestionChips'
import { BookOpen, ArrowDown } from 'lucide-react'
import { sendChatMessage } from '@/lib/ai-service'
import { supabase } from '@/lib/supabase'
import { speakText } from '@/lib/tts-service'

interface ChatViewProps {
  onShowLifeStory: () => void
  pendingQuestion?: string | null
  onPendingConsumed?: () => void
}

export function ChatView({ onShowLifeStory: _onShowLifeStory, pendingQuestion, onPendingConsumed }: ChatViewProps) {
  const { messages, currentSession, sending, addMessage, setSending, updateSessionTitle } = useChatStore()
  const { openQuestions, upsertEntities, updateOpenQuestions } = useLifeStoryStore()
  const { topicHints, aiModel, emotionalLayer, ttsEnabled } = useSettingsStore()
  const { profile } = useAuthStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<string[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      // Timeout biztosítja, hogy a DOM frissült
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 50)
    }
  }, [messages, sending])

  const handleSend = async (content: string) => {
    if (!currentSession || sending) return

    // Ensure session is fresh before sending (handles long inactivity)
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr || !session) {
      // Try to refresh
      const { error: refreshErr } = await supabase.auth.refreshSession()
      if (refreshErr) {
        await addMessage('⚠️ A munkamenet lejárt. Kérlek frissítsd az oldalt vagy jelentkezz be újra.', false)
        return
      }
    }

    await addMessage(content, true)
    setSending(true)

    try {
      const recentMessages = messages.slice(-20).map(m => ({
        role: m.is_user ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))
      recentMessages.push({ role: 'user', content })

      const response = await sendChatMessage({
        messages: recentMessages,
        openQuestions: openQuestions.map(q => q.description),
        mode: currentSession.mode,
        goal: currentSession.goal,
        aiModel,
        emotionalLayer,
        userId: profile?.id,
        messageCount: messages.length,
      })

      await addMessage(response.message, false)

      if (ttsEnabled) {
        speakText(response.message)
      }

      console.log('[ChatView] AI response:', {
        hasEntities: !!response.extractedEntities,
        persons: response.extractedEntities?.persons?.length || 0,
        events: response.extractedEntities?.events?.length || 0,
        locations: response.extractedEntities?.locations?.length || 0,
        tags: response.messageTags,
      })

      // Auto-title: if AI returned a title and session still has default name
      if (response.sessionTitle && currentSession.title === 'Új beszélgetés') {
        await updateSessionTitle(currentSession.id, response.sessionTitle)
      }

      if (response.extractedEntities) {
        await upsertEntities(response.extractedEntities)
      }

      // Retry extraction if user message was substantial but Recorder found nothing.
      // This catches cases where the dual-agent call succeeded but Recorder missed facts.
      const noEntities = !response.extractedEntities ||
        (response.extractedEntities.events.length === 0 &&
         response.extractedEntities.persons.length === 0 &&
         response.extractedEntities.locations.length === 0)
      if (noEntities && content.length > 150) {
        console.log('[ChatView] Substantial message with no entities — scheduling extraction retry in 3s')
        setTimeout(async () => {
          try {
            console.log('[ChatView] Extraction retry: re-sending recent messages to Recorder')
            const retryResponse = await sendChatMessage({
              messages: recentMessages,
              openQuestions: [],
              mode: currentSession.mode,
              goal: currentSession.goal,
              aiModel,
              emotionalLayer: false,
              userId: profile?.id,
              messageCount: messages.length,
            })
            if (retryResponse.extractedEntities) {
              const total = retryResponse.extractedEntities.events.length +
                retryResponse.extractedEntities.persons.length +
                retryResponse.extractedEntities.locations.length
              if (total > 0) {
                console.log(`[ChatView] Retry found ${total} entities — upserting`)
                await upsertEntities(retryResponse.extractedEntities)
              } else {
                console.log('[ChatView] Retry also found 0 entities — giving up')
              }
            }
          } catch (retryErr) {
            console.warn('[ChatView] Extraction retry failed silently:', retryErr)
          }
        }, 3000)
      }

      if (response.openQuestions?.length) {
        await updateOpenQuestions(response.openQuestions)
      }

      suggestionsRef.current = response.suggestions || []
      // Collapse suggestions for each new AI response — user opens them manually
      setSuggestionsOpen(false)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ismeretlen hiba'
      console.error('[ChatView] AI error:', errorMsg)
      await addMessage(`⚠️ Hiba történt: ${errorMsg}\n\nTipp: Menj a Beállítások → API Teszt gombra a probléma diagnosztizálásához.`, false)
    } finally {
      setSending(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Üdvözöllek!</h2>
            <p className="text-muted-foreground max-w-md mb-4">
              Én vagyok az Emlékkönyv asszisztensed. Segítek felépíteni az élettörténetedet.
              Kérdezek, hallgatok, és közben szépen összeállítom a te egyedi emlékkönyvedet.
            </p>
            <p className="text-muted-foreground max-w-md mb-6 font-medium">
              Hogyan szólíthatlak?
            </p>
            <div className="flex items-center gap-2 text-muted-foreground/60 text-sm animate-bounce">
              <ArrowDown className="w-4 h-4" />
              <span>Írj az alábbi mezőbe</span>
            </div>
          </div>
        )}
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {topicHints && suggestionsRef.current.length > 0 && !sending && (
        <SuggestionChips
          suggestions={suggestionsRef.current}
          onSelect={handleSuggestionClick}
          open={suggestionsOpen}
          onToggle={() => setSuggestionsOpen(o => !o)}
        />
      )}
      <ChatInput onSend={handleSend} disabled={sending} pendingMessage={pendingQuestion} onPendingConsumed={onPendingConsumed} />
    </div>
  )
}
