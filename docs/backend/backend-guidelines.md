# Backend Guidelines — Naturegraph

> Document maître pour tout développeur (interne ou externe) qui touche au backend Supabase. À lire avant toute modification.

## 1. Règles d'or (non négociables)

1. **RLS partout** — toute nouvelle table doit avoir `ENABLE ROW LEVEL SECURITY` + au moins une policy explicite **dans la même migration**.
2. **Migrations forward-only** — jamais de modification rétroactive d'une migration mergée. Tout correctif = nouvelle migration.
3. **Types TS générés, pas écrits à la main** — `npx supabase gen types typescript > src/types/supabase.ts` après chaque migration. Ne jamais éditer ce fichier manuellement.
4. **Pas de `service_role` côté client** — jamais. Si tu en as besoin, c'est qu'il faut une Edge Function.
5. **Pas de `COUNT(*)` côté frontend** — toujours passer par les compteurs dénormalisés (`*_count`).
6. **Pagination obligatoire** — limit max 20 par requête. Pas de scroll infini sans cursor.
7. **`SET search_path = public`** sur toute fonction `SECURITY DEFINER`. Sinon Supabase Advisor warning = bloquant.
8. **EXIF strippé** avant tout upload média.
9. **Soft delete pour le contenu utilisateur** quand l'option « anonymiser » est choisie.
10. **CHECK constraint > validation client seule**. Le frontend valide pour l'UX, le backend valide pour la sécurité.

## 2. Conventions de nommage

| Type      | Convention                    | Exemple                                             |
| --------- | ----------------------------- | --------------------------------------------------- |
| Table     | `snake_case`, pluriel         | `post_media`, `notebook_entries`                    |
| Colonne   | `snake_case`, singulier       | `author_id`, `published_at`                         |
| FK        | `<entité>_id`                 | `post_id`, `user_id`                                |
| Index     | `idx_<table>_<col>[_<type>]`  | `idx_posts_published_at`, `idx_posts_location_gist` |
| Trigger   | `trg_<table>_<action>`        | `trg_posts_counters`                                |
| Function  | `verbe_objet`                 | `update_post_counters`, `can_see_post`              |
| Migration | `YYYYMMDD_<scope>_<desc>.sql` | `20260403_security_hardening.sql`                   |
| Policy    | `<table>_<action>`            | `posts_select`, `profiles_update`                   |

## 3. Workflow modification de schéma

```
1. Créer migration SQL : supabase/migrations/YYYYMMDD_<desc>.sql
2. Tester localement (ou sur naturegraph-dev via mcp__supabase__apply_migration)
3. Régénérer types : npx supabase gen types ...
4. Mettre à jour DATA_ARCHITECTURE.md si schéma logique change
5. Ajouter/adapter les RLS policies
6. Tester les policies avec 2 sessions (user A, user B, anon)
7. Vérifier Supabase Advisors (sécurité + perf) → 0 warning
8. Commit : feat(db): ...
9. PR vers develop
```

## 4. Patterns recommandés

### Service → Hook → Composant

```
src/services/<entity>Service.ts   ← appelle supabase.from(...)
        │
        ▼
src/hooks/use<Entity>.ts          ← React Query wrapper
        │
        ▼
src/components/...                ← consume le hook
```

Aucun composant ne doit appeler `supabase` directement. Toujours passer par un service + hook.

### Mutations optimistes

```ts
useMutation({
  mutationFn: ...,
  onMutate: async (vars) => {
    await queryClient.cancelQueries({ queryKey })
    const prev = queryClient.getQueryData(queryKey)
    queryClient.setQueryData(queryKey, (old) => /* update local */)
    return { prev }
  },
  onError: (_err, _vars, ctx) => {
    if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev)
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey }),
})
```

→ Donne une UX instant tout en restant cohérent avec le serveur.

### Gestion des erreurs

```ts
const { error, data } = await supabase.from('posts').select(...)
if (error) {
  // PGRST116 = no rows → souvent NORMAL, traiter comme null
  if (error.code === 'PGRST116') return null
  throw new SupabaseError(error)
}
return data
```

