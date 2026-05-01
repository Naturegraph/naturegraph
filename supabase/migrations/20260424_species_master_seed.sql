-- ============================================================
-- Naturegraph — Seed species_master + taxref_cache (MVP photo v4)
-- ============================================================
--
-- Objectif : permettre au champ media.species_id (FK species_master)
-- de pointer vers une vraie ligne quand l'utilisateur tague une espèce
-- depuis le carnet de l'étape 2. Les cd_nom utilisés ici correspondent
-- aux 22 espèces du mock TAXREF (src/constants/taxrefSpecies.ts) — c'est
-- le même set que celui proposé dans l'autocomplétion du formulaire.
--
-- Conservation_status :
--   · LC = Least Concern (préoccupation mineure)
--   · NT = Near Threatened (quasi menacée)
--   · VU = Vulnerable    → déclenche le trigger auto_hide_sensitive_location
--   · EN = Endangered    → idem
--   · CR = Critically Endangered → idem
--
-- Quelques espèces sensibles sont déclarées NT/VU pour pouvoir tester
-- le floutage automatique des coordonnées GPS (PRD v4 — P3 Protégée).
--
-- Idempotent : ON CONFLICT DO NOTHING sur taxref_cache, et UPDATE-friendly
-- sur species_master via une clé d'unicité (taxref_id).
--
-- À appliquer sur : naturegraph-dev (puis naturegraph-prod après UAT)
-- ============================================================

-- ─── Contrainte unique sur species_master.taxref_id ─────────────
-- Pré-requis pour les UPSERT (ON CONFLICT taxref_id) ci-dessous.
-- On utilise une contrainte UNIQUE pleine (et non un index partiel) parce
-- que ON CONFLICT ne sait pas inférer un index partiel. Idempotent via
-- bloc DO si la contrainte existe déjà.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'species_master_taxref_id_key'
      AND conrelid = 'public.species_master'::regclass
  ) THEN
    ALTER TABLE public.species_master
      ADD CONSTRAINT species_master_taxref_id_key UNIQUE (taxref_id);
  END IF;
END $$;

-- ─── Seed taxref_cache ────────────────────────────────────────

INSERT INTO public.taxref_cache
  (cd_nom, cd_ref, scientific_name, common_name_fr, "group", conservation_status, taxref_version, expires_at)
