-- Anti-fantome C4 Phase 2 (2026-08-10) : autoriser le statut 'pending' + cabler les
-- triggers sur le flip pending->published. Les fonctions notify_on_new_post et
-- update_user_posts_count etaient DEJA ecrites pour ce flux (elles gardent sur
-- status='published') ; leurs triggers etaient seulement branches sur INSERT.
--
-- Effet : le pipeline de publication cree un post en 'pending' quand il y a des
-- photos a attacher (il n'apparait pas au feed, ne notifie pas), puis le passe
-- 'published' apres l'upload -> plus de post fantome ni de fausse notif "9 puis 0".
-- Additif et non-cassant : les 161 posts existants sont 'published', comportement
-- inchange pour eux.

-- 1. Autoriser 'pending' dans la contrainte de statut.
ALTER TABLE public.posts DROP CONSTRAINT posts_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check
  CHECK (status::text = ANY (ARRAY['draft','published','archived','pending']::text[]));

-- 2. notify_on_new_post : garde anti re-notification lors d'une simple edition d'un
--    post deja publie (le trigger ecoute desormais aussi les UPDATE de statut).
CREATE OR REPLACE FUNCTION public.notify_on_new_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE author_username VARCHAR; follower_count INT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM 'published' THEN RETURN NEW; END IF;
  IF NEW.visibility NOT IN ('public','followers') THEN RETURN NEW; END IF;
  SELECT username INTO author_username FROM public.profiles WHERE id = NEW.user_id;
  SELECT COUNT(*) INTO follower_count FROM public.follows WHERE following_id = NEW.user_id;
  IF follower_count > 10000 THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
  SELECT f.follower_id, 'post', COALESCE(author_username,'Utilisateur'),
         LEFT(NEW.description,140), NEW.id, 'post'
  FROM public.follows f
  WHERE f.following_id = NEW.user_id AND public.is_notif_enabled(f.follower_id,'post');
  RETURN NEW;
END; $fn$;

-- 3. Rebrancher les triggers sur INSERT + UPDATE de statut (et DELETE pour le compteur).
DROP TRIGGER trg_notify_on_new_post ON public.posts;
CREATE TRIGGER trg_notify_on_new_post AFTER INSERT OR UPDATE OF status ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_post();

DROP TRIGGER update_user_posts_count ON public.posts;
CREATE TRIGGER update_user_posts_count AFTER INSERT OR UPDATE OF status OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_user_posts_count();
