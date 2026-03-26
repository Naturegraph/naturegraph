# Architecture de données — Naturegraph

> Document de référence pour l'architecture de données du projet.
> Toute modification de schéma doit être reflétée ici ET dans `src/types/database.ts`.

## Vue d'ensemble

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Supabase   │────▸│  TypeScript  │────▸│   React     │
│  PostgreSQL │     │  Types       │     │   Components│
│  + PostGIS  │     │  database.ts │     │   + Hooks   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       │              ┌─────┴──────┐
       │              │  data.ts   │  API wrappers
       │              │  (generic) │  PaginatedResponse,
       │              └────────────┘  SearchFilters, etc.
       │
  ┌────┴────┐
  │  RLS    │  Row Level Security
  │  Rules  │  Auth-based access
  └─────────┘
```

## Entités principales

### 1. Profile (users)

Extension de `auth.users` Supabase.

| Champ           | Type         | Contrainte                   | Description                            |
| --------------- | ------------ | ---------------------------- | -------------------------------------- |
| id              | UUID         | PK, FK auth.users            | Identifiant unique                     |
| username        | VARCHAR(50)  | UNIQUE, NOT NULL, >= 3 chars | Nom d'utilisateur                      |
| email           | VARCHAR(255) | UNIQUE, NOT NULL             | Email vérifié                          |
| first_name      | VARCHAR(100) | NOT NULL                     | Prénom                                 |
| last_name       | VARCHAR(100) | NOT NULL                     | Nom                                    |
| gender          | VARCHAR(20)  | CHECK                        | male, female, other, prefer_not_to_say |
| birth_date      | DATE         |                              | Date de naissance                      |
| bio             | TEXT         |                              | Biographie                             |
| interests       | TEXT[]       |                              | Catégories d'intérêt                   |
| city            | VARCHAR(100) |                              | Ville                                  |
| region          | VARCHAR(100) |                              | Région                                 |
| country         | VARCHAR(50)  |                              | Pays                                   |
| instagram       | VARCHAR(100) |                              | @ Instagram                            |
| twitter         | VARCHAR(100) |                              | @ Twitter/X                            |
| website         | VARCHAR(255) |                              | URL site perso                         |
| is_public       | BOOLEAN      | DEFAULT TRUE                 | Profil visible                         |
| email_verified  | BOOLEAN      | DEFAULT FALSE                | Email confirmé                         |
| avatar_url      | VARCHAR(500) |                              | Photo de profil                        |
| banner_url      | VARCHAR(500) |                              | Bannière profil                        |
| posts_count     | INTEGER      | DEFAULT 0                    | Compteur dénormalisé                   |
| followers_count | INTEGER      | DEFAULT 0                    | Compteur dénormalisé                   |
| following_count | INTEGER      | DEFAULT 0                    | Compteur dénormalisé                   |
| created_at      | TIMESTAMPTZ  | DEFAULT NOW()                | Inscription                            |
| updated_at      | TIMESTAMPTZ  | DEFAULT NOW()                | Dernière modification                  |
| last_login_at   | TIMESTAMPTZ  |                              | Dernière connexion                     |

**Index** : username, email, created_at DESC, country
**RLS** : Lecture profils publics par tous, lecture/écriture propre profil

---

### 2. Post (observations)

Deux types discriminés : `nature_encounter` (observation d'espèce) et `nature_instant` (paysage/phénomène).

| Champ                                 | Type                   | Contrainte                    | Description                                                                  |
| ------------------------------------- | ---------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| id                                    | UUID                   | PK, DEFAULT gen_random_uuid() |                                                                              |
| user_id                               | UUID                   | FK profiles, NOT NULL         | Auteur                                                                       |
| type                                  | VARCHAR(20)            | NOT NULL, CHECK               | nature_encounter / nature_instant                                            |
| status                                | VARCHAR(20)            | DEFAULT 'published'           | draft / published / archived                                                 |
| visibility                            | VARCHAR(20)            | DEFAULT 'public'              | public / private / followers                                                 |
| description                           | TEXT                   | NOT NULL, > 0 chars           | Contenu du post                                                              |
| tags                                  | TEXT[]                 |                               | Tags libres                                                                  |
| **Localisation**                      |                        |                               |                                                                              |
| city                                  | VARCHAR(100)           |                               | Ville                                                                        |
| region                                | VARCHAR(100)           |                               | Région                                                                       |
| country                               | VARCHAR(50)            |                               | Pays                                                                         |
| latitude                              | DECIMAL(10,8)          |                               | Latitude GPS                                                                 |
| longitude                             | DECIMAL(11,8)          |                               | Longitude GPS                                                                |
| location_name                         | VARCHAR(255)           |                               | Nom du lieu                                                                  |
| location_point                        | GEOGRAPHY(POINT, 4326) |                               | PostGIS auto-calculé                                                         |
| location_hidden                       | BOOLEAN                | DEFAULT FALSE                 | Masquer la position exacte                                                   |
| **Contexte**                          |                        |                               |                                                                              |
| encounter_date                        | TIMESTAMPTZ            | NOT NULL                      | Date de l'observation                                                        |
| time_of_day                           | VARCHAR(20)            |                               | morning/afternoon/dusk/evening/night                                         |
| weather                               | VARCHAR(20)            |                               | sunny/cloudy/rainy/windy/snowy                                               |
| habitat                               | VARCHAR(30)            |                               | forest/park_garden/prairie_heath/urban/river/lake_wetland/mountain/sea_coast |
| multiple_observations                 | BOOLEAN                | DEFAULT FALSE                 | Plusieurs espèces                                                            |
| **Identification (nature_encounter)** |                        |                               |                                                                              |
| species_identified                    | BOOLEAN                |                               | Espèce identifiée ?                                                          |
| species_name                          | VARCHAR(255)           |                               | Nom vernaculaire                                                             |
| scientific_name                       | VARCHAR(255)           |                               | Nom scientifique                                                             |
| taxonomic_group                       | VARCHAR(20)            |                               | Groupe taxonomique                                                           |
| identification_status                 | VARCHAR(20)            | DEFAULT 'pending'             | identified/pending/disputed                                                  |
| taxref_id                             | VARCHAR(50)            |                               | Code TAXREF (cd_nom)                                                         |
| taxref_rank                           | VARCHAR(50)            |                               | Rang taxonomique                                                             |
| taxref_source                         | VARCHAR(500)           |                               | Attribution INPN                                                             |
| taxref_license                        | VARCHAR(50)            |                               | Licence TAXREF                                                               |
| taxref_updated_at                     | TIMESTAMPTZ            |                               | Date mise à jour TAXREF                                                      |
| **Phénomène (nature_instant)**        |                        |                               |                                                                              |
| phenomenon                            | VARCHAR(255)           |                               | Description du phénomène                                                     |
| **Compteurs**                         |                        |                               |                                                                              |
| likes_count                           | INTEGER                | DEFAULT 0                     | Dénormalisé                                                                  |
| comments_count                        | INTEGER                | DEFAULT 0                     | Dénormalisé                                                                  |
| shares_count                          | INTEGER                | DEFAULT 0                     | Dénormalisé                                                                  |
| views_count                           | INTEGER                | DEFAULT 0                     | Dénormalisé                                                                  |
| created_at                            | TIMESTAMPTZ            | DEFAULT NOW()                 |                                                                              |
| updated_at                            | TIMESTAMPTZ            | DEFAULT NOW()                 |                                                                              |
| published_at                          | TIMESTAMPTZ            |                               | Date de publication                                                          |

**Index** : user_id, type, status, visibility, created_at DESC, country, habitat, taxonomic_group, taxref_id, location_point (GIST)
**RLS** : Posts publics lisibles par tous, CRUD propres posts

---

### 3. Media

Photos et vidéos attachées aux posts. Max 4 par post (éco-conception).

| Champ                    | Type                   | Contrainte            | Description                          |
| ------------------------ | ---------------------- | --------------------- | ------------------------------------ |
| id                       | UUID                   | PK                    |                                      |
| post_id                  | UUID                   | FK posts, NOT NULL    | Post parent                          |
| user_id                  | UUID                   | FK profiles, NOT NULL | Auteur                               |
| type                     | VARCHAR(10)            | NOT NULL              | photo / video                        |
| format                   | VARCHAR(20)            |                       | square / portrait / landscape / free |
| orientation              | VARCHAR(20)            |                       | horizontal / vertical / square       |
| status                   | VARCHAR(20)            | DEFAULT 'ready'       | uploading/processing/ready/error     |
| url                      | VARCHAR(500)           | NOT NULL              | URL Supabase Storage                 |
| thumbnail_url            | VARCHAR(500)           |                       | Miniature optimisée                  |
| original_url             | VARCHAR(500)           |                       | Fichier original                     |
| display_order            | INTEGER                | NOT NULL, > 0         | Ordre d'affichage                    |
| alt                      | TEXT                   |                       | Texte alternatif (a11y)              |
| width                    | INTEGER                |                       | Largeur px                           |
| height                   | INTEGER                |                       | Hauteur px                           |
| file_size                | BIGINT                 |                       | Taille en octets                     |
| mime_type                | VARCHAR(50)            |                       | Type MIME                            |
| **EXIF (photo)**         |                        |                       |                                      |
| captured_at              | TIMESTAMPTZ            |                       | Date de prise de vue                 |
| camera                   | VARCHAR(100)           |                       | Modèle appareil                      |
| lens                     | VARCHAR(100)           |                       | Objectif                             |
| focal_length             | INTEGER                |                       | Focale mm                            |
| aperture                 | VARCHAR(20)            |                       | Ouverture                            |
| iso                      | INTEGER                |                       | Sensibilité                          |
| shutter_speed            | VARCHAR(20)            |                       | Vitesse obturation                   |
| **Géolocalisation EXIF** |                        |                       |                                      |
| gps_latitude             | DECIMAL(10,8)          |                       |                                      |
| gps_longitude            | DECIMAL(11,8)          |                       |                                      |
| gps_point                | GEOGRAPHY(POINT, 4326) |                       | PostGIS                              |

**Éco-conception** : Images compressées WebP, max 800KB, lazy loading obligatoire.

---

### 4. Reactions

Système de réactions (pas de simple "like").

| Champ      | Type        | Contrainte            | Description                 |
| ---------- | ----------- | --------------------- | --------------------------- |
| id         | UUID        | PK                    |                             |
| post_id    | UUID        | FK posts, NOT NULL    | Post ciblé                  |
| user_id    | UUID        | FK profiles, NOT NULL | Auteur                      |
| type       | VARCHAR(20) | NOT NULL              | love/fire/hands/trophy/star |
| created_at | TIMESTAMPTZ | DEFAULT NOW()         |                             |

**Contrainte** : UNIQUE(user_id, post_id) — une seule réaction par user par post
**Trigger** : Met à jour `posts.likes_count` automatiquement

---

### 5. Comments

| Champ      | Type        | Contrainte            | Description |
| ---------- | ----------- | --------------------- | ----------- |
| id         | UUID        | PK                    |             |
| post_id    | UUID        | FK posts, NOT NULL    | Post ciblé  |
| user_id    | UUID        | FK profiles, NOT NULL | Auteur      |
| content    | TEXT        | NOT NULL, > 0 chars   | Contenu     |
| created_at | TIMESTAMPTZ | DEFAULT NOW()         |             |
| updated_at | TIMESTAMPTZ | DEFAULT NOW()         |             |

**Trigger** : Met à jour `posts.comments_count` automatiquement

---

### 6. Identification Proposals (collaborative)

Permet à la communauté de proposer des identifications d'espèces.

| Champ           | Type         | Contrainte            | Description                   |
| --------------- | ------------ | --------------------- | ----------------------------- |
| id              | UUID         | PK                    |                               |
| post_id         | UUID         | FK posts, NOT NULL    | Observation ciblée            |
| author_id       | UUID         | FK profiles, NOT NULL | Proposant                     |
| species_name    | VARCHAR(255) | NOT NULL              | Nom proposé                   |
| scientific_name | VARCHAR(255) |                       | Nom scientifique              |
| taxref_id       | VARCHAR(50)  |                       | Code TAXREF                   |
| confidence      | VARCHAR(20)  |                       | certain / probable / possible |
| notes           | TEXT         |                       | Justification                 |
| votes_up        | INTEGER      | DEFAULT 0             | Votes positifs                |
| votes_down      | INTEGER      | DEFAULT 0             | Votes négatifs                |
| created_at      | TIMESTAMPTZ  | DEFAULT NOW()         |                               |

**Logique** : Quand une proposition atteint un seuil de votes, l'observation passe en `identified`.

---

### 7. Follows

| Champ        | Type        | Contrainte            | Description   |
| ------------ | ----------- | --------------------- | ------------- |
| follower_id  | UUID        | FK profiles, NOT NULL | Qui suit      |
| following_id | UUID        | FK profiles, NOT NULL | Qui est suivi |
| created_at   | TIMESTAMPTZ | DEFAULT NOW()         |               |

**Contrainte** : PK(follower_id, following_id), follower != following
**Triggers** : Met à jour `followers_count` et `following_count`

---

### 8. Notebooks (carnets)

Collections personnelles d'observations.

| Champ           | Type         | Contrainte            | Description                      |
| --------------- | ------------ | --------------------- | -------------------------------- |
| id              | UUID         | PK                    |                                  |
| author_id       | UUID         | FK profiles, NOT NULL | Créateur                         |
| title           | VARCHAR(200) | NOT NULL              | Titre                            |
| description     | TEXT         |                       | Description                      |
| visibility      | VARCHAR(20)  | DEFAULT 'private'     | private / public / collaborative |
| cover_image_url | VARCHAR(500) |                       | Image de couverture              |
| created_at      | TIMESTAMPTZ  | DEFAULT NOW()         |                                  |
| updated_at      | TIMESTAMPTZ  | DEFAULT NOW()         |                                  |

**Table de jonction** : `notebook_observations(notebook_id, observation_id, added_at)`

---

### 9. Notifications

| Champ          | Type         | Contrainte            | Description                                        |
| -------------- | ------------ | --------------------- | -------------------------------------------------- |
| id             | UUID         | PK                    |                                                    |
| user_id        | UUID         | FK profiles, NOT NULL | Destinataire                                       |
| type           | VARCHAR(30)  | NOT NULL              | comment/identification/vote/follow/notebook_invite |
| title          | VARCHAR(255) | NOT NULL              | Titre                                              |
| body           | TEXT         |                       | Détail                                             |
| reference_id   | UUID         |                       | ID de l'objet lié                                  |
| reference_type | VARCHAR(30)  |                       | post/comment/notebook/profile                      |
| read           | BOOLEAN      | DEFAULT FALSE         | Lu ?                                               |
| created_at     | TIMESTAMPTZ  | DEFAULT NOW()         |                                                    |

---

### 10. TAXREF Cache

Cache local des données INPN/TAXREF pour les espèces référencées.

| Champ               | Type         | Contrainte    | Description              |
| ------------------- | ------------ | ------------- | ------------------------ |
| cd_nom              | VARCHAR(50)  | PK            | Code TAXREF              |
| cd_ref              | VARCHAR(50)  |               | Code de référence        |
| scientific_name     | VARCHAR(255) | NOT NULL      | Nom scientifique         |
| common_name_fr      | VARCHAR(255) |               | Nom vernaculaire FR      |
| common_name_en      | VARCHAR(255) |               | Nom vernaculaire EN      |
| author              | VARCHAR(255) |               | Auteur de la description |
| kingdom             | VARCHAR(100) |               | Règne                    |
| phylum              | VARCHAR(100) |               | Embranchement            |
| class               | VARCHAR(100) |               | Classe                   |
| order               | VARCHAR(100) |               | Ordre                    |
| family              | VARCHAR(100) |               | Famille                  |
| genus               | VARCHAR(100) |               | Genre                    |
| rank                | VARCHAR(20)  |               | Rang taxonomique         |
| group               | VARCHAR(50)  |               | Groupe simplifié         |
| conservation_status | VARCHAR(20)  |               | Statut IUCN              |
| taxref_version      | VARCHAR(20)  |               | Version TAXREF           |
| cached_at           | TIMESTAMPTZ  | DEFAULT NOW() |                          |
| expires_at          | TIMESTAMPTZ  |               | Expiration du cache      |

**Attribution** : CC-BY INPN — Muséum national d'Histoire naturelle

---

## Relations

```
profiles ──┬── 1:N ──▸ posts
            ├── 1:N ──▸ media
            ├── 1:N ──▸ reactions
            ├── 1:N ──▸ comments
            ├── 1:N ──▸ identification_proposals
            ├── 1:N ──▸ notebooks
            ├── 1:N ──▸ notifications
            └── N:N ──▸ profiles (follows)

