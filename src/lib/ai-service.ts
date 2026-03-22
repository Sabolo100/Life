import { supabase } from './supabase'

interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  lifeStory: string
  openQuestions: string[]
  mode: string
  goal: string | null
}

interface AIResponse {
  message: string
  lifeStoryUpdate: string | null
  extractedEntities: {
    persons: Record<string, unknown>[]
    events: Record<string, unknown>[]
    locations: Record<string, unknown>[]
    timePeriods: Record<string, unknown>[]
    emotions: Record<string, unknown>[]
  } | null
  suggestions: string[]
  openQuestions: Record<string, unknown>[]
}

export async function sendChatMessage(request: ChatRequest): Promise<AIResponse> {
  const { data, error } = await supabase.functions.invoke('chat-with-ai', {
    body: request,
  })

  if (error) throw new Error(error.message)
  return data as AIResponse
}
