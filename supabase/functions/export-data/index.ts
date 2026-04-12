// Edge Function: export-data
// Génère un export JSON RGPD de toutes les données du user demandeur.
// Upload le résultat dans bucket privé `exports` et renvoie une URL signée 24h.

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

  const auth = req.headers.get('Authorization')
  if (!auth) return new Response('Unauthorized', { status: 401, headers: CORS })

  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: auth } },
  })
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const userId = user.id

  try {
    const [profile, settings, posts, comments, reactions, follows, notebooks] = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      admin.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      admin.from('posts').select('*, media(*)').eq('user_id', userId),
      admin.from('comments').select('*').eq('user_id', userId),
      admin.from('reactions').select('*').eq('user_id', userId),
      admin.from('follows').select('*').or(`follower_id.eq.${userId},following_id.eq.${userId}`),
      admin.from('notebooks').select('*, entries:notebook_observations(*)').eq('author_id', userId),
    ])

    const payload = {
      generated_at: new Date().toISOString(),
      user_id: userId,
      email: user.email,
      profile: profile.data,
      settings: settings.data,
      posts: posts.data ?? [],
      comments: comments.data ?? [],
      reactions: reactions.data ?? [],
      follows: follows.data ?? [],
      notebooks: notebooks.data ?? [],
    }

    const json = JSON.stringify(payload, null, 2)
    const path = `${userId}/export-${Date.now()}.json`

    const { error: upErr } = await admin.storage
      .from('exports')
      .upload(path, new Blob([json], { type: 'application/json' }), {
        contentType: 'application/json',
        upsert: true,
      })
    if (upErr) throw upErr

    const { data: signed, error: signErr } = await admin.storage
      .from('exports')
      .createSignedUrl(path, 60 * 60 * 24)
    if (signErr) throw signErr

    return new Response(
      JSON.stringify({ ok: true, url: signed.signedUrl, expires_in_seconds: 86400 }),
      {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
