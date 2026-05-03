# Naturegraph — Carte du projet

> **Version** : 1.0 — 2026-05-03
> **Public cible** : équipe technique + nouveaux contributeurs + Nicolas
> **Mise à jour** : à chaque ajout/déplacement de document important
> **Lecture cible** : 5 minutes pour s'orienter

> **🎯 Objectif** : trouver n'importe quel document en moins de 30 secondes.

---

# 🗺️ Carte rapide

## Tu cherches… → tu vas dans…

| Question                                  | Document                                           |
| ----------------------------------------- | -------------------------------------------------- |
| **Quoi construire ?** (vision produit)    | `docs/01-product/USER_STORIES.md`                  |
| **Quelle est la roadmap ?**               | `docs/01-product/PLAN_ACTION.md`                   |
| **Est-ce qu'on peut releaser ?**          | `docs/01-product/RELEASE_READINESS.md`             |
| **Comment marche la feature X ?** (specs) | `docs/02-prd/PRD_X.md`                             |
| **État de santé du projet ?**             | `docs/03-audits/SYNTHESE_AUDITS.md`                |
| **Audit fonctionnel**                     | `docs/03-audits/AUDIT_FLOWS.md`                    |
| **Audit dette technique**                 | `docs/03-audits/AUDIT_TECHNIQUE.md`                |
| **Audit performance / éco**               | `docs/03-audits/AUDIT_PERFORMANCE.md`              |
| **Audit RGPD / Loi 25**                   | `docs/03-audits/AUDIT_LEGAL.md`                    |
| **Audit DB Supabase**                     | `docs/03-audits/AUDIT_SUPABASE.md`                 |
| **Audit Git / repo**                      | `docs/03-audits/AUDIT_GIT.md`                      |
| **Schéma DB / RLS**                       | `docs/04-architecture/database-architecture.md`    |
| **Authentification flow**                 | `docs/04-architecture/api-connection/auth-flow.md` |
| **Design system tokens**                  | `docs/05-design-system/tokens.md`                  |
| **Composants atoms/molecules**            | `docs/05-design-system/components/atoms.md`        |
| **Politiques RLS**                        | `docs/06-security/rls-policies.md`                 |
| **Sécurité media**                        | `docs/06-security/media-security.md`               |
| **Comment déployer ?**                    | `docs/07-devops/DEPLOYMENT_RUNBOOK.md`             |
| **CI / Health check**                     | `docs/07-devops/CI_HEALTH.md`                      |
| **Variables d'environnement**             | `docs/07-devops/environments.md`                   |
| **Index Figma**                           | `docs/08-references/FIGMA_SCREENS.md`              |

---

# 📁 Structure complète du repo

