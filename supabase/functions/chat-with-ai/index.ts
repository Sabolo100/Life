import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

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
- A lifeStoryUpdate legyen tömör, tényszerű összefoglalás (nem a beszélgetés másolata)`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: ChatRequest = await req.json()
    const model = request.aiModel || 'gpt-4.1-mini'

    const systemPrompt = buildSystemPrompt(request)

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...request.messages.map(m => ({ role: m.role, content: m.content })),
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: openaiMessages,
        temperature: 0.7,
        max_completion_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = {
        message: content,
        lifeStoryUpdate: null,
        extractedEntities: null,
        suggestions: [],
        openQuestions: [],
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
