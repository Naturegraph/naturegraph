-- NG-049 : l'auteur voit toujours son propre echange (corrige l'insertion cassee)
-- =============================================================================
-- BUG. La table `comments` porte une policy SELECT "Echanges visibles aux
-- membres" dont le predicat mettait `NOT is_internal_user(user_id)` au PREMIER
-- niveau (ANDe avec le reste). Or l'app publie un echange via
-- `.insert(...).select(...).single()`, ce qui se traduit cote Postgres par un
-- `INSERT ... RETURNING`. Postgres applique la policy SELECT a la ligne
-- RETURNING : pour un utilisateur INTERNE, `NOT is_internal_user(user_id)` est
-- faux, la ligne est refusee au retour, et Postgres remonte l'erreur
-- "new row violates row-level security policy for table comments".
-- Resultat : impossible de publier un echange depuis un compte interne (ce que
-- Nicolas utilise pour tester), alors que la base accepte parfaitement l'insert.
--
-- CORRECTIF. On restructure le predicat pour que l'AUTEUR puisse toujours relire
-- son propre echange (insert + retour OK), tout en gardant l'intention :
--   - l'auteur voit son echange (meme interne, meme masque en moderation) ;
--   - les moderateurs voient tout ;
--   - les AUTRES ne voient que les echanges de membres NON internes et visibles.
-- Les comptes internes restent donc invisibles aux autres membres et aux
-- visiteurs (policy anon inchangee).
--
-- Verifie en amont par reproduction sous l'identite reelle (admin interne +
-- membre), en transaction annulee : avant = erreur RLS pour l'interne ; apres =
-- INSERT...RETURNING renvoie la ligne pour les deux.
-- =============================================================================

drop policy if exists "Echanges visibles aux membres" on public.comments;

create policy "Echanges visibles aux membres" on public.comments
  for select
  to authenticated
  using (
    can_see_post(post_id)
    and (
      (select auth.uid()) = user_id                                  -- l'auteur, toujours
      or can_moderate((select auth.uid()))                           -- les moderateurs
      or (not is_internal_user(user_id) and moderation_status = 'visible')  -- les autres
    )
  );
