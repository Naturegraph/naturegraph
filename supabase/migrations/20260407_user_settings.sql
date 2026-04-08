-- Table user_settings : preferences utilisateur (notifs, theme, langue, accessibilite)
-- RLS : owner-only.

CREATE TABLE IF NOT EXISTS user_settings (
  user_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications  BOOLEAN NOT NULL DEFAULT true,
  push_notifications   BOOLEAN NOT NULL DEFAULT false,
  newsletter           BOOLEAN NOT NULL DEFAULT false,
  theme                TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  language             TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','en')),
  reduced_motion       BOOLEAN NOT NULL DEFAULT false,
  show_sensitive_data  BOOLEAN NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_select ON user_settings;
DROP POLICY IF EXISTS user_settings_upsert ON user_settings;
DROP POLICY IF EXISTS user_settings_update ON user_settings;
CREATE POLICY user_settings_select ON user_settings FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY user_settings_upsert ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_settings_update ON user_settings FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at automatique
CREATE OR REPLACE FUNCTION set_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_user_settings_updated ON user_settings;
CREATE TRIGGER trg_user_settings_updated
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_user_settings_updated_at();

-- Backfill pour les profils existants
INSERT INTO user_settings (user_id) SELECT id FROM profiles ON CONFLICT DO NOTHING;
