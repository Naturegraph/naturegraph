-- ============================================================================
--  Naturegraph — Schema canonique consolidé
--  Version : v1.0 (MVP)
--  Cible   : PostgreSQL 15 + PostGIS 3.3 (Supabase Hosted)
--
--  Ce fichier est la *consolidation lisible* des migrations versionnées dans
--  supabase/migrations/. Les migrations restent la source de vérité pour la
--  CI/CD ; ce fichier sert de référence pour les nouveaux développeurs et
--  pour la documentation.
--
--  Ordre obligatoire :
--    1. Extensions
--    2. Types ENUM (aucun ici — on utilise CHECK pour rester souple)
--    3. Tables
--    4. Index
--    5. Fonctions & triggers
--    6. RLS policies (cf. security/rls-policies.md)
-- ============================================================================

-- 1. EXTENSIONS ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- usernames case-insensitive
CREATE EXTENSION IF NOT EXISTS "postgis";    -- géolocalisation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- recherche fuzzy

-- 2. TABLES -------------------------------------------------------------------

-- 2.1 profiles
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        CITEXT UNIQUE NOT NULL CHECK (length(username) BETWEEN 3 AND 30),
  display_name    TEXT,
  bio             TEXT CHECK (length(bio) <= 280),
  avatar_url      TEXT,
  banner_url      TEXT,
  city            TEXT,
  region          TEXT,
  country         TEXT DEFAULT 'FR',
  location        GEOGRAPHY(POINT, 4326),
  interests       TEXT[] NOT NULL DEFAULT '{}',
  instagram       TEXT,
  website         TEXT,
  language        TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','en')),
  posts_count     INTEGER NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  is_suspended    BOOLEAN NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 user_settings
