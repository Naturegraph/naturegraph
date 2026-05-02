# 01 — Setup mock data profil + audit composants existants

**Statut :** 🟡 TEMP (mock à retirer quand backend câblé)
**Date création :** 2026-05-01
**Auteur :** agent front-end (Safe Local Mode)
**Figma nodes :** 6385:74429 (visiteur desktop), 6385:70500 (visiteur mobile), 6385:71694 (visiteur mobile + onglet À propos)

## 🎯 Contexte

> _« Mode mock pendant le dev — oui full test, aucune vrai donne pour le moment mais préparer les notes backend pour le suivi »_ (Nicolas, 2026-05-01)

Le quota Supabase Free Plan est à 101 % d'egress. On bascule en **mode mock 100 %** pour itérer sur la refonte UI sans toucher à la DB. Toutes les vraies données seront branchées en Phase 2 (backend wiring).

## 🤔 Décisions

### Mode mock activable via flag env

- Variable `VITE_USE_PROFILE_MOCK=true` → bypass complet des hooks Supabase profil
- Si `false` ou absent → comportement normal (Supabase via `useProfile` / `useProfileByUsername`)
- En dev, on met `VITE_USE_PROFILE_MOCK=true` dans `.env.local`
- Pour staging / prod : variable absente → backend réel utilisé

### Tabs desktop vs mobile

> _« Onglet "À propos" — oui en desktop uniquement regarde les écrans »_ (Nicolas, 2026-05-01)

- **Desktop** : 4 tabs (Journal nature / Inspirations / Communauté / Statistiques `Bientôt`).
  Les cards "À propos" + "ADN observateur" sont visibles **en grid 2 cols** au-dessus des tabs.
- **Mobile** : 5 tabs incluant "À propos" en premier (tab par défaut).
  Les cards À propos + ADN sont rendues **dans le tab "À propos"** (économie d'espace verticale).

## 🔧 Modifications

### `src/data/mock/profileMock.ts` — **nouveau fichier**

Exports :

- `PROFILE_MOCK_VISITOR: ProfileDisplayData` — Oiseaux_et_Nature avec banner, bio complète, ADN 50/35/10, 1078 migrateurs, 88 migrations
- `PROFILE_MOCK_POSTS: MockPost[]` — 3 posts (chevreuil, sommet enneigé, martin-pêcheur)
- `PROFILE_MOCK_INSPIRATIONS: string[]` — 6 URLs photos Unsplash CC0
- `PROFILE_MOCK_FOLLOWERS` — 3 comptes fictifs (Marie_Nature, Thomas.Wildlife, Lila_PetitsBoisFrais)

Structure 1:1 alignée avec `ProfileDisplayData` du composant `ProfileHeader`. Le code de la page `Profile.tsx` n'a pas besoin de connaître l'origine (mock vs DB) — pattern de remplacement transparent.

### `src/pages/Profile.tsx` — branchement conditionnel

À venir dans la prochaine itération : ajouter un `if (USE_PROFILE_MOCK) return PROFILE_MOCK_VISITOR` au début de la sélection de profileData. Permet de voir le rendu complet sans Supabase.

## ✅ Validation Nicolas

> _« oui full test, aucune vrai donne pour le moment »_ (2026-05-01)
> _« Onglet "À propos" — oui en desktop uniquement »_ (2026-05-01)

→ Mock validé. Tab "À propos" supprimé sur desktop / conservé sur mobile.

## 🔁 TODO côté backend (à brancher en Phase 2)

### Compteurs profil

- `profiles.posts_count` (denormalisé) ✅ existe
- `profiles.followers_count` ✅ existe (`migrators_count` côté UI)
- `profiles.following_count` ✅ existe (`migrations_count` côté UI)
- **MANQUE** : count espèces uniques observées
  → SQL : `SELECT COUNT(DISTINCT taxref_id) FROM posts WHERE user_id = $1 AND species_identified = true`
  → soit colonne denormalisée `species_count` + trigger sur `posts`, soit RPC dédiée

### ADN observateur (% par catégorie taxonomique)

**Pas encore implémenté côté DB**. Spec :

```sql
CREATE OR REPLACE FUNCTION get_observer_dna(p_user_id uuid)
RETURNS TABLE(taxonomic_group text, percent integer) AS $$
  WITH cat AS (
    SELECT taxonomic_group, COUNT(*)::float AS n
    FROM posts
    WHERE user_id = p_user_id AND taxonomic_group IS NOT NULL
    GROUP BY taxonomic_group
  ),
  total AS (SELECT SUM(n) AS t FROM cat)
  SELECT
    cat.taxonomic_group,
    ROUND((cat.n / NULLIF(total.t, 0) * 100))::int AS percent
  FROM cat, total
  ORDER BY cat.n DESC
  LIMIT 5;
$$ LANGUAGE sql STABLE;
```

- Cache React Query 1h (les % bougent peu intra-session)
- Hook `useObserverDNA(userId)` à créer
- Affichage : top 3 catégories sur la card

### Streak (jours consécutifs avec contribution)

- Vérifier si `useUserStreak` (utilisé dans HomeNavbar) calcule bien côté DB ou retourne 0
- Sinon : RPC `get_user_streak(user_id)` qui retourne le nombre de jours consécutifs jusqu'à aujourd'hui où l'utilisateur a au moins 1 post

### Posts du profil (tab "Journal nature")

- Hook `useUserPosts(userId, page, limit)` à créer (pas encore présent)
- Wrap `postService.getPosts()` avec filtre `user_id = $1`
- Pagination 20 par page
- Cache React Query 5 min

### Inspirations (tab "Inspirations")

- Hook `useSavedPostsPage(page, limit)` ✅ existe déjà (cycle précédent)
- Doit retourner les `PostFeedItem` complets (avec media)

### Communauté (tab "Communauté")

- 2 sections : Migrateurs (followers) + Migrations (following)
- Hook `useUserFollowers(userId)` + `useUserFollowing(userId)` à créer
- Wrap services existants `followService.ts`

### Mode mock — comment retirer

1. Vider/supprimer `src/data/mock/profileMock.ts`
2. Retirer la variable `VITE_USE_PROFILE_MOCK` de `.env.local`
3. Retirer le `if (USE_PROFILE_MOCK)` dans `Profile.tsx`

## 📂 Fichiers touchés

- `second-agent/README.md` — index reset cycle Profil
- `src/data/mock/profileMock.ts` — **nouveau** (mock complet visiteur)
- `src/pages/Profile.tsx` — branchement conditionnel (à faire prochaine itération)
