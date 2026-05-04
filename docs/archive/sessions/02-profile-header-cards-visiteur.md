# 02 — Profile visiteur : refonte complète conforme Figma

**Statut :** 🟢 Validé visuellement
**Date création :** 2026-05-01
**Auteur :** agent front-end (Safe Local Mode)
**Figma nodes :**

- Desktop : 6385:74429
- Mobile (Journal nature) : 6385:70500
- Mobile (À propos) : 6385:71694
- Header info : 6385:74441
- Card À propos : 6385:74458
- Card ADN : 6385:74480
- Tabs : 6385:74515
- Récent/Populaire : 6385:74536

## 🎯 Contexte

Refonte complète du profil visiteur conforme Figma desktop + mobile. 13 itérations rapides avec Nicolas pour ajuster tous les détails (icônes, couleurs, tailles, layout).

## 🔧 Modifications

### Composants nouveaux

- `src/components/profile/ProfileAboutCard.tsx` — extraction tab "À propos" en card
- `src/components/profile/ProfileDNACard.tsx` — barres % par catégorie taxonomique
- `src/components/profile/ProfileOptionsMenu.tsx` — menu 3-points avec actions
  (Copier le lien / Bloquer / Signaler / Modifier le profil pour owner)

### Composants refactorés

- `src/components/profile/ProfileHeader.tsx` — layout responsive horizontal/vertical
- `src/components/profile/ProfileTabs.tsx` — tab "À propos" mobileOnly + nouveaux styles
- `src/components/profile/tabs/ProfileFeed.tsx` — segmented switch Récent/Populaire + grid 2 cols
- `src/components/home/FeedPost.tsx` — chips catégorie + espèce TOUJOURS séparés (jamais combinés)
- `src/components/home/SharePopover.tsx` — accepte `shareUrl` générique (pas que `postId`)
- `src/pages/Profile.tsx` — branchement mock + grid [1fr_320px] desktop

### Bug critique résolu

- `src/styles/base/_typography.scss` — règles `body h1/h2` forcées hors layer écrasaient
  les utilitaires Tailwind. Wrappées dans `@layer base` + `:where()` pour spécificité 0.
  → Sans ce fix, `text-2xl`, `text-base` etc. n'avaient AUCUN effet sur les `<h1>` et `<h2>`.

### Mock data

- `src/data/mock/profileMock.ts` — profil visiteur Oiseaux_et_Nature complet
  (bio, ADN 50/35/10, 1078 migrateurs, 88 migrations, 3 posts, 6 inspirations)

### Lien d'accès

- `src/components/home/ProfileMenu.tsx` — item "Mon profil" passé de `disabled` à actif
  avec `navigate('/profile')` au clic

## 🎨 Tokens DS respectés

| Token Figma                   | Valeur                   | Tailwind                               |
| ----------------------------- | ------------------------ | -------------------------------------- |
| Title/H3                      | 32px Quicksand Bold      | `text-[2rem] font-title font-bold`     |
| Title/H4                      | 24px Quicksand Bold      | `text-2xl`                             |
| Title/H5                      | 18px Quicksand Bold      | `text-lg`                              |
| Paragraph/Base Bold           | 16px Muli Bold           | `text-base font-body font-bold`        |
| Paragraph/Small               | 14px Muli                | `text-sm`                              |
| Radius/M                      | 12px                     | `rounded-md`                           |
| Radius/Full                   | 999px                    | `rounded-full`                         |
| Stroke/XS                     | 0.5px                    | `border-[0.5px]`                       |
| Stroke/L                      | 4px                      | `border-4`                             |
| Grid/sp-4..48                 | 4-48px                   | `gap-1` à `gap-12`                     |
| Background/Highlight/Primary  | `#006666` teal           | `bg-[var(--color-highlight-primary)]`  |
| Background/Highlight/Tertiary | `#33B6B6` teal-light     | `bg-[var(--color-highlight-tertiary)]` |
| Background/Neutral/Tertiary   | `#FFF4E0` cream-tertiary | `bg-warm-beige`                        |
| Content/Action/Default        | `#5F5DD8` primary        | `bg-primary` / `text-primary`          |
| Content/Action/Light          | `#E7E9F7`                | `bg-primary-light`                     |

## 📐 Layout responsive

### Desktop (md+)

- Banner 224px tall, rounded-md, 24px padding around
- Avatar 128px à gauche (px-12 = 48px), overlap 56px sur banner
- Username + stats à gauche, boutons à droite (Migrer/Share/Options)
- Cards À propos + ADN en `grid-cols-[1fr_320px]` (ADN fixe 320px, About flex)
- Tabs : 4 onglets (Journal nature / Inspirations / Communauté / Statistiques Bientôt)
  Pas de tab "À propos" sur desktop (les cards le remplacent)
