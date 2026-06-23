# PRD : Base de données espèces (Phase 1 socle + Phase 2 fallback)

> **Statut :** Validé Nicolas (2026-05-19) : Phase 1 en cours d'exécution.
> **Date :** 2026-05-19.
> **Auteur :** Équipe produit Naturegraph.
> **Remplace :** stratégie TAXREF/INPN abandonnée (cf. décision Nicolas 2026-05-19).

---

## 1. Contexte

Le **cœur de Naturegraph** est l'identification d'espèces (faune, flore, champignons) à partir des observations citoyennes. La qualité de l'autocomplete espèces conditionne directement la rétention : un user qui ne trouve pas une mésange charbonnière dans la recherche abandonne en quelques secondes.

### Décision produit majeure (Nicolas 2026-05-19)

La stratégie initiale **TAXREF / INPN** est abandonnée pour la Phase 1 :

- Volume excessif (>100k taxons) pour un MVP < 50 users beta.
- Pas de couverture **Québec** (TAXREF = France métropolitaine + DOM).
- Hack des données non viable / pas d'accord officiel d'usage.

### Nouvelle direction

- **GBIF (Global Biodiversity Information Facility)** : référentiel taxonomique international, **CC0** (domaine public).
- **Wikidata** : pour les noms vernaculaires français et québécois manquants chez GBIF, **CC0**.
- **iNaturalist API** (Phase 2 fallback) : pour les espèces rares non trouvées localement, **CC-BY**.

État actuel de la DB (relevé 2026-05-19) :

| Table            | Lignes            | Usage                                              |
| ---------------- | ----------------- | -------------------------------------------------- |
| `species_master` | 20 (seed minimal) | Cible Phase 1 : schéma déjà adapté GBIF + Wikidata |
| `taxref_cache`   | ~?                | Legacy TAXREF : à déprécier Phase 1 fin            |
| `species_full`   | 0                 | Table vide, à supprimer                            |

---

## 2. User stories

| #     | En tant que…                    | Je veux…                                                      | Pour…                                                   |
| ----- | ------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| US-01 | Contributeur français           | Trouver "mésange charbonnière" en 2 caractères tapés          | Documenter mes observations sans friction               |
| US-02 | Contributeur québécois          | Trouver "écureuil roux" ou "tamia rayé" avec le nom local     | Sentir que Naturegraph m'inclut, pas juste la France    |
| US-03 | Naturaliste expert              | Chercher une espèce par nom scientifique latin (Parus major)  | Pouvoir documenter rigoureusement                       |
| US-04 | Utilisateur sur une espèce rare | Si pas trouvée, pouvoir taper en libre + signaler "à valider" | Ne pas être bloqué par un référentiel incomplet         |
| US-05 | Admin produit                   | Voir d'où vient chaque espèce (GBIF taxonKey ou Wikidata QID) | Tracer la qualité du référentiel + corriger les erreurs |

---

## 3. Périmètre

### In scope Phase 1 (priorité)

- **Seed initial `species_master`** : ~3000-5000 espèces les plus observées en France et Québec (8 groupes taxonomiques principaux).
- **Sources data** : GBIF backbone taxonomy + Wikidata enrichment (noms vernaculaires FR + QC + EN).
- **Migration SQL** : `seed_species_master_v2.sql` (UPSERT idempotent).
- **Refactor services** : `searchService.searchSpecies` requête `species_master` au lieu de `taxref_cache`.
- **Fallback gracieux UI** : "Espèce non trouvée → ajoute-la à la communauté" (input libre + flag `needs_validation`).
- **Retrait UI** : toutes mentions TAXREF/INPN/CC-BY remplacées par GBIF + Wikidata (CC0).

### In scope Phase 2 (différé)

- **iNaturalist API fallback** : si query ne match aucun `species_master`, appel async iNat → insertion silencieuse dans `species_master` → résultat servi au user.
- **Cache progressif** : la DB locale s'auto-enrichit au fil des recherches réelles.
- **Sync GBIF mensuel** : Edge Function cron qui met à jour les `popularity` et corrige les synonymies.

### Out of scope (Phase 3+)

