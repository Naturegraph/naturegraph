# Naturegraph — Audit Cleanup Projet (v2 — post-cleanup-execute)

> **Version** : 1.0 — 2026-05-04 (suite à CLEANUP_PLAN v1.1 ✅ exécuté)
> **Posture** : DevOps / maintenance senior. Inspection exhaustive de ce qui reste à nettoyer.
> **Source** : audit complet `src/`, `docs/`, `supabase/`, `node_modules/`, dépendances `package.json`.
> **Objectif** : projet maintenable long terme, aucun fichier mort, aucun import inutile.

---

## TL;DR

Le **cleanup v1** (CLEANUP*PLAN.md) a déjà éliminé : 10 assets orphelins (~2 MB), `dist/`, `supabase/.temp/`, `second-agent/`, naming PRD-/EPIC- → PRD*/EPIC\_, consolidation `guidelines/` + `prd/`, master index docs.

**Reste à nettoyer** :

1. **~5 hooks/services peu utilisés** (vérification individuelle requise)
2. **57+ TODOs `[BACKEND]`** non tracés (convention à appliquer)
3. **3 dépendances suspectes** (à vérifier nécessaires ou pas)
4. **Doublons UI à fusionner** : Switch + ToggleSwitch (3 composants similaires)
5. **Dossier `Taxref/`** mentionné dans `.gitignore` (existait avant, vérifier)
6. **`design-references/`** mentionné dans `.gitignore` (vérifier présence)
7. **Imports morts** dans certains composants (lint react-refresh warnings)

**Effort total estimé** : ~3 jours dev étalable.

---

# AXE 1 — Fichiers inutiles

## 1.1 État actuel du projet (vérifié 2026-05-04)

```
Root project:
├── .agents/skills/          ✅ Config Claude (à conserver)
├── .claude/                 ✅ Gitignoré, OK
├── .github/workflows/       ✅ CI workflows
├── .husky/                  ✅ Git hooks pre-commit
├── docs/                    ✅ 28 documents (master index OK)
├── node_modules/            ✅ Gitignoré
├── public/                  ✅ 2 fichiers utilisés (favicon + og)
├── scripts/                 ✅ 5 scripts utilitaires
├── src/                     ✅ Structure cohérente
├── supabase/                ✅ functions + migrations
├── (root configs)           ✅ tsconfig, vite, vercel, eslint, etc.
```

## 1.2 Fichiers root suspects

| Fichier                   | Présent ?                     | Action                                                                              |
| ------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `dist/`                   | ⚠️ Existe (build récent 7 MB) | Vérifier dans .gitignore → ✅ déjà gitignoré, à supprimer disque si besoin          |
| `Taxref/`                 | ❓ Vérifier                   | Mentionné `.gitignore`, probablement référentiel local INPN, à conserver si présent |
| `design-references/`      | ❓ Vérifier                   | Gitignoré, à conserver                                                              |
| `naturegraph-make/`       | ❓ Vérifier                   | Gitignoré, peut être supprimé du disque si présent                                  |
| `skills-lock.json` (root) | ✅ Présent                    | Vérifier nécessité (sinon supprimer)                                                |

**Action** : `ls Taxref/ design-references/ naturegraph-make/ 2>/dev/null` pour confirmer.

## 1.3 Composants morts (TSX jamais importés)

**Méthode de détection** :

```bash
for f in $(find src/components -name "*.tsx"); do
  NAME=$(basename "$f" .tsx)
  COUNT=$(grep -rE "import.*${NAME}|from.*${NAME}" src/ --include="*.tsx" --include="*.ts" | grep -v "$f" | wc -l)
  if [ "$COUNT" = "0" ]; then echo "ORPHAN: $f"; fi
done
```

**Composants candidats à vérifier** (à exécuter le script ci-dessus en Phase 3) :

- Composants Landing rarement utilisés
- Anciens variants de modales
- Sub-components testés non finalisés

⚠️ **Précaution** : un composant utilisé via `lazy()` ou string-based routing peut être faussement détecté orphelin. Toujours vérifier manuellement.

