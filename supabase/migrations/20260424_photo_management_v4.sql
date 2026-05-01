-- ============================================================================
-- Photo Management v4 — "Naturegraph Way" (PRD docs/prd/photo-management-v4.md)
-- ============================================================================
-- Enrichit le modèle v3 (Strava-style) avec la couche naturaliste :
--   · role par photo (⭐ star / 🌿 ambiance) — 1 seule star/post via unique index
--   · species_id FK species_master — tag par photo (≠ iNat, qui force 1 post = 1 espèce)
--   · exif JSONB — boîtier, focale, ISO, vitesse, altitude, cap (détails pris de vue)
--   · captured_at — timestamp EXIF DateTimeOriginal (≠ created_at de la ligne DB)
--   · series_group_id — UUID partagé par photos du même shooting (< 120s écart)
--
-- Sécurité auto :
--   · Trigger `auto_hide_sensitive_location` : si une photo tague une espèce
--     fragile (CR/EN/VU/NT/RE/CO), le post passe location_hidden=true pour
--     protéger la station. L'utilisateur peut assumer via l'UI.
--
-- Idempotente — rejouable sans casse.
-- ============================================================================

BEGIN;

-- ─── 1. Colonnes enrichies sur media ────────────────────────────────────────

-- Rôle de la photo dans le post : la star porte l'ID, les autres sont l'ambiance.
-- Default 'ambiance' : c'est l'UI qui promeut explicitement une star. Le trigger
-- v3 auto_promote_cover conserve son rôle (is_cover), complémentaire au role.
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'ambiance';

-- Contrainte séparée (pattern : DROP + ADD garantit idempotence même si la
-- valeur CHECK évolue entre versions).
ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_role_check;
ALTER TABLE public.media
  ADD CONSTRAINT media_role_check CHECK (role IN ('star', 'ambiance'));

-- Tag espèce par photo. FK vers species_master (table de référence enrichie).
-- ON DELETE SET NULL : si une espèce est supprimée côté référentiel, on ne
-- perd pas la photo, juste le tag.
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS species_id uuid
  REFERENCES public.species_master(id) ON DELETE SET NULL;

-- EXIF enrichi en JSONB : souple pour accueillir de nouveaux champs sans
-- migration. Forme attendue :
--   { camera_make, camera_model, focal_length, iso, shutter_speed,
--     aperture, altitude, heading }
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS exif jsonb;

-- captured_at = EXIF DateTimeOriginal. Complète `created_at` qui, lui, marque
-- la date d'upload. Utile pour les séries et pour les observations
-- "retrouvées" dans de vieilles photos.
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS captured_at timestamptz;

-- series_group_id = UUID partagé par photos du même shooting. NULL = isolée.
-- Le client calcule le groupe (exifr lite lit DateTimeOriginal) puis envoie
-- le même UUID pour toutes les photos d'une série détectée.
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS series_group_id uuid;

-- ─── 2. Contrainte : au plus une star par post ─────────────────────────────
-- Unique partial index : efficace (ne s'applique qu'aux rôles star) et
-- s'associe au trigger DB sans conflit. Supprime et recrée pour idempotence.
DROP INDEX IF EXISTS public.media_one_star_per_post;
CREATE UNIQUE INDEX media_one_star_per_post
  ON public.media (post_id) WHERE role = 'star';

-- ─── 3. Index de performance ───────────────────────────────────────────────

-- Lookup rôle + post (feed : récupérer la star d'un post)
CREATE INDEX IF NOT EXISTS media_post_role_idx
  ON public.media (post_id, role);

-- Lookup séries (affichage planche, filtrage carnet)
CREATE INDEX IF NOT EXISTS media_series_idx
  ON public.media (series_group_id)
  WHERE series_group_id IS NOT NULL;

-- Lookup tag espèce (page espèce : toutes photos taguées)
CREATE INDEX IF NOT EXISTS media_species_idx
  ON public.media (species_id)
  WHERE species_id IS NOT NULL;

-- ─── 4. Trigger : floutage auto des espèces fragiles ───────────────────────
-- Quand une photo tague une espèce dont le statut de conservation est
-- "sensible" (CR/EN/VU/NT/RE/CO), on force le post en location_hidden=true.
-- Les coordonnées GPS restent en DB (pour les contributeurs authentifiés et
-- les exports scientifiques) mais sont masquées côté feed public.
--
-- L'utilisateur peut rendre public à nouveau via l'UI (choix conscient).
-- Le trigger est AFTER (après que la relation species_id soit en place).

CREATE OR REPLACE FUNCTION public.auto_hide_sensitive_location()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  -- Pas de species_id → rien à faire
  IF NEW.species_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupération du statut de conservation via la chaîne
  -- species_master → taxref_cache (conservation_status vit dans taxref_cache).
  SELECT tc.conservation_status
    INTO v_status
    FROM public.species_master sm
    LEFT JOIN public.taxref_cache tc ON tc.cd_nom = sm.taxref_id
   WHERE sm.id = NEW.species_id
   LIMIT 1;

  -- Liste des statuts "fragiles" (union IUCN France + réglementaire INPN).
  IF v_status IN ('CR', 'EN', 'VU', 'NT', 'RE', 'CO') THEN
    UPDATE public.posts
       SET location_hidden = true
     WHERE id = NEW.post_id
       AND location_hidden IS DISTINCT FROM true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_sensitive_species ON public.media;

CREATE TRIGGER media_sensitive_species
  AFTER INSERT OR UPDATE OF species_id ON public.media
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_hide_sensitive_location();

COMMIT;
