-- Migration: 20260717_validate_media_magic_bytes (NG-001)
-- =============================================================================
-- Validation serveur des magic bytes des medias uploades.
--
-- Contexte : Supabase Storage ne verifie que le Content-Type declare par le
-- client, pas les octets reels. Un fichier au format interdit (TIFF, GIF, HEIC,
-- AVIF...) renomme .jpg et envoye avec Content-Type: image/jpeg via un appel
-- direct a l'API passe la garde bucket. La validation cote client
-- (processMediaForUpload) protege l'IHM mais est contournable hors navigateur.
--
-- Cette migration branche un webhook DB : chaque insertion de media (ou
-- remplacement de fichier via edition de rencontre) declenche en ASYNC un appel
-- a l'Edge Function validate-media qui lit la vraie signature et supprime le
-- fichier + marque le media 'invalid' s'il est non conforme.
--
-- ORDRE DE DEPLOIEMENT : deployer d'abord l'Edge Function validate-media, PUIS
-- appliquer cette migration. Si l'ordre est inverse, les inserts appelleront une
-- fonction 404 : sans effet destructeur (fail-open), le fichier reste en place.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Etendre la contrainte de statut pour accepter 'invalid' -----------------
--    (marquage d'un media dont le fichier reel a un format interdit).
--    Additif : aucune ligne existante n'est impactee.
ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_status_check;
ALTER TABLE public.media ADD CONSTRAINT media_status_check
  CHECK ((status)::text = ANY (ARRAY[
    'uploading'::text,
    'processing'::text,
    'ready'::text,
    'error'::text,
    'invalid'::text
  ]));

-- 2. Fonction trigger : appel async non bloquant a validate-media ------------
--    Le net.http_post est mis en file par pg_net et n'attend pas la reponse :
--    l'insert media n'est jamais ralenti ni bloque par la validation.
CREATE OR REPLACE FUNCTION public.trigger_validate_media()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  -- Rien a valider sans fichier rattache.
  IF new.url IS NULL OR new.url = '' THEN
    RETURN new;
  END IF;

  -- Deja marque invalide (ex: re-ecriture par la fonction elle-meme) : stop.
  -- Garde-fou anti-boucle en plus du scope "OF url" du trigger.
  IF new.status = 'invalid' THEN
    RETURN new;
  END IF;

  -- Secret partage avec les crons NG-045 (meme frontiere de confiance :
  -- appels internes DB -> Edge Function).
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret';

  PERFORM net.http_post(
    url := 'https://hrxgduvworofnrjmgpcj.supabase.co/functions/v1/validate-media',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := jsonb_build_object('media_id', new.id, 'url', new.url),
    timeout_milliseconds := 20000
  );

  RETURN new;
END;
$$;

-- 2b. Verrouillage RPC : cette fonction est un TRIGGER uniquement, jamais
--     destinee a etre appelee via /rest/v1/rpc. Un trigger se declenche sans
--     droit EXECUTE, donc on revoque l'execution pour tous les roles exposes
--     (evite l'advisor "anon/authenticated can execute SECURITY DEFINER" et
--     l'expose PostgREST inutile). Meme hygiene que lock_admin_functions_execute.
REVOKE EXECUTE ON FUNCTION public.trigger_validate_media() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_validate_media() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_validate_media() FROM authenticated;

-- 3. Trigger : INSERT (publication) + UPDATE OF url (edition rencontre) -------
--    Scope volontairement limite a la colonne url : la mise a jour de status
--    par validate-media (UPDATE OF status) ne re-declenche donc pas le trigger.
DROP TRIGGER IF EXISTS validate_media_on_write ON public.media;
CREATE TRIGGER validate_media_on_write
AFTER INSERT OR UPDATE OF url ON public.media
FOR EACH ROW
EXECUTE FUNCTION public.trigger_validate_media();

-- Rollback (pour reference) :
--   DROP TRIGGER IF EXISTS validate_media_on_write ON public.media;
--   DROP FUNCTION IF EXISTS public.trigger_validate_media();
--   (la valeur 'invalid' peut rester dans la contrainte sans risque)
