-- Lecture des echanges : une policy PAR ROLE
-- =============================================================================
-- APPLIQUEE sur naturegraph-prod le 2026-07-23 (version 20260723030422).
--
-- La policy precedente ciblait le role `public` (donc `anon` inclus) et
-- appelait `can_moderate`, sur laquelle `anon` n'a pas EXECUTE. Resultat :
-- "permission denied for function can_moderate" et PLUS AUCUNE lecture
-- anonyme, ce qui cassait la lecture ouverte aux visiteurs (NG-054).
--
-- On separe donc par role plutot que d'ouvrir `can_moderate` a `anon` :
-- personne d'anonyme n'a de raison d'appeler une fonction de moderation.
--
-- Les deux policies ciblant des roles DISTINCTS, une seule s'applique par
-- session : leur combinaison en OR est sans effet de bord.
--
-- PIEGE A RETENIR : une policy `TO public` qui appelle un helper non executable
-- par `anon` ne renvoie pas "faux", elle fait ECHOUER la requete entiere. Sur
-- une table vide le probleme reste invisible, le qual n'etant jamais evalue :
-- verifier les privileges de fonction, pas seulement le resultat d'un SELECT.
-- =============================================================================

DROP POLICY IF EXISTS "Comments visible on accessible posts" ON public.comments;

-- Visiteur sans compte : uniquement les echanges non masques.
CREATE POLICY "Echanges visibles aux visiteurs" ON public.comments
FOR SELECT TO anon USING (
  can_see_post(post_id)
  AND NOT is_internal_user(user_id)
  AND moderation_status = 'visible'
);

-- Personne connectee : idem, plus son propre echange masque (sinon elle
-- croirait a une perte de donnee) et, pour la moderation, tous les echanges.
CREATE POLICY "Echanges visibles aux membres" ON public.comments
FOR SELECT TO authenticated USING (
  can_see_post(post_id)
  AND NOT is_internal_user(user_id)
  AND (
    moderation_status = 'visible'
    OR (SELECT auth.uid()) = user_id
    OR public.can_moderate((SELECT auth.uid()))
  )
);
