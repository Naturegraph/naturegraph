-- Migration: 20260707_email_prefs_opt_out
-- NG-045 : modele de consentement des emails de retention (E1-E4).
--
-- Decision (validee avec Nicolas) : les emails de retention first-party lies a
-- l'activite propre de l'utilisateur (E1 resume hebdo / E2 manque = weekly_digest,
-- E3 objectif = goal_reminder, E4 serie = streak) sont en OPT-OUT (defaut TRUE),
-- comme les notifs sociales (reaction/follow/post). Ils restent :
--   - coupables globalement par user_settings.email_notifications (interrupteur maitre),
--   - desabonnables individuellement par type (email_enabled = false).
-- Seul species_digest reste en OPT-IN explicite (defaut FALSE, choisi a l'onboarding).
--
-- Sans ce changement, is_email_enabled renvoyait FALSE par defaut pour
-- goal_reminder/streak/weekly_digest -> aucun email de retention n'aurait pu
-- partir, ce qui viderait NG-045 de son objectif.

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
    -- Seul species_digest requiert un opt-in explicite (RGPD).
    IF p_type = 'species_digest' THEN
      RETURN FALSE;
    END IF;
    -- Tout le reste (social + retention E1-E4) : opt-out par defaut.
    RETURN TRUE;
  END IF;

  RETURN pref;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.is_email_enabled IS
  'Verifie si un user doit recevoir un email pour ce type. Global email_notifications puis notification_preferences.email_enabled. Opt-in requis uniquement pour species_digest ; tout le reste opt-out.';