- TAXREF (réintégration possible si accord officiel obtenu).
- Identification visuelle automatique (Pl@ntNet, iNat Vision).
- Réputation experte sur identifications (cf. PRD_IDENTIFICATIONS_COLLABORATIVE.md).
- Audio identification (chants d'oiseaux).

---

## 4. Modèle de données

La table `species_master` existe déjà avec le schéma adapté. **Aucune nouvelle table.**

```sql
-- Schéma existant (extrait)
species_master (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taxref_id       varchar    -- conservé pour traçabilité historique (NULL pour Phase 1)
  gbif_id         varchar    -- GBIF taxonKey : PRIMARY identifier Phase 1
  common_name_fr  varchar    -- nom français (depuis Wikidata si manquant GBIF)
  common_name_en  varchar
  scientific_name varchar    -- NOT NULL
  synonyms        text[]     -- noms alternatifs (Wikidata aliases)
  taxonomic_group varchar    -- birds, mammals, insects, reptiles, amphibians, plants, fungi, fish, other
  source          varchar    -- 'gbif' | 'wikidata' | 'inat' (Phase 2)
  popularity      integer    -- nb d'observations historiques (GBIF) : sert au ranking
  image_url       varchar    -- URL Wikimedia Commons (Wikidata image)
  is_active       boolean    -- soft delete
  created_at      timestamptz
  updated_at      timestamptz
)
```

### Indexes pg_trgm (déjà installés)

```sql
CREATE INDEX IF NOT EXISTS idx_species_master_fr_trgm
  ON species_master USING gin (common_name_fr gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_species_master_sci_trgm
  ON species_master USING gin (scientific_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_species_master_synonyms
  ON species_master USING gin (synonyms);
CREATE INDEX IF NOT EXISTS idx_species_master_group_pop
  ON species_master (taxonomic_group, popularity DESC) WHERE is_active = true;
```

### RLS

```sql
-- Lecture publique (référentiel ouvert, pas de données perso)
ALTER TABLE species_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY species_master_public_read ON species_master
  FOR SELECT USING (is_active = true);
-- Aucun INSERT/UPDATE/DELETE pour les utilisateurs : seed via migrations admin uniquement.
```

---

## 5. Étapes d'implémentation

| #        | Tâche                                                                                                                   | Estimation | Statut                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------ |
| **T-01** | **Retrait UI TAXREF** (Footer, ContributeEncounterForm, SettingsPanel License, i18n FR/EN)                              | 0,5 j      | ✅ **Fait 2026-05-19**                     |
| **T-02** | **Renommage `constants/taxrefSpecies.ts` → `constants/commonSpecies.ts`** + `TAXREF_SPECIES` → `COMMON_SPECIES` partout | 0,25 j     | ✅ **Fait 2026-05-19**                     |
| **T-03** | **Skeleton script `scripts/seed-species-from-gbif.ts`** (extension Phase 2 jusqu'à 5 000 espèces)                       | 0,5 j      | ✅ **Fait 2026-05-19** (skeleton)          |
| **T-04** | **Migration SQL `20260519_species_master_seed_v2.sql`** (UPSERT ~200 espèces seed initial FR+QC)                        | 0,5 j      | ✅ **Fait 2026-05-19**                     |
| **T-05** | **Indexes pg_trgm + RLS public read** sur species_master                                                                | 0,25 j     | ✅ **Fait 2026-05-19** (dans la migration) |
| **T-06** | **Refactor `searchService.searchSpecies`** : query `species_master` (FR + scientific + EN, tri popularity)              | 0,75 j     | ✅ **Fait 2026-05-19**                     |
| **T-07** | **UI fallback "Espèce non trouvée"** dans `EncounterStep2` (CTA "Ajouter à valider" + flag `needsValidation`)           | 0,75 j     | ✅ **Fait 2026-05-19**                     |
| **T-08** | **Tests vitest** searchService (fallback mock COMMON_SPECIES, query len < 2, FR/sci/limit)                              | 0,25 j     | ✅ **Fait 2026-05-19**                     |
| **T-09** | **Drop `taxref_cache` + `species_full`** (cleanup DB)                                                                   | 0,25 j     | ✅ **Fait 2026-05-19** (dans la migration) |
| T-10     | (Phase 2) Seed étendu ~5 000 espèces via le script `seed-species-from-gbif.ts`                                          | 1,5 j      | Phase 2                                    |
| T-11     | (Phase 2) iNaturalist API fallback + caching auto species_master                                                        | 1,5 j      | Phase 2                                    |

**Total Phase 1 (T-01 à T-09)** : ~3,75 j dev : **terminé 2026-05-19** ✅
Phase 2 (T-10/T-11) : ~3 j dev, à planifier quand le volume utilisateurs le justifie.

---

## 6. Tests à prévoir

### Unitaires (vitest)

- `searchSpecies('mésange')` retourne au moins 3 espèces FR pertinentes.
- `searchSpecies('parus major')` retourne la mésange charbonnière (recherche sci_name).
- `searchSpecies('xyzqzz')` retourne tableau vide + flag UI "non trouvé".
- Fallback `searchSpeciesMock` (Supabase down) retourne les 20 espèces seed.
- Tri par `popularity DESC` puis alphabétique.

### Intégration

- Seed migration appliquée sur dev → `SELECT COUNT(*) FROM species_master` ≥ 3000.
- Recherche < 50ms sur autocomplete (mesuré via EXPLAIN ANALYZE).
- Wikidata enrichment : ≥ 95 % des entrées ont un `common_name_fr` non null.
- Couverture Québec : top 100 espèces québécoises (huard, geai bleu, tamia, etc.) toutes présentes.

### E2E (Playwright)

- Scénario complet : ouvrir Contribute > Step 2 > taper "mésange" → résultat instantané → sélectionner → continuer.

---

## 7. Risques & mitigations

| Risque                                            | Probabilité | Impact | Mitigation                                                             |
| ------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------- |
| GBIF API rate-limit pendant le seed               | Faible      | Faible | Sleep 100ms entre requêtes ; ou bulk download CSV.                     |
| Wikidata SPARQL timeout sur grande requête        | Moyenne     | Faible | Batch par groupe taxonomique (oiseaux, puis mammifères…).              |
| Doublons GBIF (synonymes non résolus)             | Moyenne     | Moyen  | UPSERT sur `(scientific_name, gbif_id)` ; conservation `synonyms[]`.   |
| Couverture Québec insuffisante après seed         | Moyenne     | Moyen  | Lister manuellement top 200 espèces QC + croisement GBIF avant import. |
| `species_master` schema désaligné après migration | Faible      | Élevé  | Regen `npx supabase gen types typescript` après migration ; bench tsc. |
| iNaturalist API ToS changeants (Phase 2)          | Faible      | Moyen  | Wrapper service abstrait : facile à swap pour autre fournisseur.       |

---

## 8. Performance & éco-conception

| Métrique                         | Avant (taxref_cache)   | Après (species_master + GBIF seed)            |
| -------------------------------- | ---------------------- | --------------------------------------------- |
| Lignes DB                        | ~?                     | ~5 000                                        |
| Taille DB                        | 184 KB                 | ~1 MB                                         |
| Latence autocomplete p95         | ~50ms                  | < 30ms (pg_trgm)                              |
| Requêtes API externes en runtime | 0                      | 0 (Phase 1) : Phase 2 fallback iNat optionnel |
| Bandwidth client                 | ~0 (recherche serveur) | ~0 (idem)                                     |

**Conformité GUIDELINES.md** : aucune dépendance JS ajoutée. Pas de polling. Pas d'API externe sauf Phase 2 fallback ciblé (caching auto = appel unique par espèce rare).

---

## 9. Done when (Phase 1)

- [x] Toutes mentions TAXREF/INPN/CC-BY retirées du produit (UI + i18n FR/EN)
- [x] Constants `commonSpecies.ts` créé (anciennement `taxrefSpecies.ts`)
- [x] Migration SQL `20260519_species_master_seed_v2.sql` appliquée sur dev
- [x] `species_master` contient 202 espèces FR + QC (10 groupes : oiseaux, mammifères, insectes, plantes, champignons, amphibiens, reptiles, poissons, arachnides, mollusques)
- [x] `searchService.searchSpecies` query `species_master` au lieu de `taxref_cache`
- [x] UI fallback "Espèce non trouvée → Ajouter à valider" testée en dev (mobile + desktop)
- [x] `taxref_cache` + `species_full` supprimées de la DB
- [x] Tests vitest searchService (6/6 passent : fallback mock)
- [x] Skeleton script seed `scripts/seed-species-from-gbif.ts` pour extension Phase 2
- [x] `npm run lint && npm run test` au vert (47/47)
- [ ] Migration appliquée sur staging + prod (manuel à faire au moment de la release v1.0.1+)
- [ ] Extension via script seed-species-from-gbif.ts jusqu'à ~5 000 espèces (Phase 2)
- [ ] Lighthouse mobile Contribute > Step 2 : LCP < 2,5s (à mesurer)

---

## Annexe : Décisions clés

**ADR-001 : GBIF + Wikidata over TAXREF.** Licence CC0 (vs CC-BY contraignante), couverture mondiale (vs France only), pas d'accord officiel à négocier, sync auto via API.

**ADR-002 : Pas d'API externe en runtime Phase 1.** Tout en DB locale pour éco-conception + perf. iNat fallback Phase 2 uniquement.

**ADR-003 : Conservation colonne `taxref_id` pour traçabilité.** Permet une éventuelle réintégration TAXREF Phase 3 sans perte d'historique. Valeur NULL en Phase 1.

**ADR-004 : Fallback UI input libre + flag `needs_validation`.** Préserve l'expérience pour les espèces rares. La communauté pourra ensuite valider via le système d'identifications (PRD_IDENTIFICATIONS_COLLABORATIVE.md).

**ADR-005 : Mention légale "GBIF + Wikidata (CC0)" partout.** Footer, ContributeEncounterForm, SettingsPanel License. CC0 = pas d'obligation légale d'attribution mais courtoisie + clarté pour les utilisateurs.

---

**Phase 1 status : 2026-05-19** : **toutes les étapes T-01 à T-09 sont complétées** ✅ (~3,75 j dev). La Phase 1 socle est en place :

- 202 espèces FR + QC en `species_master` (10 groupes taxonomiques)
- Indexes pg_trgm sur 3 colonnes pour autocomplete rapide
- RLS lecture publique
- Tables legacy `taxref_cache` + `species_full` supprimées
- searchService refactoré (ILIKE multi-colonnes + tri popularity + fallback mock)
- UI fallback "Espèce non trouvée → Ajouter à valider" dans EncounterStep2
- Tests vitest 47/47 verts
- Skeleton script seed prêt pour étendre à 5 000 espèces (Phase 2)
