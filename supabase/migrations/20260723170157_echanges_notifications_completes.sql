-- NG-049 : notifications completes du fil d'Echanges
-- =============================================================================
-- APPLIQUEE sur naturegraph-prod le 2026-07-23 (version 20260723170157).
--
-- Trou constate le 2026-07-23 (question de Nicolas : "je recois un j'aime sur
-- mon commentaire ?"). Reponse : non.
--
-- ETAT AVANT :
--   - nouvel echange sur ma publication      -> notifie (type 'comment')
--   - reponse a mon echange                  -> notifie (type 'comment')
--   - COEUR sur mon echange                  -> RIEN, aucun trigger sur
--                                               `comment_reactions`
--   - proposition d'espece                   -> notifiee comme un 'comment'
--                                               ordinaire, indistinguable
--
-- Le type 'identification' existait pourtant deja dans `NotificationType` cote
-- front, mais rien ne l'emettait.
-- =============================================================================

-- 1. Distinguer la proposition d'espece --------------------------------------
-- Le type porte le SENS de l'evenement : c'est lui qui choisit la phrase
-- affichee et la pastille de couleur. Envoyer 'comment' pour tout obligeait
-- l'interface a deviner, ce qu'elle ne peut pas faire.
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

  -- Une suggestion d'espece n'est pas un commentaire comme un autre : c'est
  -- une contribution a l'identification, et l'auteur de la publication doit
  -- pouvoir la reperer au milieu du reste.
  v_type := CASE WHEN NEW.species_label IS NOT NULL THEN 'identification' ELSE 'comment' END;

  -- Les preferences de notification n'ont pas d'entree 'identification' : on
  -- interroge donc 'comment', qui couvre l'ensemble du fil. Une personne qui
  -- coupe les echanges coupe aussi les propositions d'espece, ce qui est
  -- coherent : les deux arrivent au meme endroit.
  IF public.is_notif_enabled(v_cible, 'comment') THEN
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (v_cible, v_type, COALESCE(v_pseudo, 'Utilisateur'),
            left(COALESCE(NEW.species_label, NEW.content), 140),
            NEW.post_id, 'post');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_on_comment a echoue (ignore): %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- 2. Coeur sur un echange ----------------------------------------------------
-- Recevoir un signe de reconnaissance sur ce qu'on a ecrit est ce qui donne
-- envie de reecrire. Ne rien notifier revenait a rendre le geste invisible
-- pour celui a qui il s'adressait.
CREATE OR REPLACE FUNCTION public.notify_on_comment_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auteur_echange uuid;
  v_post uuid;
  v_pseudo varchar;
BEGIN
  SELECT user_id, post_id INTO v_auteur_echange, v_post
  FROM public.comments WHERE id = NEW.comment_id;

  -- Jamais de notification a soi-meme.
  IF v_auteur_echange IS NULL OR v_auteur_echange = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT username INTO v_pseudo FROM public.profiles WHERE id = NEW.user_id;

  -- Type 'reaction' : c'est le meme geste que sur une publication, il n'y a
  -- aucune raison de creer un type de plus. `reference_id` pointe la
  -- PUBLICATION, seule cible que sait ouvrir le centre de notifications.
  IF public.is_notif_enabled(v_auteur_echange, 'reaction') THEN
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (v_auteur_echange, 'reaction', COALESCE(v_pseudo, 'Utilisateur'),
            NEW.type, v_post, 'post');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Un echec de notification ne doit JAMAIS empecher la reaction elle-meme :
    -- perdre le coeur serait pire que perdre l'alerte.
    RAISE WARNING 'notify_on_comment_reaction a echoue (ignore): %', SQLERRM;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_on_comment_reaction_trigger ON public.comment_reactions;
CREATE TRIGGER notify_on_comment_reaction_trigger
AFTER INSERT ON public.comment_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_reaction();

-- 3. Durcissement -----------------------------------------------------------
-- Les fonctions de trigger n'ont aucune raison d'etre appelables en RPC : sans
-- contexte de trigger elles echouent, mais les exposer reste du bruit inutile
-- dans la surface publique de l'API.
REVOKE ALL ON FUNCTION public.notify_on_comment_reaction() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.masquer_echange_si_signale() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.verrouiller_edition_echange() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_comment_depth() FROM public, anon, authenticated;
