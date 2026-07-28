-- NG-049 : suppression d'un echange en "tombstone" (ne detruit plus les reponses)
-- =============================================================================
-- BUG. `comments.parent_id` etait en ON DELETE CASCADE, et l'app supprimait un
-- echange par un simple DELETE. Supprimer un echange PARENT effacait donc en
-- cascade toutes ses reponses (potentiellement d'autres personnes) + leurs
-- reactions : "j'ai supprime mon echange et cela a tout supprime".
--
-- CORRECTIF (decision Nicolas 2026-07-28, comportement standard type Reddit) :
--   - un echange SANS reponse -> suppression definitive (comme avant) ;
--   - un echange AVEC reponses -> "tombstone" : la ligne est conservee pour ne
--     pas detruire les reponses des autres, mais son contenu et sa suggestion
--     d'espece sont effaces et elle est marquee `deleted_at`. Le front affiche
--     "Echange supprime" a la place, les reponses restent visibles dessous.
--
-- On garde `moderation_status = 'visible'` sur le tombstone (et NON 'removed') :
-- un 'removed' serait masque aux autres par la policy SELECT, ce qui orphelinerait
-- les reponses. La colonne dediee `deleted_at` distingue "supprime par l'auteur"
-- (tombstone visible) de "masque par la moderation" (auto_hidden/removed).
--
-- La logique vit dans une fonction SECURITY DEFINER : elle verifie elle-meme que
-- l'appelant est l'auteur ou un moderateur (RLS contournee dans le definer), et
-- decide atomiquement entre suppression et tombstone.
-- =============================================================================

alter table public.comments add column if not exists deleted_at timestamptz;

comment on column public.comments.deleted_at is
  'Echange supprime par son auteur mais conserve en tombstone car il porte des reponses. NULL = actif.';

create or replace function public.supprimer_echange(p_echange_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_auteur uuid;
  v_a_reponses boolean;
begin
  select user_id into v_auteur from public.comments where id = p_echange_id;
  if v_auteur is null then
    return; -- deja supprime ou introuvable : idempotent, pas d'erreur
  end if;

  -- Securite : seul l'auteur ou un moderateur peut supprimer.
  if (select auth.uid()) is distinct from v_auteur
     and not can_moderate((select auth.uid())) then
    raise exception 'Tu ne peux supprimer que tes propres echanges';
  end if;

  select exists (select 1 from public.comments where parent_id = p_echange_id)
    into v_a_reponses;

  if v_a_reponses then
    -- Tombstone : on conserve la ligne (donc les reponses), on efface le reste.
    delete from public.comment_reactions where comment_id = p_echange_id;
    update public.comments
       set deleted_at = now(),
           content = '(échange supprimé)',
           species_label = null,
           species_scientific = null,
           taxonomy_node_id = null,
           confidence = null
     where id = p_echange_id;
  else
    -- Aucune reponse : suppression definitive (cascade sur ses propres reactions).
    delete from public.comments where id = p_echange_id;
  end if;
end;
$$;

grant execute on function public.supprimer_echange(uuid) to authenticated;
