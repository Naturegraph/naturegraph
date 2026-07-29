-- Le compteur d'echanges (posts.comments_count) reflete les echanges REELS
-- =============================================================================
-- Decision Nicolas 2026-07-28 : un echange supprime ne compte plus ; ses
-- reponses, elles, restent comptees (chaque reponse est un echange a part
-- entiere). Or la suppression avec reponses est un TOMBSTONE (UPDATE de
-- `deleted_at`), et le trigger de comptage ne gerait qu'INSERT/DELETE : le
-- tombstone restait donc compte.
--
-- Correctif : le trigger devient conscient de `deleted_at`.
--   - INSERT d'un echange actif : +1
--   - DELETE d'un echange actif : -1 (suppression definitive sans reponse)
--   - UPDATE actif -> tombstone  : -1
--   - UPDATE tombstone -> actif   : +1 (restauration, non utilise mais robuste)
-- On recalcule ensuite tous les compteurs depuis la source de verite.
-- =============================================================================

create or replace function public.update_comments_count()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'INSERT' then
    if new.deleted_at is null then
      update public.posts set comments_count = comments_count + 1 where id = new.post_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.deleted_at is null then
      update public.posts set comments_count = comments_count - 1 where id = old.post_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      update public.posts set comments_count = comments_count - 1 where id = new.post_id;
    elsif old.deleted_at is not null and new.deleted_at is null then
      update public.posts set comments_count = comments_count + 1 where id = new.post_id;
    end if;
  end if;
  return null;
end;
$function$;

-- Le trigger doit desormais ecouter aussi les UPDATE (transition tombstone).
drop trigger if exists update_posts_comments_count on public.comments;
create trigger update_posts_comments_count
  after insert or delete or update on public.comments
  for each row execute function public.update_comments_count();

-- Recalcul des compteurs existants depuis la source de verite (echanges non
-- supprimes), pour corriger tout ecart deja present (ex : le tombstone de test).
update public.posts p
  set comments_count = (
    select count(*) from public.comments c
    where c.post_id = p.id and c.deleted_at is null
  )
  where p.comments_count is distinct from (
    select count(*) from public.comments c
    where c.post_id = p.id and c.deleted_at is null
  );
