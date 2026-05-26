-- =====================================================================
-- Phase C1 roadmap Pro : Activer Realtime sur les tables critiques UX
-- Date : 2026-05-25
-- =====================================================================
--
-- Pro plan inclut 500 connexions Realtime concurrentes.
-- Gain : feed live, badges notif temps reel, compteurs likes/comments
-- synchronises entre onglets sans refresh.
--
-- Tables ajoutees au stream supabase_realtime :
--   - posts          (nouveaux posts apparaissent dans le feed)
--   - follows        (compteur followers / following en live)
--   - reactions      (likes en live)
--   - comments       (nouveaux commentaires en live)
--   - notifications  (deja active, badge en live)
--
-- Cote code : utiliser supabase.channel('xxx').on('postgres_changes', ...)
-- dans les hooks useFeed / useNotifications / usePostDetail.
-- =====================================================================

DO $$
BEGIN
  -- posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='posts' AND schemaname='public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;

  -- follows
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='follows' AND schemaname='public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
  END IF;

  -- reactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='reactions' AND schemaname='public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
  END IF;

  -- comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='comments' AND schemaname='public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  END IF;
END $$;