```
ClaudeDev_Naturegraph/
│
├── 📦 Configuration projet
│   ├── package.json                   ← Dépendances + scripts npm
│   ├── package-lock.json              ← Lock dependencies
│   ├── tsconfig.*.json                ← TypeScript config (3 fichiers)
│   ├── vite.config.ts                 ← Vite bundler config
│   ├── vitest.config.ts               ← Vitest test config
│   ├── eslint.config.js               ← ESLint flat config
│   ├── vercel.json                    ← Vercel deployment config
│   ├── .editorconfig                  ← Cohérence éditeur
│   ├── .prettierrc                    ← Format config
│   ├── .gitignore
│   ├── .env.example                   ← Template variables d'environnement
│   └── index.html                     ← Entry point HTML
│
├── 📜 Instructions IA & contributeurs
│   ├── CLAUDE.md                      ← Instructions Claude Code
│   ├── CONTRIBUTING.md                ← Guide contributeurs humains
│   ├── GUIDELINES.md                  ← Éco-conception + WCAG AA (56 KB)
│   └── README.md                      ← Présentation projet
│
├── 🧰 Tooling & scripts
│   ├── scripts/                       ← Scripts utilitaires (ci-health, seed, screenshots)
│   ├── .husky/                        ← Git hooks (pre-commit lint+format)
│   ├── .github/workflows/             ← GitHub Actions CI
│   └── .agents/skills/                ← Config Claude agents (machine-specific)
│
├── 💻 Code source
│   └── src/
│       ├── App.tsx                    ← Root component
│       ├── main.tsx                   ← Bootstrap React
│       ├── router.tsx                 ← React Router config
│       ├── index.css                  ← Tailwind imports
│       ├── vite-env.d.ts
│       │
│       ├── assets/                    ← Images + logos + illustrations + partners
│       ├── components/                ← Composants par domaine
│       │   ├── auth/                  ← LoginForm, OTP, magic link
│       │   ├── contribute/            ← EncounterStep1/2, MediaUploader
│       │   ├── guards/                ← OnboardingGuard, AuthGuard
│       │   ├── home/                  ← FeedSection, FeedPost, MobileBottomNav
│       │   ├── icons/                 ← Custom SVG components
│       │   ├── layout/                ← Header, Footer, MainLayout, CookieBanner
│       │   ├── location/              ← Carte Leaflet, geocoding
│       │   ├── notifications/         ← NotificationsPanel, badges
│       │   ├── onboarding/            ← OnboardingInterests, Step2/3/4
│       │   ├── profile/               ← ProfileHeader, EditPanel, tabs
│       │   ├── settings/              ← SettingsPanel, DeleteAccountModal
│       │   ├── templates/             ← Page templates
│       │   └── ui/                    ← Composants génériques (Button, Modal, Input)
│       │
│       ├── constants/                 ← Constantes app (couleurs, routes, etc.)
│       ├── contexts/                  ← React Contexts (Auth, Theme, Toast)
│       ├── hooks/                     ← Custom hooks (useFeed, useDataExport, etc.)
│       ├── i18n/                      ← Traductions FR + EN + config i18next
│       ├── lib/                       ← Singleton utilities (supabase, queryClient, debugLog)
│       ├── pages/                     ← Pages routées (Home, Profile, Privacy, Legal)
│       ├── services/                  ← 21 services métier (postService, mediaService, etc.)
│       ├── styles/                    ← SCSS 7-1 pattern (synchronisé Figma)
│       ├── test/setup.ts              ← Vitest setup
│       ├── types/                     ← TypeScript types (database.ts, supabase.ts)
│       └── utils/                     ← Utility functions (stripImageExif, formatDate, etc.)
│
├── 🌐 Public assets (servis directement)
│   └── public/
│       ├── hermine-icon.png           ← Favicon + apple-touch-icon
│       └── og-preview.png             ← Open Graph image (réseaux sociaux)
│
├── 🗄️ Backend Supabase
│   └── supabase/
│       ├── functions/                 ← Edge Functions
│       │   ├── delete-account/        ← Suppression RGPD
│       │   ├── export-data/           ← Export RGPD JSON
│       │   └── weekly-species-digest/ ← Cron digest hebdo
│       └── migrations/                ← 41+ migrations SQL (PostGIS + RLS)
│
└── 📚 Documentation (cf. ci-dessous)
    └── docs/
```

---

# 📚 Structure docs/ — détail

## Vision globale

```
docs/
├── README.md                          ← INDEX MASTER (ce que tu lis pour t'orienter)
├── PROJECT_STRUCTURE.md               ← Carte du repo (ce document)
├── CLEANUP_PLAN.md                    ← Plan de nettoyage repo (référence)
│
├── 01-product/                        ← Vision + roadmap + décisions
├── 02-prd/                            ← Product Requirement Documents (specs feature)
├── 03-audits/                         ← Audits + synthèses + plans correctifs
├── 04-architecture/                   ← Backend + DB + API
├── 05-design-system/                  ← UI tokens + composants Figma
├── 06-security/                       ← RLS + media + data protection
├── 07-devops/                         ← Déploiement + CI + monitoring
├── 08-references/                     ← Liens externes (Figma)
│
└── archive/                           ← Notes de sessions passées (référence historique)
    └── sessions/
```

## 01-product/ — Vision & roadmap

