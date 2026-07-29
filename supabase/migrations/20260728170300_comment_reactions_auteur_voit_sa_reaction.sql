-- Correctif regression : l'auteur voit toujours sa propre reaction d'echange
-- =============================================================================
-- La migration 20260728170100 a durci `comment_reactions` (visibilite alignee
-- sur les reactions de post : `NOT is_internal_user AND can_see_post`). Mais
-- l'upsert de reaction d'echange (`basculerReactionEchange`) fait un RETURNING,
-- et pour un compte INTERNE la ligne retournee etait refusee par la clause
-- `NOT is_internal_user` -> "new row violates row-level security policy for
-- table comment_reactions" -> "Ta reaction n'a pas pu etre enregistree".
-- (Meme piege RLS-RETURNING que les echanges, cf. 20260728143000.)
--
-- Correctif : l'auteur d'une reaction voit TOUJOURS sa propre reaction (comme
-- l'auteur d'un echange voit le sien). Le durcissement reste pour les autres.
-- =============================================================================

drop policy if exists "Reactions echanges visibles" on public.comment_reactions;

create policy "Reactions echanges visibles" on public.comment_reactions
  for select
  to public
  using (
    (select auth.uid()) = user_id
    or (
      not is_internal_user(user_id)
      and exists (
        select 1 from public.comments c
        where c.id = comment_reactions.comment_id
          and can_see_post(c.post_id)
      )
    )
  );
