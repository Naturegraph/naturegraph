# Documentation Naturegraph

> **Index master** — chaque sujet a un et un seul document maître.
> **Mise à jour** : à chaque ajout/déplacement de doc important.
> **Etat post cycle 1** (2026-05-13) : 98/117 taches livrees, refondu BATCH 26.

---

## ⭐ Point d'entree — commencer ici

| Document                                          | Description                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 🎯 [`STATUS_2026-05-13.md`](STATUS_2026-05-13.md) | **Bilan final cycle 1** — etat technique global, 25 BATCHES livres, 19 taches restantes, recommandations reprise          |
| 📌 [`MASTER_TODO.md`](MASTER_TODO.md)             | **Pilotage central v2.0** — 19 taches restantes organisees par contexte (refactos / Phase 2 / DS+Storybook / post-deploy) |
| 📂 [`PROJECT_MASTER.md`](PROJECT_MASTER.md)       | **Source de verite engineering**                                                                                          |
| 🗺️ [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) | **Carte vivante** du repo (onboarding equipe)                                                                             |

---

## 🗺️ Tu cherches… → tu vas dans…

| Question                   | Document                                                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Etat actuel du projet**  | [`STATUS_2026-05-13.md`](STATUS_2026-05-13.md)                                                                                                                                                                 |
| **Que faire maintenant ?** | [`MASTER_TODO.md`](MASTER_TODO.md)                                                                                                                                                                             |
| **Workflow git + commits** | [`../CONTRIBUTING.md`](../CONTRIBUTING.md)                                                                                                                                                                     |
| **Historique releases**    | [`../CHANGELOG.md`](../CHANGELOG.md)                                                                                                                                                                           |
| **Vision produit**         | [`USER_STORIES.md`](USER_STORIES.md)                                                                                                                                                                           |
| **Spec d'une feature X**   | [`PRD_<FEATURE>.md`](#-prd--produit)                                                                                                                                                                           |
| **Schema DB + RLS**        | [`backend/database-architecture.md`](backend/database-architecture.md)                                                                                                                                         |
| **Politiques RLS**         | [`security/rls-policies.md`](security/rls-policies.md)                                                                                                                                                         |
| **Design system tokens**   | [`design-system/tokens.md`](design-system/tokens.md)                                                                                                                                                           |
| **Strategies Phase 2**     | [`BETA_CLOSED_ACCESS_STRATEGY.md`](BETA_CLOSED_ACCESS_STRATEGY.md) + [`ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md`](ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md) + [`STORYBOOK_STRATEGY.md`](STORYBOOK_STRATEGY.md) |
| **Comment deployer ?**     | [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md)                                                                                                                                                               |
| **Sante CI**               | [`CI_HEALTH.md`](CI_HEALTH.md)                                                                                                                                                                                 |
| **Index Figma**            | [`FIGMA_SCREENS.md`](FIGMA_SCREENS.md)                                                                                                                                                                         |
| **Audits DB live**         | [`AUDIT_ADVISORS_2026-05-13.md`](AUDIT_ADVISORS_2026-05-13.md) + [`AUDIT_DEAD_CODE_2026-05-13.md`](AUDIT_DEAD_CODE_2026-05-13.md)                                                                              |

---

## 🧭 Conventions techniques

| Document                                         | Description                                         |
| ------------------------------------------------ | --------------------------------------------------- |
| [`CONVENTIONS_TODO.md`](CONVENTIONS_TODO.md)     | Format TODO `(YYYY-MM-DD, owner, #issue)`           |
| [`PATTERN_TYPE_CASTS.md`](PATTERN_TYPE_CASTS.md) | Convention `as unknown as X` (narrowing DB-garanti) |

---

## 📋 PRD — Produit

Tous les Product Requirement Documents, naming uniformise `PRD_*` :

| Document                                             | Feature                             | Statut         |
| ---------------------------------------------------- | ----------------------------------- | -------------- |
| [`PRD_LANDING.md`](PRD_LANDING.md)                   | Landing page publique               | Live           |
| [`PRD_HOMEPAGE.md`](PRD_HOMEPAGE.md)                 | Homepage connecte                   | Live           |
| [`PRD_FEED_TABS.md`](PRD_FEED_TABS.md)               | Tabs Following / Pour vous          | Live           |
| [`PRD_ONBOARDING.md`](PRD_ONBOARDING.md)             | Auth + onboarding 4 etapes          | Live (RC-E v2) |
| [`PRD_PROFILE.md`](PRD_PROFILE.md)                   | Profil owner + visiteur             | Live           |
| [`PRD_POST_FORMATS.md`](PRD_POST_FORMATS.md)         | Encounter / Voyage / Notebook       | Encounter live |
| [`PRD_NOTIFICATIONS.md`](PRD_NOTIFICATIONS.md)       | Panel + digest hebdo                | Partial        |
| [`PRD_LOCALIZATION.md`](PRD_LOCALIZATION.md)         | Localisation privacy-first          | Live (Phase 1) |
| [`PRD_PHOTO_MANAGEMENT.md`](PRD_PHOTO_MANAGEMENT.md) | Photos non-destructives + EXIF      | Live (RC-D)    |
| [`EPIC_LOCALIZATION.md`](EPIC_LOCALIZATION.md)       | Decoupage operationnel localization | Live           |

---

## 🔮 Strategies Phase 2 (futures)

| Document                                                                               | Description                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`BETA_CLOSED_ACCESS_STRATEGY.md`](BETA_CLOSED_ACCESS_STRATEGY.md)                     | Strategie beta fermee 50→100→public, cles d'acces, garde-fous |
| [`ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md`](ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md) | Centre de controle admin (10 modules, ~26j dev)               |
| [`STORYBOOK_STRATEGY.md`](STORYBOOK_STRATEGY.md)                                       | Plan Storybook complet (T-045-T-052)                          |

