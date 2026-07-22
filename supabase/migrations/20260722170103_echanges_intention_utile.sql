-- NG-049 : Echanges, intention et echange utile
-- =============================================================================
-- Deux ajouts qui distinguent les Echanges Naturegraph d'un fil de commentaires
-- classique, sans casser les usages connus.
--
-- 1. INTENTION : on demande a quoi sert le message AVANT de l'ecrire.
--    Sur une communaute jeune, le premier frein n'est pas la mauvaise volonte,
--    c'est le champ vide : on ne sait pas quoi dire, donc on ne dit rien.
--    Proposer une intention debloque, et transforme une pile de "superbe photo"
--    en savoir naturaliste exploitable.
--
-- 2. UTILE : l'auteur de la publication distingue UN echange qui l'a aide.
--    On recompense la qualite, jamais le volume : compter les messages
--    encouragerait le bavardage, ce que la charte du projet refuse
--    ("ton bienveillant, jamais culpabilisant").
--
-- La table reste `comments` : renommer une table en production pour du
-- vocabulaire ne vaut pas le risque. Seule l'interface dit "Echanges".
-- =============================================================================

-- 1. Intention de l'echange ------------------------------------------------------
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS intention text NOT NULL DEFAULT 'reaction';

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_intention_check;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_intention_check
  CHECK (intention IN ('reaction', 'identification', 'info_locale', 'encouragement'));

COMMENT ON COLUMN public.comments.intention IS
  'A quoi sert l echange : reaction (defaut), identification, info_locale, encouragement.';

-- 2. Echange distingue par l'auteur de la publication ----------------------------
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS helpful boolean NOT NULL DEFAULT false;

-- UN SEUL echange utile par publication : la distinction perd tout son sens si
-- on peut en marquer dix. L'index partiel fait respecter la regle EN BASE, pas
-- seulement dans l'interface.
CREATE UNIQUE INDEX IF NOT EXISTS comments_un_seul_utile_par_post
  ON public.comments (post_id) WHERE helpful;

-- 3. Basculer "utile" : RPC plutot qu'une policy UPDATE ---------------------------
-- Une policy UPDATE laisserait l'auteur de la publication modifier le TEXTE des
-- echanges des autres, ce qui est inacceptable. La RLS ne sait pas restreindre
-- une colonne : on passe donc par une fonction qui ne touche QUE `helpful` et
-- verifie que l'appelant est bien l'auteur de la publication.
CREATE OR REPLACE FUNCTION public.toggle_comment_helpful(p_comment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_post uuid;
  v_auteur_echange uuid;
  v_auteur_post uuid;
  v_etat boolean;
  v_pseudo varchar;
BEGIN
  SELECT c.post_id, c.user_id, c.helpful INTO v_post, v_auteur_echange, v_etat
  FROM public.comments c WHERE c.id = p_comment_id;

  IF v_post IS NULL THEN
    RAISE EXCEPTION 'Echange introuvable';
  END IF;

  SELECT p.user_id INTO v_auteur_post FROM public.posts p WHERE p.id = v_post;

  -- Seul l'auteur de la publication distingue un echange.
  IF v_auteur_post IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Seul l auteur de la publication peut marquer un echange comme utile';
  END IF;

  -- Un seul a la fois : on retire la distinction precedente avant de la poser.
  IF NOT v_etat THEN
    UPDATE public.comments SET helpful = false WHERE post_id = v_post AND helpful;
  END IF;

  UPDATE public.comments SET helpful = NOT v_etat WHERE id = p_comment_id;

  -- Notification chaleureuse a la personne qui a aide, jamais a soi-meme.
  IF NOT v_etat AND v_auteur_echange <> v_auteur_post THEN
    SELECT username INTO v_pseudo FROM public.profiles WHERE id = v_auteur_post;
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (v_auteur_echange, 'comment', COALESCE(v_pseudo, 'Utilisateur'),
            'a trouve ton echange utile', v_post, 'post');
  END IF;

  RETURN NOT v_etat;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.toggle_comment_helpful(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.toggle_comment_helpful(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_comment_helpful(uuid) TO authenticated;

-- Verifie en conditions reelles apres application (puis nettoye) :
--   un tiers tentant de distinguer un echange -> REFUSE
--   deux distinctions successives -> 1 seul echange reste marque
--   intention enregistree correctement
