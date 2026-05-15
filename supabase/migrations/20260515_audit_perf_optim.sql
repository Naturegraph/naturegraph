-- ============================================================================
-- BATCH 84 (2026-05-15) — Optimisation perf suite audit Supabase advisors
-- ============================================================================
-- Audit complet documenté dans docs/SUPABASE_AUDIT.md
--
-- Avant cette migration :
--   - 10 unindexed FK (perf JOIN/DELETE dégradée)
--   - 30 unused indexes (bruit + perf write)
--   - 15 multiple_permissive_policies (perf SELECT)
--
-- Après :
--   - 0 unindexed FK (12 ajoutés au total)
--   - Indexes morts evidents droppés
--   - 0 multiple_permissive_policies (consolidées via OR)
-- ============================================================================

-- ─── 1. INDEX FK MANQUANTS ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_admin_actions_related_report_id
  ON public.admin_actions(related_report_id) WHERE related_report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_actions_reverted_by
  ON public.admin_actions(reverted_by) WHERE reverted_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_users_created_by
  ON public.admin_users(created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id
  ON public.admin_audit_logs(admin_user_id) WHERE admin_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_beta_access_keys_created_by
  ON public.beta_access_keys(created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_beta_access_keys_used_by_user_id
  ON public.beta_access_keys(used_by_user_id) WHERE used_by_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_beta_signup_log_user_id
  ON public.beta_signup_log(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_beta_waitlist_invited_with_key_id
  ON public.beta_waitlist(invited_with_key_id) WHERE invited_with_key_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hidden_posts_post_id_fk
  ON public.hidden_posts(post_id);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_assigned_to
  ON public.moderation_reports(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter_id
  ON public.moderation_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_resolved_by
  ON public.moderation_reports(resolved_by) WHERE resolved_by IS NOT NULL;

-- ─── 2. DROP INDEX MORTS EVIDENTS ──────────────────────────────────────────
-- Note : on garde les indexes sur tables actives (posts, profiles, media)
-- car ils seront utilises en prod. On drop seulement les doublons / morts.

DROP INDEX IF EXISTS public.idx_hidden_posts_user_hidden;
DROP INDEX IF EXISTS public.idx_hidden_posts_post_id;       -- doublon (idx_hidden_posts_post_id_fk créé ci-dessus)
DROP INDEX IF EXISTS public.idx_reactions_user_id;          -- PK composite couvre déjà
DROP INDEX IF EXISTS public.idx_reports_status;             -- doublon de idx_reports_status_pending
DROP INDEX IF EXISTS public.idx_admin_audit_logs_admin;     -- remplacé par idx_admin_audit_logs_admin_user_id
DROP INDEX IF EXISTS public.idx_admin_audit_logs_action;
DROP INDEX IF EXISTS public.idx_admin_audit_logs_target;
DROP INDEX IF EXISTS public.idx_blocks_blocked_id;
DROP INDEX IF EXISTS public.idx_notebook_obs_notebook_id;

-- ─── 3. CONSOLIDATION RLS — multiple_permissive_policies ──────────────────

-- 3.1 profiles : fusion "Public profiles visible to all" + "Users can read own profile"
DROP POLICY IF EXISTS "Public profiles visible to all" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Profiles read access" ON public.profiles
  FOR SELECT
  USING (
    (is_public = TRUE AND is_internal = FALSE)
    OR (SELECT auth.uid()) = id
  );

-- 3.2 posts : fusion 3 policies SELECT
DROP POLICY IF EXISTS "Public published posts visible to all" ON public.posts;
DROP POLICY IF EXISTS "Followers can read followers-only posts" ON public.posts;
DROP POLICY IF EXISTS "Users can read own posts" ON public.posts;
CREATE POLICY "Posts read access" ON public.posts
  FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id
    OR (
      status::text = 'published'
      AND visibility::text = 'public'
      AND NOT public.is_internal_user(user_id)
    )
    OR (
      visibility::text = 'followers'
      AND status::text = 'published'
      AND NOT public.is_internal_user(user_id)
      AND EXISTS (
        SELECT 1 FROM follows
        WHERE follows.follower_id = (SELECT auth.uid())
          AND follows.following_id = posts.user_id
      )
    )
  );

-- 3.3 notebooks
DROP POLICY IF EXISTS "Public notebooks visible to all" ON public.notebooks;
DROP POLICY IF EXISTS "Users can read own notebooks" ON public.notebooks;
CREATE POLICY "Notebooks read access" ON public.notebooks
  FOR SELECT
  USING (
    (SELECT auth.uid()) = author_id
    OR (
      visibility::text = 'public'
      AND NOT public.is_internal_user(author_id)
    )
  );

-- 3.4 moderation_reports : split admins_manage_reports en per-action
DROP POLICY IF EXISTS "admins_manage_reports" ON public.moderation_reports;
DROP POLICY IF EXISTS "users_read_own_reports" ON public.moderation_reports;
DROP POLICY IF EXISTS "users_insert_reports" ON public.moderation_reports;

CREATE POLICY "moderation_reports_read" ON public.moderation_reports
  FOR SELECT
  USING (
    public.is_admin((SELECT auth.uid()))
    OR reporter_id = (SELECT auth.uid())
  );

CREATE POLICY "moderation_reports_insert" ON public.moderation_reports
  FOR INSERT
  WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY "moderation_reports_admin_update" ON public.moderation_reports
  FOR UPDATE
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

CREATE POLICY "moderation_reports_admin_delete" ON public.moderation_reports
  FOR DELETE
  USING (public.is_admin((SELECT auth.uid())));
