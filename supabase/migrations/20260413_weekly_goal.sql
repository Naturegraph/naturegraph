-- Migration : Ajout objectif hebdomadaire personnalisable
-- Permet aux utilisateurs de définir leur propre objectif de partages par semaine.
-- Valeur par défaut = 5, bornes 1–20 pour éviter les abus.

ALTER TABLE user_settings
  ADD COLUMN weekly_goal INTEGER NOT NULL DEFAULT 5
  CONSTRAINT weekly_goal_range CHECK (weekly_goal BETWEEN 1 AND 20);

COMMENT ON COLUMN user_settings.weekly_goal IS 'Objectif hebdomadaire de partages (1-20, défaut 5)';
