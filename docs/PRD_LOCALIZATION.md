# PRD — Localisation & Géolocalisation (Privacy-First)

> **Document de référence pour les agents Claude Code et l'équipe produit.**
> Dernière mise à jour : 2026-04-15
> Statut : v1.1 — Delayed activation strategy validée
> Propriétaires : Nicolas (Fondateur/Lead Product Designer), agents IA

---

## 0. Contexte & Vision Naturegraph

Naturegraph est une plateforme citoyenne de biodiversité francophone. Chaque contribution est **géographique par nature** : une observation d'espèce n'a de valeur scientifique et sociale que si l'on sait _où_ elle a été faite. Mais cette nécessité entre en tension directe avec la vie privée des contributeur·rice·s — particulièrement pour les personnes observant depuis leur domicile, leur jardin, ou des lieux sensibles (nids, sites de reproduction d'espèces protégées).

**Principe fondateur :** la localisation **utilisateur** et la localisation **observation** sont deux concepts distincts, soumis à des règles différentes.

- **Localisation utilisateur** → _floutée_, _zonée_, _privée par défaut_. Sert uniquement à alimenter un feed territorial et des suggestions de proximité.
- **Localisation observation** → _précise_ (GPS ou pointage carte), _éventuellement masquée_ pour les espèces protégées, _attribuée aux bases scientifiques_ (TAXREF, GBIF) avec précision brute.

Ce PRD couvre uniquement la **localisation utilisateur**. La localisation des observations fait l'objet d'un PRD séparé (voir `PRD_POST_FORMATS.md` + futur `PRD-OBSERVATIONS.md`).

---

## 1. Objectifs

### 1.1 Objectifs produit

- Permettre à chaque utilisateur·rice de déclarer une zone géographique **approximative** (ville + région) pour alimenter un feed territorial pertinent.
- Offrir une granularité **contrôlable** : l'utilisateur·rice choisit son rayon de partage (75 km minimum, 500 km maximum, par paliers).
- Ne **jamais** exposer une position GPS précise d'un profil, même en interne.
- Permettre des **suggestions de contenu par proximité** sans révéler qui est près de qui.

### 1.2 Objectifs techniques

- Stack : PostgreSQL + PostGIS, Supabase, React 19 + TypeScript.
- Conformité **RGPD** (CNIL) + **WCAG AA** + **éco-conception** (budget perf strict).
- Intégration fluide avec les modules existants : Feed, Recherche, Carnets, Notifications, Carte.

### 1.3 Non-objectifs

- Pas de tracking temps réel (ni check-in, ni "friends nearby").
- Pas de géolocalisation navigateur imposée — tout est opt-in explicite.
- Pas de stockage d'historique de positions.

---

## 2. Principes de confidentialité

1. **Privacy by design** — la position précise ne quitte jamais le client sans floutage.
2. **Opt-in post-découverte** — la localisation est proposée uniquement après que l'utilisateur a découvert le produit. Elle n'est jamais une condition d'accès ni demandée à l'inscription.
3. **Rayon minimum 75 km** — garantit qu'une ville ≠ un individu dans les zones rurales.
4. **Granularité publique : ville + région uniquement** — jamais de rue, quartier, code postal affiché.
5. **Effacement immédiat** — suppression de la localisation = purge SQL en cascade (pas de soft-delete sur ce champ).
6. **Pas de partage tiers** — la localisation n'est jamais transmise à des partenaires, même anonymisée, sans consentement dédié.

---

## 3. Modèle de données

### 3.1 Extensions Postgres requises

```sql
create extension if not exists postgis;
create extension if not exists pg_trgm; -- autocomplete ville
```

### 3.2 Champs ajoutés à `profiles`

```sql
alter table profiles add column if not exists
  city_name text,                              -- "Grenoble"
  region_name text,                            -- "Auvergne-Rhône-Alpes"
  country_code char(2) default 'FR',           -- ISO 3166-1 alpha-2
  location_point geography(point, 4326),       -- centroïde ville (stocké mais JAMAIS exposé tel quel)
  location_radius_km int default 75
    check (location_radius_km between 75 and 500),
  location_visibility text default 'region'
    check (location_visibility in ('private', 'region', 'city')),
  location_updated_at timestamptz;

create index if not exists profiles_location_gix
  on profiles using gist (location_point);
```

