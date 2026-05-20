# Documentation Naturegraph

> Index master — chaque sujet a un et un seul document maître.
> Mise à jour : 2026-05-20 (ajout audit sécurité & conformité).

---

## ⭐ Points d'entrée

| Document                                                                                  | Description                                                     |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 🚀 [`BETA_LAUNCH_RUNBOOK.md`](BETA_LAUNCH_RUNBOOK.md)                                     | Runbook opérationnel — 8 sections A-H pour passer en prod       |
| 🎯 [`BETA_CLOSED_ACCESS_STRATEGY.md`](BETA_CLOSED_ACCESS_STRATEGY.md)                     | Stratégie beta fermée v2.0 (clés d'accès, garde-fous, 3 phases) |
| 🛡 [`ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md`](ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md) | Stratégie admin MVP v2.0 (5 modules livrés)                     |
| 📖 [`USER_STORIES.md`](USER_STORIES.md)                                                   | Vision produit complète (référence QA)                          |

---

## 🗺️ Tu cherches… → tu vas dans…

| Question                 | Document                                                               |
| ------------------------ | ---------------------------------------------------------------------- |
| Workflow git + commits   | [`../CONTRIBUTING.md`](../CONTRIBUTING.md)                             |
| Historique releases      | [`../CHANGELOG.md`](../CHANGELOG.md)                                   |
| Eco-design + perf budget | [`../GUIDELINES.md`](../GUIDELINES.md)                                 |
| Spec d'une feature       | section **PRD** ci-dessous                                             |
| Schéma DB + RLS          | [`backend/database-architecture.md`](backend/database-architecture.md) |
| Politiques RLS           | [`security/rls-policies.md`](security/rls-policies.md)                 |
| Design system tokens     | [`design-system/tokens.md`](design-system/tokens.md)                   |
| Comment déployer         | [`BETA_LAUNCH_RUNBOOK.md`](BETA_LAUNCH_RUNBOOK.md) sections A-H        |
| Setup Supabase + auth    | [`api-connection/`](api-connection/)                                   |
| Variables d'env          | [`devops/environments.md`](devops/environments.md)                     |

---

## 📋 PRD — Produit

Tous les Product Requirement Documents (naming uniformisé `PRD_*`) :

| Document                                             | Feature                              | Statut               |
| ---------------------------------------------------- | ------------------------------------ | -------------------- |
| [`PRD_LANDING.md`](PRD_LANDING.md)                   | Landing page publique                | Live                 |
| [`PRD_HOMEPAGE.md`](PRD_HOMEPAGE.md)                 | Homepage connectée (feed + tabs)     | Live                 |
| [`PRD_ONBOARDING.md`](PRD_ONBOARDING.md)             | Auth + onboarding 4 étapes           | Live                 |
| [`PRD_PROFILE.md`](PRD_PROFILE.md)                   | Profil owner + visiteur              | Live                 |
| [`PRD_PHOTO_MANAGEMENT.md`](PRD_PHOTO_MANAGEMENT.md) | Upload + gallery photo               | Live                 |
| [`PRD_POST_FORMATS.md`](PRD_POST_FORMATS.md)         | Formats observation / identification | Live                 |
| [`PRD_NOTIFICATIONS.md`](PRD_NOTIFICATIONS.md)       | Notifications + panel                | Live                 |
| [`PRD_LOCALIZATION.md`](PRD_LOCALIZATION.md)         | i18n FR/EN                           | Phase 1 (EN différé) |

---

## 🏗️ Architecture

| Dossier                              | Contenu                                      |
| ------------------------------------ | -------------------------------------------- |
| [`backend/`](backend/)               | Schema DB, relations FK, conventions backend |
| [`api-connection/`](api-connection/) | Setup Supabase, auth flow, endpoints         |
| [`design-system/`](design-system/)   | Tokens, guidelines, composants Figma         |
| [`security/`](security/)             | RLS, RGPD, sécurité médias                   |
| [`devops/`](devops/)                 | Deployment, environments, monitoring         |

---

## 🔐 Audit sécurité & conformité (2026-05-20)

Audit complet — 0 faille critique. Posture saine pour un MVP, durcissement priorisé.

| Document                                                                             | Périmètre                                          |
| ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [`security/SECURITY_AUDIT_GLOBAL.md`](security/SECURITY_AUDIT_GLOBAL.md)             | Frontend + synthèse exécutive                      |
| [`security/SECURITY_SUPABASE.md`](security/SECURITY_SUPABASE.md)                     | RLS, fonctions, Auth, Storage, Edge Functions      |
| [`security/SECURITY_GITHUB.md`](security/SECURITY_GITHUB.md)                         | Dépôt, branch protection, secrets, workflows       |
| [`security/SECURITY_VERCEL.md`](security/SECURITY_VERCEL.md)                         | Headers HTTP, variables d'env, déploiements        |
| [`security/PRIVACY_COMPLIANCE_AUDIT.md`](security/PRIVACY_COMPLIANCE_AUDIT.md)       | Conformité RGPD + Loi 25 (Québec)                  |
| [`security/SECURITY_HARDENING_ROADMAP.md`](security/SECURITY_HARDENING_ROADMAP.md)   | Plan d'action priorisé (Vagues 0/1/2)              |
| [`security/INCIDENT_RESPONSE_PLAN.md`](security/INCIDENT_RESPONSE_PLAN.md)           | Procédure + runbooks de réponse à incident         |
| [`security/SECURITY_CHECKLIST_PRE_PROD.md`](security/SECURITY_CHECKLIST_PRE_PROD.md) | Checklist à cocher avant beta / ouverture publique |

---

## 🌍 Stratégie & Roadmap

| Document                                       | Description                        |
| ---------------------------------------------- | ---------------------------------- |
| [`EPIC_LOCALIZATION.md`](EPIC_LOCALIZATION.md) | Plan stratégique i18n (vagues 1-3) |

---

## 📦 Archives

Les docs des cycles précédents sont conservées dans [`archive/`](archive/) à titre de référence historique :

- `archive/cycle-1-may-2026/` — Audits initiaux 2026-05-13
- `archive/cycle-2-may-2026/` — Refactos + status 2026-05-13/14
- `archive/cycle-3-may-2026/` — Cleanup pré-launch 2026-05-15
- `archive/audits-v1/` — Premiers audits projet
- `archive/sessions/` — Notes session par session

À consulter **uniquement** pour comprendre l'historique d'une décision. Ne pas se référer pour le code actuel.
