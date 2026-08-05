-- NG-055 : nouveaux types d'habitat (retours utilisateurs FB-004).
-- Ajoute 'rural_agricultural' (zone rurale/agricole) et 'care_center' (centre de
-- soins : animal sauvage blesse en rehabilitation avant relacher) a la contrainte
-- CHECK de posts.habitat. Zoo/parc animalier volontairement EXCLU (Naturegraph =
-- animaux sauvages uniquement). Non-cassant : on ne fait qu'elargir les valeurs
-- autorisees, aucune ligne existante ne viole la nouvelle contrainte.
-- NB convention : format YYYYMMDDHHMMSS (versions uniques, cf NG-059).

alter table public.posts drop constraint if exists posts_habitat_check;

alter table public.posts add constraint posts_habitat_check check (
  (habitat)::text = any (
    (array[
      'forest',
      'park_garden',
      'prairie_heath',
      'urban',
      'river',
      'lake_wetland',
      'mountain',
      'sea_coast',
      'rural_agricultural',
      'care_center'
    ])::text[]
  )
);
