-- NG-049 : garde-fous de contenu sur un echange, cote base
-- =============================================================================
-- APPLIQUEE sur naturegraph-prod le 2026-07-23 (version 20260723171322).
--
-- Une premiere version (20260723171144) portait la classe de caracteres en
-- LITTERAUX invisibles : identique en comportement, mais illisible dans un
-- fichier ou un diff. Elle a ete remplacee par celle-ci le jour meme. Rejouer
-- ce seul fichier suffit, `CREATE OR REPLACE` ecrasant l'une comme l'autre.
--
-- Demande Nicolas 2026-07-23 : "prevoir la securite caracteres speciaux etc,
-- interdire les liens etc pour eviter tout debordement dans l'ecriture".
--
-- DOUBLE BARRIERE. Les memes regles existent cote client
-- (src/lib/echangeValidation.ts), avec des messages clairs et immediats.
-- Celles-ci sont la barriere REELLE : un appel direct a l'API PostgREST ne
-- passe par aucun de nos composants. Les deux doivent etre modifiees ensemble.
--
-- CE QU'ON REFUSE :
--   - LES LIENS, sous toutes leurs formes (schema, www., domaine nu). Un
--     echange n'a aucun besoin legitime d'une URL : les especes viennent de
--     notre referentiel et le partage a son bouton dedie. En face, le lien est
--     le vecteur numero un du spam et de l'hameconnage.
--   - LE REMPLISSAGE : au-dela de 12 fois le meme caractere, ce n'est plus un
--     message mais une facon d'occuper l'ecran des autres.
--
-- CE QU'ON NETTOIE SANS REFUSER : les caracteres invisibles. Personne ne les
-- tape volontairement, un message d'erreur serait incomprehensible. Ils servent
-- a couper un mot pour passer sous un filtre, et surtout, pour U+202A..U+202E,
-- a INVERSER le sens d'affichage afin de faire lire autre chose que ce qui est
-- reellement stocke.
--
-- La classe de caracteres est construite avec `chr()` et JAMAIS ecrite en
-- caracteres litteraux : un caractere invisible colle dans un fichier SQL est
-- invisible pour la relecture aussi, donc impossible a diagnostiquer. Le code
-- point est ecrit en clair a cote de chaque borne.
-- U+0000 est volontairement exclu, PostgreSQL refusant de le stocker en text.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_comment_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_texte text;
  -- Retour a la ligne (10) et tabulation (9) sont volontairement CONSERVES.
  c_invisibles constant text :=
    '['
    || chr(1) || '-' || chr(8)        -- controle C0 (hors tab et saut de ligne)
    || chr(11) || chr(12)             -- tabulation verticale, saut de page
    || chr(14) || '-' || chr(31)      -- suite du controle C0
    || chr(127) || '-' || chr(159)    -- DEL et controle C1
    || chr(8203) || '-' || chr(8207)  -- U+200B..U+200F espaces de largeur nulle
    || chr(8234) || '-' || chr(8238)  -- U+202A..U+202E marques bidirectionnelles
    || chr(8294) || '-' || chr(8297)  -- U+2066..U+2069 isolants directionnels
    || chr(65279)                     -- U+FEFF BOM
    || ']';
BEGIN
  IF NEW.content IS NULL THEN
    RAISE EXCEPTION 'Le commentaire ne peut pas etre vide';
  END IF;

  -- 1. NETTOYAGE ------------------------------------------------------------
  v_texte := regexp_replace(NEW.content, c_invisibles, '', 'g');
  -- Lignes vides en trop : trente retours a la ligne servent a pousser les
  -- messages suivants hors de l'ecran.
  v_texte := regexp_replace(v_texte, E'\r\n|\r', E'\n', 'g');
  v_texte := regexp_replace(v_texte, E'\n{3,}', E'\n\n', 'g');
  v_texte := btrim(v_texte);

  NEW.content := v_texte;

  -- 2. VALIDATION -----------------------------------------------------------
  IF v_texte = '' THEN
    RAISE EXCEPTION 'Le commentaire ne peut pas etre vide';
  END IF;

  IF LENGTH(v_texte) > 500 THEN
    RAISE EXCEPTION 'Commentaire trop long (max 500 caracteres)';
  END IF;

  IF v_texte ~* '[a-z][a-z0-9+.-]*://'
     OR v_texte ~* '\m(javascript|data|vbscript|file):'
     OR v_texte ~* '\mwww\.[a-z0-9-]'
     OR v_texte ~* '\m[a-z0-9]([a-z0-9-]*[a-z0-9])?\.(com|net|org|io|co|fr|ca|be|ch|eu|info|biz|xyz|top|shop|club|online|site|link|app|dev|me|ly|gl|to|cc|tv|ru|cn)\M'
  THEN
    RAISE EXCEPTION 'Les liens ne sont pas autorises dans les echanges';
  END IF;

  -- Remplissage : au-dela de 12 fois le meme caractere, ce n'est plus un mot.
  IF v_texte ~ '(.)\1{12,}' THEN
    RAISE EXCEPTION 'Ton message repete trop de fois le meme caractere';
  END IF;

  RETURN NEW;
END;
$function$;
