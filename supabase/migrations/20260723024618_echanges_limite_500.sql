-- NG-049 : limite d'un echange ramenee de 1000 a 500 caracteres
-- =============================================================================
-- APPLIQUEE sur naturegraph-prod le 2026-07-23 (version 20260723024618).
--
-- Decision Nicolas 2026-07-22. 1000 caracteres autorisaient des paves qui
-- deforment le fil ; 500 laissent la place a une identification argumentee tout
-- en gardant des messages lisibles d'un coup d'oeil sur mobile.
--
-- Verifie avant application : 0 echange existant depasse 500 caracteres, la
-- baisse ne rend donc aucune donnee invalide. La contrainte ne s'applique qu'a
-- l'ecriture (trigger BEFORE INSERT OR UPDATE), l'historique reste lisible quoi
-- qu'il arrive.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_comment_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.content IS NULL OR btrim(NEW.content) = '' THEN
    RAISE EXCEPTION 'Le commentaire ne peut pas etre vide';
  END IF;

  IF LENGTH(NEW.content) > 500 THEN
    RAISE EXCEPTION 'Commentaire trop long (max 500 caracteres)';
  END IF;

  RETURN NEW;
END;
$function$;
