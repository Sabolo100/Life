import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  lifeStory: string
  openQuestions: string[]
  mode: string
  goal: string | null
  aiModel?: string
  emotionalLayer?: boolean
  topicHints?: boolean
  test?: boolean // API test mode
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

function buildSystemPrompt(request: ChatRequest): string {
  const modeInstruction = MODE_INSTRUCTIONS[request.mode] || MODE_INSTRUCTIONS.free
  const goalText = request.goal && request.goal !== 'free'
    ? `A felhasználó most a következő témára szeretne fókuszálni: ${GOAL_LABELS[request.goal] || request.goal}.`
    : ''

  const openQuestionsText = request.openQuestions.length > 0
    ? `\n\nNyitott kérdések, amelyekre még nem kaptál választ:\n${request.openQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''

  const lifeStoryContext = request.lifeStory
    ? `\n\nAz eddig összegyűjtött életút:\n${request.lifeStory.slice(0, 3000)}`
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
${lifeStoryContext}
${openQuestionsText}

A válaszod KIZÁRÓLAG az alábbi JSON formátumban add vissza, semmi mást ne írj:
{
  "message": "A válaszod és kérdésed a felhasználónak (természetes, beszélgetős stílus)",
  "lifeStoryUpdate": "Új információ az életúthoz (csak ha a felhasználó tényeket mondott, az AI kérdéseit NE rögzítsd). null ha nincs új info.",
  "extractedEntities": {
    "persons": [{"name": "...", "relationship_type": "...", "related_period": "...", "notes": "..."}],
    "events": [{"title": "...", "description": "...", "time_type": "exact_date|estimated_year|life_phase|uncertain", "exact_date": "...", "estimated_year": null, "life_phase": "...", "uncertain_time": "...", "category": "...", "is_turning_point": false}],
    "locations": [{"name": "...", "type": "...", "related_period": "..."}],
    "timePeriods": [{"label": "...", "start_type": "exact|estimated|uncertain", "start_value": "...", "end_type": "exact|estimated|uncertain|ongoing", "end_value": "...", "category": "..."}],
    "emotions": [{"event_id": null, "feeling": "...", "valence": "positive|negative|mixed|neutral", "importance": 3, "long_term_impact": "..."}]
  },
  "suggestions": ["max 8 szavas javaslat 1", "javaslat 2", "javaslat 3"],
  "openQuestions": [{"question_type": "incomplete_topic|unresolved_event|unclear_time|missing_detail|follow_up", "description": "...", "priority": 3, "status": "open"}]
}

FONTOS:
- Az extractedEntities-ben CSAK a felhasználó által mondott tényeket rögzítsd, ne az AI kérdéseit
- Ha nincs új entitás, az extractedEntities legyen null
- A suggestions 3 rövid, változatos témájú folytatási javaslat legyen (max 8 szó)
- Az openQuestions-ben frissítsd a nyitott kérdések listáját (új kérdések, lezárt kérdések)
- A lifeStoryUpdate legyen tömör, tényszerű összefoglalás (nem a beszélgetés másolata)
- HELYSZÍNEK: Egy helyszín CSAK EGYSZER szerepelhet a locations listában, ne add hozzá többször különböző típusokkal (pl. Parádfürdő csak egyszer, nem külön "kórház", "lakóhely", "gyerekkor helyszíne" stb.)
- SZEMÉLYEK: Egy személy CSAK EGYSZER szerepelhet a persons listában, még ha több szerepe is volt
- CSAK VALÓBAN ÚJ entitásokat adj hozzá - ha egy helyszín/személy már valószínűleg szerepel az életútban, ne add újra`
}

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
    return {
      success: false,
      error: `OpenAI API hiba (${response.status})`,
      details: errorText,
    }
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
    return {
      success: false,
      error: `Anthropic API hiba (${response.status})`,
      details: errorText,
    }
  }

  const data = await response.json()
  console.log(`[Anthropic] Success. Usage:`, JSON.stringify(data.usage))
  return { success: true, content: data.content[0].text }
}

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

      if (result.success) {
        return new Response(JSON.stringify({
          test: true,
          success: true,
          model,
          provider: isClaude ? 'Anthropic' : 'OpenAI',
          response: result.content,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        return new Response(JSON.stringify({
          test: true,
          success: false,
          model,
          provider: isClaude ? 'Anthropic' : 'OpenAI',
          error: result.error,
          details: result.details,
        }), {
          status: 200, // Return 200 so frontend can read the error details
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // === NORMAL CHAT MODE ===
    const systemPrompt = buildSystemPrompt(request)
    const chatMessages = request.messages.map(m => ({ role: m.role, content: m.content }))

    const result = isClaude
      ? await callAnthropic(model, systemPrompt, chatMessages)
      : await callOpenAI(model, systemPrompt, chatMessages)

    if (!result.success) {
      console.error(`[Edge Function] AI call failed:`, result.error, result.details)
      return new Response(
        JSON.stringify({
          error: result.error,
          details: result.details,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let parsed
    try {
      parsed = JSON.parse(result.content!)
    } catch {
      console.warn(`[Edge Function] Could not parse AI response as JSON, using raw text. Raw:`, result.content?.slice(0, 200))
      // Try to extract JSON from the response (Claude sometimes wraps it in markdown)
      const jsonMatch = result.content?.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          parsed = {
            message: result.content,
            lifeStoryUpdate: null,
            extractedEntities: null,
            suggestions: [],
            openQuestions: [],
          }
        }
      } else {
        parsed = {
          message: result.content,
          lifeStoryUpdate: null,
          extractedEntities: null,
          suggestions: [],
          openQuestions: [],
        }
      }
    }

    console.log(`[Edge Function] Response parsed successfully. Has message: ${!!parsed.message}`)

    return new Response(JSON.stringify(parsed), {
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
