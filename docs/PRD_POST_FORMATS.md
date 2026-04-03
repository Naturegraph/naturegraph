# PRD — Format des posts & composant FeedPost (Naturegraph)

> **Statut** : Validé — MVP Sprint 2
> **Auteur** : Nicolas Larrousse
> **Date** : 2026-04-02
> **Version** : 2.0 — Consolidation anatomie composant + specs images + data

---

## 1. Vue d'ensemble

Naturegraph distingue deux formats de posts. Chaque format a ses propres champs requis, règles de validation, et rendu dans le feed.

| Format               | ID DB              | Intention                                         | Icône      | Couleur           | Statut      |
| -------------------- | ------------------ | ------------------------------------------------- | ---------- | ----------------- | ----------- |
| **Rencontre nature** | `nature_encounter` | Observation documentée d'une ou plusieurs espèces | `Bird`     | `--color-success` | ✅ MVP      |
| **Instant nature**   | `nature_instant`   | Capture spontanée : paysage, phénomène, ambiance  | `Mountain` | `--color-warning` | 🔜 Sprint 3 |

> **Design tokens** — ne jamais utiliser de couleurs en dur :
>
> - Rencontre nature : fond `var(--color-success-bg)` · icône `var(--color-success)` · #00673F / #C7F2DF
> - Instant nature : fond `var(--color-warning-bg)` · icône `var(--color-warning)` · #6C350D / #FEE1C8

---

## 2. Anatomie du composant FeedPost

Le composant `FeedPost` est la brique centrale du feed. Il est composé de 3 zones distinctes : Header, Body, Footer.

```
┌─────────────────────────────────────────────┐
│ HEADER                                      │
│ [Avatar] Nom · Intérêt principal            │
│ [🌿 Type post]  Date · Lieu (si public)    │
│                                        [···]│
├─────────────────────────────────────────────┤
│ BODY                                        │
│ ┌─────────────────────────────────────────┐ │
│ │ IMAGE SLIDER (1 à 4 photos)             │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Titre (si renseigné)                        │
│ Description (tronquée 3 lignes)  [Voir plus]│
│                                             │
│ [🌤 Météo] [🕐 Moment] [🌲 Habitat]         │
│ [🦅 Espèce] [🦅 Espèce 2] [+N]             │
├─────────────────────────────────────────────┤
│ FOOTER                                      │
│ [❤ 14] [⭐ 5] [🔥 42]   [💬 8]  [🔖] [↗]  │
└─────────────────────────────────────────────┘
```

### 2.1 Header

| Élément                | Détail                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------- |
| **Photo de profil**    | Avatar 36×36px, rounded-full                                                       |
| **Nom**                | `username`, font-bold, lien vers `/profile/:username`                              |
| **Intérêt principal**  | Badge discret avec emoji de catégorie (ex : 🦅 Oiseaux)                            |
| **Badge type de post** | Icône + label textuel (ex : "Rencontre nature"), fond coloré selon token DS        |
| **Date**               | Format relatif (ex : "il y a 2 jours"), `<time datetime="...">` pour a11y          |
| **Localisation**       | Affichée uniquement si `location_hidden = false` — texte "Lieu approximatif" sinon |
| **Menu actions**       | Icône `···` (Ellipsis), ouvre bottom sheet : Signaler, Masquer, Partager           |

> **Accessibilité** : le badge type de post doit toujours avoir un label textuel visible, pas seulement une icône.

### 2.2 Body

#### Description

- Courte (≤ 3 lignes CSS / ~200 caractères) → affichée en entier
- Longue → tronquée avec `line-clamp-3` + bouton **"Voir plus"** inline
- Replié avec **"Voir moins"** (même ligne, même style)
- Bouton `type="button"`, `aria-expanded`, pas de rechargement de page

#### Métadonnées contextuelles

Affichées uniquement si renseignées (chips discrets) :

- Type d'habitat · Conditions météo · Moment de la journée

#### Badges espèces (`nature_encounter` uniquement)

- 1 espèce → badge unique avec nom vernaculaire + nombre d'individus si > 1
- 2–3 espèces → badges côte à côte (max 3 visibles)
- 4+ espèces → "3 espèces + N autres"
- Espèce inconnue → badge "Mystère 🔍" + badge "Aide demandée" si `helpIdentification = true`
- `aria-label` avec nom complet sur chaque badge

#### Tags

Catégorie taxonomique · Nom vernaculaire (FR) · Nombre d'individus

### 2.3 Footer

| Zone       | Contenu                                                        |
| ---------- | -------------------------------------------------------------- |
| **Gauche** | Réactions : ❤ (love) · ⭐ (admire) · 🔥 (fire) — avec compteur |
| **Centre** | Commentaires : icône `MessageCircle` + compteur                |
| **Droite** | Enregistrer (`Bookmark`) · Partager via lien (`Share2`)        |

**Règles réactions :**

