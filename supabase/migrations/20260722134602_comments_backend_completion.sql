-- NG-049 : completer le backend des commentaires
-- =============================================================================
-- Audit du 2026-07-22 : contrairement a ce que decrivait le ticket, l'essentiel
-- du backend EXISTAIT DEJA. Table `comments`, `posts.comments_count` + son
-- trigger, validation de longueur, trigger updated_at, et 4 policies RLS
-- (lecture publique via can_see_post, ecriture et modification par le
-- proprietaire). `moderation_reports` et `notification_preferences` acceptaient
-- deja le type 'comment'.
--
-- Cette migration comble les TROIS manques reels avant de construire le front.
-- =============================================================================

-- 1. Refuser un commentaire vide ------------------------------------------------
-- La validation ne testait QUE la longueur maximale. Un commentaire vide, ou
-- compose uniquement d'espaces, passait donc sans erreur : il gonflait le
-- compteur et polluait le fil.
-- Regle "securite des le depart" : le serveur refuse, meme si l'interface
-- empeche deja le cas. On ne fait jamais confiance au seul client.
CREATE OR REPLACE FUNCTION public.validate_comment_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.content IS NULL OR btrim(NEW.content) = '' THEN
    RAISE EXCEPTION 'Le commentaire ne peut pas etre vide';
  END IF;

  IF LENGTH(NEW.content) > 1000 THEN
    RAISE EXCEPTION 'Commentaire trop long (max 1000 caracteres)';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Suppression par la moderation ----------------------------------------------
-- La policy DELETE existante ne couvre que le proprietaire : un commentaire
-- signale ne pouvait donc pas etre retire.
--
-- `can_moderate` (super_admin + moderateur) et NON `is_admin`, qui inclut aussi
-- le support et l'equipe produit. Supprimer du contenu ecrit par quelqu'un est
-- un acte de moderation : on ouvre le cercle le plus etroit possible.
--
-- Le compteur se decremente tout seul, le trigger existant couvre DELETE.
CREATE POLICY "Moderators can delete any comment" ON public.comments
FOR DELETE
TO authenticated
USING (public.can_moderate((SELECT auth.uid())));

-- 3. Notifier l'auteur de la publication ----------------------------------------
-- Sans ca, personne ne sait qu'il a ete commente.
--
-- Deux garde-fous :
--   - on ne se notifie JAMAIS soi-meme en commentant sa propre publication ;
--   - on respecte la preference utilisateur via `is_notif_enabled`, comme les
--     triggers reaction et follow existants.
--
-- Le corps porte un extrait du commentaire : la cloche le tronque a 2 lignes,
-- ce qui donne le contexte sans avoir a ouvrir la publication.
--
-- EXCEPTION WHEN OTHERS : une panne de notification ne doit JAMAIS empecher la
-- publication d'un commentaire. Meme principe que l'alerte d'inscriptions
-- (NG-041) : la fonctionnalite principale prime sur son accessoire.
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auteur_post uuid;
  v_pseudo varchar;
BEGIN
  SELECT user_id INTO v_auteur_post FROM public.posts WHERE id = NEW.post_id;

  -- Publication introuvable, ou l'auteur commente chez lui : rien a notifier.
  IF v_auteur_post IS NULL OR v_auteur_post = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF public.is_notif_enabled(v_auteur_post, 'comment') THEN
    SELECT username INTO v_pseudo FROM public.profiles WHERE id = NEW.user_id;

    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (
      v_auteur_post,
      'comment',
      COALESCE(v_pseudo, 'Utilisateur'),
      left(NEW.content, 140),
      NEW.post_id,
      'post'
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_on_comment a echoue (ignore): %', SQLERRM;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_on_comment_trigger ON public.comments;
CREATE TRIGGER notify_on_comment_trigger
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM authenticated;

-- Verifie en conditions reelles apres application (puis nettoye) :
--   commentaire vide -> REJETE
--   compteur posts.comments_count -> 0 puis 1
--   notification a l'auteur -> 0 puis 1
--   auteur commentant sa propre publication -> aucune notification creee
