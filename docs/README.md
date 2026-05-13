# Documentation Naturegraph

> **Index master** — chaque sujet a un et un seul document maître. Si tu trouves un doublon, ouvre une issue.
> **Mise à jour** : à chaque ajout/déplacement de doc important.
> **Pour s'orienter** : voir aussi [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) (carte vivante équipe).

---

## 🗺️ Tu cherches… → tu vas dans…

| Question                    | Document                                                               |
| --------------------------- | ---------------------------------------------------------------------- |
| **Présentation produit**    | [`/README.md`](../README.md) (root)                                    |
| **Vision produit**          | [`USER_STORIES.md`](USER_STORIES.md)                                   |
| **Roadmap actuelle**        | [`PLAN_ACTION.md`](PLAN_ACTION.md)                                     |
| **Peut-on releaser ?**      | [`RELEASE_READINESS.md`](RELEASE_READINESS.md)                         |
| **Structure du repo**       | [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)                         |
| **Plan cleanup repo**       | [`CLEANUP_PLAN.md`](CLEANUP_PLAN.md)                                   |
| **Comment déployer ?**      | [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md)                       |
| **Santé CI**                | [`CI_HEALTH.md`](CI_HEALTH.md)                                         |
| **Index Figma**             | [`FIGMA_SCREENS.md`](FIGMA_SCREENS.md)                                 |
| **Spec d'une feature X**    | [`PRD_<FEATURE>.md`](#-prd--produit)                                   |
| **État de santé du projet** | [`SYNTHESE_AUDITS.md`](SYNTHESE_AUDITS.md)                             |
| **Audits par domaine**      | Section [Audits](#-audits)                                             |
| **Schéma DB / RLS**         | [`backend/database-architecture.md`](backend/database-architecture.md) |
| **Politiques RLS**          | [`security/rls-policies.md`](security/rls-policies.md)                 |
| **Design system tokens**    | [`design-system/tokens.md`](design-system/tokens.md)                   |

---

## ⭐ Documents centraux (à consulter en priorité)

| Document                                               | Description                                                    | Version           |
| ------------------------------------------------------ | -------------------------------------------------------------- | ----------------- |
| [`PROJECT_MASTER.md`](PROJECT_MASTER.md)               | 📌 **Source de vérité unique** engineering                     | v1.0 — 2026-05-04 |
| [`MASTER_TODO.md`](MASTER_TODO.md)                     | 📌 **Document de pilotage central** (105 tâches T-001 à T-105) | v1.0 — 2026-05-04 |
| [`CONSOLIDATION_ROADMAP.md`](CONSOLIDATION_ROADMAP.md) | Plan séquencé en 6 phases (~3 mois)                            | v1.0 — 2026-05-04 |
| [`NEXT_TASKS.md`](NEXT_TASKS.md)                       | Checklist priorisée actionable                                 | v1.0 — 2026-05-04 |

---

## 🎯 Produit & roadmap

| Document                                       | Description                                          | Version           |
| ---------------------------------------------- | ---------------------------------------------------- | ----------------- |
| [`USER_STORIES.md`](USER_STORIES.md)           | Toutes les user stories Gherkin (Prompt 1 socle)     | v1.1 — 2026-05-02 |
| [`PLAN_ACTION.md`](PLAN_ACTION.md)             | Priorisation produit (bugs, UX, backend, perf, a11y) | v1.1 — 2026-05-02 |
| [`RELEASE_READINESS.md`](RELEASE_READINESS.md) | Verdict pré-release                                  | 2026-05-02        |
| [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) | Carte vivante du repo (onboarding équipe)            | v1.0 — 2026-05-03 |
| [`CLEANUP_PLAN.md`](CLEANUP_PLAN.md)           | Plan de nettoyage du projet (v1.1 ✅ exécuté)        | v1.1 — 2026-05-04 |
| [`CLEANUP_PROJECT.md`](CLEANUP_PROJECT.md)     | Cleanup v2 post-execution (reste à nettoyer)         | v1.0 — 2026-05-04 |

---

## 📋 PRD — Produit

Tous les Product Requirement Documents, naming uniformisé `PRD_*` :

| Document                                             | Feature                             | Statut         |
| ---------------------------------------------------- | ----------------------------------- | -------------- |
| [`PRD_LANDING.md`](PRD_LANDING.md)                   | Landing page publique               | Live           |
| [`PRD_HOMEPAGE.md`](PRD_HOMEPAGE.md)                 | Homepage connecté                   | Live           |
| [`PRD_FEED_TABS.md`](PRD_FEED_TABS.md)               | Tabs Following / Pour vous          | Live           |
| [`PRD_ONBOARDING.md`](PRD_ONBOARDING.md)             | Auth + onboarding 4 étapes          | Live (RC-E v2) |
| [`PRD_PROFILE.md`](PRD_PROFILE.md)                   | Profil owner + visiteur             | Live           |
| [`PRD_POST_FORMATS.md`](PRD_POST_FORMATS.md)         | Encounter / Voyage / Notebook       | Encounter live |
| [`PRD_NOTIFICATIONS.md`](PRD_NOTIFICATIONS.md)       | Panel + digest hebdo                | Partial        |
| [`PRD_LOCALIZATION.md`](PRD_LOCALIZATION.md)         | Localisation privacy-first          | Live (Phase 1) |
| [`PRD_PHOTO_MANAGEMENT.md`](PRD_PHOTO_MANAGEMENT.md) | Photos non-destructives + EXIF      | Live (RC-D)    |
| [`EPIC_LOCALIZATION.md`](EPIC_LOCALIZATION.md)       | Découpage opérationnel localization | Live           |

---

## 🔎 Audits

État de santé du projet (audits + synthèses + plans correctifs) :

| Document                                                 | Type                                       | Date              | Verdict                        |
| -------------------------------------------------------- | ------------------------------------------ | ----------------- | ------------------------------ |
| [`SYNTHESE_AUDITS.md`](SYNTHESE_AUDITS.md)               | Synthèse causes racines RC-A à RC-G        | 2026-05-02        | Roadmap                        |
| [`SYNTHESE_GIT.md`](SYNTHESE_GIT.md)                     | Cause racine RC-H Git                      | 2026-05-03        | Action P0+P1                   |
| [`AUDIT_FLOWS.md`](AUDIT_FLOWS.md)                       | Audit fonctionnel par flow                 | v1.1              | 12 flows audités               |
| [`AUDIT_TECHNIQUE.md`](AUDIT_TECHNIQUE.md)               | Dette technique (composants, casts, TODOs) | 2026-05-02        | 5 dettes                       |
| [`AUDIT_PERFORMANCE.md`](AUDIT_PERFORMANCE.md)           | Bundle + perf + éco-conception             | 2026-05-02        | Budget 325 KB OK               |
| [`AUDIT_LEGAL.md`](AUDIT_LEGAL.md)                       | RGPD + Loi 25                              | 2026-05-02        | NC résolues                    |
| [`AUDIT_SUPABASE.md`](AUDIT_SUPABASE.md)                 | DB + RLS + Edge Functions                  | 2026-05-02        | Drift résorbé                  |
| [`AUDIT_DB_LIVE.md`](AUDIT_DB_LIVE.md)                   | État live MCP Supabase                     | 2026-05-03        | DB opérationnelle              |
| [`AUDIT_GIT.md`](AUDIT_GIT.md)                           | Repo Git + branches + workflow (v1)        | 2026-05-03        | Consolidé dans AUDIT_GITHUB.md |
| [`AUDIT_GITHUB.md`](AUDIT_GITHUB.md)                     | **v2** GitHub + Workflow + CI/CD + Repo    | 2026-05-04        | 11 problèmes, 8 axes           |
| [`AUDIT_DESIGN_SYSTEM.md`](AUDIT_DESIGN_SYSTEM.md)       | Audit DS (38 primitives, 6 PS structurels) | v1.1 — 2026-05-04 | À traiter Phase 5              |
| [`AUDIT_TECH_DEBT_GLOBAL.md`](AUDIT_TECH_DEBT_GLOBAL.md) | Dette technique globale post-fixes         | 2026-05-04        | 3 critiques + 7 + 7            |
| [`STORYBOOK_STRATEGY.md`](STORYBOOK_STRATEGY.md)         | Stratégie Storybook (mapping + roadmap)    | 2026-05-04        | Phase 5 dédiée                 |
| [`PLAN_ACTION_GIT.md`](PLAN_ACTION_GIT.md)               | Plan exécution post-audit Git (v1)         | 2026-05-03        | Consolidé dans AUDIT_GITHUB.md |

---

## 🏗️ Backend & données

| Document                                                               | Sujet                                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`backend/database-architecture.md`](backend/database-architecture.md) | Architecture DB, principes, tables, justifications             |
| [`backend/schema.sql`](backend/schema.sql)                             | Schéma SQL canonique (extensions, tables, index, triggers)     |
| [`backend/relations.md`](backend/relations.md)                         | Diagramme ER, cardinalités, justification des index            |
| [`backend/backend-guidelines.md`](backend/backend-guidelines.md)       | Règles d'or backend, conventions, anti-patterns, PR checklists |

