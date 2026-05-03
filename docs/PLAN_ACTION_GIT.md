# Naturegraph — Plan d'action Git

> **Version** : 1.0 — 2026-05-03
> **Source** : `docs/AUDIT_GIT.md` v1.0 + `docs/SYNTHESE_GIT.md` v1.0
> **Posture** : pensée DevOps · impact équipe et release · pas une checklist technique brute
> **Lecture cible** : 5 minutes avant de toucher à `git` sur le repo

---

## TL;DR

Le repo est **fonctionnellement sain** mais **3 garde-fous manquants** menacent le prochain cycle release :

1. **Rebase orphelin** sur le checkout principal — bloque toute commande Git tant qu'il n'est pas résolu
2. **`origin/develop` supprimée** — workflow CLAUDE.md cassé, Vercel preview cassé
3. **Auto-delete-branch GitHub agressif** — récidive immédiate au prochain merge

Ces 3 points = **15 minutes** pour passer de "process Git fragile" à "process Git stable".

Ensuite : **45 minutes** pour fiabiliser (CI staging, cleanup branches, .gitignore, branch protection).

Le reste = amélioration continue post-beta.

> **Bonne nouvelle v1.0** : aucune perte de travail, aucune incohérence de contenu entre branches. C'est uniquement de la **dette de process** — réversible facilement.

---

# 1. Regroupement des problèmes par nature

## 🔥 Urgent (bloque tout travail Git futur)

| #   | Problème                                          | Impact                                                 | Réf |
| --- | ------------------------------------------------- | ------------------------------------------------------ | --- |
| U1  | Rebase interactif inachevé sur checkout principal | Toute commande Git bloquée tant que rebase non résolu  | G-1 |
| U2  | `origin/develop` n'existe plus                    | Vercel preview cassé, prochain PR feat/\* dans le vide | G-2 |
| U3  | GitHub auto-delete-branch agressif                | Récidive U2 immédiate au prochain merge                | G-2 |

## 🧹 Hygiène (cosmétique mais accumulable)

| #   | Problème                                  | Impact                     | Réf            |
| --- | ----------------------------------------- | -------------------------- | -------------- |
| H1  | 15 branches locales mortes                | Bruit visuel `git branch`  | G-4            |
| H2  | `supabase/.temp/` jamais ignoré           | Risque commit accidentel   | G-5            |
| H3  | `docs/AUDIT_DB_LIVE.md` jamais commité    | Document précieux perdable | G-5            |
| H4  | PR #19 fermée sans note                   | Mémoire produit absente    | G-6            |
| H5  | Local develop à 5ac9b0a (pas aligné main) | Confusion future           | G-1 (séquelle) |

## 🛡️ Garde-fous (préviennent la récidive)

| #   | Problème                          | Impact                         | Réf         |
| --- | --------------------------------- | ------------------------------ | ----------- |
| GF1 | CI absent sur push staging        | Régressions UAT non détectées  | G-7         |
| GF2 | Stratégie merge non standardisée  | Drift staging↔main accumulable | G-3         |
| GF3 | Pas de branch protection rules    | Push direct main possible      | (implicite) |
| GF4 | Pas de rituel cleanup trimestriel | Récidive H1, H2, H3, H4        | (implicite) |

## ✅ OK (à conserver)

| #   | Force                                       | Réf                  |
| --- | ------------------------------------------- | -------------------- |
| OK1 | Convention commits respectée à 100%         | G-8                  |
| OK2 | Workflow feat→develop→staging→main respecté | (12 derniers cycles) |
| OK3 | CI green sur main                           | (état actuel)        |

---

# 2. Priorisation par impact

## 🔴 CRITIQUE — bloque le prochain cycle dev

- **U1** — Rebase orphelin (G-1)
- **U2** — `origin/develop` recréation (G-2)
- **U3** — Désactivation auto-delete-branch GitHub (G-2)

**Effet si non résolu** : prochain `git pull` ou `git checkout` du user blocque, prochain PR feat/\* recrée develop dans un état arbitraire, Vercel preview develop continue à 404.

## 🟠 IMPORTANT — bloque la qualité release

