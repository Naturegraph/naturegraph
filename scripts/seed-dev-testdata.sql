-- seed-dev-testdata.sql
-- Donnees de TEST (fictives) pour le projet DEV uniquement : 4 comptes fictifs +
-- 18 posts VARIES (rencontres + instants, toutes combinaisons avec/sans titre,
-- description, espece, habitat, meteo, phenomene, photo) + photos data-URI +
-- interactions sociales. Alimente aussi les Tendances (especes repetees avec photo).
-- =============================================================================
-- PREREQUIS : le dev doit avoir ete rebuild (run-dev-rebuild.mjs) ET seede en
-- donnees de reference (copy-refdata-prod-to-dev.mjs : taxonomy_nodes non vide).
--
-- A n'appliquer QUE sur le DEV (nkgdgxwejqqnqmwqwegy). JAMAIS sur la prod.
-- Idempotent : nettoie ses propres comptes/posts avant de reinserer.
-- Application : via le MCP supabase-dev, ou psql sur la connexion dev.
-- =============================================================================

-- Nettoyage (idempotent)
delete from auth.users where id in ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000ff');
delete from public.posts   where user_id in ('a1111111-1111-1111-1111-111111111111','a2222222-2222-2222-2222-222222222222','a3333333-3333-3333-3333-333333333333','a4444444-4444-4444-4444-444444444444');
delete from public.follows where follower_id in ('a1111111-1111-1111-1111-111111111111','a2222222-2222-2222-2222-222222222222','a3333333-3333-3333-3333-333333333333','a4444444-4444-4444-4444-444444444444');

-- 4 comptes de test (le trigger on_auth_user_created cree les profils).
-- NB : prefixes d'UUID DISTINCTS obligatoires (le username auto derive des 8
-- premiers caracteres de l'UUID -> doit rester unique).
-- IMPORTANT (piege decouvert 2026-08-20) : GoTrue exige que les colonnes token
-- soient des chaines VIDES (pas NULL), sinon /auth/v1/otp renvoie 500
-- "Database error finding user" (scan Go d'un NULL sur un champ string). D'ou les
-- '' explicites ci-dessous. ET il faut une ligne auth.identities par compte
-- (creee plus bas), sinon meme erreur.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token) values
 ('a1111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','flore@dev.local',now(),now(),now(),'{"provider":"email"}'::jsonb,'{}'::jsonb,'','','','','','','',''),
 ('a2222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','marc@dev.local',now(),now(),now(),'{"provider":"email"}'::jsonb,'{}'::jsonb,'','','','','','','',''),
 ('a3333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','julie@dev.local',now(),now(),now(),'{"provider":"email"}'::jsonb,'{}'::jsonb,'','','','','','','',''),
 ('a4444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sam@dev.local',now(),now(),now(),'{"provider":"email"}'::jsonb,'{}'::jsonb,'','','','','','','','')
on conflict (id) do nothing;

-- Identites GoTrue (provider email) : OBLIGATOIRE pour que la connexion OTP marche.
-- Sans identite, /auth/v1/otp -> 500 "Database error finding user".
insert into auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, 'email', u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
from auth.users u
where u.email in ('flore@dev.local','marc@dev.local','julie@dev.local','sam@dev.local')
  and not exists (select 1 from auth.identities i where i.user_id = u.id);

-- Onboarding des profils
update public.profiles set username='flore_bota',   first_name='Flore', last_name='Demo', bio='Botanique & jardins (compte de test dev).',   interests=array['plants','insects'],    is_public=true, city='Montreal',   region='Quebec', country='CA' where id='a1111111-1111-1111-1111-111111111111';
update public.profiles set username='marc_ornitho', first_name='Marc',  last_name='Demo', bio='Oiseaux du Quebec (compte de test dev).',      interests=array['birds'],               is_public=true, city='Quebec',     region='Quebec', country='CA' where id='a2222222-2222-2222-2222-222222222222';
update public.profiles set username='julie_macro',  first_name='Julie', last_name='Demo', bio='Macro & insectes (compte de test dev).',      interests=array['insects','arachnids'], is_public=true, city='Lyon',       region='ARA',    country='FR' where id='a3333333-3333-3333-3333-333333333333';
update public.profiles set username='sam_nature',   first_name='Sam',   last_name='Demo', bio='Generaliste nature (compte de test dev).',    interests=array['mammals','birds'],     is_public=true, city='Sherbrooke', region='Quebec', country='CA' where id='a4444444-4444-4444-4444-444444444444';