---

## 🔌 Connexion API

| Document                                                               | Sujet                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------- |
| [`api-connection/supabase-setup.md`](api-connection/supabase-setup.md) | Setup client Supabase, env vars, gen types           |
| [`api-connection/endpoints.md`](api-connection/endpoints.md)           | Services TS, hooks React Query, cache keys, Realtime |
| [`api-connection/auth-flow.md`](api-connection/auth-flow.md)           | Signup / login / reset / delete account              |

---

## 🔒 Sécurité

| Document                                                     | Sujet                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| [`security/rls-policies.md`](security/rls-policies.md)       | Politiques RLS Postgres pour chaque table                 |
| [`security/data-protection.md`](security/data-protection.md) | RGPD : registre, exports, droit à l'oubli, sous-traitants |
| [`security/media-security.md`](security/media-security.md)   | Buckets Storage, pipeline upload, EXIF, espèces sensibles |

---

## 🚀 DevOps

| Document                                           | Sujet                                                    |
| -------------------------------------------------- | -------------------------------------------------------- |
| [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md)   | Procédure déploiement step-by-step                       |
| [`CI_HEALTH.md`](CI_HEALTH.md)                     | CI health check non-destructif                           |
| [`devops/environments.md`](devops/environments.md) | Environnements local/staging/prod, variables, migrations |
| [`devops/deployment.md`](devops/deployment.md)     | CI/CD, Vercel, headers sécurité, rollback, backups       |
| [`devops/monitoring.md`](devops/monitoring.md)     | Sentry, Supabase Advisors, métriques, alerting           |

