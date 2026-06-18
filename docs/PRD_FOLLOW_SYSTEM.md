# PRD : Follow System (compléments Phase 2)

> **Statut :** Draft Phase 2 : pas encore validé Nicolas.
> **Date :** 2026-05-15 (post V1.0.0).
> **Auteur :** Équipe produit Naturegraph.
> **Pré-requis :** V1 livrée (table `follows` + service + hooks + trigger compteurs déjà en prod).

---

## 1. Contexte

La V1 livre une **base fonctionnelle** du suivi : la table `follows`, le `followService` (`follow` / `unfollow` / `getFollowers` / `getFollowing` / `isFollowing`), les hooks React Query (`useFollow.ts`), la notification automatique d'un nouveau follow (migration `20260416_notify_on_follow.sql`), et le trigger DB qui maintient `profiles.followers_count` / `following_count`. Le bouton "Migrer" du `ProfileHeader` et l'onglet Communauté du profil sont câblés.

**Ce qui manque pour transformer cette base en vrai graphe social utile :**

- Pas de **feed "Pour mes migrations"** alimenté par les profils suivis (le feed actuel mélange tout).
- Pas de **suggestions** ("Qui suivre" en empty state du feed, après onboarding, ou en sidebar guest).
- Pas de **pagination keyset** sur les listes followers/following (cap à 50 en mémoire : fragile dès qu'un compte explose).
- **Blocks et follows ne se croisent pas** : un user bloqué peut encore apparaître dans `getFollowers`.
- Notification follow trop pauvre (pas de "X et 3 autres ont commencé à te suivre").

---

## 2. User stories

| #     | En tant que…                  | Je veux…                                                                  | Pour…                                                      |
| ----- | ----------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| US-01 | Utilisateur connecté          | Voir un feed dédié aux observations des migrateurs que je suis            | Filtrer le bruit du feed global et concentrer mes intérêts |
| US-02 | Nouvel utilisateur            | Recevoir des suggestions de profils à suivre dès la fin de l'onboarding   | Démarrer mon expérience avec du contenu pertinent          |
| US-03 | Owner d'un gros profil (>200) | Scroller mes followers sans charger toute la liste d'un coup              | Garder l'app fluide et économiser de la bande passante     |
| US-04 | Utilisateur ayant bloqué X    | Que X disparaisse de mes listes followers/following et inversement        | Préserver la cohérence "bloquer = ne plus voir" (RGPD, UX) |
| US-05 | Utilisateur populaire         | Recevoir une notification groupée quand plusieurs personnes me suivent /h | Ne pas être noyé sous les notifs individuelles             |

---

## 3. Périmètre

### In scope (Phase 2)

- Hook + service `useFollowedFeed` → posts publics des profils suivis, paginé.
- RPC + hook `getSuggestedUsers` (3 heuristiques : popular dans mes intérêts, mutuals, locaux).
- Refactor `getFollowers` / `getFollowing` → **cursor-based** (`created_at` desc, page size 20).
- Filtrage `blocks` côté listings : exclure les profils où je suis bloqué ou que j'ai bloqué.
- Groupement notifications follow (déjà partiellement en place : étendre la logique).

### Out of scope (Phase 3+)

- Notification "X t'a un-followed" (volontairement absent : anti-anxiété).
- Listes privées / amis proches (pas de besoin produit identifié).
- Import contacts (carnet d'adresses) : éthique platform.
- Recommandations algorithmiques avancées (graph-based, ML).

---

## 4. Modèle de données

La table `follows` existe : **pas de nouvelle table**. Compléments :

```sql
-- 1) Index pour pagination cursor-based sur followers/following
CREATE INDEX IF NOT EXISTS idx_follows_follower_created
  ON public.follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following_created
  ON public.follows (following_id, created_at DESC);

-- 2) RPC pour le feed des suivis (keyset pagination)
CREATE OR REPLACE FUNCTION public.get_followed_feed(
  p_cursor_published_at timestamptz DEFAULT NULL,
  p_cursor_id           uuid        DEFAULT NULL,
  p_limit               int         DEFAULT 20
) RETURNS SETOF posts AS $$
  SELECT p.*
  FROM   posts p
  JOIN   follows f ON f.following_id = p.user_id
  WHERE  f.follower_id = auth.uid()
    AND  p.visibility = 'public'
    AND  p.deleted_at IS NULL
    AND  NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id  AND b.blocked_id = auth.uid())
    )
    AND  (p_cursor_published_at IS NULL
       OR (p.published_at, p.id) < (p_cursor_published_at, p_cursor_id))
  ORDER BY p.published_at DESC, p.id DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public;

-- 3) RPC suggestions (3 heuristiques fusionnées, top 10)
CREATE OR REPLACE FUNCTION public.get_suggested_users(p_limit int DEFAULT 10)
RETURNS TABLE (profile_id uuid, score numeric, reason text) AS $$
  -- Implémentation détaillée Sprint : voir §6
  SELECT id, 1::numeric, 'popular'::text FROM profiles
  WHERE  id <> auth.uid()
    AND  is_internal = false
    AND  NOT EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = profiles.id)
    AND  NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = auth.uid() AND blocked_id = profiles.id) OR (blocker_id = profiles.id AND blocked_id = auth.uid()))
  ORDER BY followers_count DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public;
```

**RLS** : `follows` reste en l'état (insert restreint à `auth.uid() = follower_id`). Les RPC utilisent `SECURITY INVOKER` pour hériter des RLS sous-jacentes.

---

## 5. Étapes d'implémentation

| #    | Tâche                                                                                                                 | Estimation |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ---------- |
| T-01 | Migration SQL `YYYYMMDD_follows_phase2.sql` (2 index + 2 RPC)                                                         | 0,5 j      |
| T-02 | Regen `src/types/supabase.ts` + ajouter types `SuggestedUser` dans `src/types/database.ts`                            | 0,25 j     |
| T-03 | `followService.getFollowedFeed(cursor)` + adapter cursor pagination                                                   | 0,5 j      |
| T-04 | `useFollowedFeed` hook avec `useInfiniteQuery` + intégration dans `FeedFilterPanel` (nouveau filtre "Mes migrations") | 0,5 j      |
| T-05 | `followService.getSuggestedUsers()` + `useSuggestedUsers` hook                                                        | 0,5 j      |
| T-06 | Composant `<SuggestedUsersCard />` (empty state feed + sidebar guest + onboarding step 4)                             | 1 j        |
| T-07 | Refactor `getFollowers` / `getFollowing` → cursor + filtrage blocks (et propager dans `ProfileCommunity`)             | 1 j        |
| T-08 | Étendre `notify_on_follow` : groupement par heure (1 notif "X et N autres t'ont suivi.e")                             | 0,5 j      |
| T-09 | i18n FR/EN des nouveaux strings (~15 clés)                                                                            | 0,25 j     |
| T-10 | Tests unitaires services + hooks (vitest, 8-10 cas)                                                                   | 0,5 j      |

**Total estimé : ~5,5 jours dev.**

---

## 6. Tests à prévoir

### Unitaires (vitest)

- `getFollowedFeed` retourne 0 post quand l'user ne suit personne.
- `getFollowedFeed` exclut bien les posts d'utilisateurs bloqués (dans les deux sens).
- `getFollowedFeed` paginate correctement (cursor stable même si nouveau post inséré).
- `getSuggestedUsers` exclut soi-même, déjà-suivis, bloqués, `is_internal=true`.
- `getFollowers` / `getFollowing` respectent la pagination keyset.

### Intégration (Supabase local + Playwright)

- E2E : suivre un user → vérifier que son prochain post apparaît dans "Mes migrations".
- E2E : bloquer un follower → vérifier qu'il disparaît de mes listes ET que je disparais des siennes.
- Notification : 5 follows en 60 min → 1 notif groupée (pas 5 individuelles).

### Charge (post-V2, indicatif)

- `get_followed_feed` < 100 ms p95 sur user qui suit 500 profils, 100k posts en DB.

---

## 7. Risques & mitigations

| Risque                                                         | Probabilité | Impact | Mitigation                                                                                    |
| -------------------------------------------------------------- | ----------- | ------ | --------------------------------------------------------------------------------------------- |
| RPC `get_followed_feed` lent au-delà de 1k profils suivis      | Faible      | Moyen  | Index `idx_posts_published_at` + `idx_follows_follower` suffisent ; bench bench préalable.    |
| Suggestions trop pauvres en début de plateforme (peu de users) | Élevée      | Faible | Fallback "découvrir des migrateurs locaux" + tutoriel onboarding qui suit un compte officiel. |
| Filtrage blocks dans RPC fait sauter un index                  | Moyenne     | Moyen  | `EXPLAIN ANALYZE` avant merge ; index partiel si besoin.                                      |
| Notifications groupées difficiles à débugger                   | Moyenne     | Faible | Logger les buckets de groupement dans `notifications.payload->>'group_id'`.                   |
| Cursor pagination casse si schéma de tri change                | Faible      | Moyen  | Encapsuler la logique dans un helper unique `applyKeyset(cursor, query)`.                     |

---

## 8. Done when

- [ ] Migration SQL appliquée sur dev + staging + prod, `supabase gen types` à jour.
- [ ] Filtre "Mes migrations" visible dans le feed avec pagination infinie fluide.
- [ ] Empty state feed expose `<SuggestedUsersCard />` quand l'user ne suit personne.
- [ ] Listes followers/following supportent > 200 entrées sans dégradation perceptible (< 200 ms par page).
- [ ] Test : un user bloqué ne peut plus apparaître dans aucun listing ni dans le feed des suivis.
- [ ] Notif "X et N autres t'ont suivi.e" testée avec 5 follows simultanés.
- [ ] `npm run lint && npm run test && npm run build` au vert.

---

## Annexe : Décisions clés

**ADR-001 : Pas de nouvelle table.** La structure `(follower_id, followed_id)` actuelle est suffisante. On ajoute juste 2 RPC + 2 index pour les nouveaux cas d'usage.

**ADR-002 : Cursor pagination avec `(published_at, id)`.** Tri stable même en cas de plusieurs posts à la même seconde, et cohérent avec la pratique du feed global.

**ADR-003 : Suggestions = trois heuristiques fusionnées côté SQL.** Évite une dépendance ML/Edge Function. Le ranking peut évoluer sans changer le contrat front.

**ADR-004 : Pas de "X t'a un-followed".** Choix éthique produit : éviter l'anxiété sociale et l'engagement toxique.
