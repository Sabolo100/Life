export type StoragePreference = 'local' | 'cloud'
export type TimeType = 'exact_date' | 'estimated_year' | 'life_phase' | 'uncertain'
export type Valence = 'positive' | 'negative' | 'mixed' | 'neutral'
export type QuestionType = 'incomplete_topic' | 'unresolved_event' | 'unclear_time' | 'missing_detail' | 'follow_up'
export type QuestionStatus = 'open' | 'addressed' | 'closed'
export type SessionMode = 'free' | 'interview' | 'timeline' | 'family' | 'career'
export type SessionGoal = 'childhood' | 'family' | 'career' | 'education' | 'relationships' | 'travel' | 'hardships' | 'fond_memories' | 'turning_points' | 'free'

export interface Profile {
  id: string
  display_name: string | null
  storage_preference: StoragePreference
  privacy_accepted_at: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  mode: SessionMode
  goal: SessionGoal | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  session_id: string
  user_id: string
  content: string
  is_user: boolean
  draft: boolean
  created_at: string
}

export interface LifeStory {
  id: string
  user_id: string
  content: string
  title: string
  last_updated: string
}

export interface Person {
  id: string
  user_id: string
  name: string
  nickname: string | null
  relationship_type: string
  related_period: string | null
  related_event_ids: string[]
  notes: string | null
  uncertainty: string | null
  created_at: string
  updated_at: string
}

export interface LifeEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  time_type: TimeType
  exact_date: string | null
  estimated_year: number | null
  life_phase: string | null
  uncertain_time: string | null
  location_id: string | null
  person_ids: string[]
  category: string
  is_turning_point: boolean
  narrative_text: string | null
  source_message_id: string | null
  source: 'self' | 'invited_person'
  created_at: string
}

export interface Location {
  id: string
  user_id: string
  name: string
  type: string
  related_period: string | null
  coordinates: { lat: number; lng: number } | null
  coordinates_confirmed: boolean | null
  notes: string | null
}

export interface TimePeriod {
  id: string
  user_id: string
  label: string
  start_type: 'exact' | 'estimated' | 'uncertain'
  start_value: string
  end_type: 'exact' | 'estimated' | 'uncertain' | 'ongoing'
  end_value: string | null
  category: string
  event_ids: string[]
  person_ids: string[]
}

export interface Emotion {
  id: string
  user_id: string
  event_id: string
  feeling: string
  valence: Valence
  importance: number
  long_term_impact: string | null
  notes: string | null
}

export interface OpenQuestion {
  id: string
  user_id: string
  question_type: QuestionType
  description: string
  related_event_id: string | null
  related_person_id: string | null
  priority: number
  status: QuestionStatus
  created_at: string
  addressed_at: string | null
}

export type FamilyRelType = 'parent' | 'child' | 'spouse' | 'ex_spouse' | 'sibling'

export interface FamilyRelationship {
  id: string
  user_id: string
  from_person_id: string | null   // null = self (the user)
  to_person_id: string | null     // null = self (the user)
  relationship_type: FamilyRelType
  created_at: string
}

// AI response types
export interface AIResponse {
  message: string
  messageTags: string[]
  extractedEntities: {
    persons: Partial<Person>[]
    events: Partial<LifeEvent>[]
    locations: Partial<Location>[]
    timePeriods: Partial<TimePeriod>[]
    emotions: Partial<Emotion>[]
  } | null
  suggestions: string[]
  openQuestions: Partial<OpenQuestion>[]
}

export interface AppSettings {
  aiModel: string
  ttsModel: string
  ttsVoice: string
  ttsSpeed: number
  ttsEnabled: boolean
  topicHints: boolean
  emotionalLayer: boolean
}
