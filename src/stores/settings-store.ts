import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '@/types'

interface SettingsState extends AppSettings {
  updateSettings: (updates: Partial<AppSettings>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      aiModel: 'gpt-4o-mini',
      ttsModel: 'eleven_multilingual_v2',
      ttsVoice: 'male',
      ttsSpeed: 1.0,
      topicHints: true,
      emotionalLayer: true,
      updateSettings: (updates) => set(updates),
    }),
    { name: 'lifechat-settings' }
  )
)