posts ──────┬── 1:N ──▸ media (max 4)
            ├── 1:N ──▸ reactions
            ├── 1:N ──▸ comments
            ├── 1:N ──▸ identification_proposals
            ├── N:1 ──▸ taxref_cache (via taxref_id)
            └── N:N ──▸ notebooks (via notebook_observations)
```

## Triggers automatiques

| Trigger                  | Table                             | Action                                       |
| ------------------------ | --------------------------------- | -------------------------------------------- |
| `update_updated_at`      | posts, profiles, media, notebooks | Met à jour `updated_at`                      |
| `update_location_point`  | posts                             | Calcule `location_point` depuis lat/lng      |
| `update_posts_count`     | posts                             | Incrémente/décrémente `profiles.posts_count` |
| `update_likes_count`     | reactions                         | Met à jour `posts.likes_count`               |
| `update_comments_count`  | comments                          | Met à jour `posts.comments_count`            |
| `update_followers_count` | follows                           | Met à jour les compteurs follows             |

## Conventions

- **Nommage** : snake_case pour les tables et colonnes SQL, camelCase pour TypeScript
- **IDs** : UUID v4 partout
- **Dates** : TIMESTAMPTZ (UTC), ISO 8601 côté client
- **Soft delete** : Via `status = 'archived'` (pas de suppression physique)
- **Compteurs** : Dénormalisés sur les tables parentes, maintenus par triggers
- **Recherche géo** : PostGIS GEOGRAPHY pour les requêtes `ST_DWithin`
- **Éco-conception** : Pagination obligatoire (max 20 items), images < 800KB WebP
