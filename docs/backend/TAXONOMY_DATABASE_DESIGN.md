# Taxonomy Database Design

> Source de verite pour la structure des donnees taxonomiques de Naturegraph.
> Conception evolutive : permettre d ajouter des fields (statuts conservation,
> regulation, migration patterns) sans casser l existant.
>
> **Version** : 1.0 (initialise 2026-05-26 pour V1.1.0)
> **Auteur** : Nicolas + Claude
> **Statut** : Source de verite active

---

## 1. Objectif

Stocker une hierarchie taxonomique mondiale (extension France + Canada
prioritaires) pour permettre aux utilisateurs de Naturegraph de :

- Tagguer un post avec une **espece precise** (rang `species`)
- Si l espece n est pas trouvee, tagguer avec la **famille** ou l **ordre**
- Filtrer le feed par classe (Oiseaux, Mammiferes, etc.)
- Voir des informations contextuelles (statut conservation, migration, etc.)
  au fil du temps sans casser les posts existants

---

## 2. Principes de conception

### 2.1 Hierarchie unifiee (single source of truth)

Une seule table `taxonomy_nodes` contient tous les rangs :

```
kingdom > phylum > class > order > family > genus > species > subspecies
```

Chaque node a un `rank` (TEXT avec CHECK constraint, pas ENUM) et un
`parent_id` (self-FK). Permet :

- Tagguer un post a n importe quel rang (la colonne `posts.taxonomy_node_id`
  est une FK simple)
- Recherche unifiee via `search_taxonomy()` qui retourne especes + familles
  - ordres selon les ranks demandes
- Filtrage natif par class/order/family via colonnes denormalisees

### 2.2 Denormalisation controlee

Les colonnes `kingdom`, `phylum`, `class`, `"order"`, `family`, `genus`
sont denormalisees sur chaque node pour eviter des CTE recursives lentes
dans les queries du feed. Les inserts sont massifs et infrequents (re-seed
periodique), les selects sont massifs et frequents : optimisons les selects.

### 2.3 Extensibilite par JSONB + tables annexes

Pour anticiper l ajout futur de fields **sans migration cassante** :

- **`metadata` JSONB** : champ flexible, indexable via GIN. Permet de stocker
  des donnees evolutives sans toucher au schema (statuts de conservation,
  habitats, patterns saisonniers).
- **Tables annexes 1-to-many** : pour des donnees structurees avec leur
  propre cycle de vie (ex: `taxonomy_conservation_assessments` avec date
  d evaluation, autorite, source). Ajoutees plus tard, sans toucher
  `taxonomy_nodes`.

### 2.4 Versioning des donnees sources

- `data_version` : ex `TAXREF_v17`, `iNat_2026-05`. Permet de re-seed sans
  perdre la trace de l origine.
- `data_source` : ex `TAXREF`, `iNaturalist`, `GBIF`, `manual`. Audit trail.

### 2.5 Politique de migration

**Reglle d or : additif only.** Ne jamais retirer une colonne ou changer le
type d une colonne existante. Les changements de structure se font en :

1. Ajouter une nouvelle colonne (NULLABLE ou DEFAULT)
2. Backfill progressif via script
3. Si remplacement : garder l ancienne colonne marquee deprecated 1 cycle
   (3-6 mois) puis DROP

---

## 3. Schema actuel (V1.1.0)

### 3.1 Table `taxonomy_nodes`

