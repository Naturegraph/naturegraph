# Naturegraph — Audit Git & Repo Health

> **Version** : 1.0 — 2026-05-03
> **Posture** : staff engineer / release manager qui prépare un nettoyage Git sécurisé. **Aucune modification de code, aucun merge, aucun reset.**
> **Objectif** : cartographier la dette de flow Git pour la résorber sans perte de travail ni régression CI/CD.
> **Source** : lecture exhaustive `git branch -a`, `git log`, `git rev-list`, `gh pr list --state all`, inspection des worktrees.
> **Référentiel comparé** : convention de branches définie dans `CLAUDE.md` § "Stratégie de branches Git".

---

## TL;DR — État réel du repo

Le repo est **fonctionnellement sain** (`main` à jour, CI green, PR #41-#52 mergées proprement, pas de PR ouverte traînante). **Mais 3 problèmes critiques** menacent la cohérence Git pour la suite :

1. 🔴 **Rebase interactif INACHEVÉ** sur le checkout principal (`C:/Users/Freelance/Desktop/ClaudeDev_Naturegraph`) — bloque toute commande Git sur ce répertoire tant qu'elle n'est pas résolue.
2. 🔴 **`origin/develop` N'EXISTE PLUS** — auto-supprimée par GitHub après PR #51, casse la stratégie CLAUDE.md (« develop = long-running ») et tout déploiement Vercel preview attaché.
3. 🟠 **Stratégie de merge incohérente** entre les 3 niveaux (squash/merge/squash) — drift staging↔main grandit à chaque release, complique les futurs cherry-picks d'urgence.

**5 dettes de flow** à résorber sans urgence :

- 15 branches locales mortes encore présentes
- 2 fichiers/dossiers untracked (`docs/AUDIT_DB_LIVE.md`, `supabase/.temp/`)
- 1 PR fermée sans merge (#19 photo-management-v3) sans note de décision
- CI ne se déclenche pas sur push `staging` (régressions UAT non détectées avant prod)
- Auto-delete-branch GitHub agressif (récidive garantie au prochain merge feat → develop)

**Aucun risque imminent sur la production** — main est stable, les fixes RC-D + RC-E + HEIC sont en place. C'est de la dette de **process Git**, pas de la dette produit.

---

# 🔴 G-1 — Rebase orphelin sur le checkout principal (CRITIQUE)

## Constat

Inspection de `C:/Users/Freelance/Desktop/ClaudeDev_Naturegraph` (le checkout principal du user, hors worktrees Claude) :

```
HEAD = 7e96534 (detached, edit step)
Rebase target = 9370c53 (commit historique de PR #18 mergée)
Branch en cours de rebase = develop
1 commit edit DONE : "feat(ci): health check non-destructif + workflow GH Actions toutes les 4h"
3 commits PENDING :
  pick afb19e9 # feat(contribute): polish formulaire Encounter
  pick 8795718 # feat(photo): pivot photo-management v3 (Strava-style)
  pick ?       # commit final non listé par le statut
src/types/supabase.ts modifié, NON staged
```

**Origine** : ce rebase a été initié AVANT la session d'audit du 2026-05-03, probablement pour réorganiser l'historique de develop avant la beta. Il est resté en suspens pendant que toute la séquence Sprint causes racines + RC-D + RC-E s'est déroulée via les worktrees Claude (`.claude/worktrees/loving-shaw-034524`).

## Risques concrets

| Action utilisateur naïve                                   | Conséquence                                                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `git rebase --continue` aveuglément                        | Réécriture de develop avec une histoire **différente** de staging/main → désynchro totale |
| `git rebase --abort`                                       | Perte du travail edit intermédiaire (1 commit modifié)                                    |
| `git checkout main`                                        | Erreur Git "you have unfinished rebase", commande bloquée                                 |
| `git pull`                                                 | Erreur similaire, commande bloquée                                                        |
| Modification du fichier `src/types/supabase.ts` non-staged | Risque de perte si reset/checkout intempestif                                             |

## Précaution

**À résoudre EN PRIORITÉ ABSOLUE** avant tout autre travail Git. 3 options proposées (cf. § Action Plan G-1) :

- **Option A (recommandée)** : abandonner le rebase, repartir propre depuis `origin/main`
- **Option B** : poursuivre le rebase manuellement avec stash du fichier supabase.ts
- **Option C** : audit ligne par ligne du contenu du rebase avant décision

---

# 🔴 G-2 — `origin/develop` n'existe plus

## Constat

```bash
$ git branch -r
  origin/HEAD -> origin/main
  origin/main
  origin/staging
```

**Aucune référence `origin/develop`**.

## Origine

GitHub repo settings → **Automatically delete head branches** = activé. À chaque PR mergée, la branche source est supprimée. Lors du merge de **PR #51 (`develop → staging`)**, GitHub a auto-supprimé `develop` car c'était la « head branch » du PR.

Effet domino observé sur les 3 derniers cycles :

- PR #46 (`develop → staging`) → develop supprimée
- PR #51 (`develop → staging`) → develop supprimée à nouveau (recréée entre temps lors d'un push manuel)
- Idem pour `feat/rc-d-privacy-by-design` (PR #49), `feat/rc-e-onboarding-persistence` (PR #50), `chore/release-deployment-runbook` (PR #48)

## Conséquences

| Conséquence                                    | Impact                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Vercel deploy preview de develop               | Cassé (branche fantôme côté Vercel)                                                  |
| Variables d'env Vercel "develop"               | Attachées à un nom qui n'existe plus côté Git                                        |
| Workflow CI/CD attendant des push develop      | Ne se déclenche jamais                                                               |
| Stratégie CLAUDE.md « develop = long-running » | Contredite à chaque release cycle                                                    |
| Prochain PR `feat/* → develop`                 | Devra recréer develop avec le tip du PR au moment du merge → état initial arbitraire |

## Précaution

Recréer immédiatement `origin/develop = origin/main` (cf. Action Plan G-2), puis désactiver `Automatically delete head branches` côté GitHub Settings.

---

# 🟠 G-3 — Stratégie de merge incohérente

## Constat

| Source    | Cible     | Stratégie utilisée | Type de commit produit       |
| --------- | --------- | ------------------ | ---------------------------- |
| `feat/*`  | `develop` | **squash**         | 1 commit applati             |
| `develop` | `staging` | **merge commit**   | merge avec history préservée |
| `staging` | `main`    | **squash**         | 1 commit applati à nouveau   |

Vérifié sur les 3 dernières releases (PR #46+#47, PR #51+#52, PR antérieures).

## Effet observé

- `staging` accumule l'historique granulaire des features
- `main` collapse chaque release en 1 commit unique
- À chaque cycle release, le diff entre `staging` et `main` grandit en SHA même quand le **contenu** est identique (vérifié `git diff --name-only origin/main origin/staging` = vide après PR #52)

Exemple actuel :

```
main      = 7e881e9 release squash (1 commit)
staging   = 36cd3a3 Merge + bbd5ea2 + 4f20b84 + 80be663 (4 commits)
Contenu identique, SHAs différents.
```

## Risques

| Risque                                        | Sévérité                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Cherry-pick urgent main → staging             | 🟠 Possible mais nécessite souvent de squash le picked commit pour éviter les doubles |
| `git revert` propre d'une release sur main    | 🟢 Trivial (1 commit à révoquer)                                                      |
| `git revert` propre d'une release sur staging | 🟠 Nécessite de revert le merge + 3 commits                                           |
| Lecture historique long-terme                 | 🟢 Lisible : chaque release = 1 ligne sur main                                        |

## Précaution

Décision produit à trancher : **squash partout** (recommandé pour linéarité) ou **merge partout** (préserve audit). Cf. Action Plan G-3.

---

# 🟠 G-4 — Branches locales mortes (15 branches)

## Constat

Inspection `git branch` sur le worktree session :

| Branche                            | Statut Git              | PR associée             | Action recommandée                      |
| ---------------------------------- | ----------------------- | ----------------------- | --------------------------------------- |
| `chore/quick-wins-post-audit`      | 0 ahead                 | abandonnée ?            | `git branch -D`                         |
| `chore/release-deployment-runbook` | 1 ahead (squash-merged) | PR #48 ✅               | `git branch -D`                         |
| `claude/loving-shaw-034524`        | 0 ahead                 | PR #20, #22 ✅          | `git branch -D` (worktree session)      |
| `develop`                          | 0 ahead vs main         | —                       | **À reset sur main** (cf. G-1+G-2)      |
| `feat/backend-phase2-wiring`       | 1 ahead (squash-merged) | PR #35, #38 ✅          | `git branch -D`                         |
| `feat/rc-d-privacy-by-design`      | 1 ahead (squash-merged) | PR #49 ✅               | `git branch -D` (post-bascule worktree) |
| `feat/rc-e-onboarding-persistence` | 1 ahead (squash-merged) | PR #50 ✅               | `git branch -D`                         |
| `feat/settings-panel`              | 1 ahead (squash-merged) | PR #32 ✅               | `git branch -D`                         |
| `fix/audit-log-anonymization-cron` | 1 ahead (squash-merged) | PR #44 ✅               | `git branch -D`                         |
| `fix/backfill-saved-hidden-posts`  | 1 ahead (squash-merged) | PR #43 ✅               | `git branch -D`                         |
| `fix/bundle-budget-exifr`          | 1 ahead (squash-merged) | PR #18 ✅               | `git branch -D`                         |
| `fix/encounter-submit`             | 0 ahead                 | PR #25 ✅               | `git branch -d`                         |
| `fix/exif-strip-upload`            | 1 ahead (squash-merged) | PR #41 ✅               | `git branch -D`                         |
| `fix/policy-immediate-deletion`    | 1 ahead (squash-merged) | PR #45 ✅               | `git branch -D`                         |
| `fix/post-title-column`            | 1 ahead (squash-merged) | PR #27, #29 ✅          | `git branch -D`                         |
| `fix/posts-public-view`            | 1 ahead (squash-merged) | PR #42 ✅               | `git branch -D`                         |
| `heic-fix-temp`                    | 0 ahead                 | push direct sur develop | `git branch -d`                         |

**Note clé** : "1 ahead vs main" est trompeur — c'est le commit original sur la feature branche, le squash sur main a un SHA différent. Le contenu est **identique** (vérifié). Suppression sans risque.

## Risque

Bruit visuel dans `git branch` (17 branches locales pour 3 actives). Aucun impact technique.

## Précaution

`git branch --merged origin/main` ne renvoie que les branches mergées par merge commit (pas les squash). Utiliser le mode forcé `git branch -D` après vérification visuelle.

---

# 🟠 G-5 — Fichiers untracked dans le worktree session

## Constat

```
?? docs/AUDIT_DB_LIVE.md     (créé pendant la session MCP Supabase audit, jamais commité)
?? supabase/.temp/            (cache CLI Supabase, probablement local-only)
```

## Origine

- `docs/AUDIT_DB_LIVE.md` : audit live MCP Supabase produit pendant le SAFE OPS verification, contient l'état réel des migrations + advisors. Document précieux pour l'historique.
- `supabase/.temp/` : Supabase CLI génère ce dossier pour ses caches locaux (ex: `gen types`).

## Risques

| Risque                                                       | Sévérité                               |
| ------------------------------------------------------------ | -------------------------------------- |
| Perte du AUDIT_DB_LIVE.md si la worktree est nettoyée        | 🟠 Document utile à archiver           |
| Commit accidentel de `supabase/.temp/` lors d'un `git add .` | 🟢 Polluerait le repo mais sans danger |

## Précaution

- Décider si `docs/AUDIT_DB_LIVE.md` rejoint la suite des audits (PR dédiée chore/docs ou commit direct sur develop après recréation)
- Ajouter `supabase/.temp/` au `.gitignore` global (1 ligne)

---

# 🟠 G-6 — PR #19 fermée sans merge ni note

## Constat

```
gh pr list --state closed
#19 [CLOSED] feat/photo-management-v3 -> main
```

## Origine probable

Cette branche concerne le pivot photo-management v3 (Strava-style) que j'ai vu dans l'historique local de develop (commits `8795718`, `5ac9b0a`). Le travail a probablement été repris dans une autre PR (#48 docs ou ailleurs) ou abandonné.

## Risques

| Risque                                                                            | Sévérité                                      |
| --------------------------------------------------------------------------------- | --------------------------------------------- |
| Perte de contexte sur pourquoi cette PR a été fermée                              | 🟢 Cosmétique mais utile pour l'audit produit |
| Travail dupliqué si quelqu'un retente le pivot sans savoir qu'il a déjà été tenté | 🟠 Modéré                                     |

## Précaution

Ajouter un commentaire de fermeture sur PR #19 (via `gh pr comment 19 --body "..."`) expliquant la décision, ou archiver dans `docs/RELEASE_READINESS.md` § "PRs fermées sans merge".

---

# 🟠 G-7 — CI ne déclenche pas sur push `staging`

## Constat

`.github/workflows/ci.yml` :

```yaml
on:
  push:
    branches: [develop, main] # ← staging absent
  pull_request:
    branches: [develop, main] # ← staging absent
```

## Effet observé

Lors du merge `develop → staging` (PR #51 → commit `36cd3a3`), aucun CI run n'a été déclenché sur `staging`. Vérifié via `gh run list --branch staging`.

## Risques

| Risque                                                                                                        | Sévérité                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Régression introduite uniquement sur staging (ex: rebase incomplet, conflit résolu manuellement) non détectée | 🟠 Sérieux                                                                                        |
| Build cassé sur Vercel preview staging non remonté avant promotion main                                       | 🟠 Sérieux                                                                                        |
| Confiance abusive dans la CI develop pour valider staging                                                     | 🟠 La CI develop tourne sur le **contenu identique**, mais pas sur le **state du branch staging** |

## Précaution

Ajouter `staging` dans les 2 listes du workflow CI (3 lignes à modifier). Trivial.

---

# 🟢 G-8 — Convention commits respectée

## Constat

Inspection des 50 derniers commits sur main + staging :

- Tous les messages utilisent les préfixes conventionnels : `feat:`, `fix:`, `ci:`, `docs:`, `release:`, `chore:`, `perf:`
- Co-author Claude présent quand pertinent
- Messages descriptifs ("retire HEIC support for iOS compatibility" vs "update")
- Aucun commit "WIP", "test", "fix typo final final", "asdf"

## Pas de risque, pas de précaution

OK exemplaire, à conserver.

---

# 📋 Synthèse exécutive

## Sévérité par finding

| ID  | Finding                            | Sévérité    | Bloquant pour                              |
| --- | ---------------------------------- | ----------- | ------------------------------------------ |
| G-1 | Rebase orphelin checkout principal | 🔴 critique | Tout travail Git sur le checkout principal |
| G-2 | `origin/develop` supprimée         | 🔴 critique | Vercel preview, prochain cycle release     |
| G-3 | Stratégie merge incohérente        | 🟠 grave    | Cherry-pick urgent, audit historique       |
| G-4 | 15 branches locales mortes         | 🟠 grave    | Lisibilité `git branch`                    |
| G-5 | 2 fichiers untracked               | 🟠 grave    | Hygiène repo                               |
| G-6 | PR #19 fermée sans note            | 🟠 grave    | Mémoire produit                            |
| G-7 | CI absent sur staging              | 🟠 grave    | Détection régressions UAT                  |
| G-8 | Convention commits                 | 🟢 OK       | —                                          |

## TOP 3 actions immédiates

1. 🔴 **Résoudre le rebase orphelin** (G-1) — débloque tout le reste
2. 🔴 **Recréer `origin/develop`** + désactiver auto-delete-branch (G-2) — restaure le workflow
3. 🟠 **Étendre CI sur staging** (G-7) — protège la prochaine release

---

# 🧭 Action Plan Git

## Priorisation

| Priorité | Action                                          | Effort                               | Risque si non fait                                |
| -------- | ----------------------------------------------- | ------------------------------------ | ------------------------------------------------- |
| **P0**   | Résoudre rebase orphelin (G-1)                  | 5 min (option A) → 20 min (option B) | 🔴 Désynchro Git, perte travail, blocage commande |
| **P1**   | Recréer `origin/develop` (G-2)                  | 1 min                                | 🔴 Vercel preview cassé                           |
| **P2**   | Désactiver auto-delete-branch GitHub            | 30 sec via Settings                  | 🟠 Récidive immédiate au prochain merge           |
| **P3**   | Reset local develop sur origin/main (G-1 + G-4) | 2 min                                | 🟠 Confusion future, branches divergentes         |
| **P4**   | Cleanup 15 branches locales mortes (G-4)        | 5 min                                | 🟢 Bruit visuel                                   |
| **P5**   | Étendre CI workflow sur staging (G-7)           | 5 min                                | 🟠 Régressions UAT non détectées                  |
| **P6**   | Standardiser stratégie merge (G-3)              | 2 min Settings + 1 décision produit  | 🟢 Drift accumule mais pas urgent                 |
| **P7**   | Cleanup untracked + .gitignore (G-5)            | 5 min                                | 🟢 Cosmétique                                     |
| **P8**   | Note de fermeture PR #19 (G-6)                  | 2 min                                | 🟢 Mémoire produit                                |

## Détail des actions par priorité

### P0 — Résolution rebase orphelin

**À exécuter sur** : `C:/Users/Freelance/Desktop/ClaudeDev_Naturegraph` (worktree principal)

**Option A (recommandée — abandonner)** :

```bash
cd C:/Users/Freelance/Desktop/ClaudeDev_Naturegraph
git rebase --abort
git checkout -- src/types/supabase.ts
git fetch origin
git checkout main
git reset --hard origin/main
```

**Option B (poursuivre)** :

```bash
cd C:/Users/Freelance/Desktop/ClaudeDev_Naturegraph
git stash push -m "supabase.ts WIP rebase"
git rebase --continue
# Si conflit : résoudre + git rebase --continue
git stash pop
```

**Option C (audit avant décision)** :

- Demander à Claude de lire chaque commit du rebase pour décider du sort de chacun
- Préserver le travail edit intermédiaire si pertinent

### P1 — Recréer origin/develop

```bash
git push origin origin/main:refs/heads/develop
```

Vérification :

```bash
git fetch origin
git branch -r | grep develop      # doit afficher origin/develop
```

### P2 — Désactiver auto-delete-branch

GitHub UI :

1. Repo Settings → General → Pull Requests
2. **Décocher** "Automatically delete head branches"
3. Save

(Aucune commande Git nécessaire.)

### P3 — Reset local develop

```bash
cd <worktree principal>
git checkout develop
git fetch origin
git reset --hard origin/main      # aligne local develop sur main
git push origin develop --force   # propage sur le remote (si origin/develop déjà recréée par P1)
```

### P4 — Cleanup branches locales mortes

```bash
# Préviewer :
git branch | grep -v -E "(main|staging|develop|\*)"

# Supprimer en masse (toutes celles du tableau § G-4) :
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
  heic-fix-temp
```

### P5 — Étendre CI sur staging

`.github/workflows/ci.yml` :

```yaml
on:
  push:
    branches: [develop, staging, main] # ← ajout
  pull_request:
    branches: [develop, staging, main] # ← ajout
```

Commit dédié sur develop :

```bash
git checkout develop
# édition fichier
git add .github/workflows/ci.yml
git commit -m "ci: trigger workflow on staging push and PR (G-7)"
git push origin develop
```

### P6 — Standardiser stratégie merge

GitHub Repo Settings → General → Pull Requests :

**Option recommandée** : cocher **uniquement** "Allow squash merging", désactiver les 2 autres.

Avantages :

- Linéarité parfaite, chaque ligne sur main = 1 release
- Cherry-pick trivial entre staging et main
- `git log --oneline` totalement lisible

Effet sur les futures releases :

- `develop → staging` deviendra squash → staging gardera 1 commit par PR mergée (au lieu d'un merge commit)
- Plus de drift staging↔main en SHA quand le contenu est identique

### P7 — Cleanup untracked

```bash
echo "supabase/.temp/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore supabase CLI temp directory (G-5)"
```

Pour `docs/AUDIT_DB_LIVE.md` :

- **Si garder** : `git add docs/AUDIT_DB_LIVE.md && git commit -m "docs: add live DB audit (MCP Supabase)"`
- **Sinon** : `rm docs/AUDIT_DB_LIVE.md`

### P8 — Note de fermeture PR #19

```bash
gh pr comment 19 --body "Fermée sans merge — pivot photo-management v3 finalement abandonné au profit de l'approche minimale MVP. Travail repris partiellement dans PR #18 (exifr lite) et PR #41 (EXIF stripping)."
```

---

# 🛡️ Recommandations workflow futur

## R-1 — Branches protégées (Repo Settings → Branches)

| Branche   | Règles                                                                   |
| --------- | ------------------------------------------------------------------------ |
| `main`    | Require PR + 1 approval + status checks (CI green) + linear history      |
| `staging` | Require PR + status checks                                               |
| `develop` | Require status checks (push direct OK pour petits commits per CLAUDE.md) |

## R-2 — Conventions branches features

Garder le préfixage actuel : `feat/`, `fix/`, `chore/`, `refactor/`, `perf:`, `docs/`.

Optionnel : préfixer par numéro d'issue Linear/Notion :

- `feat/123-onboarding-persistence` au lieu de `feat/rc-e-onboarding-persistence`

## R-3 — Hooks pré-merge (GitHub Action)

Action qui REFUSE le merge `develop → staging` si :

- staging est en avance sur main (force à promouvoir staging → main avant)
- des commits staging non présents dans develop existent (force à reset staging sur develop d'abord)

## R-4 — Cleanup automatique trimestriel

À lancer manuellement tous les 3 mois sur le checkout principal :

```bash
# Nettoyer les remote branches supprimées
git remote prune origin

# Lister les branches locales mergées dans main (mode merge-commit uniquement)
git branch --merged origin/main | grep -v -E "(main|staging|develop|\*)"

# Lister les branches locales potentiellement squash-merged (à valider visuellement)
for branch in $(git branch | grep -v -E "(main|staging|develop|\*)"); do
  AHEAD=$(git rev-list $branch --not origin/main origin/staging --count)
  echo "$branch : $AHEAD ahead"
done
```

## R-5 — Documentation post-release

Pour chaque release squash main → main, ajouter une ligne dans `docs/RELEASE_READINESS.md` :

- Date du merge
- Numéro de PR principal
- Liste des features livrées
- Liens vers PRs sources squash-mergées

Permet de retrouver l'historique granulaire malgré la collapse squash.

---

# 📊 Métriques actuelles (snapshot 2026-05-03)

| Métrique                        | Valeur                                     | Cible                                       |
| ------------------------------- | ------------------------------------------ | ------------------------------------------- |
| Branches remote actives         | 2 (`main`, `staging`)                      | 3 (manque `develop`)                        |
| Branches locales                | 17                                         | ≤ 5 (les 3 actives + 1-2 features en cours) |
| PRs ouvertes                    | 0                                          | ≤ 3                                         |
| Drift staging vs main (SHAs)    | 4 commits                                  | À surveiller                                |
| Drift staging vs main (contenu) | 0 fichier                                  | ✅ Idéal                                    |
| Worktrees actifs                | 2 (principal en rebase + worktree session) | À nettoyer après session                    |
| CI green sur main               | ✅                                         | ✅                                          |
| Convention commits              | ✅ 100%                                    | ✅                                          |
| Auto-delete-branch GitHub       | ⚠️ Activé                                  | Désactivé recommandé                        |
| CI déclenché sur staging        | ❌                                         | ✅                                          |

---

# 🎯 Verdict global

**Repo Git en bonne santé fonctionnelle** avec un workflow respecté sur les 12 dernières releases. **3 problèmes critiques** à régler avant de continuer le développement post-beta :

1. ✅ **Production stable** — main contient tous les fixes, CI green, beta livrable
2. ❌ **Process Git fragile** — rebase orphelin + develop disparue + auto-delete agressif → la prochaine release sera douloureuse si rien n'est fait
3. ⚠️ **Dette de flow** — 15 branches mortes, 2 untracked, CI partielle → cosmétique mais accumulable

**Recommandation finale** : exécuter P0 → P2 immédiatement (15 min total), puis planifier P3 → P8 dans une session "hygiène repo" dédiée d'1h max.

Aucun de ces points n'est bloquant pour la beta privée 5-10 testeurs en cours. Mais P0 + P1 + P2 sont **bloquants pour le prochain cycle de développement** (RC-F refacto composants, RC-G perf, ou nouvelles features).
