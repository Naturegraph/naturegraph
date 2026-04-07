# Documentation Naturegraph

> Index de la documentation projet. **Source de vérité unique** : chaque sujet a un et un seul document maître. Si tu trouves un doublon, ouvre une issue.

## Backend & données

| Doc                                                                    | Sujet                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`backend/database-architecture.md`](backend/database-architecture.md) | Architecture DB, principes, tables, justifications                   |
| [`backend/schema.sql`](backend/schema.sql)                             | Schéma SQL canonique consolidé (extensions, tables, index, triggers) |
| [`backend/relations.md`](backend/relations.md)                         | Diagramme ER, cardinalités, justification des index                  |

## Connexion API

| Doc                                                                    | Sujet                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------- |
| [`api-connection/supabase-setup.md`](api-connection/supabase-setup.md) | Setup client Supabase, env vars, gen types           |
| [`api-connection/endpoints.md`](api-connection/endpoints.md)           | Services TS, hooks React Query, cache keys, Realtime |
| [`api-connection/auth-flow.md`](api-connection/auth-flow.md)           | Signup / login / reset / delete account              |

## Sécurité

| Doc                                                          | Sujet                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| [`security/rls-policies.md`](security/rls-policies.md)       | Politiques RLS Postgres pour chaque table                 |
| [`security/data-protection.md`](security/data-protection.md) | RGPD : registre, exports, droit à l'oubli, sous-traitants |
| [`security/media-security.md`](security/media-security.md)   | Buckets Storage, pipeline upload, EXIF, espèces sensibles |

## DevOps

| Doc                                                | Sujet                                                        |
| -------------------------------------------------- | ------------------------------------------------------------ |
| [`devops/environments.md`](devops/environments.md) | 3 environnements (local/staging/prod), variables, migrations |
| [`devops/deployment.md`](devops/deployment.md)     | CI/CD, Vercel, headers sécurité, rollback, backups           |
| [`devops/monitoring.md`](devops/monitoring.md)     | Sentry, Supabase Advisors, métriques, alerting               |

## Guidelines

| Doc                                                                    | Sujet                                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`guidelines/backend-guidelines.md`](guidelines/backend-guidelines.md) | Règles d'or backend, conventions, anti-patterns, checklists PR |

## Produit (PRD & design)

| Doc                                          | Sujet                                           |
| -------------------------------------------- | ----------------------------------------------- |
| [`PRD-LANDING.md`](PRD-LANDING.md)           | PRD landing page                                |
| [`PRD_HOMEPAGE.md`](PRD_HOMEPAGE.md)         | PRD homepage (feed, sidebar, états)             |
| [`PRD_ONBOARDING.md`](PRD_ONBOARDING.md)     | PRD auth + onboarding                           |
| [`PRD_POST_FORMATS.md`](PRD_POST_FORMATS.md) | PRD formats de posts                            |
| [`FIGMA_SCREENS.md`](FIGMA_SCREENS.md)       | Index des node IDs Figma par flow et breakpoint |

## Conventions

- **Une source de vérité par sujet.** Si un fichier en chevauche un autre, on consolide ou on supprime.
- **Le SQL est canonique** : `backend/schema.sql` reflète l'état des migrations dans `supabase/migrations/`. CI vérifie le diff.
- **Les types TS sont générés**, pas écrits à la main : `npx supabase gen types typescript > src/types/supabase.ts`.
- **Aucun doc legacy** : si une info est obsolète, on la met à jour ou on la supprime — pas de fichiers `_old`, `_v1`, `_archive`.
