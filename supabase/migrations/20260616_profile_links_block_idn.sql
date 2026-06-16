-- NG-004 (suite) : bloquer les domaines punycode / IDN (xn--) sur les liens profil.
--
-- Un domaine en punycode (ex: xn--ggle-55da = faux "google" cyrillique) peut imiter
-- visuellement une marque connue (IDN homograph / phishing). Aucun usage legitime
-- attendu sur ces champs -> on neutralise (NULL) tout lien dont l'hote contient
-- un label `xn--`. S'ajoute aux controles existants (http(s) + bon domaine par champ).
-- Meme regle cote front (safeExternalUrl + normalizeSocialUrl).

CREATE OR REPLACE FUNCTION public.sanitize_profile_links()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Site web : http(s) + pas de domaine punycode/IDN.
  IF NEW.website IS NOT NULL AND btrim(NEW.website) <> ''
     AND (NEW.website !~* '^https?://' OR NEW.website ~* '^https?://[^/]*xn--') THEN
    NEW.website := NULL;
  END IF;

  -- Instagram : doit pointer vers instagram.com (et pas de punycode).
  IF NEW.instagram IS NOT NULL AND btrim(NEW.instagram) <> ''
     AND (NEW.instagram !~* '^https?://(www\.)?instagram\.com([/?#]|$)'
          OR NEW.instagram ~* '^https?://[^/]*xn--') THEN
    NEW.instagram := NULL;
  END IF;

  -- Facebook : facebook.com / fb.com / fb.me (www. ou m. optionnel, pas de punycode).
  IF NEW.facebook IS NOT NULL AND btrim(NEW.facebook) <> ''
     AND (NEW.facebook !~* '^https?://(www\.|m\.)?(facebook\.com|fb\.com|fb\.me)([/?#]|$)'
          OR NEW.facebook ~* '^https?://[^/]*xn--') THEN
    NEW.facebook := NULL;
  END IF;

  -- Twitter / X (colonne conservee meme si retiree de l'UI beta).
  IF NEW.twitter IS NOT NULL AND btrim(NEW.twitter) <> ''
     AND (NEW.twitter !~* '^https?://(www\.)?(twitter\.com|x\.com)([/?#]|$)'
          OR NEW.twitter ~* '^https?://[^/]*xn--') THEN
    NEW.twitter := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Nettoyage one-time des domaines punycode deja stockes (site web : les autres champs
-- sont deja contraints a leur domaine, mais on couvre par securite).
UPDATE public.profiles SET website = NULL
  WHERE website IS NOT NULL AND website ~* '^https?://[^/]*xn--';
UPDATE public.profiles SET instagram = NULL
  WHERE instagram IS NOT NULL AND instagram ~* '^https?://[^/]*xn--';
UPDATE public.profiles SET facebook = NULL
  WHERE facebook IS NOT NULL AND facebook ~* '^https?://[^/]*xn--';
UPDATE public.profiles SET twitter = NULL
  WHERE twitter IS NOT NULL AND twitter ~* '^https?://[^/]*xn--';
