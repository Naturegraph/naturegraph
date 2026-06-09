-- 20260609_notebooks_triggers_hardening.sql
-- =============================================================================
-- Durcissement securite des fonctions trigger carnets (Nicolas 2026-06-09,
-- audit advisors au ship V1.2.0) :
--   1. notebooks_set_updated_at : search_path fixe (WARN function_search_path_
--      mutable). Fonction triviale (new.updated_at := now()) mais on fige le
--      search_path par principe.
--   2. notebooks_recalc_counts : c'est une fonction TRIGGER, elle n'a pas a
--      etre appelable via l'API REST (/rpc/...). On revoque EXECUTE pour anon
--      et authenticated. Les triggers continuent de fonctionner : l'execution
--      d'un trigger ne verifie pas le privilege EXECUTE.
-- Aucun impact fonctionnel.
-- =============================================================================

create or replace function public.notebooks_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.notebooks_recalc_counts() from public, anon, authenticated;
revoke execute on function public.notebooks_set_updated_at() from public, anon, authenticated;
