# PRD — Base de données espèces (Phase 1 socle + Phase 2 fallback)

> **Statut :** Validé Nicolas (2026-05-19) — Phase 1 en cours d'exécution.
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

- **GBIF (Global Biodiversity Information Facility)** — référentiel taxonomique international, **CC0** (domaine public).
- **Wikidata** — pour les noms vernaculaires français et québécois manquants chez GBIF, **CC0**.
- **iNaturalist API** (Phase 2 fallback) — pour les espèces rares non trouvées localement, **CC-BY**.

État actuel de la DB (relevé 2026-05-19) :

| Table            | Lignes            | Usage                                              |
| ---------------- | ----------------- | -------------------------------------------------- |
| `species_master` | 20 (seed minimal) | Cible Phase 1 — schéma déjà adapté GBIF + Wikidata |
| `taxref_cache`   | ~?                | Legacy TAXREF — à déprécier Phase 1 fin            |
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
  gbif_id         varchar    -- GBIF taxonKey — PRIMARY identifier Phase 1
  common_name_fr  varchar    -- nom français (depuis Wikidata si manquant GBIF)
  common_name_en  varchar
  scientific_name varchar    -- NOT NULL
  synonyms        text[]     -- noms alternatifs (Wikidata aliases)
  taxonomic_group varchar    -- birds, mammals, insects, reptiles, amphibians, plants, fungi, fish, other
  source          varchar    -- 'gbif' | 'wikidata' | 'inat' (Phase 2)
  popularity      integer    -- nb d'observations historiques (GBIF) — sert au ranking
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
-- Aucun INSERT/UPDATE/DELETE pour les utilisateurs — seed via migrations admin uniquement.
```

---

## 5. Étapes d'implémentation

| #        | Tâche                                                                                                                   | Estimation | Statut                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------- |
| **T-01** | **Retrait UI TAXREF** (Footer, ContributeEncounterForm, SettingsPanel License, i18n FR/EN)                              | 0,5 j      | ✅ **Fait 2026-05-19**    |
| **T-02** | **Renommage `constants/taxrefSpecies.ts` → `constants/commonSpecies.ts`** + `TAXREF_SPECIES` → `COMMON_SPECIES` partout | 0,25 j     | ✅ **Fait 2026-05-19**    |
| T-03     | Script Node `scripts/seed-species.ts` : query GBIF + Wikidata → CSV avec ~5000 espèces FR+QC                            | 1,5 j      | À planifier               |
| T-04     | Migration SQL `seed_species_master_v2.sql` (UPSERT 5k lignes)                                                           | 0,5 j      | À planifier               |
| T-05     | Indexes pg_trgm (déjà existants ? sinon création) + bench EXPLAIN ANALYZE                                               | 0,5 j      | À planifier               |
| T-06     | Refactor `searchService.searchSpecies` : query `species_master` au lieu de `taxref_cache`                               | 0,75 j     | À planifier               |
| T-07     | UI fallback "Espèce non trouvée" dans `EncounterStep2` (input libre + flag)                                             | 0,75 j     | À planifier               |
| T-08     | Tests vitest service + composant (cas FR, QC, sci_name, no result)                                                      | 0,5 j      | À planifier               |
| T-09     | Drop `taxref_cache` + `species_full` (cleanup DB)                                                                       | 0,25 j     | À planifier (fin Phase 1) |
| T-10     | (Phase 2) iNaturalist API fallback + caching auto species_master                                                        | 1,5 j      | Phase 2                   |

**Total Phase 1 (T-01 à T-09)** : ~5,5 j dev (1 jour fait, ~4,5 j restants).

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
| iNaturalist API ToS changeants (Phase 2)          | Faible      | Moyen  | Wrapper service abstrait — facile à swap pour autre fournisseur.       |

---

## 8. Performance & éco-conception

| Métrique                         | Avant (taxref_cache)   | Après (species_master + GBIF seed)            |
| -------------------------------- | ---------------------- | --------------------------------------------- |
| Lignes DB                        | ~?                     | ~5 000                                        |
| Taille DB                        | 184 KB                 | ~1 MB                                         |
| Latence autocomplete p95         | ~50ms                  | < 30ms (pg_trgm)                              |
| Requêtes API externes en runtime | 0                      | 0 (Phase 1) — Phase 2 fallback iNat optionnel |
| Bandwidth client                 | ~0 (recherche serveur) | ~0 (idem)                                     |

**Conformité GUIDELINES.md** : aucune dépendance JS ajoutée. Pas de polling. Pas d'API externe sauf Phase 2 fallback ciblé (caching auto = appel unique par espèce rare).

---

## 9. Done when (Phase 1)

- [x] **Toutes mentions TAXREF/INPN/CC-BY retirées du produit** (UI + i18n FR/EN) — fait 2026-05-19.
- [x] **Constants `commonSpecies.ts` créé** (anciennement `taxrefSpecies.ts`).
- [ ] Migration SQL `seed_species_master_v2.sql` appliquée sur dev + staging + prod.
- [ ] `species_master` contient ≥ 3000 espèces FR + QC avec noms vernaculaires.
- [ ] `searchService.searchSpecies` query `species_master` au lieu de `taxref_cache`.
- [ ] UI fallback "Espèce non trouvée" testée (E2E Playwright).
- [ ] `taxref_cache` + `species_full` supprimées de la DB.
- [ ] Lighthouse mobile Contribute > Step 2 : LCP < 2,5s.
- [ ] `npm run lint && npm run test && npm run build` au vert.

---

## Annexe — Décisions clés

**ADR-001 : GBIF + Wikidata over TAXREF.** Licence CC0 (vs CC-BY contraignante), couverture mondiale (vs France only), pas d'accord officiel à négocier, sync auto via API.

**ADR-002 : Pas d'API externe en runtime Phase 1.** Tout en DB locale pour éco-conception + perf. iNat fallback Phase 2 uniquement.

**ADR-003 : Conservation colonne `taxref_id` pour traçabilité.** Permet une éventuelle réintégration TAXREF Phase 3 sans perte d'historique. Valeur NULL en Phase 1.

**ADR-004 : Fallback UI input libre + flag `needs_validation`.** Préserve l'expérience pour les espèces rares. La communauté pourra ensuite valider via le système d'identifications (PRD_IDENTIFICATIONS_COLLABORATIVE.md).

**ADR-005 : Mention légale "GBIF + Wikidata (CC0)" partout.** Footer, ContributeEncounterForm, SettingsPanel License. CC0 = pas d'obligation légale d'attribution mais courtoisie + clarté pour les utilisateurs.

---

**Phase 1 status — 2026-05-19** : T-01 et T-02 sont **complétés**. Le seed (T-03 à T-08) est planifié quand Nicolas aura validé ce PRD + bandwidth disponible.
