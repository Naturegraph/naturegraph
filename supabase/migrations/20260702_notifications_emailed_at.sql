-- ============================================================================
-- Migration : notifications.emailed_at (NG-045 Phase 0)
-- Date      : 2026-07-02
-- Epic      : Notifications email intelligent
-- Description :
--   E7 (reactions + nouveau migrateur) et E8 (publication profil suivi)
--   reutilisent les notifications in-app deja inserees par les triggers
--   existants (notify_on_reaction / notify_on_follow / notify_on_new_post)
--   plutot que de dupliquer la detection d'evenement. Un job periodique
--   (cf. Edge Function a venir) scanne les notifications non encore
--   "emailees" pour construire les emails groupes (fenetre 30 min pour E7,
--   24h par auteur suivi pour E8).
--
--   emailed_at reste NULL tant que l'email n'a pas ete envoye pour cette
--   notif. Index partiel pour que le scan periodique reste rapide meme
--   avec beaucoup de notifications historiques deja traitees.
-- ============================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.notifications.emailed_at IS
  'Timestamp d''envoi de l''email correspondant (E7/E8), NULL tant que non traite. Ne pas confondre avec read (lecture in-app).';

-- Index partiel : seules les lignes non traitees sont scannees par le job.
CREATE INDEX IF NOT EXISTS idx_notifications_pending_email
  ON public.notifications (type, created_at)
  WHERE emailed_at IS NULL;

-- Backfill : les notifications existantes ne doivent pas generer un email
-- retroactif massif au premier run du job. On les marque comme deja
-- traitees (emailed_at = created_at) pour ne demarrer l'envoi email que sur
-- les evenements a venir.
UPDATE public.notifications
SET emailed_at = created_at
WHERE emailed_at IS NULL
  AND type IN ('reaction', 'follow', 'post');
