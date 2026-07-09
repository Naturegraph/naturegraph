-- ============================================================================
-- Migration : profiles.last_active_at + heartbeat (NG-045 Phase 0)
-- Date      : 2026-07-02
-- Epic      : Notifications email intelligent
-- Description :
--   E7 ne doit pas envoyer d'email si le user est connecte depuis moins de
--   30 minutes. Rien ne trace l'activite recente aujourd'hui :
--   auth.users.last_sign_in_at ne bouge qu'au login, pas pendant la session
--   (un user actif depuis 3h afficherait un last_sign_in_at perime).
--
--   RPC minimaliste plutot qu'une table de sessions completes : un seul
--   timestamp par profil, mis a jour par un heartbeat client throttle
--   (~5 min, sur focus/visibilitychange). Suffisant pour la regle des 30 min
--   de E7, et reutilisable plus tard par NG-035 pour la definition
--   "utilisateur actif" (pas encore tranchee dans ce ticket).
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.last_active_at IS
  'Derniere activite connue (heartbeat client throttle ~5min). Sert a E7 (pas d''email si actif < 30min). Pas une donnee de presence temps reel precise.';

-- RPC : le client authentifie met a jour uniquement SA propre ligne.
-- SECURITY INVOKER (pas DEFINER) : s'execute avec les droits de l'appelant,
-- la policy RLS "update own profile" deja en place s'applique donc normalement.
CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

COMMENT ON FUNCTION public.touch_last_active IS
  'Heartbeat : met a jour profiles.last_active_at pour l''utilisateur authentifie courant. Appele par le client, throttle cote app (~5min).';

REVOKE ALL ON FUNCTION public.touch_last_active() FROM public;
GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated;
