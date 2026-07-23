-- NG-049 : suggestion d'espece attachee a un echange
-- =============================================================================
-- APPLIQUEE sur naturegraph-prod le 2026-07-23 (version 20260723030042).
--
-- Demande Nicolas 2026-07-22 : "Proposer une espece" doit chercher dans NOTRE
-- base et porter un niveau de confiance, pas se contenter de texte libre.
--
-- POURQUOI SUR `comments` ET NON DANS `identification_proposals`.
-- La table `identification_proposals` existe deja mais modelise un objet
-- separe, avec ses propres votes. Ici la suggestion EST un message du fil :
-- elle se lit, se commente et recoit des reponses comme les autres. La
-- rattacher a l'echange evite de tenir deux fils de discussion paralleles sur
-- la meme publication, ce qui serait incomprehensible a la lecture.
-- `identification_proposals` reste intacte, rien n'est retire.
-- =============================================================================

ALTER TABLE public.comments
  -- Nom affiche, dans la langue du lecteur au moment de la suggestion. Stocke
  -- en clair (et non seulement via la FK) pour que le fil reste lisible meme si
  -- le taxon est renomme ou retire du referentiel plus tard.
  ADD COLUMN IF NOT EXISTS species_label text,
  ADD COLUMN IF NOT EXISTS species_scientific text,
  -- Lien vers le referentiel. NULLABLE et ON DELETE SET NULL : la disparition
  -- d'un noeud de taxonomie ne doit jamais faire disparaitre un message.
  ADD COLUMN IF NOT EXISTS taxonomy_node_id uuid
    REFERENCES public.taxonomy_nodes(id) ON DELETE SET NULL,
  -- 1 = pas sur, 2 = assez sur, 3 = tres sur, 4 = certain.
  ADD COLUMN IF NOT EXISTS confidence smallint;

-- Un entier libre laisserait passer 0 ou 12 et rendrait l'affichage impossible.
ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_confidence_valide;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_confidence_valide
  CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 4);

-- Une suggestion sans espece n'a pas de sens, et une espece sans niveau de
-- confiance non plus : les deux champs vont ensemble ou aucun.
ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_suggestion_complete;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_suggestion_complete
  CHECK (
    (species_label IS NULL AND confidence IS NULL)
    OR (btrim(species_label) <> '' AND confidence IS NOT NULL)
  );

-- Retrouver toutes les suggestions d'une publication sans balayer le fil.
CREATE INDEX IF NOT EXISTS comments_suggestion_idx
  ON public.comments (post_id)
  WHERE species_label IS NOT NULL;
