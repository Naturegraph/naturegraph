# 05 — Profil owner + audit & refactor base

**Statut :** 🟢 Validé 100%
**Date création :** 2026-05-02
**Date validation :** 2026-05-02
**Auteur :** agent front-end (Safe Local Mode)
**Figma nodes :** 6385:77470 (owner desktop) / 6385:77493 (boutons détaillés)

## 🎯 Contexte

Deux objectifs combinés sur cette itération :

1. **Profil owner** : quand l'utilisateur connecté visite son propre profil,
   l'UI doit changer (boutons, options des posts).
2. **Audit complet** post-build des onglets visiteur pour solidifier la base
   avant de partir vers le profil owner. Demande Nicolas 2026-05-02 :
   _"il va falloir maintenant faire un audit au complet, vérifier que la base
   est vraiment solide que tout fonctionne desktop tablet et mobile. Bien
   factoriser le code puis corriger les defauts, prendre des notes pour le
   backend ensuite."_

## 🤔 Décision et alternatives

### Profil owner — Header

- **Décision** : remplacer la triade visiteur `[Migrer + Share + Options]` par
  `[Modifier (primary, Pencil)] + [Paramètres (outlined, Settings)]` exactement
  comme Figma 6385:77493.
- Le menu 3-pts options (block / report / copy link) **n'a plus de sens** sur
  son propre profil → retiré complètement en mode owner.
- Le bouton Share visiteur reste accessible via les controls du SharePopover
  hors du header ; pas critique en mode owner (cf. décision ci-dessous).
- Nouveau callback `onSettings` : navigation vers `/settings` (à créer Phase 2).
  En mock, ouvre temporairement `EditProfilePanel` pour démo.

### Profil owner — Suppression de posts

- **Décision** : propager `isOwnProfile` depuis `Profile.tsx` → `ProfileTabs`
  → `ProfileFeed` → `FeedPost.isOwnPost`. Le composant `PostOptionsMenu` du feed
  home gère déjà le cas owner (Modifier / Supprimer avec confirmation).
- **Bénéfice** : zéro nouveau code de menu / dialog de confirmation, on
  réutilise `useDeletePost()` du feed home.

### Test du mode owner sans backend

- **Décision** : flag URL `?own=1` sur `/profile/...` pour basculer
  `mockIsOwn = true` dans la branche mock de `Profile.tsx`. Permet à Nicolas de
  voir l'UX owner sans avoir à se logger ni câbler Supabase.
- **À retirer** : quand le backend est branché et que `auth.uid()` détermine
  naturellement `isOwnProfile`.

### Audit — refactors appliqués

| Sujet                                  | Décision                                                       |
| -------------------------------------- | -------------------------------------------------------------- | --- | ------------------------------------ |
| Empty state hermine dupliqué 5×        | Factoriser dans `<ProfileEmptyState />`                        |
| Branche non-mock cassée (max-w-2xl)    | Aligner sur la branche mock — cards About/DNA visibles desktop |
| `isOwnProfile` faux quand déconnecté   | `Boolean(authProfile && (!username                             |     | authProfile.username === username))` |
| Banner + avatar `loading="lazy"`       | Passer en `loading="eager"` + `fetchPriority="high"` (LCP)     |
| `isFirstDesktop = index === 1` fragile | Remplacer par test sur `tab.id === 'journal'`                  |
| `multipleObservations` deprecated      | Retirer des 9 mocks + FeedSection ; type `never` en garde TS   |

### Audit — points reportés Phase 2 (non bloquants)

- Focus trap dans `EditProfilePanel` + `ProfileOptionsMenu` (a11y bloquant)
- Navigation flèches gauche/droite dans `ProfileTabs` (WAI-ARIA tablist pattern)
- ~30 clés i18n manquantes dans `fr.json` / `en.json` (toutes les `defaultValue:`)
- Extraire `<FollowButton variant>` partagé (Header + UserCard)
- `prefers-reduced-motion` sur les transitions (`motion-reduce:transition-none`)
- `ProfileDNACard` : `transition-[width]` → `transform: scaleX()` (perf)
- ProfileTabs : indicateur visuel de scroll horizontal sur mobile (gradient/fade)

## 🔧 Modifications

### `ProfileHeader.tsx`