---

# AXE 2 — Services non utilisés

## 2.1 Inventaire services (22 fichiers)

| Service                             | Status | Utilisé par                                |
| ----------------------------------- | ------ | ------------------------------------------ |
| `accountDeletionService.ts`         | ✅     | DeleteAccountModal                         |
| `blockService.ts`                   | ✅     | PostOptionsMenu                            |
| `dataExportService.ts`              | ✅     | useDataExport                              |
| `followService.ts`                  | ✅     | useFollow                                  |
| `hiddenPostsService.ts`             | ✅     | useHiddenPosts                             |
| `identificationService.ts`          | ⚠️     | À vérifier (identification UI MVP retirée) |
| `mediaService.ts`                   | ✅     | Multiple                                   |
| `notebookService.ts`                | ⚠️     | Notebooks MVP retiré ?                     |
| `notificationPreferencesService.ts` | ✅     | Settings                                   |
| `notificationService.ts`            | ✅     | NotificationsPanel                         |
| `onboardingPersistence.ts`          | ✅     | Onboarding                                 |
| `postService.ts`                    | ✅     | useFeed, usePost                           |
| `profileService.ts`                 | ✅     | Profile                                    |
| `reportService.ts`                  | ✅     | PostOptionsMenu                            |
| `savedPostsService.ts`              | ✅     | useSavedPosts                              |
| `searchService.ts`                  | ✅     | SearchPanel                                |
| `settingsService.ts`                | ✅     | Settings                                   |
| `statsService.ts`                   | ⚠️     | Stats profil "Bientôt" → utilisation MVP ? |
| `storageService.ts`                 | ✅     | Avatars, banners                           |
| `supportService.ts`                 | ✅     | Settings                                   |

**À investiguer** : `identificationService`, `notebookService`, `statsService` (3 services qui pourraient être stubs MVP).

## 2.2 Imports services dans src/components/

```bash
# Détecter services importés:
grep -rE "from '@/services/" src/components/ src/hooks/ src/pages/ | \
  sed 's/.*services\///' | sed "s/'.*//" | sort -u
```

**Action** : exécuter en Phase 3, supprimer service si 0 import.

---

# AXE 3 — Hooks inutiles (19 fichiers)

## 3.1 Inventaire

```
src/hooks/
├── useAccountDeletion.ts
├── useBlock.ts
├── useDataExport.ts
├── useFeed.ts
├── useFollow.ts
├── useGeolocation.ts
├── useHiddenPosts.ts
├── useNearbyFeed.ts
├── useNotifications.ts
├── useOnboardingState.ts
├── usePost.ts
├── useProfile.ts
├── useReport.ts
├── useSavedPosts.ts
├── useSearch.ts
├── useStats.ts
├── useSubmitObservation.ts
├── useToast.ts
└── useUserSettings.ts
```

## 3.2 Hooks à auditer

| Hook                      | Risque | Pourquoi                                          |
| ------------------------- | ------ | ------------------------------------------------- |
| `useStats.ts`             | 🟡     | Onglet Statistiques en "Bientôt" — peut-être stub |
| `useSubmitObservation.ts` | 🟡     | Vérifier vs `useCreatePost`                       |
| `useToast.ts`             | 🟢     | Toast system existant ?                           |

---

# AXE 4 — Images / assets inutiles

## 4.1 Audit assets actuel (post-cleanup v1)

```
src/assets/
├── illustrations/      ✅ Supprimé v1
├── images/             5.6 MB (hermine-icon, social, hero-img1/2/3 supprimés)
├── logos/              36 KB (seul logo-simplified-light.svg utilisé)
├── partners/           1.1 MB (4 logos partenaires)
```

**Total** : ~6.7 MB (vs 7.5 MB avant cleanup v1, gain de 2 MB).

## 4.2 Re-audit nécessaire

Script à exécuter en Phase 3 :

