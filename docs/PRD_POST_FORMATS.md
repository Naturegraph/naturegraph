# PRD — Formats de posts Naturegraph

> **Statut** : Validé — MVP Sprint 2
> **Auteur** : Nicolas Larrousse
> **Date** : 2026-04-02
> **Version** : 1.0

---

## 1. Vue d'ensemble

Naturegraph distingue deux formats de posts. Chaque format a ses propres champs requis, règles de validation, et rendu dans le feed.

| Format               | ID DB              | Intention                                         | Statut      |
| -------------------- | ------------------ | ------------------------------------------------- | ----------- |
| **Rencontre nature** | `nature_encounter` | Observation documentée d'une ou plusieurs espèces | ✅ MVP      |
| **Instant nature**   | `nature_instant`   | Capture spontanée : paysage, phénomène, ambiance  | 🔜 Sprint 3 |

---

## 2. Format : Rencontre nature (`nature_encounter`)

### 2.1 Intention UX

Documenter une sortie nature avec rigueur citoyenne : quand, où, quelles espèces, combien d'individus, dans quel contexte. Les données alimentent la base de biodiversité communautaire et peuvent être valorisées scientifiquement.

### 2.2 Flow de création — 3 étapes

```
Étape 1 — Photos        →  Étape 2 — Espèces       →  Étape 3 — Contexte
(optionnel, max 4)          (≥ 1 observation)           (titre + lieu requis)
```

### 2.3 Champs requis / optionnels

#### Étape 1 — Photos

| Champ          | Type   | Requis | Contraintes                         | Notes                           |
| -------------- | ------ | ------ | ----------------------------------- | ------------------------------- |
| `photos`       | File[] | Non    | Max 4 photos, max 10 MB/photo       | WebP/JPEG/PNG acceptés          |
| `aspect_ratio` | enum   | Non    | `landscape` / `portrait` / `square` | Visible seulement si photos > 0 |

#### Étape 2 — Espèces observées

| Champ                      | Type                | Requis | Contraintes              | Notes                                         |
| -------------------------- | ------------------- | ------ | ------------------------ | --------------------------------------------- |
| `observations`             | ObservationEntry[]  | Oui    | Min 1, max 10 espèces    | Au moins 1 entrée avant de passer à l'étape 3 |
| `observations[].species`   | TaxrefMatch \| null | Non    | null si isUnknown = true | Recherche TAXREF (autocomplete)               |
| `observations[].isUnknown` | boolean             | Non    | true = "Je ne sais pas"  | Déclenche badge "Mystère"                     |
| `observations[].count`     | integer             | Non    | 1–999, défaut = 1        | Nombre d'individus observés                   |
| `helpIdentification`       | boolean             | Non    | Défaut false             | Demande aide communauté                       |

#### Étape 3 — Contexte & détails

| Champ             | Type     | Requis | Contraintes                                  | Notes                           |
| ----------------- | -------- | ------ | -------------------------------------------- | ------------------------------- |
| `title`           | string   | Oui    | 3–100 caractères                             | Titre de la rencontre           |
| `description`     | string   | Non    | Max 1500 caractères                          | Récit libre                     |
| `encounter_date`  | date     | Non    | ≤ aujourd'hui                                | Défaut = aujourd'hui            |
| `time_of_day`     | enum     | Non    | morning / afternoon / dusk / evening / night | —                               |
| `weather`         | enum     | Non    | sunny / cloudy / rainy / windy / snowy       | —                               |
| `habitat`         | enum     | Non    | Voir liste ci-dessous                        | —                               |
| `location_name`   | string   | Oui    | Saisie ou géolocalisation                    | Nom du lieu (ville, site, etc.) |
| `latitude`        | decimal  | Non    | —                                            | Prérempli si géoloc acceptée    |
| `longitude`       | decimal  | Non    | —                                            | —                               |
| `location_hidden` | boolean  | Non    | Défaut false                                 | Masque les coordonnées exactes  |
| `tags`            | string[] | Non    | Max 5 tags, max 30 chars/tag                 | —                               |
| `visibility`      | enum     | Non    | public / followers / private, défaut public  | —                               |

#### Valeurs habitat acceptées

`forest` | `park_garden` | `prairie_heath` | `urban` | `river` | `lake_wetland` | `mountain` | `sea_coast`

