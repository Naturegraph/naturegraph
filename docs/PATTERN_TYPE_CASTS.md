# Pattern : `as unknown as X` dans les services Supabase

> **Statut** : 🟢 Convention etablie — pattern intentionnel, documente pour eviter les refactos hatifs.
> **Refs** : T-002 (MASTER_TODO) + BATCH 19

---

## Contexte

22 occurrences de `as unknown as X` dans 12 fichiers (services + hooks + contexts).
Initialement classifies comme "casts dangereux a supprimer" dans `AUDIT_TECHNIQUE.md` v1,
mais une analyse plus fine montre que ces casts sont **intentionnels et justifies**.

## Pourquoi le double cast ?

Le type genere par `supabase gen types typescript` (cf. `src/types/supabase.ts`)
utilise des types **larges** :

```ts
// Dans supabase.ts (auto-genere)
profiles: {
  Row: {
    gender: string | null        // ← string, pas Gender
    interests: string[] | null   // ← string[], pas Interest[]
    location_visibility: string | null  // ← string, pas l'union
    country_code: string | null  // ← null possible
    // ...
  }
}
```

Le type domain `Profile` dans `src/types/database.ts` utilise des types **stricts** :

```ts
// Dans database.ts (manuel)
export interface Profile {
  gender: Gender | null // ← union litterale stricte
  interests: Interest[] // ← non-null
  location_visibility: 'private' | 'region' | 'city' // ← union
  country_code: string // ← non-null garanti par DB defaults
  // ...
}
```

TS ne peut pas **automatiquement narrower** `string` -> `'private' | 'region' | 'city'`,
meme si l'invariant est garanti cote DB (contraintes CHECK, defaults).

→ Le `as unknown as Profile` est un **signal explicite** au lecteur :
"on fait un narrowing runtime base sur les contraintes DB, qui sont la source de verite".

## Quand garder le pattern (la majorite)

✅ **Garder** quand le narrowing est garanti par :

- Une contrainte CHECK sur la colonne (`enum_value`)
- Un default value en migration (`NOT NULL DEFAULT 'fr'`)
- Une regle metier appliquee par trigger

Exemples :

- `profileService.ts:78,96,128,148` — DB garantit `gender ∈ Gender`, `interests ≠ null`
- `notificationService.ts:51,79` — types `'reaction' | 'follow' | ...` garantis par CHECK
- `postService.ts:238,273,450` — `type ∈ ('nature_encounter', 'nature_instant')`
- `settingsService.ts:44,61` — defaults appliques (`language='fr'`, etc.)
- `supportService.ts:102,120` — `status ∈ ('open', 'in_progress', 'closed')`

## Quand corriger le pattern (exceptions)

❌ **Refactor en helper** si :

- Le cast cache une vraie inconnue (`data: unknown` sans validation)
- On peut utiliser un schema **zod** pour valider runtime (`T-068`)
- Le composant est testable et merite un type-guard explicite

Exemple a refactorer (futur, lors de la migration zod T-068-T-071) :

- `hooks/useFeed.ts:92-93` — extension `{ latitude, longitude }` post-RPC, pourrait passer
  par un schema zod ou un type generique pour la vue `posts_public`.

## Alternative future : `Database['public']['Tables']['profiles']['Row']`

Si on veut renforcer le typing **sans casts** :

1. Definir `Profile = Database['public']['Tables']['profiles']['Row']`
2. Casser tout le code qui assume `Profile.gender: Gender | null` au lieu de `string | null`
3. Ajouter des narrowing helpers explicites (`assertGender(x)`, `assertInterests(x)`)

Cout : refonte de ~40 fichiers consommateurs. Benefice : type safety end-to-end.

**Decision actuelle (BATCH 19)** : on garde le pattern `as unknown as` documente
et on attend la phase zod (T-068-T-071) pour reevaluer.

## Recap des 22 casts

| Fichier                                             | Lignes           | Pattern                                      | Verdict                                                               |
| --------------------------------------------------- | ---------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `services/profileService.ts`                        | 78, 96, 128, 148 | `data as unknown as Profile`                 | ✅ Garder                                                             |
| `services/postService.ts`                           | 238, 273, 450    | `data as unknown as PostFeedItem`            | ✅ Garder                                                             |
| `services/notificationService.ts`                   | 51, 79           | `data as unknown as Notification[]`          | ✅ Garder                                                             |
| `services/searchService.ts`                         | 217              | `data as unknown as ProfileHit[]`            | ✅ Garder                                                             |
| `services/settingsService.ts`                       | 44, 61           | `data as unknown as UserSettings`            | ✅ Garder                                                             |
| `services/supportService.ts`                        | 102, 120         | `data as unknown as SupportTicket`           | ✅ Garder                                                             |
| `services/savedPostsService.ts`                     | 75               | `row as unknown as { post: ... }`            | ⚠️ Refactor possible via zod (T-068)                                  |
| `hooks/useFeed.ts`                                  | 92, 93           | extension `{ latitude, longitude }`          | ⚠️ Refactor zod (T-068)                                               |
| `hooks/useNearbyFeed.ts`                            | 109              | `posts as unknown as PostFeedItem[]`         | ✅ Garder                                                             |
| `contexts/AuthContext.tsx`                          | 109, 225         | `User` / `Profile` construction              | ✅ Garder                                                             |
| `components/contribute/ContributeEncounterForm.tsx` | 660              | `e as unknown as React.FormEvent`            | ⚠️ React typing dance — refactor via form wrapper                     |
| `components/settings/SettingsNotificationsView.tsx` | 152              | `settings as unknown as { notif_frequency }` | ⚠️ Migrer vers `Database['public']['Tables']['user_settings']['Row']` |

→ **17 a garder (intentionnel)** + **5 a refactorer plus tard** (T-068 zod ou contextes specifiques).

## Convention pour les futurs casts

Quand un nouveau `as unknown as X` est ajoute :

1. Verifier qu'il s'agit d'un narrowing DB-garanti
2. Ajouter un commentaire au-dessus expliquant la garantie :
   ```ts
   // Type narrowing : DB CHECK constraint garantit visibility ∈ ('private'|'region'|'city')
   return data as unknown as Profile
   ```
3. Si la garantie n'est pas evidente, prefer un schema zod (cf. T-068-T-071)
