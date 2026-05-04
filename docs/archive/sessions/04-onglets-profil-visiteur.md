# 04 — Onglets profil visiteur (Journal + Inspirations + Communauté)

**Statut :** 🟢 Validé 100%
**Date création :** 2026-05-01
**Date validation :** 2026-05-02
**Auteur :** agent front-end (Safe Local Mode)
**Figma nodes :**

- Journal vide : 6385:77220 (desktop) / 6385:74690 (mobile)
- Inspirations : 6385:76765 (desktop) / 6385:73578 (mobile)
- Communauté : 6385:76903 (desktop) / 6385:74108 (mobile)
- Pills Communauté : 6385:77009

## 🎯 Contexte

Reproduction pixel-perfect des 3 onglets visibles du profil visiteur (le 4ᵉ
onglet "Statistiques" est en mode "Bientôt"). Chaque onglet doit :

- Respecter les designs Figma fournis
- Réutiliser au maximum les composants du feed home (cohérence DS, RGESN)
- Gérer un état vide cohérent avec le reste du produit
- Fonctionner desktop / tablet / mobile

## 🤔 Décision et alternatives

### Tab Journal nature (`ProfileFeed`)

- **Décision** : segmented switch Récent/Populaire + view toggle (list/grid/filter)
  réutilisant `FeedGallery` et `FeedFilterPanel` du home.
- **Alternative écartée** : recoder un layout grid spécifique. Refusée car
  doublon inutile.
- View toggle masqué sur mobile (`hidden md:inline-flex`) car la HomeNavbar
  mobile expose déjà ces contrôles (cf. règle Nicolas 2026-05-01 : pas de
  duplication des contrôles entre topbar mobile et contenu).

### Tab Inspirations (`ProfileInspirations`)

- **Décision finale** : wrapper minimal sur `<FeedGallery />`, pas de
  réécriture. Mock data convertie de `string[]` → `MockPost[]` (`saved_posts`).
- **Alternative écartée** : layout custom avec `<img>` directs. Refusée par
  Nicolas le 2026-05-02 : _"il faut juste reproduire le style galerie partout
  notamment ici dans cet onglet aussi tout simplement"_ + _"reprendre comment
  fonctionne la galerie a 100% dans feed home"_.
- Bénéfice : le hover (titre + auteur), le badge multi-photos, et la lightbox
  plein écran sont automatiquement disponibles.

### Tab Communauté (`ProfileCommunity`)

- **Décision** : pills toggle [Migrateurs N | Migrations N] + grid responsive
  1/2/3 colonnes de cards utilisateurs (banner + avatar + count + bouton tree).
- Pills allégées (Figma 6385:77009) : pas de badge bg autour du count, juste
  texte inline avec couleur différenciée. `min-h-10` (40px) pour la cible
  tactile. Label en `text-foreground` toujours, count primary/muted selon état.
- Bouton Migrer dans les cards : icône `TreeDeciduous` **pleine** quand suivi
  (`fill="currentColor"`) au lieu d'un check — plus cohérent avec la métaphore
  "tu fais partie de la migration" demandée par Nicolas.

### Empty state commun

- Factorisé dans `<ProfileEmptyState title subtitle? compact? />`
  (`src/components/profile/ProfileEmptyState.tsx`) après avoir constaté 5
  duplications du même pattern.
- Variant `compact` pour `ProfileStats` (placeholder Bientôt).

## 🔧 Modifications

### Composants

- `src/components/profile/ProfileEmptyState.tsx` — **NOUVEAU**, card hermine partagée
- `src/components/profile/tabs/ProfileFeed.tsx` — segmented Récent/Populaire,
  view toggle, edge-to-edge mobile (`-mx-4 md:mx-0`), empty state factorisé
- `src/components/profile/tabs/ProfileInspirations.tsx` — devient un wrapper sur
  `FeedGallery`, prop renommée `photos: string[]` → `savedPosts: MockPost[]`
- `src/components/profile/tabs/ProfileCommunity.tsx` — pills + grid + UserCard +
  PillToggle, `is_followed_by_me` géré via state local
