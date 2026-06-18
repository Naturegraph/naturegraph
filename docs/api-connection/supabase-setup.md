# Supabase : Setup & connexion client

## Projets

| Env      | Project ref                                | Usage                                 | URL                                      |
| -------- | ------------------------------------------ | ------------------------------------- | ---------------------------------------- |
| **dev**  | `naturegraph-dev` (`hrxgduvworofnrjmgpcj`) | local + branche `develop` + `staging` | https://hrxgduvworofnrjmgpcj.supabase.co |
| **prod** | `naturegraph-prod`                         | branche `main` uniquement             | (à provisionner)                         |

> Phase MVP : 1 seul projet partagé `dev`. Promotion vers `prod` quand on lance la beta publique.

## Variables d'environnement

```ini
# .env.local (jamais commité)
VITE_SUPABASE_URL=https://hrxgduvworofnrjmgpcj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx   # publishable key (anon)
```

**Règles** :

- Préfixe `VITE_` obligatoire (sinon Vite ne l'expose pas au client).
- **Jamais** de `service_role` côté client. Ces clés vivent uniquement dans les Edge Functions et les jobs serveur.
- Le frontend ne doit jamais bypasser RLS. Toute la sécurité repose dessus.

## Client TypeScript

`src/lib/supabase.ts` :

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase' // généré par supabase gen types

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'naturegraph-auth',
      },
      global: { headers: { 'x-application-name': 'naturegraph-web' } },
    })
  : null
```

**Pourquoi le `null` fallback** : Le projet supporte un **mode démo** sans backend (mocks). Les hooks (`useFeed`, `useProfile`...) court-circuitent les requêtes quand `isSupabaseConfigured === false`. Cela permet de :

- Faire tourner le front sans creds (onboarding contributeurs / preview Vercel public).
- Garder les Storybook / snapshots déterministes.

## Génération des types

```bash
npx supabase gen types typescript \
  --project-id hrxgduvworofnrjmgpcj \
  > src/types/supabase.ts
```

À refaire **après chaque migration de schéma**. La CI vérifiera (cf. `devops/deployment.md`) que `git diff` sur ce fichier est vide après regénération.

## Connexion vérifiée

Smoke test inclus dans `docs/api-connection/endpoints.md` (section « Smoke test »).

## MCP server (dev workflow)

Un serveur MCP Supabase est configuré dans `.mcp.json` pour permettre à Claude d'appliquer migrations / lire logs / générer types directement. Scope : `project`. Voir `.mcp.json`.
