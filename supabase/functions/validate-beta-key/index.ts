// supabase/functions/validate-beta-key/index.ts
// =====================================================================
// Edge Function : validation des cles d'acces beta (T-202 / BATCH 29)
// =====================================================================
//
// Refs : BETA_CLOSED_ACCESS_STRATEGY.md v2.0 Phase 1
//
// Flow :
//   1. Recoit { code } depuis le front (POST JSON)
//   2. Rate limit : 5 tentatives / IP / 10 min (en memoire, suffisant MVP)
//   3. Validation format code (regex NG-XXXX-XXXX)
//   4. RPC claim_beta_access_key (atomic UPDATE)
//   5. Verification quota global (singleton beta_quota_config)
//   6. Si quota plein : rollback via release_beta_access_key
//   7. Log outcome dans beta_signup_log (audit)
//   8. Retourne { valid, reason?, key_id? }
//
// Securite :
//   - SUPABASE_SERVICE_ROLE_KEY pour bypass RLS (claim/log)
//   - Pas de leak du SERVICE_ROLE cote client
//   - Rate limiting basique en memoire (Edge Runtime singleton)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildCors, rejectDisallowedOrigin } from '../_shared/cors.ts'

// ─── Types ───────────────────────────────────────────────────────────────
interface ValidateRequest {
  code: string
}

interface ValidateResponse {
  valid: boolean
  reason?:
    | 'invalid_format'
    | 'invalid_or_used'
    | 'expired'
    | 'quota_full'
    | 'rate_limited'
    | 'server_error'
  key_id?: string
}

// ─── Rate limit en memoire ───────────────────────────────────────────────
// Pour MVP : limite par IP, 5 tentatives / 10 min.
// Production scale : passer a Upstash Redis si > 1000 req/jour.
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count += 1
  return true
}

// Cleanup periodique (evite memory leak)
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) rateLimitStore.delete(ip)
  }
}, 60 * 1000)

// ─── Format validation ───────────────────────────────────────────────────
const CODE_REGEX = /^NG-[A-Z0-9]{4}-[A-Z0-9]{4}$/

// ─── Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // NG-041 : rejet actif (403) des origines tierces. Les appels serveur (sans
  // Origin) passent ; seule une origine navigateur hors allowlist est rejetee.
  const originReject = rejectDisallowedOrigin(req)
  if (originReject) return originReject
  // CORS restreint (NG-032) : allowlist d'origines (front public), calcule par requete.
  const corsHeaders = buildCors(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 1. Parse body
  let body: ValidateRequest
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ valid: false, reason: 'invalid_format' } as ValidateResponse),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  const code = body.code?.trim().toUpperCase() ?? ''
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const userAgent = req.headers.get('user-agent') ?? null

  // V1.0.3 fix bug "Claire" : extraire le user_id du JWT pour lier la cle au compte.
  // Le claim arrive APRES OTP verifie, donc l user est authentifie. On parse le JWT
  // d Authorization (transmis automatiquement par supabase.functions.invoke cote client).
  let authUserId: string | null = null
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const jwt = authHeader.slice(7)
      const payload = JSON.parse(atob(jwt.split('.')[1] ?? ''))
      if (payload?.sub && typeof payload.sub === 'string') {
        authUserId = payload.sub
      }
    }
  } catch {
    // JWT absent ou malforme : on continue sans lier le user (claim still works)
  }

  // 2. Rate limit par IP
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'rate_limited' } as ValidateResponse),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  // 3. Format validation (avant DB pour eviter spam queries)
  if (!CODE_REGEX.test(code)) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'invalid_format' } as ValidateResponse),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  // 4. Init Supabase client avec service_role (bypass RLS pour claim + log)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    // 5. Atomic claim via RPC (V1.0.3 : passe p_user_id pour ecrire used_by_user_id)
    const { data: keyId, error: claimError } = await supabase.rpc('claim_beta_access_key', {
      p_code: code,
      p_user_id: authUserId,
    })

    if (claimError) {
      console.error('[validate-beta-key] claim error', claimError)
      await supabase.from('beta_signup_log').insert({
        attempted_code: code,
        outcome: 'invalid_code',
        ip_address: ip,
        user_agent: userAgent,
      })
      return new Response(
        JSON.stringify({ valid: false, reason: 'server_error' } as ValidateResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 6. Si keyId NULL : cle invalide / expiree / deja utilisee
    if (!keyId) {
      await supabase.from('beta_signup_log').insert({
        attempted_code: code,
        outcome: 'invalid_or_used',
        ip_address: ip,
        user_agent: userAgent,
      })
      return new Response(
        JSON.stringify({ valid: false, reason: 'invalid_or_used' } as ValidateResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 7. Verifier quota global
    const { data: quota } = await supabase
      .from('beta_quota_config')
      .select('current_user_count, max_users_total, accepting_new_signups')
      .eq('id', 1)
      .single()

    if (
      !quota ||
      !quota.accepting_new_signups ||
      quota.current_user_count >= quota.max_users_total
    ) {
      // Rollback claim
      await supabase.rpc('release_beta_access_key', { p_key_id: keyId })
      await supabase.from('beta_signup_log').insert({
        attempted_code: code,
        outcome: 'quota_full',
        ip_address: ip,
        user_agent: userAgent,
      })
      return new Response(
        JSON.stringify({ valid: false, reason: 'quota_full' } as ValidateResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 8. Succes : log + return
    await supabase.from('beta_signup_log').insert({
      attempted_code: code,
      outcome: 'success',
      ip_address: ip,
      user_agent: userAgent,
    })

    return new Response(JSON.stringify({ valid: true, key_id: keyId } as ValidateResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[validate-beta-key] unexpected error', err)
    return new Response(
      JSON.stringify({ valid: false, reason: 'server_error' } as ValidateResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
