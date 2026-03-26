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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch all events with narrative_text
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, narrative_text, description, category')
      .eq('user_id', userId)
      .not('narrative_text', 'is', null)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: 'No events to rewrite', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build a batch prompt to rewrite all narratives
    const narrativeList = events.map((e, i) =>
      `[${i}] title: "${e.title}" | narrative: "${e.narrative_text}"`
    ).join('\n')

    const systemPrompt = `Feladat: Írd át az alábbi életrajzi szövegeket EGYES SZÁM ELSŐ SZEMÉLYBE (E/1), múlt időben, életrajzi stílusban.

SZABÁLYOK:
- Minden szöveget E/1-be kell átírni (pl. "Budapesten született" → "Budapesten születtem")
- Ha már E/1-ben van, hagyd változatlanul
- Tartsd meg a tartalmat, dátumokat, neveket — csak a személyt változtasd
- 1-3 mondat maradjon
- Magyar nyelven válaszolj

Válaszod KIZÁRÓLAG JSON formátumban:
{"rewrites": [{"index": 0, "text": "átírt szöveg"}, ...]}

Szövegek:`

    // Call AI
    let result: string | null = null

    if (ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: narrativeList }],
        }),
      })
      if (response.ok) {
        const data = await response.json()
        result = data.content[0].text
      }
    } else if (OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: narrativeList },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        result = data.choices[0].message.content
      }
    }

    if (!result) {
      return new Response(JSON.stringify({ error: 'AI call failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse rewrites
    let rewrites: { index: number; text: string }[] = []
    try {
      const parsed = JSON.parse(result)
      rewrites = parsed.rewrites || []
    } catch {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        rewrites = parsed.rewrites || []
      }
    }

    // Apply updates
    let updated = 0
    for (const rw of rewrites) {
      const event = events[rw.index]
      if (!event || !rw.text) continue
      if (rw.text === event.narrative_text) continue // no change

      const { error: updateError } = await supabase
        .from('events')
        .update({ narrative_text: rw.text })
        .eq('id', event.id)

      if (!updateError) updated++
    }

    return new Response(JSON.stringify({
      message: `Rewritten ${updated}/${events.length} narratives to first person`,
      count: updated,
      total: events.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