| Fichier                | Description                                          | À jour ?          |
| ---------------------- | ---------------------------------------------------- | ----------------- |
| `USER_STORIES.md`      | Toutes les user stories Gherkin (Prompt 1 socle)     | v1.1 — 2026-05-02 |
| `PLAN_ACTION.md`       | Priorisation produit (bugs, UX, backend, perf, a11y) | v1.1 — 2026-05-02 |
| `RELEASE_READINESS.md` | Verdict pré-release                                  | 2026-05-02        |

**Quand y aller ?** Avant de commencer à coder une feature, pour vérifier qu'elle est dans le scope.

## 02-prd/ — Product Requirement Documents

| Fichier                   | Feature                             | Statut                     |
| ------------------------- | ----------------------------------- | -------------------------- |
| `PRD_LANDING.md`          | Page d'accueil publique             | Live                       |
| `PRD_HOMEPAGE.md`         | Home connecté                       | Live                       |
| `PRD_FEED_TABS.md`        | Tabs Following / Pour vous          | Live                       |
| `PRD_ONBOARDING.md`       | Flow 4 étapes signup                | Live (RC-E v2)             |
| `PRD_PROFILE.md`          | Profil owner + visiteur             | Live                       |
| `PRD_POST_FORMATS.md`     | Encounter / Voyage / Notebook       | Encounter live             |
| `PRD_NOTIFICATIONS.md`    | Notifications panel + digest        | Partial                    |
| `PRD_LOCALIZATION.md`     | Privacy-first localization          | Live (Phase 1)             |
| `PRD_PHOTO_MANAGEMENT.md` | Gestion photos non-destructive      | Live (RC-D EXIF stripping) |
| `EPIC_LOCALIZATION.md`    | Découpage opérationnel localization | Live                       |

**Quand y aller ?** Pour comprendre les specs précises d'une feature avant de la modifier.

## 03-audits/ — Santé du projet

| Fichier                | Type                                       | Date              | Verdict                     |
| ---------------------- | ------------------------------------------ | ----------------- | --------------------------- |
| `SYNTHESE_AUDITS.md`   | Synthèse causes racines RC-A à RC-G        | 2026-05-02        | Roadmap Phase 1+2           |
| `SYNTHESE_GIT.md`      | Cause racine RC-H Git                      | 2026-05-03        | Action P0+P1                |
| `AUDIT_FLOWS.md`       | Audit fonctionnel par flow                 | v1.1 — 2026-05-02 | 12 flows audités            |
| `AUDIT_TECHNIQUE.md`   | Dette technique (composants, casts, TODOs) | 2026-05-02        | 5 dettes structurelles      |
| `AUDIT_PERFORMANCE.md` | Bundle + perf + éco-conception             | 2026-05-02        | Budget 325 KB OK            |
| `AUDIT_LEGAL.md`       | RGPD + Loi 25                              | 2026-05-02        | NC résolues post PR #41-#52 |
| `AUDIT_SUPABASE.md`    | DB + RLS + Edge Functions                  | 2026-05-02        | Drift résorbé               |
| `AUDIT_DB_LIVE.md`     | État live MCP Supabase                     | 2026-05-03        | 🟢 DB opérationnelle        |
| `AUDIT_GIT.md`         | Repo Git + branches + workflow             | 2026-05-03        | 3 critiques + 5 dettes      |
| `PLAN_ACTION_GIT.md`   | Plan exécution post-audit Git              | 2026-05-03        | Phase 0 + 1 + 2             |

**Quand y aller ?** Avant un sprint cleanup, pour identifier les vrais problèmes vs les faux problèmes.

## 04-architecture/ — Backend & données

| Fichier                            | Description                                 |
| ---------------------------------- | ------------------------------------------- |
| `database-architecture.md`         | Source de vérité schema Supabase            |
| `relations.md`                     | Relations entre tables (foreign keys)       |
| `schema.sql`                       | Dump SQL référence                          |
| `backend-guidelines.md`            | Conventions backend (RLS, triggers, naming) |
| `api-connection/auth-flow.md`      | Flow magic link OTP                         |
| `api-connection/endpoints.md`      | Liste Edge Functions + signatures           |
| `api-connection/supabase-setup.md` | Setup local Supabase CLI                    |

