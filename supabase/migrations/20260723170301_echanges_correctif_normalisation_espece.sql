-- CORRECTIF : normalisation du nom d'espece dans l'index d'unicite
-- =============================================================================
-- APPLIQUEE sur naturegraph-prod le 2026-07-23 (version 20260723170301).
--
-- L'index `comments_une_espece_par_personne` normalisait avec
-- `lower(btrim(species_label))`. Or `btrim` ne retire que les espaces AUX
-- EXTREMITES : "Buse variable" et "buse   VARIABLE" produisaient donc deux
-- cles distinctes, et le doublon passait.
--
-- Constate par un TEST TRANSACTIONNEL avant mise en service (2026-07-23) : la
-- seconde insertion, qui aurait du etre refusee, a ete acceptee. Sans ce test
-- la regle aurait ete annoncee comme garantie tout en etant contournable.
--
-- On ecrase aussi les suites d'espaces internes. En pratique le nom vient du
-- selecteur d'especes et arrive propre, mais une contrainte d'integrite ne doit
-- pas dependre de la politesse de l'appelant : c'est precisement ce qu'elle est
-- censee garantir quand l'appelant n'est pas notre interface.
-- =============================================================================

DROP INDEX IF EXISTS public.comments_une_espece_par_personne;

CREATE UNIQUE INDEX comments_une_espece_par_personne
  ON public.comments (
    post_id,
    user_id,
    (
      COALESCE(
        taxonomy_node_id::text,
        regexp_replace(lower(btrim(species_label)), '\s+', ' ', 'g')
      )
    )
  )
  WHERE species_label IS NOT NULL;

COMMENT ON INDEX public.comments_une_espece_par_personne IS
  'NG-049 : une personne ne propose une meme espece qu''une fois par publication. '
  'Nom normalise (minuscules, espaces internes ecrases) pour que "Buse variable" '
  'et "buse   VARIABLE" comptent pour la meme espece.';
