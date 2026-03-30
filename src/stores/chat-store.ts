import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { localDb, isLocalMode } from '@/lib/local-db'
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
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>
  addMessage: (content: string, isUser: boolean) => Promise<Message | null>
  loadMessages: (sessionId: string) => Promise<void>
  setSending: (sending: boolean) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  loading: true,
  sending: false,

  loadSessions: async () => {
    set({ loading: true })

    if (isLocalMode()) {
      const sessions = localDb.getAll<ChatSession>('chat_sessions')
      sessions.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
      set({ sessions, loading: false })
      return
    }

    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
    set({ sessions: (data as ChatSession[]) || [], loading: false })
  },

  createSession: async (mode, goal) => {
    if (isLocalMode()) {
      const session: ChatSession = {
        id: localDb.genId(),
        user_id: 'local',
        title: 'Új beszélgetés',
        mode,
        goal,
        created_at: localDb.now(),
        updated_at: localDb.now(),
      } as ChatSession
      localDb.upsert('chat_sessions', session)
      set(state => ({ sessions: [session, ...state.sessions], currentSession: session, messages: [] }))
      return session
    }

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
    if (isLocalMode()) {
      localDb.removeWhere('messages', m => m.session_id === sessionId)
      localDb.remove('chat_sessions', sessionId)
    } else {
      await supabase.from('messages').delete().eq('session_id', sessionId)
      await supabase.from('chat_sessions').delete().eq('id', sessionId)
    }
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
      messages: state.currentSession?.id === sessionId ? [] : state.messages,
    }))
  },

  updateSessionTitle: async (sessionId, title) => {
    const trimmed = title.trim()
    if (!trimmed) return

    if (isLocalMode()) {
      localDb.update<ChatSession>('chat_sessions', sessionId, { title: trimmed } as Partial<ChatSession>)
    } else {
      await supabase
        .from('chat_sessions')
        .update({ title: trimmed })
        .eq('id', sessionId)
    }

    set(state => ({
      sessions: state.sessions.map(s => s.id === sessionId ? { ...s, title: trimmed } : s),
      currentSession: state.currentSession?.id === sessionId
        ? { ...state.currentSession, title: trimmed }
        : state.currentSession,
    }))
  },

  addMessage: async (content, isUser) => {
    const session = get().currentSession
    if (!session) return null

    if (isLocalMode()) {
      const message: Message = {
        id: localDb.genId(),
        session_id: session.id,
        user_id: 'local',
        content,
        is_user: isUser,
        draft: false,
        created_at: localDb.now(),
      } as Message
      localDb.upsert('messages', message)
      set(state => ({ messages: [...state.messages, message] }))
      localDb.update<ChatSession>('chat_sessions', session.id, { updated_at: localDb.now() } as Partial<ChatSession>)
      return message
    }

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
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.id)
      return message
    }
    return null
  },

  loadMessages: async (sessionId) => {
    if (isLocalMode()) {
      const allMessages = localDb.getAll<Message>('messages')
      const sessionMessages = allMessages
        .filter(m => m.session_id === sessionId && !m.draft)
        .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
      set({ messages: sessionMessages })
      return
    }

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
