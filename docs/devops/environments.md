# Environnements

## Stratégie 3 environnements

| Env | Branche Git | Supabase | Hébergement | URL | Public |
|---|---|---|---|---|---|
| **local** | `feat/*`, `develop` | `naturegraph-dev` | `npm run dev` | http://localhost:5173 | dev seul |
| **staging** | `staging` | `naturegraph-dev` | Vercel preview stable | https://staging.naturegraph.fr | beta testers |
| **production** | `main` | `naturegraph-prod` | Vercel production | https://naturegraph.fr | tout le monde |

> **Pourquoi staging partage la DB de dev** — Phase MVP : on évite la facturation d'un 2e projet Supabase et on garde des données ephemères. Quand on lance la beta publique, on isole staging dans son propre projet.

## Variables d'environnement

### Vercel — Production (branche `main`)

| Variable | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | `https://<prod>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | publishable key prod |
| `VITE_APP_ENV` | `production` |
| `VITE_SENTRY_DSN` | DSN Sentry prod |

### Vercel — Preview (branches `staging`, `develop`, features)

| Variable | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | `https://hrxgduvworofnrjmgpcj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | publishable key dev |
| `VITE_APP_ENV` | `staging` |

### Local

`.env.local` (gitignored) — voir `api-connection/supabase-setup.md`.

## Migrations SQL — workflow

```
feat/xxx ──▶ développement local, migration créée dans supabase/migrations/
   │
   │ PR vers develop
   ▼
develop ──▶ DBA applique manuellement la migration sur naturegraph-dev
   │         (ou via mcp__supabase__apply_migration)
   │
   │ PR vers staging
   ▼
staging ──▶ aucune action (même DB que develop)
   │
   │ PR vers main
   ▼
main ──▶ DBA applique la migration sur naturegraph-prod, dans la même PR
         que celle qui livre le code dépendant
```

**Règle d'or** : une migration est appliquée **avant** que le code qui en dépend ne soit déployé. Sinon downtime garanti.

## Conventions de nommage migrations

```
supabase/migrations/YYYYMMDD_<scope>_<description>.sql
```

Exemples :
- `20260320_initial_schema.sql`
- `20260403_security_hardening.sql`
- `20260403_fix_reaction_types.sql`

Le timestamp donne l'ordre d'application. Une fois mergée dans `main`, **une migration est immuable** : tout correctif passe par une nouvelle migration.

## Secrets

- **Vercel** : variables d'env, accès limité aux owners
- **Supabase** : `service_role` jamais exporté hors des Edge Functions
- **GitHub Actions** : secrets injectés via `secrets.*`
- **Local** : `.env.local` gitignored, jamais commité (CI vérifie via gitleaks)

## Outils

| Outil | Usage |
|---|---|
| Vercel CLI | preview deploys, env vars |
| Supabase CLI | migrations, gen types, dump DB |
| GitHub CLI (`gh`) | PRs, releases |
| Sentry CLI | source maps upload |