| Colonne           | Type          | Description                                                                       |
| ----------------- | ------------- | --------------------------------------------------------------------------------- |
| `id`              | UUID PK       | Identifiant unique                                                                |
| `rank`            | TEXT CHECK    | `kingdom`, `phylum`, `class`, `order`, `family`, `genus`, `species`, `subspecies` |
| `scientific_name` | TEXT NOT NULL | Nom scientifique latin (ex: `Calopteryx virgo`)                                   |
| `common_name_fr`  | TEXT          | Nom vernaculaire francais (ex: `Calopteryx vierge`)                               |
| `common_name_en`  | TEXT          | Nom vernaculaire anglais                                                          |
| `parent_id`       | UUID FK self  | Node parent dans la hierarchie                                                    |
| `kingdom`         | TEXT          | `Animalia`, `Plantae`, etc. (denormalise)                                         |
| `phylum`          | TEXT          | `Chordata`, `Arthropoda` (denormalise)                                            |
| `class`           | TEXT          | `Aves`, `Mammalia`, `Amphibia`, `Reptilia`, `Insecta` (denormalise)               |
| `"order"`         | TEXT          | `Passeriformes`, `Odonata` (denormalise)                                          |
| `family`          | TEXT          | `Corvidae`, `Calopterygidae` (denormalise)                                        |
| `genus`           | TEXT          | Genre (denormalise)                                                               |
| `gbif_taxon_key`  | BIGINT        | Cle GBIF Backbone (unique partielle)                                              |
| `inpn_taxref_id`  | TEXT          | CD_NOM TAXREF (France)                                                            |
| `inaturalist_id`  | INTEGER       | Taxon ID iNaturalist                                                              |
| `available_in_fr` | BOOLEAN       | Present sur le territoire francais                                                |
| `available_in_ca` | BOOLEAN       | Present sur le territoire canadien                                                |
| `photo_url`       | TEXT          | URL d une photo illustrative (Wikimedia, GBIF)                                    |
| `description_fr`  | TEXT          | Description courte FR                                                             |
| `description_en`  | TEXT          | Description courte EN                                                             |
| `synonyms`        | TEXT[]        | Synonymes scientifiques connus                                                    |
| `popularity`      | INTEGER       | Score popularite (occurrences GBIF/iNat) pour ranking search                      |
| `is_active`       | BOOLEAN       | Soft delete                                                                       |
| `metadata`        | JSONB         | **Extensible** : statuts, migration, habitats, etc.                               |
| `data_version`    | TEXT          | Ex `TAXREF_v17`, `iNat_2026-05`                                                   |
| `data_source`     | TEXT          | Ex `TAXREF`, `iNaturalist`, `GBIF`, `manual`                                      |
| `created_at`      | TIMESTAMPTZ   |                                                                                   |
| `updated_at`      | TIMESTAMPTZ   | Auto via trigger                                                                  |

**Contraintes** :

- `UNIQUE (rank, scientific_name)` : un meme nom scientifique ne peut pas
  exister deux fois au meme rang
- `UNIQUE (gbif_taxon_key) WHERE gbif_taxon_key IS NOT NULL`

### 3.2 Indexes

- B-tree : `rank`, `parent_id`, `class`, `"order"`, `family`, `inpn_taxref_id`
- Partial B-tree : `available_in_fr WHERE TRUE`, `available_in_ca WHERE TRUE`
- GIN trigram : `scientific_name`, `common_name_fr`, `common_name_en`
  (pour autocomplete fuzzy avec `pg_trgm`)
- GIN JSONB : `metadata` (pour queries `WHERE metadata->'conservation'->>'iucn' = 'EN'`)

### 3.3 RLS policies

- `public_read_taxonomy` : `FOR SELECT USING (true)` — catalogue ouvert a
  tous (anon + authenticated)
- `admin_write_taxonomy` : `FOR ALL USING (is_admin(auth.uid()))` — seuls
  les admins peuvent modifier (corrections manuelles). Les seeds passent
  par `service_role` qui bypass RLS.

### 3.4 RPC `search_taxonomy()`

Signature :

```sql
search_taxonomy(
  p_query TEXT,
  p_territory TEXT DEFAULT NULL,        -- 'fr', 'ca' ou NULL
  p_ranks TEXT[] DEFAULT ARRAY['species','family','order'],
  p_class_filter TEXT DEFAULT NULL,     -- 'Aves', 'Mammalia', etc.
  p_max_results INTEGER DEFAULT 20
) RETURNS TABLE (id, rank, scientific_name, common_name_fr, common_name_en,
                 class, "order", family, photo_url, popularity, match_score)
```

Ordre de tri : especes d abord, puis genres, familles, ordres. Puis par
`match_score` (similarity trigram) puis `popularity`.

---

## 4. Conventions metadata (JSONB)

Voici les patterns recommandes pour stocker les futures donnees dans
`metadata`. **Tous optionnels** — ajoutes au fil du besoin.

### 4.1 Migration et phenologie

```json
{
  "migration": {
    "fr": {
      "status": "Pc",
      "label": "Migrateur partiel",
      "season": ["spring", "fall"],
      "wintering": "Afrique subsaharienne"
    },
    "ca": {
      "establishment": "native",
      "breeding_status": "summer_breeder",
      "wintering": "Amerique centrale"
    }
  }
}
```

Codes TAXREF (`metadata.migration.fr.status`) :

- `P` : Present (resident)
- `Pc` : Presence cyclique (migrateur saisonnier)
- `B` : Reproduction (espece qui se reproduit sur le territoire)
- `W` : Hivernant
- `C` : Cantonnement (population partielle)
- `E` : Endemique
- `I` : Introduit
- `D` : Disparu

### 4.2 Statuts de conservation (a venir)

