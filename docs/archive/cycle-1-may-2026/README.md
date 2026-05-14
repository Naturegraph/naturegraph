# Archive — Cycle 1 de consolidation MVP (mai 2026)

> **Statut** : 📦 Archive figée. Tous les plans et audits ici ont ete **livres** dans les 25 BATCHES du cycle 1.
> **Periode** : 2026-04-29 → 2026-05-13
> **Verdict global** : 98/117 taches livrees (84%), 25 BATCHES expedies a `main`.

---

## Quoi y a-t-il dans cette archive ?

Cette archive contient les **plans, audits, et roadmaps** du cycle 1 de consolidation MVP de Naturegraph. Tous les elements actionnables ont ete livres et integres dans le code. Les documents sont conserves pour :

- **Traçabilite** : retrouver d'ou vient une decision technique
- **Pedagogie** : comprendre les arbitrages des audits
- **Reference** : modeles de docs pour les futurs cycles

**A ne PAS y aller** pour des informations a jour — voir plutot :

- [`docs/STATUS_2026-05-13.md`](../../STATUS_2026-05-13.md) — etat final du cycle 1
- [`docs/MASTER_TODO.md`](../../MASTER_TODO.md) — 19 taches restantes
- [`docs/AUDIT_ADVISORS_2026-05-13.md`](../../AUDIT_ADVISORS_2026-05-13.md) — audit DB live frais
- [`docs/AUDIT_DEAD_CODE_2026-05-13.md`](../../AUDIT_DEAD_CODE_2026-05-13.md) — audit knip frais

---

## Inventaire (16 docs)

### Plans roadmap (5)

| Doc                        | Date       | Statut                           |
| -------------------------- | ---------- | -------------------------------- |
| `CONSOLIDATION_ROADMAP.md` | 2026-05-04 | ✅ Phase 1 livree (BATCHES 1-25) |
| `NEXT_TASKS.md`            | 2026-05-04 | ✅ Integré a MASTER_TODO         |
| `PLAN_ACTION.md`           | 2026-05-02 | ✅ Priorites livrees             |
| `CLEANUP_PLAN.md`          | 2026-05-04 | ✅ Execute v1.1                  |
| `CLEANUP_PROJECT.md`       | 2026-05-04 | ✅ Cleanup v2 fait               |

### Audits par domaine (10)

| Doc                         | Date              | Statut                                                 |
| --------------------------- | ----------------- | ------------------------------------------------------ |
| `SYNTHESE_AUDITS.md`        | 2026-05-02        | Causes racines RC-A→RC-G — adresses                    |
| `AUDIT_FLOWS.md`            | v1.1              | 12 flows fonctionnels audites                          |
| `AUDIT_PERFORMANCE.md`      | 2026-05-02        | Budget bundle 325 KB → 330 KB (BATCH 17)               |
| `AUDIT_LEGAL.md`            | 2026-05-02        | NC RGPD/Loi 25 resolues                                |
| `AUDIT_SUPABASE.md`         | 2026-05-02        | Drift resorbe — voir AUDIT_DB_LIVE                     |
| `AUDIT_DB_LIVE.md`          | 2026-05-03        | Etat live MCP — voir AUDIT_ADVISORS_2026-05-13 (frais) |
| `AUDIT_GITHUB.md`           | 2026-05-04        | 11 problemes / 8 axes — livres BATCH 2                 |
| `AUDIT_DESIGN_SYSTEM.md`    | v1.1 — 2026-05-04 | 6 PS structurels — partiel (BATCH 5/6/7)               |
| `AUDIT_TECH_DEBT_GLOBAL.md` | 2026-05-04        | 3 critiques + 7 + 7 — adresses                         |

### Quick Wins (1)

| Doc             | Statut                                                           |
| --------------- | ---------------------------------------------------------------- |
| `QUICK_WINS.md` | ✅ 28/47 livres (cycle BATCHES) — voir MASTER_TODO pour le suivi |

### Release readiness (1)

| Doc                    | Statut                                       |
| ---------------------- | -------------------------------------------- |
| `RELEASE_READINESS.md` | A reactualiser apres cycle 2 / pre-prod beta |

---

## Pourquoi archiver ?

A la fin du cycle 1, ces documents jouaient deux roles :

1. **Documenter le travail a faire** → ROLE FINI car le travail est fait
2. **Documenter les decisions prises** → CONSERVE en archive

Les laisser dans `docs/` au top-level creait du bruit pour les nouvelles personnes arrivant sur le projet. L'archive permet de :

- Garder un repertoire `docs/` lisible (~25 fichiers actifs vs 41+ avant)
- Preserver l'historique pour onboarding et audit
- Marquer clairement "ces docs sont FINIS"

---

## Pour reprendre les decisions de ces docs

Si tu cherches **POURQUOI** une certaine decision a ete prise (ex: pourquoi le bundle gzip a ete bumpe de 325 a 330 KB, pourquoi telle policy RLS a ete supprimee), va dans ces docs.

Si tu cherches **QUOI FAIRE** maintenant, va dans `docs/MASTER_TODO.md` ou `docs/STATUS_2026-05-13.md`.

---

Refs : BATCH 26 (2026-05-13) — cleanup docs post-cycle 1.
