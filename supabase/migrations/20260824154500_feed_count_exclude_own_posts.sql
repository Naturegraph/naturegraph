-- 20260824154500_feed_count_exclude_own_posts.sql
-- Fil "oriente decouverte" : le bandeau "nouveaux moments" ne doit PAS compter
-- mes propres publications.
-- =============================================================================
-- Bug produit : apres avoir publie, le bandeau "X nouveaux moments depuis ta
-- derniere visite" apparaissait pour SON PROPRE post (plus recent que la derniere
-- visite). Illogique : on ne "manque" pas son propre contenu.
--
-- Correctif : count_new_feed_posts exclut les posts de l'utilisateur courant
-- (p.user_id <> auth.uid()). Memes filtres de base sinon (published + public +
-- hors comptes internes). auth.uid() reste lisible dans une fonction SECURITY
-- DEFINER (il vient du JWT, pas du role). Cote client, buildFeedTimeline applique
-- la meme exclusion pour la frontiere "Tu t'etais arrete ici".
--
-- Idempotente (CREATE OR REPLACE). Additive, non destructive. A appliquer sur dev
-- d'abord, puis prod.
-- =============================================================================

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
    and p.user_id <> auth.uid()   -- exclut mes propres posts (jamais "manques")
    and not exists (
      select 1 from public.profiles pr
      where pr.id = p.user_id and pr.is_internal = true
    );
$$;

-- Recharge le cache PostgREST pour exposer immediatement la nouvelle definition.
notify pgrst, 'reload schema';
