-- ============================================================
-- Naturegraph — Correctifs sécurité RLS (migration 003)
-- ============================================================
--
-- Problèmes corrigés dans cette migration :
--
-- 1. CRITIQUE : Policy "Media visible with post" ne vérifiait pas
--    la visibilité du post — un media lié à un post followers-only
--    était accessible à tous via son ID direct.
--
-- 2. HAUT : Reactions, comments et proposals visibles sur des posts
--    privés/followers-only via "visible to all".
--
-- 3. HAUT : notebook_observations visibles même si le carnet est privé.
--
-- 4. MOYEN : Pas de politique UPDATE/DELETE sur les proposals
--    (auteurs ne pouvaient pas retirer leur proposition).
--
-- Approche : DROP + RECREATE pour éviter les conflits de nommage.
-- ============================================================

-- ─── HELPERS ──────────────────────────────────────────────────────────────────
--
-- Fonction helper : renvoie true si l'utilisateur courant peut voir ce post.
-- Centralise la logique de visibilité pour éviter la duplication dans chaque policy.
--
CREATE OR REPLACE FUNCTION public.can_see_post(p_post_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = p_post_id
    AND p.status = 'published'
    AND (
      -- Post public
      p.visibility = 'public'
      -- Propriétaire du post (drafts inclus)
      OR p.user_id = auth.uid()
      -- Post followers-only ET l'utilisateur suit l'auteur
      OR (
        p.visibility = 'followers'
        AND EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.follower_id = auth.uid()
          AND f.following_id = p.user_id
        )
      )
    )
  );
$$;

-- Même logique pour les carnets
CREATE OR REPLACE FUNCTION public.can_see_notebook(p_notebook_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.notebooks n
    WHERE n.id = p_notebook_id
    AND (
      n.visibility = 'public'
      OR n.author_id = auth.uid()
    )
  );
$$;

-- ─── MEDIA ────────────────────────────────────────────────────────────────────

-- Suppression de l'ancienne policy trop permissive
DROP POLICY IF EXISTS "Media visible with post" ON public.media;

-- Nouvelle policy : vérifie la visibilité du post parent
CREATE POLICY "Media visible with accessible post"
  ON public.media FOR SELECT
  USING (public.can_see_post(media.post_id));

-- ─── REACTIONS ────────────────────────────────────────────────────────────────

-- Ancienne policy "visible to all" remplacée par une vérification du post
DROP POLICY IF EXISTS "Reactions visible to all" ON public.reactions;

CREATE POLICY "Reactions visible on accessible posts"
  ON public.reactions FOR SELECT
  USING (public.can_see_post(reactions.post_id));

-- ─── COMMENTS ────────────────────────────────────────────────────────────────

-- Ancienne policy "visible to all" remplacée par une vérification du post
DROP POLICY IF EXISTS "Comments visible to all" ON public.comments;

CREATE POLICY "Comments visible on accessible posts"
  ON public.comments FOR SELECT
  USING (public.can_see_post(comments.post_id));

-- ─── IDENTIFICATION PROPOSALS ─────────────────────────────────────────────────

-- Ancienne policy "visible to all" remplacée par une vérification du post
DROP POLICY IF EXISTS "Proposals visible to all" ON public.identification_proposals;

CREATE POLICY "Proposals visible on accessible posts"
  ON public.identification_proposals FOR SELECT
  USING (public.can_see_post(identification_proposals.post_id));

-- Permettre aux auteurs de modifier/supprimer leurs propositions
CREATE POLICY "Authors can update own proposals"
  ON public.identification_proposals FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own proposals"
  ON public.identification_proposals FOR DELETE
  USING (auth.uid() = author_id);

-- ─── NOTEBOOK OBSERVATIONS ────────────────────────────────────────────────────

-- Ancienne policy : vérifiait juste l'existence du carnet, pas sa visibilité
DROP POLICY IF EXISTS "Notebook entries visible with notebook" ON public.notebook_observations;

CREATE POLICY "Notebook entries visible with accessible notebook"
  ON public.notebook_observations FOR SELECT
  USING (public.can_see_notebook(notebook_observations.notebook_id));

-- ─── STORAGE (buckets Supabase) ───────────────────────────────────────────────
--
-- NOTE : Ces policies s'appliquent via la console Supabase → Storage → Policies.
-- À créer manuellement avant le passage en production.
--
-- bucket "post-media" :
--   SELECT : authentifié uniquement (pas d'accès public direct aux fichiers)
--   INSERT : auth.uid() = owner (via metadata)
--   DELETE : auth.uid() = owner
--
-- bucket "avatars" :
--   SELECT : public (les avatars sont publics)
--   INSERT/UPDATE : auth.uid() = owner
--   DELETE : auth.uid() = owner
--
-- IMPORTANT : Configurer aussi les règles de taille max et types MIME
-- dans la console Supabase (max 10 MB, types: image/jpeg, image/png, image/webp).
-- ─────────────────────────────────────────────────────────────────────────────
