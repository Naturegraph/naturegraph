-- ============================================================================
-- Photo Management v4.1 — Premium (licence CC, HD export, watermark)
-- ============================================================================
-- Ajoute les leviers "premium" sur la table media :
--   · license  : déjà présent (default 'all-rights-reserved'), on ajoute un
--                CHECK pour cadrer les valeurs supportées (CC + ARR).
--   · allow_hd_download : autorise le téléchargement de l'original (HD).
--                Par défaut FALSE — la version compressée est servie au feed.
--   · watermark_enabled : marque la photo pour traitement watermark côté
--                serveur (job déféré). NULL/FALSE = pas de filigrane.
--   · watermark_url : URL de la version filigranée — alimentée par le job.
--
-- Idempotente — rejouable.
-- ============================================================================

BEGIN;

-- ─── Licence : CHECK des valeurs CC supportées ────────────────────────────
ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_license_check;
ALTER TABLE public.media
  ADD CONSTRAINT media_license_check
  CHECK (license IN (
    'all-rights-reserved',
    'cc-by',
    'cc-by-sa',
    'cc-by-nc',
    'cc-by-nc-sa',
    'cc-by-nc-nd',
    'cc-by-nd',
    'cc0'
  ));

-- ─── Téléchargement HD opt-in ─────────────────────────────────────────────
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS allow_hd_download boolean NOT NULL DEFAULT false;

-- ─── Watermark opt-in (champ pour job serveur ultérieur) ──────────────────
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS watermark_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS watermark_url text;

CREATE INDEX IF NOT EXISTS media_watermark_pending_idx
  ON public.media (id)
  WHERE watermark_enabled = true AND watermark_url IS NULL;

COMMIT;
