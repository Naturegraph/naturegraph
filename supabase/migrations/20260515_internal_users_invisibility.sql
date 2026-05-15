-- ============================================================================
-- BATCH 80 (2026-05-15) — Système d'invisibilité pour comptes internes (admin)
-- ============================================================================
-- Permet d'avoir un compte admin actif qui reste totalement invisible des
-- autres users (posts, profil, likes, comments, follows tous filtrés).
--
-- Les own-policies restent inchangées : l'utilisateur internal garde l'accès
-- complet à ses propres données.
--
-- Pour la beta : seul nicolasdouaron.ca@gmail.com est en is_internal=true.
-- Plus tard, pourra accueillir d'autres comptes staff/moderator/test.
-- ============================================================================

-- 1. Colonne is_internal sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_internal IS
  'BATCH 80 : si true, ce profil est invisible des SELECT publics. Utilisé pour les comptes admin/staff/test.';

-- Index partiel pour optimiser les filtres WHERE NOT is_internal (majorité des cas)
CREATE INDEX IF NOT EXISTS idx_profiles_is_internal_false
  ON public.profiles (id) WHERE is_internal = FALSE;

-- 2. Helper SECURITY DEFINER (utilisé dans toutes les policies)
CREATE OR REPLACE FUNCTION public.is_internal_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_internal FROM public.profiles WHERE id = p_user_id),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.is_internal_user(UUID) IS
  'BATCH 80 : retourne true si le profil correspondant a is_internal=true.';

-- 3. Update RLS policies — exclure les internal users des SELECT publics

-- 3.1 profiles
DROP POLICY IF EXISTS "Public profiles visible to all" ON public.profiles;
CREATE POLICY "Public profiles visible to all" ON public.profiles
  FOR SELECT
  USING (is_public = TRUE AND is_internal = FALSE);

-- 3.2 posts (public)
DROP POLICY IF EXISTS "Public published posts visible to all" ON public.posts;
CREATE POLICY "Public published posts visible to all" ON public.posts
  FOR SELECT
  USING (
    status::text = 'published'
    AND visibility::text = 'public'
    AND NOT public.is_internal_user(user_id)
  );

-- 3.3 posts (followers-only)
DROP POLICY IF EXISTS "Followers can read followers-only posts" ON public.posts;
CREATE POLICY "Followers can read followers-only posts" ON public.posts
  FOR SELECT
  USING (
    visibility::text = 'followers'
    AND status::text = 'published'
    AND NOT public.is_internal_user(user_id)
    AND EXISTS (
      SELECT 1 FROM follows
      WHERE follows.follower_id = (SELECT auth.uid())
        AND follows.following_id = posts.user_id
    )
  );

-- 3.4 comments
DROP POLICY IF EXISTS "Comments visible on accessible posts" ON public.comments;
CREATE POLICY "Comments visible on accessible posts" ON public.comments
  FOR SELECT
  USING (
    can_see_post(post_id)
    AND NOT public.is_internal_user(user_id)
  );

-- 3.5 reactions
DROP POLICY IF EXISTS "Reactions visible on accessible posts" ON public.reactions;
CREATE POLICY "Reactions visible on accessible posts" ON public.reactions
  FOR SELECT
  USING (
    can_see_post(post_id)
    AND NOT public.is_internal_user(user_id)
  );

-- 3.6 follows
DROP POLICY IF EXISTS "Follows visible to all" ON public.follows;
CREATE POLICY "Follows visible to all" ON public.follows
  FOR SELECT
  USING (
    NOT public.is_internal_user(follower_id)
    AND NOT public.is_internal_user(following_id)
  );

-- 3.7 notebooks
DROP POLICY IF EXISTS "Public notebooks visible to all" ON public.notebooks;
CREATE POLICY "Public notebooks visible to all" ON public.notebooks
  FOR SELECT
  USING (
    visibility::text = 'public'
    AND NOT public.is_internal_user(author_id)
  );