- **GF1** — CI sur staging (G-7)
- **GF3** — Branch protection rules
- **H5** — Reset local develop sur main

**Effet si non résolu** : régressions UAT non détectées, push direct main accidentel possible, divergence local/remote silencieuse.

## 🟢 AMÉLIORATION — après le prochain cycle

- **H1** — Cleanup 15 branches locales mortes
- **H2** — `.gitignore` `supabase/.temp/`
- **H3** — Décision sur `AUDIT_DB_LIVE.md`
- **H4** — Note de fermeture PR #19
- **GF2** — Standardiser stratégie merge
- **GF4** — Documenter rituel cleanup trimestriel

---

# 3. Roadmap par phases

## Phase 0 — Urgences (15 min ouvrés) — IMMÉDIAT

> **Objectif** : débloquer toute commande Git + restaurer le workflow CLAUDE.md

### Étape P0-A — Résolution rebase orphelin (5 min)

**À exécuter sur** `C:/Users/Freelance/Desktop/ClaudeDev_Naturegraph` (le checkout principal du user, **pas le worktree session**)

**Option recommandée — abandonner le rebase** :

```bash
cd C:/Users/Freelance/Desktop/ClaudeDev_Naturegraph
git rebase --abort
git checkout -- src/types/supabase.ts
git fetch origin
git checkout main 2>/dev/null || git checkout -b main origin/main
git reset --hard origin/main
```

**Vérification** :

```bash
git status               # doit afficher "On branch main, nothing to commit, working tree clean"
git log --oneline -3     # doit afficher 7e881e9 release beta privee
```

### Étape P0-B — Recréer `origin/develop` (1 min)

```bash
git push origin origin/main:refs/heads/develop
git fetch origin
git branch -r | grep develop      # doit afficher origin/develop
```

### Étape P0-C — Désactiver auto-delete-branch GitHub (30 sec)

GitHub UI :

1. Repo Settings → General → Pull Requests
2. Décocher "**Automatically delete head branches**"
3. Save

### Étape P0-D — Aligner local develop sur main (2 min)

```bash
cd <checkout principal>
git checkout develop
git fetch origin
git reset --hard origin/main
git push origin develop --force-with-lease
```

