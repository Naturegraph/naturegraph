-- ============================================================================
-- Migration : species_master seed v2 — GBIF + Wikidata Phase 1
-- ============================================================================
-- Date     : 2026-05-19
-- Auteur   : Nicolas + Claude (PRD_SPECIES_DATABASE.md)
--
-- Décision produit : abandon de TAXREF/INPN au profit de GBIF (CC0) +
-- Wikidata (CC0) pour la base de données espèces. Cf. PRD validé Nicolas
-- 2026-05-19.
--
-- Cette migration :
--   1. Dépendance FK : retire `species_master.taxref_id → taxref_cache.cd_nom`
--      (préparation du drop de taxref_cache)
--   2. Indexes pg_trgm sur common_name_fr / scientific_name / common_name_en
--   3. RLS lecture publique sur species_master (référentiel ouvert)
--   4. Update : 20 anciennes lignes `source = 'taxref'` → `source = 'gbif'`
--   5. UNIQUE constraint sur scientific_name (natural key Phase 1)
--   6. Seed ~190 espèces communes France + Québec (UPSERT idempotent)
--   7. DROP des tables legacy `taxref_cache` + `species_full`
--
-- L'extension à ~5 000 espèces (objectif Phase 1 finition) se fera via le
-- script `scripts/seed-species-from-gbif.ts` (T-03 du PRD) qui peut être
-- relancé à tout moment — UPSERT idempotent.
-- ============================================================================

BEGIN;

-- ── 0. Élargissement du CHECK constraint taxonomic_group ────────────────────
-- Phase 1 : on ajoute plants / fungi / fish / arachnids / mollusks
-- (auparavant limité à birds / mammals / insects / amphibians / reptiles / other).
-- Sinon les INSERT du seed ci-dessous échouent sur les plantes & co.

ALTER TABLE public.species_master
  DROP CONSTRAINT IF EXISTS species_master_taxonomic_group_check;

ALTER TABLE public.species_master
  ADD CONSTRAINT species_master_taxonomic_group_check
  CHECK (taxonomic_group IN (
    'birds', 'mammals', 'insects', 'amphibians', 'reptiles',
    'plants', 'fungi', 'fish', 'arachnids', 'mollusks', 'other'
  ));

-- ── 1. Dépendance FK : species_master → taxref_cache ────────────────────────

ALTER TABLE public.species_master
  DROP CONSTRAINT IF EXISTS species_master_taxref_id_fkey;

