-- ============================================================================
-- Migration : canal email sur notification_preferences (NG-045 Phase 0)
-- Date      : 2026-07-02
-- Epic      : Notifications email intelligent
-- Description :
--   NG-045 demandait 6 nouvelles colonnes booleennes sur user_settings
--   (notif_reactions, notif_followers, notif_following_posts,
--   notif_weekly_digest, notif_goal_reminder, notif_streak). On evite de
--   dupliquer le systeme existant : notification_preferences gere deja
--   l'opt-in/out par (user_id, type) pour l'in-app, avec RLS et la regle
--   RGPD species_digest deja encodees (cf. 20260416_notification_preferences.sql).
--
--   On ajoute donc :
--     1. Colonne email_enabled : canal email independant du canal in-app
--        (`enabled`). Un user peut vouloir voir une notif dans la cloche
--        sans recevoir l'email correspondant, et inversement.
--     2. Extension du CHECK type avec les 3 nouveaux types email-only :
--        weekly_digest (E1+E2), goal_reminder (E3), streak (E4).
--     3. Extension du helper is_email_enabled(), miroir de is_notif_enabled()
--        mais pour le canal email (meme regle species_digest opt-in ;
--        weekly_digest/goal_reminder/streak opt-in aussi par defaut FALSE,
--        car ce sont des emails marketing/retention, pas des notifs sociales
--        directes).
-- ============================================================================

-- ─── 1. Colonne email_enabled ────────────────────────────────────────────────

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.notification_preferences.email_enabled IS
  'Canal email pour ce type de notification, independant du canal in-app (enabled). Cf. is_email_enabled().';

-- ─── 2. Extension du CHECK type ──────────────────────────────────────────────

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notif_pref_type_check;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notif_pref_type_check CHECK (
    type IN ('reaction', 'follow', 'post', 'species_digest',
             'comment', 'mention', 'identification', 'system',
             'weekly_digest', 'goal_reminder', 'streak')
  );

-- ─── 3. Helper is_email_enabled(user, type) ──────────────────────────────────
--
-- Regle metier (cf. brief NG-045) :
--   - weekly_digest, goal_reminder, streak, species_digest : opt-in requis
--     (default FALSE). Ce sont des emails de retention/marketing, jamais
--     envoyes sans action explicite de l'utilisateur.
--   - reaction, follow, post : opt-out par defaut (default TRUE), coherent
--     avec le comportement in-app existant.

CREATE OR REPLACE FUNCTION public.is_email_enabled(p_user_id UUID, p_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  global_enabled BOOLEAN;
  pref BOOLEAN;
BEGIN
  -- Coupure globale : user_settings.email_notifications prime sur tout.
  SELECT email_notifications INTO global_enabled
  FROM public.user_settings
  WHERE user_id = p_user_id;

  IF global_enabled IS FALSE THEN
    RETURN FALSE;
  END IF;

  SELECT email_enabled INTO pref
  FROM public.notification_preferences
  WHERE user_id = p_user_id AND type = p_type;

  IF pref IS NULL THEN
    IF p_type IN ('species_digest', 'weekly_digest', 'goal_reminder', 'streak') THEN
      RETURN FALSE;
    END IF;
    RETURN TRUE;
  END IF;

  RETURN pref;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.is_email_enabled IS
  'Verifie si un user doit recevoir un email pour ce type. Verifie user_settings.email_notifications (global) puis notification_preferences.email_enabled (par type). Opt-in requis pour species_digest/weekly_digest/goal_reminder/streak.';
