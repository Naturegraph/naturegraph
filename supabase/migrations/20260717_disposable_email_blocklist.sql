-- Migration: 20260717_disposable_email_blocklist (NG-036)
-- =============================================================================
-- Blocage des domaines email jetables / temporaires a l'inscription.
--
-- Mecanisme : Auth Hook Supabase "Before User Created". Supabase appelle la
-- fonction public.hook_block_disposable_email(event jsonb) AVANT de creer le
-- compte ; si le domaine de l'email est dans email_blocklist, on renvoie une
-- erreur qui bloque l'inscription cote serveur (non contournable).
--
-- IMPORTANT (activation manuelle) : apres cette migration, activer le hook dans
-- le dashboard Supabase : Authentication > Hooks (Beta) > "Before User Created"
-- > Postgres > selectionner public.hook_block_disposable_email. Sans cette etape
-- dashboard, la fonction existe mais n'est jamais appelee.
--
-- On bloque UNIQUEMENT les services jetables/temporaires, jamais les providers
-- publics legitimes (gmail, yahoo, outlook...) : Naturegraph est une plateforme
-- citoyenne ouverte.
-- =============================================================================

-- 1. Table blocklist ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_blocklist (
  domain text PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table interne : lue par le hook (security definer). RLS activee sans policy =
-- aucun acces anon/authenticated (evite l'advisor rls_disabled + fuite de liste).
ALTER TABLE public.email_blocklist ENABLE ROW LEVEL SECURITY;

-- 2. Seed : domaines jetables courants (liste de depart, extensible) ---------
INSERT INTO public.email_blocklist (domain, note) VALUES
  ('mailinator.com', 'jetable'),
  ('guerrillamail.com', 'jetable'),
  ('guerrillamail.info', 'jetable'),
  ('guerrillamail.net', 'jetable'),
  ('guerrillamail.org', 'jetable'),
  ('sharklasers.com', 'jetable (guerrillamail)'),
  ('grr.la', 'jetable (guerrillamail)'),
  ('yopmail.com', 'jetable'),
  ('yopmail.fr', 'jetable'),
  ('10minutemail.com', 'jetable'),
  ('temp-mail.org', 'jetable'),
  ('tempmail.com', 'jetable'),
  ('tempmailo.com', 'jetable'),
  ('throwawaymail.com', 'jetable'),
  ('getnada.com', 'jetable'),
  ('trashmail.com', 'jetable'),
  ('trashmail.de', 'jetable'),
  ('mailnesia.com', 'jetable'),
  ('dispostable.com', 'jetable'),
  ('fakeinbox.com', 'jetable'),
  ('maildrop.cc', 'jetable'),
  ('mohmal.com', 'jetable'),
  ('mailcatch.com', 'jetable'),
  ('spam4.me', 'jetable'),
  ('emailondeck.com', 'jetable'),
  ('mintemail.com', 'jetable'),
  ('mytemp.email', 'jetable'),
  ('inboxkitten.com', 'jetable'),
  ('tmpmail.org', 'jetable'),
  ('discard.email', 'jetable')
ON CONFLICT (domain) DO NOTHING;

-- 3. Fonction hook Before User Created ---------------------------------------
CREATE OR REPLACE FUNCTION public.hook_block_disposable_email(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email  text;
  v_domain text;
  v_hit    integer;
BEGIN
  v_email := event->'user'->>'email';

  -- Pas d'email (ex: signup telephone / provider sans email) : on laisse passer.
  IF v_email IS NULL OR v_email = '' THEN
    RETURN '{}'::jsonb;
  END IF;

  v_domain := lower(split_part(v_email, '@', 2));

  SELECT count(*) INTO v_hit
  FROM public.email_blocklist
  WHERE domain = v_domain;

  IF v_hit > 0 THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Les adresses email jetables ne sont pas acceptees. Utilise une adresse email permanente.'
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

-- 4. Permissions : seul supabase_auth_admin (qui invoque les hooks) peut executer
GRANT EXECUTE ON FUNCTION public.hook_block_disposable_email(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_block_disposable_email(jsonb) FROM PUBLIC, anon, authenticated;

-- Le hook (execute en tant que supabase_auth_admin) doit pouvoir lire la
-- blocklist. La fonction etant SECURITY DEFINER (owner postgres), elle bypass la
-- RLS ; ce grant est une ceinture-bretelles au cas ou.
GRANT SELECT ON public.email_blocklist TO supabase_auth_admin;

-- Rollback (reference) :
--   (desactiver d'abord le hook dans le dashboard)
--   DROP FUNCTION IF EXISTS public.hook_block_disposable_email(jsonb);
--   DROP TABLE IF EXISTS public.email_blocklist;