```json
{
  "conservation": {
    "iucn_global": {
      "status": "LC",
      "label": "Least Concern",
      "year": 2024,
      "url": "https://www.iucnredlist.org/species/..."
    },
    "iucn_fr": {
      "status": "VU",
      "label": "Vulnerable",
      "year": 2023,
      "source": "Liste rouge UICN France"
    },
    "cosewic": {
      "status": "SC",
      "label": "Special Concern",
      "year": 2023,
      "source": "COSEWIC Canada"
    },
    "sara": {
      "schedule": "1",
      "status": "Threatened",
      "year": 2023,
      "url": "https://laws-lois.justice.gc.ca/eng/acts/S-15.3/"
    }
  }
}
```

### 4.3 Protection regulation

```json
{
  "protection": {
    "fr": {
      "code_environnement": "Article L411-1",
      "arrete": "Arrete du 29 octobre 2009",
      "level": "protection_integrale",
      "url": "https://www.legifrance.gouv.fr/..."
    },
    "ca": {
      "provincial": { "QC": "Liste des espèces vulnérables" },
      "federal": "Loi sur les espèces en péril (LEP)"
    }
  }
}
```

### 4.4 Habitats

```json
{
  "habitats": ["foret_caduque", "zones_humides", "milieu_urbain"],
  "altitude_min_m": 0,
  "altitude_max_m": 2500
}
```

### 4.5 Comportement / Biologie

```json
{
  "biology": {
    "diet": ["insectivore", "frugivore"],
    "lifespan_years": 12,
    "clutch_size": [4, 6],
    "activity": "diurnal"
  }
}
```

---

## 5. Tables annexes prevues (NON CREEES, planifiees)

Quand un domaine de donnees devient assez structure et frequent, on le
sort de `metadata` JSONB vers une table dediee. Pattern type :

### 5.1 `taxonomy_conservation_assessments` (futur)

```sql
CREATE TABLE public.taxonomy_conservation_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_node_id UUID NOT NULL REFERENCES public.taxonomy_nodes(id) ON DELETE CASCADE,
  authority TEXT NOT NULL CHECK (authority IN (
    'IUCN_GLOBAL', 'IUCN_FR', 'COSEWIC', 'SARA', 'INPN_LRR'
  )),
  status_code TEXT NOT NULL,    -- LC, NT, VU, EN, CR, EX, DD, NE...
  status_label TEXT,
  assessment_date DATE,
  source_url TEXT,
  notes TEXT,
  is_current BOOLEAN DEFAULT TRUE,  -- false pour archives historiques
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_conservation_node ON public.taxonomy_conservation_assessments(taxonomy_node_id);
CREATE INDEX idx_conservation_current ON public.taxonomy_conservation_assessments(taxonomy_node_id, authority) WHERE is_current;
```

Avantage vs JSONB : historique versionne par autorite, requetable
relationnel (joins efficaces), peut etre seed via pipeline dedie.

### 5.2 `taxonomy_observation_phenology` (futur)

Pour stocker les patterns saisonniers d observations (mois ou l espece
est observable, etc.) par territoire. Plus pertinent quand on aura ~1M
posts pour calculer des stats reelles.

### 5.3 `taxonomy_habitats` (futur)

Si les habitats deviennent un filtre majeur (ex: cartographier les
especes par habitat), sortir de metadata vers une table dediee avec
classification standard (ex: IUCN Habitats Classification Scheme).

---

## 6. Strategie de seed

### 6.1 Sources

| Source                     | Couverture                                     | Format               | Licence     |
| -------------------------- | ---------------------------------------------- | -------------------- | ----------- |
| **TAXREF v17** (INPN/MNHN) | France metropolitaine + DROM                   | CSV TSV (~150k rows) | CC-BY 4.0   |
| **iNaturalist API**        | Mondiale (place_id=6712 pour CA, 6753 pour FR) | JSON paginated       | CC0 / CC-BY |
| **GBIF Backbone**          | Mondiale                                       | Darwin Core archive  | CC0         |
| **Canadensys**             | Endemics canadiens                             | CSV                  | CC-BY       |
| **Wikidata**               | Photos + descriptions                          | SPARQL               | CC0         |

### 6.2 Script `scripts/seed-taxonomy-v2.ps1`

Voir le script pour l implementation. Etapes :

1. Download TAXREF v17 (~80 MB) depuis INPN
2. Parse + filtre : 4 classes vertebrees (especes) + Insecta (familles)
3. Fetch iNaturalist Canada : 4 classes + insectes
4. Merge FR + CA dedupe par `(rank, scientific_name)`
5. Bulk insert via Supabase REST avec `Prefer: resolution=merge-duplicates`
6. Resolve `parent_id` via SQL post-insert
7. Report coverage % par classe et territoire

### 6.3 Idempotence

Le script peut etre relance sans risque grace a :

