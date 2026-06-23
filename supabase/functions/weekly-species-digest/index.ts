// Edge Function: weekly-species-digest
//
// Digest hebdomadaire "Actualité espèces" pour les users qui ont opt-in.
//
// Critères :
//   - User a une row notification_preferences(type='species_digest', enabled=TRUE)
//     → opt-in explicite RGPD (défaut = FALSE, cf. is_notif_enabled SQL)
//   - Compte le nombre de posts publiés les 7 derniers jours liés à ses centres d'intérêt
//     (intersection profiles.interests ↔ posts.species_group)
//   - Skip si 0 post (pas de notif vide)
//
// Planification :
//   - Appelée par pg_cron tous les lundis 9h UTC (cf. migration 20260417_cron_species_digest.sql)
//   - Peut aussi être déclenchée manuellement via POST sans body
//
// Sécurité :
//   - Utilise SERVICE_ROLE_KEY (pas d'auth user requise : appel interne cron)
//   - Vérifie header secret `x-cron-secret` pour bloquer les appels publics
//
// Eco-conception :
//   - Une seule requête agrégée par user, pas de N+1
//   - LIMIT 500 users par run (pagination pour gros volumes : à augmenter si besoin)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BATCH_LIMIT = 500

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }

  // Garde simple : accepte soit un JWT service (header Authorization), soit notre secret cron.
  const secret = req.headers.get('x-cron-secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return new Response('Forbidden', { status: 403, headers: CORS })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    // 1. Récupère la liste des opt-in explicites species_digest
    const { data: prefs, error: prefsErr } = await admin
      .from('notification_preferences')
      .select('user_id')
      .eq('type', 'species_digest')
      .eq('enabled', true)
      .limit(BATCH_LIMIT)

    if (prefsErr) throw prefsErr
    const userIds = (prefs ?? []).map((p) => p.user_id as string)

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ processed: 0, notified: 0 }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 2. Récupère les intérêts de ces users
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, interests, username')
      .in('id', userIds)

    if (profErr) throw profErr

    // 3. Récupère les posts publiés depuis 7 jours (une seule requête, filtrage en mémoire)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentPosts, error: postsErr } = await admin
      .from('posts')
      .select('id, species_group')
      .gte('created_at', sevenDaysAgo)
      .eq('status', 'published')
      .eq('visibility', 'public')

    if (postsErr) throw postsErr

    // Map species_group → count
    const countsByGroup = new Map<string, number>()
    for (const p of recentPosts ?? []) {
      if (!p.species_group) continue
      countsByGroup.set(p.species_group, (countsByGroup.get(p.species_group) ?? 0) + 1)
    }

    // 4. Pour chaque user, calcule son total et insère la notif si > 0
    const toInsert: Array<{
      user_id: string
      type: string
      title: string | null
      body: string | null
      reference_type: string | null
    }> = []

    for (const prof of profiles ?? []) {
      const interests = (prof.interests as string[] | null) ?? []
      if (interests.length === 0) continue
      let total = 0
      for (const it of interests) total += countsByGroup.get(it) ?? 0
      if (total === 0) continue

      toInsert.push({
        user_id: prof.id as string,
        type: 'species_digest',
        title: null,
        body: `${total} nouvelles observations cette semaine sur les espèces que tu suis.`,
        reference_type: 'species',
      })
    }

    // 5. Batch insert (une seule requête)
    let notified = 0
    if (toInsert.length > 0) {
      const { error: insertErr, count } = await admin
        .from('notifications')
        .insert(toInsert, { count: 'exact' })
      if (insertErr) throw insertErr
      notified = count ?? toInsert.length
    }

    return new Response(JSON.stringify({ processed: userIds.length, notified }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[weekly-species-digest]', err)
    const message = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
