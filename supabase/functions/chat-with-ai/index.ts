import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  openQuestions: string[]
  mode: string
  goal: string | null
  aiModel?: string
  emotionalLayer?: boolean
  topicHints?: boolean
  userId?: string
  test?: boolean
}

const MODE_INSTRUCTIONS: Record<string, string> = {
  free: 'A felhasználó szabadon mesél. Hallgass figyelmesen, tegyél fel nyitott kérdéseket, és hagyd, hogy ő vezesse a beszélgetést.',
  interview: 'Strukturált interjút folytatsz. Tegyél fel célzott, mélyebb kérdéseket az adott témáról. Kérj részleteket, konkrétumokat.',
  timeline: 'Kronologikusan haladsz az élet mentén. Keresd az idővonal hiányait, és kérdezz rá a hiányzó időszakokra.',
  family: 'A családi kapcsolatokra fókuszálsz. Kérdezz a családtagokról, rokoni kapcsolatokról, családi dinamikákról.',
  career: 'A szakmai pályára koncentrálsz. Kérdezz a munkahelyekről, karrierdöntésekről, szakmai fejlődésről.',
}

const GOAL_LABELS: Record<string, string> = {
  childhood: 'gyerekkor',
  family: 'család',
  career: 'munka és karrier',
  education: 'iskolák, tanulmányok',
  relationships: 'kapcsolatok (barátok, partnerek)',
  travel: 'utazások',
  hardships: 'nehéz időszakok',
  fond_memories: 'kedves emlékek',
  turning_points: 'fordulópontok',
}

// Category filtering map for Interviewer context
const MODE_CATEGORY_MAP: Record<string, string[]> = {
  career: ['career', 'education'],
  family: ['family', 'relationship'],
  childhood: ['childhood', 'education', 'family'],
  travel: ['travel'],
  interview: ['career', 'education', 'family', 'relationship'],
  timeline: [], // gets all
}

// Same map for goals
const GOAL_CATEGORY_MAP: Record<string, string[]> = {
  childhood: ['childhood', 'education', 'family'],
  family: ['family', 'relationship'],
  career: ['career', 'education'],
  education: ['education'],
  relationships: ['relationship', 'family'],
  travel: ['travel'],
  hardships: ['hardship', 'health', 'loss'],
  fond_memories: ['childhood', 'family', 'travel', 'relationship'],
  turning_points: [], // gets turning points only
}

// ========== RECORDER AGENT ==========

