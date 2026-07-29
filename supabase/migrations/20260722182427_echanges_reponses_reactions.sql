-- NG-049 : reponses sous un echange, et reactions sur un echange
-- =============================================================================
-- Elargissement demande par Nicolas le 2026-07-22 : le ticket excluait ces deux
-- points, sa decision les reintegre pour renforcer l'aspect communautaire.
--
-- "Ca m'a aide" (colonne `helpful`) est ECARTE de l'interface, juge peu clair.
-- La colonne et la RPC restent en base, dormantes : les retirer serait une
-- migration destructive pour une decision annoncee comme provisoire.
--
-- Applique sur naturegraph-prod le 2026-07-22 (version 20260722182427).
-- Les DROP POLICY IF EXISTS servent a pouvoir rejouer ce fichier sur un
-- environnement neuf sans erreur : PostgreSQL n'a pas de CREATE POLICY IF NOT
-- EXISTS.
-- =============================================================================

-- 1. Reponses : UN SEUL niveau ---------------------------------------------------
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments (parent_id) WHERE parent_id IS NOT NULL;

-- Un fil de discussion imbrique sans fin devient illisible sur mobile, et
-- chaque niveau supplementaire divise la largeur utile. On plafonne donc a un
-- niveau : on repond a un echange, jamais a une reponse.
CREATE OR REPLACE FUNCTION public.validate_comment_depth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_grand_parent uuid;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT parent_id INTO v_grand_parent FROM public.comments WHERE id = NEW.parent_id;
    IF v_grand_parent IS NOT NULL THEN
      RAISE EXCEPTION 'On ne repond pas a une reponse : un seul niveau';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_comment_depth_trigger ON public.comments;
CREATE TRIGGER validate_comment_depth_trigger
BEFORE INSERT OR UPDATE OF parent_id ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.validate_comment_depth();

-- 2. Reactions sur un echange ----------------------------------------------------
-- Jeu volontairement COURT et adapte a une conversation naturaliste, plutot que
-- de recopier les 5 reactions des publications : sur un message, trois choix
-- suffisent et evitent la barre d'emojis a rallonge.
--   coeur   : merci, ca m'a touche
--   accord  : je suis d'accord
--   confirme: je confirme cette identification (valeur naturaliste reelle)
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('coeur', 'accord', 'confirme')),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Une seule reaction par personne et par echange : on change d'avis, on
  -- n'empile pas.
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Lecture publique, comme les echanges eux-memes : un visiteur sans compte voit
-- la conversation dans son entier (suite de NG-054).
DROP POLICY IF EXISTS "Reactions echanges visibles" ON public.comment_reactions;
CREATE POLICY "Reactions echanges visibles" ON public.comment_reactions
FOR SELECT USING (true);

-- On ne reagit que pour soi.
DROP POLICY IF EXISTS "Reagir pour soi" ON public.comment_reactions;
CREATE POLICY "Reagir pour soi" ON public.comment_reactions
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Modifier sa reaction" ON public.comment_reactions;
CREATE POLICY "Modifier sa reaction" ON public.comment_reactions
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Retirer sa reaction" ON public.comment_reactions;
CREATE POLICY "Retirer sa reaction" ON public.comment_reactions
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- 3. Notifier l'auteur du message auquel on repond -------------------------------
-- Le trigger existant prevenait l'auteur de la PUBLICATION. Une reponse doit
-- surtout prevenir la personne a qui l'on repond, sinon elle ne saura jamais
-- qu'on lui a repondu.
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

  IF public.is_notif_enabled(v_cible, 'comment') THEN
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (v_cible, 'comment', COALESCE(v_pseudo, 'Utilisateur'),
            left(NEW.content, 140), NEW.post_id, 'post');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_on_comment a echoue (ignore): %', SQLERRM;
    RETURN NEW;
END;
$function$;
