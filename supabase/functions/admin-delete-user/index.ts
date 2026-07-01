// Edge Function: admin-delete-user (BATCH 107)
// ─────────────────────────────────────────────────────────────────────────────
// Permet à un super_admin de supprimer définitivement un compte utilisateur.
//
// Sécurité :
//   1. Le caller doit avoir un JWT valide
//   2. Le caller doit être super_admin dans admin_users (is_active = true)
//   3. Interdit de se supprimer soi-même (suicide protection)
//   4. Action loggée dans admin_audit_logs (immutable)
//
// Effets :
//   - Supprime auth.users (CASCADE → profiles, posts, notebooks, etc.)
//   - Vide les buckets Storage du user (avatars, banners, post-media, etc.)
//   - Insertion d'un log dans admin_audit_logs avant la suppression (sinon FK perdue)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildCors } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const STORAGE_BUCKETS = ['avatars', 'banners', 'post-media', 'notebook-covers', 'exports'] as const

Deno.serve(async (req: Request) => {
  // CORS restreint (NG-032) : allowlist d'origines, calcule par requete.
  const CORS = buildCors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }

  // 1. Authentification du caller via JWT
  const auth = req.headers.get('Authorization')
  if (!auth) return new Response('Unauthorized', { status: 401, headers: CORS })

  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: auth } },
  })
  const {
    data: { user: caller },
    error: callerErr,
  } = await callerClient.auth.getUser()
  if (callerErr || !caller) {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  // 2. Récupération du target_user_id
  let targetUserId: string
  let reason: string
  try {
    const body = await req.json()
    targetUserId = String(body?.target_user_id ?? '').trim()
    reason = String(body?.reason ?? '').trim()
    if (!targetUserId) throw new Error('target_user_id manquant')
    if (reason.length < 10) throw new Error('Raison requise (10 caractères min)')
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'Bad request' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  // 3. Protection : pas de suicide
  if (targetUserId === caller.id) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Impossible de supprimer son propre compte via cette route admin.',
      }),
      { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  // 4. Vérification : le caller est-il super_admin ?
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: adminRow, error: adminErr } = await admin
    .from('admin_users')
    .select('id, role, is_active')
    .eq('user_id', caller.id)
    .maybeSingle()

  if (adminErr || !adminRow || !adminRow.is_active || adminRow.role !== 'super_admin') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Accès refusé : super_admin requis.' }),
      { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  try {
    // 5. Log AVANT suppression (sinon la FK target_id sera invalide après CASCADE)
    await admin.from('admin_audit_logs').insert({
      admin_user_id: adminRow.id,
      action: 'user.delete_account',
      target_type: 'user',
      target_id: targetUserId,
      metadata: { reason, deleted_by_email: caller.email },
    })

    // 6. Nettoyage Storage
    for (const bucket of STORAGE_BUCKETS) {
      try {
        const { data: list } = await admin.storage.from(bucket).list(targetUserId, { limit: 1000 })
        if (list?.length) {
          await admin.storage.from(bucket).remove(list.map((f) => `${targetUserId}/${f.name}`))
        }
      } catch (err) {
        console.warn(`[admin-delete-user] Failed to clean bucket "${bucket}":`, err)
      }
    }

    // 7. Suppression auth.users (CASCADE supprime profiles + tout)
    const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId)
    if (delErr) throw delErr

    return new Response(JSON.stringify({ ok: true, deleted_user_id: targetUserId }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[admin-delete-user] internal error:', e)
    return new Response(
      JSON.stringify({ ok: false, error: 'Erreur interne lors de la suppression.' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
