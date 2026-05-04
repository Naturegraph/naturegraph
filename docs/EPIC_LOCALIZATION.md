# 🧭 EPIC — Localisation Privacy-First (Naturegraph)

> Document de découpage opérationnel. Référence produit : `docs/PRD_LOCALIZATION.md`.
> Dernière mise à jour : 2026-04-14
> Propriétaires : Nicolas (Lead Product Designer), agents IA

---

## 📌 Contexte

Naturegraph utilise un système de localisation volontairement limité (ville + région + rayon ≥ 75 km) afin de :

- contextualiser le feed
- améliorer la recherche
- activer des notifications locales
- sans jamais tracker précisément les utilisateurs

---

## 🎯 Objectif

Construire un système de localisation :

- privacy-first
- non intrusif
- exploitable par tout le produit
- évolutif vers géospatial intelligence

---

## 🗺️ Vue d'ensemble des features

| #   | Feature                                   | Priorité |
| --- | ----------------------------------------- | -------- |
| 1   | Onboarding & consentement localisation    | P0       |
| 2   | Stockage & modèle user_location           | P0       |
| 3   | Location picker manuel                    | P0       |
| 4   | Utilisation produit (feed, notifs, carte) | P1       |
| 5   | Cohérence, robustesse, métriques          | P1       |
| 6   | [Futur] Analyse d'image & EXIF            | P3       |

---

# 🧩 FEATURE 1 — Onboarding & consentement localisation

```md id="loc_feature_onboarding"
## 🎯 Objectif

Gérer la première interaction utilisateur avec la localisation.

---

### SUB-TASKS

#### FE-LOC-001 — Permission navigateur géolocalisation

Frontend + UX

- trigger permission navigateur au login
- gérer accept/refuse
- fallback manuel si refus
- détails: navigator.geolocation.getCurrentPosition avec timeout 10s, jamais bloquant

---

#### UX-LOC-001 — Flow onboarding localisation

UX

- définir parcours complet onboarding
- gérer états:
  - non localisé
  - permission refusée
  - localisation active
- détails: intégration dans OnboardingStep4 existant, skip = pas de blocage

---

#### UI-LOC-001 — Modal permission localisation

UI

- expliquer valeur utilisateur
- demander consentement clair
- détails: CSS tokens (var(--color-\*)), typographies Quicksand+Mulish, respect prefers-reduced-motion
- CTA primaire "Activer" + secondaire "Plus tard"
```

---

# 🧩 FEATURE 2 — Stockage & modèle user_location

```md id="loc_feature_datamodel"
## 🎯 Objectif

Centraliser et stocker la localisation utilisateur.

---

### SUB-TASKS

#### BE-LOC-001 — Modèle user_location

Backend

- stocker ville + région + center + radius
- consent_source tracking
- détails: colonnes ajoutées à profiles (city_name, region_name, country_code, location_point geography(point,4326), location_radius_km, location_visibility, location_consent_source, location_updated_at)
- extensions: postgis, pg_trgm
- index GIST sur location_point
- fichier: supabase/migrations/20260420_add_user_location.sql

---

#### FE-LOC-002 — Store localisation global

Frontend

- provider Location
- sync backend
- helpers isLocalized()
- détails: src/contexts/LocationContext.tsx, hook useUserLocation(), sync via React Query (staleTime 5min), helpers isLocalized() / getVisibilityLabel() / getRadiusLabel()

---

#### BE-LOC-002 — Reverse geocoding service

Backend

- lat/lng → ville + région
- normalisation stricte
- détails: edge function reverse-geocode, input (lat, lng), output (insee_code, city_name, region_name, centroid)
- source: API Adresse /reverse (RGPD, sans clé), fallback fr_cities par plus proche voisin PostGIS
- rate-limit 10 req/s/user

---

#### BE-LOC-003 — Enforcement règle 75km

Backend

- validation radius minimum
- override frontend interdit
- détails: check constraint SQL (radius between 75 and 500), double validation edge function update-profile-location, refus 400 si payload hors bornes
- tests unitaires obligatoires
```

---

# 🧩 FEATURE 3 — Location picker manuel

```md id="loc_feature_picker"
## 🎯 Objectif

Permettre à l'utilisateur de définir sa zone manuellement.

---

### SUB-TASKS

#### FE-LOC-003 — Location picker manuel

Frontend + UX

- autocomplete ville
- région auto
- validation radius
- détails: composant CityAutocomplete (pattern ARIA combobox, debounce 300ms, cache React Query 24h), LocationRadiusSlider (75/100/150/250/500 km), LocationVisibilityToggle (privé/région/ville)
- API: https://api-adresse.data.gouv.fr/search/?q=...&type=municipality&limit=5

---

#### UX-LOC-002 — Mode non-localisé

UX

- feed global
- CTA activer localisation
- détails: toast discret "Activez la localisation pour un feed plus pertinent" affiché 1x/session, jamais bloquant
- état vide feed local → lien vers settings > localisation
```

---

# 🧩 FEATURE 4 — Utilisation produit (feed, notifs, carte)