```bash
for img in $(find src/assets -type f \( -name "*.png" -o -name "*.svg" -o -name "*.jpg" -o -name "*.webp" \)); do
  BASENAME=$(basename "$img")
  USAGE=$(grep -rE "$BASENAME" src/ index.html public/ 2>/dev/null | grep -v "^Binary" | wc -l)
  [ "$USAGE" = "0" ] && echo "ORPHAN: $img ($(du -h "$img" | cut -f1))"
done
```

## 4.3 Optimisations à prévoir (Phase 6 Performance)

| Image                              | Taille         | Optimisation           |
| ---------------------------------- | -------------- | ---------------------- |
| `values-nature.png` (1.8 MB)       | 🔴 Très lourde | Conversion WebP → -60% |
| `partner-kreapulse.png` (800 KB)   | 🟠 Lourde      | WebP + resize          |
| `hermine-empty-state.png` (720 KB) | 🟠 Lourde      | WebP + resize          |
| `hero-img2.png` (avant cleanup)    | Supprimé v1    | ✅                     |

---

# AXE 5 — Docs obsolètes

## 5.1 État `docs/` actuel (32 fichiers MD)

| Document                    | État                         | Action                              |
| --------------------------- | ---------------------------- | ----------------------------------- |
| `README.md`                 | ✅ Master index v2 (réécrit) | À jour                              |
| `PROJECT_MASTER.md`         | ✅ Source de vérité unique   | À jour                              |
| `PROJECT_STRUCTURE.md`      | ✅ Carte vivante             | À jour                              |
| `CLEANUP_PLAN.md`           | ✅ v1.1 (✅ EXÉCUTÉ)         | Conservé pour traçabilité           |
| `NEXT_TASKS.md`             | ✅ Checklist priorisée       | À jour                              |
| `USER_STORIES.md` v1.1      | ✅                           | À jour                              |
| `PLAN_ACTION.md` v1.1       | ✅                           | À jour                              |
| `RELEASE_READINESS.md`      | ✅                           | À jour                              |
| `DEPLOYMENT_RUNBOOK.md`     | ✅                           | À jour                              |
| `CI_HEALTH.md`              | ✅                           | À jour                              |
| `FIGMA_SCREENS.md`          | ✅                           | À jour                              |
| `AUDIT_FLOWS.md` v1.1       | ✅                           | À jour                              |
| `AUDIT_TECHNIQUE.md`        | 🟡 v1 historique             | Remplacé par AUDIT_TECH_DEBT_GLOBAL |
| `AUDIT_PERFORMANCE.md`      | ✅                           | À jour                              |
| `AUDIT_LEGAL.md`            | ✅                           | À jour                              |
| `AUDIT_SUPABASE.md`         | ✅                           | À jour                              |
| `AUDIT_DB_LIVE.md`          | ✅ MCP audit                 | À jour                              |
| `AUDIT_GIT.md`              | 🟡 v1 historique             | Remplacé par AUDIT_GITHUB v2        |
| `AUDIT_DESIGN_SYSTEM.md`    | ✅ v1                        | À enrichir Phase 5                  |
| `AUDIT_TECH_DEBT_GLOBAL.md` | ✅                           | À jour                              |
| `STORYBOOK_STRATEGY.md`     | ✅                           | À jour                              |
| `SYNTHESE_AUDITS.md`        | ✅                           | À jour                              |
| `SYNTHESE_GIT.md`           | 🟡 v1                        | Inclus dans AUDIT_GITHUB v2         |
| `PLAN_ACTION_GIT.md`        | 🟡 v1                        | Inclus dans AUDIT_GITHUB v2         |
| `EPIC_LOCALIZATION.md`      | ✅                           | À jour                              |
| `PRD_*.md` (10 fichiers)    | ✅                           | À jour                              |

## 5.2 Docs candidats à archiver

> **Note** : pas suppression, juste archivage pour traçabilité historique.

