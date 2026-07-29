-- NG-049 : edition de son echange, signalement, masquage automatique
-- =============================================================================
-- APPLIQUEE sur naturegraph-prod le 2026-07-23 (version 20260723030330).
--
-- ATTENTION : CETTE MIGRATION A INTRODUIT UNE REGRESSION, corrigee par les deux
-- migrations suivantes (`..._correctif_policy_lecture` puis
-- `..._policy_lecture_par_role`). Elle est archivee TELLE QU'APPLIQUEE : la
-- rejouer seule sur un environnement neuf laisserait la faille ouverte, les
-- trois fichiers doivent etre passes dans l'ordre. Le detail de l'erreur est
-- explique dans le correctif.
--
-- Demande Nicolas 2026-07-22 : "je devrais pouvoir modifier un commentaire que
-- j'ai cree en tout temps et signaler d'autres commentaires (...) si plusieurs
-- signalements on le cache le temps de le traiter".
--
-- Aucun mecanisme de masquage automatique n'existait dans le projet, ni pour
-- les publications : celui-ci est le premier. Il est volontairement limite aux
-- echanges tant qu'il n'a pas fait ses preuves.
-- =============================================================================

-- 1. Edition ---------------------------------------------------------------
-- `edited_at` plutot qu'un simple booleen : savoir QUAND un message a change
-- compte en moderation, un texte reecrit apres coup ne se traite pas comme un
-- texte d'origine.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 2. Etat de moderation ----------------------------------------------------
--   visible     : normal
--   auto_hidden : masque automatiquement, en attente de decision humaine
--   removed     : retire par la moderation
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible';

ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_moderation_status_valide;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_moderation_status_valide
  CHECK (moderation_status IN ('visible', 'auto_hidden', 'removed'));

CREATE INDEX IF NOT EXISTS comments_moderation_idx
  ON public.comments (moderation_status)
  WHERE moderation_status <> 'visible';

-- 3. Edition : seul l'auteur, et seulement le TEXTE -------------------------
-- Une policy UPDATE ne sait pas restreindre les colonnes. Sans ce trigger,
-- l'auteur pourrait rattacher son message a une autre publication, se declarer
-- reponse d'un autre fil, ou se re-rendre visible apres un masquage.
CREATE OR REPLACE FUNCTION public.verrouiller_edition_echange()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- La moderation (SECURITY DEFINER, hors session utilisateur) n'est pas
  -- concernee : elle passe par des fonctions dediees.
  IF (SELECT auth.uid()) IS DISTINCT FROM OLD.user_id THEN
    RETURN NEW;
  END IF;

  IF NEW.post_id IS DISTINCT FROM OLD.post_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    RAISE EXCEPTION 'Seul le texte d un echange peut etre modifie';
  END IF;

  -- Horodatage pose par la base : un client ne doit pas pouvoir mentir sur la
  -- date de modification.
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edited_at := now();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS verrouiller_edition_echange_trigger ON public.comments;
CREATE TRIGGER verrouiller_edition_echange_trigger
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.verrouiller_edition_echange();

DROP POLICY IF EXISTS "Auteur modifie son echange" ON public.comments;
CREATE POLICY "Auteur modifie son echange" ON public.comments
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. Masquage automatique sur signalements ---------------------------------
-- SEUIL DE 3 PERSONNES DISTINCTES, et non 3 signalements : sans le DISTINCT,
-- une seule personne pourrait faire disparaitre n'importe quel message en
-- signalant trois fois. Sur une communaute de cette taille, trois personnes
-- differentes est un signal serieux, et le masquage reste reversible.
CREATE OR REPLACE FUNCTION public.masquer_echange_si_signale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_signaleurs integer;
BEGIN
  IF NEW.target_type <> 'comment' THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT reporter_id) INTO v_signaleurs
  FROM public.moderation_reports
  WHERE target_type = 'comment'
    AND target_id = NEW.target_id
    AND status IN ('new', 'in_review');

  IF v_signaleurs >= 3 THEN
    UPDATE public.comments
    SET moderation_status = 'auto_hidden'
    WHERE id = NEW.target_id
      AND moderation_status = 'visible';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Un echec de masquage ne doit JAMAIS empecher l'enregistrement du
    -- signalement : perdre le signalement serait pire que garder le message
    -- visible une heure de plus.
    RAISE WARNING 'masquer_echange_si_signale a echoue (ignore): %', SQLERRM;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS masquer_echange_si_signale_trigger ON public.moderation_reports;
CREATE TRIGGER masquer_echange_si_signale_trigger
AFTER INSERT ON public.moderation_reports
FOR EACH ROW EXECUTE FUNCTION public.masquer_echange_si_signale();

-- 5. Lecture : un echange masque disparait, sauf pour son auteur et la moderation
-- ATTENTION : C'EST ICI QU'ETAIT L'ERREUR. Cette policy s'AJOUTE a la policy
-- existante au lieu de la remplacer, et PostgreSQL combine les policies
-- permissives avec OR. Corrige par la migration suivante.
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Echanges visibles" ON public.comments;
CREATE POLICY "Echanges visibles" ON public.comments
FOR SELECT USING (
  moderation_status = 'visible'
  OR (SELECT auth.uid()) = user_id
  OR public.can_moderate((SELECT auth.uid()))
);

-- 6. Decision de moderation ------------------------------------------------
CREATE OR REPLACE FUNCTION public.trancher_echange_signale(
  p_comment_id uuid,
  p_decision text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.can_moderate((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Action reservee a la moderation';
  END IF;

  IF p_decision NOT IN ('visible', 'removed') THEN
    RAISE EXCEPTION 'Decision invalide : visible ou removed';
  END IF;

  UPDATE public.comments SET moderation_status = p_decision WHERE id = p_comment_id;

  -- Retablir un message clot les signalements en cours : les laisser ouverts
  -- le ferait re-masquer au signalement suivant, en boucle.
  IF p_decision = 'visible' THEN
    UPDATE public.moderation_reports
    SET status = 'dismissed'
    WHERE target_type = 'comment'
      AND target_id = p_comment_id
      AND status IN ('new', 'in_review');
  ELSE
    UPDATE public.moderation_reports
    SET status = 'resolved'
    WHERE target_type = 'comment'
      AND target_id = p_comment_id
      AND status IN ('new', 'in_review');
  END IF;

  RETURN p_decision;
END;
$function$;

REVOKE ALL ON FUNCTION public.trancher_echange_signale(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.trancher_echange_signale(uuid, text) TO authenticated;
