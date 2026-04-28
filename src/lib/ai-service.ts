import { supabase } from './supabase'
import { isLocalStorageMode } from './storage'
import { useLifeStoryStore } from '@/stores/life-story-store'

interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  openQuestions: string[]
  mode: string
  goal: string | null
  aiModel?: string
  emotionalLayer?: boolean
  userId?: string
  messageCount?: number
}

interface AIResponse {
  message: string
  messageTags: string[]
  extractedEntities: {
    persons: Record<string, unknown>[]
    events: Record<string, unknown>[]
    locations: Record<string, unknown>[]
    timePeriods: Record<string, unknown>[]
    emotions: Record<string, unknown>[]
  } | null
  suggestions: string[]
  openQuestions: Record<string, unknown>[]
  sessionTitle?: string | null
}

export interface AITestResult {
  test: boolean
  success: boolean
  model: string
  provider: string
  response?: string
  error?: string
  details?: string
}

export async function sendChatMessage(request: ChatRequest): Promise<AIResponse> {
  console.log('[ai-service] Sending chat message, model:', request.aiModel)

  // In user-owned-storage mode (Drive / FS) the Edge Function has no DB access to the user's data
  // (it lives outside Supabase). Pass the local store contents so the Recorder/Interviewer get proper context.
  let existingContext: Record<string, unknown> = {}
  if (isLocalStorageMode()) {
    const store = useLifeStoryStore.getState()
    existingContext = {
      existingEvents: store.events.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        narrative_text: e.narrative_text ?? null,
        is_turning_point: e.is_turning_point ?? false,
        exact_date: e.exact_date ?? null,
        estimated_year: e.estimated_year ?? null,
        life_phase: e.life_phase ?? null,
      })),
      existingLocationNames: store.locations.map(l => l.name),
      existingPersonNames: store.persons.map(p => p.name),
    }
  }

  const { data, error } = await supabase.functions.invoke('chat-with-ai', {
    body: { ...request, ...existingContext },
  })

  if (error) {
    console.error('[ai-service] Supabase function invoke error:', error)
    throw new Error(`Edge Function hívás sikertelen: ${error.message}`)
  }

  if (data?.error) {
    console.error('[ai-service] AI returned error:', data.error, data.details)
    throw new Error(`AI hiba: ${data.error}${data.details ? ` — ${data.details}` : ''}`)
  }

  if (!data?.message) {
    console.error('[ai-service] No message in response:', JSON.stringify(data).slice(0, 500))
    throw new Error('Az AI nem küldött valid választ. Nyers válasz: ' + JSON.stringify(data).slice(0, 200))
  }

  console.log('[ai-service] Response received successfully')
  return data as AIResponse
}

export async function testAIConnection(model: string): Promise<AITestResult> {
  console.log('[ai-service] Testing AI connection, model:', model)

  try {
    const { data, error } = await supabase.functions.invoke('chat-with-ai', {
      body: {
        test: true,
        aiModel: model,
        messages: [],
        openQuestions: [],
        mode: 'free',
        goal: null,
      },
    })

    if (error) {
      console.error('[ai-service] Test invoke error:', error)
      return {
        test: true,
        success: false,
        model,
        provider: model.startsWith('claude-') ? 'Anthropic' : 'OpenAI',
        error: `Edge Function hívás sikertelen: ${error.message}`,
      }
    }

    console.log('[ai-service] Test result:', JSON.stringify(data))
    return data as AITestResult
  } catch (err) {
    console.error('[ai-service] Test exception:', err)
    return {
      test: true,
      success: false,
      model,
      provider: model.startsWith('claude-') ? 'Anthropic' : 'OpenAI',
      error: `Hálózati hiba: ${(err as Error).message}`,
    }
  }
}
