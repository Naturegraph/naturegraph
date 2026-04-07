// Edge Function: delete-account
// Supprime ou anonymise un compte utilisateur (RGPD).
// Authentifié par JWT du user demandeur. Utilise service_role pour appeler auth.admin.deleteUser().

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }

  // 1. Récupère le user via son JWT
  const auth = req.headers.get('Authorization')
  if (!auth) return new Response('Unauthorized', { status: 401, headers: CORS })

  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: auth } },
  })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  // 2. Mode : 'hard' (suppression complète) | 'anonymize' (conserver contenu)
  let mode: 'hard' | 'anonymize' = 'hard'
  try {
    const body = await req.json()
    if (body?.mode === 'anonymize') mode = 'anonymize'
  } catch {
    /* default */
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const userId = user.id

  try {
    if (mode === 'anonymize') {
      await admin
        .from('profiles')
        .update({
          username: `deleted_${userId.slice(0, 8)}`,
          display_name: null,
          bio: null,
          avatar_url: null,
          banner_url: null,
          city: null,
          region: null,
          location: null,
          instagram: null,
          website: null,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', userId)
    }

    // Nettoyage Storage (toujours)
    for (const bucket of ['avatars', 'post-media', 'notebook-covers', 'exports']) {
      const { data: list } = await admin.storage.from(bucket).list(userId, { limit: 1000 })
      if (list?.length) {
        await admin.storage.from(bucket).remove(list.map((f) => `${userId}/${f.name}`))
      }
    }

    // Supprime auth.users (CASCADE supprime profile en mode 'hard')
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) throw delErr

    return new Response(JSON.stringify({ ok: true, mode }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
