-- ============================================================================
-- Migration : table notification_preferences + RLS + check dans triggers
-- Date      : 2026-04-16
-- Epic      : Notifications §1.3 + §4.3
-- Description :
--   Stocke les préférences opt-in/out de chaque user par type de notification.
--   Utilisée par les triggers existants (reaction, follow, post) et par
--   la future edge function weekly_species_digest.
--
--   Modèle :
--     - 1 ligne par (user_id, type)
--     - Si pas de ligne → default enabled = TRUE
--     - Exception : species_digest requiert OPT-IN explicite (RGPD) → default FALSE
-- ============================================================================

-- ─── 1. Table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, type),
  CONSTRAINT notif_pref_type_check CHECK (
    type IN ('reaction', 'follow', 'post', 'species_digest',
             'comment', 'mention', 'identification', 'system')
  )
);

COMMENT ON TABLE public.notification_preferences IS
  'Préférences de notification par user et par type. Absence de ligne = default (TRUE sauf species_digest qui requiert opt-in explicite).';

-- ─── 2. RLS ────────────────────────────────────────────────────────────────

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Lecture : chacun voit uniquement ses propres préférences
DROP POLICY IF EXISTS "notif_pref_select_own" ON public.notification_preferences;
CREATE POLICY "notif_pref_select_own"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert/Update : chacun modifie uniquement ses propres préférences
DROP POLICY IF EXISTS "notif_pref_upsert_own" ON public.notification_preferences;
CREATE POLICY "notif_pref_upsert_own"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_pref_update_own" ON public.notification_preferences;
CREATE POLICY "notif_pref_update_own"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_pref_delete_own" ON public.notification_preferences;
CREATE POLICY "notif_pref_delete_own"
  ON public.notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 3. Helper : is_notif_enabled(user, type) ──────────────────────────────
--
-- Encapsule la règle métier "default enabled sauf species_digest".
-- Utilisé par les triggers pour court-circuiter l'INSERT si opt-out.

CREATE OR REPLACE FUNCTION public.is_notif_enabled(p_user_id UUID, p_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  pref BOOLEAN;
BEGIN
  SELECT enabled INTO pref
  FROM public.notification_preferences
  WHERE user_id = p_user_id AND type = p_type;

  -- Pas de préférence stockée → defaults
  IF pref IS NULL THEN
    -- species_digest : opt-in requis (RGPD)
    IF p_type = 'species_digest' THEN
      RETURN FALSE;
    END IF;
    -- Tous les autres : opt-out par défaut (enabled)
    RETURN TRUE;
  END IF;

  RETURN pref;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ─── 4. Mise à jour triggers existants : respect des préférences ───────────
--
-- Les triggers notify_on_reaction / notify_on_follow / notify_on_new_post
-- doivent désormais checker is_notif_enabled() avant d'INSERT.

-- 4.1 Reaction
CREATE OR REPLACE FUNCTION notify_on_reaction()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  reactor_username VARCHAR;
BEGIN
  SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;

  IF post_author_id IS NULL OR post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check préférence
  IF NOT public.is_notif_enabled(post_author_id, 'reaction') THEN
    RETURN NEW;
  END IF;

  SELECT username INTO reactor_username FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
  VALUES (post_author_id, 'reaction', COALESCE(reactor_username, 'Utilisateur'),
          NEW.type, NEW.post_id, 'post');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.2 Follow
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  follower_username VARCHAR;
BEGIN
  IF NOT public.is_notif_enabled(NEW.following_id, 'follow') THEN
    RETURN NEW;
  END IF;

  SELECT username INTO follower_username FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
  VALUES (NEW.following_id, 'follow', COALESCE(follower_username, 'Utilisateur'),
          NULL, NEW.follower_id, 'profile');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.3 New post (filtre follower par follower via JOIN sur is_notif_enabled)
CREATE OR REPLACE FUNCTION notify_on_new_post()
RETURNS TRIGGER AS $$
DECLARE
  author_username VARCHAR;
  follower_count INT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN RETURN NEW; END IF;
  IF NEW.visibility NOT IN ('public', 'followers') THEN RETURN NEW; END IF;

  SELECT username INTO author_username FROM public.profiles WHERE id = NEW.user_id;

  SELECT COUNT(*) INTO follower_count FROM public.follows WHERE following_id = NEW.user_id;
  IF follower_count > 10000 THEN
    RAISE NOTICE 'notify_on_new_post: skipping fan-out (% followers)', follower_count;
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
  SELECT f.follower_id, 'post', COALESCE(author_username, 'Utilisateur'),
         LEFT(NEW.description, 140), NEW.id, 'post'
  FROM public.follows f
  WHERE f.following_id = NEW.user_id
    AND public.is_notif_enabled(f.follower_id, 'post');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