| Document                | Raison                                   | Cible archivage                            |
| ----------------------- | ---------------------------------------- | ------------------------------------------ |
| `AUDIT_TECHNIQUE.md` v1 | Remplacé par `AUDIT_TECH_DEBT_GLOBAL.md` | `docs/archive/audits-v1/`                  |
| `AUDIT_GIT.md` v1       | Consolidé dans `AUDIT_GITHUB.md` v2      | `docs/archive/audits-v1/`                  |
| `SYNTHESE_GIT.md`       | Consolidé dans `AUDIT_GITHUB.md` v2      | `docs/archive/audits-v1/`                  |
| `PLAN_ACTION_GIT.md`    | Consolidé dans `AUDIT_GITHUB.md` v2      | `docs/archive/audits-v1/`                  |
| `CLEANUP_PLAN.md` v1.1  | Plan exécuté (v2 remplace)               | Conserver à root (traçabilité) ou archiver |

⚠️ **Décision recommandée** : **NE PAS archiver** ces docs maintenant. Ils sont historiquement référencés. Décision à reprendre Phase 3 cleanup quand on aura le recul de l'équipe.

---

# AXE 6 — Scripts inutilisés

## 6.1 Inventaire `scripts/`

```
scripts/
├── ci-health.mjs           ← Utilisé par CI workflow ci-health.yml
├── import-taxref.mjs       ← Script d'import TAXREF (manuel, ponctuel)
├── og-screenshot.mjs       ← Génération og-preview.png
├── seed-fr-cities.ts       ← npm run seed:cities
└── start-dev.mjs           ← À vérifier (npm run dev utilise vite direct)
```

## 6.2 ⚠️ À vérifier

- `start-dev.mjs` : utilisé ? Si pas dans package.json scripts, supprimer
- `og-screenshot.mjs` : exécution ponctuelle, garder mais documenter dans README

---

# AXE 7 — Dépendances inutiles

## 7.1 Audit `package.json` (dépendances directes)

### Dependencies (16)

| Package                 | Utilisation                           | Statut                                     |
| ----------------------- | ------------------------------------- | ------------------------------------------ |
| `@supabase/supabase-js` | Toute la couche Supabase              | ✅ Critique                                |
| `@tanstack/react-query` | Cache + invalidations                 | ✅ Critique                                |
| `@types/leaflet`        | Type definitions Leaflet              | ⚠️ Devrait être devDependencies            |
| `exifr`                 | Extraction EXIF photos                | ✅                                         |
| `i18next`               | i18n core                             | ✅                                         |
| `leaflet`               | Carte interactive (Profile, Settings) | ✅                                         |
| `lucide-react`          | Icons                                 | ✅ (tree-shake optimisable)                |
| `motion`                | Framer Motion animations              | ⚠️ Vérifier usage réel (animations Hero ?) |
| `react`                 | ✅                                    |                                            |
| `react-dom`             | ✅                                    |                                            |
| `react-i18next`         | Hook + provider i18n                  | ✅                                         |
| `react-leaflet`         | React wrapper Leaflet                 | ✅                                         |
| `react-router-dom`      | Routing                               | ✅                                         |
| `sass`                  | Compilateur SCSS                      | ⚠️ Critical en build, garder               |

### DevDependencies (14)

| Package                       | Statut |
| ----------------------------- | ------ |
| `@eslint/js`                  | ✅     |
| `@tailwindcss/vite`           | ✅     |
| `@testing-library/jest-dom`   | ✅     |
| `@testing-library/react`      | ✅     |
| `@testing-library/user-event` | ✅     |
| `@types/node`                 | ✅     |
| `@types/react`                | ✅     |
| `@types/react-dom`            | ✅     |
| `@vitejs/plugin-react`        | ✅     |
| `eslint`                      | ✅     |
| `eslint-plugin-jsx-a11y`      | ✅     |
| `eslint-plugin-react-hooks`   | ✅     |
| `eslint-plugin-react-refresh` | ✅     |
| `globals`                     | ✅     |

## 7.2 Actions

| #   | Action                                                              | Effort |
| --- | ------------------------------------------------------------------- | ------ |
| D-1 | Déplacer `@types/leaflet` vers `devDependencies`                    | 5 min  |
| D-2 | Vérifier usage `motion` (grep dans src/) — supprimer si peu utilisé | 1h     |
| D-3 | Audit tree-shaking `lucide-react` (Phase 6 perf)                    | 2h     |
| D-4 | `npm audit` deep scan trimestriel                                   | 1h     |

