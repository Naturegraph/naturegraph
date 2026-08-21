---
name: release-prod
description: >
  Process de release SÛR vers la prod Naturegraph (merge vers main). A utiliser
  DES QUE l'on parle de "mettre en prod", "release", "deployer", "merger vers
  main", ou de faire remonter du travail de develop vers la production. Garantit
  zero residu dev en prod, un historique main propre (squash), et un rollback
  pret. Complete docs/devops/RELEASE_PROCESS.md et PIPELINE_DEV.md.
---

# Release prod Naturegraph : process sûr et conforme

But : livrer en prod **sans residu de dev**, avec un **historique `main` propre**
(1 commit par release), des **controles verts**, et un **rollback pret**. Ecrit
d'apres les lecons du Chantier Qualite (aout 2026).

## Carte des environnements (ne jamais confondre)

| Branche   | Vercel     | Base Supabase                         |
| --------- | ---------- | ------------------------------------- |
| `develop` | Preview    | **DEV** `nkgdgxwejqqnqmwqwegy`        |
| `staging` | Preview    | **DEV** `nkgdgxwejqqnqmwqwegy` (beta) |
| `main`    | Production | **PROD** `hrxgduvworofnrjmgpcj`       |

**Seul un merge vers `main` deploie la prod.** Pousser sur develop/staging ne
touche jamais la prod. Flux obligatoire : `develop -> staging -> main`, sans raccourci.

## Regles d'or (non negociables)

1. **Jamais de merge `main` sans le OK explicite de Nicolas** (date/heure, force-logout, notif).
2. **Squash-merge only** vers `main` (1 commit = 1 release). JAMAIS de fast-forward
   de develop/staging vers main : ca embarquerait des centaines de commits + des
   commits dev-only dans l'historique prod (et un `revert` les ferait resurgir).
3. **Jamais `--admin` pour contourner les checks.** `main` exige CI (Lint/Test/Build)
   - CodeQL (SAST). On ATTEND le vert, on ne bypass pas.
4. **Zero residu dev en prod.** L'outillage dev (bouton connexion rapide, masquage
   cookies dev, seed de test) reste sur `develop`, exclu du perimetre prod. Gate
   runtime : `IS_DEV_DB = VITE_SUPABASE_URL.includes('nkgdgxwejqqnqmwqwegy')`.
5. **Toujours un point de retour** : tag `prod-stable-vX.Y.Z` + Vercel Instant Rollback.
6. **Migrations** : ecrites au format `YYYYMMDDHHMMSS_nom.sql`, testees sur DEV
   d'abord, additives/idempotentes. Une migration "no-op sur prod" ne s'applique pas a la prod.

## Etapes

### 0. Cadrage (avec Nicolas)

- Rediger **2 release notes** (technique + user-friendly, cf. RELEASE_PROCESS.md).
- Faire trancher : **force-logout** (defaut NON, sauf refonte auth/schema),
  **notif in-app** (defaut NON si rien de visible), **date/heure**.
- Lister ce qui va en prod (`git diff origin/main...origin/develop --stat -- src/`)
  et ce qui **reste dev-only**.

### 1. Construire la branche de release (dev-only exclu)

Travailler dans un **worktree isole** pour ne pas perturber le serveur dev :

```bash
git worktree add -b release/xxx <scratchpad>/release-wt origin/develop
```

Dans le worktree : restaurer la version prod des fichiers dev-only, retirer les
fichiers dev-only, bumper la version :

```bash
git checkout origin/main -- src/components/layout/CookieBanner.tsx src/components/auth/AuthForm.tsx
git rm src/components/auth/DevQuickLogin.tsx scripts/seed-dev-testdata.sql
# bump "version" dans package.json
git commit -m "chore(release): vX.Y.Z ... (exclut l'outillage dev-only du perimetre prod)"
```

(node_modules : jonction Windows depuis le repo principal, meme dependances.)

### 2. Audit residus dev (BLOQUANT)

```bash
scripts/audit-prod-residue.sh            # sur le working tree de la release
```

Doit finir "PROPRE". Sinon, corriger avant tout merge.

### 3. Verifs locales (BLOQUANT)

```bash
npm run build && npm test
```

Build vert + tous les tests verts.

### 4. Realigner staging -> beta -> smoke test

```bash
git push --force-with-lease=staging:$(git rev-parse origin/staging) origin release/xxx:staging
```

Attendre le deploiement Vercel beta (state READY via l'outil Vercel), puis smoke
test. La preview est protegee (SSO Vercel) : utiliser `web_fetch_vercel_url` pour
verifier HTTP 200 + en-tetes de securite (CSP, HSTS, X-Frame-Options).

### 5. Rollback pret (AVANT le merge)

```bash
git tag prod-stable-vX.Y.Z origin/main && git push origin prod-stable-vX.Y.Z
```

Noter le deploiement Production Vercel actuel (cible de l'Instant Rollback).
Cf. docs/devops/ROLLBACK_URGENCE.md.

### 6. Merge prod : PR staging -> main, SQUASH

```bash
gh pr create --base main --head staging --title "Release vX.Y.Z : ..." --body "<release note>"
# attendre les checks requis :
gh pr checks <PR> --watch --required     # exit 0 = verts
gh pr merge <PR> --squash --subject "Release vX.Y.Z : ..." --body "<resume>"
```

Resultat attendu : `main` = +1 commit propre "Release vX.Y.Z (#PR)". Si l'auto-merge
est refuse par le repo, on ATTEND le vert puis on merge (jamais `--admin`).

### 7. Verifier la prod

- Vercel : deploiement Production du commit de release en **READY**.
- `web_fetch_vercel_url https://naturegraph.ca` -> 200 + bon bundle + en-tetes securite.
- Sentry calme (pas de pic d'erreurs).

### 8. Apres la release

- Appliquer manuellement toute migration prod sur le projet PROD (si applicable).
- Nouveau tag `prod-stable-vX.Y.Z` sur le main a jour (le point de retour "connu-bon").
- Nettoyer le worktree : `git worktree remove <scratchpad>/release-wt`.
- `develop` conserve l'outillage dev-only (c'est voulu).

## Anti-patterns vus en vrai (a ne jamais refaire)

- Fast-forward develop->main (750 commits + dev-only dans l'historique prod).
- Laisser un lien de nav vers une route supprimee (ex. `/admin/beta`) -> lien mort.
- Croire "Tendances vide = bug" alors que c'est une regle produit (NG-032 : photo requise).
- `--admin` pour merger sans attendre la CI/CodeQL.
