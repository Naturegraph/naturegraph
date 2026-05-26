-- =====================================================================
-- Phase B Supabase Pro, cleanup + maintenance (V1.0.3 PATCH preparation)
-- Date : 2026-05-25
-- =====================================================================
--
-- Contenu :
--   1. DROP 17 indexes inutilises (features dormantes ou redondants)
--   2. Install extensions Pro : pgaudit, hypopg, index_advisor
--   3. Setup 4 jobs pg_cron de maintenance (cleanup RGPD + ANALYZE quotidien)
--   4. Fix bug "Claire" : claim_beta_access_key ecrit used_by_user_id
--
-- Sources de verite : docs/devops/SUPABASE_PRO_ROADMAP.md
-- =====================================================================

-- ─── 1. CLEANUP INDEXES INUTILISES ──────────────────────────────────────
-- KEEP les indexes FK et trigram/gist (autocomplete + geo) meme si "unused"
-- en stats pg_stat actuels (beta tres recente, queries pas encore tournees)
DROP INDEX IF EXISTS public.idx_media_license;
DROP INDEX IF EXISTS public.idx_profiles_email;
DROP INDEX IF EXISTS public.idx_profiles_country;
DROP INDEX IF EXISTS public.idx_posts_country;
DROP INDEX IF EXISTS public.idx_posts_habitat;
DROP INDEX IF EXISTS public.idx_profiles_subscription;
DROP INDEX IF EXISTS public.idx_profiles_is_internal_false;
DROP INDEX IF EXISTS public.idx_community_photos_active;
DROP INDEX IF EXISTS public.idx_reports_status_pending;
DROP INDEX IF EXISTS public.idx_beta_signup_log_outcome;
DROP INDEX IF EXISTS public.idx_fr_cities_department_code;
DROP INDEX IF EXISTS public.idx_fr_cities_region_code;
DROP INDEX IF EXISTS public.idx_fr_cities_name_exact;
DROP INDEX IF EXISTS public.media_series_idx;
DROP INDEX IF EXISTS public.media_watermark_pending_idx;
DROP INDEX IF EXISTS public.support_tickets_status_idx;
DROP INDEX IF EXISTS public.security_audit_log_event_idx;

-- ─── 2. EXTENSIONS PRO ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgaudit;       -- audit SQL trail (compliance)
CREATE EXTENSION IF NOT EXISTS hypopg;        -- test indexes hypothetiques
CREATE EXTENSION IF NOT EXISTS index_advisor; -- recommandation auto indexes

-- ─── 3. JOBS PG_CRON ────────────────────────────────────────────────────
SELECT cron.schedule(
  'cleanup_beta_signup_log_90d',
  '0 3 * * *',
  $$ DELETE FROM public.beta_signup_log WHERE created_at < NOW() - INTERVAL '90 days' $$
);
SELECT cron.schedule(
  'cleanup_security_audit_log_180d',
  '15 3 * * *',
  $$ DELETE FROM public.security_audit_log WHERE created_at < NOW() - INTERVAL '180 days' $$
);
SELECT cron.schedule(
  'analyze_hot_tables_daily',
  '30 3 * * *',
  $$ ANALYZE public.posts, public.profiles, public.media, public.follows, public.notifications, public.hidden_posts, public.blocks $$
);
SELECT cron.schedule(
  'cleanup_orphan_hidden_posts_weekly',
  '0 4 * * 0',
  $$ DELETE FROM public.hidden_posts hp WHERE NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.id = hp.post_id) $$
);

-- ─── 4. FIX BUG CLAIRE : claim_beta_access_key ecrit used_by_user_id ────
DROP FUNCTION IF EXISTS public.claim_beta_access_key(TEXT);

CREATE OR REPLACE FUNCTION public.claim_beta_access_key(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  UPDATE public.beta_access_keys
  SET current_uses = current_uses + 1,
      used_at = COALESCE(used_at, NOW()),
      used_by_user_id = COALESCE(used_by_user_id, v_user_id)
  WHERE code = p_code
    AND is_active = TRUE
    AND current_uses < max_uses
    AND expires_at > NOW()
  RETURNING id INTO v_key_id;

  RETURN v_key_id;
END;
$$;

COMMENT ON FUNCTION public.claim_beta_access_key(TEXT, UUID) IS
  'Claim atomique cle beta. Si p_user_id NULL, fallback auth.uid(). Ecrit used_by_user_id (fix bug Claire V1.0.3).';
