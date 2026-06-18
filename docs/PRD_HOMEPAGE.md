# PRD : Homepage Naturegraph (Etat connecte & non connecte)

> Product Requirements Document
> Version : 1.2 : 2026-04-01 (audit Figma complet)
> Auteur : Nicolas (Lead Product Designer) + Claude (PM/Dev/UX/UI)
> Statut : Reference active : guide d'implementation

---

## Table des matieres

1. [Contexte & objectifs](#1-contexte--objectifs)
2. [Etats utilisateur](#2-etats-utilisateur)
3. [Layout & responsive](#3-layout--responsive)
4. [Navbar](#4-navbar)
5. [Sidebar gauche](#5-sidebar-gauche)
6. [Feed central](#6-feed-central)
7. [Carte de post (FeedPost)](#7-carte-de-post-feedpost)
8. [Types de posts](#8-types-de-posts)
9. [Formats photo](#9-formats-photo)
10. [Sidebar droite](#10-sidebar-droite)
11. [Overlays & modales](#11-overlays--modales)
12. [Dark mode](#12-dark-mode)
13. [Navigation mobile](#13-navigation-mobile)
14. [Architecture de donnees](#14-architecture-de-donnees)
15. [Internationalisation](#15-internationalisation)
16. [Accessibilite](#16-accessibilite)
17. [Performance & eco-conception](#17-performance--eco-conception)
18. [Inventaire composants](#18-inventaire-composants)
19. [TODO Backend](#19-todo-backend)
20. [Roadmap d'implementation](#20-roadmap-dimplementation)

---

## 1. Contexte & objectifs

### Pourquoi cette page ?

La homepage connectee est le **coeur de retention** de Naturegraph. C'est la page ou l'utilisateur revient chaque jour. Elle doit repondre en < 3 secondes a la question : _"Qu'est-ce qui se passe dans la biodiversite autour de moi en ce moment ?"_

Elle sert egalement de page d'accueil pour les visiteurs non connectes, qui decouvrent le produit via le feed public.

### Objectifs produit

| Objectif              | Mesure cible                                            |
| --------------------- | ------------------------------------------------------- |
| Retention quotidienne | DAU/MAU > 40%                                           |
| Engagement feed       | > 5 posts consultes / session                           |
| Taux de contribution  | > 15% des sessions connectees                           |
| Conversion visiteur   | > 10% des visiteurs non connectes cliquent "S'inscrire" |
| Performance           | LCP < 2.5s, < 300KB JS gzip                             |

### Sources de verite

| Source    | Role                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| **Figma** | Design de reference : [Homepage App Light](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6385-79299) |
| **Figma** | [Dark mode](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6385-37942)                                |
| **Figma** | [Formats photo](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6385-58353)                            |
| **Figma** | [Types de posts](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6385-61170)                           |
| **Code**  | `src/pages/Home.tsx` + `src/components/home/` (19 composants)                                                       |
| **Types** | `src/types/database.ts` : schema Supabase                                                                           |
| **Mock**  | `src/data/mock/` : 100+ posts, 25 users                                                                             |

---

## 2. Etats utilisateur

La homepage gere **2 etats principaux** et **12+ etats d'interaction**.

### 2.1 Etats principaux

#### Utilisateur connecte

```
Navbar:  [Logo] [📍 Ville, Region] [🔍] [🔔 badge] [+ Contribuer] [Avatar + nom + streak ▼]
Layout:  ProfileSidebar | Feed 3 tabs | StatsSidebar
Actions: Reagir, commenter, contribuer, sauvegarder, partager, filtrer
```

#### Utilisateur non connecte (visiteur / guest)

```
Navbar:  [Logo] [📍 Ville, Region] [🔍] [🔔] [+ Contribuer] [👤 Se connecter]
Layout:  GuestSidebar (migrateurs only) | Feed complet visible | StatsSidebar
Actions: Feed en lecture, CTA conversion sur les actions (Reagir → redirect /signup)
```

**Decision cle :** Le feed est **integralement visible** sans connexion. La conversion se fait a l'action, pas a la decouverte. Naturegraph est un produit de **decouverte d'abord**.

#### Sous-etat : non localise

Quand l'utilisateur n'a pas autorise la geolocalisation :

- Chip localisation sans texte (icone navigation seul)
- Sidebar gauche : migrateurs populaires globaux (rotation quotidienne)
- Sidebar droite : tendances globales (pas filtrees par territoire)
- Filtres : rayon geographique desactive

### 2.2 Carte des interactions (12 etats)

Depuis la Figma (node `6385:79299`) : chaque etat est un ecran distinct :

| #   | Etat             | Declencheur                   | Composant                         |
| --- | ---------------- | ----------------------------- | --------------------------------- |
| 1   | `non-connecte`   | Pas d'auth                    | GuestSidebar + "Se connecter" btn |
| 2   | `connecte`       | Auth valide                   | ProfileSidebar + avatar navbar    |
| 3   | `non-localise`   | Geolocation refusee           | Chip location vide                |
| 4   | `localisation`   | Clic chip location            | LocationModal                     |
| 5   | `recherche`      | Clic loupe navbar             | SearchPanel (overlay)             |
| 6   | `notifications`  | Clic cloche navbar            | NotificationsPanel (dropdown)     |
| 7   | `contribuer`     | Clic "+ Contribuer"           | ContributeModal (dropdown/sheet)  |
| 8   | `profil-menu`    | Clic avatar navbar            | ProfileMenu (dropdown/sheet)      |
| 9   | `galerie`        | Toggle vue grille             | FeedGallery (masonry)             |
| 10  | `filtres`        | Clic funnel icon              | FeedFilterPanel (panel lateral)   |
| 11  | `fullscreen`     | Clic photo post               | PhotoLightbox                     |
| 12  | `reactions`      | Clic "Reagir"                 | ReactionPicker (inline 6 emojis)  |
| 13  | `commentaires`   | Clic "Commentaires"           | CommentsSection (modal/sheet)     |
| 14  | `actions-post`   | Clic MoreHorizontal           | PostOptionsMenu                   |
| 15  | `signalement`    | Clic "Signaler" dans actions  | ReportModal (2 etapes)            |
| 16  | `supprimer`      | Clic "Supprimer" dans actions | DeleteConfirmModal                |
| 17  | `partager`       | Clic Share icon               | ShareModal                        |
| 18  | `aucun-resultat` | Filtres sans resultats        | FeedEmptyState (hermine)          |

---

## 3. Layout & responsive

### 3.1 Grille Figma

```
Columns: 12
Margin:  80px (XL) / 40px (Tablet) / 20px (Mobile)
Gutter:  32px (XL) / 24px (Desktop) / 16px (Mobile)
```

### 3.2 Structure par breakpoint

#### XL Desktop (>= 1280px) : Layout 3 colonnes

```
┌────────────────────────────────────────────────────────────┐
│  NAVBAR (sticky, h-[72px], z-50)                           │
├──────────┬─────────────────────────────────┬───────────────┤
│ LEFT     │ CENTER                          │ RIGHT         │
│ SIDEBAR  │                                 │ SIDEBAR       │
│ (w-64)   │ [Tabs] [View] [Filter]          │ (w-64)        │
│          │                                 │               │
│ Profile/ │ Post cards (list | masonry)     │ Impact        │
│ Guest    │ × 20 items / page               │ Tendances     │
│          │ [Charger plus]                  │               │
│ Migra-   │                                 │ "Voir toutes" │
│ teurs    │                                 │               │
└──────────┴─────────────────────────────────┴───────────────┘
```

#### Desktop (1024-1279px) : 3 colonnes (confirmee Figma)

```
┌────────────────────────────────────────────────────────────┐
│  NAVBAR (sticky, h-[72px], z-50 : full elements)           │
├──────────┬─────────────────────────────────┬───────────────┤
│ LEFT     │ CENTER                          │ RIGHT         │
│ SIDEBAR  │ [Tabs] [View] [Filter]          │ SIDEBAR       │
│          │ Post cards (1 photo visible)    │               │
│ Idem XL  │ [Charger plus]                 │ Idem XL       │
└──────────┴─────────────────────────────────┴───────────────┘
```

> **Note (audit Figma 2026-04-01)** : Figma confirme les sidebars visibles a Desktop (1024px+).
> Le breakpoint de masquage est Tablet (< 1024px), pas Desktop.

#### Tablet (768-1023px) : 1 colonne, pas de sidebars

```
┌─────────────────────────────────┐
│ NAVBAR (condensee : logo +      │
│ location + search + bell +      │
│ "+" icon + avatar)              │
├─────────────────────────────────┤
│ [Tabs visible]  [View] [Filter] │
│ FEED (full width, px-10)       │
│ Post cards                     │
│ [Charger plus]                 │
└─────────────────────────────────┘
```

#### Mobile (< 768px) : 1 colonne + bottom nav

```
┌──────────────────┐
│ NAVBAR (compact: │
│ logo + grid +    │
│ filter + bell)   │
├──────────────────┤
│ PAS DE TABS      │
│ (tri dans filtre)│
│ FEED (px-0)      │
│ Post cards       │
│ (full bleed)     │
├──────────────────┤
│ BOTTOM NAV + FAB │
│ (pb-safe-area)   │
└──────────────────┘
```

### 3.3 Visibilite des zones par breakpoint

| Zone                    | XL Desktop (>=1280)  | Desktop (1024-1279)  | Tablet (768-1023) | Mobile (<768)            |
| ----------------------- | -------------------- | -------------------- | ----------------- | ------------------------ |
| Left sidebar            | ✅ visible           | ✅ visible           | ❌ masquee        | ❌ masquee               |
| Right sidebar           | ✅ visible           | ✅ visible           | ❌ masquee        | ❌ masquee               |
| Feed tabs               | ✅ 4 tabs            | ✅ 4 tabs            | ✅ 4 tabs         | ❌ dans le panel filtres |
| View toggle (list/grid) | ✅ visible           | ✅ visible           | ✅ visible        | ✅ visible (navbar)      |
| Filter button           | ✅ visible           | ✅ visible           | ✅ visible        | ✅ visible (navbar)      |
| Navbar location chip    | ✅ texte             | ✅ texte             | ✅ texte          | ❌ masquee               |
| Navbar search           | ✅ icone             | ✅ icone             | ✅ icone          | ❌ via bottom nav        |
| Navbar notifications    | ✅ icone+badge       | ✅ icone+badge       | ✅ icone+badge    | ✅ icone+badge           |
| Navbar CTA Contribuer   | ✅ bouton+texte      | ✅ bouton+texte      | ✅ icone "+"      | ❌ via FAB               |
| Navbar user area        | ✅ avatar+nom+streak | ✅ avatar+nom+streak | ✅ avatar         | ❌ via bottom nav        |
| Bottom nav              | ❌ masquee           | ❌ masquee           | ❌ masquee        | ✅ visible               |

> **Correction audit Figma (2026-04-01)** : Sidebars visibles des 1024px (pas masquees a Desktop).
> Tabs 4 (pas 3) : Recent, Pour vous, Populaire, **Tendances**. Sur mobile, les tabs sont
> remplacees par un dropdown "Trier les resultats" integre dans le panel Filtres.

---

## 4. Navbar

### Fichier : `src/components/home/HomeNavbar.tsx`

### Statut : ✅ Implemente

### 4.1 Structure

```
[Logo "Naturegraph"]  ----  [📍 Localisation]  [🔍]  [🔔³]  [+ Contribuer]  [Avatar Nom ⌄]
     ↓                           ↓               ↓      ↓          ↓               ↓
   /home                   LocationModal    SearchPanel  Notifs  ContributeModal  ProfileMenu
```

### 4.2 Specs

- **Hauteur** : 72px
- **Position** : sticky top-0, z-50
- **Background** : `var(--bg-primary)` avec border-bottom 0.5px `var(--border)`
- **Max-width** : 1728px, mx-auto

### 4.3 Elements

| Element       | Connecte                                              | Non connecte                   |
| ------------- | ----------------------------------------------------- | ------------------------------ |
| Logo          | ✅ "Naturegraph" (Quicksand Bold teal)                | ✅ Identique                   |
| Location chip | ✅ `📍 Ville, Region`                                 | ✅ Identique (si permission)   |
| Recherche     | ✅ Icone loupe                                        | ✅ Identique                   |
| Notifications | ✅ Cloche + badge count (rouge)                       | ✅ Cloche sans badge           |
| + Contribuer  | ✅ Dropdown 2 types                                   | ✅ Redirect → /login           |
| User area     | ✅ Avatar (36px) + username + 🔥streak + chevron-down | ❌ Bouton ghost "Se connecter" |

### 4.4 Streak badge

- Affiche a cote du username : `🔥 14 jours`
- Si streak = 0 : `🔥 0 jour`
- Police : Caption (Mulish 400, 12px)
- Couleur : `var(--foreground-secondary)`

---

## 5. Sidebar gauche

### 5.1 Utilisateur connecte : ProfileSidebar

#### Fichier : `src/components/home/ProfileSidebar.tsx`

#### Statut : ✅ Implemente

```
┌──────────────────────────┐
│ [Banner image 80px]      │
│    [Avatar 64px + badge] │  ← avatar deborde sur le banner
│ Username (Quicksand Bold)│
│ [Tag1] [Tag2]            │  ← centres d'interet (pills)
├──────────────────────────┤
│ 🐦 127   📋 48   🔥 14   │  ← Obs. / Especes / Jours
├──────────────────────────┤
│ Cette semaine    20/24   │
│ [████████████░░░]        │  ← progress bar
├──────────────────────────┤
│                          │
│ 🌍 Migrateurs a suivre   │
│ [Avatar] Marie_Nature   >│
│   [Oiseaux] [Reptiles]   │
│ [Avatar] Thomas.Wildlife>│
│   [Insectes] [Oiseaux]   │
│ [Avatar] Lucas_Ornitho  >│
│   [Oiseaux]              │
└──────────────────────────┘
```

#### Specs composant

| Element             | Spec                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| Banner              | h-20 (80px), bg gradient ou image, rounded-t-card                          |
| Avatar              | size-16 (64px), rounded-full, border-2 border-white, -mt-8 (debordement)   |
| Badge emoji         | size-6 (24px), absolute bottom-0 right-0 de l'avatar                       |
| Username            | Quicksand Bold, text-lg                                                    |
| Interest pills      | rounded-full, bg-primary-light, text-primary, text-xs, px-3 py-1           |
| Stats grid          | 3 colonnes, icone 20px + valeur (Quicksand Bold text-xl) + label (Caption) |
| Progress bar        | h-2, rounded-full, bg-cream (track), bg-amber-500 (fill)                   |
| User suggestion row | h-14, flex items-center gap-3, hover:bg-cream, cursor-pointer              |
| Chevron             | size-4, text-muted, right side                                             |

#### Stats affichees

| Stat         | Icone               | Valeur            | Label     |
| ------------ | ------------------- | ----------------- | --------- |
| Observations | 🐦 (bird)           | Nombre total      | "Obs."    |
| Especes      | 📋 (clipboard-list) | Especes uniques   | "Especes" |
| Streak       | 🔥 (flame)          | Jours consecutifs | "Jours"   |

#### Migrateurs a suivre

- **Source** : `getSuggestedUsersByInterests()` : utilisateurs partageant les memes centres d'interet
- **Nombre** : 3 utilisateurs max
- **Clic** : navigate vers `/profile/:username`
- **TODO [BACKEND]** : `profileService.getSuggestedUsers()` base sur interests + proximite geographique

### 5.2 Visiteur non connecte : GuestSidebar

#### Fichier : `src/components/home/GuestSidebar.tsx`

#### Statut : ✅ Implemente

```
┌──────────────────────────┐
│ ❌ Pas de bloc profil     │
│                          │
│ 🌍 Migrateurs a suivre   │
│ [Avatar] Marie_Nature   >│
│   [Oiseaux] [Reptiles]   │
│ [Avatar] Thomas.Wildlife>│
│   [Insectes] [Oiseaux]   │
│ [Avatar] Lucas_Ornitho  >│
│   [Oiseaux]              │
└──────────────────────────┘
```

#### Logique de selection des migrateurs

| Condition                   | Comportement                                        |
| --------------------------- | --------------------------------------------------- |
| Utilisateur geolocalise     | Top utilisateurs actifs dans le territoire (region) |
| Utilisateur non geolocalise | Rotation quotidienne des plus populaires globaux    |

- **Rotation** : `getDailyRotation()` : seed base sur le jour
- **Detection geolocalisation** : silencieuse (check `navigator.permissions` sans prompt)
- **Nombre** : 3 utilisateurs max
- **Clic** : navigate vers `/profile/:username`

---

## 6. Feed central

### Fichier : `src/components/home/FeedSection.tsx`

### Statut : ✅ Implemente

### 6.1 En-tete du feed

```
[Récent ✓] [Pour vous] [Populaire]          [≡ Liste] [▦ Galerie] [▽ Filtres]
```

#### Tabs

| Tab                 | Tri                       | Statut MVP                          |
| ------------------- | ------------------------- | ----------------------------------- |
| **Recent** (defaut) | `created_at DESC`         | ✅ Implemente                       |
| **Pour vous**       | Algorithme recommandation | ⏳ Placeholder "Bientot disponible" |
| **Populaire**       | `total_reactions DESC`    | ✅ Implemente (tri mock)            |

- Tab actif : `bg-primary text-white rounded-full px-4 py-1`
- Tab inactif : `text-foreground hover:bg-cream rounded-full px-4 py-1`
- Police : Mulish 600, 14px

#### Toggle vue

| Vue            | Icone        | Comportement            |
| -------------- | ------------ | ----------------------- |
| Liste (defaut) | ≡ (bars)     | FeedPost cards empilees |
| Galerie        | ▦ (grid-2x2) | FeedGallery masonry     |

- Etat actif : `bg-cream border-border`
- Etat inactif : `text-muted hover:bg-cream`
- Persistance : `localStorage` (`feed-view-mode`)

#### Bouton filtres

- Icone : funnel (SlidersHorizontal)
- Etat actif (filtres appliques) : `bg-primary text-white` + badge count "Filtres (N)"
- Clic : ouvre `FeedFilterPanel` (panel lateral desktop / bottom sheet mobile)

### 6.2 Vue liste : FeedPost

Voir section [7. Carte de post](#7-carte-de-post-feedpost)

### 6.3 Vue galerie : FeedGallery

#### Fichier : `src/components/home/FeedGallery.tsx`

#### Statut : ✅ Implemente

Layout : **Masonry** (CSS `columns`, pas de librairie)

```
Colonnes par breakpoint :
  XL Desktop (>= 1280px) : 4 colonnes
  Desktop    (1024-1279px): 3 colonnes
  Tablet     (768-1023px) : 3 colonnes
  Mobile     (< 768px)    : 2 colonnes

Gap : var(--sp-16) (16px)
```

#### Carte galerie

```
┌────────────────────┐
│                    │
│   [Photo]          │  ← hauteur variable (aspect-ratio auto)
│                    │
│ ┌────────────────┐ │  ← overlay hover (desktop uniquement)
│ │ Titre post...  │ │
│ │ [👤] Username  │ │
│ └────────────────┘ │
└────────────────────┘
```

| Element           | Spec                                                                            |
| ----------------- | ------------------------------------------------------------------------------- |
| Container         | `break-inside: avoid`, rounded-card, overflow-hidden                            |
| Image             | width: 100%, height: auto, object-fit: cover                                    |
| Overlay           | gradient bottom-to-top (rgba(0,0,0,0.75) → transparent), opacity 0 → 1 au hover |
| Titre             | Mulish Bold 14px, white, line-clamp-1                                           |
| Avatar + username | size-6 avatar + Mulish 400 12px, white                                          |
| Hover             | `@media (hover: hover)` : pas de hover sur mobile/tactile                       |
| Transition        | opacity 200ms ease                                                              |
| Clic              | ouvre PhotoLightbox sur la photo                                                |

### 6.4 Pagination

**Regle absolue (CLAUDE.md) : PAS de scroll infini : pagination obligatoire.**

```
FEED_PAGE_SIZE = 20       // max items par page
```

- Bouton "Charger plus" en bas du feed (ghost button, full width)
- `IntersectionObserver` sur le bouton pour auto-trigger quand visible (UX fluide sans etre du scroll infini)
- Desactive quand `hasMore === false`
- Etat loading : spinner + texte "Chargement..."

### 6.5 Etat vide (aucun resultat)

#### Fichier : `src/components/home/FeedEmptyState.tsx`

#### Statut : ❌ A creer

```
┌──────────────────────────────┐
│                              │
│  [Illustration hermine +     │
│   papillon : mascotte        │
│   Naturegraph, style line    │
│   art bleu/gris]             │
│                              │
│  Aucune observation trouvee  │  ← Quicksand Bold, text-lg, center
│                              │
│  Essayez de modifier vos     │  ← Mulish 400, text-secondary, center
│  filtres pour voir plus      │
│  de resultats                │
│                              │
│  [Reinitialiser les filtres] │  ← ghost button, rounded-full, center
│                              │
└──────────────────────────────┘
```

> **Correction audit Figma** : 1 seul CTA ("Reinitialiser les filtres"), pas 3.
> L'icone filtre dans la navbar montre un badge compteur (ex: "2") quand des filtres sont actifs.
> L'illustration est le personnage hermine de Naturegraph (asset: `src/assets/images/hermine-empty-state.png`).

### 6.6 Panneau de filtres

#### Fichier : `src/components/home/FeedFilterPanel.tsx`

#### Statut : ✅ Implemente

Panel lateral droit (desktop) / Bottom sheet (mobile).

```
┌────────────────────────────────┐
│ Filtres                     ✕  │
├────────────────────────────────┤
│                                │
│ Par categorie d'especes        │
│ [Oiseaux] [Mammiferes]         │
│ [Insectes] [Amphibiens]        │
│ [Reptiles]                     │
│                                │
│ ☐ Afficher uniquement les      │
│   demandes d'aide              │
│                                │
│ Par type de partages           │
│ ☑ 🌿 Rencontre nature         │
│ ☑ 🏔️ Instant nature           │
│                                │
│ Resultats autour de toi,       │
│ dans un rayon de               │
│ [Tout] [100 km] [200 km]      │
│ [500 km]                       │
│                                │
│ Periode                        │
│ [Tout] [Aujourd'hui]           │
│ [Cette semaine] [Ce mois]      │
│                                │
├────────────────────────────────┤
│ [  Sauvegarder les filtres  ]  │  ← CTA primary, full width
│       Reinitialiser            │  ← text link, center
└────────────────────────────────┘
```

#### Variante mobile : section supplementaire

Sur mobile, le panel filtres integre le **tri du feed** en premiere section
(car les tabs ne sont pas visibles dans le header mobile) :

```
┌────────────────────────────────┐
│ Filtres                     ✕  │
├────────────────────────────────┤
│ Trier les resultats            │  ← SECTION MOBILE UNIQUEMENT
│ [Recent                     ▼] │  ← dropdown select
│                                │
│ Par categorie d'especes        │
│ ... (idem desktop)             │
└────────────────────────────────┘
```

| Element          | Spec                                                               |
| ---------------- | ------------------------------------------------------------------ |
| Dropdown "Trier" | select natif, bg-white, border-border, rounded-card, w-full        |
| Options          | "Recent" (defaut), "Pour vous", "Populaire", "Tendances"           |
| Visibilite       | **Mobile uniquement** : masque sur desktop/tablet qui ont les tabs |

#### Interface filtres

```typescript
interface FeedFilters {
  categories: string[] // ['Oiseaux', 'Mammiferes']
  helpOnly: boolean // demandes d'aide seulement
  shareTypes: { encounter: boolean; instant: boolean }
  radius: number // 0 (tout), 100, 200, 500 km
  period: 'all' | 'today' | 'week' | 'month'
}

const DEFAULT_FILTERS: FeedFilters = {
  categories: [],
  helpOnly: false,
  shareTypes: { encounter: true, instant: true },
  radius: 0,
  period: 'all',
}
```

#### Specs chips categories

| Etat    | Style                                                   |
| ------- | ------------------------------------------------------- |
| Inactif | border-[0.5px] border-border, bg-white, text-foreground |
| Actif   | bg-primary-light, border-primary, text-primary          |

#### Specs pills radius/periode

| Etat    | Style                                  |
| ------- | -------------------------------------- |
| Inactif | border-[0.5px] border-border, bg-white |
| Actif   | bg-primary, text-white, border-primary |

---

## 7. Carte de post (FeedPost)

### Fichier : `src/components/home/FeedPost.tsx`

### Statut : ✅ Implemente

### 7.1 Structure complete

```
┌─────────────────────────────────────────────────────────┐
│ [Avatar 48px + badge]  Marie_Nature            [⋯]     │
│                        🐦 02/02/2025 • Ploermel         │
├─────────────────────────────────────────────────────────┤
│ Rencontre matinale en foret                    (titre)  │
│ Lorem ipsum dolor sit amet...          Voir plus (lien) │
│ ● Ensoleille • ⛅ Nuageux • Apres-midi       (contexte) │
├─────────────────────────────────────────────────────────┤
│ [🦌 Mammiferes] [Chevreuil europeen (4)]      (badges)  │
├─────────────────────────────────────────────────────────┤
│ ┌────────────────────┬──────────────────────┐           │
│ │                    │                      │  (photos) │
│ │   Photo 1          │   Photo 2            │           │
│ │                    │                      │   1/4     │
│ └────────────────────┴──────────────────────┘           │
├─────────────────────────────────────────────────────────┤
│ ❤️19  😍14  🔥42  😱7  🧐19              💬 8  (reactions)│
├─────────────────────────────────────────────────────────┤
│ ♡ Reagir    💬 Commentaires          [🔖] [↗]  (actions)│
└─────────────────────────────────────────────────────────┘
```

### 7.2 Specs par zone

#### En-tete du post

| Element        | Spec                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| Avatar         | size-12 (48px), rounded-full                                               |
| Badge emoji    | size-5 (20px), absolute bottom-0 right-0, bg-white rounded-full            |
| Username       | Quicksand Bold, text-base (16px), clic → `/profile/:username`              |
| Date           | Mulish 400, text-sm, text-secondary, 🐦 icone avant la date                |
| Location       | Mulish 400, text-sm, text-secondary, separateur "•"                        |
| MoreHorizontal | size-8 (32px) button, rounded-full, hover:bg-cream, absolute top-4 right-4 |

#### Contenu texte

| Element        | Spec                                                  |
| -------------- | ----------------------------------------------------- |
| Titre          | Quicksand Bold, text-lg (18px), line-clamp-2          |
| Description    | Mulish 400, text-base, line-clamp-3, text-secondary   |
| "Voir plus"    | text-primary, cursor-pointer, expand le texte complet |
| Contexte meteo | Mulish 400, text-sm, emojis + texte, gap-2            |

#### Badges especes

| Element        | Spec                                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| Categorie pill | rounded-full, bg-primary-light, text-primary, text-sm, px-3 py-1, emoji prefix |
| Espece pill    | rounded-full, border-[0.5px] border-border, bg-white, text-sm, px-3 py-1       |
| Count espece   | entre parentheses : "Chevreuil europeen (4)"                                   |

#### Zone reactions

| Element       | Spec                                                     |
| ------------- | -------------------------------------------------------- |
| Emoji + count | flex gap-1, text-sm : ex: `❤️ 19 😍 14 🔥 42 😱 7 🧐 19` |
| Comment count | right-aligned, 💬 icone + count, text-sm text-secondary  |

#### Barre d'actions

| Element         | Spec                                    | Clic                                   |
| --------------- | --------------------------------------- | -------------------------------------- |
| ♡ Reagir        | flex gap-2, text-sm, hover:bg-cream     | Ouvre ReactionPicker (6 emojis inline) |
| 💬 Commentaires | flex gap-2, text-sm, hover:bg-cream     | Ouvre CommentsSection                  |
| 🔖 Sauvegarder  | right side, size-5 icon, hover:bg-cream | Toggle saved state                     |
| ↗ Partager      | right side, size-5 icon, hover:bg-cream | Ouvre ShareModal                       |

### 7.3 Reaction picker

Quand l'utilisateur clique sur "Reagir" :

```
Avant:
  ❤️19 😍14 🔥42 😱7 🧐19              💬 8     (reactions)
  ♡ Reagir    💬 Commentaires           🔖 ↗    (actions)

Apres:
  ❤️19 😍14 🔥42 😱7 🧐19              💬 8     (reactions)
  [❤️] [🔥] [😍] [😱] [🧐] [😕]                 (picker : nouvelle ligne)
  ♡ Reagir    💬 Commentaires           🔖 ↗    (actions : inchangee)
```

> **Correction audit Figma** : Le picker s'affiche comme une **ligne supplementaire**
> entre les compteurs de reactions et la barre d'actions. Il ne remplace PAS la barre.
> Les emojis sont dans des cercles colores (chaque emoji a un bg colore distinct).

| Element              | Spec                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| Container            | rounded-full, bg-white, border-[0.5px] border-border, shadow-md, px-2 py-1   |
| Emoji button         | size-9 (36px), rounded-full, hover:scale-110, hover:bg-cream                 |
| Transition           | scale 150ms ease                                                             |
| Selection            | ferme le picker, met a jour le compteur (optimistic update)                  |
| Re-clic meme emoji   | toggle off (retrait reaction)                                                |
| Emojis (ordre Figma) | ❤️ Amour, 🔥 Incroyable, 😍 Emerveillement, 😱 Surprise, 🧐 Curieux, 😕 Decu |

### 7.4 Guest mode (non connecte)

- `canInteract: false` passe en prop
- Clic sur Reagir / Commenter / Sauvegarder → redirect `/signup` avec message
- Feed visible en lecture seule complete
- Limite : `GUEST_MAX_POSTS = 20` : mur d'inscription apres la 20e carte

---

## 8. Types de posts

Depuis la Figma (node `6385:61170`) : **5 variantes visuelles**.

### 8.1 Types definis

```typescript
// src/types/database.ts
type PostType = 'nature_encounter' | 'nature_instant'

// Sous-types implicites (discrimines par les champs presents)
// - Rencontre nature standard (species + photos)
// - Instant nature (photos, pas de species obligatoire)
// - Collaboration (collaborators[])
// - Multi-especes (species[] sans photos)
// - Aide a l'identification (identificationStatus === 'pending')
```

### 8.2 Rencontre nature (standard)

Le type de post le plus courant.

```
[Avatar] Marie_Nature  🐦 02/02/2025 • Ploermel, Bretagne
Rencontre matinale en foret
Lorem ipsum dolor sit amet...
● Ensoleille • Nuageux • Apres-midi
[🦌 Mammiferes]  [Chevreuil europeen (4)]
[Photo 1] [Photo 2]           1/4
```

- Champs obligatoires : title, description, species (au moins 1), location
- Champs optionnels : photos (0-4), weather, timeOfDay, habitat

### 8.3 Instant nature

Partage d'un moment/paysage sans observation detaillee.

```
[Avatar] Marie_Nature  🐦 02/02/2025 • Ploermel, Bretagne
Sommet sous la neige
Description du paysage...
● Ensoleille • Nuageux • Apres-midi
[Photo plein format : paysage ou portrait]
```

- **Pas de badges especes** : pas d'obligation d'identifier
- Photos : 1-4 images (photo principale obligatoire)
- Champs : title, description, photos, weather, moment

### 8.4 Collaboration

Post partage avec d'autres utilisateurs.

```
[Avatar] Marie_Nature avec Oise_Vercors • 2 Amis
🐦 02/02/2025 • Ploermel, Bretagne
Rencontre matinale en foret
...
```

- **Sous-titre** : "avec [Username] • N Amis" : affiché sous le username
- Clic sur le collaborateur → navigate vers `/profile/:username`
- Memes champs que Rencontre nature + `collaborators: User[]`

### 8.5 Multi-especes (liste)

Post avec une liste d'observations sans photo principale.

```
[Avatar] Marie_Nature  🐦 02/02/2025 • Ploermel, Bretagne
Expedition a l'Observatoire
Suivi de 5 especes...
[🐦 Mammiferes]  [Chevreuil europeen (4)]

• Mammiferes × 3
  → Chevreuil europeen × 1
  → Couleuvrines × 2
• Oiseaux × 5
  → Merle noir × 3
  → Mesange bleue × 2
• Renard roux × 9
```

- **Photos optionnelles** (peut etre texte only)
- **Liste deroulable** d'especes avec icone categorie et compteur
- Categorie indentee avec especes enfants

### 8.6 Aide a l'identification

Post demandant l'aide de la communaute pour identifier une espece.

```
[Avatar] Marie_Nature  🐦 02/02/2025 • Ploermel, Bretagne
[🔍 Aide a l'identification]            ← badge special amber
Rencontre matinale en foret
Quelqu'un peut m'aider a identifier cet animal ?
[Photo]
```

- **Badge special** : `🔍 Aide a l'identification`
  - Style : bg-amber-100, text-amber-800, border-amber-300
  - Position : sous le header, avant le titre
- **identificationStatus** : `'pending'`
- Visible dans le filtre "Afficher uniquement les demandes d'aide"

---

## 9. Formats photo

Depuis la Figma (node `6385:58353`) : **4 layouts** selon le nombre de photos.

### 9.1 Logique de layout

```typescript
function getPhotoLayout(count: number): 'single' | 'double' | 'triple' | 'mosaic' | 'none' {
  if (count === 0) return 'none'
  if (count === 1) return 'single'
  if (count === 2) return 'double'
  if (count === 3) return 'triple'
  return 'mosaic' // 4+
}
```

### 9.2 Specs par layout

#### 1 photo : `single`

```
┌──────────────────────────────┐
│                              │
│        Photo unique          │  ← width: 100%, height: auto
│                              │  ← max-height: 480px
│                              │  ← object-fit: cover
└──────────────────────────────┘
```

- Respecte l'orientation originale (portrait = tall, paysage = wide)
- Border-radius : rounded-card (12px) sur les 4 coins
- Clic : ouvre PhotoLightbox

#### 2 photos : `double`

```
┌──────────────┬──────────────┐
│              │              │
│   Photo 1    │   Photo 2    │  ← 50% chacune
│              │              │  ← height: 320px
│              │              │  ← gap: 4px
└──────────────┴──────────────┘
```

- Grid 2 colonnes, gap-1 (4px)
- object-fit: cover
- Coins externes arrondis, coins internes droits

#### 3 photos : `triple`

```
┌──────────────┬──────────────┐
│              │   Photo 2    │
│   Photo 1    ├──────────────┤  ← grid: 1fr 1fr / 160px 160px
│   (grande)   │   Photo 3    │  ← Photo 1: grid-row span 2
│              │              │
└──────────────┴──────────────┘
```

- Photo 1 : grande a gauche (50%, full height)
- Photos 2 et 3 : empilees a droite (50%, half height chacune)
- Gap : 4px

#### 4 photos : `mosaic`

```
┌──────────────┬──────────────┐
│              │              │
│   Photo 1    │   Photo 2    │  ← 2 colonnes, 2 rangees
│              │              │
├──────────────┼──────────────┤
│              │              │
│   Photo 3    │  Photo 4 1/4 │  ← badge compteur si > 4
│              │              │
└──────────────┴──────────────┘
```

- Grid 2x2
- Badge compteur (`1/4`) en bas a droite de la derniere photo visible
- Style badge : bg-black/60, text-white, rounded-full, text-xs, px-2 py-0.5

### 9.3 Formats individuels

```typescript
// src/types/database.ts
type MediaFormat = 'square' | 'portrait' | 'landscape' | 'free'
```

- **Toutes les photos** : lazy loading (`loading="lazy"`)
- **Premieres 3 photos du feed** : `fetchpriority="high"` (LCP)
- **Dimensions explicites** : width + height en attributs HTML (eco-conception)
- **Format** : WebP/AVIF prefere (CLAUDE.md)

---

## 10. Sidebar droite

### Fichier : `src/components/home/StatsSidebar.tsx`

### Statut : ✅ Implemente

### 10.1 Structure

```
┌──────────────────────────────┐
│ 🌍 Impact      Ce mois-ci ▼  │
├──────────────┬───────────────┤
│ Observations │  Migrateurs   │
│   12,847     │    2,341      │
│  📈 +12%     │   📈 +8%      │
├──────────────┴───────────────┤
│                              │
│ 📈 Tendances  Cette semaine ▼│
│                              │
│ [📷] Rouge-gorge familier   >│
│      24 observations         │
│ [📷] Chevreuil europeen     >│
│      7 observations          │
│ [📷] Renard roux            >│
│      4 observations          │
│                              │
│ [  Voir toutes les tendances]│
│                              │
└──────────────────────────────┘
```

### 10.2 Section Impact

| Element          | Spec                                                               |
| ---------------- | ------------------------------------------------------------------ |
| Icone header     | 🌍 (Earth), size-5, text-teal-dark                                 |
| Titre            | "Impact", Quicksand Bold 18px                                      |
| Dropdown periode | "Ce mois-ci" / "Cette semaine" / "Ce trimestre", text-sm           |
| Carte stat       | bg-cream-lighter, rounded-card, px-4 py-3                          |
| Valeur           | Quicksand Bold, text-2xl (32px)                                    |
| Trend            | flex gap-1, icone trending-up (16px) + pourcentage, text-green-600 |
| Label            | Mulish 400, text-xs, text-secondary, tracking-wide                 |

### 10.3 Section Tendances

| Element           | Spec                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Icone header      | 📈 (trending-up), size-5, text-teal-dark                                                               |
| Titre             | "Tendances", Quicksand Bold 18px                                                                       |
| Dropdown          | "Cette semaine" / "Ce mois-ci"                                                                         |
| Espece row        | h-16 (64px), flex items-center gap-3, hover:bg-cream, cursor-pointer                                   |
| Photo espece      | size-12 (48px), rounded-card                                                                           |
| Nom espece        | Mulish Bold, text-sm                                                                                   |
| Count             | Mulish 400, text-xs, text-secondary : "24 observations"                                                |
| Chevron           | size-4, text-muted, right side                                                                         |
| CTA "Voir toutes" | w-full, h-10, rounded-full, border-[0.5px] border-border, bg-white, hover:bg-cream, Mulish 600 text-sm |

### 10.4 Logique de donnees tendances

| Condition              | Comportement                                                    |
| ---------------------- | --------------------------------------------------------------- |
| Geolocalise            | Top 3 especes observees dans le territoire (region/departement) |
| Non geolocalise        | Top 3 especes globales sur la plateforme                        |
| Categorie filtre actif | Top 3 lié a la categorie selectionnee                           |
| Clic espece            | Navigate `/explore?species=nom-espece`                          |
| < 3 resultats          | Afficher les disponibles (pas de placeholder)                   |
| 0 resultats            | Masquer la section Tendances                                    |

---

## 11. Overlays & modales

### 11.1 ContributeModal (dropdown contribution)

#### Fichier : `src/components/home/ContributeModal.tsx`

#### Statut : ✅ Implemente

Desktop : dropdown absolue sous le bouton navbar
Mobile : bottom sheet plein largeur

```
┌────────────────────────────────────┐
│ 🏔️  Instant nature                │  ← masque actuellement (hidden: true)
│     Partage un paysage ou un       │
│     phenomene naturel qui t'a      │
│     marque.                        │
├────────────────────────────────────┤
│ 🦅  Rencontre nature        ★     │  ← highlighted (visible)
│     Contribue en ajoutant une      │
│     observation animale, avec      │
│     ou sans photo.                 │
└────────────────────────────────────┘
```

| Element            | Spec                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| Dropdown width     | w-80 (320px)                                                             |
| Position           | absolute top-[calc(100%+8px)] right-0                                    |
| Background         | bg-white, rounded-card, shadow-lg, border-[0.5px] border-border          |
| Option row         | h-[72px], px-4, gap-4, flex items-center, hover:bg-cream                 |
| Icone container    | size-11 (44px), rounded-card, flex center                                |
| Instant icone bg   | bg-amber-100                                                             |
| Rencontre icone bg | bg-teal-100                                                              |
| Titre option       | Mulish Bold, text-base                                                   |
| Description option | Mulish 400, text-sm, text-secondary                                      |
| Navigation         | `/contribute?type=nature_instant` ou `/contribute?type=nature_encounter` |
| Fermeture          | clic outside, Escape                                                     |

**Decision (Nicolas, 2026-04-01) :** `nature_instant` reste masque (`hidden: true`) jusqu'a nouvel ordre. Seul `nature_encounter` est actif dans le dropdown.

### 11.2 ProfileMenu

#### Fichier : `src/components/home/ProfileMenu.tsx`

#### Statut : ✅ Implemente

Desktop : dropdown absolue sous l'avatar navbar
Mobile : bottom sheet

```
┌─────────────────────────────┐
│ [Avatar] Oiseaux_et_Nature  │
│          @oiseauxnature     │
├─────────────────────────────┤
│ Principal                   │
│ 👤  Mon profil         ★    │  ← highlighted teal
│ ⚙️  Parametres              │
├─────────────────────────────┤
│ Theme                       │
│ 🎨  Apparence     Clair >   │
├─────────────────────────────┤
│ Accessibilite               │
│ Aa  Taille      Moyenne >   │
│ ◐   Contraste renforce  ○   │  ← toggle
├─────────────────────────────┤
│ ⏏   Deconnexion             │  ← text-red-600
│     App version 0.0.1       │
└─────────────────────────────┘
```

| Section       | Items                                                          |
| ------------- | -------------------------------------------------------------- |
| Principal     | Mon profil → `/profile`, Parametres → `/settings`              |
| Theme         | Apparence → cycle Light/Dark (stocke dans ThemeContext)        |
| Accessibilite | Taille texte (small/medium/large), Contraste renforce (toggle) |
| Danger        | Deconnexion → `signOut()` + redirect `/`                       |

### 11.3 SearchPanel

#### Fichier : `src/components/home/SearchPanel.tsx`

#### Statut : ✅ Implemente

Overlay panel (z-[60]) depuis la navbar.

```
┌─────────────────────────────────┐
│ Recherche                    ✕  │
├─────────────────────────────────┤
│ 🔍 Rechercher dans Naturegraph │
├─────────────────────────────────┤
│ [Especes] [Comptes]             │  ← tabs filtres
├─────────────────────────────────┤
│ Recent           Tout effacer   │
│                                 │
│ [Avatar] Sophie Martin       ✕  │
│   [Mammiferes] [Reptiles]      │
│ [Avatar] Chris_Vercors       ✕  │
│   [Mollusques]                  │
└─────────────────────────────────┘
```

### 11.4 NotificationsPanel

#### Fichier : `src/components/home/NotificationsPanel.tsx`

#### Statut : ✅ Implemente

Dropdown overlay depuis la cloche navbar.

```
┌─────────────────────────────────────────────┐
│ Notifications                            ✕  │
├─────────────────────────────────────────────┤
│ Hier                                        │
│                                             │
│ [Avatar] Nouvelle reaction          11:23 • │
│ @sophiemartin et 80 autres personnes        │
│ ont reagi votre photo.                      │
│                                             │
│ [Avatar] Nouveau migrateur          11:23 • │
│ @chris_vercors vient de commencer sa        │
│ migration vers votre compte.                │
│ Voir son profil                             │
│                                             │
│ Il y a 3 jours                              │
│                                             │
│ [Avatar] Nouvelle reaction          11:23   │
│ @sophiemartin a reagi a votre photo.        │
└─────────────────────────────────────────────┘
```

#### Types de notifications

| Type              | Badge               | Couleur badge               |
| ----------------- | ------------------- | --------------------------- |
| Nouvelle reaction | "Nouvelle reaction" | bg-amber-100 text-amber-700 |
| Nouveau migrateur | "Nouveau migrateur" | bg-teal-100 text-teal-700   |

#### Indicateur non lu

- Dot bleu (size-2, bg-blue-500) a droite du timestamp
- Background non lu : bg-blue-50/5 (tres subtil)
- Background lu : transparent

### 11.5 PhotoLightbox

#### Fichier : `src/components/home/PhotoLightbox.tsx`

#### Statut : ✅ Implemente

Overlay plein ecran sombre.

```
┌─────────────────────────────────────────────────┐
│ 1 / 2              [titre]       [↗ share] [✕]  │
├─────────────────────────────────────────────────┤
│                                                 │
│   ←     [    IMAGE PLEIN ECRAN      ]      →    │
│                                                 │
│   @marienature                                  │
├─────────────────────────────────────────────────┤
│               [thumb1] [thumb2]                 │
└─────────────────────────────────────────────────┘
```

| Element            | Spec                                                               |
| ------------------ | ------------------------------------------------------------------ |
| Background overlay | bg-black/90, z-[70]                                                |
| Counter            | "1 / 2", Quicksand Bold, text-white, top-left                      |
| Close              | × button, top-right, text-white, hover:bg-white/10                 |
| Share              | ↗ icon, top-right (avant close)                                    |
| Image              | max-height: 80vh, object-fit: contain                              |
| Author             | "@username", text-white, position absolute bottom-left sur l'image |
| Thumbnails         | 48x48px, rounded-S, bottom center, active: border-2 border-white   |
| Navigation         | ← → arrows (size-12 buttons, bg-white/10, hover:bg-white/20)       |
| Keyboard           | Escape = close, ← → = navigation                                   |
| Swipe              | Touch swipe left/right (mobile)                                    |

### 11.6 CommentsSection

#### Fichier : `src/components/home/CommentsSection.tsx`

#### Statut : ✅ Implemente

Desktop : modale centree (z-[60])
Mobile : bottom sheet

- Liste de commentaires avec avatar + username + timestamp + texte
- Textarea auto-expand pour ecrire un commentaire
- Raccourci Ctrl+Enter pour envoyer
- Optimistic update pattern
- Guest : lien vers /signup au lieu du textarea

### 11.7 PostOptionsMenu

#### Fichier : `src/components/home/PostOptionsMenu.tsx`

#### Statut : ✅ Implemente

Menu contextuel (dropdown desktop / bottom sheet mobile) sur le bouton MoreHorizontal (⋯).

**Mon observation (3 items) :**

| #   | Item                      | Description                             | Icone          |
| --- | ------------------------- | --------------------------------------- | -------------- |
| 1   | Modifier mon observation  | "Vous pouvez corriger les informations" | ✏️ pen         |
| 2   | Copier le lien            | "Partager facilement l'observation"     | 📋 copy        |
| 3   | Supprimer mon observation | "Etes-vous sur de vouloir supprimer ?"  | 🗑️ trash (red) |

**Observation d'autrui (6 items) :**

| #   | Item                      | Description                            | Icone | Style                   |
| --- | ------------------------- | -------------------------------------- | ----- | ----------------------- |
| 1   | Ne plus suivre @user      | "Vous ne verrez plus ses publications" | 👤✕   | normal                  |
| 2   | Ajouter aux favoris       | "Enregistrer pour plus tard"           | 🔖    | **highlighted teal bg** |
| 3   | Copier le lien            | "Partager facilement l'observation"    | 📋    | normal                  |
| 4   | Masquer @user             | "Ne plus voir ses publications"        | 🔇    | normal                  |
| 5   | Masquer cette publication | "Voir moins de contenu comme celui-ci" | 🚫    | normal                  |
| 6   | Signaler la publication   | "Contenu inapproprie ou spam"          | 🚩    | **red text**            |

### 11.8 ReportModal (signalement)

#### Fichier : `src/components/home/ReportModal.tsx`

#### Statut : ✅ Implemente

Modale centree (desktop) / bottom sheet (mobile).

```
┌──────────────────────────────┐
│ Signaler                  ✕  │
│                              │
│ Selectionnez la raison du    │
│ signalement, puis cliquez    │
│ sur Soumettre. L'equipe      │
│ examinera la demande et      │
│ prendra les mesures          │
│ appropriees.                 │
│                              │
│ [Raison du signalement... ▼] │  ← dropdown select (pas radio)
│                              │
│ [Annuler]    [Soumettre]     │  ← ghost + primary
└──────────────────────────────┘
```

> **Correction audit Figma** : 1 etape avec dropdown select (pas 2 etapes avec radio buttons).

### 11.9 DeleteConfirmModal

#### Fichier : `src/components/home/DeleteConfirmModal.tsx`

#### Statut : ✅ Implemente

```
┌──────────────────────────────┐
│ Supprimer l'observation ?    │
│                              │
│ Cette action supprimera      │
│ definitivement votre         │
│ observation et toutes les    │
│ interactions associees.      │
│                              │
│ ⚠ Cette action est           │
│   irreversible               │
│                              │
│ [Annuler]  [Confirmer]       │
│             (rouge)          │
└──────────────────────────────┘
```

### 11.10 ShareModal

#### Statut : ❌ A creer

Modale centree (desktop) / bottom sheet (mobile).

```
┌──────────────────────────────┐
│ Partager l'observation    ✕  │
│                              │
│ [WhatsApp] [Instagram]       │
│ [Messenger] [Gmail]          │  ← 4 icones cercles + label
│                              │
│ Copier le lien :             │
│ [https://naturegraph.ca/...] │  ← input readonly + icone copie
│            [📋]              │
└──────────────────────────────┘
```

| Element         | Spec                                                     |
| --------------- | -------------------------------------------------------- |
| Titre           | "Partager l'observation", Quicksand Bold 18px            |
| Icones sociales | 4 cercles (48px) : WhatsApp, Instagram, Messenger, Gmail |
| Labels          | Mulish 400, text-sm, sous chaque icone                   |
| Input lien      | readonly, bg-cream, rounded-card, text-sm, truncate      |
| Bouton copie    | icone clipboard, hover:bg-cream, toast "Lien copie !"    |
| Fermeture       | × top-right, Escape                                      |

### 11.11 LocationModal

#### Fichier : `src/components/home/LocationModal.tsx`

#### Statut : ✅ Implemente

Modale centree (desktop) / bottom sheet (mobile).

```
┌──────────────────────────────┐
│ Localisation              ✕  │
│                              │
│ [🔍 Rechercher un lieu...][📍]│  ← input + bouton GPS
│                              │
│ Distance en km    [250km]    │
│ 0 ────●──────────────── 500  │  ← slider range
│                              │
│ [Annuler]    [Appliquer]     │
└──────────────────────────────┘
```

> **Correction audit Figma** : Pas de carte OpenStreetMap.
> Juste un input recherche + bouton geolocalisation GPS + slider distance (0-500km).

| Element         | Spec                                                            |
| --------------- | --------------------------------------------------------------- |
| Input recherche | placeholder "Rechercher un lieu...", bg-cream, rounded-card     |
| Bouton GPS      | icone crosshairs, right side de l'input, trigger geoloc browser |
| Slider          | range 0-500km, step ~50km, badge valeur au-dessus du handle     |
| Badge valeur    | pill bg-foreground text-white, "250km"                          |
| Annuler         | ghost button                                                    |
| Appliquer       | primary button                                                  |

---

## 12. Dark mode

### Source Figma : node `6385:37942`

### Statut : ⏸️ Reporte (Decision Nicolas, 2026-04-01)

**Decision :** Le dark mode est reporte a plus tard. Implementation non prioritaire pour le MVP. Les specs ci-dessous sont conservees comme reference pour le futur sprint dark mode.

Le dark mode reprend la **meme structure et le meme layout** : seules les couleurs changent via CSS custom properties.

### 12.1 Tokens dark mode

```scss
// src/styles/themes/_dark-theme.scss
:root[data-theme='dark'] {
  // Backgrounds
  --bg-primary: #13131a; // fond page
  --bg-secondary: #1a1a2e; // sidebars, cards
  --bg-tertiary: #1e1e35; // hover, inputs
  --bg-cream: #1a1a2e; // alias pour cream en dark

  // Texte
  --foreground: #f0f0f5; // texte principal
  --foreground-secondary: #9494b8; // texte secondaire
  --foreground-muted: #5a5a7a; // texte discret

  // Borders
  --border: #2a2a45;
  --border-light: #22223a;

  // Actions (invariants)
  --color-primary: #5f5dd8; // violet : identique light/dark
  --color-primary-light: #2a2870; // version sombre du primary-light

  // Teal (invariant)
  --color-teal: #006666;

  // Composants
  --card-bg: #1c1c30;
  --sidebar-bg: #1a1a2e;
  --navbar-bg: #13131a;
  --stats-card-bg: #0d0d20;
}
```

### 12.2 Elements invariants entre light et dark

| Element                   | Comportement                   |
| ------------------------- | ------------------------------ |
| Violet primaire (#5F5DD8) | Identique                      |
| Avatar banners            | Couleurs preservees            |
| Photos                    | Pas de filtre (images reelles) |
| Emojis reactions          | Pas d'inversion                |
| Liens teal                | Identique                      |

### 12.3 Elements qui changent

| Element            | Light                      | Dark                      |
| ------------------ | -------------------------- | ------------------------- |
| Page bg            | #FFFDF8 (warm white)       | #13131A (near-black)      |
| Card bg            | #FFFFFF                    | #1C1C30                   |
| Card border        | #C4C4CC 0.5px              | #2A2A45 0.5px             |
| Sidebar bg         | #FFFAF0                    | #1A1A2E                   |
| Text primary       | #0C0C14                    | #F0F0F5                   |
| Text secondary     | #20203D                    | #9494B8                   |
| Interest pills     | bg-primary-light (#E7E9F7) | bg-primary-dark (#2A2870) |
| Stats cards        | bg #FFF4E0                 | bg #0D0D20                |
| Progress bar track | bg-cream                   | bg-[#2A2A45]              |
| Progress bar fill  | bg-amber-500               | bg-amber-500 (identique)  |
| Hover state        | bg-cream                   | bg-[#1E1E35]              |
| Lightbox overlay   | bg-black/90                | bg-black/95               |

### 12.4 Bascule theme

- **ProfileMenu** → Apparence → toggle Light/Dark
- Stocke dans `ThemeContext` + `localStorage`
- Applique `data-theme="dark"` sur `<html>`
- Les CSS custom properties font le travail automatiquement
- `prefers-color-scheme` media query pour le choix initial

---

## 13. Navigation mobile

### Fichier : `src/components/home/MobileBottomNav.tsx`

### Statut : ✅ Implemente

### 13.1 Structure

```
┌────────────────────────────────────────────────┐
│  🏠        🔍        [+]        🔔        👤   │
│ Accueil  Explorer    FAB    Recherche  Profil  │
└────────────────────────────────────────────────┘
```

### 13.2 Specs

| Element      | Spec                                                                  |
| ------------ | --------------------------------------------------------------------- |
| Container    | fixed bottom-0, w-full, md:hidden, bg-white, border-t, z-40           |
| Safe area    | `pb-[env(safe-area-inset-bottom)]`                                    |
| Items        | 5 (equidistribues, flex justify-around)                               |
| FAB          | size-14 (56px), bg-primary, rounded-full, -mt-7 (sureleve), shadow-lg |
| FAB guest    | hidden (pas de contribution pour les guests sur mobile)               |
| Item actif   | text-primary, `aria-current="page"`                                   |
| Item inactif | text-muted                                                            |

### 13.3 Items (confirmes par audit Figma)

| #   | Item      | Icone Figma                 | Route / Action                    | Auth requise            |
| --- | --------- | --------------------------- | --------------------------------- | ----------------------- |
| 1   | Menu      | ≡ hamburger (3 lignes)      | Ouvre un menu lateral (a definir) | Non                     |
| 2   | Accueil   | 🏠 Home                     | `/home`                           | Non                     |
| 3   | FAB (+)   | ➕ Plus (cercle sureleve)   | Ouvre ContributeModal             | Oui (masque si guest)   |
| 4   | Recherche | 🔍 Search                   | Ouvre SearchPanel                 | Non                     |
| 5   | Profil    | Avatar utilisateur (cercle) | `/profile`                        | Oui (→ /login si guest) |

> **Correction audit Figma** : Le 1er item est un hamburger menu (≡), pas "Explorer" avec Compass.
> Le 5e item est l'avatar de l'utilisateur, pas une icone User generique.

---

## 14. Architecture de donnees

### 14.1 Types principaux

```typescript
// src/types/database.ts

// Enums
type PostType = 'nature_encounter' | 'nature_instant'
type PostStatus = 'draft' | 'published' | 'archived'
type Visibility = 'public' | 'private' | 'followers'
type IdentificationStatus = 'identified' | 'pending' | 'disputed'
type TaxonomicGroup =
  | 'birds'
  | 'mammals'
  | 'insects'
  | 'amphibians'
  | 'reptiles'
  | 'arachnids'
  | 'mollusks'
  | 'fish'
  | 'plants'
  | 'other'
type TimeOfDay = 'morning' | 'afternoon' | 'dusk' | 'evening' | 'night'
type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'snowy'
type HabitatType =
  | 'forest'
  | 'park_garden'
  | 'prairie_heath'
  | 'urban'
  | 'river'
  | 'lake_wetland'
  | 'mountain'
  | 'sea_coast'
type ReactionType = 'love' | 'fire' | 'hands' | 'trophy' | 'star' | 'disappointed'
type MediaType = 'photo' | 'video'
type MediaFormat = 'square' | 'portrait' | 'landscape' | 'free'
```

### 14.2 Interface Feed

```typescript
// src/types/data.ts
interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

interface SearchFilters {
  query?: string
  type?: PostType
  taxonomicGroup?: TaxonomicGroup
  habitat?: HabitatType
  status?: PostStatus
  location?: { latitude: number; longitude: number; radius: number }
}
```

### 14.3 Interface filtres feed

```typescript
// src/components/home/FeedFilterPanel.tsx
interface FeedFilters {
  categories: string[]
  helpOnly: boolean
  shareTypes: { encounter: boolean; instant: boolean }
  radius: number // 0 = tout, 100, 200, 500 km
  period: 'all' | 'today' | 'week' | 'month'
}
```

### 14.4 Donnees mock

| Fichier                         | Contenu                                 | Volume                  |
| ------------------------------- | --------------------------------------- | ----------------------- |
| `src/data/mock/posts.ts`        | Posts (NatureEncounter + NatureInstant) | 100+ items              |
| `src/data/mock/users.ts`        | Profils utilisateurs fictifs            | 25 users                |
| `src/data/mock/media.ts`        | Photos Unsplash (1-4 par post)          | ~200 medias             |
| `src/data/mock/species.ts`      | Categories et especes                   | Reference taxonomique   |
| `src/data/mock/observations.ts` | Donnees complementaires                 | Observations detaillees |

---

## 15. Internationalisation

### Fichier : `src/i18n/locales/fr.json` et `en.json`

### Statut : ✅ Cles existantes

### 15.1 Namespace `home.*`

```
home.feed.recent          "Recent"
home.feed.forYou          "Pour vous"
home.feed.popular         "Populaire"
home.feed.listView        "Vue liste"
home.feed.gridView        "Vue galerie"
home.feed.filterObs       "Filtrer les observations"
home.filters.*            (ensemble du panneau filtres)

home.post.react           "Reagir"
home.post.comments        "Commentaires"
home.post.save            "Sauvegarder"
home.post.share           "Partager"
home.post.seeMore         "Voir plus"
home.post.seeLess         "Voir moins"
home.post.commentCount    "{{count}} commentaire(s)"
home.post.optionsMenu     "Options du post"
home.post.reactions.*     (love, admire, fire, wow, curious)

home.sidebar.migratorsTitle     "Migrateurs a suivre"
home.sidebar.migratorsDaily     "Populaires du jour"
home.sidebar.migratorsTerritory "Pres de chez vous"

home.stats.impact         "Impact"
home.stats.observations   "Observations"
home.stats.migrators      "Migrateurs"
home.stats.thisMonth      "Ce mois-ci"
home.trending.thisWeek    "Cette semaine"
home.trending.viewAll     "Voir toutes les tendances"

home.profile.avatarAlt    "Photo de profil"

home.navbar.changeLocation "Changer la localisation"
home.navbar.search         "Rechercher"
home.navbar.notifications  "Notifications"
home.navbar.contribute     "Contribuer"
home.navbar.login          "Se connecter"
```

---

## 16. Accessibilite

### Statut : ✅ Implemente (WCAG AA)

### 16.1 Checklist implementee

| Critere                           | Implementation                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Contraste >= 4.5:1 (texte)        | ✅ Tokens design system verifies                                               |
| Contraste >= 3:1 (UI/grand texte) | ✅ Bordures et icones conformes                                                |
| Navigation clavier complete       | ✅ Tab order, focus-visible:ring-2                                             |
| Focus visible                     | ✅ `focus-visible:ring-2 focus-visible:ring-primary`                           |
| HTML semantique                   | ✅ `<article>`, `<aside>`, `<main id="main-content">`, `<header>`, `<section>` |
| Aria labels                       | ✅ Sur tous les boutons icone-only                                             |
| Alt text images                   | ✅ Descriptions especes et photos                                              |
| Skip link                         | ✅ Dans MainLayout                                                             |
| Lang attribute                    | ✅ `<html lang="fr">` dynamique                                                |
| Formulaires accessibles           | ✅ Labels associes, messages d'erreur                                          |
| `aria-expanded` dropdowns         | ✅ Sur tous les toggles                                                        |
| `aria-pressed` boutons toggle     | ✅ Reactions, sauvegarder                                                      |
| `aria-haspopup` menus             | ✅ ProfileMenu, PostOptionsMenu                                                |
| Progress bars                     | ✅ `aria-valuenow/min/max`                                                     |
| `prefers-reduced-motion`          | ✅ Respecte (pas d'animation superflue)                                        |
| Contraste renforce                | ✅ Toggle dans ProfileMenu                                                     |

---

## 17. Performance & eco-conception

### 17.1 Budget

| Metrique       | Seuil           | Implementation                             |
| -------------- | --------------- | ------------------------------------------ |
| JS gzip total  | < 300KB         | ✅ Code splitting par route (lazy)         |
| Total par page | < 500KB         | ✅ Optimisation images                     |
| LCP            | < 2.5s          | ✅ fetchpriority sur premiers posts        |
| Images         | WebP/AVIF, lazy | ✅ `loading="lazy"`, dimensions explicites |
| Pagination     | Max 20 items    | ✅ `FEED_PAGE_SIZE = 20`                   |
| Scroll infini  | INTERDIT        | ✅ Bouton "Charger plus"                   |

### 17.2 Optimisations appliquees

| Technique                 | Detail                                    |
| ------------------------- | ----------------------------------------- |
| Code splitting            | `React.lazy()` sur Home, toutes les pages |
| Lazy loading images       | `loading="lazy"` + `IntersectionObserver` |
| Dimensions explicites     | width + height sur toutes les images      |
| CSS columns (masonry)     | Natif CSS, pas de librairie JS            |
| Pas de dependance inutile | Aucun package tiers pour le feed          |
| `prefers-reduced-motion`  | Respecte pour toutes les transitions      |
| Pas d'animation superflue | Transitions CSS subtiles uniquement       |

---

## 18. Inventaire composants

### 18.1 Composants existants (19 fichiers)

| #   | Composant          | Fichier                       | Statut     | Lignes |
| --- | ------------------ | ----------------------------- | ---------- | ------ |
| 1   | HomeNavbar         | `home/HomeNavbar.tsx`         | ✅ Complet | ~250   |
| 2   | FeedSection        | `home/FeedSection.tsx`        | ✅ Complet | ~200   |
| 3   | FeedPost           | `home/FeedPost.tsx`           | ✅ Complet | ~350   |
| 4   | FeedGallery        | `home/FeedGallery.tsx`        | ✅ Complet | ~180   |
| 5   | FeedFilterPanel    | `home/FeedFilterPanel.tsx`    | ✅ Complet | ~250   |
| 6   | ProfileSidebar     | `home/ProfileSidebar.tsx`     | ✅ Complet | ~200   |
| 7   | GuestSidebar       | `home/GuestSidebar.tsx`       | ✅ Complet | ~120   |
| 8   | StatsSidebar       | `home/StatsSidebar.tsx`       | ✅ Complet | ~150   |
| 9   | ContributeModal    | `home/ContributeModal.tsx`    | ✅ Complet | ~180   |
| 10  | ProfileMenu        | `home/ProfileMenu.tsx`        | ✅ Complet | ~335   |
| 11  | SearchPanel        | `home/SearchPanel.tsx`        | ✅ Complet | ~200   |
| 12  | NotificationsPanel | `home/NotificationsPanel.tsx` | ✅ Complet | ~180   |
| 13  | LocationModal      | `home/LocationModal.tsx`      | ✅ Complet | ~150   |
| 14  | PhotoLightbox      | `home/PhotoLightbox.tsx`      | ✅ Complet | ~200   |
| 15  | CommentsSection    | `home/CommentsSection.tsx`    | ✅ Complet | ~250   |
| 16  | PostOptionsMenu    | `home/PostOptionsMenu.tsx`    | ✅ Complet | ~150   |
| 17  | DeleteConfirmModal | `home/DeleteConfirmModal.tsx` | ✅ Complet | ~120   |
| 18  | ReportModal        | `home/ReportModal.tsx`        | ✅ Complet | ~180   |
| 19  | MobileBottomNav    | `home/MobileBottomNav.tsx`    | ✅ Complet | ~130   |

### 18.2 Composants a creer

| #   | Composant      | Fichier                   | Raison                                          |
| --- | -------------- | ------------------------- | ----------------------------------------------- |
| 1   | FeedEmptyState | `home/FeedEmptyState.tsx` | Etat vide quand les filtres ne retournent rien  |
| 2   | FeedPagination | `home/FeedPagination.tsx` | Bouton "Charger plus" + IntersectionObserver    |
| 3   | ShareModal     | `home/ShareModal.tsx`     | Modale de partage (copier lien + partage natif) |

### 18.3 Page principale

| Fichier              | Role                                                           |
| -------------------- | -------------------------------------------------------------- |
| `src/pages/Home.tsx` | Assemblage : HomeNavbar + 3 colonnes + MobileBottomNav         |
| `src/router.tsx`     | Route `/home` → Home (pas de ProtectedRoute, accessible guest) |

---

## 19. TODO Backend

### 19.1 Services a creer

```typescript
// src/services/postService.ts
interface PostService {
  getFeed(params: {
    page: number
    sort: 'recent' | 'popular'
    filters: FeedFilters
    location?: { lat: number; lng: number }
  }): Promise<PaginatedResponse<Post>>

  getPost(id: string): Promise<Post>
  createPost(data: CreatePostInput): Promise<Post>
  updatePost(id: string, data: UpdatePostInput): Promise<Post>
  deletePost(id: string): Promise<void>
  reportPost(id: string, reason: string, details?: string): Promise<void>
}

// src/services/reactionService.ts
interface ReactionService {
  toggleReaction(postId: string, type: ReactionType): Promise<void>
  getReactions(postId: string): Promise<ReactionCounts>
}

// src/services/commentService.ts
interface CommentService {
  getComments(postId: string, page: number): Promise<PaginatedResponse<Comment>>
  createComment(postId: string, content: string): Promise<Comment>
  deleteComment(commentId: string): Promise<void>
}

// src/services/profileService.ts
interface ProfileService {
  getUserStats(): Promise<UserStats>
  getSuggestedUsers(interests: string[]): Promise<Profile[]>
  getSuggestedUsersForGuest(location?: GeoPoint): Promise<Profile[]>
}

// src/services/statsService.ts
interface StatsService {
  getImpactStats(period: 'week' | 'month' | 'quarter'): Promise<ImpactStats>
  getTrendingSpecies(params: {
    period: 'week' | 'month'
    location?: GeoPoint
    category?: string
  }): Promise<TrendingSpecies[]>
}

// src/services/notificationService.ts
interface NotificationService {
  getNotifications(page: number): Promise<PaginatedResponse<Notification>>
  markAsRead(id: string): Promise<void>
  markAllAsRead(): Promise<void>
  getUnreadCount(): Promise<number>
}

// src/services/searchService.ts
interface SearchService {
  searchSpecies(query: string): Promise<Species[]>
  searchUsers(query: string): Promise<Profile[]>
}
```

### 19.2 React Query hooks a creer

```typescript
// src/hooks/useFeed.ts : TanStack Query
useInfiniteQuery({ queryKey: ['feed', sort, filters], ... })

// src/hooks/useReaction.ts
useMutation({ mutationFn: toggleReaction, onMutate: optimisticUpdate })

// src/hooks/useComments.ts
useInfiniteQuery + useMutation (create/delete)

// src/hooks/useNotifications.ts
useQuery + useMutation (markAsRead)
```

### 19.3 Requetes Supabase a implementer

| Requete            | Table                                               | Complexite                     |
| ------------------ | --------------------------------------------------- | ------------------------------ |
| Feed recent        | `posts` JOIN `profiles` JOIN `media`                | Moyenne (pagination + filtres) |
| Feed populaire     | `posts` ORDER BY computed score                     | Moyenne (agrégation reactions) |
| Filtres categories | `posts` WHERE `taxonomic_group IN (...)`            | Simple                         |
| Filtres rayon      | `posts` WHERE `ST_DWithin(location, point, radius)` | PostGIS                        |
| Filtres periode    | `posts` WHERE `created_at >= interval`              | Simple                         |
| Tendances especes  | `posts` GROUP BY `species_name` COUNT               | Moyenne                        |
| Suggestions users  | `profiles` WHERE interests overlap                  | Simple                         |
| Notifications      | `notifications` WHERE `user_id` ORDER BY date       | Simple                         |
| Recherche          | `profiles` / `species` full-text search             | Moyenne                        |
| Stats impact       | `posts` COUNT + comparaison periode                 | Moyenne                        |

---

## 20. Roadmap d'implementation

### Sprint 1 : Conformite Figma & navigation (P1)

| #   | Tache                                                          | Fichier                   | Type    |
| --- | -------------------------------------------------------------- | ------------------------- | ------- |
| 1.1 | Verifier pixel-perfect navbar vs Figma (tous breakpoints)      | HomeNavbar.tsx            | Audit   |
| 1.2 | Verifier ProfileMenu vs Figma (items, styles, interactions)    | ProfileMenu.tsx           | Audit   |
| 1.3 | Verifier ContributeModal vs Figma (dropdown desktop)           | ContributeModal.tsx       | Audit   |
| 1.4 | Ajouter `disappointed` a ReactionType + 6e emoji au picker     | database.ts, FeedPost.tsx | Feature |
| 1.5 | Verifier FeedPost vs Figma (5 types de posts, 4 formats photo) | FeedPost.tsx              | Audit   |
| 1.6 | Verifier StatsSidebar vs Figma (Impact + Tendances)            | StatsSidebar.tsx          | Audit   |

### Sprint 2 : Experience core feed (P2)

| #   | Tache                                                         | Fichier                | Type    |
| --- | ------------------------------------------------------------- | ---------------------- | ------- |
| 2.1 | Creer FeedPagination (bouton "Charger plus")                  | FeedPagination.tsx     | Feature |
| 2.2 | Creer FeedEmptyState (illustration + actions)                 | FeedEmptyState.tsx     | Feature |
| 2.3 | Verifier FeedFilterPanel vs Figma                             | FeedFilterPanel.tsx    | Audit   |
| 2.4 | Verifier FeedGallery masonry vs Figma                         | FeedGallery.tsx        | Audit   |
| 2.5 | Verifier NotificationsPanel vs Figma                          | NotificationsPanel.tsx | Audit   |
| 2.6 | Verifier PhotoLightbox vs Figma (thumbnails, counter, author) | PhotoLightbox.tsx      | Audit   |
| 2.7 | Creer ShareModal                                              | ShareModal.tsx         | Feature |

### Sprint 3 : Interactions enrichies (P3)

| #   | Tache                                              | Fichier          | Type    |
| --- | -------------------------------------------------- | ---------------- | ------- |
| 3.1 | Verifier ReactionPicker (6 emojis inline) vs Figma | FeedPost.tsx     | Audit   |
| 3.2 | Verifier GuestSidebar vs Figma (migrateurs, CTA)   | GuestSidebar.tsx | Audit   |
| 3.3 | Badge filtres actifs "Filtres (N)"                 | FeedSection.tsx  | Feature |
| 3.4 | Scroll restoration apres lightbox/navigation       | Home.tsx         | Feature |

### Sprint 4 : Backend (P4)

| #   | Tache                                             | Type    |
| --- | ------------------------------------------------- | ------- |
| 4.1 | Creer postService + hook useFeed (TanStack Query) | Feature |
| 4.2 | Creer reactionService + useReaction (optimistic)  | Feature |
| 4.3 | Creer commentService + useComments                | Feature |
| 4.4 | Creer profileService + statsService               | Feature |
| 4.5 | Creer notificationService                         | Feature |
| 4.6 | Creer searchService                               | Feature |
| 4.7 | Migrations Supabase (RLS, triggers, PostGIS)      | Feature |

---

## Annexe A : Design tokens reference

### Couleurs light mode

```
--bg-primary:           #FFFDF8
--bg-secondary:         #FFFAF0
--bg-tertiary:          #FFF4E0
--foreground:           #0C0C14
--foreground-secondary: #20203D
--color-primary:        #5F5DD8
--color-primary-light:  #E7E9F7
--color-teal:           #006666
--border:               #C4C4CC
--warning-bg:           #FEE1C8
--warning-text:         #6C350D
--positive:             #00673F
```

### Typographie

```
Titres:   Quicksand Bold  : H4: 24px / H5: 18px : lineHeight: 1.2
Body:     Mulish 400/700   : 16px : lineHeight: 1.5
Small:    Mulish 400/700   : 14px : lineHeight: 1.5
Caption:  Mulish 400       : 12px : lineHeight: 1.2, letterSpacing: 4
```

### Spacing

```
sp-4:  4px     sp-8:  8px     sp-12: 12px
sp-16: 16px    sp-20: 20px    sp-24: 24px
sp-32: 32px    sp-128: 128px
```

### Radius

```
radius-xs:   4px
radius-s:    8px
radius-m:    12px    (cards)
radius-full: 999px   (pills, buttons, avatars)
```

### Layout

```
Columns: 12
Margin:  80px (XL) / 40px (Tablet) / 20px (Mobile)
Gutter:  32px (XL) / 24px (Desktop) / 16px (Mobile)
```

---

## Annexe B : Mapping reactions Figma ↔ Code

> **Statut : RÉSOLU (v1.3)** : `database.ts`, `FeedPost.tsx` et `mockPosts.ts` sont maintenant alignés.

| Emoji Figma | ReactionType (database.ts) | Label FR   | Label EN      |
| ----------- | -------------------------- | ---------- | ------------- |
| ❤️          | `love`                     | Aimer      | Love          |
| 😍          | `admire`                   | Admirer    | Admire        |
| 🔥          | `fire`                     | Incroyable | Amazing       |
| 😱          | `wow`                      | Wow        | Wow           |
| 🧐          | `curious`                  | Curieux    | Curious       |
| 😕          | `disappointed`             | Décevant   | Disappointing |

**Décisions (Nicolas, 2026-04-01) :**

- `'disappointed'` ajouté à `ReactionType` dans `src/types/database.ts`
- Alignement des noms : `hands`→`admire`, `trophy`→`wow`, `star`→`curious` (code déjà correct, database.ts mis à jour)

---

## Annexe C : Audit technique (v1.3)

### C.1 Corrections appliquées (v1.3)

| Fichier                                      | Problème                                         | Correction                                                      |
| -------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| `src/types/database.ts`                      | ReactionType utilisait `hands\|trophy\|star`     | Renommé en `admire\|wow\|curious` + ajout `disappointed`        |
| `src/components/home/FeedPost.tsx`           | REACTION_CONFIG manquait `disappointed`          | 6e réaction ajoutée                                             |
| `src/components/home/StatsSidebar.tsx`       | Couleurs hex `#00673f` hardcodées                | Remplacé par `var(--color-success)`                             |
| `src/components/home/NotificationsPanel.tsx` | Couleurs hex `#FFF0E6` / `#E05A00` hardcodées    | Remplacé par `var(--color-warning-bg)` / `var(--color-warning)` |
| `src/i18n/locales/fr.json`                   | Clé `home.post.reactions.disappointed` manquante | Ajoutée : "Décevant"                                            |
| `src/i18n/locales/en.json`                   | Clé `home.post.reactions.disappointed` manquante | Ajoutée : "Disappointing"                                       |

### C.2 Chaînes i18n manquantes (à traduire : Sprint 2)

Ces chaînes sont hardcodées en français dans le code et doivent migrer vers `i18n/locales/*.json` :

| Composant          | Fichier                       | Exemples de chaînes hardcodées                                                     |
| ------------------ | ----------------------------- | ---------------------------------------------------------------------------------- |
| ContributeModal    | `home/ContributeModal.tsx`    | "Partager une observation", "Partager un instant", "Commencer"                     |
| ProfileMenu        | `home/ProfileMenu.tsx`        | "Mon profil", "Mes carnets", "Paramètres", "Se déconnecter"                        |
| SearchPanel        | `home/SearchPanel.tsx`        | "Rechercher une espèce, un lieu...", "Espèces", "Utilisateurs"                     |
| NotificationsPanel | `home/NotificationsPanel.tsx` | "Notifications", "Tout marquer comme lu", "Nouvelle réaction", "Nouveau migrateur" |
| LocationModal      | `home/LocationModal.tsx`      | "Localisation", "Utiliser ma position", "Rayon de recherche"                       |
| CommentsSection    | `home/CommentsSection.tsx`    | "Commentaires", "Ajouter un commentaire...", "Envoyer"                             |

**Estimation : ~25 chaînes à migrer** : travail mécanique, peut être fait en Sprint 2.

### C.3 État de préparation des composants

| Catégorie        | Score   | Notes                                                                 |
| ---------------- | ------- | --------------------------------------------------------------------- |
| Types TypeScript | 95%     | ReactionType aligné, reste mockPosts `disappointed` counter à ajouter |
| Design tokens    | 90%     | Hex corrigés dans StatsSidebar + NotificationsPanel                   |
| i18n             | 70%     | ~25 strings hardcodées à migrer                                       |
| Logique métier   | 65%     | 47 TODO [BACKEND] à implémenter                                       |
| **Global**       | **80%** | Prêt pour Sprint 1 (audit pixel-perfect + 3 composants à créer)       |

---

> **Ce document est la source de verite pour l'implementation de la homepage.**
> Toute modification doit etre refletee ici avant d'etre codee.
> Derniere mise a jour : 2026-04-01
>
> **v1.3 : Audit technique Dev + corrections code (2026-04-01)**
>
> - ReactionType aligné : `hands|trophy|star` → `admire|wow|curious` + ajout `disappointed`
> - Annexe B réécrite avec le mapping correct et les labels i18n
> - Annexe C ajoutée : corrections appliquées, 25 chaînes i18n à migrer, score readiness 80%
> - Couleurs hex hardcodées corrigées dans StatsSidebar et NotificationsPanel
> - Clés i18n `disappointed` ajoutées FR + EN
>
> **v1.2 : Audit Figma complet (2026-04-01)**
> Corrections issues de l'audit pixel-perfect de toutes les frames Figma :
>
> - Sidebars visibles des 1024px (Desktop), pas masquees
> - 4 tabs feed (+ Tendances), pas 3
> - Tabs masquees sur mobile → dropdown "Trier" dans le panel filtres
> - PostOptionsMenu : 6 items (autrui) / 3 items (propre), pas 3/3
> - ReportModal : 1 etape dropdown, pas 2 etapes radio
> - LocationModal : input + slider, pas carte OpenStreetMap
> - ShareModal : 4 icones sociales + copier lien (spec complete)
> - Reaction picker : ligne supplementaire, ne remplace pas la barre d'actions
> - Empty state : 1 CTA "Reinitialiser les filtres", pas 3 actions
> - Bottom nav : hamburger menu (pas Explorer), avatar (pas icone User)
> - Badge compteur sur icone filtre quand filtres actifs
>
> **v1.1 : Decisions Nicolas (2026-04-01)**
>
> - Ajouter emoji 😕 `disappointed` au ReactionType
> - `nature_instant` reste masque dans ContributeModal
> - Dark mode reporte a plus tard
