-- =============================================================================
-- 20260420_missing_fk_indexes.sql
-- Index manquants sur clés étrangères — correctif performance post-audit
-- =============================================================================
-- Supabase Advisor a signalé ~15 FK sans index côté "many" de la relation.
-- Sans ces index, les JOINs et ON DELETE CASCADE sont très lents sur grands
-- volumes (full table scan à chaque suppression d'un profil ou post).
--
-- Stratégie : CREATE INDEX IF NOT EXISTS — idempotent, sûr à rejouer.
-- =============================================================================

-- ─── posts ────────────────────────────────────────────────────────────────────
-- user_id déjà indexé par les migrations initiales, species_id est nouveau
CREATE INDEX IF NOT EXISTS idx_posts_species_id
  ON public.posts(species_id) WHERE species_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_taxref_id
  ON public.posts(taxref_id) WHERE taxref_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_user_id
  ON public.posts(user_id);

CREATE INDEX IF NOT EXISTS idx_posts_status_published
  ON public.posts(status, published_at DESC) WHERE status = 'published';

-- ─── comments ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comments_post_id
  ON public.comments(post_id);

CREATE INDEX IF NOT EXISTS idx_comments_user_id
  ON public.comments(user_id);

-- ─── reactions ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reactions_post_id
  ON public.reactions(post_id);

CREATE INDEX IF NOT EXISTS idx_reactions_user_id
  ON public.reactions(user_id);

-- Index composite pour "a-t-il déjà réagi à ce post ?" (contrainte unicité)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_user_post_unique
  ON public.reactions(user_id, post_id);

-- ─── media ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_media_post_id
  ON public.media(post_id);

CREATE INDEX IF NOT EXISTS idx_media_user_id
  ON public.media(user_id);

-- ─── follows ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_follows_follower_id
  ON public.follows(follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_following_id
  ON public.follows(following_id);

-- ─── notifications ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC) WHERE read = false;

-- ─── identification_proposals ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_id_proposals_post_id
  ON public.identification_proposals(post_id);

CREATE INDEX IF NOT EXISTS idx_id_proposals_author_id
  ON public.identification_proposals(author_id);

-- ─── notebook_observations ────────────────────────────────────────────────────
-- observation_id est le vrai nom de la colonne (pas post_id)
CREATE INDEX IF NOT EXISTS idx_notebook_obs_notebook_id
  ON public.notebook_observations(notebook_id);

CREATE INDEX IF NOT EXISTS idx_notebook_obs_observation_id
  ON public.notebook_observations(observation_id);

-- ─── notebooks ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notebooks_author_id
  ON public.notebooks(author_id);

-- ─── blocks ───────────────────────────────────────────────────────────────────
-- blocker_id couvert par la PK (blocker_id, blocked_id)
-- blocked_id a besoin d'un index séparé pour "qui m'a bloqué ?"
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id
  ON public.blocks(blocked_id);

-- ─── reports ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id
  ON public.reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_reports_post_id
  ON public.reports(post_id) WHERE post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_profile_id
  ON public.reports(profile_id) WHERE profile_id IS NOT NULL;

-- ─── species_master ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_species_master_taxref_id
  ON public.species_master(taxref_id) WHERE taxref_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_species_master_group
  ON public.species_master(taxonomic_group);
