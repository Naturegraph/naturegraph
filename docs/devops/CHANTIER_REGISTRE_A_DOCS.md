# Registre A — Docs (Lot 1 du chantier qualité)

> Preuve de couverture du Lot 1. Chaque doc/zone a un **verdict**. Mis à jour 2026-08-19.
> Statut Lot 1 : **quasi complet** (corrections + archivage faits ; reste 2 items tracés).

## Corrigés (état faux -> aligné sur la réalité)

| Doc                               | Correction                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `devops/environments.md`          | Corps aligné sur le bandeau : Supabase beta/dev = base DEV séparée ; tableau variables Preview/Production ; « état actuel vs objectif » à jour (accès ouvert, feature flags, dev DB faits). |
| `PROJECT_MASTER.md` (en-tête)     | Version V1.1.0 (fausse) -> **V0.8.2** + note renumérotation NG-025 + statut accès ouvert. Corps détaillé : **à réharmoniser** (voir « Reste »).                                             |
| `CLAUDE.md` (ligne version)       | V1.0.0 -> V0.8.2 + note versioning.                                                                                                                                                         |
| `docs/README.md`                  | Index Devops enrichi (PIPELINE_DEV, CHANTIER, VERSIONING, dev parity, rollback) + pointeurs Archive.                                                                                        |
| `devops/CHANTIER_QUALITE_CODE.md` | Artefact prettier du Lot 0 nettoyé + statut Lot 0 = FAIT.                                                                                                                                   |

## Archivés (historique conservé, non maintenu)

| Élément                                                                | Destination                         |
| ---------------------------------------------------------------------- | ----------------------------------- |
| Release notes V0.0.x -> V0.7.x (66 fichiers) + legacy V1.0.x -> V1.2.x | `devops/releases/archive/`          |
| `RELEASE_V0.4.0.md` (release égarée)                                   | `devops/releases/archive/V0.4.0.md` |
| `PRELANCEMENT_KICKOFF.md`, `PRELANCEMENT_HANDOFF_OUVERTURE.md`         | `docs/_archive/`                    |
| `AUDIT_2026-05-31.md` (remplacé par AUDIT_PLATEFORME_2026-08-04)       | `docs/_archive/`                    |

Visibles dans `releases/` : `README.md`, `NOTIFICATIONS_HISTORY.md`, `V0.8.0/1/2`.

## Gardés (docs vivants, pas de correction nécessaire au sweep)

- `devops/` runbooks & process : PIPELINE_DEV, RELEASE_PROCESS, deployment, monitoring,
  environments, VERSIONING, FORCE_LOGOUT_RUNBOOK, ROLLBACK_OPEN_ACCESS, DNS_HOSTINGER,
  EDGE_SENTRY_DEPLOY, RESTAURATION_BACKUP, SUPABASE_DEV_PARITY_RUNBOOK, NOTIFICATIONS_SYSTEM,
  DEFINITION_UTILISATEUR_ACTIF, PLAN_FIABILITE_RESILIENCE, OBSERVABILITE_STABILITE_PLAN.
- `security/` (12), `backend/` (3), `api-connection/` (3), `design-system/` : verdict par
  défaut « garder » (référence technique). **Non relus ligne à ligne** : sweep de contrôle
  ciblé prévu (motifs d'état périmé) avant clôture du chantier.
- `PRD_*` (12) + `USER_STORIES` : conservées (source de vérité produit).
- Roadmaps : `AUTH_ROADMAP`, `SUPABASE_PRO_ROADMAP`, `SEED_SPECIES_V2_RUNBOOK` : gardées.

## Reste à traiter (tracé)

- [ ] **`PROJECT_MASTER.md` corps** : réharmoniser en profondeur le récit de versions
      (historique V1.x legacy vs schéma V0.x actuel) + sections roadmap « V1.1.0 / V1.2.0 »
      (legacy). Tâche dédiée : nécessite de clarifier le récit de versions avec Nicolas.
      En attendant, le bandeau d'en-tête évite toute méprise.
- [ ] **Mentions résiduelles « beta privée »** dans `devops/NOTIFICATION_TEMPLATES.md` et
      `devops/RELEASE_PROCESS.md` : vérifier si c'est du contenu de template légitime ou
      un état périmé à corriger.
- [ ] **Worktree leftover** `.claude/worktrees/gifted-keller-bbd3f9/` : copie complète du
      repo (probable résidu d'un agent isolé) -> à nettoyer (`git worktree remove`) hors
      périmètre docs, mais noté ici.
