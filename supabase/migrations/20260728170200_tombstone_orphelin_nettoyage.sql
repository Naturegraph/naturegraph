-- Un "Echange supprime" seul (sans reponses) n'a aucun sens : on le retire
-- =============================================================================
-- Decision Nicolas 2026-07-28 : le tombstone n'existe QUE pour ne pas detruire
-- des reponses. Si la derniere reponse d'un echange en tombstone est supprimee,
-- le tombstone devient un "Echange supprime" isole, sans interet -> on doit le
-- supprimer definitivement (ne plus rien afficher).
--
-- 1. `supprimer_echange` : apres avoir supprime une reponse (branche sans
--    enfant), si son parent est un tombstone qui n'a plus aucune reponse, on
--    supprime aussi le parent.
-- 2. Nettoyage ponctuel des tombstones orphelins deja presents.
-- Le compteur reste juste : supprimer un tombstone ne decremente pas
-- comments_count (il n'etait deja plus compte, cf. 20260728170000).
-- =============================================================================

create or replace function public.supprimer_echange(p_echange_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_auteur uuid;
  v_a_reponses boolean;
  v_parent uuid;
begin
  select user_id, parent_id into v_auteur, v_parent
    from public.comments where id = p_echange_id;
  if v_auteur is null then
    return; -- deja supprime ou introuvable : idempotent
  end if;

  if (select auth.uid()) is distinct from v_auteur
     and not can_moderate((select auth.uid())) then
    raise exception 'Tu ne peux supprimer que tes propres echanges';
  end if;

  select exists (select 1 from public.comments where parent_id = p_echange_id)
    into v_a_reponses;

  if v_a_reponses then
    -- Tombstone : on garde la ligne (donc les reponses), on efface le reste.
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
    -- Aucune reponse : suppression definitive.
    delete from public.comments where id = p_echange_id;

    -- Si on vient de retirer la DERNIERE reponse d'un echange deja en tombstone,
    -- ce tombstone isole n'a plus de raison d'exister : on le supprime aussi.
    if v_parent is not null
       and exists (select 1 from public.comments where id = v_parent and deleted_at is not null)
       and not exists (select 1 from public.comments where parent_id = v_parent) then
      delete from public.comments where id = v_parent;
    end if;
  end if;
end;
$function$;

-- Nettoyage ponctuel : tombstones deja orphelins (aucune reponse rattachee).
delete from public.comments c
where c.deleted_at is not null
  and not exists (select 1 from public.comments r where r.parent_id = c.id);
