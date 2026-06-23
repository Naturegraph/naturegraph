# Contributing : Naturegraph

## Stratégie de branches

```
main           ← Production (naturegraph.ca)         | Supabase PROD
  └─ staging   ← Beta testers (naturegraph.ca) | Supabase DEV (ephemere)
       └─ develop  ← Dev interne                    | Supabase DEV
              ├─ feat/nom-feature    ← Nouvelles fonctionnalités
              ├─ fix/nom-bug         ← Corrections de bugs
              ├─ refactor/nom        ← Refactoring sans changement fonctionnel
              └─ docs/nom            ← Documentation
```

### Règles

| Branche                                | Source             | Merge                                                | Protection                               |
| -------------------------------------- | ------------------ | ---------------------------------------------------- | ---------------------------------------- |
| `main`                                 | `staging`          | PR squash obligatoire                                | Force-push bloque sauf cycle force-align |
| `staging`                              | `develop`          | PR squash obligatoire (depuis `develop` uniquement)  | Force-push bloque sauf cycle force-align |
| `develop`                              | `feat/*` ou direct | Push direct OK pour petits changes / PR squash sinon | Force-push bloque (ruleset)              |
| `feat/*` `fix/*` `refactor/*` `docs/*` | `develop`          | PR squash vers `develop`                             | Libre                                    |

**Hotfix urgents** : `hotfix/*` depuis `main` → merger dans `main` → remonter dans `staging` → `develop`.

### Workflow quotidien

1. Créer une branche depuis `develop` : `feat/onboarding-flow`
2. Committer (Conventional Commits, voir ci-dessous)
3. Push et créer une PR vers `develop` (squash merge)
4. Quand `develop` accumule des features pretes pour beta → PR `develop` → `staging`
5. Apres validation staging → PR `staging` → `main` (production)
6. Force-align les 3 branches au meme SHA apres chaque promotion (optionnel mais recommande)

### Merge convention

- **Squash merge uniquement** sur main / staging / develop (merge_commit + rebase_merge desactives dans Settings GitHub)
- **Auto-suppression des branches mergees activee** (delete-branch-on-merge = true, depuis 2026-06-17)
- Protection via **rulesets** (survivent aux changements de visibilite) : `main` = PR + squash + checks requis (Lint/Test/Build + CodeQL) + non_fast_forward ; `develop` = non_fast_forward

## Conventions de commit

Format **Conventional Commits** : `type(scope): description courte` (scope optionnel). Norme complete : `docs/devops/VERSIONING.md`.

| Préfixe     | Usage                                       |
| ----------- | ------------------------------------------- |
| `feat:`     | Nouvelle fonctionnalité                     |
| `fix:`      | Correction de bug                           |
| `security:` | Correctif de sécurité                       |
| `refactor:` | Refactoring (pas de changement fonctionnel) |
| `style:`    | Formatage, CSS, sans impact logique         |
| `docs:`     | Documentation                               |
| `perf:`     | Amélioration de performance                 |
| `test:`     | Ajout ou modification de tests              |
| `chore:`    | Maintenance (deps, config, CI)              |

## Versioning (SemVer)

Norme complete : `docs/devops/VERSIONING.md`. Résumé :

- **MAJEUR** (1.0.0) → refonte / rupture de compatibilité
- **MINEUR** (0.x.0) → nouvelle fonctionnalité stable
- **PATCH** (0.x.y) → bug fix / correctif

### Jalons actuels (depuis le reset V0.0.1, NG-025)

- `v0.0.1` : MVP validé, base officielle (actuel)
- `v0.0.x` : correctifs sécurité, infra email/DNS/légal, admin, SEO
- `v0.1.0` : lancement public
- `v1.0.0` : produit stable et établi
