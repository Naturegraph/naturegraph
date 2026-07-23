-- NG-049 : une meme espece ne se propose qu'UNE fois par personne et par publication
-- =============================================================================
-- ⚠️ NON APPLIQUEE. Ecrite le 2026-07-22, en attente du feu vert de Nicolas
-- pour toucher la base (consigne explicite : rien en prod a ce stade).
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
-- collaborative. La garantie doit donc etre posee par la base.
--
-- CLE D'UNICITE. On prend l'identifiant du referentiel quand il existe, et
-- seulement a defaut le nom normalise : une espece peut changer de libelle,
-- seul l'identifiant la suit de facon fiable. `lower(btrim(...))` evite que
-- "Buse variable" et "buse  variable" comptent pour deux especes distinctes.
--
-- L'index est PARTIEL (`WHERE species_label IS NOT NULL`) : les echanges
-- ordinaires, qui sont la majorite, ne portent pas d'espece et n'ont aucune
-- raison d'etre contraints.
-- =============================================================================

-- Verification prealable a lancer AVANT d'appliquer : doit renvoyer 0 ligne,
-- sinon la creation de l'index echouera sur les doublons existants.
--
--   SELECT post_id, user_id,
--          COALESCE(taxonomy_node_id::text, lower(btrim(species_label))) AS espece,
--          count(*)
--   FROM public.comments
--   WHERE species_label IS NOT NULL
--   GROUP BY 1, 2, 3
--   HAVING count(*) > 1;

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
