-- Migration: 20260722_media_backup (NG-037)
-- =============================================================================
-- Sauvegarde des fichiers storage (photos), que les sauvegardes Supabase ne
-- couvrent PAS.
--
-- Constat du 2026-07-22 : la page Backups indique explicitement "Database
-- backups do not include objects stored via the Storage API". Une restauration
-- de base rendrait donc des publications pointant vers des images disparues.
-- Or les photos sont la donnee la plus irremplacable du projet : personne ne
-- peut re-photographier une rencontre passee.
--
-- Principe : miroir APPEND-ONLY. On copie, on ne supprime jamais, on n'ecrase
-- jamais. Si un fichier disparait de la source, sa copie reste dans le miroir :
-- c'est precisement l'interet.
--
-- Limite assumee : le miroir vit dans le meme projet Supabase. Il protege
-- contre une suppression accidentelle (le risque realiste : mauvaise requete,
-- bug de code, suppression en masse), pas contre la perte du projet entier.
-- Une copie hors site restera a prevoir avant de monter en charge.
--
-- Cette migration est PUREMENT ADDITIVE : creation d'un bucket neuf et d'une
-- table neuve. Aucun objet, aucun bucket existant n'est modifie ni supprime.
-- =============================================================================

-- 1. Bucket de sauvegarde, PRIVE ---------------------------------------------
-- Prive et sans policy : seul le service_role y accede. Ces fichiers sont des
-- donnees personnelles (photos d'utilisateurs), ils ne doivent jamais devenir
-- publics par le miroir.
-- allowed_mime_types NULL = tout type accepte, pour qu'aucune copie ne soit
-- refusee si un type inattendu existe dans la source.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media-backup', 'media-backup', false, 104857600, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Journal des copies -------------------------------------------------------
-- Sert a l'idempotence (ne jamais recopier deux fois) et a l'audit (prouver ce
-- qui est protege, et depuis quand).
CREATE TABLE IF NOT EXISTS public.media_backup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_bucket text NOT NULL,
  source_path text NOT NULL,
  backup_path text NOT NULL,
  taille_octets bigint,
  copied_at timestamptz NOT NULL DEFAULT now()
);

-- Un fichier source n'est copie qu'une seule fois.
CREATE UNIQUE INDEX IF NOT EXISTS media_backup_log_source_idx
  ON public.media_backup_log (source_bucket, source_path);

-- Table interne : ecrite par la fonction de sauvegarde (service_role).
ALTER TABLE public.media_backup_log ENABLE ROW LEVEL SECURITY;

-- 3. Vue d'avancement ---------------------------------------------------------
-- Pratique pour verifier d'un coup d'oeil ce qui est protege et ce qui reste.
CREATE OR REPLACE VIEW public.media_backup_status AS
SELECT
  o.bucket_id AS bucket,
  count(*) AS fichiers_source,
  count(l.id) AS fichiers_sauvegardes,
  count(*) - count(l.id) AS restants
FROM storage.objects o
LEFT JOIN public.media_backup_log l
  ON l.source_bucket = o.bucket_id AND l.source_path = o.name
WHERE o.bucket_id <> 'media-backup'
GROUP BY o.bucket_id;

-- 4. Liste des fichiers restant a copier -------------------------------------
-- LECTURE SEULE. Utilisee par la fonction backup-media, qui n'a ainsi pas
-- besoin d'un acces direct au schema storage.
CREATE OR REPLACE FUNCTION public.list_media_backup_pending(p_limit integer DEFAULT 20)
RETURNS TABLE (source_bucket text, source_path text, taille bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.bucket_id::text, o.name::text, (o.metadata->>'size')::bigint
  FROM storage.objects o
  LEFT JOIN public.media_backup_log l
    ON l.source_bucket = o.bucket_id AND l.source_path = o.name
  WHERE o.bucket_id <> 'media-backup'
    AND l.id IS NULL
  ORDER BY o.created_at
  LIMIT greatest(1, least(p_limit, 50));
$$;

REVOKE EXECUTE ON FUNCTION public.list_media_backup_pending(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_media_backup_pending(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_media_backup_pending(integer) FROM authenticated;

-- 5. Cron quotidien -----------------------------------------------------------
-- Protege les nouvelles photos au fil de l'eau. 50 par passage suffit largement
-- au rythme actuel (quelques publications par jour) ; en cas de pic, le retard
-- est rattrape les jours suivants puisque la fonction reprend toujours ce qui
-- n'est pas encore copie.
-- 05h UTC (1h du matin a Montreal) : creneau calme, hors des crons email.
SELECT cron.unschedule('daily_media_backup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily_media_backup');

SELECT cron.schedule(
  'daily_media_backup',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/backup-media',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')),
    body := jsonb_build_object('limit', 50),
    timeout_milliseconds := 150000
  );
  $$
);

-- Rollback (reference) : ne JAMAIS supprimer le bucket media-backup sans avoir
-- verifie qu'une autre copie existe.
--   DROP VIEW IF EXISTS public.media_backup_status;
--   DROP TABLE IF EXISTS public.media_backup_log;
