-- ============================================================================
-- Migration : vue notifications_with_actor
-- Date      : 2026-04-16
-- Epic      : Notifications §2.1
-- Description :
--   Enrichit les notifications avec actor_id / actor_username / actor_avatar_url
--   pour l'affichage dans le panel (avatar réel au lieu des initiales).
--
--   Stratégie :
--     - type = 'follow'  → actor = reference_id (c'est bien le follower)
--     - autres types     → lookup par username = notifications.title
--   Phase 2 : ajouter colonne actor_id en dur dans la table notifications
--   pour fiabiliser (éviter collisions de username).
-- ============================================================================

CREATE OR REPLACE VIEW public.notifications_with_actor AS
SELECT
  n.id,
  n.user_id,
  n.type,
  n.title,
  n.body,
  n.reference_id,
  n.reference_type,
  n.read,
  n.created_at,
  COALESCE(
    CASE WHEN n.type = 'follow' THEN n.reference_id END,
    p_by_name.id
  ) AS actor_id,
  COALESCE(p_follow.username, p_by_name.username, n.title) AS actor_username,
  COALESCE(p_follow.avatar_url, p_by_name.avatar_url) AS actor_avatar_url
FROM public.notifications n
LEFT JOIN public.profiles p_follow
  ON n.type = 'follow' AND n.reference_id = p_follow.id
LEFT JOIN public.profiles p_by_name
  ON n.type <> 'follow' AND p_by_name.username = n.title;

COMMENT ON VIEW public.notifications_with_actor IS
  'Notifications enrichies avec actor_id/username/avatar pour affichage panel.';

GRANT SELECT ON public.notifications_with_actor TO authenticated;