-- ── 2. Indexes pg_trgm (autocomplete + recherche tolérante fautes) ──────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_species_master_fr_trgm
  ON public.species_master USING gin (common_name_fr gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_species_master_sci_trgm
  ON public.species_master USING gin (scientific_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_species_master_en_trgm
  ON public.species_master USING gin (common_name_en gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_species_master_group_pop
  ON public.species_master (taxonomic_group, popularity DESC)
  WHERE is_active = TRUE;

-- ── 3. RLS lecture publique ─────────────────────────────────────────────────

ALTER TABLE public.species_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS species_master_public_read ON public.species_master;

CREATE POLICY species_master_public_read
  ON public.species_master FOR SELECT
  USING (is_active = TRUE);

-- ── 4. Migration source legacy ──────────────────────────────────────────────
-- Les 20 lignes existantes avaient source='taxref'. On normalise vers
-- 'gbif' pour s'aligner avec la nouvelle stratégie. Le script seed GBIF
-- (T-03) écrira 'gbif' pour les nouvelles entrées importées via API.

UPDATE public.species_master SET source = 'gbif' WHERE source = 'taxref';

-- ── 5. UNIQUE constraint sur scientific_name ────────────────────────────────
-- Natural key Phase 1. Permet l'ON CONFLICT du seed ci-dessous + évite les
-- doublons taxonomiques (un seul taxon = un seul nom scientifique).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'species_master_scientific_name_key' AND conrelid = 'public.species_master'::regclass
  ) THEN
    ALTER TABLE public.species_master
      ADD CONSTRAINT species_master_scientific_name_key UNIQUE (scientific_name);
  END IF;
END $$;

-- ── 6. Seed ~190 espèces communes France + Québec ───────────────────────────
-- Liste curée à la main par Nicolas pour bootstrap immédiat (Phase 1 socle).
-- Les noms vernaculaires sont en français standard (FR de France) avec
-- adaptations québécoises courantes quand applicable (ex: huard, orignal).
-- Le seed complet ~5 000 espèces se fera via scripts/seed-species-from-gbif.ts
-- (T-03 du PRD) qui peut être relancé à tout moment — UPSERT idempotent.

INSERT INTO public.species_master
  (scientific_name, common_name_fr, common_name_en, taxonomic_group, source, popularity, is_active)
VALUES
  -- ── Oiseaux ────────────────────────────────────────────────────────────
  ('Parus major', 'Mésange charbonnière', 'Great Tit', 'birds', 'gbif', 100, TRUE),
  ('Cyanistes caeruleus', 'Mésange bleue', 'Eurasian Blue Tit', 'birds', 'gbif', 95, TRUE),
  ('Periparus ater', 'Mésange noire', 'Coal Tit', 'birds', 'gbif', 70, TRUE),
  ('Poecile atricapillus', 'Mésange à tête noire', 'Black-capped Chickadee', 'birds', 'gbif', 95, TRUE),
  ('Hirundo rustica', 'Hirondelle rustique', 'Barn Swallow', 'birds', 'gbif', 90, TRUE),
  ('Buteo buteo', 'Buse variable', 'Common Buzzard', 'birds', 'gbif', 80, TRUE),
  ('Erithacus rubecula', 'Rougegorge familier', 'European Robin', 'birds', 'gbif', 90, TRUE),
  ('Cygnus olor', 'Cygne tuberculé', 'Mute Swan', 'birds', 'gbif', 75, TRUE),
  ('Alcedo atthis', 'Martin-pêcheur d''Europe', 'Common Kingfisher', 'birds', 'gbif', 70, TRUE),
  ('Dendrocopos major', 'Pic épeiche', 'Great Spotted Woodpecker', 'birds', 'gbif', 75, TRUE),
  ('Dryobates pubescens', 'Pic mineur', 'Downy Woodpecker', 'birds', 'gbif', 85, TRUE),
  ('Dryobates villosus', 'Pic chevelu', 'Hairy Woodpecker', 'birds', 'gbif', 80, TRUE),
  ('Turdus merula', 'Merle noir', 'Common Blackbird', 'birds', 'gbif', 95, TRUE),
  ('Turdus migratorius', 'Merle d''Amérique', 'American Robin', 'birds', 'gbif', 95, TRUE),
  ('Turdus philomelos', 'Grive musicienne', 'Song Thrush', 'birds', 'gbif', 70, TRUE),
  ('Fringilla coelebs', 'Pinson des arbres', 'Common Chaffinch', 'birds', 'gbif', 80, TRUE),
  ('Chloris chloris', 'Verdier d''Europe', 'European Greenfinch', 'birds', 'gbif', 65, TRUE),
  ('Carduelis carduelis', 'Chardonneret élégant', 'European Goldfinch', 'birds', 'gbif', 75, TRUE),
  ('Spinus tristis', 'Chardonneret jaune', 'American Goldfinch', 'birds', 'gbif', 85, TRUE),
  ('Haemorhous purpureus', 'Roselin pourpré', 'Purple Finch', 'birds', 'gbif', 70, TRUE),
  ('Asio otus', 'Hibou moyen-duc', 'Long-eared Owl', 'birds', 'gbif', 55, TRUE),
  ('Falco tinnunculus', 'Faucon crécerelle', 'Common Kestrel', 'birds', 'gbif', 75, TRUE),
  ('Sturnus vulgaris', 'Étourneau sansonnet', 'Common Starling', 'birds', 'gbif', 80, TRUE),
  ('Passer domesticus', 'Moineau domestique', 'House Sparrow', 'birds', 'gbif', 95, TRUE),
  ('Motacilla alba', 'Bergeronnette grise', 'White Wagtail', 'birds', 'gbif', 65, TRUE),
  ('Phoenicurus phoenicurus', 'Rouge-queue à front blanc', 'Common Redstart', 'birds', 'gbif', 55, TRUE),
  ('Columba palumbus', 'Pigeon ramier', 'Common Wood Pigeon', 'birds', 'gbif', 85, TRUE),
  ('Streptopelia decaocto', 'Tourterelle turque', 'Eurasian Collared Dove', 'birds', 'gbif', 75, TRUE),
  ('Corvus corone', 'Corneille noire', 'Carrion Crow', 'birds', 'gbif', 80, TRUE),
  ('Coloeus monedula', 'Choucas des tours', 'Western Jackdaw', 'birds', 'gbif', 65, TRUE),
  ('Pica pica', 'Pie bavarde', 'Eurasian Magpie', 'birds', 'gbif', 85, TRUE),
  ('Garrulus glandarius', 'Geai des chênes', 'Eurasian Jay', 'birds', 'gbif', 75, TRUE),
  ('Cyanocitta cristata', 'Geai bleu', 'Blue Jay', 'birds', 'gbif', 95, TRUE),
  ('Cuculus canorus', 'Coucou gris', 'Common Cuckoo', 'birds', 'gbif', 55, TRUE),
  ('Ardea cinerea', 'Héron cendré', 'Grey Heron', 'birds', 'gbif', 70, TRUE),
  ('Egretta garzetta', 'Aigrette garzette', 'Little Egret', 'birds', 'gbif', 60, TRUE),
  ('Anas platyrhynchos', 'Canard colvert', 'Mallard', 'birds', 'gbif', 90, TRUE),
  ('Cardinalis cardinalis', 'Cardinal rouge', 'Northern Cardinal', 'birds', 'gbif', 95, TRUE),
  ('Zonotrichia albicollis', 'Bruant à gorge blanche', 'White-throated Sparrow', 'birds', 'gbif', 80, TRUE),
  ('Melospiza melodia', 'Bruant chanteur', 'Song Sparrow', 'birds', 'gbif', 75, TRUE),
  ('Junco hyemalis', 'Junco ardoisé', 'Dark-eyed Junco', 'birds', 'gbif', 80, TRUE),
  ('Sitta carolinensis', 'Sittelle à poitrine blanche', 'White-breasted Nuthatch', 'birds', 'gbif', 75, TRUE),
  ('Sitta canadensis', 'Sittelle à poitrine rousse', 'Red-breasted Nuthatch', 'birds', 'gbif', 70, TRUE),
  ('Tyrannus tyrannus', 'Tyran tritri', 'Eastern Kingbird', 'birds', 'gbif', 60, TRUE),
  ('Agelaius phoeniceus', 'Carouge à épaulettes', 'Red-winged Blackbird', 'birds', 'gbif', 75, TRUE),
  ('Quiscalus quiscula', 'Quiscale bronzé', 'Common Grackle', 'birds', 'gbif', 75, TRUE),
  ('Larus argentatus', 'Goéland argenté', 'European Herring Gull', 'birds', 'gbif', 80, TRUE),
  ('Branta canadensis', 'Bernache du Canada', 'Canada Goose', 'birds', 'gbif', 95, TRUE),
  ('Gavia immer', 'Huard à collier', 'Common Loon', 'birds', 'gbif', 90, TRUE),
  ('Bubo virginianus', 'Grand-duc d''Amérique', 'Great Horned Owl', 'birds', 'gbif', 70, TRUE),
  ('Pandion haliaetus', 'Balbuzard pêcheur', 'Osprey', 'birds', 'gbif', 65, TRUE),

  -- ── Mammifères ─────────────────────────────────────────────────────────
  ('Vulpes vulpes', 'Renard roux', 'Red Fox', 'mammals', 'gbif', 95, TRUE),
  ('Erinaceus europaeus', 'Hérisson d''Europe', 'European Hedgehog', 'mammals', 'gbif', 85, TRUE),
  ('Sciurus vulgaris', 'Écureuil roux', 'Eurasian Red Squirrel', 'mammals', 'gbif', 90, TRUE),
  ('Sciurus carolinensis', 'Écureuil gris', 'Eastern Gray Squirrel', 'mammals', 'gbif', 90, TRUE),
  ('Tamias striatus', 'Tamia rayé', 'Eastern Chipmunk', 'mammals', 'gbif', 85, TRUE),
  ('Meles meles', 'Blaireau européen', 'European Badger', 'mammals', 'gbif', 65, TRUE),
  ('Capreolus capreolus', 'Chevreuil européen', 'Roe Deer', 'mammals', 'gbif', 85, TRUE),
  ('Sus scrofa', 'Sanglier', 'Wild Boar', 'mammals', 'gbif', 80, TRUE),
  ('Cervus elaphus', 'Cerf élaphe', 'Red Deer', 'mammals', 'gbif', 70, TRUE),
  ('Odocoileus virginianus', 'Cerf de Virginie', 'White-tailed Deer', 'mammals', 'gbif', 90, TRUE),
  ('Alces alces', 'Orignal', 'Moose', 'mammals', 'gbif', 85, TRUE),
  ('Rangifer tarandus', 'Caribou', 'Caribou', 'mammals', 'gbif', 75, TRUE),
  ('Oryctolagus cuniculus', 'Lapin de garenne', 'European Rabbit', 'mammals', 'gbif', 80, TRUE),
  ('Lepus europaeus', 'Lièvre d''Europe', 'European Hare', 'mammals', 'gbif', 65, TRUE),
  ('Apodemus sylvaticus', 'Mulot sylvestre', 'Wood Mouse', 'mammals', 'gbif', 50, TRUE),
  ('Microtus arvalis', 'Campagnol des champs', 'Common Vole', 'mammals', 'gbif', 45, TRUE),
  ('Mustela nivalis', 'Belette', 'Least Weasel', 'mammals', 'gbif', 50, TRUE),
  ('Mustela erminea', 'Hermine', 'Stoat', 'mammals', 'gbif', 60, TRUE),
  ('Martes martes', 'Martre des pins', 'European Pine Marten', 'mammals', 'gbif', 55, TRUE),
  ('Lutra lutra', 'Loutre d''Europe', 'European Otter', 'mammals', 'gbif', 65, TRUE),
  ('Castor fiber', 'Castor d''Eurasie', 'Eurasian Beaver', 'mammals', 'gbif', 60, TRUE),
  ('Castor canadensis', 'Castor du Canada', 'North American Beaver', 'mammals', 'gbif', 90, TRUE),
  ('Ursus americanus', 'Ours noir', 'American Black Bear', 'mammals', 'gbif', 90, TRUE),
  ('Procyon lotor', 'Raton laveur', 'Common Raccoon', 'mammals', 'gbif', 95, TRUE),
  ('Mephitis mephitis', 'Mouffette rayée', 'Striped Skunk', 'mammals', 'gbif', 80, TRUE),
  ('Marmota monax', 'Marmotte commune', 'Groundhog', 'mammals', 'gbif', 80, TRUE),
  ('Puma concolor', 'Couguar', 'Cougar', 'mammals', 'gbif', 60, TRUE),
  ('Canis lupus', 'Loup gris', 'Gray Wolf', 'mammals', 'gbif', 70, TRUE),
  ('Lynx canadensis', 'Lynx du Canada', 'Canada Lynx', 'mammals', 'gbif', 60, TRUE),
  ('Vulpes lagopus', 'Renard arctique', 'Arctic Fox', 'mammals', 'gbif', 50, TRUE),

  -- ── Insectes ───────────────────────────────────────────────────────────
  ('Coccinella septempunctata', 'Coccinelle à sept points', 'Seven-spot Ladybird', 'insects', 'gbif', 90, TRUE),
  ('Libellula fulva', 'Libellule fauve', 'Scarce Chaser', 'insects', 'gbif', 60, TRUE),
  ('Lucanus cervus', 'Lucane cerf-volant', 'European Stag Beetle', 'insects', 'gbif', 65, TRUE),
  ('Gonepteryx rhamni', 'Citron', 'Brimstone', 'insects', 'gbif', 70, TRUE),
  ('Vanessa atalanta', 'Vulcain', 'Red Admiral', 'insects', 'gbif', 75, TRUE),
  ('Aglais io', 'Paon-du-jour', 'European Peacock', 'insects', 'gbif', 85, TRUE),
  ('Aglais urticae', 'Petite tortue', 'Small Tortoiseshell', 'insects', 'gbif', 70, TRUE),
  ('Papilio machaon', 'Machaon', 'Old World Swallowtail', 'insects', 'gbif', 75, TRUE),
  ('Iphiclides podalirius', 'Flambé', 'Scarce Swallowtail', 'insects', 'gbif', 55, TRUE),
  ('Parnassius apollo', 'Apollon', 'Apollo', 'insects', 'gbif', 50, TRUE),
  ('Danaus plexippus', 'Monarque', 'Monarch Butterfly', 'insects', 'gbif', 90, TRUE),
  ('Melolontha melolontha', 'Hanneton commun', 'Common Cockchafer', 'insects', 'gbif', 60, TRUE),
  ('Bombus terrestris', 'Bourdon terrestre', 'Buff-tailed Bumblebee', 'insects', 'gbif', 85, TRUE),
  ('Apis mellifera', 'Abeille mellifère', 'Western Honey Bee', 'insects', 'gbif', 95, TRUE),
  ('Vespa crabro', 'Frelon européen', 'European Hornet', 'insects', 'gbif', 70, TRUE),
  ('Vespa velutina', 'Frelon asiatique', 'Asian Hornet', 'insects', 'gbif', 75, TRUE),
  ('Tettigonia viridissima', 'Sauterelle verte', 'Great Green Bush-cricket', 'insects', 'gbif', 60, TRUE),
  ('Schistocerca gregaria', 'Criquet pèlerin', 'Desert Locust', 'insects', 'gbif', 45, TRUE),
  ('Mantis religiosa', 'Mante religieuse', 'European Mantis', 'insects', 'gbif', 75, TRUE),
  ('Palomena prasina', 'Punaise verte', 'Green Shield Bug', 'insects', 'gbif', 55, TRUE),
  ('Calopteryx virgo', 'Calopteryx vierge', 'Beautiful Demoiselle', 'insects', 'gbif', 60, TRUE),
  ('Polyommatus icarus', 'Argus bleu', 'Common Blue', 'insects', 'gbif', 65, TRUE),
  ('Pieris brassicae', 'Piéride du chou', 'Large White', 'insects', 'gbif', 65, TRUE),
  ('Maniola jurtina', 'Myrtil', 'Meadow Brown', 'insects', 'gbif', 60, TRUE),
  ('Carabus auratus', 'Carabe doré', 'Golden Ground Beetle', 'insects', 'gbif', 50, TRUE),

  -- ── Amphibiens ─────────────────────────────────────────────────────────
  ('Rana temporaria', 'Grenouille rousse', 'Common Frog', 'amphibians', 'gbif', 80, TRUE),
  ('Salamandra salamandra', 'Salamandre tachetée', 'Fire Salamander', 'amphibians', 'gbif', 75, TRUE),
  ('Bufo bufo', 'Crapaud commun', 'Common Toad', 'amphibians', 'gbif', 80, TRUE),
  ('Lissotriton helveticus', 'Triton palmé', 'Palmate Newt', 'amphibians', 'gbif', 50, TRUE),
  ('Triturus cristatus', 'Triton crêté', 'Northern Crested Newt', 'amphibians', 'gbif', 50, TRUE),
  ('Hyla arborea', 'Rainette verte', 'European Tree Frog', 'amphibians', 'gbif', 65, TRUE),
  ('Pelophylax kl. esculentus', 'Grenouille verte', 'Edible Frog', 'amphibians', 'gbif', 70, TRUE),
  ('Alytes obstetricans', 'Crapaud accoucheur', 'Common Midwife Toad', 'amphibians', 'gbif', 45, TRUE),
  ('Lithobates catesbeianus', 'Ouaouaron', 'American Bullfrog', 'amphibians', 'gbif', 75, TRUE),
  ('Necturus maculosus', 'Necturus tacheté', 'Common Mudpuppy', 'amphibians', 'gbif', 45, TRUE),

  -- ── Reptiles ───────────────────────────────────────────────────────────
  ('Lacerta bilineata', 'Lézard vert occidental', 'Western Green Lizard', 'reptiles', 'gbif', 65, TRUE),
  ('Natrix natrix', 'Couleuvre à collier', 'Grass Snake', 'reptiles', 'gbif', 65, TRUE),
  ('Vipera aspis', 'Vipère aspic', 'Asp Viper', 'reptiles', 'gbif', 60, TRUE),
  ('Podarcis muralis', 'Lézard des murailles', 'Common Wall Lizard', 'reptiles', 'gbif', 75, TRUE),
  ('Lacerta agilis', 'Lézard agile', 'Sand Lizard', 'reptiles', 'gbif', 55, TRUE),
  ('Hierophis viridiflavus', 'Couleuvre verte et jaune', 'Western Whip Snake', 'reptiles', 'gbif', 50, TRUE),
  ('Anguis fragilis', 'Orvet fragile', 'Slow Worm', 'reptiles', 'gbif', 70, TRUE),
  ('Storeria occipitomaculata', 'Couleuvre à ventre rouge', 'Red-bellied Snake', 'reptiles', 'gbif', 50, TRUE),
  ('Chrysemys picta', 'Tortue peinte', 'Painted Turtle', 'reptiles', 'gbif', 70, TRUE),
  ('Chelydra serpentina', 'Tortue serpentine', 'Snapping Turtle', 'reptiles', 'gbif', 70, TRUE),

  -- ── Poissons ───────────────────────────────────────────────────────────
  ('Salmo trutta', 'Truite fario', 'Brown Trout', 'fish', 'gbif', 75, TRUE),
  ('Esox lucius', 'Brochet', 'Northern Pike', 'fish', 'gbif', 80, TRUE),
  ('Perca fluviatilis', 'Perche commune', 'European Perch', 'fish', 'gbif', 70, TRUE),
  ('Cyprinus carpio', 'Carpe commune', 'Common Carp', 'fish', 'gbif', 75, TRUE),
  ('Salmo salar', 'Saumon atlantique', 'Atlantic Salmon', 'fish', 'gbif', 75, TRUE),
  ('Thymallus thymallus', 'Ombre commun', 'Grayling', 'fish', 'gbif', 50, TRUE),
  ('Anguilla anguilla', 'Anguille européenne', 'European Eel', 'fish', 'gbif', 60, TRUE),
  ('Sander vitreus', 'Doré jaune', 'Walleye', 'fish', 'gbif', 80, TRUE),
  ('Micropterus salmoides', 'Achigan à grande bouche', 'Largemouth Bass', 'fish', 'gbif', 75, TRUE),
  ('Salvelinus namaycush', 'Touladi', 'Lake Trout', 'fish', 'gbif', 65, TRUE),

  -- ── Plantes ────────────────────────────────────────────────────────────
  ('Papaver rhoeas', 'Coquelicot', 'Common Poppy', 'plants', 'gbif', 85, TRUE),
  ('Taraxacum officinale', 'Pissenlit officinal', 'Common Dandelion', 'plants', 'gbif', 95, TRUE),
  ('Quercus robur', 'Chêne pédonculé', 'English Oak', 'plants', 'gbif', 85, TRUE),
  ('Quercus petraea', 'Chêne sessile', 'Sessile Oak', 'plants', 'gbif', 75, TRUE),
  ('Fagus sylvatica', 'Hêtre commun', 'European Beech', 'plants', 'gbif', 80, TRUE),
  ('Betula pendula', 'Bouleau verruqueux', 'Silver Birch', 'plants', 'gbif', 75, TRUE),
  ('Betula papyrifera', 'Bouleau à papier', 'Paper Birch', 'plants', 'gbif', 85, TRUE),
  ('Acer campestre', 'Érable champêtre', 'Field Maple', 'plants', 'gbif', 65, TRUE),
  ('Acer saccharum', 'Érable à sucre', 'Sugar Maple', 'plants', 'gbif', 95, TRUE),
  ('Acer rubrum', 'Érable rouge', 'Red Maple', 'plants', 'gbif', 90, TRUE),
  ('Abies balsamea', 'Sapin baumier', 'Balsam Fir', 'plants', 'gbif', 80, TRUE),
  ('Tilia cordata', 'Tilleul à petites feuilles', 'Small-leaved Lime', 'plants', 'gbif', 65, TRUE),
  ('Aesculus hippocastanum', 'Marronnier d''Inde', 'Horse Chestnut', 'plants', 'gbif', 75, TRUE),
  ('Taxus baccata', 'If commun', 'European Yew', 'plants', 'gbif', 55, TRUE),
  ('Pinus sylvestris', 'Pin sylvestre', 'Scots Pine', 'plants', 'gbif', 75, TRUE),
  ('Abies alba', 'Sapin pectiné', 'Silver Fir', 'plants', 'gbif', 65, TRUE),
  ('Picea abies', 'Épicéa commun', 'Norway Spruce', 'plants', 'gbif', 70, TRUE),
  ('Fraxinus excelsior', 'Frêne commun', 'European Ash', 'plants', 'gbif', 70, TRUE),
  ('Alnus glutinosa', 'Aulne glutineux', 'Black Alder', 'plants', 'gbif', 60, TRUE),
  ('Salix alba', 'Saule blanc', 'White Willow', 'plants', 'gbif', 65, TRUE),
  ('Populus tremula', 'Peuplier tremble', 'European Aspen', 'plants', 'gbif', 60, TRUE),
  ('Carpinus betulus', 'Charme commun', 'European Hornbeam', 'plants', 'gbif', 65, TRUE),
  ('Robinia pseudoacacia', 'Robinier faux-acacia', 'Black Locust', 'plants', 'gbif', 65, TRUE),
  ('Hedera helix', 'Lierre commun', 'Common Ivy', 'plants', 'gbif', 80, TRUE),
  ('Ilex aquifolium', 'Houx commun', 'European Holly', 'plants', 'gbif', 65, TRUE),
  ('Sambucus nigra', 'Sureau noir', 'Black Elder', 'plants', 'gbif', 70, TRUE),
  ('Crataegus monogyna', 'Aubépine monogyne', 'Common Hawthorn', 'plants', 'gbif', 70, TRUE),
  ('Prunus spinosa', 'Prunellier', 'Blackthorn', 'plants', 'gbif', 60, TRUE),
  ('Rubus fruticosus', 'Ronce commune', 'European Blackberry', 'plants', 'gbif', 80, TRUE),
  ('Pteridium aquilinum', 'Fougère aigle', 'Bracken', 'plants', 'gbif', 60, TRUE),
  ('Convallaria majalis', 'Muguet', 'Lily of the Valley', 'plants', 'gbif', 75, TRUE),
  ('Narcissus pseudonarcissus', 'Jonquille', 'Wild Daffodil', 'plants', 'gbif', 75, TRUE),
  ('Primula vulgaris', 'Primevère acaule', 'Common Primrose', 'plants', 'gbif', 65, TRUE),
  ('Bellis perennis', 'Pâquerette', 'Common Daisy', 'plants', 'gbif', 90, TRUE),
  ('Centaurea cyanus', 'Bleuet des champs', 'Cornflower', 'plants', 'gbif', 70, TRUE),
  ('Leucanthemum vulgare', 'Marguerite commune', 'Oxeye Daisy', 'plants', 'gbif', 75, TRUE),
  ('Viola tricolor', 'Pensée des champs', 'Wild Pansy', 'plants', 'gbif', 60, TRUE),
  ('Lavandula angustifolia', 'Lavande vraie', 'English Lavender', 'plants', 'gbif', 85, TRUE),
  ('Salvia rosmarinus', 'Romarin', 'Rosemary', 'plants', 'gbif', 75, TRUE),
  ('Trifolium pratense', 'Trèfle des prés', 'Red Clover', 'plants', 'gbif', 70, TRUE),
  ('Plantago lanceolata', 'Plantain lancéolé', 'Ribwort Plantain', 'plants', 'gbif', 65, TRUE),

  -- ── Champignons ────────────────────────────────────────────────────────
  ('Boletus edulis', 'Cèpe de Bordeaux', 'Penny Bun', 'fungi', 'gbif', 85, TRUE),
  ('Cantharellus cibarius', 'Girolle', 'Golden Chanterelle', 'fungi', 'gbif', 80, TRUE),
  ('Craterellus cornucopioides', 'Trompette de la mort', 'Black Trumpet', 'fungi', 'gbif', 60, TRUE),
  ('Imleria badia', 'Bolet bai', 'Bay Bolete', 'fungi', 'gbif', 55, TRUE),
  ('Suillus luteus', 'Bolet jaune', 'Slippery Jack', 'fungi', 'gbif', 50, TRUE),
  ('Lactarius deliciosus', 'Lactaire délicieux', 'Saffron Milkcap', 'fungi', 'gbif', 60, TRUE),
  ('Pleurotus ostreatus', 'Pleurote en huître', 'Oyster Mushroom', 'fungi', 'gbif', 70, TRUE),
  ('Agaricus bisporus', 'Champignon de Paris', 'Cultivated Mushroom', 'fungi', 'gbif', 85, TRUE),
  ('Amanita muscaria', 'Amanite tue-mouches', 'Fly Agaric', 'fungi', 'gbif', 80, TRUE),
  ('Amanita phalloides', 'Amanite phalloïde', 'Death Cap', 'fungi', 'gbif', 65, TRUE),
  ('Macrolepiota procera', 'Coulemelle', 'Parasol Mushroom', 'fungi', 'gbif', 70, TRUE),
  ('Hydnum repandum', 'Pied-de-mouton', 'Wood Hedgehog', 'fungi', 'gbif', 60, TRUE),
  ('Morchella esculenta', 'Morille commune', 'Common Morel', 'fungi', 'gbif', 70, TRUE),
  ('Russula nigricans', 'Russule charbonnière', 'Blackening Russula', 'fungi', 'gbif', 50, TRUE),
  ('Cantharellus tubaeformis', 'Chanterelle d''automne', 'Yellowfoot Chanterelle', 'fungi', 'gbif', 55, TRUE),

  -- ── Arachnides ─────────────────────────────────────────────────────────
  ('Argiope bruennichi', 'Argiope frelon', 'Wasp Spider', 'arachnids', 'gbif', 65, TRUE),
  ('Araneus diadematus', 'Épeire diadème', 'European Garden Spider', 'arachnids', 'gbif', 70, TRUE),
  ('Tegenaria domestica', 'Tégénaire des maisons', 'Barn Funnel Weaver', 'arachnids', 'gbif', 60, TRUE),
  ('Phalangium opilio', 'Faucheux', 'Common Harvestman', 'arachnids', 'gbif', 60, TRUE),
  ('Ixodes ricinus', 'Tique du mouton', 'Castor Bean Tick', 'arachnids', 'gbif', 65, TRUE),

  -- ── Mollusques ─────────────────────────────────────────────────────────
  ('Helix pomatia', 'Escargot de Bourgogne', 'Roman Snail', 'mollusks', 'gbif', 75, TRUE),
  ('Cornu aspersum', 'Petit-gris', 'Garden Snail', 'mollusks', 'gbif', 80, TRUE),
  ('Arion rufus', 'Limace rouge', 'European Red Slug', 'mollusks', 'gbif', 60, TRUE),
  ('Mytilus edulis', 'Moule commune', 'Blue Mussel', 'mollusks', 'gbif', 65, TRUE),
  ('Littorina littorea', 'Bigorneau', 'Common Periwinkle', 'mollusks', 'gbif', 55, TRUE)
ON CONFLICT (scientific_name) DO UPDATE SET
  common_name_fr  = EXCLUDED.common_name_fr,
  common_name_en  = COALESCE(EXCLUDED.common_name_en, public.species_master.common_name_en),
  taxonomic_group = EXCLUDED.taxonomic_group,
  source          = EXCLUDED.source,
  popularity      = GREATEST(public.species_master.popularity, EXCLUDED.popularity),
  is_active       = TRUE,
  updated_at      = now();

-- ── 7. Drop tables legacy ───────────────────────────────────────────────────

DROP TABLE IF EXISTS public.taxref_cache CASCADE;
DROP TABLE IF EXISTS public.species_full CASCADE;

COMMIT;

-- ── Vérification post-migration (à exécuter manuellement) ───────────────────
-- SELECT taxonomic_group, COUNT(*) FROM public.species_master GROUP BY taxonomic_group ORDER BY 2 DESC;
-- SELECT * FROM public.species_master WHERE common_name_fr ILIKE 'mésange%' ORDER BY popularity DESC LIMIT 5;
