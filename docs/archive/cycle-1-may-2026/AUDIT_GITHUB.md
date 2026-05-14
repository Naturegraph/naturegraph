# Naturegraph — Audit GitHub / Workflow / Repository

> **Version** : 1.0 — 2026-05-04 (consolidation des 3 docs Git précédents)
> **Posture** : release manager + DevOps senior. Inspection complète repo + workflow + sécurité.
> **Source** : `AUDIT_GIT.md`, `SYNTHESE_GIT.md`, `PLAN_ACTION_GIT.md` + audit GitHub direct (API).
> **Objectif** : repo professionnel, scalable pour équipe long terme.

---

## TL;DR

Le repo GitHub `Naturegraph/naturegraph` est **fonctionnellement sain** (3 branches alignées, CI verte, conventions commits respectées) mais souffre de **5 manques structurels** côté process :

1. **Aucun template** PR / issue / bug report → reviews et triage inefficaces
2. **Aucun label** standardisé → triage manuel à chaque issue
3. **CI ne déclenche pas sur staging** → régressions UAT non détectées
4. **Aucun release tag** ni changelog automatique → historique opaque
5. **Stratégie merge mixte** (squash feat, merge staging promo) → drift accumulable

**Aucun bloquant immédiat** — c'est de la dette de process. Mais critique avant d'inviter une équipe.

---

# AXE 1 — Structure Git actuelle

## 1.1 Branches (3 actives + 0 feature)

| Branche   | SHA actuel | Statut              | Protection               |
| --------- | ---------- | ------------------- | ------------------------ |
| `main`    | `fdbc07b`  | Production publique | ✅ Protected             |
| `staging` | `fdbc07b`  | UAT / beta testers  | ✅ Protected             |
| `develop` | `fdbc07b`  | Dev interne         | ❌ Libre (per CLAUDE.md) |

**Vérification API GitHub** : `compare(main...staging) = identical`, idem develop. **Drift 0/0** partout.

## 1.2 Workflow actuel

```
feat/<description> → develop (squash merge, PR)
                       ↓
                    staging (squash merge, PR depuis develop)
                       ↓
                     main (squash merge, PR depuis staging)
```

## 1.3 Historique récent

