-- Migration : Optimize 54 RLS policies — wrap auth.uid() with (SELECT auth.uid())
-- =====================================================================
--
-- Refs : T-067 (MASTER_TODO) + BATCH 22 + advisor `auth_rls_initplan`
--
-- Contexte :
--   PostgreSQL `auth.uid()` est re-evalue PER ROW dans les policies RLS,
--   ce qui peut creer des problemes de perf sur les grosses tables (feed,
--   notifications, comments, reactions, media).
--
-- Fix officiel Supabase (cf. https://supabase.com/blog/auth-uid-rls) :
--   Wrap dans `(SELECT auth.uid())` pour permettre a Postgres de cache
--   le resultat au niveau de la query. Pattern equivalent fonctionnel,
--   plus efficient sur les seq scans / index lookups.
--
-- Impact :
--   - 54 policies modifiees (36 USING + 18 WITH CHECK)
--   - 0 changement de semantique (memes regles RLS)
--   - Gain perf attendu : 10-30% sur queries impliquant ces policies
--
-- Reversibilite :
--   ALTER POLICY ne perd pas la definition originale (Postgres stocke les
--   deux versions equivalemment). Pour revert, re-ALTER avec auth.uid() direct.

-- ─── Wrapper helper inline ───────────────────────────────────────────────────
-- On utilise (SELECT auth.uid()) — pas (select (select auth.uid())) ni autre.

-- ─── blocks ──────────────────────────────────────────────────────────────────
ALTER POLICY "blocks_delete_own" ON public.blocks USING ((SELECT auth.uid()) = blocker_id);
ALTER POLICY "blocks_select_own" ON public.blocks USING ((SELECT auth.uid()) = blocker_id);
ALTER POLICY "blocks_insert_own" ON public.blocks WITH CHECK ((SELECT auth.uid()) = blocker_id);

-- ─── comments ────────────────────────────────────────────────────────────────
ALTER POLICY "Users can delete own comments" ON public.comments USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can edit own comments" ON public.comments USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Authenticated users can comment" ON public.comments WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── follows ─────────────────────────────────────────────────────────────────
ALTER POLICY "Users can unfollow" ON public.follows USING ((SELECT auth.uid()) = follower_id);
ALTER POLICY "Users can follow" ON public.follows WITH CHECK ((SELECT auth.uid()) = follower_id);

-- ─── hidden_posts ────────────────────────────────────────────────────────────
ALTER POLICY "Users can unhide a post" ON public.hidden_posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users see their hidden posts" ON public.hidden_posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "hidden_posts_delete_own" ON public.hidden_posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "hidden_posts_select_own" ON public.hidden_posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can hide a post" ON public.hidden_posts WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "hidden_posts_insert_self" ON public.hidden_posts WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── identification_proposals ────────────────────────────────────────────────
ALTER POLICY "Authors can delete own proposals" ON public.identification_proposals USING ((SELECT auth.uid()) = author_id);
ALTER POLICY "Authors can update own proposals" ON public.identification_proposals USING ((SELECT auth.uid()) = author_id);
ALTER POLICY "Authenticated users can propose" ON public.identification_proposals WITH CHECK ((SELECT auth.uid()) = author_id);

-- ─── media ───────────────────────────────────────────────────────────────────
ALTER POLICY "Users can delete own media" ON public.media USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can upload own media" ON public.media WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── notebooks ───────────────────────────────────────────────────────────────
ALTER POLICY "Users can delete own notebooks" ON public.notebooks USING ((SELECT auth.uid()) = author_id);
ALTER POLICY "Users can read own notebooks" ON public.notebooks USING ((SELECT auth.uid()) = author_id);
ALTER POLICY "Users can update own notebooks" ON public.notebooks USING ((SELECT auth.uid()) = author_id);
ALTER POLICY "Users can create notebooks" ON public.notebooks WITH CHECK ((SELECT auth.uid()) = author_id);

-- ─── notebook_observations (via JOIN) ────────────────────────────────────────
ALTER POLICY "Notebook owners can add observations" ON public.notebook_observations WITH CHECK (
  EXISTS (
    SELECT 1
    FROM notebooks
    WHERE notebooks.id = notebook_observations.notebook_id
      AND notebooks.author_id = (SELECT auth.uid())
  )
);

-- ─── notification_preferences ────────────────────────────────────────────────
ALTER POLICY "notif_pref_delete_own" ON public.notification_preferences USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "notif_pref_select_own" ON public.notification_preferences USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "notif_pref_update_own" ON public.notification_preferences USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "notif_pref_insert_own" ON public.notification_preferences WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── notifications ───────────────────────────────────────────────────────────
ALTER POLICY "Users can mark own notifications read" ON public.notifications USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can read own notifications" ON public.notifications USING ((SELECT auth.uid()) = user_id);

-- ─── posts ───────────────────────────────────────────────────────────────────
ALTER POLICY "Followers can read followers-only posts" ON public.posts USING (
  (visibility)::text = 'followers'::text
  AND (status)::text = 'published'::text
  AND EXISTS (
    SELECT 1
    FROM follows
    WHERE follows.follower_id = (SELECT auth.uid())
      AND follows.following_id = posts.user_id
  )
);
ALTER POLICY "Users can delete own posts" ON public.posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can read own posts" ON public.posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update own posts" ON public.posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can create own posts" ON public.posts WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── profiles ────────────────────────────────────────────────────────────────
ALTER POLICY "Users can read own profile" ON public.profiles USING ((SELECT auth.uid()) = id);
ALTER POLICY "Users can update own profile" ON public.profiles USING ((SELECT auth.uid()) = id);
ALTER POLICY "profiles_update_own" ON public.profiles USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
ALTER POLICY "Users can insert own profile" ON public.profiles WITH CHECK ((SELECT auth.uid()) = id);

-- ─── reactions ───────────────────────────────────────────────────────────────
ALTER POLICY "Users can remove own reactions" ON public.reactions USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Authenticated users can react" ON public.reactions WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── reports ─────────────────────────────────────────────────────────────────
ALTER POLICY "reports_select_own" ON public.reports USING ((SELECT auth.uid()) = reporter_id);
ALTER POLICY "reports_insert_own" ON public.reports WITH CHECK ((SELECT auth.uid()) = reporter_id);

-- ─── saved_posts ─────────────────────────────────────────────────────────────
ALTER POLICY "Users can unsave posts" ON public.saved_posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can view their saved posts" ON public.saved_posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "saved_posts_delete_own" ON public.saved_posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "saved_posts_select_own" ON public.saved_posts USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can save posts" ON public.saved_posts WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "saved_posts_insert_self" ON public.saved_posts WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── security_audit_log ──────────────────────────────────────────────────────
ALTER POLICY "security_audit_log_select_self" ON public.security_audit_log USING ((SELECT auth.uid()) = user_id);

-- ─── support_tickets ─────────────────────────────────────────────────────────
ALTER POLICY "support_tickets_select_self" ON public.support_tickets USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "support_tickets_insert_self" ON public.support_tickets WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── user_settings ───────────────────────────────────────────────────────────
ALTER POLICY "user_settings_select" ON public.user_settings USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "user_settings_update" ON public.user_settings USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "user_settings_upsert" ON public.user_settings WITH CHECK ((SELECT auth.uid()) = user_id);