- `UNIQUE (rank, scientific_name)` + `resolution=merge-duplicates` sur les
  inserts (upsert behavior)
- `parent_id` resolu par SQL en lisant les nodes deja presents

### 6.4 Politique de re-seed

- Frequence : tous les 6-12 mois ou a chaque nouvelle release TAXREF
- Procedure :
  1. Re-run script avec `data_version` incrementee
  2. Verifier coverage report
  3. Comparer nodes ajoutes / mis a jour vs baseline
  4. Tests RPC search avec quelques requetes connues

---

## 7. Politique d evolution sans casser la prod

### 7.1 Ajout d un nouveau champ

**OK (additif, zero risk)** :

- Ajouter une colonne NULLABLE ou avec DEFAULT
- Ajouter une cle dans `metadata` JSONB
- Ajouter une nouvelle table annexe
- Ajouter un index
- Ajouter une nouvelle RPC

**A faire en 2 etapes** :

- Remplacer une colonne par une autre : ajouter la nouvelle, backfill,
  marquer l ancienne deprecated, DROP apres 3-6 mois
- Renommer une colonne : creer un VIEW alias, deprecier le nom ancien

**Interdit en prod sans plan rollback** :

- DROP COLUMN sur une colonne utilisee
- ALTER COLUMN TYPE incompatible
- Changer une CHECK constraint qui rejette des donnees existantes

### 7.2 Politique de breaking changes

Si vraiment necessaire (ex: refonte majeure V2.0.0), processus :

1. Annoncer dans le CHANGELOG et docs au moins 1 mois avant
2. Creer la nouvelle structure en parallele
3. Migrer progressivement les consumers (front, edge functions, RPC)
4. Garder l ancienne structure en read-only pendant 1 cycle
5. DROP l ancienne en MAJOR release uniquement

---

## 8. Queries de reference

### 8.1 Search basique

```sql
-- Recherche "calopteryx" en France, especes + familles
SELECT * FROM public.search_taxonomy('calopteryx', 'fr', ARRAY['species','family']);
```

### 8.2 Toutes les especes d une classe en FR

```sql
SELECT scientific_name, common_name_fr, popularity
FROM public.taxonomy_nodes
WHERE rank = 'species'
  AND class = 'Aves'
  AND available_in_fr = TRUE
ORDER BY popularity DESC, common_name_fr;
```

### 8.3 Toutes les familles d insectes communes FR + CA

```sql
SELECT scientific_name, "order"
FROM public.taxonomy_nodes
WHERE rank = 'family'
  AND class = 'Insecta'
  AND available_in_fr = TRUE
  AND available_in_ca = TRUE
ORDER BY "order", scientific_name;
```

### 8.4 Hierarchie d une espece (breadcrumb)

```sql
WITH RECURSIVE ancestry AS (
  SELECT id, rank, scientific_name, parent_id, 0 AS depth
  FROM public.taxonomy_nodes
  WHERE scientific_name = 'Calopteryx virgo'
  UNION ALL
  SELECT t.id, t.rank, t.scientific_name, t.parent_id, a.depth + 1
  FROM public.taxonomy_nodes t
  JOIN ancestry a ON t.id = a.parent_id
)
SELECT * FROM ancestry ORDER BY depth DESC;
```

### 8.5 Statuts conservation (quand metadata sera peuplee)

```sql
SELECT scientific_name, common_name_fr,
       metadata->'conservation'->'iucn_global'->>'status' AS iucn,
       metadata->'conservation'->'iucn_fr'->>'status' AS iucn_fr
FROM public.taxonomy_nodes
WHERE rank = 'species'
  AND class = 'Aves'
  AND metadata->'conservation'->'iucn_global'->>'status' IN ('VU','EN','CR');
```

---

## 9. Historique des versions du schema

| Version | Date       | Changement                                                          | Migration                                         |
| ------- | ---------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| 1.0     | 2026-05-26 | Creation initiale (V1.1.0 prep)                                     | `20260526_taxonomy_nodes_hierarchical_schema.sql` |
| 1.0.1   | 2026-05-26 | Ajout `metadata` JSONB + `data_version` + `data_source` + index GIN | `20260526_taxonomy_future_proof_metadata.sql`     |

---

## 10. Liens utiles

- TAXREF v17 : https://inpn.mnhn.fr/telechargement/referentielEspece/taxref
- iNaturalist API : https://api.inaturalist.org/v1/docs/
- GBIF Backbone : https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c
- IUCN Red List : https://www.iucnredlist.org/
- COSEWIC : https://cosewic.ca/
- SARA Public Registry : https://species-registry.canada.ca/
- INPN Liste rouge : https://uicn.fr/liste-rouge-france/
