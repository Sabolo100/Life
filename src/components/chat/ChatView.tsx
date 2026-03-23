import { useEffect, useRef } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useAuthStore } from '@/stores/auth-store'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SuggestionChips } from './SuggestionChips'
import { BookOpen } from 'lucide-react'
import { sendChatMessage } from '@/lib/ai-service'
import { speakText } from '@/lib/tts-service'

interface ChatViewProps {
  onShowLifeStory: () => void
  pendingQuestion?: string | null
  onPendingConsumed?: () => void
}

export function ChatView({ onShowLifeStory: _onShowLifeStory, pendingQuestion, onPendingConsumed }: ChatViewProps) {
  const { messages, currentSession, sending, addMessage, setSending } = useChatStore()
  const { openQuestions, upsertEntities, updateOpenQuestions } = useLifeStoryStore()
  const { topicHints, aiModel, emotionalLayer, ttsEnabled } = useSettingsStore()
  const { profile } = useAuthStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<string[]>([])

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

      if (response.extractedEntities) {
        await upsertEntities(response.extractedEntities)
      }

      if (response.openQuestions?.length) {
        await updateOpenQuestions(response.openQuestions)
      }

      suggestionsRef.current = response.suggestions || []
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
            <p className="text-muted-foreground max-w-md">
              Én vagyok az Életút AI asszisztensed. Segítek felépíteni az élettörténetedet.
              Kérdezek, hallgatok, és közben szépen összeállítom a te egyedi életutadat.
              Meséld el, honnan szeretnéd kezdeni!
            </p>
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
        <SuggestionChips suggestions={suggestionsRef.current} onSelect={handleSuggestionClick} />
      )}
      <ChatInput onSend={handleSend} disabled={sending} pendingMessage={pendingQuestion} onPendingConsumed={onPendingConsumed} />
    </div>
  )
}