-- Nettoyage explicite des medias de test (le delete des posts cascade normalement,
-- mais on est defensif : on repart d'un etat media propre pour ces 4 comptes).
delete from public.media where user_id in ('a1111111-1111-1111-1111-111111111111','a2222222-2222-2222-2222-222222222222','a3333333-3333-3333-3333-333333333333','a4444444-4444-4444-4444-444444444444');

-- 18 posts VARIES : rencontres + instants nature, croisant toutes les combinaisons
-- (avec/sans titre, avec/sans description, avec/sans espece, avec/sans habitat/meteo/
-- moment/phenomene, avec/sans photo). But : exercer TOUS les etats de rendu du feed
-- (chips espece, rangee meta, formats 16:9 / portrait / carre, cas "espece non
-- determinee", posts minimalistes) et alimenter les Tendances (regle NG-032 : une
-- espece n'apparait dans les tendances que si >= 1 de ses obs a une photo). D'ou des
-- especes repetees AVEC photo (Canard colvert x3, Bernache x2) pour que la section
-- ne soit pas vide en dev.
-- Ids fixes (prefixe b0000000...) pour rattacher les medias de facon deterministe.
insert into public.posts
 (id, user_id, type, status, visibility, title, description, encounter_date,
  species_name, scientific_name, taxonomic_group, taxonomy_node_id, identification_status,
  habitat, weather, time_of_day, phenomenon, individuals_count, display_format,
  city, region, country, latitude, longitude, location_hidden, published_at, created_at)
values
 -- 01 Rencontre COMPLETE + photo (colvert #1)
 ('b0000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','nature_encounter','published','public',
  'Colvert au petit matin','Un canard colvert male superbe sur l''etang, plumage nuptial eclatant.',now() - interval '2 hours',
  'Canard colvert','Anas platyrhynchos','birds','bf179817-c0e2-4451-a660-9fd6d1443a32','identified',
  'lake_pond','sunny','morning',null,1,'16:9','Montreal','Quebec','CA',45.51,-73.61,false,now() - interval '2 hours',now() - interval '2 hours'),
 -- 02 Rencontre SANS titre + photo portrait (colvert #2)
 ('b0000000-0000-0000-0000-000000000002','a2222222-2222-2222-2222-222222222222','nature_encounter','published','public',
  null,'Colvert apercu le long de la riviere pendant la balade.',now() - interval '5 hours',
  'Canard colvert','Anas platyrhynchos','birds','bf179817-c0e2-4451-a660-9fd6d1443a32','identified',
  'river','cloudy',null,null,2,'portrait','Quebec','Quebec','CA',46.81,-71.21,false,now() - interval '5 hours',now() - interval '5 hours'),
 -- 03 Rencontre SANS titre NI description + photo carree (colvert #3)
 ('b0000000-0000-0000-0000-000000000003','a4444444-4444-4444-4444-444444444444','nature_encounter','published','public',
  null,'',now() - interval '8 hours',
  'Canard colvert','Anas platyrhynchos','birds','bf179817-c0e2-4451-a660-9fd6d1443a32','identified',
  null,null,null,null,1,'1:1','Sherbrooke','Quebec','CA',45.40,-71.89,false,now() - interval '8 hours',now() - interval '8 hours'),
 -- 04 Rencontre COMPLETE + photo (bernache #1, groupe)
 ('b0000000-0000-0000-0000-000000000004','a2222222-2222-2222-2222-222222222222','nature_encounter','published','public',
  'Famille de bernaches','Grand groupe de bernaches du Canada au bord du lac, tres bruyantes.',now() - interval '11 hours',
  'Bernache du Canada','Branta canadensis','birds','39b78935-566d-4680-b710-dd63daf59290','identified',
  'lake_wetland','cloudy','afternoon',null,12,'16:9','Quebec','Quebec','CA',46.82,-71.22,false,now() - interval '11 hours',now() - interval '11 hours'),
 -- 05 Rencontre SANS photo (bernache #2 : espece deja dotee d'une photo -> compte pour la tendance)
 ('b0000000-0000-0000-0000-000000000005','a2222222-2222-2222-2222-222222222222','nature_encounter','published','public',
  null,'Encore des bernaches, cette fois sans photo.',now() - interval '14 hours',
  'Bernache du Canada','Branta canadensis','birds','39b78935-566d-4680-b710-dd63daf59290','identified',
  'lake_wetland','windy',null,null,6,'16:9','Quebec','Quebec','CA',46.80,-71.20,false,now() - interval '14 hours',now() - interval '14 hours'),
 -- 06 Rencontre COMPLETE + photo (insecte)
 ('b0000000-0000-0000-0000-000000000006','a3333333-3333-3333-3333-333333333333','nature_encounter','published','public',
  'Monarque sur asclepiade','Papillon monarque en train de butiner, pleine periode de migration.',now() - interval '20 hours',
  'Monarque','Danaus plexippus','insects','94b8c78c-7194-4b67-be82-762a5a93551e','identified',
  'park_garden','sunny','afternoon',null,1,'16:9','Lyon','ARA','FR',45.76,4.83,false,now() - interval '20 hours',now() - interval '20 hours'),
 -- 07 Rencontre + photo portrait (mammifere)
 ('b0000000-0000-0000-0000-000000000007','a4444444-4444-4444-4444-444444444444','nature_encounter','published','public',
  'Ecureuil gris effronte','Un ecureuil gris est venu tout pres, curieux et pas farouche du tout.',now() - interval '26 hours',
  'Ecureuil gris','Sciurus carolinensis','mammals','9b928b7d-79ac-4f73-b09c-d518c175b955','identified',
  'urban','sunny','morning',null,1,'portrait','Sherbrooke','Quebec','CA',45.41,-71.90,false,now() - interval '26 hours',now() - interval '26 hours'),
 -- 08 Rencontre COMPLETE SANS photo (habitat + meteo + moment renseignes)
 ('b0000000-0000-0000-0000-000000000008','a1111111-1111-1111-1111-111111111111','nature_encounter','published','public',
  'Grand heron immobile','Grand heron a l''affut dans les roseaux, une patience incroyable.',now() - interval '30 hours',
  'Grand Heron','Ardea herodias','birds','850f12fa-0b36-470a-ad60-0213d71e5276','identified',
  'wetland_marsh','foggy','morning',null,1,'16:9','Montreal','Quebec','CA',45.52,-73.62,false,now() - interval '30 hours',now() - interval '30 hours'),
 -- 09 Rencontre SANS titre NI photo (juste espece + courte description)
 ('b0000000-0000-0000-0000-000000000009','a2222222-2222-2222-2222-222222222222','nature_encounter','published','public',
  null,'Merle d''Amerique entendu avant d''etre vu, joli chant.',now() - interval '34 hours',
  'Merle d''Amerique','Turdus migratorius','birds','133bd85a-04b1-4615-91a5-47c3ced7111d','identified',
  'park_garden',null,null,null,1,'16:9','Quebec','Quebec','CA',46.83,-71.23,false,now() - interval '34 hours',now() - interval '34 hours'),
 -- 10 Rencontre + photo carree (reptile)
 ('b0000000-0000-0000-0000-00000000000a','a3333333-3333-3333-3333-333333333333','nature_encounter','published','public',
  'Tortue peinte au soleil','Tortue peinte en train de se chauffer sur un tronc au milieu de l''etang.',now() - interval '40 hours',
  'Tortue peinte','Chrysemys picta','reptiles','4beaa958-d05c-4944-9ec3-0d3d066c0e1c','identified',
  'lake_pond','sunny','afternoon',null,1,'1:1','Lyon','ARA','FR',45.75,4.84,false,now() - interval '40 hours',now() - interval '40 hours'),
 -- 11 Rencontre SANS espece (espece non determinee -> chip "a identifier"), sans photo
 ('b0000000-0000-0000-0000-00000000000b','a4444444-4444-4444-4444-444444444444','nature_encounter','published','public',
  'Quelque chose dans les fourres','Silhouette rapide apercue, je n''ai pas reussi a identifier l''espece.',now() - interval '46 hours',
  null,null,null,null,'pending',
  'forest','cloudy',null,null,1,'16:9','Sherbrooke','Quebec','CA',45.39,-71.88,false,now() - interval '46 hours',now() - interval '46 hours'),
 -- 12 Rencontre MINIMALE (sans titre, sans espece, sans habitat, sans photo)
 ('b0000000-0000-0000-0000-00000000000c','a1111111-1111-1111-1111-111111111111','nature_encounter','published','public',
  null,'Petite sortie nature, rien de precis a signaler mais c''etait beau.',now() - interval '52 hours',
  null,null,null,null,'pending',
  null,null,null,null,null,'16:9','Montreal','Quebec','CA',45.53,-73.63,false,now() - interval '52 hours',now() - interval '52 hours'),
 -- 13 Instant nature COMPLET sans espece ni photo (avec phenomene)
 ('b0000000-0000-0000-0000-00000000000d','a3333333-3333-3333-3333-333333333333','nature_instant','published','public',
  'Passage d''oies','Un grand V d''oies traverse le ciel, plein spectacle de migration.',now() - interval '3 hours',
  null,null,null,null,'pending',
  null,null,'evening','Migration',null,'16:9','Lyon','ARA','FR',45.77,4.85,false,now() - interval '3 hours',now() - interval '3 hours'),
 -- 14 Instant nature + photo, sans espece (ambiance)
 ('b0000000-0000-0000-0000-00000000000e','a4444444-4444-4444-4444-444444444444','nature_instant','published','public',
  'Brume sur le lac','Lever de soleil et brume epaisse sur le lac, ambiance irreelle.',now() - interval '6 hours',
  null,null,null,null,'pending',
  'lake_pond','foggy','morning','Brume matinale',null,'16:9','Sherbrooke','Quebec','CA',45.42,-71.91,false,now() - interval '6 hours',now() - interval '6 hours'),
 -- 15 Instant nature SANS description (titre + phenomene seulement), sans photo
 ('b0000000-0000-0000-0000-00000000000f','a1111111-1111-1111-1111-111111111111','nature_instant','published','public',
  'Rosee','',now() - interval '9 hours',
  null,null,null,null,'pending',
  'prairie_heath',null,'morning','Rosee du matin',null,'portrait','Montreal','Quebec','CA',45.54,-73.64,false,now() - interval '9 hours',now() - interval '9 hours'),
 -- 16 Instant nature AVEC espece + photo (oiseau) -> compte aussi pour les tendances
 ('b0000000-0000-0000-0000-000000000010','a2222222-2222-2222-2222-222222222222','nature_instant','published','public',
  'Chant du carouge','Carouge a epaulettes qui chante a tue-tete au bord de l''eau.',now() - interval '12 hours',
  'Carouge a epaulettes','Agelaius phoeniceus','birds','ba5fa7bd-4cd4-4c53-aa19-42bee8b3c6c4','identified',
  'wetland_marsh','sunny','morning','Chant territorial',1,'16:9','Quebec','Quebec','CA',46.84,-71.24,false,now() - interval '12 hours',now() - interval '12 hours'),
 -- 17 Instant nature MINIMAL (sans titre, sans espece, sans phenomene, sans photo)
 ('b0000000-0000-0000-0000-000000000011','a3333333-3333-3333-3333-333333333333','nature_instant','published','public',
  null,'Instant nature vite fait, juste pour le plaisir.',now() - interval '16 hours',
  null,null,null,null,'pending',
  null,null,null,null,null,'16:9','Lyon','ARA','FR',45.78,4.86,false,now() - interval '16 hours',now() - interval '16 hours'),
 -- 18 Instant nature (phenomene + meteo + moment), sans espece ni photo
 ('b0000000-0000-0000-0000-000000000012','a4444444-4444-4444-4444-444444444444','nature_instant','published','public',
  'Nuee d''insectes au couchant','Des milliers d''insectes dansent dans la lumiere du soir.',now() - interval '22 hours',
  null,null,null,null,'pending',
  'rural_agricultural','sunny','dusk','Essaim au crepuscule',null,'16:9','Sherbrooke','Quebec','CA',45.38,-71.87,false,now() - interval '22 hours',now() - interval '22 hours');

-- Photos de test : data URI SVG (aucune dependance reseau, rendu garanti, CSP-safe
-- car img-src autorise `data:`). Visiblement "test" -> jamais confondu avec du reel.
-- Rattachees aux posts 01,02,03,04,06,07,10,14,16 (dims/format varies pour couvrir
-- les 3 ratios). Le label reprend l'espece (ou le titre) pour se reperer a l'ecran.
-- SVG volontairement minimal : `media.url` est un varchar(500), le data-URI encode
-- en base64 doit tenir dessous (d'ou une seule ligne de texte, pas de fioritures).
insert into public.media
 (post_id, user_id, type, status, url, display_order, is_cover, role, format, orientation, alt, width, height, mime_type, license)
select p.id, p.user_id, 'photo', 'ready',
  'data:image/svg+xml;base64,' || encode(convert_to(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' || v.w || '" height="' || v.h || '">' ||
    '<rect width="100%" height="100%" fill="' || v.hex || '"/>' ||
    '<text x="50%" y="53%" font-size="52" fill="#fff" text-anchor="middle" font-family="sans-serif">' || coalesce(p.species_name, p.title, 'Instant nature') || '</text>' ||
    '</svg>', 'UTF8'), 'base64'),
  0, true, 'star', v.fmt, v.ori,
  coalesce(p.species_name, 'Observation nature') || ' (photo test dev)',
  v.w, v.h, 'image/svg+xml', 'cc0'
from public.posts p
join (values
  ('b0000000-0000-0000-0000-000000000001'::uuid, '#2E6F8E', 800, 600, 'landscape', 'horizontal'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, '#3B7A57', 600, 800, 'portrait',  'vertical'),
  ('b0000000-0000-0000-0000-000000000003'::uuid, '#25607A', 700, 700, 'square',    'square'),
  ('b0000000-0000-0000-0000-000000000004'::uuid, '#37637A', 800, 600, 'landscape', 'horizontal'),
  ('b0000000-0000-0000-0000-000000000006'::uuid, '#C77D2E', 800, 600, 'landscape', 'horizontal'),
  ('b0000000-0000-0000-0000-000000000007'::uuid, '#8A6D3B', 600, 800, 'portrait',  'vertical'),
  ('b0000000-0000-0000-0000-00000000000a'::uuid, '#4E7A51', 700, 700, 'square',    'square'),
  ('b0000000-0000-0000-0000-00000000000e'::uuid, '#5F5DD8', 800, 600, 'landscape', 'horizontal'),
  ('b0000000-0000-0000-0000-000000000010'::uuid, '#B5462E', 800, 600, 'landscape', 'horizontal')
) as v(pid, hex, w, h, fmt, ori) on v.pid = p.id;

-- Interactions sociales
insert into public.follows (follower_id, following_id) values
 ('a1111111-1111-1111-1111-111111111111','a2222222-2222-2222-2222-222222222222'),
 ('a1111111-1111-1111-1111-111111111111','a4444444-4444-4444-4444-444444444444'),
 ('a3333333-3333-3333-3333-333333333333','a2222222-2222-2222-2222-222222222222'),
 ('a4444444-4444-4444-4444-444444444444','a1111111-1111-1111-1111-111111111111')
on conflict do nothing;

insert into public.reactions (post_id, user_id, type)
select p.id, 'a3333333-3333-3333-3333-333333333333'::uuid, 'love' from public.posts p order by p.created_at desc limit 4
on conflict do nothing;

insert into public.comments (post_id, user_id, content, intention)
select p.id, 'a2222222-2222-2222-2222-222222222222'::uuid, 'Superbe rencontre, merci du partage !', 'reaction'
from public.posts p order by p.created_at desc limit 3;
