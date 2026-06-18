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
| `develop`                              | `feat/*` ou direct | Push direct OK pour petits changes / PR squash sinon | Non protegee                             |
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
- **Auto-delete branch on merge desactive** : on supprime manuellement apres force-align
- **delete-branch-on-merge = false** dans Settings (cf. BATCH 11 cleanup)

## Conventions de commit

Format : `type: description courte`

| Préfixe     | Usage                                       |
| ----------- | ------------------------------------------- |
| `feat:`     | Nouvelle fonctionnalité                     |
| `fix:`      | Correction de bug                           |
| `refactor:` | Refactoring (pas de changement fonctionnel) |
| `style:`    | Formatage, CSS, sans impact logique         |
| `docs:`     | Documentation                               |
| `perf:`     | Amélioration de performance                 |
| `test:`     | Ajout ou modification de tests              |
| `chore:`    | Maintenance (deps, config, CI)              |

## Versioning (SemVer)

- **MAJOR** (1.0.0) → Lancement public / breaking changes
- **MINOR** (0.x.0) → Nouvelle feature (ex: v0.3.0 = onboarding)
- **PATCH** (0.x.y) → Bug fix

### Versions prévues

- `v0.1.0` : Setup initial du projet
- `v0.2.0` : Design system + composants UI
- `v0.3.0` : Onboarding flow
- `v0.4.0` : Feed & contributions
- `v0.5.0` : Profil utilisateur
- `v1.0.0` : MVP public
