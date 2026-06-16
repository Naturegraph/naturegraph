-- NG-004 (suite) : validation PAR CHAMP des liens de profil.
--
-- En plus d'exiger http(s) (migration 20260616_profile_links_sanitize), on impose
-- desormais le BON domaine par champ :
--   - instagram -> instagram.com
--   - facebook  -> facebook.com / fb.com / fb.me
--   - twitter   -> twitter.com / x.com
--   - website   -> n'importe quel site http(s) (champ generique)
-- Toute valeur non conforme est mise a NULL (y compris via appel API direct).
-- Effet de bord positif : ferme l'open-redirect / IDN homograph sur ig/fb/twitter
-- (le domaine doit etre exactement le bon, pas un sosie cyrillique).

CREATE OR REPLACE FUNCTION public.sanitize_profile_links()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Site web : http(s) uniquement (tout domaine).
  IF NEW.website IS NOT NULL AND btrim(NEW.website) <> '' AND NEW.website !~* '^https?://' THEN
    NEW.website := NULL;
  END IF;

  -- Instagram : doit pointer vers instagram.com.
  IF NEW.instagram IS NOT NULL AND btrim(NEW.instagram) <> ''
     AND NEW.instagram !~* '^https?://(www\.)?instagram\.com([/?#]|$)' THEN
    NEW.instagram := NULL;
  END IF;

  -- Facebook : facebook.com / fb.com / fb.me (avec www. ou m. optionnel).
  IF NEW.facebook IS NOT NULL AND btrim(NEW.facebook) <> ''
     AND NEW.facebook !~* '^https?://(www\.|m\.)?(facebook\.com|fb\.com|fb\.me)([/?#]|$)' THEN
    NEW.facebook := NULL;
  END IF;

  -- Twitter / X (colonne conservee meme si retiree de l'UI beta).
  IF NEW.twitter IS NOT NULL AND btrim(NEW.twitter) <> ''
     AND NEW.twitter !~* '^https?://(www\.)?(twitter\.com|x\.com)([/?#]|$)' THEN
    NEW.twitter := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Nettoyage one-time des valeurs deja stockees qui ne respectent pas le bon domaine.
UPDATE public.profiles SET instagram = NULL
  WHERE instagram IS NOT NULL AND btrim(instagram) <> ''
    AND instagram !~* '^https?://(www\.)?instagram\.com([/?#]|$)';
UPDATE public.profiles SET facebook = NULL
  WHERE facebook IS NOT NULL AND btrim(facebook) <> ''
    AND facebook !~* '^https?://(www\.|m\.)?(facebook\.com|fb\.com|fb\.me)([/?#]|$)';
UPDATE public.profiles SET twitter = NULL
  WHERE twitter IS NOT NULL AND btrim(twitter) <> ''
    AND twitter !~* '^https?://(www\.)?(twitter\.com|x\.com)([/?#]|$)';