### 2.4 Rendu dans le feed — FeedPost

Un post `nature_encounter` affiche :

```
┌─────────────────────────────────────┐
│ [Avatar] Nom · Date · Lieu          │
│                                     │
│ [Photos — grille 1/2/3/4]          │
│                                     │
│ Titre du post                       │
│ Description (tronquée 3 lignes)     │
│                                     │
│ [🌤 Météo] [🕐 Moment] [🌲 Habitat] │
│ [🦅 Espèce(s) — badge(s)]           │
│                                     │
│ [❤️ 14] [🔥 42] [💬 8] [🔖] [↗️]   │
└─────────────────────────────────────┘
```

**Règles d'affichage espèces :**

- 1 espèce → badge unique avec nom vernaculaire + nombre d'individus si > 1
- 2–3 espèces → badges empilés (max 3 visibles)
- 4+ espèces → "3 espèces + N autres"
- Espèce inconnue → badge "Mystère 🔍" avec badge "Aide demandée" si `helpIdentification = true`

**Format photo (ImageSlider) :**

- 1 image → plein cadre, ratio selon `aspect_ratio` (`16:9`, `3:4`, `1:1`)
- 2 images → côte à côte, `aspect-[4/3]`
- 3 images → grande gauche (2/3) + 2 petites droite (1/3)
- 4+ images → grille 2×2 avec badge "+N" sur la dernière

---

## 3. Format : Instant nature (`nature_instant`)

> **Statut** : Prévu Sprint 3 — form non implémenté (route disponible : `/contribute?type=nature_instant`)

### 3.1 Intention UX

Partage rapide d'un moment nature sans identification d'espèce. Paysage, phénomène météo, ambiance sonore, coucher de soleil…

### 3.2 Champs (définition préliminaire)

| Champ             | Type     | Requis | Notes                          |
| ----------------- | -------- | ------ | ------------------------------ |
| `photos`          | File[]   | Non    | Max 4, même contraintes        |
| `phenomenon`      | string   | Non    | Description libre du phénomène |
| `title`           | string   | Oui    | 3–100 caractères               |
| `description`     | string   | Non    | Max 1500 caractères            |
| `encounter_date`  | date     | Non    | Défaut aujourd'hui             |
| `location_name`   | string   | Oui    | —                              |
| `location_hidden` | boolean  | Non    | —                              |
| `tags`            | string[] | Non    | —                              |
| `visibility`      | enum     | Non    | —                              |

**Pas de champ espèce, pas d'identification.** Pas de badge taxonomique dans le feed.

---

## 4. Schéma DB — Delta requis (multi-observations)

### 4.1 Problème actuel

Le schéma actuel de la table `posts` stocke **une seule espèce par post** :

```sql
species_name      VARCHAR(255)
scientific_name   VARCHAR(255)
taxonomic_group   VARCHAR(20)
taxref_id         VARCHAR(50)
```

Le nouveau form `nature_encounter` (Sprint 2) supporte **plusieurs espèces par rencontre**. Il faut une table de jointure.

### 4.2 Nouvelle table — `post_observations`

```sql
CREATE TABLE post_observations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  -- Identification espèce
  species_name    VARCHAR(255),         -- Nom vernaculaire
  scientific_name VARCHAR(255),         -- Nom scientifique latin
  taxref_id       VARCHAR(50),          -- Code TAXREF (cd_nom)
  taxref_rank     VARCHAR(50),
  taxref_source   VARCHAR(500),
  taxref_license  VARCHAR(50)  DEFAULT 'CC-BY INPN',
  taxonomic_group VARCHAR(20)
    CHECK (taxonomic_group IN ('birds','mammals','insects','amphibians',
                               'reptiles','arachnids','mollusks','fish',
                               'plants','other')),
  -- Statut identification
  is_unknown      BOOLEAN      NOT NULL DEFAULT FALSE, -- "Je ne sais pas"
  identification_status VARCHAR(20) DEFAULT 'pending'
    CHECK (identification_status IN ('identified','pending','disputed')),
  -- Quantité
  individual_count INTEGER      DEFAULT 1 CHECK (individual_count >= 1),
  -- Ordre de saisie
  display_order    INTEGER      NOT NULL DEFAULT 0,
  -- Timestamps
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Index
CREATE INDEX post_observations_post_id_idx ON post_observations(post_id);
CREATE INDEX post_observations_taxref_idx ON post_observations(taxref_id);

-- RLS
ALTER TABLE post_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_observations_select" ON post_observations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_observations.post_id
        AND (p.visibility = 'public' OR p.user_id = auth.uid())
    )
  );
CREATE POLICY "post_observations_insert" ON post_observations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_observations.post_id AND p.user_id = auth.uid())
  );
CREATE POLICY "post_observations_delete" ON post_observations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_observations.post_id AND p.user_id = auth.uid())
  );
```

