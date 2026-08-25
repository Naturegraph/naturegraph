-- Distinguer une REPONSE d'un commentaire de premier niveau dans les notifs.
-- =============================================================================
-- Aujourd'hui, une reponse a ton commentaire te notifie bien (trigger
-- notify_on_comment, branche parent_id), mais la notif est indistinguable d'un
-- commentaire sur ta publication : meme type 'comment' + reference_type 'post'
-- -> l'UI affiche "a commente ton moment" dans les deux cas.
--
-- On pose reference_type = 'echange' pour les REPONSES (parent_id NON NULL, hors
-- proposition d'espece). L'UI peut alors afficher "a repondu a ton echange"
-- (cle messageCommentReply, jusqu'ici dormante) et le deep-link ouvre le fil
-- (resolveDeepLink case 'echange' -> /post/<id>?echanges=1, reference_id = post).
-- La section (Echanges) et la couleur (teal) restent inchangees : elles
-- dependent du TYPE ('comment'), pas de reference_type.
--
-- Seul le CASE du reference_type change ; tout le reste de notify_on_comment est
-- identique a 20260723170157. Idempotente (CREATE OR REPLACE). A appliquer dev
-- puis prod.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auteur_post uuid;
  v_auteur_parent uuid;
  v_pseudo varchar;
  v_cible uuid;
  v_type varchar;
  v_ref_type varchar;
BEGIN
  SELECT user_id INTO v_auteur_post FROM public.posts WHERE id = NEW.post_id;
  SELECT username INTO v_pseudo FROM public.profiles WHERE id = NEW.user_id;

  -- Une reponse previent la personne a qui on repond ; un echange de premier
  -- niveau previent l'auteur de la publication.
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_auteur_parent FROM public.comments WHERE id = NEW.parent_id;
    v_cible := v_auteur_parent;
  ELSE
    v_cible := v_auteur_post;
  END IF;

  -- Jamais de notification a soi-meme.
  IF v_cible IS NULL OR v_cible = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Une suggestion d'espece n'est pas un commentaire comme un autre.
  v_type := CASE WHEN NEW.species_label IS NOT NULL THEN 'identification' ELSE 'comment' END;

  -- REPONSE (parent_id) a un commentaire texte -> 'echange' (l'UI dira "a
  -- repondu a ton echange") ; sinon 'post' (commentaire/identification sur une
  -- publication, ouvre le fil du post).
  v_ref_type := CASE
    WHEN NEW.parent_id IS NOT NULL AND NEW.species_label IS NULL THEN 'echange'
    ELSE 'post'
  END;

  IF public.is_notif_enabled(v_cible, 'comment') THEN
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (v_cible, v_type, COALESCE(v_pseudo, 'Utilisateur'),
            left(COALESCE(NEW.species_label, NEW.content), 140),
            NEW.post_id, v_ref_type);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_on_comment a echoue (ignore): %', SQLERRM;
    RETURN NEW;
END;
$function$;