⚠️ **Note** : le `--force-with-lease` est plus sûr que `--force` (il refuse si quelqu'un a poussé entre temps).

### Étape P0-E — Vérification finale (1 min)

```bash
git branch -r            # doit afficher main, staging, develop
git status               # clean
git log --oneline -5     # tip = 7e881e9
```

✅ **Phase 0 terminée** quand toutes ces commandes répondent sans erreur.

---

## Phase 1 — Garde-fous (45 min ouvrés) — Cette semaine

> **Objectif** : empêcher la récidive de U1-U3, ajouter les protections manquantes

### Étape P1-A — CI sur staging (5 min)

Modifier `.github/workflows/ci.yml` :

```yaml
on:
  push:
    branches: [develop, staging, main] # ← ajout staging
  pull_request:
    branches: [develop, staging, main] # ← ajout staging
```

Commit dédié sur develop :

```bash
git checkout develop
# édition fichier
git add .github/workflows/ci.yml
git commit -m "ci: trigger workflow on staging push and PR (G-7)"
git push origin develop
```

### Étape P1-B — Branch protection rules GitHub (10 min)

GitHub UI : Repo Settings → Branches → Add branch protection rule

**Règle pour `main`** :

- Branch name pattern : `main`
- ✅ Require a pull request before merging
- ✅ Require approvals (1)
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- Status checks : `Lint, Test & Build`
- ✅ Require linear history
- ❌ Do not allow bypassing the above settings

**Règle pour `staging`** :

- Branch name pattern : `staging`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
- Status checks : `Lint, Test & Build`

**Règle pour `develop`** :

- Branch name pattern : `develop`
- ✅ Require status checks to pass before merging
- Status checks : `Lint, Test & Build`
- ❌ Pas de PR obligatoire (push direct OK selon CLAUDE.md)

### Étape P1-C — Standardiser stratégie merge (2 min)

GitHub Repo Settings → General → Pull Requests :

**Recommandation** : cocher uniquement "**Allow squash merging**", désactiver "Allow merge commits" et "Allow rebase merging".

Effet sur les futures releases :

- `develop → staging` deviendra squash → linéarité parfaite
- Fini le drift staging↔main en SHA
- Cherry-pick urgent main → staging trivial

⚠️ **Décision produit** : valider avec Nicolas avant de désactiver les autres modes (au cas où le merge commit serait préféré pour les releases majeures).

### Étape P1-D — Cleanup branches locales (5 min)

Sur le checkout principal après P0 résolu :

```bash
# Préviewer
git branch | grep -v -E "(main|staging|develop|\*)"

# Suppression en masse (validée car squash-merged ou 0 ahead, cf. G-4)
git branch -D \
  chore/quick-wins-post-audit \
  chore/release-deployment-runbook \
  claude/loving-shaw-034524 \
  feat/backend-phase2-wiring \
  feat/rc-d-privacy-by-design \
  feat/rc-e-onboarding-persistence \
  feat/settings-panel \
  fix/audit-log-anonymization-cron \
  fix/backfill-saved-hidden-posts \
  fix/bundle-budget-exifr \
  fix/encounter-submit \
  fix/exif-strip-upload \
  fix/policy-immediate-deletion \
  fix/post-title-column \
  fix/posts-public-view \
  heic-fix-temp 2>/dev/null

# Nettoyer les remote refs supprimées
git remote prune origin

# Vérifier le résultat
git branch
```

### Étape P1-E — `.gitignore` + commits docs (5 min)

```bash
git checkout develop
echo "supabase/.temp/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore supabase CLI temp directory (G-5)"

# Décision sur AUDIT_DB_LIVE.md
git add docs/AUDIT_DB_LIVE.md
git commit -m "docs: add live DB audit (MCP Supabase, post-PR#48)"

# Push
git push origin develop
```

### Étape P1-F — Note de fermeture PR #19 (2 min)

```bash
gh pr comment 19 --body "Fermée sans merge — pivot photo-management v3 abandonné au profit de l'approche minimale MVP. Travail repris partiellement dans PR #18 (exifr lite) et PR #41 (EXIF stripping). Décision Nicolas 2026-05-03."
```

### Étape P1-G — Commit la suite Git audit sur develop (15 min)

Les 3 nouveaux documents Git (créés en cette session) à commiter :

```bash
git checkout develop
git add docs/AUDIT_GIT.md docs/SYNTHESE_GIT.md docs/PLAN_ACTION_GIT.md
git commit -m "docs: add Git audit suite (RC-H process Git fragile)"
git push origin develop
```

✅ **Phase 1 terminée** quand toutes les protections sont actives + docs à jour sur develop.

---

## Phase 2 — Rituel post-release (récurrent) — Trimestriel

> **Objectif** : rendre l'hygiène automatique, pas réactive

### Cycle 1 fois par trimestre (15 min)

```bash
# 1. Nettoyer les remote branches supprimées
git remote prune origin

# 2. Lister les branches locales mergées dans main (mode merge-commit)
git branch --merged origin/main | grep -v -E "(main|staging|develop|\*)"

# 3. Lister les branches locales potentiellement squash-merged (à valider visuellement)
for branch in $(git branch | grep -v -E "(main|staging|develop|\*)"); do
  AHEAD=$(git rev-list $branch --not origin/main origin/staging --count)
  echo "$branch : $AHEAD ahead"
done

# 4. Supprimer en masse après validation visuelle
git branch -D <liste validée>

# 5. Vérifier les untracked accumulés
git status --short

# 6. Vérifier les drifts staging↔main
git rev-list --left-right --count origin/main...origin/staging
git diff --name-only origin/main origin/staging   # doit être vide en steady state
```

### Cycle 1 fois par release (5 min)

À chaque promotion `staging → main` :

```bash
# 1. Tag git pré-release pour rollback
git tag -a "release-$(date +%Y-%m-%d)" main -m "Release $(date +%Y-%m-%d)"
git push origin --tags

# 2. Smoke test prod (15 min, manuel)
# cf. checklist dans DEPLOYMENT_RUNBOOK.md

# 3. Documenter la release
# Ajouter ligne dans docs/RELEASE_READINESS.md
```

---

# 4. Quick wins (< 30 min cumulé)

À faire en priorité absolue :

| Action                                         | Effort | Référence |
| ---------------------------------------------- | ------ | --------- |
| 🔥 Résoudre rebase orphelin (P0-A)             | 5 min  | G-1       |
| 🔥 Recréer origin/develop (P0-B)               | 1 min  | G-2       |
| 🔥 Désactiver auto-delete-branch GitHub (P0-C) | 30 sec | G-2       |
| 🟢 `.gitignore` supabase/.temp/ (P1-E)         | 1 min  | G-5       |
| 🟢 Note PR #19 (P1-F)                          | 2 min  | G-6       |
| 🟢 CI sur staging (P1-A)                       | 5 min  | G-7       |

**Total Quick Wins** : ~15 min pour résoudre 6 findings sur 8.

---

# 5. Décisions produit — À TRANCHER

## Q-GIT-1 : Stratégie de merge unique ?

**Options** :

- **A** : Squash partout (recommandé) — linéarité parfaite, cherry-pick trivial
- **B** : Merge commit partout — préserve history fine, audit plus riche
- **C** : Statu quo (mix actuel) — drift staging↔main accumulable

**Recommandation Claude** : Option A (squash partout). Les commits granulaires restent visibles via les PRs squash-mergées (chacune contient le squash + un lien vers le PR origine).

**Décision attendue** : Nicolas

## Q-GIT-2 : Local develop : reset destructif ?

**Contexte** : local develop à `5ac9b0a` contient des commits du rebase orphelin (G-1). Tous ces commits sont déjà reachable via main via le chemin de PRs successifs.

**Options** :

- **A** : `git reset --hard origin/main` (perte des commits orphelins, mais ils sont safe sur main)
- **B** : Cherry-pick les commits intéressants du rebase avant reset
- **C** : Garder local develop tel quel (pas recommandé — confusion future)

**Recommandation Claude** : Option A après validation que tous les commits de develop sont déjà sur main (déjà vérifié : `git rev-list develop --not origin/main --count = 0`).

**Décision attendue** : Nicolas

## Q-GIT-3 : Branches feat post-merge — auto-delete ou keep ?

**Contexte** : G-2 montre que l'auto-delete agressif a supprimé `origin/develop`. Mais pour les branches feat éphémères (`feat/rc-d-privacy-by-design`, `fix/exif-strip-upload`, etc.), l'auto-delete reste pertinent.

**Options** :

- **A** : Désactiver auto-delete-branch globalement, les nettoyer manuellement
- **B** : Garder auto-delete-branch, mais protéger develop/staging avec branch protection rules (la suppression est alors refusée)
- **C** : Workflow GitHub Action qui supprime uniquement les branches `feat/*` `fix/*` `chore/*`

**Recommandation Claude** : Option B — la branch protection rule sur develop refusera la suppression, et les feat/fix/chore continueront à être auto-supprimées proprement.

**Décision attendue** : Nicolas

---

# 6. Métriques de succès

| Métrique                            | Avant Phase 0                | Cible post-Phase 1           |
| ----------------------------------- | ---------------------------- | ---------------------------- |
| Branches remote actives             | 2                            | 3 (main + staging + develop) |
| Branches locales                    | 17                           | ≤ 5                          |
| PRs ouvertes                        | 0                            | ≤ 3                          |
| CI déclenché sur staging            | ❌                           | ✅                           |
| Auto-delete-branch                  | ⚠️ Activé                    | ❌ Désactivé                 |
| Branch protection rules             | ❌                           | ✅ main + staging + develop  |
| Worktrees actifs en rebase          | 1                            | 0                            |
| `.gitignore` couvre supabase/.temp/ | ❌                           | ✅                           |
| Suite docs Git complète             | 3 docs (créés cette session) | 3 docs sur develop + main    |

---

# 7. Risques résiduels

## R1 — Cherry-pick urgent staging → main impossible si squash inversé

**Scénario** : un fix urgent merge-mergé sur main et besoin de le porter sur staging. Avec squash partout, le commit main = nouveau SHA, le cherry-pick crée un commit staging avec un autre SHA → 2 commits "physiquement différents" mais fonctionnellement identiques.

**Mitigation** : utiliser `git cherry-pick -x <sha-main>` (ajoute mention du commit origine), ou faire un PR `main-fix → staging` dédié.

## R2 — Branche develop locale écrasée

**Scénario** : si quelqu'un travaille en local sur develop et qu'on exécute P0-D (force push), son travail est perdu.

**Mitigation** : utiliser `--force-with-lease` (refuse si quelqu'un a poussé entre temps) + communiquer en amont sur Discord/Slack avant le force push.

## R3 — Branch protection trop stricte freine la vélocité

**Scénario** : require PR + 1 approval sur main empêche les hotfixes urgents lancés en solo.

**Mitigation** : laisser un mode "emergency override" avec audit log, OU autoriser un nombre limité de "self-approvals" pour le owner.

---

# 8. Communication équipe (si applicable)

À publier sur le canal commun (Discord, Slack, email) avant Phase 0 :

```
🚨 Cleanup Git en cours sur naturegraph

Action 1 (immédiate) — résolution d'un rebase orphelin sur le repo principal.
Action 2 (immédiate) — recréation de origin/develop (a été supprimée par GitHub auto-delete).
Action 3 (cette semaine) — branch protection rules sur main/staging/develop.

Pendant les 24h prochaines :
- Ne pas push directement sur develop sans avoir pull en amont
- Préférer ouvrir des PR feat/* → develop comme d'habitude
- Si vous voyez des erreurs Vercel preview develop, c'est normal jusqu'à recréation

Après cleanup :
- Workflow CLAUDE.md restauré
- CI déclenché sur staging
- Branches feat auto-supprimées après merge (mais develop/staging protégées)

Questions : ping @nicolas ou ouvrir une issue.
```

---

# Annexes

## A. Mapping problèmes → catégorie

| ID Audit | Catégorie        | Phase   |
| -------- | ---------------- | ------- |
| G-1      | Urgence          | Phase 0 |
| G-2      | Urgence          | Phase 0 |
| G-3      | Garde-fou        | Phase 1 |
| G-4      | Hygiène          | Phase 1 |
| G-5      | Hygiène          | Phase 1 |
| G-6      | Hygiène          | Phase 1 |
| G-7      | Garde-fou        | Phase 1 |
| G-8      | OK (à conserver) | —       |

## B. Effort total estimé

| Phase                | Effort        | Cumul  |
| -------------------- | ------------- | ------ |
| Phase 0 (urgences)   | 15 min        | 15 min |
| Phase 1 (garde-fous) | 45 min        | 1h     |
| Phase 2 (rituel)     | 15 min × 4/an | 1h/an  |

**Total** : 1h pour passer en état stable + 1h/an d'entretien.

## C. Ressources externes nécessaires

- Accès GitHub Settings (déjà disponible, owner)
- Aucune dépendance externe
- Aucune dépendance Supabase
- Aucun coût additionnel

## D. Cohérence avec le plan d'action principal

`docs/PLAN_ACTION.md` v1.1 traite des phases produit (Phase 1 : Stabilisation 5j, Phase 2 : Fiabilisation 10j, Phase 3 : Amélioration post-beta).

Ce plan Git est **orthogonal** : ses 3 phases (0, 1, 2 récurrente) peuvent être exécutées **en parallèle** sans bloquer aucune phase produit. La seule dépendance : **Phase 0 doit être faite AVANT toute Phase produit** (sinon les commandes Git bloquent sur le checkout principal).

## E. Références croisées

- Audit source : `docs/AUDIT_GIT.md`
- Synthèse : `docs/SYNTHESE_GIT.md`
- Cause racine : RC-H (cf. `SYNTHESE_GIT.md`)
- Stratégie de branches initiale : `CLAUDE.md` § "Stratégie de branches Git"
- Workflow CI actuel : `.github/workflows/ci.yml`
- Plan d'action produit : `docs/PLAN_ACTION.md` v1.1
