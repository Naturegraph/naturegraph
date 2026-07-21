-- ============================================================================
-- Migration : table email_send_log (NG-045 Phase 0)
-- Date      : 2026-07-02
-- Epic      : Notifications email intelligent
-- Description :
--   Garde-fou anti-spam minimal pour NG-045 : quand a-t-on envoye quel type
--   d'email a quel user pour la derniere fois. Sert a appliquer les regles :
--     - 1 email marketing max par semaine (E1/E2/E3/E4 ne se cumulent pas)
--     - E2 : pas d'envoi si E1 envoye dans les 48h
--     - E8 : max 1 email par profil suivi par jour
--
--   NG-035 (observabilite soft launch, statut Analyse) ajoutera plus tard
--   les webhooks Resend (delivered/bounced/opened/clicked) dans une table
--   email_events distincte, orientee delivrabilite. email_send_log est
--   volontairement plus simple : uniquement "on a tente un envoi", pas de
--   PII au-dela de user_id, pas de contenu d'email stocke.
--
--   category permet de regrouper E1/E2/E3/E4 sous 'weekly_marketing' pour
--   appliquer la regle "1 par semaine max, ne se cumulent pas" avec une
--   seule requete, independamment du type precis envoye.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_type VARCHAR(30) NOT NULL
    CHECK (email_type IN ('e1_weekly_summary', 'e2_missed', 'e3_goal_reminder',
                           'e4_streak_risk', 'e5_activation', 'e6_milestone',
                           'e7_reactions', 'e8_followed_post')),
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('weekly_marketing', 'event')),
  -- reference_key : cle libre pour les dedup fines (ex : E8 = id de l'auteur
  -- suivi, pour appliquer "max 1 email par profil suivi par jour" au lieu
  -- d'un quota global E8).
  reference_key TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_send_log IS
  'Log minimal des envois email NG-045 : sert l''anti-spam (quotas, delais entre types). Pas de contenu email stocke, pas de PII hors user_id. Complementaire a la future table email_events (NG-035, webhooks delivrabilite).';

-- Index pour les requetes anti-spam frequentes : "dernier envoi de ce type/categorie pour ce user".
CREATE INDEX IF NOT EXISTS idx_email_send_log_user_category
  ON public.email_send_log (user_id, category, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_send_log_user_type_ref
  ON public.email_send_log (user_id, email_type, reference_key, sent_at DESC);

-- RLS : uniquement le service role (Edge Functions) ecrit et lit cette table.
-- Un user authentifie peut consulter son propre historique (transparence),
-- pas celui des autres.
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_send_log_select_own" ON public.email_send_log;
CREATE POLICY "email_send_log_select_own"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Pas de policy INSERT/UPDATE/DELETE pour authenticated/anon : seul le
-- service role (Edge Functions, bypass RLS) ecrit dans cette table.