function buildRecorderPrompt(
  existingTitles: string[],
  existingLocationNames: string[],
  existingPersonNames: string[],
  recentMessages: { role: string; content: string }[]
): string {
  const titlesStr = existingTitles.length > 0
    ? `Létező event címek (ha pontosít, PONTOSAN ezt a title-t használd): ${existingTitles.join(', ')}`
    : 'Még nincsenek események rögzítve.'

  const locationsStr = existingLocationNames.length > 0
    ? `Létező helyszín nevek (ha már létezik, PONTOSAN ezt a nevet használd): ${existingLocationNames.join(', ')}`
    : ''

  const personsStr = existingPersonNames.length > 0
    ? `Létező személy nevek (ha már létezik, PONTOSAN ezt a nevet használd): ${existingPersonNames.join(', ')}`
    : ''

  const contextMessages = recentMessages.slice(-4).map(m =>
    `${m.role === 'user' ? 'Felhasználó' : 'AI'}: ${m.content}`
  ).join('\n')

  return `Te egy precíz magyar nyelvű adatrögzítő AI vagy. A felhasználó üzenetéből kinyered a tényeket és strukturált adatokká alakítod.

SZABÁLYOK:
- Csak a felhasználó által MONDOTT tényeket rögzítsd, NE az AI kérdéseit
- Ha meglévő event-et pontosít, PONTOSAN ugyanazt a title-t használd
- narrative_text: 1-3 mondat, harmadik személyű, életrajzi stílus, múlt idő. Példa: "Szabolcs 1985-ben született Budapesten. A család egy panellakásban élt a XIII. kerületben."
- NE generálj beszélgetős választ, CSAK adatot rögzíts
- Egy helyszín CSAK EGYSZER szerepelhet. Ha a helyszín már létezik a "Létező helyszín nevek" listában, PONTOSAN ugyanazt a nevet használd (betűről betűre egyezzen!). NE hozz létre új variánst (pl. ha "Fáy András iskola" létezik, NE írd "Fáy András Általános Iskola"-nak)
- Egy személy CSAK EGYSZER szerepelhet. Ha a személy már létezik a "Létező személy nevek" listában, PONTOSAN ugyanazt a nevet használd
- ESEMÉNYEK FRISSÍTÉSE: Ha a felhasználó pontosít egy korábbi eseményt (pl. megadja a dátumot), NE hozz létre új eseményt — használd PONTOSAN UGYANAZT a title-t
- Ha nincs új tény az üzenetben (pl. csak üdvözlés, kérdés, köszönés), adj vissza üres listákat
- DÁTUM FORMÁTUM: exact_date CSAK egyetlen nap lehet YYYY-MM-DD formátumban (pl. "1985-03-15"). Ha időszakról van szó (pl. "1977-1984"), NE használd az exact_date mezőt! Helyette: time_type="estimated_year", estimated_year=1977 (a kezdő év), és a teljes időszakot a life_phase mezőbe írd (pl. "1977-1984").

${titlesStr}
${locationsStr}
${personsStr}

Utolsó beszélgetés kontextus:
${contextMessages}

Válaszod KIZÁRÓLAG az alábbi JSON formátumban (semmi más szöveg!):
{
  "categories": ["childhood", "family"],
  "events": [{"title":"...", "narrative_text":"...", "description":"...", "time_type":"exact_date|estimated_year|life_phase|uncertain", "exact_date":"...", "estimated_year":null, "life_phase":"...", "uncertain_time":"...", "category":"...", "is_turning_point":false}],
  "persons": [{"name":"...", "relationship_type":"...", "related_period":"...", "notes":"..."}],
  "locations": [{"name":"...", "type":"...", "related_period":"...", "notes":"..."}],
  "emotions": [{"event_id":null, "feeling":"...", "valence":"positive|negative|mixed|neutral", "importance":3, "long_term_impact":"..."}]
}

Ha nincs új adat: {"categories":[], "events":[], "persons":[], "locations":[], "emotions":[]}`
}

// ========== INTERVIEWER AGENT ==========

