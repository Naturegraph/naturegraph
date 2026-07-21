-- Migration: 20260723_media_backup_status_lockdown
-- =============================================================================
-- Correctif de securite sur la vue creee par 20260722_media_backup.
--
-- Constat (advisor Supabase, niveau ERROR, 2026-07-21) : creee sans precaution,
-- la vue `media_backup_status` heritait des privileges par defaut du schema
-- public et etait en SECURITY DEFINER. Consequence concrete : n'importe quel
-- visiteur ANONYME pouvait appeler /rest/v1/media_backup_status et lire le
-- nombre de fichiers de chaque bucket.
--
-- La donnee exposee est faible (des compteurs, aucun chemin ni contenu), mais
-- il n'y a aucune raison de la publier : c'est une vue d'exploitation, elle ne
-- sert qu'a nous. Regle generale a retenir : toute vue creee dans `public` est
-- exposee par l'API REST par defaut, il faut donc statuer explicitement sur ses
-- droits a la creation.
--
-- Double protection :
--   1. security_invoker : la vue s'execute avec les droits de l'appelant et non
--      ceux de son createur. Un utilisateur sans acces a storage.objects n'en
--      tire donc rien, meme si un GRANT revenait par erreur plus tard.
--   2. REVOKE explicite sur anon et authenticated.
--
-- Aucune donnee n'est modifiee ni supprimee : cette migration ne touche que des
-- droits d'acces.
-- =============================================================================

ALTER VIEW public.media_backup_status SET (security_invoker = on);

REVOKE ALL ON public.media_backup_status FROM anon;
REVOKE ALL ON public.media_backup_status FROM authenticated;

-- Rollback (reference, deconseille) :
--   ALTER VIEW public.media_backup_status SET (security_invoker = off);
--   GRANT SELECT ON public.media_backup_status TO authenticated;
