-- =====================================================================
-- Phase B Supabase Pro, lockdown SECURITY DEFINER + extensions schema
-- Date : 2026-05-25
-- =====================================================================
--
-- Contexte :
--   Le linter security Supabase flaggait 36 functions SECURITY DEFINER
--   executables par anon ET authenticated via /rest/v1/rpc/<name>.
--   Postgres grant EXECUTE a PUBLIC par defaut, donc anon + authenticated
--   heritent. Fix : REVOKE FROM PUBLIC puis GRANT explicite par role.
--
-- Strategie :
--   - Triggers (jamais appeles via REST) : REVOKE total
--   - Admin only : REVOKE total (service_role uniquement)
--   - Auth-only RPCs : REVOKE PUBLIC + GRANT authenticated
--   - RLS helpers : REVOKE PUBLIC + GRANT authenticated
--   - Public RPCs (welcome, geocode, search) : KEEP les 2 grants
--   - PostGIS (st_estimatedextent) : intouchable (extension owned)
--
-- Resultat : 80+ warnings -> 14 (toutes intentionnelles documentees)
-- =====================================================================

-- TRIGGERS (REVOKE PUBLIC total)
REVOKE EXECUTE ON FUNCTION public.auto_set_media_copyright() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_updated() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_post() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_reaction() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_send_waitlist_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_comments_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_likes_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_post_location_point() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_user_posts_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_comment_content() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_post_content() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_profile_content() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_beta_user_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.anonymize_beta_signup_log() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_beta_keys(integer, integer, integer, integer, text) FROM PUBLIC;

-- AUTH-ONLY RPCs (REVOKE PUBLIC + GRANT authenticated)
REVOKE EXECUTE ON FUNCTION public.claim_beta_access_key(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_beta_access_key(text, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.clear_user_location(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_user_location(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_user_location(uuid, text, text, character, double precision, double precision, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_location(uuid, text, text, character, double precision, double precision, integer, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.release_beta_access_key(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_beta_access_key(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.nearby_posts(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nearby_posts(uuid, integer, integer) TO authenticated;

-- RLS HELPERS (REVOKE PUBLIC + GRANT authenticated)
REVOKE EXECUTE ON FUNCTION public.can_see_notebook(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_see_notebook(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_see_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_see_post(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_internal_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_internal_user(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_notif_enabled(uuid, character varying) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_notif_enabled(uuid, character varying) TO authenticated;

-- EXTENSIONS : deplacer les 3 nouvelles Phase B hors schema public
ALTER EXTENSION pgaudit SET SCHEMA extensions;
ALTER EXTENSION hypopg SET SCHEMA extensions;
ALTER EXTENSION index_advisor SET SCHEMA extensions;

-- ─── Warnings restants documentes comme intentionnels ───────────────────
--
-- 1. rls_disabled_in_public : public.spatial_ref_sys (PostGIS owned, faux positif)
-- 2. extension_in_public : postgis, unaccent, pg_trgm (deplacement casserait
--    toutes les fonctions/RLS qui les referencent, accepte tel quel)
-- 3. rls_policy_always_true : beta_waitlist INSERT (anyone can join waitlist BY DESIGN)
-- 4. anon EXECUTE on : check_beta_access_key_validity, reverse_geocode_city,
--    search_cities (3 RPCs publics intentionnels du /welcome et onboarding)
-- 5. auth_leaked_password_protection : a activer manuellement dans Dashboard
-- 6. st_estimatedextent (3 variants) : PostGIS C function, intouchable
