-- NG-055 (suite) : affinage des choix a la publication (retours users FB-004).
-- 1) Decoupe de l'habitat aquatique trop large : on ajoute 'lake_pond' (lac et
--    etang) et 'wetland_marsh' (marais et zone humide). 'river' existait deja
--    (jamais utilise, 0 post) et est reutilise cote UI pour "Riviere et cours
--    d'eau". 'lake_wetland' (9 posts existants) est CONSERVE pour ne pas casser
--    l'affichage des anciens posts (juste retire du selecteur cote front).
-- 2) Meteo : ajout de 'foggy' (brumeux), condition courante manquante.
-- Non-cassant : on ne fait qu'elargir les valeurs autorisees. Format 14 chiffres.

alter table public.posts drop constraint if exists posts_habitat_check;
alter table public.posts add constraint posts_habitat_check check (
  (habitat)::text = any (
    (array[
      'forest','park_garden','prairie_heath','urban','river','lake_wetland',
      'mountain','sea_coast','rural_agricultural','care_center',
      'lake_pond','wetland_marsh'
    ])::text[]
  )
);

alter table public.posts drop constraint if exists posts_weather_check;
alter table public.posts add constraint posts_weather_check check (
  (weather)::text = any (
    (array['sunny','cloudy','rainy','windy','snowy','foggy'])::text[]
  )
);