**Quand y aller ?** Avant toute modification de schema DB ou Edge Function.

## 05-design-system/ — UI

| Fichier                   | Description                                                  |
| ------------------------- | ------------------------------------------------------------ |
| `README.md`               | Index design system                                          |
| `tokens.md`               | Couleurs, espacements, typographies (Quicksand + Mulish)     |
| `audit.md`                | Audit cohérence UI vs Figma                                  |
| `guidelines.md`           | Règles UI (composants < 200 lignes, tokens uniquement, etc.) |
| `tasks-linear.md`         | Backlog tasks design                                         |
| `components/atoms.md`     | Atoms (Button, Input, Icon)                                  |
| `components/molecules.md` | Molecules (FormField, Card)                                  |
| `components/organisms.md` | Organisms (Header, Modal, Form)                              |
| `components/templates.md` | Templates de pages                                           |

**Quand y aller ?** Avant de créer un nouveau composant UI.

## 06-security/ — Sécurité & RGPD

| Fichier              | Description                                 |
| -------------------- | ------------------------------------------- |
| `rls-policies.md`    | Toutes les policies Row Level Security      |
| `media-security.md`  | Storage policies + EXIF stripping + buckets |
| `data-protection.md` | RGPD + Loi 25 + droits utilisateurs         |

**Quand y aller ?** Avant de toucher aux RLS ou au stockage Supabase.

## 07-devops/ — Déploiement & monitoring

| Fichier                 | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `DEPLOYMENT_RUNBOOK.md` | Procédure déploiement step-by-step                 |
| `CI_HEALTH.md`          | CI health check non-destructif                     |
| `deployment.md`         | Vue d'ensemble déploiement Vercel                  |
| `environments.md`       | Variables d'env par branche (Production / Preview) |
| `monitoring.md`         | Alertes + Sentry + logs Supabase                   |

**Quand y aller ?** Avant un release ou pour ajouter une variable d'env.

## 08-references/ — Liens externes

| Fichier            | Description                              |
| ------------------ | ---------------------------------------- |
| `FIGMA_SCREENS.md` | Index nodes Figma + correspondance React |

**Quand y aller ?** Pour retrouver un node Figma précis.

## archive/ — Mémoire historique

```
archive/sessions/
├── 01-setup-mock-data-profil.md
├── 02-profile-header-cards-visiteur.md
├── 03-profil-backend-notes.md
├── 04-onglets-profil-visiteur.md
├── 05-profil-owner-audit-refactor.md
├── 06-edit-profile-panel-pixel-perfect.md
├── 07-settings-panel-pixel-perfect.md
└── 08-backend-phase2-wiring.md
```

**Quand y aller ?** Pour comprendre les décisions prises pendant les sessions passées (contexte historique).
**À ne PAS y aller :** pour des informations à jour — utilise plutôt 01-product/ ou 02-prd/.

---

# 🔧 Conventions de naming

## Documents

| Type                 | Convention                      | Exemple                             |
| -------------------- | ------------------------------- | ----------------------------------- |
| Index master         | `README.md`                     | `docs/README.md`                    |
| Documents principaux | `MAJUSCULES_AVEC_UNDERSCORE.md` | `USER_STORIES.md`, `AUDIT_FLOWS.md` |
| Documents techniques | `kebab-case.md`                 | `auth-flow.md`, `rls-policies.md`   |
| Préfixes catégoriels | `01-`, `02-`, ...               | `01-product/`, `02-prd/`            |

## Branches Git

| Type     | Convention                  | Exemple                       |
| -------- | --------------------------- | ----------------------------- |
| Feature  | `feat/<description-kebab>`  | `feat/onboarding-persistence` |
| Fix      | `fix/<description-kebab>`   | `fix/exif-strip-upload`       |
| Chore    | `chore/<description-kebab>` | `chore/cleanup-orphan-assets` |
| Refactor | `refactor/<description>`    | `refactor/feedpost-split`     |
| Docs     | `docs/<description>`        | `docs/restructure-cleanup`    |

