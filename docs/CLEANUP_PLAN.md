# Naturegraph — Plan de cleanup repo & structure

> **Version** : 1.0 — 2026-05-03
> **Source** : inspection lecture seule du repo (root + docs + src/assets + package.json + git status)
> **Posture** : pensée maintenance · réduire la friction de découverte des documents · pas de refacto code
> **Lecture cible** : 5 minutes pour comprendre, 1h pour exécuter

---

## TL;DR

Le projet est **fonctionnellement sain** mais **mal structuré côté découvrabilité** :

1. **24 documents dans `docs/`** sans hiérarchie claire (audits, PRDs, guidelines mélangés)
2. **4 documents importants UNTRACKED** (jamais commités → invisibles pour l'équipe via Git)
3. **8 fichiers de notes au root** (`second-agent/`) qui devraient être archivés ou supprimés
4. **~2 MB d'images orphelines** (jamais importées en code) dans `src/assets/`
5. **2 dossiers d'assets locaux** (`dist/`, `naturegraph-make/`) déjà gitignorés mais physiquement présents → encombrent le disque

**Aucun changement de code applicatif**. Uniquement déplacements, suppressions de fichiers morts, et renommages de cohérence.

**Effet sur la découvrabilité** : un nouveau membre de l'équipe doit pouvoir trouver une info en moins de 30 secondes via `docs/README.md`. Aujourd'hui c'est impossible.

---

# 1. État actuel — cartographie

## 📁 Structure root actuelle

```
ClaudeDev_Naturegraph/
├── .agents/skills/                    ← config Claude (à conserver, machine-specific)
├── .claude/                           ← config Claude (gitignoré, OK)
├── .github/workflows/                 ← CI workflows
├── .husky/                            ← git hooks
├── dist/                              ⚠️ build artifact présent (gitignoré, à supprimer disque)
├── docs/                              ❗ 24 fichiers + 7 sous-dossiers, désordonné
├── node_modules/                      ✅ gitignoré, OK
├── public/                            ✅ 2 fichiers utilisés (favicon + og-image)
├── scripts/                           ✅ 5 scripts utilitaires (CI, seed, screenshot)
├── second-agent/                      ⚠️ 8 notes session work (à archiver)
├── src/                               ✅ structure cohérente
│   ├── assets/                        ⚠️ ~2 MB d'orphelins
│   ├── components/                    ✅ par domaine (auth, contribute, home, profile, etc.)
│   ├── services/                      ✅ 21 services
│   ├── styles/                        ✅ pattern 7-1
│   └── ...
├── supabase/
│   ├── functions/                     ✅ Edge Functions (delete-account, export-data, weekly-digest)
│   ├── migrations/                    ✅ 41+ migrations
│   └── .temp/                         ⚠️ cache CLI non gitignoré
├── package.json                       ✅
├── CLAUDE.md                          ✅ instructions Claude
├── CONTRIBUTING.md                    ✅
├── GUIDELINES.md                      ✅ 56 KB éco-conception + a11y
├── README.md                          ✅
└── ... (configs : eslint, vite, tsconfig, vercel, etc.)
```

## 📚 Structure docs/ actuelle (désordre)

```
docs/
├── README.md                          ← index (à enrichir)
├── USER_STORIES.md                    ← Prompt 1 socle
├── AUDIT_FLOWS.md                     ← Prompt 2 audit
├── AUDIT_TECHNIQUE.md                 ← Prompt 4
├── AUDIT_PERFORMANCE.md               ← Prompt 5
├── AUDIT_LEGAL.md                     ← (audit légal)
├── AUDIT_SUPABASE.md                  ← Prompt 6
├── SYNTHESE_AUDITS.md                 ← Prompt 3 synthèse
├── PLAN_ACTION.md                     ← v1.1 priorisation produit
├── RELEASE_READINESS.md               ← état pré-release
├── DEPLOYMENT_RUNBOOK.md              ← procédure déploiement
├── CI_HEALTH.md                       ← monitoring CI
├── FIGMA_SCREENS.md                   ← index Figma
├── PRD-LANDING.md                     ⚠️ naming différent
├── PRD-LOCALIZATION.md                ⚠️ naming différent
├── PRD_FEED_TABS.md                   ⚠️
├── PRD_HOMEPAGE.md                    ⚠️
├── PRD_NOTIFICATIONS.md               ⚠️
├── PRD_ONBOARDING.md                  ⚠️
├── PRD_POST_FORMATS.md                ⚠️
├── PRD_PROFILE.md                     ⚠️
├── EPIC-LOCALIZATION.md
│
├── AUDIT_DB_LIVE.md                   ❌ UNTRACKED (jamais commité)
├── AUDIT_GIT.md                       ❌ UNTRACKED
├── SYNTHESE_GIT.md                    ❌ UNTRACKED
├── PLAN_ACTION_GIT.md                 ❌ UNTRACKED
│
├── api-connection/                    ✅ 3 docs API
├── backend/                           ✅ schema + relations + architecture
├── design-system/                     ✅ 8 fichiers (atoms/molecules/organisms/tokens/audit)
├── devops/                            ✅ 3 docs (deployment, environments, monitoring)
├── guidelines/                        ⚠️ 1 seul fichier `backend-guidelines.md`
├── prd/                               ⚠️ 1 seul fichier `photo-management.md`
└── security/                          ✅ 3 docs RLS + media + data protection
```

## 📁 Structure src/ — état OK

```
src/
├── App.tsx                            ✅
├── main.tsx                           ✅
├── router.tsx                         ✅
├── vite-env.d.ts                      ✅
├── index.css                          ✅
├── assets/
│   ├── illustrations/                 ❌ 1 fichier orphelin (720 KB)
│   ├── images/                        ⚠️ 4 orphelins (1.2 MB hero + autres)
│   ├── logos/                         ⚠️ 6 orphelins SVG (1 seul utilisé)
│   └── partners/                      ✅ 4 logos partenaires
├── components/                        ✅ 13 dossiers par domaine
├── constants/                         ✅
├── contexts/                          ✅
├── hooks/                             ✅
├── i18n/                              ✅
├── lib/                               ✅
├── pages/                             ✅
├── services/                          ✅ 21 services
├── styles/                            ✅
├── test/setup.ts                      ✅
├── types/                             ✅
└── utils/                             ✅
```

---

# 🗑️ À supprimer (désaccord d'usage / orphelins / obsolètes)

## A1 — Images orphelines (~2 MB de gain disque)

**Vérifié via `grep` sur tout `src/`, `index.html`, `public/`** :

| Fichier                                             | Taille | Statut                                                       | Action                                                        |
| --------------------------------------------------- | ------ | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `src/assets/illustrations/hermine-illustration.png` | 720 KB | **Doublon md5 identique** à `images/hermine-empty-state.png` | Supprimer + supprimer dossier `illustrations/` (devient vide) |
| `src/assets/images/hero-img1.png`                   | 232 KB | Jamais importé                                               | Supprimer                                                     |
| `src/assets/images/hero-img2.png`                   | 626 KB | Jamais importé                                               | Supprimer                                                     |
| `src/assets/images/hero-img3.png`                   | 322 KB | Jamais importé                                               | Supprimer                                                     |
| `src/assets/logos/logo-black.svg`                   | ~10 KB | Jamais importé                                               | Supprimer                                                     |
| `src/assets/logos/logo-color.svg`                   | ~10 KB | Jamais importé                                               | Supprimer                                                     |
| `src/assets/logos/logo-simplified-black.svg`        | ~10 KB | Jamais importé                                               | Supprimer                                                     |
| `src/assets/logos/logo-simplified-color.svg`        | ~10 KB | Jamais importé                                               | Supprimer                                                     |
| `src/assets/logos/logo-simplified-white.svg`        | ~10 KB | Jamais importé                                               | Supprimer                                                     |
| `src/assets/logos/logo-white.svg`                   | ~10 KB | Jamais importé                                               | Supprimer                                                     |

**Total** : ~2.0 MB libérés du repo.

**Précaution** : avant suppression, vérifier 1 dernière fois via Vercel preview que les pages Landing + Profile rendent correctement (au cas où une feature de design en cours utiliserait un de ces hero-img).

⚠️ **Décision produit** : si tu veux **garder une variante de logo** (par exemple `logo-color.svg` pour les communications externes), nous les déplaçons vers `docs/design-system/assets/` plutôt que de les supprimer.

## A2 — Build artifact `dist/` (~5-10 MB de gain disque)

| Fichier | Statut                                | Action                                                                 |
| ------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `dist/` | Généré par `npm run build`, gitignoré | Supprimer du disque (`rm -rf dist/`) — sera regénéré au prochain build |

## A3 — Cache temporaire Supabase

| Fichier           | Statut                                | Action                                       |
| ----------------- | ------------------------------------- | -------------------------------------------- |
| `supabase/.temp/` | Cache CLI Supabase, **non gitignoré** | Supprimer du disque + ajouter à `.gitignore` |

## A4 — Dossier `naturegraph-make/` (si existe)

| Fichier             | Statut                               | Action                                                           |
| ------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| `naturegraph-make/` | Figma Make generated, déjà gitignoré | Vérifier présence : `ls naturegraph-make/`, supprimer si présent |

---

# 📦 À nettoyer (déplacement, archivage, renommage)

## B1 — Notes de session `second-agent/` → `docs/archive/sessions/`

8 fichiers Markdown au root du projet, format `0X-titre.md`. Ce sont des **notes de session work** datées (Phase 1 → Phase 2 backend wiring), maintenant **toutes mergées en main** et obsolètes pour le développement actif.

| Fichier                                  | Sujet                  | Statut work |
| ---------------------------------------- | ---------------------- | ----------- |
| `01-setup-mock-data-profil.md`           | Setup mock data        | ✅ done     |
| `02-profile-header-cards-visiteur.md`    | Profil visiteur        | ✅ done     |
| `03-profil-backend-notes.md`             | Profil backend Phase 2 | ✅ done     |
| `04-onglets-profil-visiteur.md`          | Onglets profil         | ✅ done     |
| `05-profil-owner-audit-refactor.md`      | Profil owner           | ✅ done     |
| `06-edit-profile-panel-pixel-perfect.md` | EditProfilePanel       | ✅ done     |
| `07-settings-panel-pixel-perfect.md`     | SettingsPanel          | ✅ done     |
| `08-backend-phase2-wiring.md`            | Backend wiring         | ✅ done     |

**Action proposée** :

```
mkdir -p docs/archive/sessions/
mv second-agent/* docs/archive/sessions/
rmdir second-agent
```

Optionnellement : ajouter `docs/archive/README.md` qui dit "notes historiques de sessions de travail, conservées pour mémoire mais non maintenues".

## B2 — Dossiers `docs/guidelines/` et `docs/prd/` — sous-utilisés

Chacun contient **1 seul fichier**. Pas pertinent de garder un dossier dédié.

| Fichier actuel                          | Action                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/guidelines/backend-guidelines.md` | Déplacer → `docs/backend/guidelines.md` (cohérent avec `docs/backend/database-architecture.md`) puis supprimer dossier `guidelines/` |
| `docs/prd/photo-management.md`          | Déplacer → `docs/PRD_PHOTO_MANAGEMENT.md` (au root docs, comme les autres PRD) puis supprimer dossier `prd/`                         |

## B3 — Renommage cohérence PRD (PRD- vs PRD\_)

8 fichiers PRD utilisent 2 conventions différentes :

| Actuel                      | Renommer en                 | Raison                     |
| --------------------------- | --------------------------- | -------------------------- |
| `docs/PRD-LANDING.md`       | `docs/PRD_LANDING.md`       | uniformiser sur underscore |
| `docs/PRD-LOCALIZATION.md`  | `docs/PRD_LOCALIZATION.md`  | idem                       |
| `docs/EPIC-LOCALIZATION.md` | `docs/EPIC_LOCALIZATION.md` | idem                       |

Choix de la convention : **underscore** car déjà utilisée pour 6 fichiers sur 8 (PRD_FEED_TABS, PRD_HOMEPAGE, etc.).

## B4 — Commit des 4 documents UNTRACKED

Ces fichiers sont sur ton disque mais **pas dans Git** → invisibles pour l'équipe :

| Fichier                   | Crée pendant                  | Action                         |
| ------------------------- | ----------------------------- | ------------------------------ |
| `docs/AUDIT_DB_LIVE.md`   | Audit MCP Supabase post-PR#48 | `git add` + commit sur develop |
| `docs/AUDIT_GIT.md`       | Audit Git session 2026-05-03  | `git add` + commit sur develop |
| `docs/SYNTHESE_GIT.md`    | Cause racine RC-H             | `git add` + commit sur develop |
| `docs/PLAN_ACTION_GIT.md` | Plan exécution Git            | `git add` + commit sur develop |

**Précaution** : la branche develop sera recréée pendant Phase 0 du `PLAN_ACTION_GIT.md`. Le commit doit donc se faire APRÈS cette Phase 0.

## B5 — Mise à jour `docs/README.md`

Le `docs/README.md` actuel n'index **pas** la suite d'audits récents (USER_STORIES, AUDIT_FLOWS, etc.). À enrichir avec :

- Liste hiérarchisée de tous les documents par catégorie
- Lien vers `docs/PROJECT_STRUCTURE.md` (cf. document compagnon)
- Date de dernière mise à jour par section

## B6 — Vérifier `@types/leaflet` dans `dependencies`

`package.json` liste `@types/leaflet` dans `dependencies`. Pour un package `@types/*`, la convention est `devDependencies`.

Pas critique fonctionnellement (build OK des deux côtés), mais cohérent avec les autres `@types/*` du projet.

| Action                                                                            | Coût  |
| --------------------------------------------------------------------------------- | ----- |
| Déplacer `@types/leaflet` de `dependencies` → `devDependencies` dans package.json | 1 min |
| `npm install` pour régénérer lock                                                 | 1 min |

---

# 📚 À restructurer (hiérarchie + découvrabilité)

## C1 — Réorganiser `docs/` par catégories explicites

### Structure cible proposée

```
docs/
├── README.md                          ← INDEX MASTER (à réécrire)
├── PROJECT_STRUCTURE.md               ← Carte du repo (compagnon de ce plan)
│
├── 01-product/                        ← Vision + roadmap + décisions
│   ├── USER_STORIES.md
│   ├── PLAN_ACTION.md
│   └── RELEASE_READINESS.md
│
├── 02-prd/                            ← Product Requirement Documents
│   ├── PRD_LANDING.md
│   ├── PRD_HOMEPAGE.md
│   ├── PRD_FEED_TABS.md
│   ├── PRD_ONBOARDING.md
│   ├── PRD_PROFILE.md
│   ├── PRD_POST_FORMATS.md
│   ├── PRD_NOTIFICATIONS.md
│   ├── PRD_LOCALIZATION.md
│   ├── PRD_PHOTO_MANAGEMENT.md        ← déplacé de docs/prd/
│   └── EPIC_LOCALIZATION.md
│
├── 03-audits/                         ← TOUS les audits (produit + git)
│   ├── AUDIT_FLOWS.md
│   ├── AUDIT_TECHNIQUE.md
│   ├── AUDIT_PERFORMANCE.md
│   ├── AUDIT_LEGAL.md
│   ├── AUDIT_SUPABASE.md
│   ├── AUDIT_DB_LIVE.md
│   ├── AUDIT_GIT.md
│   ├── SYNTHESE_AUDITS.md             ← RC-A à RC-G
│   ├── SYNTHESE_GIT.md                ← RC-H
│   └── PLAN_ACTION_GIT.md
│
├── 04-architecture/                   ← Backend + données
│   ├── database-architecture.md       ← anciennement docs/backend/
│   ├── relations.md
│   ├── schema.sql
│   ├── backend-guidelines.md          ← anciennement docs/guidelines/
│   └── api-connection/
│       ├── auth-flow.md
│       ├── endpoints.md
│       └── supabase-setup.md
│
├── 05-design-system/                  ← Design system inchangé
│   ├── README.md
│   ├── audit.md
│   ├── guidelines.md
│   ├── tokens.md
│   ├── tasks-linear.md
│   └── components/
│       ├── atoms.md
│       ├── molecules.md
│       ├── organisms.md
│       └── templates.md
│
├── 06-security/                       ← inchangé
│   ├── data-protection.md
│   ├── media-security.md
│   └── rls-policies.md
│
├── 07-devops/                         ← Déploiement + monitoring + Git
│   ├── deployment.md
│   ├── environments.md
│   ├── monitoring.md
│   ├── DEPLOYMENT_RUNBOOK.md
│   └── CI_HEALTH.md
│
├── 08-references/                     ← Liens externes / Figma
│   └── FIGMA_SCREENS.md
│
└── archive/                           ← Notes de sessions passées
    └── sessions/
        ├── 01-setup-mock-data-profil.md
        ├── 02-profile-header-cards-visiteur.md
        └── ... (8 fichiers second-agent/)
```

### Pourquoi cette structure ?

| Catégorie           | Logique                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `01-product/`       | "Quel produit on construit ?" — décisions stratégiques                   |
| `02-prd/`           | "À quoi ressemble chaque feature ?" — specs produit                      |
| `03-audits/`        | "Quel est l'état actuel ?" — santé du projet (audits + plans correctifs) |
| `04-architecture/`  | "Comment c'est construit côté serveur ?" — backend + DB                  |
| `05-design-system/` | "Comment c'est construit côté UI ?" — design tokens + composants         |
| `06-security/`      | "Quels sont les garde-fous sécurité ?" — RLS + media + data              |
| `07-devops/`        | "Comment on déploie et on surveille ?" — CI/CD + Git                     |
| `08-references/`    | "Où sont les sources externes ?" — Figma + ressources                    |
| `archive/`          | "Qu'est-ce qu'on garde pour mémoire ?" — sessions passées                |

### Avantages

- **Numérotation 01-08** : ordre logique de lecture pour un nouveau membre (commence par produit, finit par devops)
- **Tous les audits regroupés** : finie la chasse au document
- **`05-design-system/`** déjà bien structuré, juste préfixé par numéro
- **`archive/`** clairement séparé du contenu actif → pas de confusion entre vieilles notes et docs vivants
- **Convention naming** : `MAJUSCULES_AVEC_UNDERSCORE` pour tous les fichiers principaux, `kebab-case.md` pour les sous-fichiers techniques (audit, guidelines)

## C2 — Réécrire `docs/README.md` comme index master

Cf. `docs/PROJECT_STRUCTURE.md` (document compagnon) pour le contenu détaillé de l'index.

---

# 📊 Synthèse exécutive

## Bilan disque

| Catégorie                 | Avant    | Après cleanup | Gain         |
| ------------------------- | -------- | ------------- | ------------ |
| `dist/` (build artifact)  | ~5-10 MB | 0             | -5-10 MB     |
| `src/assets/` (orphans)   | 7.5 MB   | ~5.5 MB       | -2 MB        |
| `supabase/.temp/` (cache) | ?        | 0             | -?           |
| **Total gain disque**     |          |               | **~7-12 MB** |

## Bilan organisation

| Métrique                    | Avant                        | Après                          |
| --------------------------- | ---------------------------- | ------------------------------ |
| Fichiers MD au root `docs/` | 24                           | 2 (README + PROJECT_STRUCTURE) |
| Niveaux de catégorisation   | mélangé                      | 8 catégories numérotées        |
| Documents UNTRACKED         | 4                            | 0                              |
| Naming PRD cohérent         | non (PRD- vs PRD\_)          | oui (PRD\_)                    |
| Notes de session au root    | `second-agent/` (8 fichiers) | `docs/archive/sessions/`       |

## Bilan découvrabilité

> **« Trouver une info en moins de 30 secondes via `docs/README.md` »**

| Question équipe                   | Avant (où chercher ?)                                         | Après                                  |
| --------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| "Où est l'audit RGPD ?"           | `docs/AUDIT_LEGAL.md` ou peut-être ailleurs                   | `docs/03-audits/AUDIT_LEGAL.md`        |
| "Quelle est la roadmap ?"         | `docs/PLAN_ACTION.md` ? versions ?                            | `docs/01-product/PLAN_ACTION.md`       |
| "Comment on déploie ?"            | `docs/DEPLOYMENT_RUNBOOK.md` ou `docs/devops/deployment.md` ? | `docs/07-devops/DEPLOYMENT_RUNBOOK.md` |
| "Quelles sont les RLS policies ?" | `docs/security/rls-policies.md` (OK)                          | `docs/06-security/rls-policies.md`     |
| "Cause racine RC-D ?"             | difficile sans connaître `SYNTHESE_AUDITS.md`                 | `docs/03-audits/SYNTHESE_AUDITS.md`    |

---

# 🧭 Ordre d'exécution proposé

## Phase 0 — Pré-requis (dépend de PLAN_ACTION_GIT.md)

⚠️ **Avant tout cleanup** : exécuter `docs/PLAN_ACTION_GIT.md` Phase 0 (résoudre rebase orphelin + recréer origin/develop). Sinon les commits ne pourront pas atterrir sur develop.

## Phase 1 — Suppressions disque (5 min)

```bash
# Quick wins — sans impact code
rm -rf dist/
rm -rf supabase/.temp/
rm -rf naturegraph-make/  # si présent

# Ajout au .gitignore (1 ligne)
echo "supabase/.temp/" >> .gitignore
```

## Phase 2 — Suppressions assets (10 min)

```bash
# Vérifier 1 dernière fois (preview Vercel doit toujours rendre)

# Suppression orphans (validés via grep)
rm src/assets/illustrations/hermine-illustration.png
rmdir src/assets/illustrations  # devient vide
rm src/assets/images/hero-img1.png
rm src/assets/images/hero-img2.png
rm src/assets/images/hero-img3.png
rm src/assets/logos/logo-black.svg
rm src/assets/logos/logo-color.svg
rm src/assets/logos/logo-simplified-black.svg
rm src/assets/logos/logo-simplified-color.svg
rm src/assets/logos/logo-simplified-white.svg
rm src/assets/logos/logo-white.svg
```

## Phase 3 — Restructuration docs (30 min)

```bash
# Création des nouvelles catégories
mkdir -p docs/01-product docs/02-prd docs/03-audits docs/04-architecture
mkdir -p docs/05-design-system docs/06-security docs/07-devops docs/08-references
mkdir -p docs/archive/sessions

# Déplacement product
mv docs/USER_STORIES.md docs/01-product/
mv docs/PLAN_ACTION.md docs/01-product/
mv docs/RELEASE_READINESS.md docs/01-product/

# Déplacement PRDs avec renommage cohérent
mv docs/PRD-LANDING.md docs/02-prd/PRD_LANDING.md
mv docs/PRD-LOCALIZATION.md docs/02-prd/PRD_LOCALIZATION.md
mv docs/EPIC-LOCALIZATION.md docs/02-prd/EPIC_LOCALIZATION.md
mv docs/PRD_FEED_TABS.md docs/02-prd/
mv docs/PRD_HOMEPAGE.md docs/02-prd/
mv docs/PRD_NOTIFICATIONS.md docs/02-prd/
mv docs/PRD_ONBOARDING.md docs/02-prd/
mv docs/PRD_POST_FORMATS.md docs/02-prd/
mv docs/PRD_PROFILE.md docs/02-prd/
mv docs/prd/photo-management.md docs/02-prd/PRD_PHOTO_MANAGEMENT.md
rmdir docs/prd

# Déplacement audits + plans
mv docs/AUDIT_*.md docs/03-audits/
mv docs/SYNTHESE_*.md docs/03-audits/
mv docs/PLAN_ACTION_GIT.md docs/03-audits/

# Déplacement architecture
mv docs/backend/* docs/04-architecture/
rmdir docs/backend
mv docs/guidelines/backend-guidelines.md docs/04-architecture/
rmdir docs/guidelines
mv docs/api-connection/ docs/04-architecture/

# Déplacement design-system (juste renommer le dossier)
mv docs/design-system docs/05-design-system

# Déplacement security
mv docs/security docs/06-security

# Déplacement devops + DEPLOYMENT_RUNBOOK + CI_HEALTH
mv docs/devops/* docs/07-devops/
rmdir docs/devops
mv docs/DEPLOYMENT_RUNBOOK.md docs/07-devops/
mv docs/CI_HEALTH.md docs/07-devops/

# Déplacement references
mv docs/FIGMA_SCREENS.md docs/08-references/

# Archive sessions
mv second-agent/* docs/archive/sessions/
rmdir second-agent
```

## Phase 4 — Commit + push (10 min)

```bash
git checkout develop  # après Phase 0 PLAN_ACTION_GIT.md résolu

# Suite cleanup (1 commit unique pour traçabilité)
git add docs/ src/assets/ .gitignore second-agent/
git commit -m "chore(repo): restructure docs + remove orphans + archive session notes

- docs/ : reorganized into 01-product/, 02-prd/, 03-audits/, etc.
- docs/archive/sessions/ : 8 session notes moved from root second-agent/
- src/assets/ : removed 11 orphan images (~2 MB)
- .gitignore : added supabase/.temp/
- PRD-* renamed to PRD_* for naming consistency

No code change. No feature change.

Refs: docs/CLEANUP_PLAN.md"

git push origin develop
```

## Phase 5 — Mettre à jour `docs/README.md` (10 min)

Cf. `docs/PROJECT_STRUCTURE.md` (compagnon) pour le contenu détaillé du nouvel index.

---

# 🚫 Hors scope (à refuser explicitement)

| Tentation                                                | Pourquoi pas maintenant                                    |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| Refactor des composants > 200 lignes                     | RC-F, traité dans Phase 2 produit (pas du cleanup repo)    |
| Optimisation des images > 500 KB (compression WebP)      | RC-G perf, Phase 2 produit                                 |
| Suppression de dépendances "potentiellement inutilisées" | Sans audit fin (depcheck), risque de casse silencieuse     |
| Suppression de migrations SQL "anciennes"                | Toutes les migrations doivent rester pour reproductibilité |
| Renommage de fichiers code (.tsx, .ts)                   | Hors scope cleanup repo, c'est du refactor                 |
| Réorganisation src/components/                           | Hors scope, l'organisation par domaine actuelle est OK     |

---

# 🛡️ Garde-fous

## G1 — Vérification avant suppression assets

Avant chaque `rm` d'image :

```bash
# Re-vérifier qu'aucune référence n'existe (au cas où une feature en cours utilise l'asset)
grep -rE "$(basename FICHIER)" src/ index.html public/ 2>&1 | grep -v "^Binary"
```

## G2 — Vérification preview Vercel post-cleanup

Après Phase 2 (suppression assets) :

- Push sur develop
- Attendre Vercel preview
- Vérifier visuellement Landing + Profile + Home (les 3 pages les + susceptibles d'utiliser des assets)

## G3 — Backup avant Phase 3 (restructure docs)

```bash
# Snapshot rapide avant gros mouvements
git stash push -u -m "pre-cleanup-snapshot"
# ... exécuter Phase 3 ...
# Si problème : git stash pop
# Si OK : git stash drop
```

## G4 — Communication équipe

Avant Phase 3, prévenir équipe sur Discord/Slack :

> 🧹 Cleanup docs en cours sur naturegraph
>
> Tous les documents sont préservés mais déplacés vers une nouvelle hiérarchie.
> Voir docs/PROJECT_STRUCTURE.md pour la nouvelle carte.
>
> Liens directs vers les nouveaux paths sur le canal commun à venir.

---

# 📋 Checklist exécution

```
PHASE 0 — Pré-requis
  □ docs/PLAN_ACTION_GIT.md Phase 0 exécutée (rebase + develop recréée)

PHASE 1 — Suppressions disque (5 min)
  □ rm -rf dist/
  □ rm -rf supabase/.temp/
  □ rm -rf naturegraph-make/ (si présent)
  □ echo "supabase/.temp/" >> .gitignore

PHASE 2 — Suppressions assets (10 min)
  □ Vérification grep préalable sur chaque asset
  □ Suppression 11 orphans
  □ Push develop + vérification Vercel preview

PHASE 3 — Restructure docs (30 min)
  □ Création 8 catégories numérotées
  □ Déplacement docs (mv préserve git history)
  □ Renommage PRD- en PRD_
  □ Déplacement second-agent/ → docs/archive/sessions/
  □ Suppression dossiers vides (prd, guidelines, devops, backend, api-connection au root docs)

PHASE 4 — Commit + push (10 min)
  □ git add + commit unique
  □ git push origin develop
  □ Vérification CI green sur develop
  □ Promotion develop → staging → main quand validé

PHASE 5 — Index master (10 min)
  □ Réécriture docs/README.md (cf. PROJECT_STRUCTURE.md)
  □ Lien équipe vers la nouvelle structure
```

---

# 🎯 État cible

```
✅ docs/ structuré en 8 catégories explicites
✅ Tous les documents importants commités sur develop+main
✅ docs/README.md = index unique pour découvrir n'importe quoi
✅ docs/PROJECT_STRUCTURE.md = carte vivante du repo
✅ src/assets/ allégé de 2 MB d'orphelins
✅ Notes de sessions archivées (pas perdues)
✅ Naming cohérent (PRD_)
✅ Build artifacts disque nettoyés
✅ .gitignore complet
```

> **« Un nouveau membre de l'équipe trouve l'info en 30 secondes »** — état atteint.

---

# 📎 Références croisées

- `docs/PROJECT_STRUCTURE.md` — carte de référence vivante (compagnon)
- `docs/PLAN_ACTION_GIT.md` — Phase 0 pré-requise
- `docs/AUDIT_GIT.md` — pourquoi develop a été supprimée
- `CLAUDE.md` — instructions Claude (à mettre à jour avec la nouvelle structure docs)
