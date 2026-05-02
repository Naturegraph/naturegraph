-- ════════════════════════════════════════════════════════════════════════════
-- 20260502 — Phase 2 : Settings, Support, Security audit (cycle profil + MVP)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Cette migration ajoute :
--   1. Colonne `notif_frequency` sur `user_settings` (pour SettingsNotificationsView)
--   2. Table `support_tickets` (formulaire "Besoin d'aide ?")
--   3. Table `security_audit_log` (changements email, suppressions compte, etc.)
--   4. Bucket storage `banners` (si absent)
--
-- Toutes les opérations sont **idempotentes** (IF NOT EXISTS / OR REPLACE)
-- — peut être ré-appliquée sans erreur sur un environnement déjà migré.
--
-- À appliquer dans l'ordre sur :
--   - naturegraph-dev   (avant merge develop → staging)
--   - naturegraph-prod  (au merge staging → main)
--
-- Cf. second-agent/03-profil-backend-notes.md §15 pour le contexte fonctionnel.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. user_settings — ajout colonne notif_frequency
-- ────────────────────────────────────────────────────────────────────────────

-- Fréquence du digest de notifications. Aligné avec l'UI (3 options) :
--   - 'realtime' : notif immédiate dès qu'un événement survient
--   - 'daily'    : digest quotidien (cron 8h UTC)
--   - 'weekly'   : digest hebdomadaire (cron lundi 8h UTC)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS notif_frequency TEXT
    NOT NULL DEFAULT 'weekly'
    CHECK (notif_frequency IN ('realtime', 'daily', 'weekly'));

COMMENT ON COLUMN user_settings.notif_frequency IS
  'Fréquence des notifications agrégées : realtime | daily | weekly. Défaut weekly.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. support_tickets — formulaire "Besoin d'aide ?"
-- ────────────────────────────────────────────────────────────────────────────
--
-- Stocke les demandes de support envoyées via SettingsHelpView. Une Edge
-- Function `submit-help` peut en parallèle envoyer un message Discord webhook
-- pour notification temps-réel à l'équipe (Phase 2 MVP).

CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Sujet aligné avec les options UI dans SettingsHelpView (5 valeurs)
  subject     TEXT NOT NULL CHECK (subject IN
                  ('technical', 'help', 'suggestion', 'report', 'other')),
  -- Message saisi par l'utilisateur (min 20 chars enforced UI + serveur)
  message     TEXT NOT NULL CHECK (length(message) >= 20 AND length(message) <= 2000),
  -- Statut workflow modération
  status      TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  -- Pour suivi anti-spam et logs
  ip_address  INET,
  user_agent  TEXT,
  -- Email de réponse staff vers user (Resend ou Supabase Auth template)
  email_sent  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS support_tickets_user_idx
  ON support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx
  ON support_tickets(status, created_at DESC);

COMMENT ON TABLE support_tickets IS
  'Tickets de support utilisateur (formulaire SettingsHelpView). Workflow : new → in_progress → resolved/closed.';

-- RLS : user peut INSERT ses tickets + SELECT les siens (transparence RGPD).
-- Le staff utilise le service_role key pour la modération.
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_insert_self ON support_tickets;
CREATE POLICY support_tickets_insert_self ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS support_tickets_select_self ON support_tickets;
CREATE POLICY support_tickets_select_self ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. security_audit_log — audit trail sécurité
-- ────────────────────────────────────────────────────────────────────────────
--
-- Log immuable des actions sensibles : changement email, suppression compte,
-- déconnexion globale. Nécessaire pour RGPD + investigation post-incident.

CREATE TABLE IF NOT EXISTS security_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ON DELETE SET NULL : on conserve l'audit même après suppression compte
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'email_change_requested',
    'email_change_confirmed',
    'account_deletion_requested',
    'account_deletion_cancelled',
    'account_deletion_completed',
    'signin',
    'signout',
    'signout_all_devices',
    'password_reset_requested'
  )),
  ip_address  INET,
  user_agent  TEXT,
  -- Métadonnées libres : ex `{ "old_email": "...", "new_email": "..." }`
  -- Toutes les valeurs PII ici sont anonymisées au cron J+30 si suppression.
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_audit_log_user_idx
  ON security_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_log_event_idx
  ON security_audit_log(event_type, created_at DESC);

COMMENT ON TABLE security_audit_log IS
  'Audit trail sécurité (RGPD + investigation). Immuable côté user (RLS). Insertion via Edge Functions ou triggers SECURITY DEFINER uniquement.';

-- RLS : SELECT only pour l'owner (transparence). INSERT via service_role
-- ou functions SECURITY DEFINER (jamais directement par le user).
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_audit_log_select_self ON security_audit_log;
CREATE POLICY security_audit_log_select_self ON security_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Pas de policy INSERT — l'écriture passe forcément par les Edge Functions
-- avec service_role (anti-falsification).

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Storage bucket "banners" (si absent)
-- ────────────────────────────────────────────────────────────────────────────
--
-- Le bucket `avatars` existe déjà (cf. profileService). On ajoute `banners`
-- pour les images de bannière du profil header.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  2097152,                                            -- 2 MB max (banner = plus large que avatar)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Convention de nommage : `{user_id}/{timestamp}.{ext}`
-- Exemple : `0e8f1234-.../1714678800000.webp`
--
-- Cette convention est exploitée par les RLS storage : le préfixe (user_id)
-- est extrait via `(storage.foldername(name))[1]` pour vérifier l'ownership.

DROP POLICY IF EXISTS banners_owner_write ON storage.objects;
CREATE POLICY banners_owner_write ON storage.objects
  FOR ALL
  USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS banners_public_read ON storage.objects;
CREATE POLICY banners_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

-- ────────────────────────────────────────────────────────────────────────────
-- Fin de la migration
-- ────────────────────────────────────────────────────────────────────────────
--
-- Vérifier après application :
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'user_settings' AND column_name = 'notif_frequency';
--   SELECT * FROM information_schema.tables
--     WHERE table_name IN ('support_tickets', 'security_audit_log');
--   SELECT id FROM storage.buckets WHERE id = 'banners';
