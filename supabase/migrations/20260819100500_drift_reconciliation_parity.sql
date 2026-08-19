-- 20260819100500_drift_reconciliation_parity.sql
-- Reconciliation de la derive : objets presents sur la PROD mais jamais captures
-- en migration (ajoutes hors migration au fil du temps). Cette migration les met
-- DANS le repo pour que dev et prod restent alignes.
-- =============================================================================
-- Idempotente : IF NOT EXISTS / CREATE OR REPLACE / DROP TRIGGER IF EXISTS.
-- Sur la prod : no-op (tout existe deja). Sur le dev : ajoute les objets manquants.
--
-- NON inclus volontairement (infra prod uniquement, non recreables sans superuser) :
--   - trigger on_auth_user_updated sur auth.users (table systeme Supabase)
--   - event trigger rls_auto_enable (auto-RLS sur nouvelles tables)
-- =============================================================================

-- ── Colonnes de derive ───────────────────────────────────────────────────────
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS copyright_notice text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_tier       text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS week_goal               integer DEFAULT 5;

-- ── Validation du contenu des posts ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_post_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Description : longueur max 5000 caractères
  IF LENGTH(NEW.description) > 5000 THEN
    RAISE EXCEPTION 'Description trop longue (max 5000 caractères)';
  END IF;

  -- Tags : max 10 tags, chaque tag max 50 caractères
  IF ARRAY_LENGTH(NEW.tags, 1) > 10 THEN
    RAISE EXCEPTION 'Trop de tags (max 10)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM UNNEST(NEW.tags) AS tag
    WHERE LENGTH(tag) > 50 OR tag !~ '^[\wÀ-ſ\s\-]+$'
  ) THEN
    RAISE EXCEPTION 'Tag invalide : max 50 caractères, lettres/chiffres/tirets uniquement';
  END IF;

  -- Cohérence type/champs : nature_encounter doit avoir encounter_date
  IF NEW.type = 'nature_encounter' AND NEW.encounter_date IS NULL THEN
    RAISE EXCEPTION 'Une observation doit avoir une date de rencontre';
  END IF;

  -- Coordonnées GPS : bornes WGS84
  IF NEW.latitude IS NOT NULL AND (NEW.latitude < -90 OR NEW.latitude > 90) THEN
    RAISE EXCEPTION 'Latitude invalide (doit être entre -90 et 90)';
  END IF;

  IF NEW.longitude IS NOT NULL AND (NEW.longitude < -180 OR NEW.longitude > 180) THEN
    RAISE EXCEPTION 'Longitude invalide (doit être entre -180 et 180)';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_post_before_save ON public.posts;
CREATE TRIGGER validate_post_before_save
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.validate_post_content();

-- ── Validation du contenu des profils ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_profile_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.username !~ '^[a-zA-Z0-9._\-]{3,30}$' THEN
    RAISE EXCEPTION 'Username invalide : 3-30 caractères, lettres/chiffres/points/underscores/tirets uniquement';
  END IF;

  IF NEW.username ~ '[._]{2,}' THEN
    RAISE EXCEPTION 'Username invalide : pas de doublons « .. » ou « __ »';
  END IF;

  IF NEW.bio IS NOT NULL AND LENGTH(NEW.bio) > 500 THEN
    RAISE EXCEPTION 'Bio trop longue (max 500 caractères)';
  END IF;

  IF NEW.website IS NOT NULL AND NEW.website != '' AND NEW.website !~ '^https?://.+' THEN
    RAISE EXCEPTION 'URL de site invalide (doit commencer par https://)';
  END IF;

  IF ARRAY_LENGTH(NEW.interests, 1) > 8 THEN
    RAISE EXCEPTION 'Trop de centres d''intérêt (max 8)';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_profile_before_save ON public.profiles;
CREATE TRIGGER validate_profile_before_save
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_content();

-- ── Copyright media auto ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_set_media_copyright()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  author_name TEXT;
  author_year TEXT;
BEGIN
  IF NEW.copyright_notice IS NULL THEN
    SELECT
      EXTRACT(YEAR FROM NOW())::TEXT,
      TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    INTO author_year, author_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF author_name IS NOT NULL AND author_name != '' THEN
      NEW.copyright_notice := '© ' || author_year || ' ' || author_name;
    ELSE
      NEW.copyright_notice := '© ' || author_year || ' Utilisateur Naturegraph';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS auto_set_media_copyright ON public.media;
CREATE TRIGGER auto_set_media_copyright
  BEFORE INSERT ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_media_copyright();

-- ── Sync profil <- auth.users (fonction seule ; le trigger vit sur auth.users
--    cote prod, non recreable ici) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET email_verified = TRUE, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
    SET last_login_at = NEW.last_sign_in_at, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;