---

## 🎨 Design system

Voir [`design-system/README.md`](design-system/README.md) pour l'index complet du design system.

| Document                                                                         | Sujet                                                    |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [`design-system/README.md`](design-system/README.md)                             | Index design system                                      |
| [`design-system/tokens.md`](design-system/tokens.md)                             | Couleurs, espacements, typographies (Quicksand + Mulish) |
| [`design-system/audit.md`](design-system/audit.md)                               | Audit cohérence UI vs Figma                              |
| [`design-system/guidelines.md`](design-system/guidelines.md)                     | Règles UI (composants < 200 lignes, tokens uniquement)   |
| [`design-system/tasks-linear.md`](design-system/tasks-linear.md)                 | Backlog tasks design                                     |
| [`design-system/components/atoms.md`](design-system/components/atoms.md)         | Atoms (Button, Input, Icon)                              |
| [`design-system/components/molecules.md`](design-system/components/molecules.md) | Molecules (FormField, Card)                              |
| [`design-system/components/organisms.md`](design-system/components/organisms.md) | Organisms (Header, Modal, Form)                          |
| [`design-system/components/templates.md`](design-system/components/templates.md) | Templates de pages                                       |

---

## 📚 Références externes

| Document                               | Sujet                                    |
| -------------------------------------- | ---------------------------------------- |
| [`FIGMA_SCREENS.md`](FIGMA_SCREENS.md) | Index nodes Figma par flow et breakpoint |

---

## 🗄️ Archive — sessions de travail historiques

> **À ne PAS y aller** pour des informations à jour — utilise plutôt PRD ou audits.
> **Y aller** pour comprendre les décisions prises pendant les sessions passées.

