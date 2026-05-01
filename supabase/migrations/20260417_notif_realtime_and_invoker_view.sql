-- Migration: 20260417_notif_realtime_and_invoker_view
--
-- Deux corrections post-audit backend :
--
-- 1. Ajoute `public.notifications` à la publication Supabase Realtime.
--    Sans ça, le channel `notif:${userId}` côté client ne reçoit pas les
--    évènements INSERT — donc la cloche n'update pas en temps réel.
--
-- 2. Passe la vue `notifications_with_actor` en SECURITY INVOKER.
--    Par défaut une vue hérite du SECURITY du propriétaire (DEFINER), ce
--    qui bypass les RLS de `notifications`. En INVOKER, la vue respecte
--    les policies du user qui interroge (= SELECT own notifications only).
--    Remonté par l'advisor Supabase (lint 0010_security_definer_view).

-- 1. Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 2. View en SECURITY INVOKER
ALTER VIEW public.notifications_with_actor SET (security_invoker = true);

COMMENT ON VIEW public.notifications_with_actor IS
  'Notifications enrichies avec actor_id/username/avatar_url. SECURITY INVOKER = respecte les RLS de la table notifications.';
