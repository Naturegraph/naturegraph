-- Migration : Cleanup 7 RLS policies dupliquees (T-065)
-- =====================================================================
--
-- Refs : T-065 (MASTER_TODO) + BATCH 24 + advisor `multiple_permissive_policies`
--
-- Contexte :
--   La migration backfill `20260503_backfill_saved_hidden_posts.sql` a
--   cree de nouvelles policies avec un nommage court (`snake_case`) alors
--   que les migrations originales (20260501_*) avaient deja cree des
--   policies en langage naturel ("Users can save posts", etc.).
--
--   Resultat : 7 policies dupliquees cause des warnings advisors
--   `multiple_permissive_policies` (Postgres doit evaluer toutes les
--   policies permissives, perte de perf).
--
-- Choix : on garde les versions `snake_case` plus courtes et with_check
-- explicites. On drop les anciennes versions.
--
-- Tables impactees :
--   - saved_posts : 3 drops (DELETE/INSERT/SELECT)
--   - hidden_posts : 3 drops (DELETE/INSERT/SELECT)
--   - profiles : 1 drop (UPDATE, garde version avec WITH CHECK)
--
-- Verification post-fix :
--   saved_posts : 3 policies (au lieu de 6)
--   hidden_posts : 3 policies (au lieu de 6)
--   profiles : 4 policies (au lieu de 5)

-- saved_posts
DROP POLICY IF EXISTS "Users can unsave posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Users can save posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Users can view their saved posts" ON public.saved_posts;

-- hidden_posts
DROP POLICY IF EXISTS "Users can unhide a post" ON public.hidden_posts;
DROP POLICY IF EXISTS "Users can hide a post" ON public.hidden_posts;
DROP POLICY IF EXISTS "Users see their hidden posts" ON public.hidden_posts;

-- profiles : garde profiles_update_own (USING + WITH CHECK = plus strict).
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
