-- seed-dev-testdata.sql
-- Donnees de TEST (fictives) pour le projet DEV uniquement : 4 comptes fictifs +
-- ~12 posts references sur de vraies especes seedees + interactions sociales.
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

-- 12 posts avec de vraies especes seedees (repartis sur les 4 comptes)
insert into public.posts (id, user_id, type, status, visibility, description, encounter_date, species_name, scientific_name, taxonomic_group, taxonomy_node_id, identification_status, city, region, country, latitude, longitude, published_at, created_at)
select gen_random_uuid(),
  (array['a1111111-1111-1111-1111-111111111111','a2222222-2222-2222-2222-222222222222','a3333333-3333-3333-3333-333333333333','a4444444-4444-4444-4444-444444444444']::uuid[])[1 + ((t.rn - 1) % 4)],
  'nature_encounter','published','public',
  'Rencontre avec ' || t.common_name_fr || ' aujourd''hui, superbe observation ! (donnee de test)',
  now() - (t.rn || ' hours')::interval,
  t.common_name_fr, t.scientific_name,
  case t.class when 'Aves' then 'birds' when 'Mammalia' then 'mammals' when 'Insecta' then 'insects' when 'Amphibia' then 'amphibians' when 'Reptilia' then 'reptiles' when 'Arachnida' then 'arachnids' else null end,
  t.id, 'identified', 'Montreal','Quebec','CA',
  45.5 + (t.rn::numeric/100), -73.6 - (t.rn::numeric/100),
  now() - (t.rn || ' hours')::interval, now() - (t.rn || ' hours')::interval
from (
  select id, common_name_fr, scientific_name, class,
         row_number() over (order by popularity desc nulls last, id) as rn
  from public.taxonomy_nodes
  where common_name_fr is not null and rank='species'
  order by popularity desc nulls last, id limit 12
) t;

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