- Compteur toujours affiché (afficher "0", ne pas masquer)
- État `aria-pressed` sur chaque bouton réaction
- Animation scale + color change au clic — respecte `prefers-reduced-motion: reduce`
- Icônes : `Heart` (love) · `Star` (admire) · `Flame` (fire) — lucide-react

---

## 3. ImageSlider — Spécifications complètes

### 3.1 Formats disponibles

Sélectionné par l'utilisateur à l'étape 1 du formulaire :

| Format       | Ratio  | Usage                         | Par défaut |
| ------------ | ------ | ----------------------------- | ---------- |
| **Paysage**  | `16:9` | Scène nature, paysage large   | ✅ Oui     |
| **Portrait** | `3:4`  | Macro, oiseau, plante dressée | Non        |
| **Carré**    | `1:1`  | Ambiance symétrique, détail   | Non        |

**Règle stricte** : un post = un seul format. Aucun mélange de ratios autorisé. Valable pour 1, 2, 3 ou 4 images.

### 3.2 Grille d'affichage selon nombre d'images

| Nb images | Mise en page                                         | Notes                                     |
| --------- | ---------------------------------------------------- | ----------------------------------------- |
| **1**     | Plein cadre centré · fond `var(--color-bg-tertiary)` | Max-height : 480px desktop / 320px mobile |
| **2**     | Côte à côte · ratio `aspect-[4/3]` chacune           | Gap 2px                                   |
| **3**     | Grande gauche (2/3 largeur) + 2 petites droite (1/3) | Gap 2px                                   |
| **4**     | Grille 2×2 égale · badge "+N" sur dernière si N > 4  | Gap 2px                                   |

**Image unique — règles spécifiques :**

