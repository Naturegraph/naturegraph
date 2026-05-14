# Naturegraph — Synthèse Git & cause racine RC-H

> **Version** : 1.0 — 2026-05-03
> **Source** : `docs/AUDIT_GIT.md` v1.0
> **Posture** : analyse causale (root cause), pas symptomatique. Vue produit avant cleanup repo.
> **Objectif** : extraire la cause racine du désordre Git pour décider AVANT cleanup.
> **Référentiel comparé** : `docs/SYNTHESE_AUDITS.md` v1.0 (RC-A à RC-G — produit/code).

---

# Méthodologie

Même approche que `SYNTHESE_AUDITS.md` :

1. **Symptôme** (un finding G-1 à G-8 dans `AUDIT_GIT.md`)
2. **Convergence** (le même symptôme observable de plusieurs angles : Git, CI, Vercel, workflow)
3. **Cause racine** (l'origine commune qui produit plusieurs symptômes)

---

# Confirmation des convergences détectées

## Convergence 1 — Branches éphémères supprimées trop tôt

| Audit / Source     | Référence                | Diagnostic                                                             |
| ------------------ | ------------------------ | ---------------------------------------------------------------------- |
| AUDIT_GIT          | G-2                      | `origin/develop` n'existe plus, auto-supprimée par GitHub après PR #51 |
| AUDIT_GIT          | G-4                      | 15 branches locales mortes encore présentes (squash-merged)            |
| Workflow CLAUDE.md | "develop = long-running" | Stratégie contredite à chaque release cycle                            |
| Vercel preview     | (implicite)              | URL preview develop attachée à une branche fantôme                     |

**Convergence confirmée**. C'est UN problème vu sous 4 angles : la politique GitHub `Automatically delete head branches` ne distingue pas les branches **éphémères** (feat/, fix/) des branches **long-running** (develop, staging).

## Convergence 2 — État Git stale sur le checkout principal

| Audit / Source | Référence             | Diagnostic                                                                           |
| -------------- | --------------------- | ------------------------------------------------------------------------------------ |
| AUDIT_GIT      | G-1                   | Rebase interactif non terminé sur `C:/Users/Freelance/Desktop/ClaudeDev_Naturegraph` |
| AUDIT_GIT      | G-1                   | `src/types/supabase.ts` modifié, non staged                                          |
| User feedback  | session du 2026-05-03 | "je ne retrouve plus les documents qui était vraiment important"                     |
| AUDIT_DB_LIVE  | (implicite)           | Worktrees Claude utilisés à la place, contournement involontaire                     |

**Convergence confirmée**. La même cause (rebase orphelin sur `develop`) produit 3 symptômes visibles :

- L'utilisateur ne voit pas les audits récents (PR #48) car son HEAD est en arrière sur la timeline
- Toute commande Git sur ce checkout bloque
- Le travail intermédiaire est en péril si une commande de reset est lancée par mégarde

## Convergence 3 — Stratégie merge inhomogène

| Audit / Source | Référence          | Diagnostic                                                             |
| -------------- | ------------------ | ---------------------------------------------------------------------- |
| AUDIT_GIT      | G-3                | feat→develop=squash, develop→staging=merge commit, staging→main=squash |
| AUDIT_GIT      | G-7                | CI absent sur staging, donc régressions du merge commit non détectées  |
| Historique PRs | #46, #47, #51, #52 | Pattern reproduit sur les 2 derniers cycles release                    |

**Convergence confirmée**. La stratégie n'a jamais été tranchée formellement, on a hérité du défaut GitHub (allow-all). Conséquence : drift staging↔main grandit sans qu'aucun outil ne le surveille.

## Convergence 4 — Hygiène repo non automatisée

| Audit / Source | Référence | Diagnostic                                    |
| -------------- | --------- | --------------------------------------------- |
| AUDIT_GIT      | G-4       | 15 branches locales mortes                    |
| AUDIT_GIT      | G-5       | `supabase/.temp/` jamais ajouté au .gitignore |
| AUDIT_GIT      | G-5       | `docs/AUDIT_DB_LIVE.md` jamais commité        |
| AUDIT_GIT      | G-6       | PR #19 fermée sans note de décision           |
| AUDIT_GIT      | G-7       | CI workflow incomplet                         |

**Convergence confirmée**. 5 symptômes de surface, **1 cause** : aucun rituel de maintenance Git n'existe (pas de cleanup trimestriel, pas de revue post-release, pas de hook pré-merge).

---

# Cause racine

## RC-H — Process Git fragile (pas de garde-fou ni de rituel)

> **Issue Git centrale** : le repo est techniquement sain mais **manque de garde-fous** pour empêcher les dérives. Toutes les anomalies G-1 à G-7 partagent la même origine : aucun mécanisme automatique ne détecte ni n'empêche les états incohérents.

### Symptômes regroupés

| Symptôme                                         | Catégorie         | Audit |
| ------------------------------------------------ | ----------------- | ----- |
| Rebase interactif laissé inachevé                | État local        | G-1   |
| Branches long-running supprimées par auto-delete | Config GitHub     | G-2   |
| Stratégie merge mixte non documentée             | Config GitHub     | G-3   |
| 15 branches locales mortes accumulées            | Hygiène locale    | G-4   |
| 2 fichiers untracked depuis plusieurs sessions   | Hygiène locale    | G-5   |
| PR fermée sans note de décision                  | Mémoire produit   | G-6   |
| CI workflow ne couvre pas staging                | Config CI         | G-7   |
| Convention commits respectée                     | (control positif) | G-8   |

### Pourquoi c'est une cause racine

Les 7 symptômes négatifs **disparaîtraient tous** si :

1. **Garde-fou GitHub** : auto-delete-branch désactivé pour les branches long-running, branch protection rules sur main/staging/develop
2. **Garde-fou CI** : workflow couvre toutes les branches de promotion, action GitHub qui refuse les états dégradés (merge sans CI green, drift staging>main, etc.)
3. **Rituel local** : checklist post-release (cleanup branches, vérifier untracked, ajouter notes PR fermées), exécutée à chaque cycle ou trimestriellement

### Différences avec RC-A à RC-G

| RC       | Domaine                | Échelle          |
| -------- | ---------------------- | ---------------- |
| RC-A     | Migrations SQL         | Backend/code     |
| RC-B     | RLS column-level       | Backend/sécurité |
| RC-C     | Cycle vie données RGPD | Backend/légal    |
| RC-D     | Privacy by Design UI   | Frontend/UX      |
| RC-E     | Onboarding contract    | Frontend/data    |
| RC-F     | Composants obèses      | Frontend/code    |
| RC-G     | Performance flows      | Frontend/perf    |
| **RC-H** | **Process Git**        | **DevOps/repo**  |

RC-H est la **première cause racine de niveau DevOps** identifiée. Les autres concernent le produit, celle-ci concerne **comment on livre le produit**.

---

# Métriques de la cause racine

| Métrique                        | Avant audit (2026-05-03) | Cible post-cleanup          |
| ------------------------------- | ------------------------ | --------------------------- |
| Branches remote actives         | 2 (manque develop)       | 3                           |
| Branches locales                | 17                       | ≤ 5                         |
| PRs ouvertes                    | 0                        | ≤ 3                         |
| Drift staging↔main (SHAs)       | 4 commits                | 0-1 commit (squash partout) |
| Drift staging↔main (contenu)    | 0 fichier ✅             | 0 fichier                   |
| Worktrees actifs                | 2 (1 en rebase)          | 1 (le main checkout propre) |
| CI déclenché sur staging        | ❌                       | ✅                          |
| Auto-delete-branch actif        | ⚠️ Oui                   | ❌                          |
| Branch protection rules         | ❌                       | ✅ main + staging + develop |
| Rituel cleanup trimestriel      | ❌                       | ✅ Documenté                |
| Note systématique sur PR fermée | ❌                       | ✅ Convention               |

---

# Décision RC-H — Verdict

## ✅ Bonnes nouvelles

- Le **contenu produit** est sain (G-8 OK, conventions commits respectées)
- Aucune **perte de données** (tous les commits du rebase sont aussi présents sur main via le chemin de PR successifs)
- La **production est stable** (main green, beta livrable)

## ❌ Mauvaises nouvelles

- **Le prochain cycle release** sera douloureux si rien n'est fait :
  - Vercel preview develop cassé
  - CI ne couvre pas staging
  - Risque que le rebase orphelin soit "résolu" par une commande hâtive (perte de travail)

## 🎯 Action

Cf. `docs/PLAN_ACTION_GIT.md` — Phase 0 (urgences P0-P2) avant tout autre développement.

Une fois RC-H résolue, le repo est prêt pour **toutes** les phases produit suivantes (RC-F refacto composants, RC-G perf, etc.) sans frottement Git.

---

# Cohérence avec les autres synthèses

| Synthèse                        | Causes racines | Domaine      |
| ------------------------------- | -------------- | ------------ |
| `SYNTHESE_AUDITS.md` v1.0       | RC-A à RC-G    | Produit/code |
| `SYNTHESE_GIT.md` v1.0 (ce doc) | RC-H           | DevOps/repo  |

**Convention de versioning** :

- v1.x : ajout de symptômes ou raffinement causes
- v2.0 : refonte structure (ex : ajout RC-I si nouvelle cause DevOps émergeait)

---

# Références croisées

- Audit source : `docs/AUDIT_GIT.md`
- Plan d'exécution : `docs/PLAN_ACTION_GIT.md`
- Stratégie de branches : `CLAUDE.md` § "Stratégie de branches Git"
- Workflow CI : `.github/workflows/ci.yml`
- Convention commits : commits récents sur `main` (cf. G-8)