function buildInterviewerPrompt(
  request: ChatRequest,
  filteredEventSummaries: string
): string {
  const modeInstruction = MODE_INSTRUCTIONS[request.mode] || MODE_INSTRUCTIONS.free
  const goalText = request.goal && request.goal !== 'free'
    ? `A felhasználó most a következő témára szeretne fókuszálni: ${GOAL_LABELS[request.goal] || request.goal}.`
    : ''

  const openQuestionsText = request.openQuestions.length > 0
    ? `\n\nNyitott kérdések, amelyekre még nem kaptál választ:\n${request.openQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''

  const contextText = filteredEventSummaries
    ? `\n\nAz alábbi életút-elemek vonatkoznak a jelenlegi témára:\n${filteredEventSummaries}`
    : '\n\nAz életút még üres — ez az első beszélgetés.'

  return `Te egy empatikus, türelmes és figyelmes magyar nyelvű életút-riporter vagy az "Életút AI" alkalmazásban. A feladatod, hogy segíts a felhasználónak felépíteni és megőrizni az élettörténetét beszélgetésen keresztül.

VISELKEDÉSI SZABÁLYOK:
- Mindig magyarul beszélj
- Empatikus, meleg, de nem túlzottan érzelgős hangnemet használj
- Egyszerre EGY témára fókuszálj, ne bombázd kérdésekkel
- Ne kérdezd újra, amit már tudsz (lásd az életút kontextust)
- Ha a felhasználó kitérő választ ad, ne erőltesd — térj vissza rá később
- Ha bizonytalanul emlékszik valamire (dátum, név), fogadd el — ne "pontosíts" agresszíven
- Ismerj fel, ha egy témát már eléggé feltárt, és természetesen válts témát
- Használd a nyitott kérdések listáját annak eldöntésére, hol érdemes folytatni
- Rövid, személyes, beszélgetős stílusban válaszolj (nem esszészerűen)

BESZÉLGETÉSI MÓD: ${modeInstruction}
${goalText}
${contextText}
${openQuestionsText}

A válaszod KIZÁRÓLAG az alábbi JSON formátumban add vissza, semmi mást ne írj:
{
  "message": "A válaszod és kérdésed a felhasználónak (természetes, beszélgetős stílus)",
  "suggestions": ["max 8 szavas javaslat 1", "javaslat 2", "javaslat 3"],
  "openQuestions": [{"question_type": "incomplete_topic|unresolved_event|unclear_time|missing_detail|follow_up", "description": "...", "priority": 3, "status": "open"}]
}`
}

// ========== AI CALL FUNCTIONS ==========

function isClaudeModel(model: string): boolean {
  return model.startsWith('claude-')
}

async function callOpenAI(model: string, systemPrompt: string, messages: { role: string; content: string }[], jsonMode = true): Promise<{ success: boolean; content?: string; error?: string; details?: string }> {
  if (!OPENAI_API_KEY) {
    return { success: false, error: 'OPENAI_API_KEY nincs beállítva a Supabase secrets-ben' }
  }

  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  console.log(`[OpenAI] Calling model: ${model}, messages count: ${openaiMessages.length}, jsonMode: ${jsonMode}`)

  const body: Record<string, unknown> = {
    model,
    messages: openaiMessages,
    temperature: 0.7,
    max_completion_tokens: 2000,
  }
  if (jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[OpenAI] API error ${response.status}:`, errorText)
    return { success: false, error: `OpenAI API hiba (${response.status})`, details: errorText }
  }

  const data = await response.json()
  console.log(`[OpenAI] Success. Usage:`, JSON.stringify(data.usage))
  return { success: true, content: data.choices[0].message.content }
}