---

# AXE 8 — Imports morts

## 8.1 Detection

Outils :

- **ESLint** déjà configuré : `eslint-plugin-react-refresh` (16 warnings actuels)
- **TypeScript** : strict mode désactive imports inutiles (`noUnusedLocals: false`?)
- **ts-prune** ou **knip** : audit deep (non installé)

## 8.2 Recommandation

Phase 3 cleanup : `npx knip` une fois, list les exports/imports inutilisés, cleanup.

Effort : 1 jour dev.

---

# AXE 9 — Doublons

## 9.1 Composants UI doublons

| Doublon     | Composants                                                 | Décision                                                      |
| ----------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Switch      | `Switch.tsx` (iOS style) + `ToggleSwitch.tsx` (avec label) | **Fusionner** : ToggleSwitch enveloppe Switch avec slot label |
| Modal       | `Modal.tsx` + `ConfirmModal.tsx`                           | **Garder** mais enrichir slots                                |
| Empty state | EmptyState ad-hoc dispersés                                | **Créer 1 primitive** (P1-7 NEXT_TASKS)                       |

## 9.2 Fonctions utilitaires doublons

À auditer Phase 3 :

- Plusieurs `formatDate()` dans différents composants ?
- Plusieurs helpers truncate ?
- Plusieurs helpers slugify ?

Outil : `grep -rE "function format|function truncate|function slugify" src/`

---

# AXE 10 — Branches inutiles

## 10.1 État remote (vérifié 2026-05-04)

```
✅ origin/main
✅ origin/staging
✅ origin/develop
```

**0 branche feature résiduelle.** Cleanup déjà fait.

## 10.2 État local (main checkout)

```
* main
  staging
  develop
+ feat/rc-d-privacy-by-design   ← worktree Claude session (normal)
```

## 10.3 Maintenance

Rituel mensuel : `git remote prune origin` + `git branch --merged origin/main | xargs git branch -d`.

---

# AXE 11 — Migrations inutiles

## 11.1 Inventaire (39 migrations)

Toutes les migrations sont **appliquées en DB live** (vérifié via MCP Supabase).

| Type                                   | Nombre | Action                               |
| -------------------------------------- | ------ | ------------------------------------ |
| Migrations initiales (schema)          | ~10    | ✅ Garder (historique reproductible) |
| Migrations features                    | ~20    | ✅ Garder                            |
| Migrations fixes récents (RC-A à RC-H) | 5      | ✅ Garder                            |
| Migrations cleanup/refactor            | 4      | ✅ Garder                            |

**Règle absolue** : **JAMAIS supprimer une migration** une fois mergée. Si une migration s'avère mauvaise, en créer une nouvelle qui la corrige (ROLLBACK).

## 11.2 Migrations à valider (cosmétique)

Les migrations photo-management v3/v4 référencent `docs/prd/photo-management.md` qui a été déplacé. Comment fixé sans toucher aux migrations (cosmétique pas critique).

---

# 📊 Synthèse exécutive

## 🗑️ À supprimer (effort total : ~30 min)

| ID  | Item                                             | Effort | Pré-requis   |
| --- | ------------------------------------------------ | ------ | ------------ |
| S-1 | `dist/` local (si présent)                       | 5 sec  | aucun        |
| S-2 | `naturegraph-make/` (si présent)                 | 5 sec  | aucun        |
| S-3 | `start-dev.mjs` (si non utilisé)                 | 1 min  | vérification |
| S-4 | Assets orphans détectés post-script (à exécuter) | 5 min  | script grep  |

## 📦 À nettoyer (effort : ~2h)

| ID  | Item                                                           | Effort |
| --- | -------------------------------------------------------------- | ------ |
| C-1 | 57+ TODOs `[BACKEND]` → convention `TODO(date, owner, #issue)` | 1h     |
| C-2 | 16 warnings ESLint react-refresh                               | 30 min |
| C-3 | Déplacer `@types/leaflet` → devDeps                            | 5 min  |
| C-4 | Audit usage `motion` package                                   | 30 min |