Toujours wrapper avec un type d'erreur custom pour Sentry.

## 5. Anti-patterns interdits

| ❌                                                                 | ✅                                            |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `supabase.from('profiles').delete().eq('id', user.id)` côté client | Edge Function `delete-account`                |
| `COUNT(*)` à chaque rendu                                          | Compteurs `*_count` mis à jour par triggers   |
| `WHERE LOWER(username) = $1`                                       | `username` en `CITEXT`, comparaison directe   |
| Stocker un fichier en colonne `bytea`                              | Toujours Supabase Storage                     |
| `// @ts-ignore` sur une requête supabase                           | Régénérer les types                           |
| Bypass RLS avec service_role pour « simplifier »                   | Écrire une fonction `SECURITY DEFINER` ciblée |
| Injection SQL via template strings                                 | Toujours `.eq()`, `.in()`, paramétré          |
| Exposer `auth.users` directement                                   | Toujours passer par `profiles`                |

## 6. Performance — réflexes

- **Avant d'ajouter une requête** : peut-elle être servie par les compteurs dénormalisés ?
- **Avant d'ajouter un index** : `EXPLAIN ANALYZE` la requête réelle, vérifier que l'index est utilisé.
- **Avant d'ajouter une vue matérialisée** : essayer d'abord un index partial.
- **Pour la géo** : toujours `ST_DWithin` (utilise GiST), jamais `ST_Distance() < x`.
- **Pour les listes** : keyset pagination `(published_at, id)` plutôt que `OFFSET`.

## 7. Sécurité — check-list par PR

- [ ] Toute nouvelle table a RLS activée
- [ ] Chaque opération (SELECT, INSERT, UPDATE, DELETE) a sa policy
- [ ] Aucune fonction `SECURITY DEFINER` sans `SET search_path`
- [ ] Aucune `service_role key` exposée
- [ ] Aucune URL de Storage privée loggée
- [ ] Pas de PII dans les logs Sentry
- [ ] Validation côté serveur (CHECK ou trigger) en plus de la validation client
- [ ] Supabase Advisors : 0 warning sécurité

## 8. Documentation — chaque modification doit mettre à jour

| Fichier                            | Quand                             |
| ---------------------------------- | --------------------------------- |
| `supabase/migrations/*.sql`        | Toujours (nouvelle migration)     |
| `src/types/supabase.ts`            | Toujours (gen types)              |
| `docs/backend/schema.sql`          | Si schéma logique change          |
| `docs/backend/relations.md`        | Si nouvelles FK / cardinalités    |
| `docs/security/rls-policies.md`    | Si nouvelles policies             |
| `docs/api-connection/endpoints.md` | Si nouveaux services / hooks      |
| `CLAUDE.md`                        | Si nouvelles règles transversales |

## 9. Process de revue (table ronde)

Tout changement non trivial doit être validé par 3 perspectives :

- **Database Architect** : modèle, intégrité, performance long terme
- **Backend Developer** : API, types, ergonomie côté front
- **DevOps** : reproductibilité, monitoring, sécurité opérationnelle

→ Si l'un des 3 n'est pas convaincu, on retravaille la proposition.

## 10. Ressources

- Schéma canonique : [`docs/backend/schema.sql`](../backend/schema.sql)
- Architecture détaillée : [`docs/backend/database-architecture.md`](../backend/database-architecture.md)
- Setup client : [`docs/api-connection/supabase-setup.md`](../api-connection/supabase-setup.md)
- RLS : [`docs/security/rls-policies.md`](../security/rls-policies.md)
- RGPD : [`docs/security/data-protection.md`](../security/data-protection.md)
- Médias : [`docs/security/media-security.md`](../security/media-security.md)
- Environnements : [`docs/devops/environments.md`](../devops/environments.md)
- Déploiement : [`docs/devops/deployment.md`](../devops/deployment.md)
- Monitoring : [`docs/devops/monitoring.md`](../devops/monitoring.md)
- Référence externe : [Supabase Docs](https://supabase.com/docs), [PostGIS Docs](https://postgis.net/docs/)
