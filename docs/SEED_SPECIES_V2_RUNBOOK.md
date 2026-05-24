# Seed species V2 — extension à ~10 000 espèces

> **Contexte** : Nicolas 2026-05-24 — la beta du Québec ne trouve pas ses
> espèces locales dans l'autocomplete. On étend `species_master` de
> 4 835 → ~10 000 espèces avec ajout des plantes, poissons, arachnides,
> mollusques + boost régional Canada.

---

## 🎯 Cibles V2

| Groupe       | Avant | Cible       | Source                                    |
| ------------ | ----- | ----------- | ----------------------------------------- |
| `birds`      | 1 647 | 2 000       | GBIF principal + boost CA                 |
| `mammals`    | 1 025 | 1 200       | GBIF principal + boost CA                 |
| `insects`    | 1 351 | 2 000       | GBIF principal (ordres ciblés) + boost CA |
| `amphibians` | 406   | 500         | GBIF principal + boost CA                 |
| `reptiles`   | 406   | 500         | GBIF principal + boost CA                 |
| `plants`     | **0** | **2 500**   | NOUVEAU — Plantae racine + boost CA       |
| `fish`       | **0** | **800**     | NOUVEAU — Actinopterygii + boost CA       |
| `arachnids`  | **0** | **300**     | NOUVEAU — Arachnida + boost CA            |
| `mollusks`   | **0** | **300**     | NOUVEAU — Mollusca + boost CA             |
| **Total**    | 4 835 | **~10 100** |                                           |

**Estimation taille DB** :

- ~1.8 KB / espèce → ~18 MB
- DB actuelle : 43 MB → après V2 : ~52 MB
- Limite Supabase Free : 500 MB → **OK, 10 % de la quota**

---

## 🚀 Étapes pour lancer le seed V2

### 1. Préparer la clé service_role

Le script utilise désormais `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS) — pas
besoin de jongler avec les `GRANT` temporaires.

```bash
# Récupère la clé sur https://supabase.com/dashboard/project/hrxgduvworofnrjmgpcj/settings/api
# Section "Project API keys" → service_role (secret)
# AJOUTE cette ligne dans .env.local :
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

⚠️ **Ne JAMAIS committer le `.env.local`** (déjà dans .gitignore — vérifié).

### 2. Lancer le script

```bash
node scripts/seed-species-from-gbif.mjs
```

**Durée estimée** : 60-90 min selon connexion + temps de réponse GBIF.

**Logs attendus** :

```
🔑 Auth Supabase : service_role (bypass RLS)
🌿 Import GBIF → species_master (v2 — étendu + boost CA)

── Oiseaux (birds) — cible 2000 ──
   clé 212 page 0 → 850/2000
   clé 212 page 1 → 1700/2000
   ...
   ✓ Oiseaux : 2000 espèces
   🇨🇦 Boost régional CA pour Oiseaux…
      ✓ 387 espèces CA additionnelles
── Mammifères (mammals) — cible 1200 ──
   ...
```

### 3. Vérifier le résultat

```sql
-- Distribution finale par groupe
SELECT taxonomic_group, COUNT(*) FROM species_master GROUP BY taxonomic_group ORDER BY 2 DESC;

-- Taille de la table
SELECT pg_size_pretty(pg_total_relation_size('species_master'));

-- Échantillon plantes du Québec (vérif boost)
SELECT common_name_fr, scientific_name, popularity FROM species_master
WHERE taxonomic_group='plants' ORDER BY popularity DESC LIMIT 20;
```

### 4. (optionnel) Régénérer les types TypeScript

Le type `TaxonomicGroup` inclut déjà `plants/fish/arachnids/mollusks` côté
TS — pas besoin de regen. Mais si les types Supabase générés sont en retard
sur certaines colonnes, lance :

```bash
npx supabase gen types typescript --project-id hrxgduvworofnrjmgpcj > src/types/supabase.ts
```

---

## 🔒 Sécurité

- Le script utilise la clé **service_role** : ne PAS l'exécuter sur staging
  ou main sans backup DB.
- La clé service_role bypass TOUTES les policies RLS — usage strictement
  local + script de seed contrôlé.
- Les écritures sont en **UPSERT idempotent** (merge sur `scientific_name`)
  → ré-exécutable sans risque de doublons.

---

## 🛠️ Troubleshooting

| Symptôme                             | Cause probable             | Solution                                                             |
| ------------------------------------ | -------------------------- | -------------------------------------------------------------------- |
| `403 Forbidden` sur les upserts      | Clé anon utilisée + RLS    | Ajouter SERVICE_ROLE_KEY                                             |
| `Timeout création du post après 30s` | Lien GBIF rate-limité      | Re-run — le script reprend où il s'est arrêté grâce au dédoublonnage |
| Quotas non atteints pour un groupe   | Couverture FR GBIF limitée | Normal — la qualité prime sur le quota                               |
| Boost CA retourne 0 espèces          | Taxon key invalide         | Vérifier les keys GBIF dans GROUPS                                   |

---

## 📈 Phase 3 (post-beta)

Idées d'enrichissement futur quand la beta tournera :

- **Distribution réelle** : ajouter colonne `regions` (ARRAY) pour
  géofiltrer l'autocomplete (ne proposer que les espèces présentes dans le
  pays du user).
- **Photos** : enrichir `image_url` via GBIF media API ou Wikimedia.
- **Statut UICN** : ajouter colonne `iucn_status` pour signaler les
  espèces vulnérables / en danger.
- **Synonymes** : enrichir la colonne `synonyms` pour matcher davantage de
  recherches utilisateurs (« mésange à tête noire » → « Mésange charbonnière »).
