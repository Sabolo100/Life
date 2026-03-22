import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { ChatSession, Message, SessionMode, SessionGoal } from '@/types'

interface ChatState {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  messages: Message[]
  loading: boolean
  sending: boolean
  loadSessions: () => Promise<void>
  createSession: (mode: SessionMode, goal: SessionGoal | null) => Promise<ChatSession | null>
  selectSession: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  addMessage: (content: string, isUser: boolean) => Promise<Message | null>
  loadMessages: (sessionId: string) => Promise<void>
  setSending: (sending: boolean) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  loading: false,
  sending: false,

  loadSessions: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
    set({ sessions: (data as ChatSession[]) || [], loading: false })
  },

  createSession: async (mode, goal) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: 'Új beszélgetés',
        mode,
        goal,
      })
      .select()
      .single()
    if (data) {
      const session = data as ChatSession
      set(state => ({ sessions: [session, ...state.sessions], currentSession: session, messages: [] }))
      return session
    }
    return null
  },

  selectSession: async (sessionId) => {
    const session = get().sessions.find(s => s.id === sessionId) || null
    set({ currentSession: session })
    if (session) {
      await get().loadMessages(sessionId)
    }
  },

  deleteSession: async (sessionId) => {
    await supabase.from('messages').delete().eq('session_id', sessionId)
    await supabase.from('chat_sessions').delete().eq('id', sessionId)
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
      messages: state.currentSession?.id === sessionId ? [] : state.messages,
    }))
  },

  addMessage: async (content, isUser) => {
    const session = get().currentSession
    if (!session) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('messages')
      .insert({
        session_id: session.id,
        user_id: user.id,
        content,
        is_user: isUser,
        draft: false,
      })
      .select()
      .single()
    if (data) {
      const message = data as Message
      set(state => ({ messages: [...state.messages, message] }))
      // Update session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.id)
      return message
    }
    return null
  },

  loadMessages: async (sessionId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('draft', false)
      .order('created_at', { ascending: true })
    set({ messages: (data as Message[]) || [] })
  },

  setSending: (sending) => set({ sending }),
}))