```
archive/sessions/
├── 01-setup-mock-data-profil.md           ← Setup mock data
├── 02-profile-header-cards-visiteur.md    ← Profil visiteur Figma
├── 03-profil-backend-notes.md             ← Profil backend Phase 2
├── 04-onglets-profil-visiteur.md          ← Onglets profil
├── 05-profil-owner-audit-refactor.md      ← Profil owner
├── 06-edit-profile-panel-pixel-perfect.md ← EditProfilePanel
├── 07-settings-panel-pixel-perfect.md     ← SettingsPanel
├── 08-backend-phase2-wiring.md            ← Backend wiring
└── README.md                              ← Index sessions
```

---

## 📐 Conventions

### Naming

| Type                           | Convention                      | Exemple                             |
| ------------------------------ | ------------------------------- | ----------------------------------- |
| Index master                   | `README.md`                     | `docs/README.md`                    |
| Documents principaux           | `MAJUSCULES_AVEC_UNDERSCORE.md` | `USER_STORIES.md`, `AUDIT_FLOWS.md` |
| Documents techniques (subdirs) | `kebab-case.md`                 | `auth-flow.md`, `rls-policies.md`   |

### Sources de vérité

- **Une source de vérité par sujet** — si un fichier en chevauche un autre, on consolide ou on supprime.
- **Le SQL est canonique** : `backend/schema.sql` reflète l'état des migrations dans `supabase/migrations/`.
- **Les types TS sont générés**, pas écrits à la main : `npx supabase gen types typescript > src/types/supabase.ts`.
- **Aucun doc legacy** dans la doc active : si une info est obsolète, on la met à jour ou on l'archive (`archive/`) — pas de `_old`, `_v1`.

### Mise à jour de cet index

À mettre à jour à chaque :

1. Ajout d'un document dans `docs/`
2. Déplacement de fichiers entre dossiers
3. Création d'une nouvelle catégorie
4. Renommage d'un document principal

**Responsable** : la personne qui ajoute/déplace.

---

## 🚀 Onboarding nouveau membre — checklist

```
JOUR 1
□ Lire CLAUDE.md (instructions IA = base de la culture projet)
□ Lire README.md (présentation produit)
□ Lire CONTRIBUTING.md (workflow Git)
□ Lire docs/USER_STORIES.md (vision produit)
□ Lire docs/PLAN_ACTION.md (roadmap actuelle)
□ Lire docs/PROJECT_STRUCTURE.md (carte du repo)

JOUR 2
□ Lire GUIDELINES.md (éco-conception + a11y, 56 KB mais critique)
□ Parcourir docs/design-system/tokens.md (Figma tokens)
□ Parcourir docs/backend/database-architecture.md (DB)
□ Setup local : npm install + npx supabase start

JOUR 3
□ Choisir une issue de la roadmap (PLAN_ACTION.md § Quick Wins)
□ Lire le PRD correspondant (docs/PRD_X.md)
□ Lire les audits relatifs (docs/AUDIT_*.md)
□ Implémenter avec PR vers develop (cf. CONTRIBUTING.md)
```

---

## 📞 Référent par domaine

| Domaine            | Document principal                                                                |
| ------------------ | --------------------------------------------------------------------------------- |
| Vision produit     | [`USER_STORIES.md`](USER_STORIES.md)                                              |
| UX/Design          | [`design-system/`](design-system/README.md)                                       |
| Backend / Supabase | [`backend/database-architecture.md`](backend/database-architecture.md)            |
| Sécurité / RGPD    | [`security/`](security/data-protection.md) + [`AUDIT_LEGAL.md`](AUDIT_LEGAL.md)   |
| Déploiement Vercel | [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md)                                  |
| Audits & dettes    | [`SYNTHESE_AUDITS.md`](SYNTHESE_AUDITS.md) + [`SYNTHESE_GIT.md`](SYNTHESE_GIT.md) |

---

## 🎯 Critères de succès

Cet index est **réussi** si :

✅ Un nouveau membre trouve l'info qu'il cherche en **moins de 30 secondes**
✅ Il n'a **jamais** besoin de demander "où est le doc X ?"
✅ Tous les documents importants sont **commités** sur `main`
✅ Les liens cliquables fonctionnent (pas de référence cassée)