- Posts : `grid-cols-2` 2 colonnes

### Mobile (< md)

- Banner 176px tall, même style
- Avatar 96px centré
- Username + stats + boutons centrés en colonne
- Tabs : 5 onglets (À propos en premier)
- Tab "À propos" affiche les 2 cards en stack vertical
- Posts : 1 colonne

## 🚦 Comportements

- Tab actif par défaut : **Journal nature** (règle UX Nicolas — c'est le contenu principal attendu)
- Tab "Statistiques" : disabled, cursor-not-allowed, opacity-60, badge "Bientôt"
- Bouton "Migrer" : 2 états (suit / ne suit pas) avec couleurs swap
- SharePopover : ouvert au clic sur l'icône share, URL `/profile/{username}`
- ProfileMenu "Mon profil" : navigation vers `/profile` (own profile)

## ✅ Validation Nicolas

15+ itérations courtes avec retours visuels précis. Tous les détails ont été
ajustés (icône TreeDeciduous, séparateur ligne verticale, badge couleurs,
arrondis, espacements, ordre des éléments).

> _« on doit être conforme »_ (Nicolas, 2026-05-01)

→ Statut 🟢 — toutes les retouches appliquées, validation visuelle effectuée
au pixel près à chaque étape.

## 🔁 TODO côté backend (Phase 2 — quand mock désactivé)

### Colonnes DB à ajouter

- `posts.individuals_count INTEGER` — nombre exact d'individus observés
  pour cette contribution. Utilisé par le chip espèce du FeedPost qui affiche
  "(N)" au lieu de "(plusieurs)" (règle Nicolas 2026-05-01).
  Migration suggérée :
  ```sql
  ALTER TABLE posts ADD COLUMN individuals_count INTEGER DEFAULT 1;
  -- Pour les posts existants avec multiple_observations=true sans count :
  UPDATE posts SET individuals_count = NULL WHERE multiple_observations = true;
  ```

### RPC Supabase à créer

- `get_observer_dna(user_id)` — calcul des % par catégorie taxonomique
  ```sql
  CREATE FUNCTION get_observer_dna(p_user_id uuid)
  RETURNS TABLE(taxonomic_group text, percent integer) AS $$
    WITH cat AS (
      SELECT taxonomic_group, COUNT(*)::float AS n
      FROM posts WHERE user_id = p_user_id AND taxonomic_group IS NOT NULL
      GROUP BY taxonomic_group
    ),
    total AS (SELECT SUM(n) AS t FROM cat)
    SELECT cat.taxonomic_group, ROUND((cat.n / NULLIF(total.t, 0) * 100))::int AS percent
    FROM cat, total
    ORDER BY cat.n DESC LIMIT 5;
  $$ LANGUAGE sql STABLE;
  ```
- `get_user_streak(user_id)` — jours consécutifs avec contribution

### Hooks React Query à créer

- `useObserverDNA(userId)` — wrap RPC, cache 1h
- `useUserPosts(userId, page, limit)` — wrap `postService.getPosts({ user_id })`
- `useUserFollowers(userId)` / `useUserFollowing(userId)` — pour tab Communauté

### Mode mock — comment retirer

1. Retirer la ligne `VITE_USE_PROFILE_MOCK=true` dans `.env.local`
2. Le `if (USE_PROFILE_MOCK)` court-circuit ne se déclenche plus
3. Les hooks Supabase prennent le relais (déjà branchés dans `Profile.tsx`)

## 📂 Fichiers touchés (final)

### Code applicatif

- `src/data/mock/profileMock.ts` — **nouveau** mock complet
- `src/components/profile/ProfileHeader.tsx` — refactor layout responsive
- `src/components/profile/ProfileAboutCard.tsx` — **nouveau**
- `src/components/profile/ProfileDNACard.tsx` — **nouveau**
- `src/components/profile/ProfileTabs.tsx` — refactor tabs + default journal
- `src/components/profile/tabs/ProfileFeed.tsx` — segmented switch + grid 2 cols
- `src/components/home/FeedPost.tsx` — chips toujours séparés
- `src/components/home/SharePopover.tsx` — accepte `shareUrl` générique
- `src/components/home/ProfileMenu.tsx` — lien "Mon profil" actif
- `src/pages/Profile.tsx` — branchement mock + grid + SharePopover
- `.env.local` — flag `VITE_USE_PROFILE_MOCK=true`

### Styles globaux

- `src/styles/base/_typography.scss` — fix critique `@layer base + :where()`
