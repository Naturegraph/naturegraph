-- ============================================================================
-- Migration: reactions CHECK constraint + notification trigger on reactions
-- Date: 2026-04-13
-- Description:
--   1. Met à jour le CHECK constraint de la colonne `type` de la table `reactions`
--      pour correspondre aux types frontend (love, admire, fire, wow, curious, disappointed)
--   2. Crée un trigger qui insère automatiquement une notification quand un utilisateur
--      reçoit une réaction sur un de ses posts
-- ============================================================================

-- ─── 1. Mise à jour CHECK constraint reactions.type ─────────────────────────

ALTER TABLE public.reactions
  DROP CONSTRAINT IF EXISTS reactions_type_check;

ALTER TABLE public.reactions
  ADD CONSTRAINT reactions_type_check
  CHECK (type IN ('love', 'admire', 'fire', 'wow', 'curious', 'disappointed'));

-- ─── 2. Trigger : notification automatique à chaque réaction reçue ──────────
--
-- Logique :
--   - INSERT sur reactions → notification au propriétaire du post
--   - On ne notifie PAS si l'auteur réagit à son propre post
--   - reference_id = post_id pour lien direct vers le post
--   - reference_type = 'post'
--   - title = username du réacteur
--   - body = type de réaction (emoji côté frontend)

CREATE OR REPLACE FUNCTION notify_on_reaction()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  reactor_username VARCHAR;
BEGIN
  -- Récupérer l'auteur du post
  SELECT user_id INTO post_author_id
  FROM public.posts
  WHERE id = NEW.post_id;

  -- Ne pas notifier si l'utilisateur réagit à son propre post
  IF post_author_id IS NULL OR post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Récupérer le username du réacteur
  SELECT username INTO reactor_username
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Insérer la notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    reference_id,
    reference_type
  ) VALUES (
    post_author_id,
    'reaction',
    COALESCE(reactor_username, 'Utilisateur'),
    NEW.type,
    NEW.post_id,
    'post'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attacher le trigger sur INSERT uniquement (pas UPDATE/DELETE)
DROP TRIGGER IF EXISTS trg_notify_on_reaction ON public.reactions;

CREATE TRIGGER trg_notify_on_reaction
  AFTER INSERT ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_reaction();
