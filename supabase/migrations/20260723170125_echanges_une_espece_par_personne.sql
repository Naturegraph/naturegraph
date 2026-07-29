-- NG-049 : une meme espece ne se propose qu'UNE fois par personne et par publication
-- =============================================================================
-- APPLIQUEE sur naturegraph-prod le 2026-07-23 (version 20260723170125).
--
-- ATTENTION : la normalisation posee ici est INSUFFISANTE et corrigee par
-- `20260723170301_echanges_correctif_normalisation_espece`. Les deux fichiers
-- doivent etre passes dans l'ordre.
--
-- Regle Nicolas 2026-07-22 : "un user doit pouvoir partager une seule fois une
-- meme espece, je ne peux pas spam 5 fois buse variable".
--
-- POURQUOI EN BASE ET PAS SEULEMENT DANS L'INTERFACE.
-- Le blocage cote client est un confort : il evite de rediger un argumentaire
-- avant de se faire refuser. Mais deux onglets ouverts, un rechargement au
-- mauvais moment ou un appel direct a l'API le contournent. Cinq "Buse
-- variable" du meme compte donneraient l'illusion d'un consensus alors qu'une
-- seule personne parle, ce qui fausserait toute la lecture de l'identification
-- collaborative.
--
-- CLE D'UNICITE. On prend l'identifiant du referentiel quand il existe, et
-- seulement a defaut le nom normalise : une espece peut changer de libelle,
-- seul l'identifiant la suit de facon fiable.
--
-- L'index est PARTIEL (`WHERE species_label IS NOT NULL`) : les echanges
-- ordinaires, qui sont la majorite, ne portent pas d'espece et n'ont aucune
-- raison d'etre contraints.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS comments_une_espece_par_personne
  ON public.comments (
    post_id,
    user_id,
    (COALESCE(taxonomy_node_id::text, lower(btrim(species_label))))
  )
  WHERE species_label IS NOT NULL;

COMMENT ON INDEX public.comments_une_espece_par_personne IS
  'NG-049 : une personne ne propose une meme espece qu''une fois par publication. '
  'Sans cette contrainte, un seul compte pourrait simuler un consensus en repetant '
  'la meme suggestion.';