---

## 🔎 Audits frais (post cycle 1, 2026-05-13)

| Document                                                         | Sujet                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| [`AUDIT_ADVISORS_2026-05-13.md`](AUDIT_ADVISORS_2026-05-13.md)   | Advisors Supabase live (63 security + 146 performance) |
| [`AUDIT_DEAD_CODE_2026-05-13.md`](AUDIT_DEAD_CODE_2026-05-13.md) | Audit knip — analyse contextuelle des "unused"         |

> Pour les audits anterieurs (avant cycle 1), voir [`archive/cycle-1-may-2026/`](archive/cycle-1-may-2026/).

---

## 🏗️ Backend & donnees

| Document                                                               | Sujet                                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`backend/database-architecture.md`](backend/database-architecture.md) | Architecture DB, principes, tables, justifications             |
| [`backend/schema.sql`](backend/schema.sql)                             | Schema SQL canonique (extensions, tables, index, triggers)     |
| [`backend/relations.md`](backend/relations.md)                         | Diagramme ER, cardinalites, justification des index            |
| [`backend/backend-guidelines.md`](backend/backend-guidelines.md)       | Regles d'or backend, conventions, anti-patterns, PR checklists |

---

## 🔌 Connexion API

| Document                                                               | Sujet                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------- |
| [`api-connection/supabase-setup.md`](api-connection/supabase-setup.md) | Setup client Supabase, env vars, gen types           |
| [`api-connection/endpoints.md`](api-connection/endpoints.md)           | Services TS, hooks React Query, cache keys, Realtime |
| [`api-connection/auth-flow.md`](api-connection/auth-flow.md)           | Signup / login / reset / delete account              |

---

## 🔒 Securite

| Document                                                     | Sujet                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| [`security/rls-policies.md`](security/rls-policies.md)       | Politiques RLS Postgres pour chaque table                 |
| [`security/data-protection.md`](security/data-protection.md) | RGPD : registre, exports, droit a l'oubli, sous-traitants |
| [`security/media-security.md`](security/media-security.md)   | Buckets Storage, pipeline upload, EXIF, especes sensibles |

---

## 🚀 DevOps

| Document                                           | Sujet                                                    |
| -------------------------------------------------- | -------------------------------------------------------- |
| [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md)   | Procedure deploiement step-by-step                       |
| [`CI_HEALTH.md`](CI_HEALTH.md)                     | CI health check non-destructif                           |
| [`devops/environments.md`](devops/environments.md) | Environnements local/staging/prod, variables, migrations |
| [`devops/deployment.md`](devops/deployment.md)     | CI/CD, Vercel, headers securite, rollback, backups       |
| [`devops/monitoring.md`](devops/monitoring.md)     | Sentry, Supabase Advisors, metriques, alerting           |

---

## 🎨 Design system

Voir [`design-system/README.md`](design-system/README.md) pour l'index complet du DS.

| Document                                                                         | Sujet                                                    |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [`design-system/README.md`](design-system/README.md)                             | Index design system                                      |
| [`design-system/tokens.md`](design-system/tokens.md)                             | Couleurs, espacements, typographies (Quicksand + Mulish) |
| [`design-system/audit.md`](design-system/audit.md)                               | Audit coherence UI vs Figma                              |
| [`design-system/guidelines.md`](design-system/guidelines.md)                     | Regles UI (composants < 200 lignes, tokens uniquement)   |
| [`design-system/components/atoms.md`](design-system/components/atoms.md)         | Atoms (Button, Input, Icon)                              |
| [`design-system/components/molecules.md`](design-system/components/molecules.md) | Molecules (FormField, Card)                              |
| [`design-system/components/organisms.md`](design-system/components/organisms.md) | Organisms (Header, Modal, Form)                          |
| [`design-system/components/templates.md`](design-system/components/templates.md) | Templates de pages                                       |

---

## 📚 References

| Document                               | Sujet                                    |
| -------------------------------------- | ---------------------------------------- |
| [`FIGMA_SCREENS.md`](FIGMA_SCREENS.md) | Index nodes Figma par flow et breakpoint |
| [`USER_STORIES.md`](USER_STORIES.md)   | Toutes les user stories Gherkin          |

---

## 🗄️ Archives

> **A ne PAS y aller** pour des informations a jour — utilise plutot les docs vivants ci-dessus.
> **Y aller** pour comprendre l'historique des decisions techniques.

| Archive                                                  | Contenu                                                 | Periode                 |
| -------------------------------------------------------- | ------------------------------------------------------- | ----------------------- |
| [`archive/cycle-1-may-2026/`](archive/cycle-1-may-2026/) | 16 docs cycle 1 : plans, audits, quick wins             | 2026-04-29 → 2026-05-13 |
| [`archive/audits-v1/`](archive/audits-v1/)               | 4 docs audit v1 (TECHNIQUE, GIT, SYNTHESE, PLAN_ACTION) | 2026-05-02 → 2026-05-04 |
| [`archive/sessions/`](archive/sessions/)                 | Notes de sessions de travail passees                    | Historique              |

---

## 📜 Historique cycles

- **Cycle 1** (2026-04-29 → 2026-05-13) : 25 BATCHES, 98 taches livrees, base MVP production-ready.
  → Bilan complet : [`STATUS_2026-05-13.md`](STATUS_2026-05-13.md)
  → Docs archivees : [`archive/cycle-1-may-2026/`](archive/cycle-1-may-2026/)