- **77 PRs créées** (88% mergées, 12% closed sans merge)
- **13 PRs mergées cette session** (#62 → #77)
- Convention commits **100% respectée** (préfixes `feat:`, `fix:`, `chore:`, etc.)
- **0 commit "WIP"** ou "asdf" en prod

## 1.4 Métriques GitHub

| Métrique        | Valeur                               | Verdict |
| --------------- | ------------------------------------ | ------- |
| Repo size       | ~9 MB (8.6k objects)                 | ✅      |
| Languages       | TypeScript 78%, SCSS 12%, autres 10% | ✅      |
| Stars / Forks   | 0 / 0 (repo privé/early)             | —       |
| Contributors    | 1 (Nicolas)                          | —       |
| Issues ouvertes | 0                                    | ✅      |
| PRs ouvertes    | 0                                    | ✅      |

---

# AXE 2 — Stratégie de merge

## 2.1 État actuel : mixte

| Source → Cible        | Stratégie  | Effet            |
| --------------------- | ---------- | ---------------- |
| `feat/*` → `develop`  | **squash** | 1 commit applati |
| `develop` → `staging` | **squash** | 1 commit applati |
| `staging` → `main`    | **squash** | 1 commit applati |

✅ **Cohérent** : squash partout depuis force-align dernière session.

## 2.2 Convention commits

```
<type>(<scope>): <description impérative>

[corps optionnel — pourquoi pas quoi]

[footer optionnel — Co-Authored-By, Closes #issue]
```

**Types autorisés** : `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `ci`, `test`, `style`

**Exemples conformes** (historique récent) :

- `fix(db+ui): vue posts_public manquait title + display_format`
- `docs: add NEXT_TASKS.md - checklist priorisee complete`
- `chore(repo): cleanup orphan assets + restructure docs + master index`

---

# AXE 3 — Protection branches

## 3.1 Configuration actuelle

| Branche   | PR required | Status checks  | Approvals      | Force push | Deletion   |
| --------- | ----------- | -------------- | -------------- | ---------- | ---------- |
| `main`    | ✅ Oui      | ✅ CI required | 0 (single dev) | ❌ Bloqué  | ❌ Bloqué  |
| `staging` | ✅ Oui      | ✅ CI required | 0              | ❌ Bloqué  | ❌ Bloqué  |
| `develop` | ❌ Non      | ✅ Recommandé  | 0              | ✅ Permis  | ✅ Permise |

## 3.2 Settings repo

| Setting                       | Valeur       | Recommandation                                  |
| ----------------------------- | ------------ | ----------------------------------------------- |
| `delete_branch_on_merge`      | **false** ✅ | Garder (sinon develop disparaît à chaque merge) |
| `allow_squash_merge`          | true         | Garder                                          |
| `allow_merge_commit`          | true         | À désactiver (cohérence squash)                 |
| `allow_rebase_merge`          | true         | À désactiver (cohérence squash)                 |
| `web_commit_signoff_required` | false        | À activer (DCO)                                 |

---

# AXE 4 — CI/CD

## 4.1 Workflow `.github/workflows/ci.yml`

**Triggers actuels** :

```yaml
on:
  push:
    branches: [develop, main] # ⚠️ staging absent
  pull_request:
    branches: [develop, main] # ⚠️ staging absent
```

**Job unique** : `Lint, Test & Build` (Ubuntu, Node 22, npm ci, eslint, vitest, vite build, bundle size check 325 KB)

## 4.2 ❌ Problèmes identifiés

| #    | Problème                                                                         | Sévérité |
| ---- | -------------------------------------------------------------------------------- | -------- |
| CI-1 | **CI ne tourne pas sur push staging** → régressions UAT non détectées avant prod | 🟠       |
| CI-2 | **Aucun job test E2E** → seules les unit tests vitest (3 fichiers)               | 🟠       |
| CI-3 | **Aucun job coverage gate** → coverage tests pas surveillé                       | 🟠       |
| CI-4 | **Aucun job drift detection** types TS ↔ DB → casts `as unknown as` non bloqués  | 🟠       |
| CI-5 | **1 seul job séquentiel** → CI prend ~50s, parallélisable                        | 🟡       |

## 4.3 ✅ Bonnes pratiques manquantes

- Aucun **release workflow** (changelog auto, tag, GitHub Release)
- Aucun **deploy workflow** documenté (Vercel auto-deploy mais pas dans Git)
- Aucun **dependabot.yml** pour update auto deps
- Aucun **CODEOWNERS** (qui review quoi)

---

# AXE 5 — Qualité PRs et organisation

## 5.1 ❌ Templates manquants

`.github/` ne contient **que workflows**. Manquent :

- `PULL_REQUEST_TEMPLATE.md` → checklist standardisée
- `ISSUE_TEMPLATE/bug_report.md` → triage rapide
- `ISSUE_TEMPLATE/feature_request.md` → demande structurée
- `CODEOWNERS` → auto-assignation reviewers
- `SECURITY.md` → policy de divulgation
- `CONTRIBUTING.md` (existe à root mais pas dans .github)

## 5.2 ❌ Labels manquants

Triage des PRs **manuel** car aucune convention labels. Cible recommandée :

| Catégorie | Labels                                                                               |
| --------- | ------------------------------------------------------------------------------------ |
| Type      | `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`                           |
| Priorité  | `priority:critical`, `priority:high`, `priority:medium`, `priority:low`              |
| Domaine   | `frontend`, `backend`, `db`, `ci`, `design-system`, `a11y`, `security`               |
| Statut    | `wip`, `needs-review`, `blocked`, `ready-to-merge`                                   |
| Effort    | `effort:xs` (<1h), `effort:s` (<1d), `effort:m` (<3d), `effort:l` (<1w), `effort:xl` |

## 5.3 ❌ Releases & tags

- **0 tag git** créé
- **0 GitHub Release**
- **Pas de CHANGELOG.md** automatique

Conséquence : impossible de rollback à une version stable, impossible d'identifier "quand le bug X a été introduit".

---

# AXE 6 — Sécurité repo

## 6.1 ✅ Bonnes pratiques en place

- ✅ `secret_scanning: enabled`
- ✅ `secret_scanning_push_protection: enabled`
- ✅ `.env`, `.env.local` dans `.gitignore`
- ✅ Branch protection `main` + `staging`
- ✅ Pas de secret hardcodé détecté (audit grep)

## 6.2 ⚠️ Risques résiduels

| Risque                                            | Sévérité | Action                           |
| ------------------------------------------------- | -------- | -------------------------------- |
| `dependabot_security_updates: disabled`           | 🟠       | Activer dans Settings            |
| Pas de `SECURITY.md` (vulnerability disclosure)   | 🟡       | Créer (template GitHub)          |
| Pas de `npm audit` automatique en CI              | 🟡       | Ajouter step CI                  |
| Pas de SAST (CodeQL, Snyk)                        | 🟡       | Optionnel pour beta, requis prod |
| Secrets de prod jamais auditer (Vercel, Supabase) | 🟠       | Audit trimestriel                |

---

# AXE 7 — Documentation GitHub

## 7.1 État actuel

| Document                           | Présent | Qualité                 |
| ---------------------------------- | ------- | ----------------------- |
| `README.md` (root)                 | ✅      | Standard                |
| `CONTRIBUTING.md` (root)           | ✅      | Bon                     |
| `CLAUDE.md` (instructions IA)      | ✅      | Exhaustif               |
| `GUIDELINES.md`                    | ✅      | 56 KB éco + a11y        |
| `docs/` (28 docs)                  | ✅      | Très complet            |
| `.github/PULL_REQUEST_TEMPLATE.md` | ❌      | À créer                 |
| `.github/ISSUE_TEMPLATE/`          | ❌      | À créer                 |
| `.github/CODEOWNERS`               | ❌      | À créer                 |
| `.github/SECURITY.md`              | ❌      | À créer                 |
| `CHANGELOG.md` (root)              | ❌      | À créer ou auto-générer |

---

# AXE 8 — Synthèse exécutive

## ❌ Problèmes

| ID    | Problème                                                              | Sévérité | Effort fix      |
| ----- | --------------------------------------------------------------------- | -------- | --------------- |
| GH-1  | CI absent sur push staging                                            | 🟠       | 30 min          |
| GH-2  | Aucun template PR/issue                                               | 🟠       | 1h              |
| GH-3  | Aucun système de labels                                               | 🟠       | 30 min          |
| GH-4  | Aucun release tag ni changelog                                        | 🟠       | 2h (setup auto) |
| GH-5  | `merge_commit` + `rebase_merge` autorisés (devraient être désactivés) | 🟡       | 5 min Settings  |
| GH-6  | Aucun CODEOWNERS                                                      | 🟡       | 15 min          |
| GH-7  | Aucun SECURITY.md                                                     | 🟡       | 15 min          |
| GH-8  | Aucun dependabot.yml                                                  | 🟡       | 15 min          |
| GH-9  | Aucun test E2E en CI                                                  | 🟠       | 2j (Phase 0)    |
| GH-10 | Aucun coverage gate                                                   | 🟠       | 4h (Phase 0)    |
| GH-11 | Aucun drift detection types TS ↔ DB                                   | 🟠       | 1j (Phase 0)    |

## ⚠️ Risques long terme

| Risque                         | Impact si non-traité                       |
| ------------------------------ | ------------------------------------------ |
| Team onboarding sans templates | Reviews chaotiques, bugs glissent          |
| Pas de changelog               | Impossible identifier régression source    |
| Pas de tags releases           | Rollback compliqué, audit Loi 25 difficile |
| Pas de drift CI                | Bugs DB-TS silencieux (cf. PR #69)         |

## ✅ Bonnes pratiques manquantes (récap)

```
.github/
├── workflows/
│   ├── ci.yml                       ← EXISTE (étendre)
│   ├── ci-health.yml                ← EXISTE
│   ├── release.yml                  ← À CRÉER
│   ├── codeql.yml                   ← À CRÉER (post-beta)
│   └── deploy-storybook.yml         ← À CRÉER (Phase 3)
├── PULL_REQUEST_TEMPLATE.md          ← À CRÉER
├── ISSUE_TEMPLATE/
│   ├── bug_report.md                ← À CRÉER
│   ├── feature_request.md           ← À CRÉER
│   └── config.yml                   ← À CRÉER
├── CODEOWNERS                        ← À CRÉER
├── SECURITY.md                       ← À CRÉER
└── dependabot.yml                    ← À CRÉER
```

---

# 🧭 Nouvelle organisation recommandée

## Templates à créer

### `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Description

<!-- Quel problème résout cette PR ? -->

## Type

- [ ] 🐛 Bug fix
- [ ] ✨ Feature
- [ ] ♻️ Refactor
- [ ] 📝 Docs
- [ ] ⚡ Performance
- [ ] 🎨 UI/UX

## Test plan

- [ ] Tests unitaires ajoutés/à jour
- [ ] Tests manuels effectués
- [ ] Build + lint OK localement
- [ ] Screenshots si UI

## Checklist

- [ ] Code respecte conventions CLAUDE.md
- [ ] Pas de console.log oublié
- [ ] i18n FR + EN à jour
- [ ] A11y vérifiée (focus, aria-labels)
- [ ] Document associé à jour
```

### `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: 🐛 Bug Report
about: Reporter un bug pour aider à l'améliorer
labels: 'bug, triage'
---

## Symptôme

## Reproduction (étapes)

## Comportement attendu

## Comportement observé

## Environnement (OS, navigateur, version)

## Screenshots si applicable
```

### `.github/CODEOWNERS`

```
* @nicolas-douaron

/docs/                @nicolas-douaron
/supabase/migrations/ @nicolas-douaron
/src/services/        @nicolas-douaron
/src/components/ui/   @nicolas-douaron
```

### `.github/SECURITY.md`

```markdown
## Security Policy

### Reporting a Vulnerability

Email: privacy@naturegraph.fr (NE PAS ouvrir d'issue publique)

### Supported Versions

| Version | Supported |
| ------- | --------- |
| main    | ✅        |
```

### `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule: { interval: 'weekly' }
    open-pull-requests-limit: 5
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule: { interval: 'monthly' }
```

## Labels à créer

Via GitHub UI ou `gh label create` :

```
gh label create "priority:critical" --color "B60205"
gh label create "priority:high" --color "D93F0B"
gh label create "priority:medium" --color "FBCA04"
gh label create "priority:low" --color "0E8A16"
gh label create "frontend" --color "1D76DB"
gh label create "backend" --color "5319E7"
gh label create "design-system" --color "FF6B6B"
gh label create "a11y" --color "F9D71C"
gh label create "security" --color "B60205"
gh label create "effort:xs" --color "C2E0C6"
gh label create "effort:s" --color "BFD4F2"
gh label create "effort:m" --color "FBCA04"
gh label create "effort:l" --color "D93F0B"
gh label create "effort:xl" --color "B60205"
```

---

# 🚀 Workflow cible long terme

## Cycle release type

```
1. Dev : feat/xxx → push
2. CI : lint + test + build + bundle check
3. PR feat/xxx → develop (auto-assign owner via CODEOWNERS)
4. Squash merge
5. PR develop → staging (squash)
6. CI staging passe (NOUVEAU : trigger ajouté)
7. Recette manuelle staging
8. PR staging → main (squash)
9. CI main passe
10. Tag automatique : v0.X.Y
11. GitHub Release créé avec CHANGELOG.md
12. Deploy auto Vercel sur main
13. Smoke test prod
14. Update tracking PROJECT_MASTER.md
```

## Cadence releases

- **Sprint 1 mois** : 1 release majeure (v0.X)
- **Hotfix** : direct sur `main` via PR hotfix/xxx → tag patch v0.X.Y
- **Cumul changelog** : auto-généré par semantic-release ou outil similaire

## Cleanup récurrent

- **Hebdomadaire** : dependabot PRs review + merge
- **Mensuel** : `git remote prune origin` + cleanup branches mortes
- **Trimestriel** : audit advisors Supabase + npm audit deep + bundle size

---

# 📌 Priorités immédiates GitHub

## Quick wins (~3h cumul)

| #   | Action                                 | Effort | Bénéfice                  |
| --- | -------------------------------------- | ------ | ------------------------- |
| 1   | Étendre CI sur staging                 | 30 min | Détection régressions UAT |
| 2   | Créer PR template                      | 30 min | Reviews structurées       |
| 3   | Créer 2 issue templates                | 30 min | Triage rapide             |
| 4   | Créer CODEOWNERS                       | 15 min | Auto-assign reviewers     |
| 5   | Créer SECURITY.md                      | 15 min | Conformité Loi 25         |
| 6   | Activer dependabot.yml                 | 15 min | Sécurité auto             |
| 7   | Créer 14 labels                        | 30 min | Triage cohérent           |
| 8   | Désactiver merge_commit + rebase_merge | 5 min  | Cohérence squash          |

**Total** : ~3h pour passer de "process artisanal" à "process pro".

## Moyen terme (1 semaine)

| #   | Action                                                  | Effort                 |
| --- | ------------------------------------------------------- | ---------------------- |
| 9   | Setup release workflow (semantic-release ou changesets) | 1j                     |
| 10  | Premier tag v0.1.0 + GitHub Release                     | 30 min                 |
| 11  | CHANGELOG.md auto-généré                                | 4h (inclus dans setup) |
| 12  | CI gate drift detection types ↔ DB                      | 1j                     |

## Long terme (Phase 4)

| #   | Action                               | Effort |
| --- | ------------------------------------ | ------ |
| 13  | Setup CodeQL (SAST GitHub)           | 30 min |
| 14  | Snyk ou similaire pour deps          | 1h     |
| 15  | Audit secrets trimestriel automatisé | 4h     |

---

# 📎 Références croisées

- `docs/AUDIT_GIT.md` — Audit Git initial (G-1 à G-8)
- `docs/SYNTHESE_GIT.md` — RC-H Process Git fragile
- `docs/PLAN_ACTION_GIT.md` — Plan exécution Git
- `docs/PROJECT_MASTER.md` — Source de vérité globale
- `docs/NEXT_TASKS.md` — Checklist priorisée
- `CLAUDE.md` § "Stratégie de branches Git"

---

**📌 Document remplace les 3 docs Git précédents.** Les anciens restent pour traçabilité historique mais ce document est la nouvelle source de vérité GitHub.
