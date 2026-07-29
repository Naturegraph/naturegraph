-- =============================================================================
-- Reaction sur un ECHANGE : notification distincte de la reaction de publication
-- =============================================================================
--
-- Probleme (retour Nicolas 2026-07-29) : quand quelqu'un reagit a un ECHANGE
-- (comment_reaction), la notification recue disait "a reagi a ton post", exactement
-- comme une reaction sur la publication. Impossible de distinguer les deux, ca se
-- melangeait avec le reste du centre de notifications.
--
-- Correctif : le trigger marque desormais `reference_type = 'echange'` (au lieu de
-- 'post') pour ces reactions. `reference_id` continue de pointer la PUBLICATION,
-- pour que le lien profond ouvre le fil d'echanges du post (`/post/:id?echanges=1`),
-- exactement la ou se trouve l'echange qui vient d'etre aime.
--
-- Cote client, `getMessage` lit ce `reference_type` : 'echange' -> "a reagi a ton
-- echange", sinon "a reagi a ton post". Le TYPE reste 'reaction' (meme geste, meme
-- pastille amber, meme icone coeur) : seule la phrase et la cible du lien changent.
--
-- On NE touche PAS aux reactions de publication (`notify_on_reaction`), inchangees.
-- =============================================================================

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

  -- Type 'reaction' (meme geste qu'un like de publication, aucun type de plus a
  -- creer), mais `reference_type = 'echange'` pour que le client dise "a reagi a
  -- ton echange" et non "a ton post". `reference_id` reste la PUBLICATION : c'est
  -- la seule cible que le centre de notifications sait ouvrir, et le lient profond
  -- deroule le fil d'echanges (`?echanges=1`) pile sur l'echange concerne.
  IF public.is_notif_enabled(v_auteur_echange, 'reaction') THEN
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (v_auteur_echange, 'reaction', COALESCE(v_pseudo, 'Utilisateur'),
            NEW.type, v_post, 'echange');
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

-- Trigger de fonction : aucune raison d'etre appelable en RPC.
REVOKE ALL ON FUNCTION public.notify_on_comment_reaction() FROM public, anon, authenticated;
