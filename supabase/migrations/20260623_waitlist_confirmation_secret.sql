-- ============================================================================
-- NG-007 (2026-06-23) — Securisation de send-waitlist-confirmation
-- ============================================================================
-- L'edge function `send-waitlist-confirmation` est en verify_jwt:false (appelee
-- par ce trigger DB, pas par un client). Etant publiquement atteignable, elle
-- pouvait etre appelee par n'importe qui pour declencher l'envoi d'emails
-- brandes arbitraires (abus + consommation du quota Resend).
--
-- Correctif : un secret partage. Le trigger lit le secret depuis Supabase Vault
-- et le transmet en header `x-waitlist-secret`. L'edge function exige ce header
-- (cf. WAITLIST_TRIGGER_SECRET cote function).
--
-- Rollout progressif : si le secret n'existe pas encore dans Vault, le header
-- est simplement omis (comportement inchange), le temps de poser le secret des
-- deux cotes. Aucune rupture.
--
-- PREREQUIS (one-time, Dashboard, voir docs/security/SECURITY_SUPABASE.md) :
--   1. Generer un secret aleatoire (ex: `openssl rand -hex 32`).
--   2. Vault : INSERT INTO vault.secrets (name, secret) VALUES
--        ('waitlist_trigger_secret', '<le_secret>');
--   3. Edge Function Secrets : WAITLIST_TRIGGER_SECRET = <le_meme_secret>.
--   A faire sur dev/staging ET sur naturegraph-prod (secrets distincts).
--
-- Application : dev/staging (ce projet) puis naturegraph-prod. Pour prod, penser
-- a remplacer v_url / v_anon_key par ceux du project prod (cf. migration BATCH 77).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_send_waitlist_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  -- URL du project Supabase (dev). Pour prod, modifier cette constante avant déploiement.
  v_url CONSTANT TEXT := 'https://hrxgduvworofnrjmgpcj.supabase.co';
  -- Anon key (publique — utilisée par le frontend en clair, pas de risque de fuite).
  -- Pour prod, remplacer par l'anon key du project prod.
  v_anon_key CONSTANT TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeGdkdXZ3b3JvZm5yam1ncGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjk5MTQsImV4cCI6MjA5MDgwNTkxNH0.qjJWz_dff9L1Bph2tSbfhGvEJe1pmrU6jya-Vg6HY-A';
  v_secret TEXT;
  v_headers JSONB;
BEGIN
  -- Secret partagé depuis Vault (NULL si pas encore configuré -> header omis).
  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = 'waitlist_trigger_secret'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Vault indisponible ou droits insuffisants : on n'empeche pas l'INSERT.
    v_secret := NULL;
  END;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_anon_key
  );
  IF v_secret IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('x-waitlist-secret', v_secret);
  END IF;

  -- Appel async fire-and-forget (n'attend pas la réponse)
  PERFORM net.http_post(
    url := v_url || '/functions/v1/send-waitlist-confirmation',
    headers := v_headers,
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'beta_waitlist',
      'record', row_to_json(NEW)
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_send_waitlist_email() IS
  'BATCH 77 + NG-007 : envoie un email de confirmation via send-waitlist-confirmation apres INSERT sur beta_waitlist. Transmet un secret partage (Vault: waitlist_trigger_secret) en header x-waitlist-secret pour authentifier l appel.';
