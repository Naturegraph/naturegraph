-- ============================================================================
-- Migration : trigger notification sur nouveau post (fan-out aux followers)
-- Date      : 2026-04-16
-- Epic      : Notifications §1.2
-- Description :
--   INSERT sur `posts` (status = 'published', visibility ∈ {public, followers})
--   → notification à chacun des followers de l'auteur.
--
--   Règles éco-conception / sécurité :
--     - SECURITY DEFINER + search_path = public (best practice)
--     - SAFEGUARD : limite le fan-out à 10 000 followers pour éviter
--       qu'un profil ultra-suivi ne génère des millions de lignes d'un coup.
--       Phase 2 : déplacer le fan-out vers une edge function batchée.
--     - Ne notifie PAS si status != 'published' (drafts/archives)
--     - Ne notifie PAS si visibility = 'private'
--     - reference_id   = post_id (deep-link vers le post)
--     - reference_type = 'post'
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_new_post()
RETURNS TRIGGER AS $$
DECLARE
  author_username VARCHAR;
  follower_count INT;
BEGIN
  -- Filtrer : uniquement posts publiés et visibles aux followers
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  IF NEW.visibility NOT IN ('public', 'followers') THEN
    RETURN NEW;
  END IF;

  -- Récupérer le username de l'auteur (une seule fois)
  SELECT username INTO author_username
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Safeguard : compter les followers avant fan-out
  SELECT COUNT(*) INTO follower_count
  FROM public.follows
  WHERE following_id = NEW.user_id;

  -- Au-delà du seuil, skip (à remplacer par edge function batchée)
  IF follower_count > 10000 THEN
    RAISE NOTICE 'notify_on_new_post: skipping fan-out (% followers) for post %',
      follower_count, NEW.id;
    RETURN NEW;
  END IF;

  -- Fan-out : une notification par follower
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    reference_id,
    reference_type
  )
  SELECT
    f.follower_id,
    'post',
    COALESCE(author_username, 'Utilisateur'),
    LEFT(NEW.description, 140),   -- aperçu limité à 140 chars
    NEW.id,
    'post'
  FROM public.follows f
  WHERE f.following_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attacher le trigger sur INSERT uniquement
DROP TRIGGER IF EXISTS trg_notify_on_new_post ON public.posts;

CREATE TRIGGER trg_notify_on_new_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_post();
