-- Migration: 20260721_invite_reminder_email_type
-- =============================================================================
-- Ajoute le type d'email 'invite_reminder' a email_send_log.
--
-- Contexte : relance unique (one-off) des personnes invitees qui n'ont jamais
-- finalise leur inscription. Ce n'est aucun des 8 emails NG-045 (E1-E8), il lui
-- faut donc son propre type pour :
--   1. garantir l'idempotence (personne ne recoit la relance deux fois),
--   2. ne pas polluer les statistiques des emails E1-E8,
--   3. tracer l'envoi comme tout autre email (audit, RGPD).
--
-- Categorie utilisee : 'event' (hors quota weekly_marketing), la relance ne doit
-- pas consommer le quota marketing hebdomadaire.
--
-- Additif : aucune ligne existante n'est impactee.
-- =============================================================================

ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_email_type_check;
ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_email_type_check
  CHECK ((email_type)::text = ANY (ARRAY[
    'e1_weekly_summary'::text,
    'e2_missed'::text,
    'e3_goal_reminder'::text,
    'e4_streak_risk'::text,
    'e5_activation'::text,
    'e6_milestone'::text,
    'e7_reactions'::text,
    'e8_followed_post'::text,
    'invite_reminder'::text
  ]));
