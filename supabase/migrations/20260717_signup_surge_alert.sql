-- Migration: 20260717_signup_surge_alert (NG-041)
-- =============================================================================
-- Alerte email au fondateur en cas de pic d'inscriptions (> 50 en 1 heure).
--
-- Mecanisme : trigger DB sur auth.users AFTER INSERT. Le trigger COMPTE les
-- inscriptions de la derniere heure et applique l'anti-spam (au plus 1 alerte
-- par heure) directement en SQL, puis n'appelle l'Edge Function
-- alert-signup-surge (qui envoie l'email via Resend) QUE si le seuil est
-- franchi. Objectif eco-conception : ne pas invoquer d'Edge Function a chaque
-- inscription, seulement lors d'un pic reel.
--
-- Robustesse : le corps du trigger est enveloppe dans un bloc EXCEPTION qui
-- avale toute erreur (RETURN NEW). Un trigger sur auth.users s'execute DANS la
-- transaction d'inscription : il ne doit JAMAIS pouvoir la faire echouer.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Etat d'anti-spam (singleton) -------------------------------------------
CREATE TABLE IF NOT EXISTS public.signup_surge_alert_state (
  id integer PRIMARY KEY DEFAULT 1,
  last_alerted_at timestamptz,
  last_count integer,
  CONSTRAINT signup_surge_alert_state_singleton CHECK (id = 1)
);

-- Table interne : accessible seulement via le trigger (definer) et le
-- service_role. RLS activee sans policy = aucun acces anon/authenticated.
ALTER TABLE public.signup_surge_alert_state ENABLE ROW LEVEL SECURITY;

INSERT INTO public.signup_surge_alert_state (id, last_alerted_at, last_count)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Fonction trigger : comptage + anti-spam + ping Edge Function -----------
CREATE OR REPLACE FUNCTION public.notify_signup_surge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold constant integer := 50;      -- > 50 inscriptions
  v_window    constant interval := interval '1 hour';
  v_count     integer;
  v_last      timestamptz;
  v_secret    text;
BEGIN
  -- Comptage des inscriptions sur la fenetre glissante.
  SELECT count(*) INTO v_count
  FROM auth.users
  WHERE created_at > now() - v_window;

  IF v_count <= v_threshold THEN
    RETURN NEW;
  END IF;

  -- Anti-spam : au plus une alerte par heure.
  SELECT last_alerted_at INTO v_last
  FROM public.signup_surge_alert_state
  WHERE id = 1
  FOR UPDATE;

  IF v_last IS NOT NULL AND v_last > now() - v_window THEN
    RETURN NEW; -- deja alerte recemment
  END IF;

  UPDATE public.signup_surge_alert_state
  SET last_alerted_at = now(), last_count = v_count
  WHERE id = 1;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret';

  PERFORM net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/alert-signup-surge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := jsonb_build_object('count', v_count, 'window_hours', 1, 'threshold', v_threshold),
    timeout_milliseconds := 20000
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ne JAMAIS casser une inscription a cause de l'alerte. On avale l'erreur.
    RAISE WARNING 'notify_signup_surge a echoue (ignore): %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger uniquement : jamais appele en RPC.
REVOKE EXECUTE ON FUNCTION public.notify_signup_surge() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_signup_surge() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_signup_surge() FROM authenticated;

-- 3. Trigger sur auth.users --------------------------------------------------
DROP TRIGGER IF EXISTS trg_notify_signup_surge ON auth.users;
CREATE TRIGGER trg_notify_signup_surge
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.notify_signup_surge();

-- Rollback (reference) :
--   DROP TRIGGER IF EXISTS trg_notify_signup_surge ON auth.users;
--   DROP FUNCTION IF EXISTS public.notify_signup_surge();
--   DROP TABLE IF EXISTS public.signup_surge_alert_state;