- Mode owner : 2 boutons texte+icône (Modifier primary + Paramètres outlined)
  au lieu de Edit pencil + Share + 3-pts options
- Nouveau prop `onSettings?: () => void`
- Banner et avatar passés en `loading="eager" fetchPriority="high"`

### `Profile.tsx`

- `isOwnProfile` durci avec test d'authentification
- Branche non-mock : ajout du wrapper `max-w-[1440px] mx-auto px-4 md:px-6` +
  cards About/DNA desktop + `md:px-12` sur les tabs (alignement avec mock)
- Mode mock : flag URL `?own=1` pour tester l'UX owner
- `onSettings` callback (placeholder, ouvre EditProfilePanel)

### `ProfileTabs.tsx`

- Nouvelle prop `isOwnProfile: boolean` propagée à `<ProfileFeed>`
- Fix robustesse : `tab.id === 'journal'` au lieu de `index === 1`

### `ProfileFeed.tsx`

- Nouvelle prop `isOwnProfile: boolean`
- Passe `isOwnPost={isOwnProfile}` à chaque `<FeedPost />` → menu 3-pts
  expose Modifier/Supprimer pour le owner

### `ProfileEmptyState.tsx` (nouveau)

- Card bordered + hermine + h3 + p + children?, variant `compact`
- Utilisé par ProfileFeed, ProfileInspirations, ProfileCommunity, ProfileStats

### `FeedPost.tsx` + `FeedSection.tsx`

- `multipleObservations?: never` (garde TS contre la régression)
- Destructuring nettoyé
- FeedSection ne peuple plus `multipleObservations`

### `profileMock.ts`

- 9 occurrences `multipleObservations: bool` supprimées via sed

## ✅ Validation Nicolas

- 2026-05-02 (header owner) : _"Maintenant je visite mon propre profil, voici
  les changements : bouton modifier et parametres a la place de migrer etc et
  pouvoir supprimer mes posts ou autres dans journal nature"_ + _"Tu peux
  appliquer les regles de changement, ce n'est pas grand chose"_.
- 2026-05-02 (audit) : _"oui tu peux corriger l'ensemble des points go"_.
- Vérifié visuellement desktop 1280px ✓ et mobile 375px ✓ en mode visiteur ET
  owner (URL `?own=1`).

## 🔁 TODO côté backend

Voir `03-profil-backend-notes.md` §11 (owner-specific actions) :

- §11.1 — Page `/settings` à créer (notifs, langue, confidentialité)
- §11.2 — `postService.deletePost(postId)` + RLS `auth.uid() = author_id`
- §11.3 — RLS `UPDATE profiles WHERE id = auth.uid()` (sécurité)
- §11.4 — Extraire `<FollowButton>` + `useToggleFollow(userId)` Phase 2

## 🧹 Comment retirer / finaliser

### Au switch backend

1. Retirer le flag URL `?own=1` dans `Profile.tsx` (mock branch)
2. Retirer la branche `if (USE_PROFILE_MOCK)` complètement
3. Le reste est déjà aligné — la branche non-mock prend le relais sans changement

### Cleanup TS final

1. Quand `posts.individuals_count` est en prod : retirer `multipleObservations`
   complètement de `MockPost` (actuellement `?: never`)
2. Migrer `profileMock.ts` vers `src/test/fixtures/` pour usage tests uniquement

## 📂 Fichiers touchés

```
src/components/profile/ProfileEmptyState.tsx        (nouveau)
src/components/profile/ProfileHeader.tsx            (owner buttons + eager)
src/components/profile/ProfileTabs.tsx              (isOwnProfile + tab.id)
src/components/profile/tabs/ProfileFeed.tsx         (isOwnProfile prop)
src/components/profile/tabs/ProfileInspirations.tsx (ProfileEmptyState)
src/components/profile/tabs/ProfileCommunity.tsx    (ProfileEmptyState)
src/components/profile/tabs/ProfileStats.tsx        (ProfileEmptyState compact)
src/components/home/FeedPost.tsx                    (multipleObservations -> never)
src/components/home/FeedSection.tsx                 (drop multipleObservations)
src/data/mock/profileMock.ts                        (cleanup)
src/pages/Profile.tsx                               (isOwnProfile + branche prod + onSettings)
second-agent/03-profil-backend-notes.md             (sections 11-13 ajoutées)
```
