-- ============================================================================
-- Amelioration UX MVP : notifications catch-up sur follow
-- ============================================================================
--
-- Probleme observe : un utilisateur qui follow quelqu'un dont le dernier post
-- date d'AVANT le follow ne recoit JAMAIS de notif post de ce user
-- (le trigger notify_on_new_post ne fire qu'a l'INSERT du post).
--
-- Resultat : le panneau notifications reste vide en permanence pour les users
-- qui sont follower mais n'ont aucune interaction sur leur propre contenu
-- -> impression "le systeme ne fonctionne pas".
--
-- Fix produit : enrichir notify_on_follow pour pousser AUSSI un notif post
-- de bienvenue avec le dernier post du user suivi (si < 30j, status published,
-- visibilite publique). Limite a 1 notif catch-up par follow pour eviter le
-- spam si compte avec plein de vieux posts.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_on_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  follower_username VARCHAR;
  recent_post RECORD;
BEGIN
  -- 1. Notif "X te suis" pour la personne suivie (comportement existant)
  IF public.is_notif_enabled(NEW.following_id, 'follow') THEN
    SELECT username INTO follower_username FROM public.profiles WHERE id = NEW.follower_id;
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (NEW.following_id, 'follow', COALESCE(follower_username, 'Utilisateur'),
            NULL, NEW.follower_id, 'profile');
  END IF;

  -- 2. NOUVEAU : notif catch-up pour le follower (decouverte derniere publication)
  --    Limite : 1 post le plus recent, < 30 jours, status published, visibilite publique
  --    Evite le spam si compte avec plein de vieux posts.
  IF public.is_notif_enabled(NEW.follower_id, 'post') THEN
    SELECT p.id, p.description, pr.username
      INTO recent_post
    FROM public.posts p
    LEFT JOIN public.profiles pr ON pr.id = p.user_id
    WHERE p.user_id = NEW.following_id
      AND p.status = 'published'
      AND p.visibility IN ('public', 'followers')
      AND p.created_at > NOW() - INTERVAL '30 days'
    ORDER BY p.created_at DESC
    LIMIT 1;

    IF recent_post.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
      VALUES (NEW.follower_id, 'post', COALESCE(recent_post.username, 'Utilisateur'),
              LEFT(recent_post.description, 140), recent_post.id, 'post');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
