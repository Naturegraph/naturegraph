-- Migration: 20260722_infra_health_check (NG-037 + NG-035)
-- =============================================================================
-- Contrôle quotidien des seuils d'infrastructure, avec alerte email seulement
-- quand un seuil est franchi (pas de rapport quotidien inutile).
--
-- Pourquoi maison plutôt que natif : ni Resend ni Supabase ne proposent ce qu'il
-- faut (vérifié le 2026-07-22).
--   - Resend : aucun webhook d'avertissement de quota, aucun endpoint de
--     consommation. D'où le comptage via email_events (webhook email.sent).
--   - Supabase : la doc dit explicitement que le Spend Cap ne permet pas de
--     "recevoir des notifications à certains seuils". Seules des notifications
--     APRÈS dépassement existent.
--
-- Seuil le plus important : le quota Resend JOURNALIER. Les codes de connexion
-- partent par Resend, donc l'épuiser empêche les utilisateurs de se connecter.
-- C'est une panne d'authentification, d'où une alerte dès 70 % et critique à 90 %.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Anti-spam : au plus une alerte par jour ---------------------------------
CREATE TABLE IF NOT EXISTS public.infra_alert_state (
  id integer PRIMARY KEY DEFAULT 1,
  last_alerted_at timestamptz,
  last_payload jsonb,
  CONSTRAINT infra_alert_state_singleton CHECK (id = 1)
);
ALTER TABLE public.infra_alert_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.infra_alert_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. Fonction de contrôle -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_infra_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Plan Resend gratuit (constaté sur le dashboard le 2026-07-22).
  c_resend_jour   constant integer := 100;
  c_resend_mois   constant integer := 3000;
  -- Plan Supabase Pro.
  c_disque_octets constant bigint := 8589934592;    -- 8 Go
  c_storage_octets constant bigint := 107374182400; -- 100 Go
  -- Volume minimum avant de calculer un taux : évite "1 bounce sur 2 envois = 50 %".
  c_volume_mini   constant integer := 20;

  v_jour     integer;
  v_mois     integer;
  v_base     bigint;
  v_storage  bigint;
  v_conn_max integer;
  v_conn     integer;
  v_envoyes  integer;
  v_bounces  integer;
  v_plaintes integer;
  v_taux_b   numeric;
  v_taux_p   numeric;

  v_alertes  jsonb := '[]'::jsonb;
  v_pct      integer;
  v_dernier  timestamptz;
  v_secret   text;
