# Relations & cardinalités

## Diagramme ER (textuel)

```
auth.users (1) ─────── (1) profiles
                              │
                              │ (1)
            ┌─────────────────┼─────────────────────────────┐
            │                 │                             │
            │ (N)             │ (N)                         │ (N)
            ▼                 ▼                             ▼
          posts            notebooks                   follows
            │                 │                       (M:N self)
            │ (1)             │ (1)
            │                 │
   ┌────────┼────────┐        │ (N)
   │        │        │        ▼
   │ (N)    │ (N)    │ (N)  notebook_entries
   ▼        ▼        ▼        │
post_media reactions comments │ (N)
                              ▼
                            posts (réf optionnelle)
```

## Cardinalités résumées

| Relation                               | Type | ON DELETE | Note                                                         |
| -------------------------------------- | ---- | --------- | ------------------------------------------------------------ |
| `auth.users → profiles`                | 1:1  | CASCADE   | profil créé par trigger `handle_new_auth_user`               |
| `profiles → posts`                     | 1:N  | CASCADE   | suppression compte = suppression posts (sauf si soft delete) |
| `posts → post_media`                   | 1:N  | CASCADE   | media inutile sans son post                                  |
| `posts → reactions`                    | 1:N  | CASCADE   | PK composite `(post_id, user_id)`                            |
| `posts → comments`                     | 1:N  | CASCADE   | + auto-réf `comments → comments` (threads, profondeur ≤ 2)   |
| `posts → taxref`                       | N:1  | SET NULL  | espèce optionnelle, on garde le post si TAXREF supprimé      |
| `profiles → follows` (M:N)             | M:N  | CASCADE   | self-relation, `CHECK (follower <> followed)`                |
| `profiles → blocks` (M:N)              | M:N  | CASCADE   | self-relation symétrique                                     |
| `profiles → notebooks`                 | 1:N  | CASCADE   | un carnet appartient à un seul user                          |
| `notebooks → notebook_entries`         | 1:N  | CASCADE   | UNIQUE `(notebook_id, post_id)`                              |
| `profiles → notifications` (recipient) | 1:N  | CASCADE   |                                                              |
| `profiles → notifications` (actor)     | 1:N  | SET NULL  | si l'auteur de l'action supprime son compte                  |
| `profiles → reports` (reporter)        | 1:N  | SET NULL  | rapports anonymisés mais conservés                           |

## Stratégies de suppression : récap

| Cas                               | Comportement                                   | Impl                                                                                                          |
| --------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| User supprime un post             | hard delete (CASCADE media/reactions/comments) | `DELETE FROM posts`                                                                                           |
| User supprime son compte          | soft delete + anonymisation                    | `profiles.deleted_at`, username → `deleted_<id8>`, contenu détaché ou supprimé selon choix utilisateur (RGPD) |
| Admin supprime un user (sanction) | hard delete via fonction SECURITY DEFINER      | conserve un audit log                                                                                         |
| TAXREF mis à jour                 | UPSERT, jamais DELETE                          | les posts gardent `species_id` (FK SET NULL en filet)                                                         |

## Index : justification rapide

| Index                                                       | Requête cible             | Gain                                          |
| ----------------------------------------------------------- | ------------------------- | --------------------------------------------- |
| `idx_posts_published_at` (partial WHERE deleted_at IS NULL) | feed récent               | scan séquentiel évité, uniquement les vivants |
| `idx_posts_trending` (partial WHERE visibility='public')    | onglet « tendances »      | 100% des lignes balayées sont déjà candidates |
| `idx_posts_location_gist` (GiST)                            | « observations à 5 km »   | `ST_DWithin` < 10 ms sur 1M lignes            |
| `idx_profiles_username_trgm` (GIN trgm)                     | recherche `@user` partial | autocomplete instant                          |
| `idx_taxref_search_gin`                                     | autocomplete espèces      | tsvector → millisecondes sur 600k lignes      |
| `idx_notifications_unread` (partial WHERE read_at IS NULL)  | badge unread              | index minuscule, hot path                     |
| `idx_reports_pending` (partial WHERE status='pending')      | queue modération          | scan O(pending) au lieu de O(total)           |

> **DBA** : tous les `WHERE` partiels sont là pour garder les index petits et chauds en cache. Penser à `REINDEX CONCURRENTLY` une fois par trimestre en V1+.
