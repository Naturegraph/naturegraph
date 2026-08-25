-- Lookup de profil par username INSENSIBLE A LA CASSE.
-- =============================================================================
-- Probleme : getProfileByUsername faisait `.eq('username', ...)` (casse exacte).
-- 60/77 usernames en prod ont des majuscules ; quand Facebook (et d'autres)
-- mettent l'URL en minuscules, `/profile/Nicolas` -> `/profile/nicolas` ne
-- matchait plus -> profil casse (§5/§6 du ticket "partage profil").
--
-- Solution : une fonction qui matche sur `lower(username)`, en priorisant la
-- CASSE EXACTE (order by username = p_username desc) pour rester deterministe
-- meme si deux profils partagent la meme forme minuscule (1 paire en prod).
--
-- SECURITY INVOKER (defaut) : la RLS de `profiles` s'applique normalement (on
-- n'expose donc que ce qui etait deja lisible). Index fonctionnel pour la
-- rapidite. Aucune donnee modifiee, aucun username change (les usernames gardent
-- leur casse d'affichage : c'est le LOOKUP qui devient tolerant).
-- =============================================================================

create index if not exists idx_profiles_username_lower
  on public.profiles (lower(username));

create or replace function public.get_profile_by_username_ci(p_username text)
returns setof public.profiles
language sql
stable
as $$
  select *
  from public.profiles
  where lower(username) = lower(p_username)
  order by (username = p_username) desc  -- casse exacte d'abord (deterministe)
  limit 1
$$;

grant execute on function public.get_profile_by_username_ci(text) to anon, authenticated;
