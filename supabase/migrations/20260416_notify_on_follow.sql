-- ============================================================================
-- Migration : trigger notification sur nouveau follow
-- Date      : 2026-04-16
-- Epic      : Notifications §1.1
-- Description :
--   INSERT sur `follows` → notification au profil suivi (following_id).
--   - title = username du nouveau follower
--   - body  = null (le type suffit à reconstituer le message côté front)
--   - reference_id   = follower_id (pour deep-link vers le profil du follower)
--   - reference_type = 'profile'
--
--   Pas d'auto-notification (self-follow bloqué par CHECK no_self_follow).
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  follower_username VARCHAR;
BEGIN
  -- Récupérer le username du nouveau follower
  SELECT username INTO follower_username
  FROM public.profiles
  WHERE id = NEW.follower_id;

  -- Insérer la notification pour le profil suivi
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    reference_id,
    reference_type
  ) VALUES (
    NEW.following_id,
    'follow',
    COALESCE(follower_username, 'Utilisateur'),
    NULL,
    NEW.follower_id,
    'profile'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attacher le trigger uniquement sur INSERT (unfollow n'a pas à notifier)
DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;

CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();
