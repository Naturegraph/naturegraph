-- ============================================================================
-- 20260524_backfill_posts_region_qc.sql
-- ----------------------------------------------------------------------------
-- Backfill posts.region pour les posts du Québec (country=Canada). Tous les
-- users beta canadiens sont au Québec (Phase 1), donc on peut affecter
-- region='Québec' sans risque d'erreur.
--
-- Pour la France, on ne peut pas déduire la région à partir de city seule
-- (38 000 communes réparties sur 18 régions). On laisse region NULL — la
-- nouvelle UI affichera seulement « Ville, Pays » dans ce cas, ce qui reste
-- correct.
-- ============================================================================

UPDATE public.posts
SET region = 'Québec'
WHERE country = 'Canada'
  AND region IS NULL;