BEGIN
  -- ── Mesures ───────────────────────────────────────────────────────────────
  SELECT count(*) INTO v_jour FROM public.email_events
   WHERE event = 'email.sent' AND created_at >= date_trunc('day', now());

  SELECT count(*) INTO v_mois FROM public.email_events
   WHERE event = 'email.sent' AND created_at >= date_trunc('month', now());

  SELECT pg_database_size(current_database()) INTO v_base;

  SELECT coalesce(sum((metadata->>'size')::bigint), 0) INTO v_storage FROM storage.objects;

  SELECT setting::int INTO v_conn_max FROM pg_settings WHERE name = 'max_connections';
  SELECT count(*) INTO v_conn FROM pg_stat_activity;

  SELECT
    count(*) FILTER (WHERE event = 'email.sent'),
    count(*) FILTER (WHERE event = 'email.bounced'),
    count(*) FILTER (WHERE event = 'email.complained')
  INTO v_envoyes, v_bounces, v_plaintes
  FROM public.email_events
  WHERE created_at > now() - interval '7 days';

  -- ── Quota Resend journalier (le plus critique) ────────────────────────────
  v_pct := round(100.0 * v_jour / c_resend_jour);
  IF v_pct >= 70 THEN
    v_alertes := v_alertes || jsonb_build_object(
      'libelle', 'Quota Resend journalier',
      'valeur', v_jour || ' / ' || c_resend_jour,
      'pourcentage', v_pct,
      'gravite', CASE WHEN v_pct >= 90 THEN 'critique' ELSE 'attention' END,
      'conseil', 'Les codes de connexion passent par Resend : atteindre 100 empeche les utilisateurs de se connecter. Eviter tout envoi de masse aujourd hui.'
    );
  END IF;

  -- ── Quota Resend mensuel ──────────────────────────────────────────────────
  v_pct := round(100.0 * v_mois / c_resend_mois);
  IF v_pct >= 66 THEN
    v_alertes := v_alertes || jsonb_build_object(
      'libelle', 'Quota Resend mensuel',
      'valeur', v_mois || ' / ' || c_resend_mois,
      'pourcentage', v_pct,
      'gravite', CASE WHEN v_pct >= 90 THEN 'critique' ELSE 'attention' END,
      'conseil', 'Envisager le pay-as-you-go ou un plan payant avant la fin du mois.'
    );
  END IF;

  -- ── Connexions Postgres ───────────────────────────────────────────────────
  v_pct := round(100.0 * v_conn / v_conn_max);
  IF v_pct >= 80 THEN
    v_alertes := v_alertes || jsonb_build_object(
      'libelle', 'Connexions Postgres',
      'valeur', v_conn || ' / ' || v_conn_max,
      'pourcentage', v_pct,
      'gravite', CASE WHEN v_pct >= 90 THEN 'critique' ELSE 'attention' END,
      'conseil', 'Verifier les connexions inactives et l usage du pooler.'
    );
  END IF;

  -- ── Taille de la base ─────────────────────────────────────────────────────
  v_pct := round(100.0 * v_base / c_disque_octets);
  IF v_pct >= 80 THEN
    v_alertes := v_alertes || jsonb_build_object(
      'libelle', 'Taille de la base',
      'valeur', pg_size_pretty(v_base) || ' / ' || pg_size_pretty(c_disque_octets),
      'pourcentage', v_pct,
      'gravite', 'attention',
      'conseil', 'Le disque s agrandit automatiquement sur le plan Pro, mais cela augmente la facture.'
    );
  END IF;

  -- ── Taille du storage ─────────────────────────────────────────────────────
  v_pct := round(100.0 * v_storage / c_storage_octets);
  IF v_pct >= 80 THEN
    v_alertes := v_alertes || jsonb_build_object(
      'libelle', 'Stockage fichiers',
      'valeur', pg_size_pretty(v_storage) || ' / ' || pg_size_pretty(c_storage_octets),
      'pourcentage', v_pct,
      'gravite', 'attention',
      'conseil', 'Au dela du quota inclus, le stockage est facture au Go.'
    );
  END IF;

  -- ── Delivrabilite : bounces et plaintes (NG-035) ──────────────────────────
  IF v_envoyes >= c_volume_mini THEN
    v_taux_b := round(100.0 * v_bounces / v_envoyes, 2);
    IF v_taux_b > 2 THEN
      v_alertes := v_alertes || jsonb_build_object(
        'libelle', 'Taux de rejet (bounce) sur 7 jours',
        'valeur', v_bounces || ' / ' || v_envoyes,
        'pourcentage', v_taux_b,
        'gravite', CASE WHEN v_taux_b > 5 THEN 'critique' ELSE 'attention' END,
        'conseil', 'Nettoyer les adresses invalides : un taux eleve degrade la reputation d envoi.'
      );
    END IF;

    v_taux_p := round(100.0 * v_plaintes / v_envoyes, 2);
    IF v_taux_p > 0.1 THEN
      v_alertes := v_alertes || jsonb_build_object(
        'libelle', 'Taux de plaintes spam sur 7 jours',
        'valeur', v_plaintes || ' / ' || v_envoyes,
        'pourcentage', v_taux_p,
        'gravite', 'critique',
        'conseil', 'Reduire la frequence d envoi immediatement : les plaintes abiment durablement la delivrabilite.'
      );
    END IF;
  END IF;

  -- ── Rien a signaler ───────────────────────────────────────────────────────
  IF jsonb_array_length(v_alertes) = 0 THEN
    RETURN jsonb_build_object('alertes', 0, 'envoye', false);
  END IF;

  -- ── Anti-spam : au plus une alerte par 20h ────────────────────────────────
  SELECT last_alerted_at INTO v_dernier FROM public.infra_alert_state WHERE id = 1 FOR UPDATE;
  IF v_dernier IS NOT NULL AND v_dernier > now() - interval '20 hours' THEN
    RETURN jsonb_build_object('alertes', jsonb_array_length(v_alertes), 'envoye', false,
                              'raison', 'deja_alerte_recemment');
  END IF;

  UPDATE public.infra_alert_state
     SET last_alerted_at = now(), last_payload = v_alertes
   WHERE id = 1;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';

  PERFORM net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/alert-infra-health',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := jsonb_build_object('alertes', v_alertes),
    timeout_milliseconds := 20000
  );

  RETURN jsonb_build_object('alertes', jsonb_array_length(v_alertes), 'envoye', true);
EXCEPTION
  WHEN OTHERS THEN
    -- Une surveillance qui plante ne doit jamais perturber la base.
    RAISE WARNING 'check_infra_health a echoue (ignore): %', SQLERRM;
    RETURN jsonb_build_object('erreur', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_infra_health() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_infra_health() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_infra_health() FROM authenticated;

-- 3. Cron quotidien -----------------------------------------------------------
-- 16h UTC (12h Montreal) : en milieu de journee, assez tot pour reagir si le
-- quota journalier derape, et apres le cron email de 12h UTC.
SELECT cron.unschedule('daily_infra_health')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily_infra_health');

SELECT cron.schedule(
  'daily_infra_health',
  '0 16 * * *',
  $$ SELECT public.check_infra_health(); $$
);

-- Rollback (reference) :
--   SELECT cron.unschedule('daily_infra_health');
--   DROP FUNCTION IF EXISTS public.check_infra_health();
--   DROP TABLE IF EXISTS public.infra_alert_state;
