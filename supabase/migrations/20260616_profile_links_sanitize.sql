-- NG-004 : garde-fou backend contre le XSS stocke / liens dangereux sur profiles.
--
-- Contexte (test interne 2026-06-15) : les champs liens du profil (website,
-- instagram, facebook, twitter) pouvaient stocker des valeurs malveillantes via
-- un appel API REST direct (bypass du front) : schema `javascript:` (XSS stocke),
-- `data:`, etc. Le front valide deja a la saisie et le rendu est durci cote client
-- (safeExternalUrl), mais on ajoute ici une validation INDEPENDANTE cote base :
-- aucune valeur ne peut etre stockee si elle n'est pas une URL http(s).
--
-- Strategie : trigger BEFORE INSERT/UPDATE qui met a NULL tout lien dont le schema
-- n'est pas http(s) (les valeurs legitimes envoyees par le front sont des https://...
-- donc inchangees). Choix du "null silencieux" plutot que RAISE pour ne jamais
-- casser une sauvegarde de profil legitime.

CREATE OR REPLACE FUNCTION public.sanitize_profile_links()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Seuls http:// et https:// sont acceptes. Tout autre schema (javascript:, data:,
  -- vbscript:, ...) ou valeur non conforme est neutralise (mis a NULL).
  IF NEW.website IS NOT NULL AND btrim(NEW.website) <> '' AND NEW.website !~* '^https?://' THEN
    NEW.website := NULL;
  END IF;
  IF NEW.instagram IS NOT NULL AND btrim(NEW.instagram) <> '' AND NEW.instagram !~* '^https?://' THEN
    NEW.instagram := NULL;
  END IF;
  IF NEW.facebook IS NOT NULL AND btrim(NEW.facebook) <> '' AND NEW.facebook !~* '^https?://' THEN
    NEW.facebook := NULL;
  END IF;
  IF NEW.twitter IS NOT NULL AND btrim(NEW.twitter) <> '' AND NEW.twitter !~* '^https?://' THEN
    NEW.twitter := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_profile_links ON public.profiles;
CREATE TRIGGER trg_sanitize_profile_links
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_profile_links();

-- Nettoyage one-time des valeurs deja stockees qui ne sont pas http(s)
-- (neutralise les profils de test crees lors du pentest).
UPDATE public.profiles SET website = NULL
  WHERE website IS NOT NULL AND btrim(website) <> '' AND website !~* '^https?://';
UPDATE public.profiles SET instagram = NULL
  WHERE instagram IS NOT NULL AND btrim(instagram) <> '' AND instagram !~* '^https?://';
UPDATE public.profiles SET facebook = NULL
  WHERE facebook IS NOT NULL AND btrim(facebook) <> '' AND facebook !~* '^https?://';
UPDATE public.profiles SET twitter = NULL
  WHERE twitter IS NOT NULL AND btrim(twitter) <> '' AND twitter !~* '^https?://';