- Image centrée dans le composant (object-fit: cover, object-position: center)
- Fond appliqué : `var(--color-bg-tertiary)` (#FFF4E0 light, adapté dark mode)
- Objectif : maintenir l'équilibre visuel et la cohérence du design global

### 3.3 Carrousel (mobile)

- Implémentation CSS native (`scroll-snap`, `overflow-x: auto`) — zéro dépendance JS
- Prochaine image partiellement visible : `peek-width: 24px` (incitation à swiper)
- `overflow-hidden` sur le conteneur parent
- Indicateurs de position : dots ou trait en bas du carrousel
- `aria-label` sur le conteneur : "Galerie de N photos"

### 3.4 Alt text

Format auto-généré si non fourni par l'utilisateur :

```
"Observation de {species_name} à {location_name}"
"Photo de nature à {location_name}"  // fallback si pas d'espèce
"Photo {index+1} sur {total}"        // fallback ultime
```

Le champ alt est **obligatoire** — WCAG AA exige qu'aucune image ne soit sans description.

---

## 4. Formats de posts — Champs & validation

### 4.1 Rencontre nature (`nature_encounter`)

#### Intention UX

Documenter une sortie nature avec rigueur citoyenne : quand, où, quelles espèces, combien d'individus, dans quel contexte. Les données alimentent la base de biodiversité communautaire et peuvent être valorisées scientifiquement.

#### Flow de création — 3 étapes

```
Étape 1 — Photos        →  Étape 2 — Espèces       →  Étape 3 — Contexte
(optionnel, max 4)          (≥ 1 observation)           (titre + lieu requis)
```

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

**Valeurs habitat :** `forest` | `park_garden` | `prairie_heath` | `urban` | `river` | `lake_wetland` | `mountain` | `sea_coast`

### 4.2 Instant nature (`nature_instant`)

> **Statut** : Prévu Sprint 3 — form non implémenté (route disponible : `/contribute?type=nature_instant`)

#### Intention UX

Partage rapide d'un moment nature sans identification d'espèce. Paysage, phénomène météo, ambiance sonore, coucher de soleil…

#### Champs

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

## 5. Qualité & optimisation des images

### 5.1 Objectif

Garantir une qualité visuelle maximale tout en respectant le budget de performance éco-conception (< 500 KB total/page).

### 5.2 Pipeline de compression

La compression est gérée côté serveur via **Supabase Storage Transform** (query params). Aucun traitement côté client.

| Étape           | Responsable            | Cible                                     |
| --------------- | ---------------------- | ----------------------------------------- |
| Upload          | Client                 | Max 10 MB, WebP/JPEG/PNG acceptés         |
| Stockage origin | Supabase Storage       | Fichier original conservé (non modifié)   |
| Serving         | Supabase Transform URL | `?width=1200&quality=85&format=webp`      |
| Résultat cible  | —                      | ≤ 800 KB par image, qualité haute visible |

**Paramètres Supabase Transform selon format :**

```
Paysage (16:9) : width=1200, height=675,  quality=85, format=webp
Portrait (3:4) : width=900,  height=1200, quality=85, format=webp
Carré   (1:1)  : width=1200, height=1200, quality=85, format=webp
Miniature      : width=400,  height=auto, quality=80, format=webp
```

> La compression doit être **invisible pour l'utilisateur** — aucune pixelisation ni dégradation visible.

### 5.3 Responsive & lazy loading

- `loading="lazy"` sur toutes les images hors premier écran
- Dimensions explicites (`width`, `height`) obligatoires pour éviter le layout shift (CLS)
- `srcset` avec 2 résolutions minimum (1x / 2x) pour les écrans Retina
- Respect strict du ratio choisi par l'utilisateur (`aspect-ratio` CSS)

---

## 6. États du composant

| État             | Comportement                                              |
| ---------------- | --------------------------------------------------------- |
| **Chargement**   | Skeleton loader (pulse animation) sur toutes les zones    |
| **Erreur image** | Placeholder gris avec icône `ImageOff` lucide + texte alt |
| **Vide (feed)**  | Composant non affiché — géré par le parent                |
| **Sans photos**  | Body sans zone image, titre + description en premier      |

---

## 7. Schéma DB — Delta requis (multi-observations)

### 7.1 Problème actuel

Le schéma actuel de la table `posts` stocke **une seule espèce par post** :

```sql
species_name      VARCHAR(255)
scientific_name   VARCHAR(255)
taxonomic_group   VARCHAR(20)
taxref_id         VARCHAR(50)
```

Le nouveau form `nature_encounter` (Sprint 2) supporte **plusieurs espèces par rencontre**. Il faut une table de jointure.

### 7.2 Nouvelle table — `post_observations`

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
  is_unknown      BOOLEAN      NOT NULL DEFAULT FALSE,
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

### 7.3 Champs à conserver / déprécier sur `posts`

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

### 7.4 Mise à jour TypeScript — `database.ts`

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

### 7.5 Fichier migration SQL

```
supabase/migrations/20260402_post_observations.sql
```

---

## 8. Contraintes éco-conception

| Contrainte                | Valeur                                          |
| ------------------------- | ----------------------------------------------- |
| Max photos par post       | 4 (limite stricte, pas de carousel infini)      |
| Max taille photo upload   | 10 MB                                           |
| Max taille photo servie   | ≤ 800 KB (WebP, quality=85, Supabase Transform) |
| Max observations par post | 10 espèces                                      |
| Max tags                  | 5                                               |
| Max description           | 1500 caractères                                 |
| Pagination feed           | 20 posts par requête                            |
| Carrousel                 | CSS scroll-snap natif (0 dépendance JS)         |
| PostGIS index             | ST_DWithin pour requêtes géo-filtrées           |

---

## 9. Accessibilité — checklist

- [ ] Photos : `alt` descriptif obligatoire (auto-généré : "Observation de {species} à {location}" si vide)
- [ ] Carrousel : `aria-label="Galerie de N photos"` sur le conteneur
- [ ] Badges espèces : `aria-label` avec nom complet lisible par lecteur d'écran
- [ ] Boutons réactions : `aria-label`, `aria-pressed`
- [ ] Badge type de post : label textuel visible (pas seulement icône)
- [ ] Description "Voir plus" : `aria-expanded` sur le bouton toggle
- [ ] Lieu masqué : texte visible "Lieu approximatif" (pas seulement icône)
- [ ] Formulaire 3 étapes : `aria-live` pour annoncer changement d'étape
- [ ] Animations réactions : respecte `prefers-reduced-motion: reduce`
- [ ] Images erreur : placeholder avec `role="img"` et texte alternatif

---

## 10. Attribution TAXREF

Toute espèce identifiée via TAXREF doit afficher l'attribution INPN :

```
Source : TAXREF v17 — INPN / Muséum national d'Histoire naturelle
Licence : CC-BY
```

Affiché dans la page détail du post. Non requis dans le feed (sobriété).

---

## 11. Responsabilités

| Rôle                      | Responsabilités                                                         |
| ------------------------- | ----------------------------------------------------------------------- |
| **UX**                    | Lisibilité, interactions, cohérence des états, flux formulaire          |
| **UI**                    | Pixel-perfect, respect design system, tokens couleur, dark mode         |
| **Dev Full Stack**        | ImageSlider, compression Supabase, factorisation composants, migrations |
| **PM**                    | Consolidation PRD, arbitrage scope, priorisation sprint                 |
| **Lead Product Designer** | Validation finale avant implémentation et avant merge vers staging      |

---

## 12. Évolutions futures (hors MVP)

| Feature                            | Sprint | Notes                                     |
| ---------------------------------- | ------ | ----------------------------------------- |
| Instant nature form                | 3      | UI à concevoir, route déjà en place       |
| Import EXIF → pré-remplissage      | 3      | Date, GPS depuis métadonnées photo        |
| Identification collaborative       | 3–4    | Proposals + votes sur espèces inconnues   |
| Export Darwin Core (GBIF)          | 4      | Format standard biodiversité              |
| Vidéo (max 60s)                    | 4      | Type media `video`, transcode Supabase    |
| Validation expert                  | 5      | Rôle "expert" peut valider identification |
| Retour haptique mobile (réactions) | 4      | Vibration API sur mobile                  |
