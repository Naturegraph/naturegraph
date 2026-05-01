-- ============================================================================
-- Post display format — préférence utilisateur (Figma node 6385:47324)
-- ============================================================================
-- Re-introduit `posts.display_format` après le drop en v3 (20260423).
--
-- Différence sémantique avec la v2 :
--   · v2 : `media_format` était une CONTRAINTE sur les photos (toutes au même
--     ratio, recadrage côté upload). Trop rigide → drop en v3.
--   · v3 : pas de format au niveau post → format dérivé du ratio cover.
--   · v4 (cette migration) : `display_format` est une PRÉFÉRENCE D'AFFICHAGE
--     choisie par l'utilisateur dans l'étape 1 du formulaire de contribution.
--     Les photos restent à leur ratio source ; le feed les affiche dans un
--     conteneur du format choisi (object-cover ou letterbox selon contexte).
--
-- Valeurs : '16:9' | 'portrait' | '1:1' (3 chips Figma).
-- Valeur par défaut : '16:9' (paysage = orientation la plus fréquente).
-- Idempotente : sûre à rejouer.
-- ============================================================================

BEGIN;

-- ─── 1. Colonne display_format ──────────────────────────────────────────────

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS display_format text NOT NULL DEFAULT '16:9';

-- ─── 2. Contrainte CHECK : 3 valeurs autorisées ────────────────────────────
-- DROP d'abord pour idempotence si la migration a déjà tourné.

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_display_format_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_display_format_check
  CHECK (display_format IN ('16:9', 'portrait', '1:1'));

-- ─── 3. Commentaire explicite (pour les futurs devs / outils admin) ────────

COMMENT ON COLUMN public.posts.display_format IS
  'Format d''affichage choisi par l''utilisateur dans le feed : 16:9 (paysage), portrait (3:4), 1:1 (carré). Préférence visuelle, pas une contrainte sur les photos sources.';

COMMIT;
