# PRD : Page Profil Naturegraph (Visiteur & Owner)

> Product Requirements Document
> Version : 1.0 : 2026-05-02
> Auteur : Nicolas (Lead Product Designer) + Claude (PM/Dev/UX/UI)
> Statut : Référence active : guide d'implémentation
> Sources : Figma `6385:74429` (visiteur desktop), `6385:70500` (visiteur mobile), `6385:77470` (owner desktop), `6385:77493` (boutons owner)

---

## Table des matières

1. [Contexte & objectifs](#1-contexte--objectifs)
2. [États utilisateur](#2-états-utilisateur)
3. [Layout & responsive](#3-layout--responsive)
4. [ProfileHeader](#4-profileheader)
5. [Card "À propos"](#5-card--à-propos-)
6. [Card "ADN de l'observateur"](#6-card--adn-de-lobservateur-)
7. [Onglets profil](#7-onglets-profil)
8. [Tab Journal nature](#8-tab-journal-nature)
9. [Tab Inspirations](#9-tab-inspirations)
10. [Tab Communauté](#10-tab-communauté)
11. [Tab Statistiques](#11-tab-statistiques)
12. [États vides](#12-états-vides)
13. [EditProfilePanel](#13-editprofilepanel)
14. [ProfileOptionsMenu](#14-profileoptionsmenu)
15. [Internationalisation](#15-internationalisation)
16. [Accessibilité](#16-accessibilité)
17. [Performance & éco-conception](#17-performance--éco-conception)
18. [Architecture de données](#18-architecture-de-données)
19. [Inventaire composants](#19-inventaire-composants)
20. [TODO Backend](#20-todo-backend)
21. [Roadmap d'implémentation](#21-roadmap-dimplémentation)

---

## 1. Contexte & objectifs

### Pourquoi cette page ?

La page profil est le **point de référence identitaire** d'un utilisateur Naturegraph.
Elle répond à deux questions :

- _"Qui est cet observateur ?"_ (visiteur qui découvre quelqu'un d'autre)
- _"Comment est-ce que je me présente à la communauté ?"_ (owner qui gère le sien)

Elle sert aussi de **vitrine** pour donner envie de suivre (Migrer avec) un naturaliste,
et d'**espace personnel** pour retrouver ses propres observations et inspirations.

### Objectifs produit

| Objectif                          | Mesure cible                               |
| --------------------------------- | ------------------------------------------ |
| Engagement profil → follow        | > 8% des visites de profil → "Migrer"      |
| Profils complets                  | > 60% des owners ont avatar + bio remplis  |
| Réutilisation des composants feed | 100% (FeedPost, FeedGallery, PostOptions…) |
| Performance LCP                   | < 2.5s (banner + avatar = LCP candidate)   |
| Accessibilité                     | WCAG AA (tablist, focus, contrast)         |

### Sources de vérité

| Source    | Rôle                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------- |
| **Figma** | [Profil visiteur desktop](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6385-74429) |
| **Figma** | [Profil visiteur mobile](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6385-70500)  |
| **Figma** | [Profil owner desktop](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6385-77470)    |
| **Figma** | [Boutons owner détail](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6385-77493)    |
| **Figma** | [Tab Inspirations](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6385-76765)        |
| **Figma** | [Tab Communauté](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6385-76903)          |
| **Code**  | `src/pages/Profile.tsx` + `src/components/profile/` (~12 composants)                               |
| **Mock**  | `src/data/mock/profileMock.ts` : profil visiteur + saved posts + followers                         |
| **Notes** | `second-agent/03-profil-backend-notes.md` (architecture backend Phase 2)                           |

### Décisions clés

1. **Page partagée visiteur/owner** : un seul composant `Profile.tsx` qui bascule
   selon `isOwnProfile`. Évite la duplication, garantit la cohérence visuelle.
2. **Réutilisation maximale du feed home** : `FeedPost`, `FeedGallery`, `FeedFilterPanel`,
   `PostOptionsMenu`, `PhotoLightbox`, `SharePopover` sont tous réutilisés tels quels.
3. **Mocks-first** : tout le profil tourne sur mocks pendant la phase build pour
   économiser le quota Supabase Free Plan (cf. `VITE_USE_PROFILE_MOCK=true`).
4. **Pas d'emoji dans les chips de catégorie de post** (règle DS Nicolas 2026-05-02) :
   - Chips catégorie/espèce dans `FeedPost` : `Mammifères` au lieu de `🐿️ Mammifères`
     pour alléger le design des cards posts.
   - **Les emojis restent légitimes** ailleurs : ADN observateur
     (🦉 Oiseaux 50%), réactions (love/fire/admire/wow/curious), météo
     (☀️/🌥️/🌧️), badges utilisateur (avatar bottom-right), tuiles d'intérêts
     dans EditPrefsTab, etc.

---

## 2. États utilisateur

### 2.1 Modes principaux

#### Visiteur (`isOwnProfile: false`)

L'utilisateur connecté visite **un autre** profil : ou un visiteur non-connecté
visite n'importe quel profil public.

```
Header  : [Banner] [Avatar] [Username + stats] [Migrer] [Share] [⋯ Options]
Content : Cards À propos + ADN observateur (desktop) / Tab "À propos" (mobile)
Tabs    : Journal nature | Inspirations | Communauté | Statistiques (Bientôt)
```

#### Owner (`isOwnProfile: true`)

L'utilisateur connecté regarde son **propre** profil (URL `/profile` sans username
ou avec `username === authProfile.username`).

```
Header  : [Banner] [Avatar] [Username + stats] [✏ Modifier] [⚙ Paramètres]
Content : identique au visiteur
Tabs    : identique mais posts du Journal exposent Modifier/Supprimer dans le menu 3-pts
```

### 2.2 Détection `isOwnProfile`

```ts
// src/pages/Profile.tsx
const isOwnProfile = Boolean(authProfile && (!username || authProfile.username === username))
```

**Sécurité** : un visiteur déconnecté visitant `/profile` (sans username) NE DOIT
PAS être traité comme owner. Le test `Boolean(authProfile && ...)` évite cette
faille (cf. audit 2026-05-02).

### 2.3 Sous-états

| #   | État                 | Déclencheur                   | Composant                       |
| --- | -------------------- | ----------------------------- | ------------------------------- |
| 1   | `loading`            | Query React Query en cours    | `<ProfileSkeleton />`           |
| 2   | `not-found`          | 404 sur le username           | Empty state + lien `/home`      |
| 3   | `journal-vide`       | Aucun post                    | `<ProfileEmptyState />`         |
| 4   | `inspirations-vide`  | Aucun saved_post              | `<ProfileEmptyState />`         |
| 5   | `community-vide`     | 0 follower OU 0 following     | `<ProfileEmptyState />`         |
| 6   | `stats-bientot`      | Toujours (Phase 3)            | `<ProfileEmptyState compact>`   |
| 7   | `edit-panel-open`    | Clic "Modifier" (owner)       | `<EditProfilePanel />`          |
| 8   | `share-popover-open` | Clic share (visiteur)         | `<SharePopover />` (du home)    |
| 9   | `options-menu-open`  | Clic ⋯ (visiteur)             | `<ProfileOptionsMenu />`        |
| 10  | `lightbox-open`      | Clic photo Inspirations       | `<PhotoLightbox />` (du home)   |
| 11  | `post-options-open`  | Clic ⋯ sur un post du Journal | `<PostOptionsMenu />` (du home) |

---

## 3. Layout & responsive

### 3.1 Breakpoints (Tailwind)

| Nom      | Largeur  | Usage profil                                                       |
| -------- | -------- | ------------------------------------------------------------------ |
| (mobile) | < 768px  | Avatar centré, tab "À propos" présent                              |
| `md:`    | ≥ 768px  | Avatar à gauche, cards About + DNA visibles, tab "À propos" masqué |
| `lg:`    | ≥ 1024px | Inspirations en 4 colonnes                                         |
| `xl:`    | ≥ 1280px | Container max 1440px                                               |

### 3.2 Container global

```tsx
<main className="flex-1 w-full pb-20 md:pb-6">
  <ProfileHeader ... />               {/* pleine largeur (banner étendu) */}
  <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 mt-6">
    <div className="hidden md:grid md:grid-cols-[1fr_320px] gap-4 mb-6 md:px-12">
      <ProfileAboutCard /> <ProfileDNACard />
    </div>
    <div className="md:px-12">
      <ProfileTabs ... />
    </div>
  </div>
</main>
```

- `max-w-[1440px]` : largeur max du contenu
- `md:px-12` : aligne le premier tab et les cards avec le bord gauche de l'avatar
  (l'avatar est positionné via le même `md:px-12` dans le ProfileHeader)
- `pb-20 md:pb-6` : padding bottom large mobile pour ne pas être masqué par
  la `MobileBottomNav` (h-14 + safe-area)

### 3.3 Comportement mobile

- Tab "À propos" mobile-only : affiche `<ProfileAboutCard compact />` + `<ProfileDNACard compact />`
  empilées dans un tabpanel dédié
- Tabs scrollables horizontalement (`overflow-x-auto scrollbar-none touch-pan-x`)
- Le premier tab visible (`tab.id === 'about'` mobile, `tab.id === 'journal'` desktop)
  a `pl-0` pour aligner son icône avec la bordure gauche du wrapper

---

## 4. ProfileHeader

### 4.1 Layout

#### Desktop (≥ md)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BANNER (h-56 = 224px)                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
   ┌──────┐
   │Avatar│  Username (H1, 32px Quicksand bold)              [Btn1] [Btn2] [Btn3]
   │ 128px│  1078 Migrateurs  |  88 Migrations
   └──────┘
   ↑ -mt-14 (-56px overlap)        24px gap (md:mt-6)
```

- Banner : `h-56` (224px), `rounded-md`, `bg-[var(--color-action-light)]` fallback
- Avatar : `size-32` (128px), `rounded-full`, border `border-4 border-cream-lighter`
  (le contour fait partie de l'effet "épingle" Figma)
- Avatar overlap : `-mt-14` (-56px) pour chevaucher le banner
- Username : `text-[2rem]` (32px) Quicksand Bold (token Figma `Titles/Subtitle/Size = 32`)
- Stats : `1078 Migrateurs | 88 Migrations` séparées par un trait vertical 1×20px
- Boutons : alignés `md:items-start md:self-start` (top, pas bottom)

#### Mobile (< md)

```
┌─────────────────────────────────────┐
│   BANNER (h-44 = 176px)             │
│              ┌──────┐               │
└──────────────│Avatar│───────────────┘
               │ 96px │
               └──────┘
               Username (H1, 24px)
              1078 ⋮ 88 Migrations
              [Btn1] [Btn2] [Btn3]
```

- Avatar centré, taille 96px
- Username `text-2xl` (24px), centré
- Boutons centrés en row

### 4.2 Boutons selon le mode

#### Visiteur

```tsx
<button>{TreeDeciduous} Migrer</button>          // primary, h-10 px-5
<button>{Share2}</button>                          // size-10 outlined
<button>{MoreHorizontal}</button>                  // size-10 outlined → ProfileOptionsMenu
```

État Migrer : toggle `isFollowing`. Si `true` → texte "Tu migres avec",
fond `cream-lighter border` ; sinon → fond primary, texte primary-foreground.

#### Owner

```tsx
<button>{Pencil} Modifier</button>                 // primary, h-10 px-5
<button>{Settings} Paramètres</button>             // outlined, h-10 px-5
```

Pas de menu 3-pts ni de share : les actions block/report n'ont pas de sens
sur son propre profil ; le partage est accessible via le SharePopover du
contenu (à venir).

### 4.3 Badge avatar

Si `profile.badges[0]` est défini, on affiche un emoji thématique en bottom-right
de l'avatar :

```tsx
<div
  className="absolute bottom-0 right-0 size-7 md:size-8 rounded-full
                bg-cream-lighter border border-border shadow-sm
                flex items-center justify-center"
>
  <span className="text-base">{getBadgeEmoji(profile.badges[0])}</span>
</div>
```

Mapping `badges → emoji` dans `src/utils/badgeHelpers.ts`.

### 4.4 Performance

- Banner et avatar : `loading="eager" fetchPriority="high"` (above-the-fold, candidats LCP)
- Pas de lazy loading qui pénaliserait le rendu initial

---

## 5. Card "À propos"

Affichée sur desktop (`md:grid` de 2 colonnes), incluse dans le tab "À propos"
sur mobile (mode `compact`).

### 5.1 Contenu

```
┌──────────────────────────────────────────────────────────────┐
│  [🟣 icône] À propos                                         │
│                                                              │
│  Bio de l'utilisateur en texte libre. Peut être longue,      │
│  on garde tout sans tronquer.                                │
│                                                              │
│  📅 Migrateur depuis janvier 2026   🌐 example.fr  📷 @insta │
└──────────────────────────────────────────────────────────────┘
```

- **Titre** : "À propos" : `font-body font-bold text-base` + icône `UserRound`
  dans un container `size-8 rounded-full bg-[--color-highlight-primary]`
- **Bio** : multiline, `text-sm text-foreground`
- **Footer** : date d'inscription + liens externes (website + instagram) sur
  la même ligne (`flex flex-wrap items-center gap-x-6 gap-y-2`), tous en
  `text-primary` violet

### 5.2 Liens externes

| Champ       | Préfixe URL                 | Affichage                     |
| ----------- | --------------------------- | ----------------------------- |
| `website`   | `https://` ajouté si manque | `naturephoto.fr` (sans https) |
| `instagram` | `https://instagram.com/`    | `@OiseauxNature`              |

**TODO sécurité** : sanitizer l'instagram input pour retirer le `@` initial
si l'utilisateur le saisit, sinon URL invalide.

### 5.3 Date d'inscription

Format : `Migrateur depuis {mois} {année}` : utiliser `Intl.DateTimeFormat`
pour i18n native (FR + EN). Actuellement les mois sont en dur en français
(à corriger).

---

## 6. Card "ADN de l'observateur"

### 6.1 Contenu

```
┌─────────────────────────────────────┐
│ [🟣] ADN de l'observateur           │
│                                     │
│ 🦉 Oiseaux                  50%     │
│ ████████████████░░░░░░░░░           │
│                                     │
│ 🐿️ Mammifères               35%     │
│ ███████████░░░░░░░░░░░░░░           │
│                                     │
│ 🐝 Insectes                 10%     │
│ ███░░░░░░░░░░░░░░░░░░░░░░           │
└─────────────────────────────────────┘
```

- Card width fixe 320px sur desktop, full width mobile
- Top 5 catégories (limit côté RPC backend)
- Barre : `h-2 rounded-full bg-cream-lighter border-[0.5px] border-border`
  - fill `bg-[--color-highlight-tertiary]` (#33B6B6 light teal)
- Pourcentages calculés côté backend via RPC `get_observer_dna(profile_id)`

### 6.2 Mapping `taxonomic_group` → emoji

```ts
const CATEGORY_EMOJIS = {
  birds: '🦉',
  mammals: '🐿️',
  insects: '🐝',
  plants: '🌿',
  fish: '🐟',
  reptiles: '🦎',
  // ...
}
```

### 6.3 Empty state

Si l'utilisateur n'a pas encore d'observations, on affiche un message :
_"Cette section s'enrichira au fil des observations partagées."_

---

## 7. Onglets profil

### 7.1 Configuration

| Tab            | Icône     | i18n key                    | Badge count         | Visible     |
| -------------- | --------- | --------------------------- | ------------------- | ----------- |
| À propos       | UserRound | `profile.tabs.about`        | :                   | mobile only |
| Journal nature | Camera    | `profile.tabs.journal`      | `userPosts.length`  | toujours    |
| Inspirations   | Bookmark  | `profile.tabs.inspirations` | `savedPosts.length` | toujours    |
| Communauté     | Users     | `profile.tabs.community`    | :                   | toujours    |
| Statistiques   | BarChart2 | `profile.tabs.stats`        | "Bientôt" badge     | toujours    |

### 7.2 Comportement par défaut

- Tab actif à l'arrivée : **Journal nature** (règle Nicolas 2026-05-01)
- Sur mobile, l'utilisateur peut cliquer "À propos" pour voir les 2 cards
  (qui sont sinon masquées sous le header)

### 7.3 Style tabs

| État     | Style                                                                              |
| -------- | ---------------------------------------------------------------------------------- |
| Active   | `text-primary`, `border-b-2 border-primary`, badge `bg-primary-light text-primary` |
| Inactive | `text-foreground`, `border-transparent`, badge `bg-warm-beige text-foreground`     |
| Disabled | `text-muted-foreground/60`, `cursor-not-allowed`, `opacity-60`                     |

Tab "Statistiques" est toujours `disabled` (mode "Bientôt"). Badge "Bientôt"
en `text-[10px] font-bold uppercase tracking-wide text-primary bg-primary-light`.

### 7.4 Scroll horizontal mobile

`overflow-x-auto scrollbar-none touch-pan-x [-webkit-overflow-scrolling:touch]`

Pas de scrollbar visible. Sur mobile, les 5 tabs (À propos + Journal + Inspirations

- Communauté + Statistiques) ne tiennent pas → l'utilisateur swipe horizontalement.

**TODO a11y** : ajouter navigation flèches gauche/droite (WAI-ARIA tablist).

---

## 8. Tab Journal nature

### 8.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Récent] Populaire                          [☰] [▦] [≡]    │
│ ─────────────────────────────────────────────────────────── │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │  Post 1           │  │  Post 2           │              │
│  │  (FeedPost)       │  │  (FeedPost)       │              │
│  └───────────────────┘  └───────────────────┘              │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │  Post 3           │  │  Post 4           │              │
│  └───────────────────┘  └───────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

- Header row : segmented `Récent | Populaire` (gauche) + view toggle `list/grid/filter` (droite)
- View toggle masqué sur mobile (`hidden md:inline-flex`) : la HomeNavbar mobile expose déjà ces contrôles
- Layout list : grid 1 col mobile (edge-to-edge `-mx-4`) / 2 cols desktop (`gap-6`)
- Layout grid : `<FeedGallery>` masonry (CSS columns 2/3/4 selon breakpoint)

### 8.2 Tri (segmented switch)

| Mode      | Comportement                               |
| --------- | ------------------------------------------ |
| Récent    | `posts ORDER BY created_at DESC`           |
| Populaire | Score = `love + admire + fire`, descendant |

Backend Phase 2 : `postService.getPostsByUser(userId, { sort: 'recent' \| 'popular' })`.

### 8.3 Owner-only : suppression de posts

Quand `isOwnProfile === true`, chaque `<FeedPost />` reçoit `isOwnPost={true}` →
le menu 3-pts (`PostOptionsMenu`) expose **Modifier** et **Supprimer**
(cf. PRD homepage §11 pour les détails).

```tsx
<FeedPost {...post} isOwnPost={isOwnProfile} />
```

Suppression : confirmation modal + mutation `useDeletePost(postId)` (déjà câblée
côté hooks, `TODO [BACKEND]` côté service).

### 8.4 Filtres

Bouton filter (icône Funnel) → ouvre `<FeedFilterPanel>` (composant du home).
Filtres : catégorie, période, format. **Note** : les filtres sont actuellement
appliqués localement uniquement (pas envoyés au query). À brancher Phase 2.

---

## 9. Tab Inspirations

### 9.1 Concept produit

L'onglet Inspirations affiche la **collection** d'observations sauvegardées
(bookmarks) : les posts d'**autres** utilisateurs que ce profil a marqués
comme inspiration.

### 9.2 Implémentation

**Décision majeure (Nicolas 2026-05-02)** : l'onglet est un wrapper minimal
sur `<FeedGallery />` (composant du home). Pas de réécriture, pas de
duplication de logique.

```tsx
<FeedGallery posts={savedPosts} />
```

### 9.3 Layout galerie

- Masonry CSS pure via `.gallery-masonry` (`columns: 2 / 3 / 4` selon breakpoint)
- Edge-to-edge mobile (`-mx-4 md:mx-0`)
- Hover : gradient sombre + titre du post + auteur (avatar + username)
- Badge multi-photos (Images icon + count) si `post.images.length > 1`
- Clic → `<PhotoLightbox>` plein écran avec navigation prev/next

### 9.4 Source de données

Backend Phase 2 : table `saved_posts (user_id, post_id, created_at)` jointe sur
`posts`. Service `savedPostService.getSavedPostsByUser(userId)`.

---

## 10. Tab Communauté

### 10.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ( Migrateurs 1078 )  ( Migrations 88 )                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Banner   │  │ Banner   │  │ Banner   │                  │
│  │ ─────────│  │ ─────────│  │ ─────────│                  │
│  │ ⊙ Name   │  │ ⊙ Name   │  │ ⊙ Name   │                  │
│  │ 214 mig. │  │ 324 mig. │  │ 217 mig. │                  │
│  │      [🌳]│  │      [🌳]│  │      [🌳]│                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Pills toggle

| État     | Style                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Active   | `bg-primary-light` + label `text-foreground` + count `text-primary`                                    |
| Inactive | `bg-background border-[0.5px] border-border` + label `text-foreground` + count `text-muted-foreground` |

Padding `px-4 min-h-10` (40px cible tactile). `font-medium` (pas bold).
Le label reste **toujours noir** dans les deux états (Nicolas 2026-05-02 :
_"laisser en noir le label et avoir 40px minimum de height"_).

### 10.3 UserCard

```tsx
<article className="flex flex-col rounded-md border-[0.5px] border-border bg-background overflow-hidden">
  <div className="aspect-[5/2] w-full overflow-hidden">
    <img src={user.banner_url} className="w-full h-full object-cover" />
  </div>
  <div className="flex items-center gap-3 p-3">
    <img src={user.avatar_url} className="size-10 rounded-full border" />
    <div className="flex-1">
      <span className="font-bold text-sm">{user.username}</span>
      <span className="text-xs text-muted-foreground">{count} migrateurs</span>
    </div>
    <button className="size-9 rounded-full">{isFollowing ? <TreeFilled> : <TreeOutline>}</button>
  </div>
</article>
```

- Banner ratio `5:2` (cover, lazy)
- Avatar 40px circulaire bordured
- Bouton Migrer circulaire, icône `TreeDeciduous`
  - Non suivi : `bg-background border-border`, arbre creux
  - Suivi : `bg-primary text-primary-foreground`, arbre **plein** (`fill="currentColor"`)
    : décision Nicolas 2026-05-02 : _"on peut mettre un arbre plein plutôt et
    pas juste avec border pour montrer qu'on a follow la personne ?"_

### 10.4 Grille responsive

| Breakpoint       | Colonnes |
| ---------------- | -------- |
| Mobile (< 768px) | 1        |
| md (≥ 768px)     | 2        |
| lg (≥ 1024px)    | 3        |

### 10.5 Source de données

Backend Phase 2 : table `follows (follower_id, following_id, created_at)`.

```sql
-- Migrateurs (followers)
SELECT p.* FROM follows f JOIN profiles p ON p.id = f.follower_id
WHERE f.following_id = $profileId
ORDER BY f.created_at DESC LIMIT 20 OFFSET $cursor;

-- Migrations (following)
SELECT p.* FROM follows f JOIN profiles p ON p.id = f.following_id
WHERE f.follower_id = $profileId
ORDER BY f.created_at DESC LIMIT 20 OFFSET $cursor;
```

---

## 11. Tab Statistiques

### 11.1 État Phase 1 (actuel)

Placeholder "Bientôt" : `<ProfileEmptyState compact>` avec :

- Titre : "Statistiques arrivent bientôt"
- Sous-titre : "On prépare les graphiques de tes observations, espèces rencontrées et migrations dans le temps."
- Badge `Bientôt` (primary-light, uppercase)

### 11.2 Phase 3 : Contenu prévu

- **Graphique d'observations** : heatmap calendaire (style GitHub contributions)
- **Diversité d'espèces** : top 10 + nombre total
- **Progression mensuelle** : courbe nombre d'observations / mois
- **Migrations** : carte avec lieux d'observation
- **Streaks** : meilleur / actuel

Backend : RPC `get_profile_stats(profile_id)` (cf. backend notes §4.2).

---

## 12. États vides

Tous les empty states utilisent le composant unifié `<ProfileEmptyState />` :

```tsx
<ProfileEmptyState
  title="Titre H3"
  subtitle="Description courte muted"
  compact={false} // optionnel : réduit padding et taille hermine
>
  {/* children optionnels (CTA, badge, etc.) */}
</ProfileEmptyState>
```

| Lieu              | Titre par défaut                          |
| ----------------- | ----------------------------------------- |
| Journal vide      | "Aucune rencontre partagée sur ce profil" |
| Inspirations vide | "Aucune inspiration sauvegardée"          |
| Migrateurs vides  | "Pas encore de migrateurs"                |
| Migrations vides  | "Aucune migration partagée"               |
| Statistiques      | "Statistiques arrivent bientôt"           |
| Profile not found | "Utilisateur introuvable"                 |

---

## 13. EditProfilePanel

### 13.1 Déclencheur

Owner only : clic sur le bouton "Modifier" dans le ProfileHeader.

### 13.2 Champs éditables

- Avatar (upload image)
- Banner (upload image)
- Username (avec validation unicité côté serveur)
- Bio (textarea, multilignes)
- Ville / Région
- Site web
- Instagram

### 13.3 Validation

- Username : 3-20 caractères, alphanumeric + `_-.`, unique (case insensitive)
- Bio : max 500 caractères
- Website : URL valide (préfixe `https://` auto-ajouté si manquant)
- Instagram : retirer `@` initial automatiquement

### 13.4 TODO accessibilité

Le panel actuel utilise `role="dialog" aria-modal="true"` mais **manque
de focus trap**. À implémenter Phase 2 (cf. audit §11).

---

## 14. ProfileOptionsMenu

### 14.1 Visiteur

- **Copier le lien** : copie l'URL `${origin}/profile/${username}` dans presse-papier
- **Bloquer cet utilisateur** : TODO `moderationService.blockUser(targetId)`
- **Signaler ce profil** : TODO `moderationService.reportProfile(targetId, reason)`

### 14.2 Owner

(En Phase 1 actuelle, retiré côté UI puisque les boutons Modifier/Paramètres
remplacent cette logique. À reconsidérer Phase 2 si on veut un menu rapide.)

### 14.3 UX

- Position : `absolute right-0 top-full mt-2`
- Fermeture : Escape, click outside, click sur un item (avec délai 1200ms pour
  feedback visuel : Check icon vert sur l'item activé)
- Hover items : `hover:bg-muted/40` pour normal, `hover:bg-red-50 text-red-600`
  pour danger (Signaler)

---

## 15. Internationalisation

### 15.1 Clés à ajouter dans `src/i18n/fr.json` + `en.json`

| Section                                                         | Clés                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `profile.tabs.*`                                                | about, journal, inspirations, community, stats                                                                                    |
| `profile.about.*`                                               | title, memberSince                                                                                                                |
| `profile.dna.*`                                                 | title, empty                                                                                                                      |
| `profile.journal.*`                                             | recent, popular, noObsTitle, noObsSubtitle, viewList, viewGrid, filter                                                            |
| `profile.inspirations.*`                                        | emptyTitle, emptySubtitle, aria, openPhoto                                                                                        |
| `profile.community.*`                                           | migrateursList, migrationsList, migrateursCount, noMigrateursTitle, noMigrateursSubtitle, noMigrationsTitle, noMigrationsSubtitle |
| `profile.options`                                               | (3-pts menu aria)                                                                                                                 |
| `profile.editProfile`, `profile.settings`, `profile.share`      | boutons header                                                                                                                    |
| `profile.copyLink`, `profile.blockUser`, `profile.reportUser`   | menu options                                                                                                                      |
| `profile.migrer`, `profile.migrating`                           | bouton follow                                                                                                                     |
| `profile.stats.comingSoonTitle`, `comingSoonDesc`, `comingSoon` | placeholder                                                                                                                       |

### 15.2 Format dates

Utiliser `Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })`
plutôt que des arrays statiques de mois en français.

### 15.3 Pluriels

Utiliser i18next pluriels pour `migrateursCount` :

```json
{
  "profile.community.migrateursCount_one": "{{count}} migrateur",
  "profile.community.migrateursCount_other": "{{count}} migrateurs"
}
```

---

## 16. Accessibilité

### 16.1 Conformité WCAG AA

| Critère            | Implémentation                                                                 |
| ------------------ | ------------------------------------------------------------------------------ |
| Contraste texte    | ≥ 4.5:1 (vérifié via DS tokens)                                                |
| Contraste UI       | ≥ 3:1                                                                          |
| Focus visible      | `focus-visible:ring-2 focus-visible:ring-primary` partout                      |
| Navigation clavier | Tab, Enter, Escape sur tous les contrôles                                      |
| Alt text           | Avatar (`name de l'utilisateur`), banners décoratives `alt=""` + `aria-hidden` |
| Lang attribute     | Hérité du `<html lang="fr">` global                                            |

### 16.2 ARIA

- Tabs : `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `aria-disabled`
- Tabpanels : `role="tabpanel"`, `aria-labelledby`
- Menu : `role="menu"`, `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`
- Boutons toggle : `aria-pressed`
- Empty states : `role="status"`

### 16.3 TODO Phase 2

- Focus trap dans `<EditProfilePanel>` et `<ProfileOptionsMenu>`
- Navigation flèches gauche/droite dans `<ProfileTabs>` (WAI-ARIA tablist pattern)
- Indicateur visuel de scroll horizontal sur mobile (gradient/fade)
- Annonce screen reader des changements de tab actif (`aria-live`)

---

## 17. Performance & éco-conception

### 17.1 Budget

| Métrique         | Cible profil                          |
| ---------------- | ------------------------------------- |
| LCP              | < 2.5s (banner + avatar prioritaires) |
| JS bundle profil | < 50KB gzipped (lazy split)           |
| Images banner    | WebP/AVIF, max 1600×400, < 80KB       |
| Avatar           | WebP/AVIF, max 200×200, < 20KB        |

### 17.2 Optimisations appliquées

| Élément                         | Stratégie                                    |
| ------------------------------- | -------------------------------------------- |
| Banner / Avatar                 | `loading="eager" fetchPriority="high"` (LCP) |
| Photos posts (Journal)          | `loading="lazy"` (below-the-fold)            |
| Photos Inspirations             | `loading="lazy"`                             |
| Cards utilisateurs (Communauté) | `loading="lazy"`                             |
| Layout galerie                  | CSS `columns` (pas de JS de positionnement)  |
| Layout community                | CSS Grid responsive (pas de JS)              |

### 17.3 Pagination obligatoire

Backend : limite 20 items par requête (Journal, Inspirations, Followers, Following).
Pas de scroll infini sur mobile (cf. `GUIDELINES.md`).

### 17.4 TODO Phase 2

- `prefers-reduced-motion` sur toutes les transitions (`motion-reduce:transition-none`)
- `<ProfileDNACard>` : `transition-[width]` → `transform: scaleX()` (pas de reflow)
- Image responsive `srcset` : servir `w=600` mobile, `w=1200` desktop
- React Query : `staleTime: 5 * 60 * 1000` agressif sur les profils visités (5 min)

---

## 18. Architecture de données

### 18.1 Type `ProfileDisplayData`

```ts
export interface ProfileDisplayData {
  username: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  city: string | null
  region: string | null
  interests: Array<{ id: string; percent: number }> // calc côté RPC
  instagram: string | null
  website: string | null
  followers_count: number
  following_count: number
  created_at: string
  badges: string[]
  stats: { observations: number; species: number; streak: number }
  weekProgress?: { current: number; goal: number }
}
```

### 18.2 Mapping Supabase

```ts
function profileToDisplayData(profile: Profile): ProfileDisplayData {
  return {
    username: profile.username,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    banner_url: profile.banner_url,
    city: profile.city,
    region: profile.region,
    interests: [], // alimenté par RPC get_observer_dna
    instagram: profile.instagram,
    website: profile.website,
    followers_count: profile.followers_count ?? 0,
    following_count: profile.following_count ?? 0,
    created_at: profile.created_at,
    badges: profile.badges ?? [],
    stats: { observations: 0, species: 0, streak: 0 }, // RPC get_profile_stats
  }
}
```

### 18.3 Mocks

Tous les composants profil consomment `src/data/mock/profileMock.ts` quand
`VITE_USE_PROFILE_MOCK=true` :

- `PROFILE_MOCK_VISITOR` : `ProfileDisplayData` complet
- `PROFILE_MOCK_POSTS` : `MockPost[]` (3 posts du Journal)
- `PROFILE_MOCK_INSPIRATIONS` : `MockPost[]` (6 saved posts)
- `PROFILE_MOCK_FOLLOWERS` / `PROFILE_MOCK_FOLLOWING` : `CommunityUser[]`

---

## 19. Inventaire composants

```
src/pages/Profile.tsx                              ← page entry point
src/components/profile/
├── ProfileHeader.tsx                              ← banner + avatar + boutons
├── ProfileAboutCard.tsx                           ← card À propos
├── ProfileDNACard.tsx                             ← card ADN observateur
├── ProfileTabs.tsx                                ← tablist + dispatch tabpanel
├── ProfileEmptyState.tsx                          ← empty state partagé
├── ProfileOptionsMenu.tsx                         ← menu 3-pts visiteur
├── EditProfilePanel.tsx                           ← panel modification (owner)
├── ProfileSkeleton.tsx                            ← loading state
└── tabs/
    ├── ProfileFeed.tsx                            ← tab Journal nature
    ├── ProfileInspirations.tsx                    ← tab Inspirations
    ├── ProfileCommunity.tsx                       ← tab Communauté
    └── ProfileStats.tsx                           ← tab Statistiques (placeholder)

Composants RÉUTILISÉS du feed home (zéro duplication) :
src/components/home/
├── FeedPost.tsx                                   ← cards post Journal
├── FeedGallery.tsx                                ← masonry Inspirations
├── FeedFilterPanel.tsx                            ← filtres Journal
├── PostOptionsMenu.tsx                            ← menu posts (Modifier/Supprimer)
├── PhotoLightbox.tsx                              ← lightbox photo plein écran
└── SharePopover.tsx                               ← partage profil + post
```

---

## 20. TODO Backend

> Référence détaillée : `second-agent/03-profil-backend-notes.md`

### 20.1 Schéma SQL (migrations)

| Migration                              | Contenu                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `YYYYMMDD_profile_columns.sql`         | ALTER profiles (bio, instagram, website, banner_url, city, region, badges, +counts) |
| `YYYYMMDD_follows_table.sql`           | CREATE TABLE follows + RLS + trigger compteurs                                      |
| `YYYYMMDD_saved_posts_table.sql`       | CREATE TABLE saved_posts + RLS                                                      |
| `YYYYMMDD_blocks_reports_tables.sql`   | CREATE TABLE blocks, reports + RLS                                                  |
| `YYYYMMDD_posts_individuals_count.sql` | ALTER posts ADD individuals_count INTEGER                                           |
| `YYYYMMDD_profile_rpcs.sql`            | get_observer_dna, get_profile_stats                                                 |

### 20.2 Services

```
src/services/
├── profileService.ts          (getProfileByUsername, updateOwnProfile, toggleFollow, getFollowers, getFollowing)
├── savedPostService.ts        (getSavedPostsByUser, toggleSave)
└── moderationService.ts       (blockUser, unblockUser, reportProfile)
```

### 20.3 Hooks React Query

```
src/hooks/
├── useProfile.ts              (étendre : useFollowers, useFollowing, useToggleFollow)
├── useSavedPosts.ts           (nouveau)
└── useObserverDNA.ts          (nouveau : RPC get_observer_dna, staleTime 1h)
```

### 20.4 Cleanup au switch

- [ ] Retirer `VITE_USE_PROFILE_MOCK` et la branche correspondante dans `Profile.tsx`
- [ ] Retirer le flag URL `?own=1` (utilisé seulement pour tester l'UI owner sans auth)
- [ ] Retirer `MockPost.multipleObservations` (actuellement `?: never`)
- [ ] Migrer `profileMock.ts` vers `src/test/fixtures/`
- [ ] Brancher tous les hooks listés §20.3
- [ ] Implémenter focus trap (a11y)
- [ ] Implémenter navigation flèches ProfileTabs (WAI-ARIA)
- [ ] Compléter ~30 clés i18n manquantes

---

## 21. Roadmap d'implémentation

### Phase 1 : UI complète (terminée 2026-05-02) ✅

- [x] ProfileHeader desktop horizontal + mobile centré (Figma 6385:74429 / 6385:70500)
- [x] Cards À propos & ADN observateur
- [x] Tab Journal nature avec FeedPost + FeedGallery + filtres
- [x] Tab Inspirations (wrapper FeedGallery)
- [x] Tab Communauté (pills + UserCard avec arbre plein/creux)
- [x] Tab Statistiques (placeholder Bientôt)
- [x] EditProfilePanel (modification owner, sans backend)
- [x] ProfileOptionsMenu (visiteur)
- [x] Mode owner : Modifier + Paramètres (Figma 6385:77470)
- [x] Suppression posts owner via PostOptionsMenu existant
- [x] `<ProfileEmptyState />` factorisé
- [x] Audit + corrections (sécurité isOwnProfile, perf banner, robustesse tabs)
- [x] Notes backend complètes (`second-agent/03`)

### Phase 2 : Backend Supabase

- [ ] Appliquer les 6 migrations SQL
- [ ] Créer profileService, savedPostService, moderationService
- [ ] Brancher hooks React Query
- [ ] Optimistic updates sur Migrer (follow) + Save (bookmark)
- [ ] Storage Supabase pour avatar/banner (compression client → upload)
- [ ] RLS sur toutes les nouvelles tables
- [ ] Triggers compteurs dénormalisés

### Phase 3 : Statistiques + Paramètres

- [ ] Page `/settings` (notifs, langue, confidentialité, sécurité, suppression compte)
- [ ] Tab Statistiques activé : graphiques observations/espèces/streak
- [ ] RPC `get_profile_stats` côté Postgres
- [ ] Export données utilisateur (RGPD)

### Phase 4 : Polish a11y / i18n / perf

- [ ] Focus trap dans EditProfilePanel + ProfileOptionsMenu
- [ ] Navigation flèches WAI-ARIA dans ProfileTabs
- [ ] ~30 clés i18n FR/EN manquantes
- [ ] `prefers-reduced-motion` partout
- [ ] `<FollowButton>` extrait (Header + UserCard)
- [ ] Image responsive `srcset` mobile/desktop
- [ ] Tests E2E (Playwright) : visite profil, follow, save, edit

---

## Annexes

### A. Liens utiles

- [Backend notes (second-agent/03)](../second-agent/03-profil-backend-notes.md)
- [Tracking front (second-agent/README)](../second-agent/README.md)
- [GUIDELINES.md (éco-conception, a11y)](../GUIDELINES.md)
- [PRD Homepage](./PRD_HOMEPAGE.md) : pour la cohérence avec le feed

### B. Glossaire branding

| Terme produit   | Équivalent technique               |
| --------------- | ---------------------------------- |
| Migrateur       | follower                           |
| Migration       | following                          |
| Migrer (verbe)  | follow                             |
| Tu migres avec  | tu suis cette personne             |
| Inspiration     | bookmark / saved_post              |
| ADN observateur | distribution % par taxonomic_group |

### C. Validation

Ce PRD est validé par Nicolas le 2026-05-02 à l'issue de la finalisation
de la Phase 1 (UI complète visiteur + owner).