## Commits

```
<type>(<scope>): <description courte impératif>

<corps optionnel>

<footer optionnel>

Co-Authored-By: ...
```

Types autorisés : `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `ci`, `test`, `style`.

---

# 🔄 Mise à jour de cette carte

Cette carte (PROJECT_STRUCTURE.md) doit être mise à jour à chaque :

1. **Ajout d'un document important** dans `docs/`
2. **Déplacement de fichiers** entre catégories
3. **Création d'une nouvelle catégorie**
4. **Renommage** d'un document principal

**Responsable mise à jour** : la personne qui ajoute/déplace.

**Si tu n'es pas sûr** : demande à Nicolas avant de toucher cette carte.

---

# 🚀 Onboarding nouveau membre — checklist

Pour un nouveau dev qui rejoint l'équipe :

```
JOUR 1
□ Lire CLAUDE.md (instructions IA = base de la culture projet)
□ Lire README.md (présentation produit)
□ Lire CONTRIBUTING.md (workflow Git)
□ Lire docs/01-product/USER_STORIES.md (vision produit)
□ Lire docs/01-product/PLAN_ACTION.md (roadmap actuelle)
□ Lire docs/PROJECT_STRUCTURE.md (cette carte)

JOUR 2
□ Lire GUIDELINES.md (éco-conception + a11y, 56 KB mais critique)
□ Parcourir docs/05-design-system/tokens.md (Figma tokens)
□ Parcourir docs/04-architecture/database-architecture.md (DB)
□ Setup local : npm install + npx supabase start (cf. supabase-setup.md)

JOUR 3
□ Choisir une issue de la roadmap (PLAN_ACTION.md § Quick Wins)
□ Lire le PRD correspondant (docs/02-prd/PRD_X.md)
□ Lire les audits relatifs (docs/03-audits/)
□ Implémenter avec PR vers develop (cf. CONTRIBUTING.md)
```

---

# 📞 Qui contacter pour quoi ?

| Domaine             | Référent        | Document principal                          |
| ------------------- | --------------- | ------------------------------------------- |
| Vision produit      | Nicolas Douaron | `01-product/USER_STORIES.md`                |
| Décisions UX/Design | Nicolas Douaron | `05-design-system/`                         |
| Backend / Supabase  | Nicolas Douaron | `04-architecture/`                          |
| Sécurité / RGPD     | Nicolas Douaron | `06-security/` + `03-audits/AUDIT_LEGAL.md` |
| Déploiement Vercel  | Nicolas Douaron | `07-devops/DEPLOYMENT_RUNBOOK.md`           |
| Audits & dettes     | Nicolas Douaron | `03-audits/SYNTHESE_AUDITS.md`              |

---

# 📎 Références croisées

- `docs/CLEANUP_PLAN.md` — plan exécution cleanup repo (génère cette structure)
- `docs/03-audits/AUDIT_GIT.md` — audit Git (workflow, branches, drift)
- `docs/03-audits/PLAN_ACTION_GIT.md` — plan exécution Git (phase 0 pré-requis)
- `CLAUDE.md` — instructions Claude Code (à mettre à jour si structure docs change)

---

# 🎯 Critères de succès

Cette carte est **réussie** si :

✅ Un nouveau membre trouve l'info qu'il cherche en **moins de 30 secondes** via cet index
✅ Il n'a **jamais** besoin de demander "où est le doc X ?"
✅ Les modifications de structure sont **rares** (signe de stabilité)
✅ Les sections **archive/** restent stables (on n'y rajoute pas par défaut, on archive seulement)
✅ Tous les documents importants sont **commités** sur `main` (jamais en local-only)

Si l'un de ces critères n'est plus rempli → relire `docs/CLEANUP_PLAN.md` et appliquer.