CREATE TABLE user_settings (
  user_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications  BOOLEAN NOT NULL DEFAULT true,
  push_notifications   BOOLEAN NOT NULL DEFAULT false,
  newsletter           BOOLEAN NOT NULL DEFAULT false,
  theme                TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  reduced_motion       BOOLEAN NOT NULL DEFAULT false,
  show_sensitive_data  BOOLEAN NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 taxref (référentiel)
CREATE TABLE taxref (
  cd_nom        INTEGER PRIMARY KEY,
  cd_ref        INTEGER,
  rang          TEXT,
  nom_complet   TEXT NOT NULL,
  nom_vern      TEXT,
  nom_vern_eng  TEXT,
  group1_inpn   TEXT,
  group2_inpn   TEXT,
  classe        TEXT,
  ordre         TEXT,
  famille       TEXT,
  is_sensitive  BOOLEAN NOT NULL DEFAULT false,
  search_vector TSVECTOR
);

-- 2.4 posts
CREATE TABLE posts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type               TEXT NOT NULL CHECK (type IN ('observation','story','question','identification','event')),
  title              TEXT,
  body               TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  location           GEOGRAPHY(POINT, 4326),
  location_name      TEXT,
  location_precision SMALLINT NOT NULL DEFAULT 0,
  species_id         INTEGER REFERENCES taxref(cd_nom) ON DELETE SET NULL,
  visibility         TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers','private')),
  likes_count        INTEGER NOT NULL DEFAULT 0,
  comments_count     INTEGER NOT NULL DEFAULT 0,
  published_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at          TIMESTAMPTZ,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 post_media
CREATE TABLE post_media (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  storage_path     TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  width            INTEGER,
  height           INTEGER,
  size_bytes       INTEGER,
  alt_text         TEXT,
  copyright_notice TEXT NOT NULL,
  license          TEXT NOT NULL DEFAULT 'CC-BY-NC-SA-4.0'
                   CHECK (license IN ('CC-BY-4.0','CC-BY-SA-4.0','CC-BY-NC-4.0','CC-BY-NC-SA-4.0','CC0-1.0','all-rights-reserved')),
  position         SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 reactions
CREATE TABLE reactions (
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('love','admire','fire','wow','curious','disappointed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- 2.7 comments
CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 follows
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

-- 2.9 blocks
CREATE TABLE blocks (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- 2.10 notebooks
CREATE TABLE notebooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  description   TEXT CHECK (length(description) <= 500),
  visibility    TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','followers','private')),
  cover_url     TEXT,
  entries_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.11 notebook_entries
CREATE TABLE notebook_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  note        TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notebook_id, post_id)
);

-- 2.12 notifications
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('follow','like','comment','mention','identification','system')),
  entity_type TEXT,
  entity_id   UUID,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.13 reports
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('post','comment','profile')),
  entity_id   UUID NOT NULL,
  reason      TEXT NOT NULL,
  details     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed')),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEX --------------------------------------------------------------------
-- Profils : recherche & jointures
CREATE INDEX idx_profiles_username_trgm ON profiles USING gin (username gin_trgm_ops);
CREATE INDEX idx_profiles_location_gist ON profiles USING gist (location);

-- Posts : feed (tri par date), filtre par auteur, géo
CREATE INDEX idx_posts_published_at      ON posts (published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_author            ON posts (author_id, published_at DESC);
CREATE INDEX idx_posts_species           ON posts (species_id) WHERE species_id IS NOT NULL;
CREATE INDEX idx_posts_location_gist     ON posts USING gist (location);
CREATE INDEX idx_posts_trending          ON posts (likes_count DESC, published_at DESC)
                                          WHERE visibility = 'public' AND deleted_at IS NULL;

-- Reactions / comments : jointures inverses
CREATE INDEX idx_reactions_user          ON reactions (user_id, created_at DESC);
CREATE INDEX idx_comments_post           ON comments (post_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author         ON comments (author_id, created_at DESC);

-- Follows : « qui me suit »
CREATE INDEX idx_follows_followed        ON follows (followed_id, follower_id);

-- Notifications : channel realtime + unread badge
CREATE INDEX idx_notifications_user      ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread    ON notifications (user_id) WHERE read_at IS NULL;

-- Taxref : autocomplete
CREATE INDEX idx_taxref_search_gin       ON taxref USING gin (search_vector);
CREATE INDEX idx_taxref_nom_vern_trgm    ON taxref USING gin (nom_vern gin_trgm_ops);

-- Reports : queue de modération
CREATE INDEX idx_reports_pending         ON reports (created_at) WHERE status = 'pending';

-- 4. FONCTIONS & TRIGGERS -----------------------------------------------------

-- 4.1 updated_at automatique
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated   BEFORE UPDATE ON profiles      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notebooks_updated  BEFORE UPDATE ON notebooks     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_settings_updated   BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4.2 Compteur posts
CREATE OR REPLACE FUNCTION update_post_counters() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET posts_count = posts_count + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = OLD.author_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_posts_counters
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_counters();

-- 4.3 Compteur likes
CREATE OR REPLACE FUNCTION update_likes_counters() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_reactions_counters
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION update_likes_counters();

-- 4.4 Compteur commentaires
CREATE OR REPLACE FUNCTION update_comments_counters() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_comments_counters
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comments_counters();

-- 4.5 Compteurs follows
CREATE OR REPLACE FUNCTION update_follow_counters() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.followed_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.followed_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_follows_counters
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counters();

-- 4.6 Auto création profil + settings sur signup
CREATE OR REPLACE FUNCTION handle_new_auth_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, 'user_' || substring(NEW.id::text, 1, 8))
  ON CONFLICT DO NOTHING;
  INSERT INTO user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- 4.7 Helpers de visibilité (utilisés par les RLS)
CREATE OR REPLACE FUNCTION can_see_profile(target UUID) RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = target AND blocked_id = auth.uid())
       OR (blocker_id = auth.uid() AND blocked_id = target)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_see_post(p posts) RETURNS BOOLEAN AS $$
  SELECT
    p.deleted_at IS NULL
    AND can_see_profile(p.author_id)
    AND CASE p.visibility
          WHEN 'public'    THEN true
          WHEN 'followers' THEN EXISTS (
            SELECT 1 FROM follows
            WHERE follower_id = auth.uid() AND followed_id = p.author_id
          ) OR p.author_id = auth.uid()
          WHEN 'private'   THEN p.author_id = auth.uid()
        END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5. RLS (extraits — voir security/rls-policies.md pour le détail) ------------
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows       ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports       ENABLE ROW LEVEL SECURITY;
-- taxref reste en lecture publique sans RLS (référentiel ouvert)

-- FIN -------------------------------------------------------------------------
