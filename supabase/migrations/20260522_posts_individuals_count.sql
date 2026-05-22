-- ============================================================
-- Migration : posts.individuals_count
-- ============================================================
-- Nicolas 2026-05-22 — Permettre d'enregistrer le nombre exact
-- d'individus observés (saisi dans le carnet d'observations
-- EncounterStep2). Affiché en suffixe « (N) » sur le chip espèce
-- dans FeedPost quand > 1.
--
-- Avant ce fix : la propriété existait dans le code TS (`individualsCount`)
-- mais aucune colonne en DB → toujours `undefined` après publication →
-- jamais d'affichage du compteur.
-- ============================================================

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS individuals_count INTEGER
  CHECK (individuals_count IS NULL OR individuals_count >= 1);

COMMENT ON COLUMN public.posts.individuals_count IS
  'Nombre d''individus observés saisi par l''utilisateur dans le carnet (EncounterStep2). NULL si non précisé.';
