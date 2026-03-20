# Contributing — Naturegraph

## Stratégie de branches

```
main          ← Production stable, protégée, uniquement via PR
  └─ develop  ← Intégration, base de travail quotidien
       ├─ feat/nom-feature    ← Nouvelles fonctionnalités
       ├─ fix/nom-bug         ← Corrections de bugs
       ├─ refactor/nom        ← Refactoring sans changement fonctionnel
       └─ docs/nom            ← Documentation
```

### Règles

| Branche | Merge vers | Protection |
|---------|-----------|------------|
| `main` | — | PR obligatoire, pas de push direct |
| `develop` | `main` | PR recommandée |
| `feat/*` | `develop` | Libre |
| `fix/*` | `develop` | Libre |

### Workflow quotidien

1. Créer une branche depuis `develop` : `feat/onboarding-flow`
2. Travailler, committer
3. Push et créer une PR vers `develop`
4. Merge dans `develop`
5. Quand `develop` est stable → PR vers `main` + tag de version

## Conventions de commit

Format : `type: description courte`

| Préfixe | Usage |
|---------|-------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `refactor:` | Refactoring (pas de changement fonctionnel) |
| `style:` | Formatage, CSS, sans impact logique |
| `docs:` | Documentation |
| `perf:` | Amélioration de performance |
| `test:` | Ajout ou modification de tests |
| `chore:` | Maintenance (deps, config, CI) |

## Versioning (SemVer)

- **MAJOR** (1.0.0) → Lancement public / breaking changes
- **MINOR** (0.x.0) → Nouvelle feature (ex: v0.3.0 = onboarding)
- **PATCH** (0.x.y) → Bug fix

### Versions prévues

- `v0.1.0` — Setup initial du projet
- `v0.2.0` — Design system + composants UI
- `v0.3.0` — Onboarding flow
- `v0.4.0` — Feed & contributions
- `v0.5.0` — Profil utilisateur
- `v1.0.0` — MVP public
