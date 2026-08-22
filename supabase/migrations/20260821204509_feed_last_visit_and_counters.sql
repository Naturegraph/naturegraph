-- 20260821204509_feed_last_visit_and_counters.sql
-- Fil : reperes temporels & contenus manques.
-- =============================================================================
-- Ajoute le strict minimum de donnees pour un fil "oriente decouverte" :
--   1. profiles.last_feed_visit_at : horodatage de la derniere consultation du
--      FIL (distinct de last_login_at/last_active_at, qui sont pollues par le
--      login et l'activite generale). Un seul timestamptz, multi-appareils
--      (valeur serveur partagee).
--   2. mark_feed_visit() : renvoie la valeur PRECEDENTE (reference figee pour la
--      session courante) ET pose la nouvelle a now(), de facon atomique.
--   3. count_new_feed_posts(since) : nombre d'observations publiques publiees
--      depuis `since`, avec les MEMES filtres de base que le feed public
--      (published + public + hors comptes internes). Sert au bandeau "Vous avez
--      manque X observations". Comptage seul, indexe sur created_at.
--
-- Idempotente (IF NOT EXISTS / CREATE OR REPLACE). Additive, non destructive :
-- aucune donnee existante modifiee. A appliquer sur dev d'abord, puis prod.
-- =============================================================================

-- 1. Colonne de derniere visite du fil (nullable : NULL = jamais visite).
alter table public.profiles
  add column if not exists last_feed_visit_at timestamptz;

comment on column public.profiles.last_feed_visit_at is
  'Derniere consultation du fil par l''utilisateur (repere "contenus manques"). NULL = premiere visite.';

-- 2. Marque la visite du fil : renvoie la valeur precedente puis pose now().
--    SECURITY DEFINER pour ecrire la ligne du profil sans elargir la policy
--    UPDATE de profiles ; scope strict a auth.uid().
create or replace function public.mark_feed_visit()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev timestamptz;
begin
  if auth.uid() is null then
    return null; -- invite : pas de suivi
  end if;
  select last_feed_visit_at into v_prev from public.profiles where id = auth.uid();
  update public.profiles set last_feed_visit_at = now() where id = auth.uid();
  return v_prev;
end;
$$;

-- 3. Compte les observations publiques publiees depuis `p_since`, memes filtres
--    de base que le feed public. STABLE + SECURITY DEFINER (ne lit que du public,
--    aucune fuite de donnees privees).
create or replace function public.count_new_feed_posts(p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.posts p
  where p.status = 'published'
    and p.visibility = 'public'
    and p.created_at > p_since
    and not exists (
      select 1 from public.profiles pr
      where pr.id = p.user_id and pr.is_internal = true
    );
$$;

-- Index partiel pour un comptage rapide (created_at desc sur les posts publies).
create index if not exists idx_posts_published_public_created_at
  on public.posts (created_at desc)
  where status = 'published' and visibility = 'public';

-- Droits d'execution : seuls les utilisateurs connectes en ont besoin.
grant execute on function public.mark_feed_visit() to authenticated;
grant execute on function public.count_new_feed_posts(timestamptz) to authenticated;

-- Recharge le cache PostgREST pour exposer immediatement les nouvelles RPC.
notify pgrst, 'reload schema';
