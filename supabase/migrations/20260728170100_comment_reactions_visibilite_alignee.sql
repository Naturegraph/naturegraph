-- Aligner la visibilite des reactions d'echange sur celle des reactions de post
-- =============================================================================
-- Decision Nicolas 2026-07-28 : "faire comme les reactions" (de publication).
-- La policy SELECT de `comment_reactions` etait `USING (true)` : n'importe qui
-- pouvait lire TOUTES les reactions d'echange, y compris sur des echanges
-- invisibles (post non accessible) ou d'auteurs internes.
--
-- On reprend exactement la logique des reactions de post
-- ("Reactions visible on accessible posts" = can_see_post AND NOT
-- is_internal_user) transposee via l'echange porteur (comment_reactions n'a pas
-- de post_id, on le retrouve par le comment).
-- =============================================================================

drop policy if exists "Reactions echanges visibles" on public.comment_reactions;

create policy "Reactions echanges visibles" on public.comment_reactions
  for select
  to public
  using (
    not is_internal_user(user_id)
    and exists (
      select 1 from public.comments c
      where c.id = comment_reactions.comment_id
        and can_see_post(c.post_id)
    )
  );