**Règles :**

- `location_point` est utilisé **uniquement** côté serveur pour calculer des distances approximatives.
- Jamais retourné dans les requêtes `select *` — à exclure via vue `profiles_public`.
- `location_visibility = 'private'` → aucun autre utilisateur ne voit la ville.

### 3.3 Vue publique — ce que voient les autres

```sql
create or replace view profiles_public as
select
  id, username, display_name, avatar_url, bio,
  case
    when location_visibility = 'private' then null
    when location_visibility = 'region' then region_name
    when location_visibility = 'city' then city_name || ', ' || region_name
  end as location_label,
  -- jamais location_point, jamais coordonnées
  created_at
from profiles;
```

### 3.4 Table de référence des villes FR

```sql
create table if not exists fr_cities (
  insee_code char(5) primary key,
  name text not null,
  name_normalized text not null,     -- "saint-etienne" pour recherche
  region_code char(2) not null,
  region_name text not null,
  department_code char(3) not null,
  population int,
  centroid geography(point, 4326) not null
);

create index fr_cities_name_trgm on fr_cities using gin (name_normalized gin_trgm_ops);
create index fr_cities_centroid_gix on fr_cities using gist (centroid);
```

Source : [base officielle IGN/INSEE](https://geo.api.gouv.fr/), rafraîchie annuellement.

### 3.5 RLS

```sql
alter table profiles enable row level security;

-- Lecture : vue publique accessible à tous les authentifiés
create policy "profiles_public_read"
  on profiles for select
  using (auth.role() = 'authenticated');

-- Écriture localisation : uniquement son propre profil
create policy "profiles_own_location_update"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

---

## 4. Flux utilisateur

### 4.1 Stratégie d'activation différée (Delayed Activation)

> **Règle produit fondamentale :**  
> La localisation dans Naturegraph est une fonctionnalité **opt-in post-découverte**, jamais une condition d'accès au produit.

**Pourquoi l'onboarding est exclu :**

- Trop tôt dans le parcours — l'utilisateur n'a pas encore perçu la valeur du feed territorial
- Friction inutile au moment critique de l'activation
- Risque d'abandon à l'inscription

**Canaux d'activation en séquence (post-onboarding) :**

| Moment                           | Déclencheur                                   | Canal                                           |
| -------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| J+0 (premier feed)               | Onglet "Pour vous" non localisé — empty state | 3 CTAs d'activation (intérêts / follows / zone) |
| J+0 (3 secondes après connexion) | `useLocationCTA` — 1x/session                 | `LocationPermissionModal` (modale douce)        |
| Any                              | Pill "Localisation" dans le header            | `LocationModal` — picker ville + rayon          |
| Any                              | Paramètres → Localisation & Confidentialité   | `LocationPickerSection` + clear                 |

**Principes :**

- Jamais imposée — toujours skippable
- Jamais de permission navigateur demandée sans action explicite de l'utilisateur
- La valeur doit être claire **avant** la demande

### 4.2 Modification depuis le profil

- Page Paramètres → Confidentialité → Localisation.
- Bouton "Effacer ma localisation" (confirmation modale, action immédiate).
- Historique d'audit : `location_updated_at` mis à jour à chaque changement.

### 4.3 Mode invité

- Aucune localisation enregistrée.
- Feed "découverte nationale" par défaut (pas de filtre territorial).

---

## 5. Intégration avec les modules existants

### 5.1 Feed (`PRD_HOMEPAGE.md`)

- Signal "localisation" dans le tab "Pour vous" (via `nearby_posts` RPC) — requête PostGIS :

  ```sql
  select p.* from posts p
  join profiles pr on pr.id = p.user_id
  where st_dwithin(
    pr.location_point,
    (select location_point from profiles where id = auth.uid()),
    (select location_radius_km from profiles where id = auth.uid()) * 1000
  )
  order by p.created_at desc
  limit 20;
  ```

- Jamais de post géolocalisé avec précision < 1 km dans le feed public (voir PRD observations pour le floutage des espèces protégées).

### 5.2 Recherche

- Facette "Dans ma région" activable.
- Recherche d'utilisateur·rice·s par ville : retourne uniquement les profils avec `location_visibility ≠ 'private'`.

### 5.3 Suggestions (`profileService`)

- Scoring de suggestion actuel (posts_count, intérêts) + bonus distance :
  - 0–75 km : +0.3
  - 75–250 km : +0.1
  - > 250 km : +0.0

### 5.4 Notifications

- "Nouvelle observation près de chez vous" = dans le rayon déclaré, jamais plus précis.
- Opt-out par catégorie dans les préférences.

### 5.5 Carte

- Les points utilisateur n'apparaissent **jamais** sur la carte publique.
- Seuls les posts/observations sont cartographiés, avec floutage espèces protégées.

---

## 6. API & Services

### 6.1 Géocodage (public, RGPD)

- **API Adresse française** : `https://api-adresse.data.gouv.fr/search/?q={query}&type=municipality&limit=5`
- Pas de clé, pas de rate-limit agressif, données IGN/BAN.
- Fallback hors-France : Nominatim (OpenStreetMap, self-host possible en phase 2).

### 6.2 Edge functions Supabase

- `resolve-city` : prend une query → renvoie top 5 villes FR normalisées.
- `update-profile-location` : valide le code INSEE, résout centroïde depuis `fr_cities`, update profil.

### 6.3 Côté client

- React Query avec `staleTime: 24h` sur les résultats d'autocomplete (mêmes villes retapées).
- Debounce 300ms sur la saisie.

---

## 7. Architecture logicielle

### 7.1 Fichiers à créer

```
src/
  lib/
    location/
      geocoding.ts          // wrapper API Adresse
      cityResolver.ts       // normalisation + matching INSEE
      distance.ts           // helpers clients (Haversine pour affichage)
  hooks/
    useLocationAutocomplete.ts
    useUserLocation.ts
  components/
    location/
      CityAutocomplete.tsx
      LocationRadiusSlider.tsx
      LocationVisibilityToggle.tsx
  types/
    location.ts
supabase/
  migrations/
    20260420_add_location_to_profiles.sql
    20260420_fr_cities_seed.sql
    20260420_profiles_public_view.sql
  functions/
    resolve-city/
    update-profile-location/
```

### 7.2 Phases d'implémentation

**Phase 1 — MVP localisation (develop)**

- Migration SQL `profiles` + `fr_cities` + vue publique.
- Composant `CityAutocomplete` + intégration `OnboardingStep4`.
- Update du service profil pour lire/écrire la localisation.

**Phase 2 — Feed territorial**

- Filtre "Près de moi" dans le feed.
- Suggestions de profils par proximité.

**Phase 3 — Recherche & carte**

- Facettes de recherche.
- Notifications contextuelles.

**Phase 4 — International**

- Étendre `fr_cities` vers `world_cities` (Nominatim / GeoNames).
- Support `country_code` dans les filtres.

---

## 8. Conformité RGPD / CNIL

- **Base légale** : intérêt légitime (feed pertinent) + consentement explicite (opt-in in-app, post-découverte).
- **Finalité** : affichage social, suggestions de contenu, filtres territoriaux. Aucun autre usage.
- **Minimisation** : on ne stocke que ce qui est affiché + centroïde (pour calcul distances).
- **Durée de conservation** : tant que le compte est actif. Suppression compte → purge immédiate.
- **Droits** : accès (export profil), rectification (modification en 1 clic), effacement (bouton dédié), portabilité (JSON export), opposition (toggle privacy).
- **DPO** : lien vers la page Confidentialité dans le footer + onboarding.
- **Registre des traitements** : à tenir à jour dans `docs/legal/rgpd-registre.md` (à créer).

---

## 9. Accessibilité (WCAG AA)

- Autocomplete : ARIA combobox pattern (`role="combobox"`, `aria-expanded`, `aria-activedescendant`).
- Slider rayon : `role="slider"` avec `aria-valuemin/max/now/text`.
- Toggle visibilité : `role="radiogroup"` avec labels explicites.
- Messages d'erreur : `aria-live="polite"`.
- Navigation clavier complète (Tab, Arrow, Enter, Escape).
- Contraste ≥ 4.5:1 sur toute l'UI.

---

## 10. Éco-conception

Conforme à `GUIDELINES.md` :

- Table `fr_cities` ≈ 35k lignes (36 000 communes FR) → chargée **côté serveur uniquement**, jamais envoyée au client.
- Autocomplete : debounce 300ms, cache React Query, max 5 résultats.
- Aucune carte Leaflet/Mapbox sur la page de saisie (SVG simple ou texte).
- Requêtes PostGIS : limiter avec `LIMIT 20`, index GIST obligatoire.
- Budget perf ajouté : < 15 KB gzip pour tout le module localisation côté client.

---

## 11. i18n FR/EN

Clés à ajouter dans `src/i18n/locales/{fr,en}.json` :

```
location.onboarding.title
location.onboarding.description
location.onboarding.cityPlaceholder
location.radius.label
location.radius.unit
location.visibility.private
location.visibility.region
location.visibility.city
location.privacy.notice
location.errors.cityNotFound
location.errors.outsideFrance
```

---

## 12. Edge cases & tests

### 12.1 Edge cases

- Utilisateur·rice sans localisation → feed national par défaut, pas de blocage.
- Ville homonyme (ex: Montreuil) → afficher département dans l'autocomplete.
- DROM-COM → supportés via INSEE (codes 97x).
- Changement de ville fréquent → throttle à 1 update/heure côté edge function.
- Suppression de compte → trigger `on delete` purge `location_point`.

### 12.2 Tests

- **Unit** : `cityResolver`, `distance`, validation rayon.
- **Integration** : flow onboarding complet, update profil, filtre feed.
- **E2E** : saisie ville, skip onboarding, passage en privé.
- **Perf** : bench requête PostGIS `ST_DWithin` sur 100k profils synthétiques.
- **A11y** : axe-core sur tous les composants.

---

## 13. Métriques de succès

- **Taux d'activation localisation post-J7** ≥ 40 % des utilisateurs actifs (activation différée attendue).
- **Taux d'usage signal localisation dans "Pour vous"** ≥ 30 % des utilisateurs actifs.
- **Requêtes API Adresse** < 5 / utilisateur / session (cache efficace).
- **Latence PostGIS ST_DWithin** < 150 ms p95.
- **Zéro incident RGPD** sur les 12 premiers mois.

---

## 14. Risques & mitigation

| Risque                                      | Impact               | Mitigation                                         |
| ------------------------------------------- | -------------------- | -------------------------------------------------- |
| API Adresse indisponible                    | Saisie ville bloquée | Fallback Nominatim + mode texte libre              |
| Fuite `location_point` via join malveillant | RGPD                 | Vue `profiles_public` + RLS strict, audit requêtes |
| Biais territorial (zones peu peuplées)      | Feed vide            | Rayon auto-élargi si < 10 posts trouvés            |
| Abus rate-limit autocomplete                | Surcoût              | Debounce + throttle côté edge                      |
| Données INSEE obsolètes                     | Villes manquantes    | Refresh annuel via cron + script migration         |

---

## 15. Références

- [API Adresse data.gouv.fr](https://adresse.data.gouv.fr/api-doc/adresse)
- [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html)
- [CNIL — Géolocalisation](https://www.cnil.fr/fr/la-geolocalisation)
- [WCAG 2.1 — Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- Projet : `docs/backend/database-architecture.md`, `GUIDELINES.md`, `PRD_ONBOARDING.md`

---

## 16. Décisions ouvertes

- [ ] Valider le rayon minimum à 75 km avec l'équipe (vs 50 km envisagé initialement).
- [ ] Décider si la visibilité "ville" est ouverte à tous ou réservée aux comptes vérifiés.
- [ ] Choisir entre Nominatim self-hosté vs GeoNames pour la phase internationale.
- [ ] Statuer sur l'affichage d'un badge "contributeur local" (incitation vs dérive surveillance).
