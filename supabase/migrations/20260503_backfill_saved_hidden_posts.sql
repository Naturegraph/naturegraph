-- ════════════════════════════════════════════════════════════════════════════
-- 20260503 — Backfill : migrations rétroactives pour saved_posts + hidden_posts
-- ════════════════════════════════════════════════════════════════════════════
--
-- Contexte
-- ────────
-- Les tables `saved_posts` et `hidden_posts` ont été créées via le dashboard
-- Supabase (modification manuelle de la DB) sans migration SQL versionnée.
-- Elles sont donc présentes dans `src/types/supabase.ts` (généré depuis la DB)
-- mais absentes du dossier `supabase/migrations/`.
--
-- Cette migration **rétro-décrit** la structure exacte de ces 2 tables pour
-- résoudre le drift Git ↔ DB identifié par l'audit (cf. `docs/AUDIT_SUPABASE.md`
-- P-1 + RS-6 et `docs/SYNTHESE_AUDITS.md` RC-A).
--
-- ⚠️ IMPORTANT — Idempotence
-- ───────────────────────────
-- Sur un projet Supabase OÙ CES TABLES EXISTENT DÉJÀ :
--   - `CREATE TABLE IF NOT EXISTS` ne fait rien (no-op)
--   - `DROP POLICY IF EXISTS ... + CREATE POLICY` re-crée la policy avec la
--     définition documentée ci-dessous → si la policy actuelle est différente,
--     elle sera REMPLACÉE
--
-- ⚠️ AVANT D'APPLIQUER cette migration sur prod, **dump des policies actuelles**
-- via le dashboard Supabase (SQL Editor) :
--   SELECT policyname, cmd, qual, with_check FROM pg_policies
--   WHERE tablename IN ('saved_posts', 'hidden_posts');
-- Comparer avec les définitions ci-dessous pour s'assurer qu'aucune
-- subtilité n'est perdue.
--
-- Sur un projet vierge :
--   - Les tables sont créées avec la structure documentée
--   - RLS activée + 4 policies par table
--   - Index composites sur les FK
--
-- Conformité
-- ──────────
--   - RGPD Art 5(2) responsabilité : meilleure traçabilité du schéma
--   - Loi 25 Art 8.1 : analyse d'impact technologique facilitée
--
-- Refs : docs/AUDIT_SUPABASE.md P-1, docs/SYNTHESE_AUDITS.md RC-A,
--        Fix #3.
--
-- À appliquer dans l'ordre sur :
--   - naturegraph-dev   (avant merge develop → staging)
--   - naturegraph-prod  (au merge staging → main)

-- ────────────────────────────────────────────────────────────────────────────
-- 1. saved_posts — bookmark personnel d'un post (onglet Profil > Inspirations)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_posts (
  user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id  UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

COMMENT ON TABLE public.saved_posts IS
  'Posts sauvegardés par un utilisateur (onglet Profil > Inspirations). '
  'PK composite (user_id, post_id) garantit l''unicité d''un save par user/post. '
  'RLS owner-only : un user ne voit/écrit que ses propres saves.';

-- Index composite pour le tri chronologique inverse (utilisé par
-- `getSavedPosts` du `savedPostsService` pour la pagination).
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_saved
  ON public.saved_posts (user_id, saved_at DESC);

-- Index pour les lookups inverses (rare : "qui a sauvegardé ce post ?")
-- Utile pour analytics ou trigger de comptage `posts.saves_count` (futur).
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id
  ON public.saved_posts (post_id);

-- ── RLS : owner only ────────────────────────────────────────────────────────
-- Les services TypeScript (`savedPostsService.ts`, `useSavedPosts.ts`)
-- assument que :
--   - SELECT : un user ne voit QUE ses propres saves (jamais ceux des autres)
--   - INSERT : un user ne peut sauvegarder QUE pour lui-même
--   - DELETE : un user ne peut désauvegarder QUE ses propres saves
--   - UPDATE : interdit (saved_at se met à jour via INSERT seulement)

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_posts_select_own ON public.saved_posts;
CREATE POLICY saved_posts_select_own ON public.saved_posts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS saved_posts_insert_self ON public.saved_posts;
CREATE POLICY saved_posts_insert_self ON public.saved_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS saved_posts_delete_own ON public.saved_posts;
CREATE POLICY saved_posts_delete_own ON public.saved_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Pas de policy UPDATE — le INSERT crée la row et le DELETE la supprime.
-- Si on devait permettre l'UPDATE (ex: tag personnel sur le save), il faudrait
-- ajouter une policy explicite.

-- ────────────────────────────────────────────────────────────────────────────
-- 2. hidden_posts — posts masqués par l'utilisateur (menu options du feed)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hidden_posts (
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id   UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

COMMENT ON TABLE public.hidden_posts IS
  'Posts masqués par un utilisateur (action "Masquer ce post" du menu options). '
  'PK composite (user_id, post_id). Le client filtre les posts dont l''id est '
  'dans cette table avant rendu du feed. RLS owner-only.';

-- Index composite pour le filtrage feed côté client (lookup rapide
-- "ai-je masqué ce post ?")
CREATE INDEX IF NOT EXISTS idx_hidden_posts_user_hidden
  ON public.hidden_posts (user_id, hidden_at DESC);

CREATE INDEX IF NOT EXISTS idx_hidden_posts_post_id
  ON public.hidden_posts (post_id);

-- ── RLS : owner only ────────────────────────────────────────────────────────
-- Mêmes garanties que saved_posts : un user ne voit/écrit que ses propres
-- masquages. Aucune action UPDATE prévue.

ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hidden_posts_select_own ON public.hidden_posts;
CREATE POLICY hidden_posts_select_own ON public.hidden_posts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS hidden_posts_insert_self ON public.hidden_posts;
CREATE POLICY hidden_posts_insert_self ON public.hidden_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS hidden_posts_delete_own ON public.hidden_posts;
CREATE POLICY hidden_posts_delete_own ON public.hidden_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Fin de la migration
-- ────────────────────────────────────────────────────────────────────────────
--
-- Vérifications post-application :
--
-- 1. Tables visibles avec PK composite :
--    SELECT tablename, indexname FROM pg_indexes
--      WHERE tablename IN ('saved_posts', 'hidden_posts')
--      ORDER BY tablename, indexname;
--    → 4 indexes attendus (2 par table : PK + composite + FK reverse)
--
-- 2. RLS active :
--    SELECT tablename, rowsecurity FROM pg_tables
--      WHERE tablename IN ('saved_posts', 'hidden_posts');
--    → rowsecurity = true pour les 2
--
-- 3. 6 policies au total (3 par table) :
--    SELECT tablename, COUNT(*) FROM pg_policies
--      WHERE tablename IN ('saved_posts', 'hidden_posts')
--      GROUP BY tablename;
--    → 3 par table
--
-- 4. Compteurs cohérents (nombre de rows ne change pas) :
--    SELECT COUNT(*) FROM saved_posts;
--    SELECT COUNT(*) FROM hidden_posts;
--    → identiques aux valeurs pré-migration
