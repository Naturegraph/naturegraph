# Endpoints — services & hooks React Query

> Naturegraph n'expose pas d'API REST custom : on utilise directement le client `supabase-js`. Les fichiers `src/services/*.ts` encapsulent les requêtes ; les hooks `src/hooks/use*.ts` les binden à React Query.

## Convention

- **service** = fonction pure `(args) => Promise<T>` qui parle à Supabase.
- **hook** = wrapper React Query (`useQuery` / `useMutation`) avec invalidation cache.
- Tous les services lèvent en cas d'erreur PostgREST autre que `PGRST116` (not found → `null`).

## Services

### `profileService.ts`

| Fonction | Méthode SQL | Notes |
|---|---|---|
| `getProfileById(userId)` | `SELECT * FROM profiles WHERE id = $1` | retourne `null` si introuvable |
| `getProfileByUsername(username)` | `SELECT * FROM profiles WHERE username = $1` | CITEXT, case-insensitive |
| `updateProfile(userId, payload)` | `UPDATE profiles SET … WHERE id = $1` | RLS : user ne peut modifier que son propre profil |
| `followUser(targetId)` | `INSERT INTO follows` | trigger met à jour les compteurs |
| `unfollowUser(targetId)` | `DELETE FROM follows` | idem |

### `postService.ts`

| Fonction | Notes |
|---|---|
| `getFeed({ tab, page, limit })` | tab ∈ `recent\|popular\|trending`. Tri : `published_at DESC` / `likes_count DESC`. Limite max 20. |
| `getPostById(postId)` | join avec `profiles` (author) et `post_media`. |
| `createPost(userId, payload)` | insert simple. L'upload média se fait *avant* via `mediaService`. |
| `toggleReaction(postId, userId, type)` | upsert sur `(post_id, user_id)`. Retourne `{ added: boolean }`. |
| `deletePost(postId)` | RLS : seul l'auteur peut supprimer. |

**Constante centrale `POST_FEED_SELECT`** :
```ts
const POST_FEED_SELECT = `
  *,
  author:profiles!posts_author_id_fkey (
    id, username, display_name, avatar_url, is_verified
  ),
  media:post_media (
    id, storage_path, mime_type, width, height, alt_text, position, copyright_notice, license
  ),
  species:taxref (cd_nom, nom_complet, nom_vern, group2_inpn)
`
```

### `mediaService.ts` (Sprint 3)

| Fonction | Notes |
|---|---|
| `uploadPostMedia(file, postId)` | upload vers bucket `post-media/{userId}/{postId}/{uuid}.webp`, retourne `storage_path` |
| `uploadAvatar(file)` | bucket `avatars/{userId}/avatar.webp`, écrase l'existant |
| `deleteMedia(storagePath)` | suppression bucket + ligne `post_media` |

## Hooks React Query

### Cache keys (centralisées par hook)

```ts
// hooks/useFeed.ts
export const FEED_QUERY_KEY = (params) =>
  ['feed', params.tab ?? 'recent', params.page ?? 1, params.limit ?? 20] as const

// hooks/useProfile.ts
export const profileQueryKey = {
  byId:       (userId)   => ['profile', 'id', userId] as const,
  byUsername: (username) => ['profile', 'username', username] as const,
}

// hooks/usePost.ts
export const postQueryKey = {
  byId: (postId) => ['post', postId] as const,
}
```

**Règle d'invalidation** :
- `useUpdateProfile` → `setQueryData` direct sur les 2 clés (id + username) sans refetch.
- `useCreatePost` → `invalidateQueries({ queryKey: ['feed'] })` (toutes les pages).
- `useToggleReaction` → mutation **optimiste** avec rollback. La query du feed est `setQueryData` pour incrémenter `likes_count`, puis `invalidateQueries` au `onSettled`.

### `staleTime` recommandés

| Donnée | staleTime | Raison |
|---|---|---|
| Feed | 2 min | bouge souvent mais pas en temps réel |
| Profile | 5 min | change rarement |
| Post détail | 5 min | idem |
| Notifications (Realtime) | `Infinity` | mises à jour push only |
| Taxref autocomplete | 1 jour | référentiel quasi-statique |

## Smoke test connexion

```ts
const { data, error } = await supabase.from('profiles').select('count').limit(1)
console.assert(!error, 'Supabase unreachable', error)
```

Ce test est exécuté au démarrage du dev server en mode `import.meta.env.DEV` et logue un warning si la connexion échoue.

## Realtime — notifications

```ts
supabase
  .channel(`notif:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
  })
  .subscribe()
```

**Coût** : 1 channel par user connecté. Supabase Free plan = 200 connexions concurrentes simultanées. En V1, passer en plan Pro (500) ou multiplexer via un channel global filtré côté client.