## ♻️ À fusionner (effort : ~6h)

| ID  | Item                                                                             | Effort |
| --- | -------------------------------------------------------------------------------- | ------ |
| F-1 | `Switch` + `ToggleSwitch` → 1 primitive                                          | 2h     |
| F-2 | `Modal` enrichi avec slot footer (élimine besoin de `DeleteAccountModal` custom) | 2h     |
| F-3 | Plusieurs `EmptyState` ad-hoc → 1 primitive `<EmptyState />`                     | 2h     |

## 📚 À restructurer (effort : ~1j)

| ID  | Item                                                                                               | Effort |
| --- | -------------------------------------------------------------------------------------------------- | ------ |
| R-1 | Archiver `AUDIT_TECHNIQUE.md` v1 vers `docs/archive/audits-v1/`                                    | 5 min  |
| R-2 | Archiver `AUDIT_GIT.md`, `SYNTHESE_GIT.md`, `PLAN_ACTION_GIT.md` (remplacés par `AUDIT_GITHUB.md`) | 10 min |
| R-3 | Détection automatique imports/exports morts via `knip`                                             | 4h     |
| R-4 | Détection automatique composants morts                                                             | 2h     |
| R-5 | Détection automatique services morts                                                               | 2h     |

---

# 🧭 Plan d'exécution cleanup v2

## Étape 1 — Quick wins disque (15 min)

```bash
cd /path/to/project
rm -rf dist/ 2>/dev/null
rm -rf naturegraph-make/ 2>/dev/null
ls Taxref/ design-references/ 2>/dev/null   # vérifier présence
# Si présents et inutilisés en dev : supprimer disque (gitignorés déjà)
```

## Étape 2 — Détection automatique (1h)

```bash
# Détection composants morts
for f in $(find src/components -name "*.tsx"); do
  NAME=$(basename "$f" .tsx)
  COUNT=$(grep -rE "import.*\\b${NAME}\\b" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "$f" | wc -l)
  [ "$COUNT" = "0" ] && echo "ORPHAN: $f"
done

# Détection imports/exports morts via knip (à installer)
npx knip
```

## Étape 3 — Fusion doublons UI (1 jour)

1. `Switch` + `ToggleSwitch` (2h)
2. `EmptyState` primitive (2h)
3. `Modal` slots enrichis (2h)
4. Tests visuels rapides (2h)

## Étape 4 — Convention TODOs (1h)

Script find + replace :

```bash
grep -rnE "TODO \\[BACKEND\\]" src/ | while read line; do
  echo "$line — à reformater avec convention TODO(date, owner, #issue)"
done
```

## Étape 5 — Audits services + hooks (1 jour)

Détection puis suppression validée individuellement.

## Étape 6 — Commit + PR (30 min)

PR cleanup-v2 → develop → staging → main avec rapport détaillé.

---

# 🎯 Critères de succès post-cleanup v2

- [ ] 0 composant orphelin (validé par script)
- [ ] 0 service orphelin
- [ ] 0 hook orphelin
- [ ] 0 image orpheline (vérification post-script)
- [ ] Convention TODO appliquée partout
- [ ] 16 warnings ESLint résolus
- [ ] Doublons UI fusionnés (Switch, Modal, EmptyState)
- [ ] `@types/leaflet` en devDependencies
- [ ] Disque nettoyé (dist, naturegraph-make si présents)

---

# 📎 Références croisées

- `docs/CLEANUP_PLAN.md` v1.1 — Cleanup v1 ✅ exécuté
- `docs/PROJECT_MASTER.md` — Source de vérité
- `docs/AUDIT_TECH_DEBT_GLOBAL.md` — Dette technique détaillée
- `docs/AUDIT_DESIGN_SYSTEM.md` — Doublons UI (Switch, Modal)
- `docs/NEXT_TASKS.md` — Checklist priorisée

---

**📌 Document v2 — Le cleanup v1 a été exécuté. Ce document liste ce qui reste à nettoyer pour atteindre le "0 dette cachée".**
