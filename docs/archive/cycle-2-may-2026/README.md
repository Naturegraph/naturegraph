# Archive — Cycle 2 de pre-launch beta (mai 2026)

> **Statut** : 📦 Archive figée. Les plans et audits ici ont ete **livres** dans les BATCH 27-37 du cycle 2.
> **Période** : 2026-05-13 → 2026-05-14
> **Verdict global** : Beta closed access ready (5 modules admin + Edge Function + RGPD + i18n)

---

## Quoi y a-t-il dans cette archive ?

Cette archive contient les **plans, audits et runbooks** du cycle 2 de
preparation pre-launch beta de Naturegraph. Tous les elements actionnables
ont ete livres et integres dans le code. Les documents sont conserves pour :

- **Traçabilite** : retrouver d'ou vient une decision technique
- **Pedagogie** : comprendre les arbitrages des audits
- **Reference** : modeles de docs pour les futurs cycles

**A ne PAS y aller** pour des informations a jour — voir plutot :

- [`docs/MASTER_TODO.md`](../../MASTER_TODO.md) — etat actuel post BATCH 38+
- [`docs/BETA_LAUNCH_RUNBOOK.md`](../../BETA_LAUNCH_RUNBOOK.md) — runbook operationnel
- [`docs/BETA_CLOSED_ACCESS_STRATEGY.md`](../../BETA_CLOSED_ACCESS_STRATEGY.md) — strategy v2.0
- [`docs/ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md`](../../ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md) — admin strategy

---

## Inventaire (7 docs)

| Doc                             | Date       | Raison de l'archivage                                                                     |
| ------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `STATUS_2026-05-13.md`          | 2026-05-13 | Snapshot fin cycle 1. Cycle 2 livre (BATCH 27-37+), donc plus l'etat actuel               |
| `AUDIT_ADVISORS_2026-05-13.md`  | 2026-05-13 | Audit live d'avant BATCH 28-37 (nouvelles tables admin/beta) — invalide                   |
| `AUDIT_DEAD_CODE_2026-05-13.md` | 2026-05-13 | knip d'avant ajout admin/beta + cleanup BATCH 38 — invalide                               |
| `DEPLOYMENT_RUNBOOK.md`         | 2026-05-13 | Runbook "sprint causes racines" 2026-05-03 deja execute — succede par BETA_LAUNCH_RUNBOOK |
| `PROJECT_MASTER.md`             | 2026-05-13 | Double-emploi avec STATUS + MASTER_TODO + backend/database-architecture                   |
| `PROJECT_STRUCTURE.md`          | 2026-05-13 | Reference une arborescence `docs/01-product/`, `02-prd/`... qui n'existe pas              |
| `design-system/tasks-linear.md` | (BATCH 25) | Roadmap DS Sprints 0-3 livrees BATCH 5-10 (cycle 1) — devrait etre dans cycle-1           |

---

## Pour reprendre les decisions de ces docs

Si tu cherches **POURQUOI** une certaine decision a ete prise (ex: pourquoi le
budget bundle a ete bumpe a 420 KB pour BATCH 28-35, pourquoi telle RLS policy
admin a ete restructuree BATCH 37), va dans ces docs.

Si tu cherches **QUOI FAIRE** maintenant, va dans `docs/MASTER_TODO.md` ou
`docs/BETA_LAUNCH_RUNBOOK.md`.

---

Refs : BATCH 40 (2026-05-14) — cleanup docs post-cycle 2.
