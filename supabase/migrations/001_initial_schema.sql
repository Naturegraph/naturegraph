-- ============================================
-- Naturegraph — Initial database schema
-- PostgreSQL + PostGIS (Supabase)
-- ============================================

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── Helper functions ────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_post_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location_point = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Profiles ────────────────────────────────

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  birth_date DATE,
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  city VARCHAR(100),
  region VARCHAR(100),
  country VARCHAR(50),
  instagram VARCHAR(100),
  twitter VARCHAR(100),
  website VARCHAR(255),
  is_public BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  avatar_url VARCHAR(500),
  banner_url VARCHAR(500),
  posts_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX idx_profiles_country ON public.profiles(country);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Posts ───────────────────────────────────

CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('nature_encounter', 'nature_instant')),
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'followers')),
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  -- Location
  city VARCHAR(100),
  region VARCHAR(100),
  country VARCHAR(50),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name VARCHAR(255),
  location_point GEOGRAPHY(POINT, 4326),
  location_hidden BOOLEAN DEFAULT FALSE,
  -- Context
  encounter_date TIMESTAMPTZ NOT NULL,
  time_of_day VARCHAR(20) CHECK (time_of_day IN ('morning', 'afternoon', 'dusk', 'evening', 'night')),
  weather VARCHAR(20) CHECK (weather IN ('sunny', 'cloudy', 'rainy', 'windy', 'snowy')),
  habitat VARCHAR(30) CHECK (habitat IN ('forest', 'park_garden', 'prairie_heath', 'urban', 'river', 'lake_wetland', 'mountain', 'sea_coast')),
  multiple_observations BOOLEAN DEFAULT FALSE,
  -- Identification (nature_encounter)
  species_identified BOOLEAN,
  species_name VARCHAR(255),
  scientific_name VARCHAR(255),
  taxonomic_group VARCHAR(20) CHECK (taxonomic_group IN ('birds', 'mammals', 'insects', 'amphibians', 'reptiles', 'arachnids', 'mollusks', 'fish', 'plants', 'other')),
  identification_status VARCHAR(20) DEFAULT 'pending' CHECK (identification_status IN ('identified', 'pending', 'disputed')),
  taxref_id VARCHAR(50),
  taxref_rank VARCHAR(50),
  taxref_source VARCHAR(500),
  taxref_license VARCHAR(50),
  taxref_updated_at TIMESTAMPTZ,
  -- Phenomenon (nature_instant)
  phenomenon VARCHAR(255),
  -- Counters (maintained by triggers)
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT description_not_empty CHECK (char_length(description) > 0)
);

CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_type ON public.posts(type);
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_visibility ON public.posts(visibility);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_published_at ON public.posts(published_at DESC);
CREATE INDEX idx_posts_country ON public.posts(country);
CREATE INDEX idx_posts_habitat ON public.posts(habitat);
CREATE INDEX idx_posts_taxonomic_group ON public.posts(taxonomic_group);
CREATE INDEX idx_posts_taxref_id ON public.posts(taxref_id);
CREATE INDEX idx_posts_location ON public.posts USING GIST(location_point) WHERE location_point IS NOT NULL;

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_location_point
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_post_location_point();

-- ─── Media ───────────────────────────────────

CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('photo', 'video')),
  format VARCHAR(20) CHECK (format IN ('square', 'portrait', 'landscape', 'free')),
  orientation VARCHAR(20) CHECK (orientation IN ('horizontal', 'vertical', 'square')),
  status VARCHAR(20) DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  original_url VARCHAR(500),
  display_order INTEGER NOT NULL,
  alt TEXT,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  mime_type VARCHAR(50),
  -- EXIF
  captured_at TIMESTAMPTZ,
  camera VARCHAR(100),
  lens VARCHAR(100),
  focal_length INTEGER,
  aperture VARCHAR(20),
  iso INTEGER,
  shutter_speed VARCHAR(20),
  -- GPS
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_point GEOGRAPHY(POINT, 4326),
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT display_order_positive CHECK (display_order > 0),
  CONSTRAINT file_size_positive CHECK (file_size > 0 OR file_size IS NULL)
);

CREATE INDEX idx_media_post_id ON public.media(post_id);
CREATE INDEX idx_media_user_id ON public.media(user_id);
CREATE INDEX idx_media_display_order ON public.media(post_id, display_order);

CREATE TRIGGER update_media_updated_at
  BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Reactions ───────────────────────────────

CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('love', 'fire', 'hands', 'trophy', 'star')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_reaction UNIQUE (user_id, post_id)
);

CREATE INDEX idx_reactions_post_id ON public.reactions(post_id);

-- Trigger: update posts.likes_count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_likes_count
  AFTER INSERT OR DELETE ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- ─── Comments ────────────────────────────────

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0)
);

CREATE INDEX idx_comments_post_id ON public.comments(post_id);

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update posts.comments_count
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- ─── Identification Proposals ────────────────

CREATE TABLE public.identification_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species_name VARCHAR(255) NOT NULL,
  scientific_name VARCHAR(255),
  taxref_id VARCHAR(50),
  confidence VARCHAR(20) CHECK (confidence IN ('certain', 'probable', 'possible')),
  notes TEXT,
  votes_up INTEGER DEFAULT 0,
  votes_down INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposals_post_id ON public.identification_proposals(post_id);

-- ─── Follows ─────────────────────────────────

CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_following ON public.follows(following_id);

-- Trigger: update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE public.profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- ─── Notebooks ───────────────────────────────

CREATE TABLE public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'collaborative')),
  cover_image_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notebooks_author ON public.notebooks(author_id);

CREATE TRIGGER update_notebooks_updated_at
  BEFORE UPDATE ON public.notebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.notebook_observations (
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  observation_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (notebook_id, observation_id)
);

-- ─── Notifications ───────────────────────────

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  reference_id UUID,
  reference_type VARCHAR(30),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- ─── TAXREF Cache ────────────────────────────

CREATE TABLE public.taxref_cache (
  cd_nom VARCHAR(50) PRIMARY KEY,
  cd_ref VARCHAR(50),
  scientific_name VARCHAR(255) NOT NULL,
  common_name_fr VARCHAR(255),
  common_name_en VARCHAR(255),
  author VARCHAR(255),
  kingdom VARCHAR(100),
  phylum VARCHAR(100),
  class_name VARCHAR(100),
  "order" VARCHAR(100),
  family VARCHAR(100),
  genus VARCHAR(100),
  rank VARCHAR(20),
  "group" VARCHAR(50),
  conservation_status VARCHAR(20),
  taxref_version VARCHAR(20),
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Trigger: update posts_count on profiles
CREATE OR REPLACE FUNCTION update_user_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'published' THEN
    UPDATE public.profiles SET posts_count = posts_count - 1 WHERE id = OLD.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'published' AND NEW.status = 'published' THEN
      UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
    ELSIF OLD.status = 'published' AND NEW.status != 'published' THEN
      UPDATE public.profiles SET posts_count = posts_count - 1 WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_posts_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_user_posts_count();
