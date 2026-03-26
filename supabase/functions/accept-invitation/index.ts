import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Service role client — bypasses RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the calling user from the JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nincs autorizáció.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the user token
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Érvénytelen token.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { token } = await req.json()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Hiányzó meghívó token.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find invitation by token
    const { data: invitation, error: findErr } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (findErr || !invitation) {
      return new Response(JSON.stringify({ error: 'A meghívó nem található.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Checks
    if (invitation.status === 'accepted') {
      return new Response(JSON.stringify({ error: 'Ez a meghívó már el lett fogadva.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'A meghívó lejárt.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (invitation.invited_email && invitation.invited_email !== user.email) {
      return new Response(JSON.stringify({ error: 'Ez a meghívó másnak szól.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (invitation.user_id === user.id) {
      return new Response(JSON.stringify({ error: 'Nem fogadhatod el saját meghívódat.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if share already exists
    const { data: existing } = await supabaseAdmin
      .from('life_story_shares')
      .select('id')
      .eq('owner_id', invitation.user_id)
      .eq('shared_with_id', user.id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Már hozzáférsz ehhez az életúthoz.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create the share (service role bypasses RLS)
    const { data: share, error: shareErr } = await supabaseAdmin
      .from('life_story_shares')
      .insert({
        owner_id: invitation.user_id,
        shared_with_id: user.id,
        invitation_id: invitation.id,
        permission_level: invitation.permission_level,
        expires_at: invitation.expires_at,
      })
      .select()
      .single()

    if (shareErr) {
      console.error('Share insert error:', shareErr)
      return new Response(JSON.stringify({ error: 'Hiba a hozzáférés létrehozásakor.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update invitation status (service role bypasses RLS)
    await supabaseAdmin
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invitation.id)

    return new Response(JSON.stringify({ success: true, share }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('accept-invitation error:', err)
    return new Response(JSON.stringify({ error: 'Szerverhiba.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
