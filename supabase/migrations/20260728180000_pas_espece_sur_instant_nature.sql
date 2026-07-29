-- Garde-fou serveur : pas de proposition d'espece sur un Instant nature
-- =============================================================================
-- Un Instant nature partage un paysage / phenomene (pas d'animal a identifier).
-- L'UI masque deja "Proposer une espece" sur ces posts (cf. flag
-- especesAutorisees), mais le principe du projet est de valider AUSSI cote
-- serveur (front informe, back protege) : un appel API direct ne doit pas
-- pouvoir attacher une espece a un echange d'Instant nature.
-- =============================================================================

create or replace function public.valider_espece_selon_type_post()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_type text;
begin
  if new.species_label is not null then
    select type into v_type from public.posts where id = new.post_id;
    if v_type = 'nature_instant' then
      raise exception 'Pas de proposition d''espece sur un Instant nature';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists valider_espece_selon_type_post_trigger on public.comments;
create trigger valider_espece_selon_type_post_trigger
  before insert or update on public.comments
  for each row execute function public.valider_espece_selon_type_post();
