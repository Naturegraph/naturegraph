-- ============================================================================
-- 20260501 — Ajout colonne `posts.title`
-- ============================================================================
-- Contexte :
--   Le formulaire `ContributeEncounterForm` propose un champ "Titre de ta
--   rencontre" (optionnel) depuis le pivot Figma v3. Le payload TypeScript
--   `CreatePostPayload.title` était bien défini, mais la colonne SQL
--   correspondante n'avait jamais été créée en migration.
--
--   Conséquence : à la soumission, INSERT échouait avec :
--   "Could not find the 'title' column of 'posts' in the schema cache".
--
-- Champ : optionnel, varchar(160) — assez pour 1-2 phrases courtes type
-- "Mon premier martin-pêcheur de l'année !".
-- ============================================================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS title varchar(160);

COMMENT ON COLUMN posts.title IS 'Titre court optionnel saisi par l''utilisateur (max 160 chars).';
