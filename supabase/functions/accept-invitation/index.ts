import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Admin client — bypasses RLS
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // 1. Get caller's JWT from Authorization header
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) return respond({ error: 'Nincs autorizáció.' }, 401)

    // 2. Verify the JWT using admin client
    const { data: { user }, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !user) {
      console.error('getUser error:', userErr)
      return respond({ error: 'Érvénytelen session.' }, 401)
    }

    // 3. Parse body
    let token: string
    try {
      const body = await req.json()
      token = body?.token
    } catch {
      return respond({ error: 'Hibás kérés formátum.' }, 400)
    }
    if (!token) return respond({ error: 'Hiányzó meghívó token.' }, 400)

    console.log(`User ${user.email} accepting invitation token: ${token.slice(0, 8)}...`)

    // 4. Find invitation by token
    const { data: invitation, error: findErr } = await admin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (findErr || !invitation) {
      console.error('Invitation not found:', findErr)
      return respond({ error: 'A meghívó nem található.' }, 404)
    }

    // 5. Validation checks
    if (invitation.status === 'accepted') {
      return respond({ error: 'Ez a meghívó már el lett fogadva.' }, 400)
    }
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return respond({ error: 'A meghívó lejárt.' }, 400)
    }
    if (invitation.invited_email && invitation.invited_email !== user.email) {
      return respond({ error: 'Ez a meghívó másnak szól.' }, 403)
    }
    if (invitation.user_id === user.id) {
      return respond({ error: 'Nem fogadhatod el saját meghívódat.' }, 400)
    }

    // 6. Check if share already exists
    const { data: existing } = await admin
      .from('life_story_shares')
      .select('id, permission_level')
      .eq('owner_id', invitation.user_id)
      .eq('shared_with_id', user.id)
      .maybeSingle()

    if (existing) {
      // Already accepted — just return success so the UI proceeds normally
      console.log('Share already exists, returning existing share')
      return respond({ success: true, share: existing })
    }

    // 7. Create the share
    const { data: share, error: shareErr } = await admin
      .from('life_story_shares')
      .insert({
        owner_id: invitation.user_id,
        shared_with_id: user.id,
        invitation_id: invitation.id,
        permission_level: invitation.permission_level,
        expires_at: invitation.expires_at ?? null,
      })
      .select()
      .single()

    if (shareErr) {
      console.error('Share insert error:', shareErr)
      return respond({ error: 'Hiba a hozzáférés létrehozásakor: ' + shareErr.message }, 500)
    }

    // 8. Update invitation status
    const { error: updateErr } = await admin
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invitation.id)

    if (updateErr) {
      console.error('Invitation update error (non-fatal):', updateErr)
      // Non-fatal — share was created, that's the important part
    }

    console.log(`Invitation accepted: ${user.email} → owner ${invitation.user_id}`)
    return respond({ success: true, share })

  } catch (err) {
    console.error('Unhandled error in accept-invitation:', err)
    return respond({ error: 'Szerverhiba: ' + String(err) }, 500)
  }
})