### 4.3 Champs à conserver / déprécier sur `posts`

| Champ sur `posts`       | Action                                                | Raison                                           |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| `species_name`          | **Déprécié** — garder pour rétro-compat migration     | Remplacé par `post_observations`                 |
| `scientific_name`       | **Déprécié** — idem                                   | —                                                |
| `taxonomic_group`       | **Garder** — dénormalisé                              | Premier groupe taxonomique, pour filtres feed    |
| `identification_status` | **Garder** — dénormalisé                              | Statut global du post (au moins 1 obs = pending) |
| `multiple_observations` | **Déprécié** → remplacer par COUNT(post_observations) | Redondant                                        |
| `species_identified`    | **Garder** — dénormalisé                              | true si toutes obs identifiées, pour badge feed  |
| `taxref_id`             | **Déprécié** sur `posts`                              | Porté par `post_observations`                    |
| `phenomenon`            | **Garder** — nature_instant                           | Pas de table séparée nécessaire                  |

### 4.4 Mise à jour TypeScript — `database.ts`

Ajouter l'interface `PostObservation` :

```typescript
export interface PostObservation {
  id: string
  post_id: string
  species_name: string | null
  scientific_name: string | null
  taxref_id: string | null
  taxref_rank: string | null
  taxref_source: string | null
  taxref_license: string | null
  taxonomic_group: TaxonomicGroup | null
  is_unknown: boolean
  identification_status: IdentificationStatus
  individual_count: number
  display_order: number
  created_at: string
}
```

### 4.5 Fichier migration SQL

```
supabase/migrations/20260402_post_observations.sql
```

---

## 5. Contraintes éco-conception

| Contrainte                | Valeur                                        |
| ------------------------- | --------------------------------------------- |
| Max photos par post       | 4 (limite stricte, pas de carousel infini)    |
| Max taille photo          | 10 MB upload → compressé WebP ≤ 800 KB stocké |
| Max observations par post | 10 espèces                                    |
| Max tags                  | 5                                             |
| Max description           | 1500 caractères                               |
| Pagination feed           | 20 posts par requête                          |
| PostGIS index             | ST_DWithin pour requêtes géo-filtrées         |

---

## 6. Accessibilité — checklist

- [ ] Photos : `alt` descriptif obligatoire (auto-généré : "Observation de {species} à {location}" si vide)
- [ ] Badges espèces : lisibles par lecteur d'écran (`aria-label` avec nom complet)
- [ ] Boutons réactions : `aria-label`, `aria-pressed`
- [ ] Formulaire 3 étapes : `aria-live` pour annoncer changement d'étape
- [ ] Lieu masqué : texte visible "Lieu approximatif" (pas seulement icône)

---

## 7. Attribution TAXREF

Toute espèce identifiée via TAXREF doit afficher l'attribution INPN :

```
Source : TAXREF v17 — INPN / Muséum national d'Histoire naturelle
Licence : CC-BY
```

Affiché dans la page détail du post. Non requis dans le feed (pour sobriété).

---

## 8. Évolutions futures (hors MVP)

| Feature                              | Sprint | Notes                                     |
| ------------------------------------ | ------ | ----------------------------------------- |
| Identification collaborative         | 3–4    | Proposals + votes sur espèces inconnues   |
| Export Darwin Core (GBIF)            | 4      | Format standard biodiversité              |
| Validation expert                    | 5      | Rôle "expert" peut valider identification |
| Import photos EXIF → pré-remplissage | 3      | Date, GPS depuis métadonnées photo        |
| Vidéo (max 60s)                      | 4      | Type media `video`, transcode Supabase    |
| Instant nature form                  | 3      | UI à concevoir, route déjà en place       |