async function callAnthropic(model: string, systemPrompt: string, messages: { role: string; content: string }[]): Promise<{ success: boolean; content?: string; error?: string; details?: string }> {
  if (!ANTHROPIC_API_KEY) {
    return { success: false, error: 'ANTHROPIC_API_KEY nincs beállítva a Supabase secrets-ben' }
  }

  console.log(`[Anthropic] Calling model: ${model}, messages count: ${messages.length}`)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Anthropic] API error ${response.status}:`, errorText)
    return { success: false, error: `Anthropic API hiba (${response.status})`, details: errorText }
  }

  const data = await response.json()
  console.log(`[Anthropic] Success. Usage:`, JSON.stringify(data.usage))
  return { success: true, content: data.content[0].text }
}

async function callAI(model: string, systemPrompt: string, messages: { role: string; content: string }[], jsonMode = true) {
  return isClaudeModel(model)
    ? await callAnthropic(model, systemPrompt, messages)
    : await callOpenAI(model, systemPrompt, messages, jsonMode)
}

function parseAIJSON(raw: string | undefined): Record<string, unknown> | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    // Try extracting JSON from markdown wrapper
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        return null
      }
    }
    return null
  }
}

// ========== DB HELPER: fetch existing events for context ==========

interface ExistingData {
  events: { id: string; title: string; category: string; narrative_text: string | null; is_turning_point: boolean; exact_date: string | null; estimated_year: number | null; life_phase: string | null }[]
  locationNames: string[]
  personNames: string[]
}

async function fetchExistingData(userId: string): Promise<ExistingData> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[DB] No Supabase credentials for DB queries')
    return { events: [], locationNames: [], personNames: [] }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const [eventsRes, locationsRes, personsRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, category, narrative_text, is_turning_point, exact_date, estimated_year, life_phase')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('locations')
      .select('name')
      .eq('user_id', userId),
    supabase
      .from('persons')
      .select('name')
      .eq('user_id', userId),
  ])

  if (eventsRes.error) console.error('[DB] Error fetching events:', eventsRes.error.message)
  if (locationsRes.error) console.error('[DB] Error fetching locations:', locationsRes.error.message)
  if (personsRes.error) console.error('[DB] Error fetching persons:', personsRes.error.message)

  return {
    events: eventsRes.data || [],
    locationNames: (locationsRes.data || []).map(l => l.name),
    personNames: (personsRes.data || []).map(p => p.name),
  }
}

// ========== FILTER EVENTS FOR INTERVIEWER ==========

function filterEventsForInterviewer(
  events: { title: string; category: string; narrative_text: string | null; is_turning_point: boolean }[],
  mode: string,
  goal: string | null
): string {
  let filtered = events

  // Determine which categories to include
  const goalCategories = goal && goal !== 'free' ? GOAL_CATEGORY_MAP[goal] : null
  const modeCategories = MODE_CATEGORY_MAP[mode] || null

  if (goal === 'turning_points') {
    // Special case: only turning points
    filtered = events.filter(e => e.is_turning_point)
  } else if (goalCategories && goalCategories.length > 0) {
    filtered = events.filter(e => goalCategories.includes(e.category))
  } else if (modeCategories && modeCategories.length > 0) {
    filtered = events.filter(e => modeCategories.includes(e.category))
  } else {
    // Free mode: last 15 events
    filtered = events.slice(-15)
  }

  // Fallback: if filtered is empty, take last 10
  if (filtered.length === 0 && events.length > 0) {
    filtered = events.slice(-10)
  }

  // Build summary string (max ~2000 chars)
  const summaries = filtered.map(e => {
    const text = e.narrative_text || e.title
    return `- ${e.title}: ${text.slice(0, 150)}`
  })

  return summaries.join('\n').slice(0, 2000)
}

// ========== MAIN HANDLER ==========

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: ChatRequest = await req.json()
    const model = request.aiModel || 'gpt-4.1-mini'
    const isClaude = isClaudeModel(model)

    console.log(`[Edge Function] Request received. Model: ${model}, Test: ${request.test}, Claude: ${isClaude}`)

    // === TEST MODE ===
    if (request.test) {
      console.log(`[Test] Testing ${isClaude ? 'Anthropic' : 'OpenAI'} API with model: ${model}`)

      const testSystemPrompt = 'Válaszolj egyetlen rövid mondatban magyarul.'
      const testMessages = [{ role: 'user', content: 'Szia! Működsz?' }]

      const result = isClaude
        ? await callAnthropic(model, testSystemPrompt, testMessages)
        : await callOpenAI(model, testSystemPrompt, testMessages, false)

      return new Response(JSON.stringify({
        test: true,
        success: result.success,
        model,
        provider: isClaude ? 'Anthropic' : 'OpenAI',
        ...(result.success ? { response: result.content } : { error: result.error, details: result.details }),
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === NORMAL CHAT MODE: DUAL AGENT ===
    const chatMessages = request.messages.map(m => ({ role: m.role, content: m.content }))
    const userId = request.userId || ''

    // Fetch existing data from DB for context
    let existingData: ExistingData = { events: [], locationNames: [], personNames: [] }
    if (userId) {
      existingData = await fetchExistingData(userId)
    }

    const existingTitles = existingData.events.map(e => e.title)

    // Build prompts
    const recorderPrompt = buildRecorderPrompt(existingTitles, existingData.locationNames, existingData.personNames, chatMessages)
    const recorderMessages = chatMessages.slice(-5) // last 5 messages for recorder

    const filteredSummaries = filterEventsForInterviewer(existingData.events, request.mode, request.goal)
    const interviewerPrompt = buildInterviewerPrompt(request, filteredSummaries)
    const interviewerMessages = chatMessages.slice(-10) // last 10 messages for interviewer

    console.log(`[Edge Function] Launching parallel agents. Recorder context: ${existingTitles.length} existing events. Interviewer context: ${filteredSummaries.length} chars.`)

    // Run both agents in parallel
    const [recorderResult, interviewerResult] = await Promise.all([
      callAI(model, recorderPrompt, recorderMessages),
      callAI(model, interviewerPrompt, interviewerMessages),
    ])

    // Parse Recorder output
    let recorderData: Record<string, unknown> = {
      categories: [],
      events: [],
      persons: [],
      locations: [],
      emotions: [],
    }
    if (recorderResult.success) {
      const parsed = parseAIJSON(recorderResult.content)
      if (parsed) {
        recorderData = parsed
        console.log(`[Recorder] Extracted: ${(recorderData.events as unknown[])?.length || 0} events, ${(recorderData.persons as unknown[])?.length || 0} persons, ${(recorderData.locations as unknown[])?.length || 0} locations`)
      } else {
        console.warn('[Recorder] Could not parse JSON response:', recorderResult.content?.slice(0, 200))
      }
    } else {
      console.error('[Recorder] AI call failed:', recorderResult.error)
    }

    // Parse Interviewer output
    let interviewerData: { message: string; suggestions: string[]; openQuestions: Record<string, unknown>[] } = {
      message: '',
      suggestions: [],
      openQuestions: [],
    }
    if (interviewerResult.success) {
      const parsed = parseAIJSON(interviewerResult.content)
      if (parsed && parsed.message) {
        interviewerData = {
          message: parsed.message as string,
          suggestions: (parsed.suggestions as string[]) || [],
          openQuestions: (parsed.openQuestions as Record<string, unknown>[]) || [],
        }
        console.log(`[Interviewer] Message length: ${interviewerData.message.length}, Suggestions: ${interviewerData.suggestions.length}`)
      } else {
        // Fallback: use raw text as message
        interviewerData.message = interviewerResult.content || 'Elnézést, nem sikerült válaszolnom. Kérlek, próbáld újra!'
        console.warn('[Interviewer] Could not parse JSON, using raw text')
      }
    } else {
      console.error('[Interviewer] AI call failed:', interviewerResult.error)
      // If interviewer fails but recorder succeeded, return a generic message
      interviewerData.message = 'Elnézést, technikai hiba történt a válasz generálásakor. Kérlek, próbáld újra!'
    }

    // Combine results
    const hasEntities =
      ((recorderData.events as unknown[])?.length || 0) > 0 ||
      ((recorderData.persons as unknown[])?.length || 0) > 0 ||
      ((recorderData.locations as unknown[])?.length || 0) > 0 ||
      ((recorderData.emotions as unknown[])?.length || 0) > 0

    const response = {
      message: interviewerData.message,
      messageTags: (recorderData.categories as string[]) || [],
      extractedEntities: hasEntities ? {
        persons: (recorderData.persons as Record<string, unknown>[]) || [],
        events: (recorderData.events as Record<string, unknown>[]) || [],
        locations: (recorderData.locations as Record<string, unknown>[]) || [],
        timePeriods: [],
        emotions: (recorderData.emotions as Record<string, unknown>[]) || [],
      } : null,
      suggestions: interviewerData.suggestions,
      openQuestions: interviewerData.openQuestions,
    }

    console.log(`[Edge Function] Combined response. Message: ${!!response.message}, Entities: ${hasEntities}, Tags: ${response.messageTags.length}`)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Edge Function] Unhandled error:', error)
    return new Response(
      JSON.stringify({
        error: `Edge Function hiba: ${(error as Error).message}`,
        stack: (error as Error).stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