VALUES
  -- Oiseaux
  ('4001',  '4001',  'Parus major',           'Mésange charbonnière',     'Oiseaux', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('3586',  '3586',  'Hirundo rustica',       'Hirondelle rustique',      'Oiseaux', 'NT', '17.0', NOW() + INTERVAL '1 year'),
  ('3248',  '3248',  'Buteo buteo',           'Buse variable',            'Oiseaux', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('3562',  '3562',  'Erithacus rubecula',    'Rougegorge familier',      'Oiseaux', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('3861',  '3861',  'Cygnus olor',           'Cygne tuberculé',          'Oiseaux', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('3664',  '3664',  'Alcedo atthis',         'Martin-pêcheur d''Europe', 'Oiseaux', 'VU', '17.0', NOW() + INTERVAL '1 year'),

  -- Mammifères
  ('60612', '60612', 'Vulpes vulpes',         'Renard roux',              'Mammifères', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('100376','100376','Erinaceus europaeus',   'Hérisson d''Europe',       'Mammifères', 'NT', '17.0', NOW() + INTERVAL '1 year'),
  ('4831',  '4831',  'Sciurus vulgaris',      'Écureuil roux',            'Mammifères', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('60485', '60485', 'Meles meles',           'Blaireau européen',        'Mammifères', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('7021',  '7021',  'Capreolus capreolus',   'Chevreuil européen',       'Mammifères', 'LC', '17.0', NOW() + INTERVAL '1 year'),

  -- Amphibiens
  ('290',   '290',   'Rana temporaria',       'Grenouille rousse',        'Amphibiens', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('4878',  '4878',  'Salamandra salamandra', 'Salamandre tachetée',      'Amphibiens', 'LC', '17.0', NOW() + INTERVAL '1 year'),

  -- Reptiles
  ('84913', '84913', 'Lacerta bilineata',     'Lézard vert occidental',   'Reptiles', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('83791', '83791', 'Natrix natrix',         'Couleuvre à collier',      'Reptiles', 'LC', '17.0', NOW() + INTERVAL '1 year'),

  -- Insectes (Lucane = NT en France métropolitaine — protégé)
  ('236193','236193','Coccinella septempunctata','Coccinelle à sept points','Insectes', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('236074','236074','Libellula fulva',       'Libellule fauve',          'Insectes', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('236551','236551','Lucanus cervus',        'Lucane cerf-volant',       'Insectes', 'NT', '17.0', NOW() + INTERVAL '1 year'),

  -- Plantes (mappées sur "other" côté species_master — la table taxref garde "Plantes")
  ('65474', '65474', 'Taraxacum officinale',  'Pissenlit officinal',      'Plantes', 'LC', '17.0', NOW() + INTERVAL '1 year'),
  ('25637', '25637', 'Quercus robur',         'Chêne pédonculé',          'Plantes', 'LC', '17.0', NOW() + INTERVAL '1 year')
ON CONFLICT (cd_nom) DO UPDATE
  SET conservation_status = EXCLUDED.conservation_status,
      common_name_fr      = EXCLUDED.common_name_fr,
      scientific_name     = EXCLUDED.scientific_name,
      cached_at           = NOW();

-- ─── Seed species_master ──────────────────────────────────────
-- Mapping taxonomic_group :
--   · birds, mammals, insects, amphibians, reptiles → groupe direct
--   · plants → 'other' (CHECK constraint species_master ne liste pas plants)

INSERT INTO public.species_master
  (taxref_id, common_name_fr, scientific_name, taxonomic_group, source, is_active)
VALUES
  ('4001',  'Mésange charbonnière',     'Parus major',                'birds',      'taxref', TRUE),
  ('3586',  'Hirondelle rustique',      'Hirundo rustica',            'birds',      'taxref', TRUE),
  ('3248',  'Buse variable',            'Buteo buteo',                'birds',      'taxref', TRUE),
  ('3562',  'Rougegorge familier',      'Erithacus rubecula',         'birds',      'taxref', TRUE),
  ('3861',  'Cygne tuberculé',          'Cygnus olor',                'birds',      'taxref', TRUE),
  ('3664',  'Martin-pêcheur d''Europe', 'Alcedo atthis',              'birds',      'taxref', TRUE),
  ('60612', 'Renard roux',              'Vulpes vulpes',              'mammals',    'taxref', TRUE),
  ('100376','Hérisson d''Europe',       'Erinaceus europaeus',        'mammals',    'taxref', TRUE),
  ('4831',  'Écureuil roux',            'Sciurus vulgaris',           'mammals',    'taxref', TRUE),
  ('60485', 'Blaireau européen',        'Meles meles',                'mammals',    'taxref', TRUE),
  ('7021',  'Chevreuil européen',       'Capreolus capreolus',        'mammals',    'taxref', TRUE),
  ('290',   'Grenouille rousse',        'Rana temporaria',            'amphibians', 'taxref', TRUE),
  ('4878',  'Salamandre tachetée',      'Salamandra salamandra',      'amphibians', 'taxref', TRUE),
  ('84913', 'Lézard vert occidental',   'Lacerta bilineata',          'reptiles',   'taxref', TRUE),
  ('83791', 'Couleuvre à collier',      'Natrix natrix',              'reptiles',   'taxref', TRUE),
  ('236193','Coccinelle à sept points', 'Coccinella septempunctata',  'insects',    'taxref', TRUE),
  ('236074','Libellule fauve',          'Libellula fulva',            'insects',    'taxref', TRUE),
  ('236551','Lucane cerf-volant',       'Lucanus cervus',             'insects',    'taxref', TRUE),
  ('65474', 'Pissenlit officinal',      'Taraxacum officinale',       'other',      'taxref', TRUE),
  ('25637', 'Chêne pédonculé',          'Quercus robur',              'other',      'taxref', TRUE)
ON CONFLICT (taxref_id) DO UPDATE
  SET common_name_fr   = EXCLUDED.common_name_fr,
      scientific_name  = EXCLUDED.scientific_name,
      taxonomic_group  = EXCLUDED.taxonomic_group,
      is_active        = TRUE,
      updated_at       = NOW();

-- ─── Vérification (log informatif uniquement) ─────────────────
DO $$
DECLARE
  v_taxref INT;
  v_master INT;
BEGIN
  SELECT COUNT(*) INTO v_taxref FROM public.taxref_cache;
  SELECT COUNT(*) INTO v_master FROM public.species_master WHERE is_active = TRUE;
  RAISE NOTICE 'species seed terminé : taxref_cache=% species_master=%', v_taxref, v_master;
END $$;
