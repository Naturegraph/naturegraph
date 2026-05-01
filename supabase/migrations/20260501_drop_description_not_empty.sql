-- ============================================================================
-- 20260501 — Drop CHECK contraint description_not_empty (phase test)
-- ============================================================================
-- Contexte (second-agent/30 + 31) :
--   Nicolas a décidé de rendre le champ description NON obligatoire à la
--   contribution pendant la phase test pour observer qui remplit quoi
--   et faire une analyse des taux de complétion avant de décider de
--   réinstaurer (ou pas) l'obligation.
--
-- Action :
--   Supprimer le CHECK constraint qui force `char_length(description) > 0`.
--   Le champ reste NOT NULL côté DB → on enverra une chaîne vide depuis
--   le client si besoin (déjà géré : payload `description: form.description.trim()`).
--
-- Rollback :
--   ALTER TABLE posts ADD CONSTRAINT description_not_empty
--     CHECK (char_length(description) > 0);
-- ============================================================================

ALTER TABLE posts DROP CONSTRAINT IF EXISTS description_not_empty;
