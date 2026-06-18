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
          first_name: null,
          last_name: null,
          bio: null,
          avatar_url: null,
          banner_url: null,
          city: null,
          region: null,
          country: null,
          instagram: null,
          twitter: null,
          website: null,
          is_public: false,
        })
        .eq('id', userId)
    }

    // Nettoyage Storage (toujours, mode 'hard' ET 'anonymize').
    // IMPORTANT : la liste doit inclure TOUS les buckets où l'utilisateur peut
    // avoir uploadé du contenu, sinon des fichiers orphelins avec PII (photo)
    // restent accessibles via les URLs publiques après suppression du compte
    // → fuite RGPD. Le bucket `banners` (créé par migration 20260502) avait
    // été oublié dans la version initiale (Fix #5).
    //
    // Convention de chemin pour tous ces buckets : {userId}/{...}.{ext}
    // → on liste les fichiers sous le préfixe `userId` puis on les supprime.
    const STORAGE_BUCKETS = [
      'avatars', // Photo de profil
      'banners', // Bannière de profil (migration 20260502)
      'post-media', // Photos des observations
      'notebook-covers', // Couvertures de carnets
      'exports', // Exports RGPD générés (privé)
    ] as const

    for (const bucket of STORAGE_BUCKETS) {
      try {
        const { data: list } = await admin.storage.from(bucket).list(userId, { limit: 1000 })
        if (list?.length) {
          await admin.storage.from(bucket).remove(list.map((f) => `${userId}/${f.name}`))
        }
      } catch (err) {
        // Si un bucket n'existe pas (ex: migration pas appliquée sur cet env),
        // on log mais on continue : la suppression des autres buckets ne doit
        // pas être bloquée par un seul bucket manquant.
        console.warn(`[delete-account] Failed to clean bucket "${bucket}":`, err)
      }
    }

    // Supprime auth.users (CASCADE supprime profile en mode 'hard')
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) throw delErr

    return new Response(JSON.stringify({ ok: true, mode }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    // BATCH 78 (CodeQL #1) : ne pas exposer la stack trace au client.
    // Log cote serveur pour debug, retourner un message generique.
    console.error('[delete-account] internal error:', e)
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error during account deletion.' }),
      {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      },
    )
  }
})
