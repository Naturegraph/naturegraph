-- ============================================================================
-- Photo Management v3 — refonte Strava-style (PRD docs/prd/photo-management.md)
-- ============================================================================
-- Remplace le PRD v2 (format unique par post + crop_data non-destructif). On
-- passe à une logique simple : formats mixtes libres, max 4 photos par post,
-- cover explicite en DB, pas de recadrage côté feed.
--
-- Idempotente : sûre à rejouer, et compatible avec un schéma où la migration
-- v2 (20260422_post_media_format.sql, supprimée) n'a jamais été appliquée.
--
-- Impact :
--   · media : ajoute ratio (generated), is_cover (bool + trigger), file_size
--   · posts : drop media_format (si présente)
--   · media : drop crop_data (si présente)
--   · media : contrainte display_order 0-3 (max 4 photos/post)
--   · trigger ensure_single_cover : garantit au plus une photo is_cover=true
--     par post. Auto-promotion d'une cover si aucune après INSERT.
-- ============================================================================

BEGIN;

-- ─── 1. Nettoyage v2 (colonnes qui ont pu être ajoutées) ────────────────────
-- IF EXISTS → no-op si la migration v2 n'a pas été appliquée.
ALTER TABLE public.posts DROP COLUMN IF EXISTS media_format;
ALTER TABLE public.media DROP COLUMN IF EXISTS crop_data;

-- ─── 2. Nouvelles colonnes v3 ───────────────────────────────────────────────

-- ratio = width/height, calculé côté DB pour tri/layout rapide. NULL-safe si
-- height = 0 (photo corrompue).
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS ratio numeric
    GENERATED ALWAYS AS (
      CASE WHEN height IS NOT NULL AND height > 0
           THEN width::numeric / height
           ELSE NULL
      END
    ) STORED;

-- is_cover : exactement une cover par post (trigger ci-dessous).
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS is_cover boolean NOT NULL DEFAULT false;

-- file_size : bytes. Métrique éco-conception (budget 300 KB photo feed).
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS file_size integer;

-- ─── 3. Contraintes ─────────────────────────────────────────────────────────

-- Max 4 photos par post : display_order ∈ [0, 3].
-- On drop d'abord au cas où une ancienne version existe (idempotence).
ALTER TABLE public.media
  DROP CONSTRAINT IF EXISTS media_display_order_range;

ALTER TABLE public.media
  ADD CONSTRAINT media_display_order_range
  CHECK (display_order IS NULL OR display_order BETWEEN 0 AND 3);

-- ─── 4. Trigger : une seule cover par post ──────────────────────────────────
-- À chaque UPDATE/INSERT où is_cover passe à true, on force les autres photos
-- du même post à is_cover=false. Évite qu'une UI buggée promeuve 2 covers.

CREATE OR REPLACE FUNCTION public.ensure_single_cover()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_cover THEN
    UPDATE public.media
       SET is_cover = false
     WHERE post_id = NEW.post_id
       AND id <> NEW.id
       AND is_cover;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_single_cover ON public.media;

CREATE TRIGGER media_single_cover
  BEFORE INSERT OR UPDATE OF is_cover ON public.media
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_cover();

-- ─── 5. Auto-cover sur INSERT si aucune cover n'existe pour ce post ────────
-- Si on insère une photo et qu'aucune cover n'est définie pour le post, on
-- promeut cette photo comme cover. Simplifie le code client : pas besoin de
-- gérer explicitement le premier upload.

CREATE OR REPLACE FUNCTION public.auto_promote_cover()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT NEW.is_cover AND NOT EXISTS (
    SELECT 1 FROM public.media
     WHERE post_id = NEW.post_id
       AND is_cover
       AND id <> NEW.id
  ) THEN
    NEW.is_cover := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_auto_cover ON public.media;

CREATE TRIGGER media_auto_cover
  BEFORE INSERT ON public.media
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_cover();

-- ─── 6. Index lookup cover (SELECT WHERE is_cover fréquent en feed) ────────

CREATE INDEX IF NOT EXISTS media_post_cover_idx
  ON public.media (post_id)
  WHERE is_cover;

COMMIT;
