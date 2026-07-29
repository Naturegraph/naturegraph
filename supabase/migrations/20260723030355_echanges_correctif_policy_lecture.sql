-- CORRECTIF IMMEDIAT d'une regression introduite quelques minutes plus tot.
-- =============================================================================
-- APPLIQUEE sur naturegraph-prod le 2026-07-23 (version 20260723030355).
--
-- La migration `20260723030330_echanges_moderation_et_edition` a AJOUTE une
-- policy SELECT "Echanges visibles" a cote de "Comments visible on accessible
-- posts", au lieu de modifier cette derniere.
--
-- PostgreSQL combine les policies permissives avec OR. Le resultat effectif
-- etait donc :
--
--   (can_see_post AND NOT is_internal_user)  OR  (moderation_status='visible')
--
-- ce qui rendait TOUT echange visible lisible meme sur une publication non
-- accessible, et reintroduisait les comptes internes. Les deux garde-fous
-- etaient annules.
--
-- On revient a UNE SEULE policy SELECT, qui combine les trois conditions avec
-- des AND, comme il aurait fallu le faire d'emblee.
--
-- LECON : ajouter une policy permissive n'RESTREINT jamais, cela ELARGIT. Pour
-- durcir une lecture, il faut modifier la policy existante, pas en poser une
-- seconde a cote.
-- =============================================================================

DROP POLICY IF EXISTS "Echanges visibles" ON public.comments;

DROP POLICY IF EXISTS "Comments visible on accessible posts" ON public.comments;
CREATE POLICY "Comments visible on accessible posts" ON public.comments
FOR SELECT USING (
  can_see_post(post_id)
  AND NOT is_internal_user(user_id)
  AND (
    -- Un echange masque disparait, sauf pour son auteur (sinon il croirait a
    -- une perte de donnee) et pour la moderation, qui doit pouvoir trancher.
    moderation_status = 'visible'
    OR (SELECT auth.uid()) = user_id
    OR public.can_moderate((SELECT auth.uid()))
  )
);

-- Doublon de "Users can edit own comments", qui existait deja et porte la meme
-- condition : deux policies permissives identiques n'ajoutent rien et brouillent
-- la lecture de la securite.
DROP POLICY IF EXISTS "Auteur modifie son echange" ON public.comments;
