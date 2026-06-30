-- ============================================================================
-- NG-029 (2026-06-30) — Suppression de l'email de confirmation waitlist
-- ============================================================================
-- Contexte : passage en acces ouvert (early access). La page publique /waitlist
-- (inscription au compte-goutte en beta fermee) est neutralisee cote front
-- (redirige vers /). L'email automatique de confirmation "tu es sur la liste",
-- declenche par un trigger AFTER INSERT sur beta_waitlist, n'a donc plus de
-- raison d'exister :
--   - plus d'inscription publique a la waitlist,
--   - la table beta_waitlist sert desormais de liste d'envoi pour les vagues
--     d'invitation (gerees par l'admin via send-beta-invite), un import en
--     masse ne doit surtout PAS spammer chaque ligne d'un email de confirmation.
--
-- On retire donc :
--   1. le trigger waitlist_send_confirmation (AFTER INSERT ON beta_waitlist),
--   2. sa fonction trigger_send_waitlist_email() devenue orpheline.
--
-- La fonction edge `send-waitlist-confirmation` reste deployee mais protegee
-- par le secret partage WAITLIST_TRIGGER_SECRET (cf. 20260623) : plus aucune
-- surface d'abus, plus aucun appel depuis la base.
--
-- Application : dev/staging (ce projet) ET naturegraph-prod.
-- ============================================================================

DROP TRIGGER IF EXISTS waitlist_send_confirmation ON public.beta_waitlist;
DROP FUNCTION IF EXISTS public.trigger_send_waitlist_email();
