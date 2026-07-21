-- Migration: 20260722_email_events (NG-035)
-- =============================================================================
-- Journal des evenements email recus depuis les webhooks Resend.
--
-- Pourquoi cette table : Resend n'expose AUCUN endpoint pour interroger la
-- consommation de quota, et aucun webhook d'avertissement de quota (verifie le
-- 2026-07-22 dans leur doc). La seule facon de connaitre le volume REEL envoye
-- est de journaliser l'evenement 'email.sent' de chaque envoi.
--
-- C'est indispensable ici car les emails d'authentification Supabase (codes de
-- connexion et de verification) partent aussi par Resend en SMTP : ils
-- consomment le quota sans jamais apparaitre dans email_send_log. Constate le
-- 2026-07-22 : 347 emails cote Resend contre 197 dans email_send_log, soit
-- 43 % du volume invisible.
--
-- Sert aussi au suivi de delivrabilite (bounces, plaintes), objectif principal
-- de NG-035.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identifiant Resend de l'email (permet de recoller les evenements entre eux).
  resend_email_id text,
  -- Type d'evenement brut Resend : email.sent, email.delivered, email.bounced,
  -- email.complained, email.opened, email.clicked, email.failed...
  event text NOT NULL,
  to_email text,
  subject text,
  -- Resolu par correspondance avec profiles.email quand c'est possible. NULL
  -- pour les emails qui ne correspondent a aucun compte (ex: adresse tapee a
  -- tort lors d'une inscription).
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Charge utile complete, pour ne rien perdre si on a besoin d'un detail plus
  -- tard (raison du bounce, lien clique...).
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotence : Svix rejoue un webhook tant qu'il n'a pas recu de 2xx. Sans
-- cette contrainte, un rejeu gonflerait artificiellement les compteurs de quota.
CREATE UNIQUE INDEX IF NOT EXISTS email_events_dedup_idx
  ON public.email_events (resend_email_id, event)
  WHERE resend_email_id IS NOT NULL;

-- Comptage du quota par jour et par mois : requete la plus frequente.
CREATE INDEX IF NOT EXISTS email_events_event_created_idx
  ON public.email_events (event, created_at DESC);

-- Suivi par utilisateur (delivrabilite individuelle).
CREATE INDEX IF NOT EXISTS email_events_user_idx
  ON public.email_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Table interne : ecrite par la fonction webhook (service_role), lue par les
-- jobs d'alerte et l'admin. RLS activee sans policy = aucun acces anon ni
-- authenticated, ce qui est voulu (elle contient des adresses email).
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Rollback (reference) :
--   DROP TABLE IF EXISTS public.email_events;