```md id="loc_feature_usage"
## 🎯 Objectif

Utiliser la localisation dans tout Naturegraph.

---

### SUB-TASKS

#### BE-LOC-004 — API feed géolocalisé

Backend

- filtrage par zone
- fallback global
- détails: fonction RPC nearby_posts(user_id, limit=20) utilisant ST_DWithin, rayon = location_radius_km du requester, fallback feed national si < 10 résultats

---

#### FE-LOC-004 — Feed filtré par zone

Frontend

- injection zone dans API
- gestion fallback
- détails: nouveau tab "Près de moi" dans FeedTabs, état persisté, skeleton loading, badge "région · 75km" affiché

---

#### BE-LOC-005 — Notifications géolocalisées

Backend

- alerts par zone
- détails: cron job + fonction SQL, si nouvelle observation dans rayon X → insert notification, jamais de position précise dans le payload, floutage espèces protégées

---

#### FE-LOC-005 — Notifications locales

Frontend

- affichage contextuel
- détails: intégration dans NotificationList existant, preview avec région (pas ville précise), opt-in par catégorie dans settings

---

#### FE-LOC-006 — Carte clustering

Frontend

- clustering obligatoire
- pas de précision utilisateur
- détails: supercluster.js côté client, zoom max limité (14), jamais de marker profil, uniquement observations, floutage aléatoire ±2km pour espèces sensibles
```

---

# 🧩 FEATURE 5 — Cohérence, robustesse, métriques

```md id="loc_feature_quality"
## 🎯 Objectif

Assurer cohérence et robustesse des données.

---

### SUB-TASKS

#### BE-LOC-006 — Sync multi-device localisation

Backend

- synchronisation user_location
- détails: Supabase realtime subscription sur profiles.id = auth.uid(), invalidation React Query au changement, gestion conflits last-write-wins avec location_updated_at
- throttle 1 update/heure côté serveur

---

#### PM-LOC-001 — Validation règles privacy

PM

- confirmer 75km minimum obligatoire
- détails: valider avec Nicolas + éventuel conseil juridique, documenter dans docs/legal/rgpd-registre.md, publier dans CGU + page Confidentialité
- test: vérifier impossibilité de contournement via API directe

---

#### PM-LOC-002 — KPI localisation

PM

- opt-in rate
- engagement feed local
- retention users localisés
- détails: dashboard interne (ou Supabase SQL views), cibles: opt-in ≥ 60%, usage filtre ≥ 30% DAU, latence ST_DWithin < 150ms p95, zéro incident RGPD
```

---

# 🧩 FEATURE 6 — [Futur] Analyse d'image & EXIF

```md id="loc_feature_image_exif"
## 🎯 Objectif futur

Améliorer création d'observations via analyse d'image.

---

### SUB-TASKS

#### IMG-OBS-001 — Extraction EXIF metadata

Backend

- GPS si existant
- timestamp capture
- détails: lib exifr côté client, extraction GPS + DateTimeOriginal, envoi au backend UNIQUEMENT si user consent explicite case à cocher
- si pas de consent → extraction ignorée

---

#### IMG-OBS-002 — Auto-fill observation form

Frontend

- pré-remplissage date
- suggestion localisation
- détails: si GPS EXIF détecté + consent → reverse-geocode côté serveur → suggérer ville (JAMAIS la position précise dans l'UI publique), user valide/modifie avant submit
- date EXIF → champ observed_at pré-rempli

---

#### IMG-OBS-003 — Privacy cleanup EXIF

Backend

- suppression metadata brute
- aucun stockage GPS image
- détails: pipeline Supabase Storage upload → strip EXIF via sharp/ExifTool, image stockée = version nettoyée, hash comparé avant/après pour vérifier
- RGPD: jamais de coordonnées brutes dans les buckets publics
```

---

## 📊 Critères de succès

- Taux de complétion onboarding localisation ≥ 60 %
- Usage filtre "Près de moi" ≥ 30 % des DAU
- Requêtes API Adresse < 5 / user / session
- Latence `ST_DWithin` < 150 ms p95
- Zéro incident RGPD sur 12 mois

---

## ⚠️ Risques & mitigation

| Risque                  | Mitigation                             |
| ----------------------- | -------------------------------------- |
| API Adresse down        | Fallback Nominatim + mode texte libre  |
| Fuite location_point    | Vue profiles_public + RLS + tests auto |
| Biais zones rurales     | Rayon auto-élargi si < 10 posts        |
| Abus rate-limit         | Debounce + throttle edge               |
| Données INSEE obsolètes | Refresh annuel via cron                |
| EXIF GPS fuité          | Strip systématique avant stockage      |

---

## 🚦 Ordre de livraison recommandé

1. **Sprint 1** — FEATURE 2 (data model complet, sécurisé, RLS)
2. **Sprint 2** — FEATURE 3 (picker manuel + autocomplete + edge functions)
3. **Sprint 3** — FEATURE 1 (onboarding branché)
4. **Sprint 4** — FEATURE 5 (validation privacy + KPI) → livrable MVP
5. **Sprint 5** — FEATURE 4 (usage produit: feed, notifs, carte)
6. **Backlog futur** — FEATURE 6 (EXIF, analyse image)

---

## 🔗 Références

- `docs/PRD_LOCALIZATION.md` — PRD produit
- `docs/backend/database-architecture.md` — schéma global
- `GUIDELINES.md` — éco-conception + a11y
- `docs/PRD_ONBOARDING.md` — flow onboarding existant
- [API Adresse](https://adresse.data.gouv.fr/api-doc/adresse)
- [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html)
- [exifr](https://github.com/MikeKovarik/exifr) — lib extraction EXIF côté client
