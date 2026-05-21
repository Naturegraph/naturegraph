-- ============================================================
-- Migration : fr_cities.region_code → VARCHAR(3)
-- ============================================================
-- Nicolas 2026-05-21 — accueille les COM (codes région à 3 chiffres) :
--   975 = Saint-Pierre-et-Miquelon
--   977 = Saint-Barthélemy
--   978 = Saint-Martin
--   984 = TAAF
--   986 = Wallis-et-Futuna
--   987 = Polynésie française
--   988 = Nouvelle-Calédonie
--   989 = Île de Clipperton
--
-- Sans ce changement, le seed des 35 000 communes officielles INSEE échouait
-- sur les ~90 communes des COM avec « value too long for type character(2) ».
-- ============================================================

ALTER TABLE public.fr_cities
  ALTER COLUMN region_code TYPE VARCHAR(3);
