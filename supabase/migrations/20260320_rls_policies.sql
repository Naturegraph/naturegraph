-- ============================================
-- Naturegraph — Row Level Security policies
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identification_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxref_cache ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ────────────────────────────────

CREATE POLICY "Public profiles visible to all"
  ON public.profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── Posts ───────────────────────────────────

CREATE POLICY "Public published posts visible to all"
  ON public.posts FOR SELECT
  USING (status = 'published' AND visibility = 'public');

CREATE POLICY "Users can read own posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Followers can read followers-only posts"
  ON public.posts FOR SELECT
  USING (
    visibility = 'followers'
    AND status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = auth.uid() AND following_id = posts.user_id
    )
  );

CREATE POLICY "Users can create own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Media ───────────────────────────────────

CREATE POLICY "Media visible with post"
  ON public.media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = media.post_id
    )
  );

CREATE POLICY "Users can upload own media"
  ON public.media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
  ON public.media FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Reactions ───────────────────────────────

CREATE POLICY "Reactions visible to all"
  ON public.reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can react"
  ON public.reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Comments ────────────────────────────────

CREATE POLICY "Comments visible to all"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Identification Proposals ────────────────

CREATE POLICY "Proposals visible to all"
  ON public.identification_proposals FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can propose"
  ON public.identification_proposals FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- ─── Follows ─────────────────────────────────

CREATE POLICY "Follows visible to all"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ─── Notebooks ───────────────────────────────

CREATE POLICY "Public notebooks visible to all"
  ON public.notebooks FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can read own notebooks"
  ON public.notebooks FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Users can create notebooks"
  ON public.notebooks FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own notebooks"
  ON public.notebooks FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own notebooks"
  ON public.notebooks FOR DELETE
  USING (auth.uid() = author_id);

-- ─── Notebook Observations ───────────────────

CREATE POLICY "Notebook entries visible with notebook"
  ON public.notebook_observations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = notebook_observations.notebook_id
    )
  );

CREATE POLICY "Notebook owners can add observations"
  ON public.notebook_observations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = notebook_observations.notebook_id
      AND notebooks.author_id = auth.uid()
    )
  );

-- ─── Notifications ───────────────────────────

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── TAXREF Cache (read-only for all) ────────

CREATE POLICY "TAXREF cache readable by all"
  ON public.taxref_cache FOR SELECT
  USING (true);