- `src/components/profile/tabs/ProfileStats.tsx` — refactor sur `ProfileEmptyState compact`

### Styles

- `src/styles/components/_gallery.scss` — `.gallery-masonry` étend à 4 colonnes
  sur lg (≥ 1024px) ; conserve 2/3 sur mobile/md. Affecte feed home + Inspirations.

### Mock data (`src/data/mock/profileMock.ts`)

- `PROFILE_MOCK_INSPIRATIONS: MockPost[]` (6 saved posts d'autres utilisateurs)
- `PROFILE_MOCK_FOLLOWERS: CommunityUser[]` (9 followers)
- `PROFILE_MOCK_FOLLOWING: CommunityUser[]` (3 following)
- Interface `CommunityUser { id, username, avatar_url, banner_url, followers_count, is_followed_by_me }`

### Propagation prop

- `ProfileTabs` : nouvelle prop `savedPosts: MockPost[]` (remplace `inspirationPhotos: string[]`)
- `Profile.tsx` : passe `PROFILE_MOCK_INSPIRATIONS` au lieu d'un tableau d'URLs

## ✅ Validation Nicolas

- 2026-05-01 : _"peux-tu me montrer un exemple de journal nature vide ?"_
  → empty state vérifié visuellement.
- 2026-05-02 (Inspirations) : _"il faut juste reproduire le style galerie
  partout notamment ici dans cet onglet aussi tout simplement"_ puis
  _"reprendre comment fonctionne la galerie a 100% dans feed home et l'appliquer
  ici mais avec les observations enregistrés par l'utilisateur et donc sa
  collection, t'embete pas a recréer du code, c'est vraiment pareil pour le coup"_.
- 2026-05-02 (Communauté) : _"Maintenant reproduire l'onglet communauté au pixel
  perfect !"_ + _"on peut mettre un arbre plein plutôt et pas juste avec border
  pour montrer qu'on a follow la personne ?"_ + _"laisser en noir le label et
  avoir 40px minimum de height"_.
- 2026-05-02 (Empty state community) : _"ameliorer ce style vide pour avoir un
  style coherent avec le reste du produit, tu peux revoir le texte au besoin"_
  → factorisation `<ProfileEmptyState />`.

## 🔁 TODO côté backend

Voir `03-profil-backend-notes.md` §1.2 (table `saved_posts`), §1.2 (table `follows`),
§5 (services), §6 (hooks React Query).

Points clés :

- `useSavedPosts(userId)` — alimente ProfileInspirations
- `useFollowers(userId)` / `useFollowing(userId)` — alimente ProfileCommunity
- `useToggleFollow()` mutation optimistic update sur `followers_count`

## 🧹 Comment retirer / finaliser

Quand on bascule sur Supabase :

1. Supprimer `PROFILE_MOCK_INSPIRATIONS`, `PROFILE_MOCK_FOLLOWERS`,
   `PROFILE_MOCK_FOLLOWING` de `profileMock.ts`
2. Brancher les hooks dans `ProfileTabs` ou `Profile.tsx` à la place des
   tableaux mock
3. La structure `<ProfileEmptyState />` reste — elle gère naturellement le
   cas `data.length === 0` après loading

## 📂 Fichiers touchés

```
src/components/profile/ProfileEmptyState.tsx        (nouveau)
src/components/profile/ProfileTabs.tsx              (props savedPosts + isOwnProfile)
src/components/profile/tabs/ProfileFeed.tsx
src/components/profile/tabs/ProfileInspirations.tsx (refactor wrapper FeedGallery)
src/components/profile/tabs/ProfileCommunity.tsx    (pills + UserCard + PillToggle)
src/components/profile/tabs/ProfileStats.tsx        (refactor sur ProfileEmptyState)
src/styles/components/_gallery.scss                 (4 cols lg)
src/data/mock/profileMock.ts                        (saved + community + interface)
src/pages/Profile.tsx                               (props mises à jour)
```
