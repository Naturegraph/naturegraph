# Deployment

## Pipeline cible

```
Push branche ──▶ GitHub Actions ──▶ Vercel
                      │
                      ├─ Lint (eslint)
                      ├─ Typecheck (tsc --noEmit)
                      ├─ Tests unit (vitest)
                      ├─ Build (vite build)
                      ├─ Bundle size check (< 300KB JS gzip)
                      ├─ Lighthouse CI (perf > 90, a11y > 95)
                      ├─ Type check Supabase (gen types diff == empty)
                      └─ gitleaks (secrets scan)
```

Si tous les checks passent → Vercel déploie automatiquement (preview pour PR, prod pour `main`).

## GitHub Actions : workflow minimal

`.github/workflows/ci.yml` :

```yaml
name: CI
on:
  push:
    branches: [main, staging, develop]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --run
      - run: npm run build
      - name: Bundle size
        run: node scripts/check-bundle-size.mjs
      - name: Supabase types diff
        env:
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
        run: |
          npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > /tmp/types.ts
          diff /tmp/types.ts src/types/supabase.ts
      - uses: gitleaks/gitleaks-action@v2
```

## Vercel : config

`vercel.json` :

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "geolocation=(self), camera=(), microphone=()" },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.vercel-insights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co https://*.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.taxref.fr; font-src 'self' data:"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

## Procédure de release

### Hotfix (urgence prod)

```
git checkout main
git checkout -b hotfix/<scope>
# fix
git commit -m "fix: …"
gh pr create --base main
# review + merge
# remonter dans staging puis develop
git checkout staging && git merge main && git push
git checkout develop && git merge staging && git push
```

### Release régulière

```
develop ──merge──▶ staging   (PR, tests beta)
staging ──merge──▶ main      (PR, smoke test prod)
```

Aucune branche feature ne mergeable directement dans `main` ou `staging`. Une PR vers `main` doit venir de `staging` exclusivement.

## Rollback

- **Code** : Vercel garde les déploiements précédents → 1 clic « Promote to production ».
- **DB** : pas de rollback automatique. Toute migration doit être pensée comme **forward-only**. Pour casser une feature : déployer le code précédent + migration corrective (`UPDATE`/`ALTER`).

> **DBA** : c'est pourquoi on n'écrit _jamais_ de migration destructive (DROP COLUMN, DROP TABLE) sans une fenêtre de maintenance et une sauvegarde manuelle confirmée.

## Sauvegardes

| Quoi           | Fréquence                          | Rétention                      | Outil                               |
| -------------- | ---------------------------------- | ------------------------------ | ----------------------------------- |
| DB Postgres    | quotidien (Supabase auto)          | 7 jours (Free), 30 jours (Pro) | Supabase Backups                    |
| Storage        | quotidien (manuel snapshot bucket) | 30 jours                       | script `scripts/backup-storage.mjs` |
| Migrations SQL | versionné dans git                 | infini                         | git                                 |
| Secrets Vercel | export manuel chiffré              | rotation 90 jours              | 1Password                           |
