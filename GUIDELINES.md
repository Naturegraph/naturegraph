# Naturegraph — Guidelines projet

> Référentiel interne du projet Naturegraph.
> Ce document définit la vision produit, l'identité de marque, le design system,
> les principes d'éco-conception, d'accessibilité et les standards de qualité.
>
> **Document vivant** — mis à jour à chaque évolution majeure.
> Source de vérité pour toute décision produit, design ou technique.

---

## Table des matières

1. [Vision & Positionnement](#1-vision--positionnement)
2. [Identité de marque](#2-identité-de-marque)
3. [Cibles utilisateurs](#3-cibles-utilisateurs)
4. [Contenu & ton éditorial](#4-contenu--ton-éditorial)
5. [Design system](#5-design-system)
6. [Architecture technique](#6-architecture-technique)
7. [Éco-conception](#7-éco-conception)
8. [Accessibilité](#8-accessibilité-wcag-aa)
9. [Qualité du code](#9-qualité-du-code)
10. [Communauté & engagement](#10-communauté--engagement)
11. [Différenciation produit](#11-différenciation-produit)
12. [Checklists d'audit](#12-checklists-daudit)
13. [Conformité RGESN](#13-conformité-rgesn)
14. [Lexique Naturegraph](#lexique-naturegraph)
15. [Références](#références)

---

## 1. Vision & Positionnement

### Pitch

Naturegraph est une plateforme communautaire qui permet d'explorer la nature, partager ses émotions et observations, et construire au fil du temps son propre **Journal de la Nature**.

### Problème résolu

Les outils existants (iNaturalist, Pl@ntNet…) sont souvent trop techniques, centrés uniquement sur l'identification d'espèces, et ne prennent pas en compte l'expérience globale de l'utilisateur. Ils négligent ce qui fait la richesse d'une sortie nature : **le ressenti, le souvenir, l'envie de revenir**.

Naturegraph comble ce manque en proposant une solution qui :

- Valorise le **ressenti et l'émotion** liés aux rencontres nature
- Permet de **garder une trace dans le temps** via un journal personnel
- Donne envie de **revenir régulièrement**, sans contrainte ni pression

### Proposition de valeur unique

Naturegraph ne se limite pas à identifier des espèces. Le produit permet de :

- **Essayer sans s'engager** — partager une première observation sans créer de compte, zéro friction
- **Partager ses émotions** lors des rencontres nature — pas juste une donnée, une expérience
- **Créer un Journal de la Nature personnel** — souvenirs, observations, évolution dans le temps
- **Apprendre des autres** via une communauté bienveillante — aide à l'identification, échanges, transmission
- **S'engager dans le temps** grâce à des mécaniques ludiques — défis, objectifs, progression naturelle

L'objectif : créer une expérience où l'utilisateur se **reconnecte à la nature** et à ses **propres souvenirs**.

### Philosophie d'accès

> **L'expérience avant le formulaire.** Un visiteur doit pouvoir vivre Naturegraph avant de créer un compte. L'inscription n'est jamais un mur — c'est une invitation qui arrive quand l'utilisateur a déjà ressenti la valeur du produit.

L'accès visiteur (sans compte) est un **pilier produit**, pas un bonus :

- **Explorer** le feed et les observations publiques
- **Partager** une première observation anonyme (photo + lieu + émotion)
- **Naviguer** la carte des observations
- L'inscription débloque ensuite le **Journal de la Nature**, les interactions communautaires et la sauvegarde dans le temps

---

## 2. Identité de marque

### Personnalité

Naturegraph s'exprime à travers cinq traits fondamentaux qui guident chaque décision — du choix d'un mot dans l'interface au design d'une fonctionnalité :

| Trait          | Ce que ça signifie concrètement                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Accessible** | Simple et accueillant, pas intimidant — ouvert à tous les niveaux, du promeneur du dimanche au naturaliste confirmé |
| **Inspirant**  | Donne envie de sortir, d'observer, de partager — chaque écran suscite la curiosité                                  |
| **Humain**     | Centré sur l'émotion et le vécu, pas sur la data brute — le ressenti prime sur la taxonomie                         |
| **Curieux**    | Encourage l'exploration et la découverte — toujours quelque chose de nouveau à voir, à apprendre                    |
| **Engagé**     | Porté par des valeurs éco-responsables concrètes — pas du greenwashing, des actes (RGESN, WCAG, sobriété)           |

### Animal totem : l'Hermine 🐾

L'Hermine accompagne Naturegraph tout au long du projet comme **symbole de résilience, d'adaptabilité et de discrétion**. Elle incarne :

- **La capacité à évoluer** tout en restant fidèle à notre mission
- **La ténacité et la persévérance**, même dans un environnement changeant
- **La connexion à la nature** et la valorisation de ses richesses

#### Vision symbolique

- L'Hermine reflète notre volonté de **favoriser la déconnexion numérique** au profit de l'exploration réelle, de créer des souvenirs précieux à chaque sortie.
- Elle inspire notre approche **ludique et pédagogique**, où chaque observation devient un moment d'apprentissage et d'émotion.
- Comme elle change de pelage avec les saisons, Naturegraph se **réinvente et s'adapte** pour mieux répondre aux besoins de sa communauté.

#### Cohérence visuelle

Les couleurs de la marque reprennent directement la symbolique de l'Hermine :

| Couleur           | Symbolique                        | Lien avec l'Hermine                                           |
| ----------------- | --------------------------------- | ------------------------------------------------------------- |
| **Teal / Vert**   | Croissance, découverte, immersion | L'habitat naturel — forêts, prairies, zones humides           |
| **Écru / Warm**   | Chaleur, neutralité, proximité    | Le pelage d'été — doux, accueillant, familier                 |
| **Violet Indigo** | Différenciation, identité forte   | L'élément distinctif — ce qui rend Naturegraph reconnaissable |

Cette identité crée un **univers accueillant et reconnaissable**, renforçant la marque et l'engagement envers la nature.

#### Message clé pour la communauté

> Naturegraph invite chacun à **explorer, apprendre et partager** au rythme qui lui convient, en s'inspirant de la ténacité et de l'adaptabilité de l'Hermine. Chaque utilisateur devient partie prenante d'une aventure collective et respectueuse de la biodiversité.

---

## 3. Cibles utilisateurs

### Persona primaire — Le curieux de nature

Le cœur de cible. C'est pour lui que Naturegraph est conçu en priorité.

| Attribut            | Détail                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Âge**             | 20–40 ans                                                                                     |
| **Profil**          | Grand public sensible à la nature — promeneurs, familles, voyageurs, photographes amateurs    |
| **Niveau nature**   | Débutant à intermédiaire — curieux, pas expert, veut apprendre sans pression                  |
| **Niveau tech**     | Utilise régulièrement des apps modernes, attend une expérience fluide et agréable             |
| **Motivation**      | _"Je veux me souvenir de cette rencontre et la partager"_                                     |
| **Comportement**    | Sort régulièrement en nature, prend des photos, aime les apps bien conçues                    |
| **Frustration**     | Les apps existantes sont trop scientifiques, froides, ou ne gardent pas de trace émotionnelle |
| **Ce qu'il attend** | De l'émotion, de la simplicité, un endroit pour garder ses souvenirs nature                   |

### Persona secondaire — Le naturaliste & transmetteur

L'utilisateur avancé qui enrichit la communauté par son expertise.

| Attribut            | Détail                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| **Âge**             | 25–55 ans                                                                                              |
| **Profil**          | Naturalistes amateurs ou confirmés, ornithologues, botanistes, entomologistes, éco-volontaires         |
| **Niveau nature**   | Avancé à expert — identifie les espèces, connaît les écosystèmes, pratique le terrain régulièrement    |
| **Niveau tech**     | Variable — certains très à l'aise, d'autres habitués à des outils datés (carnets papier, forums)       |
| **Motivation**      | _"Je veux transmettre mes connaissances et aider les autres à comprendre ce qu'ils voient"_            |
| **Comportement**    | Documente rigoureusement ses observations, participe à des inventaires, forme des débutants            |
| **Frustration**     | Les plateformes existantes sont centrées sur la donnée brute, pas sur l'échange humain ni la pédagogie |
| **Ce qu'il attend** | Un espace où son expertise est valorisée et où il peut contribuer à la communauté                      |

### Persona tertiaire — Le grand public occasionnel

Un public plus large qui découvre Naturegraph par curiosité.

| Attribut            | Détail                                                             |
| ------------------- | ------------------------------------------------------------------ |
| **Profil**          | Randonneurs occasionnels, parents en balade, touristes en vacances |
| **Niveau nature**   | Novice — "c'est quoi cet oiseau ?"                                 |
| **Motivation**      | _"J'ai vu un truc incroyable, je veux savoir ce que c'est"_        |
| **Ce qu'il attend** | Réponse rapide, expérience simple, pas d'engagement obligatoire    |

### Dynamique entre les personas

```
Tertiaire (novice)  →  découvre via une observation ponctuelle
        ↓
Primaire (curieux)  →  revient, crée son journal, s'engage dans le temps
        ↓
Secondaire (expert) →  transmet, aide, enrichit la communauté
```

L'objectif produit est de **fluidifier ce parcours** : chaque novice peut devenir curieux, chaque curieux peut devenir transmetteur. Naturegraph grandit avec ses utilisateurs.

### Ce qu'ils cherchent tous (en une phrase)

Pouvoir **capturer, comprendre et revivre** leurs expériences nature, tout en les partageant avec une communauté qui enrichit ces moments — chacun à son niveau.

---

## 4. Contenu & ton éditorial

### Registre

- **Tutoiement** — direct, humain, proche, jamais condescendant
- Court, clair, axé sur **émotion et expérience**
- Pédagogique sans complexité — expliquer sans jargon
- Encourageant — chaque interaction valorise l'utilisateur

### Exemples de ton

| ✅ Naturegraph                     | ❌ À éviter                         |
| ---------------------------------- | ----------------------------------- |
| "Partage ta rencontre"             | "Soumettre une observation"         |
| "Ton Journal de la Nature"         | "Historique des données"            |
| "Quelle émotion as-tu ressentie ?" | "Catégorisez votre observation"     |
| "Revois tes plus beaux moments"    | "Consultez vos entrées précédentes" |

### Langues

| Langue       | Statut      | Marché                     |
| ------------ | ----------- | -------------------------- |
| **Français** | Prioritaire | Marché francophone initial |
| **Anglais**  | Secondaire  | Déploiement progressif     |

Architecture i18n : fichiers JSON séparés (`fr.json`, `en.json`), clés structurées par section et par page.

---

## 5. Design system

### 5.1 Typographie

| Usage          | Police        | Graisses           | Intention                                          |
| -------------- | ------------- | ------------------ | -------------------------------------------------- |
| Titres (h1–h6) | **Quicksand** | 500, 600, 700      | Douce, accessible, humaine — émotion et découverte |
| Corps de texte | **Mulish**    | 400, 500, 600, 700 | Lisibilité et clarté — structure et efficacité     |

Équilibre entre **émotion** (Quicksand) et **efficacité** (Mulish).

#### Échelle typographique

| Token            | Desktop | Mobile | Usage                  |
| ---------------- | ------- | ------ | ---------------------- |
| `$font-size-xs`  | 12px    | 12px   | Labels, captions       |
| `$font-size-sm`  | 14px    | 14px   | Texte secondaire       |
| `$font-size-md`  | 16px    | 16px   | Corps de texte         |
| `$font-size-lg`  | 18px    | 16px   | Texte d'accroche       |
| `$font-size-xl`  | 24px    | 18px   | Sous-titres            |
| `$font-size-2xl` | 32px    | 24px   | Titres de section (h2) |
| `$font-size-3xl` | 48px    | 32px   | Titres de page (h1)    |
| `$font-size-4xl` | 64px    | 40px   | Hero, mise en avant    |

#### Hauteurs de ligne

| Token                  | Valeur | Usage                   |
| ---------------------- | ------ | ----------------------- |
| `$line-height-tight`   | 1.2    | Titres                  |
| `$line-height-normal`  | 1.5    | Corps de texte          |
| `$line-height-relaxed` | 1.75   | Texte long, paragraphes |

### 5.2 Palette de couleurs

#### Couleurs de marque

| Token CSS                     | Hex       | Rôle                            | Lien Hermine                    |
| ----------------------------- | --------- | ------------------------------- | ------------------------------- |
| `--color-action-default`      | `#5F5DD8` | Violet — CTA, actions, identité | Différenciation, reconnaissance |
| `--color-action-hover`        | `#3C4380` | Violet foncé — hover            | —                               |
| `--color-action-active`       | `#525AAA` | Violet — état actif             | —                               |
| `--color-action-disabled`     | `#CED3F0` | Violet clair — désactivé        | —                               |
| `--color-action-light`        | `#E7E9F7` | Violet très clair — fonds       | —                               |
| `--color-highlight-primary`   | `#006666` | Teal — nature, immersion, hero  | Habitat naturel                 |
| `--color-highlight-secondary` | `#005353` | Teal foncé — hover              | —                               |
| `--color-highlight-tertiary`  | `#33B6B6` | Teal clair — accents            | —                               |
| `--color-bg-primary`          | `#FFFDF8` | Écru — fond principal           | Pelage d'été                    |
| `--color-bg-secondary`        | `#FFFAF0` | Écru — fond secondaire          | Chaleur, douceur                |
| `--color-bg-tertiary`         | `#FFF4E0` | Écru — fond tertiaire           | —                               |
| `--color-bg-menthe`           | `#99FFCC` | Menthe — accents décoratifs     | Fraîcheur printanière           |

#### Couleurs de contenu

| Token CSS                | Hex       | Usage                      |
| ------------------------ | --------- | -------------------------- |
| `--color-text-primary`   | `#0C0C14` | Texte principal            |
| `--color-text-secondary` | `#20203D` | Texte secondaire           |
| `--color-text-tertiary`  | `#13131A` | Texte tertiaire            |
| `--color-text-disabled`  | `#7E7E8F` | Texte désactivé            |
| `--color-text-inverse`   | `#F0F0F5` | Texte sur fond sombre      |
| `--color-text-white`     | `#FFFDF8` | Texte sur fond teal/violet |

#### Couleurs sémantiques

| Token CSS            | Hex       | Usage                 |
| -------------------- | --------- | --------------------- |
| `--color-success`    | `#00673F` | Succès (texte)        |
| `--color-success-bg` | `#C7F2DF` | Succès (fond)         |
| `--color-warning`    | `#6C350D` | Avertissement (texte) |
| `--color-warning-bg` | `#FEE1C8` | Avertissement (fond)  |
| `--color-error`      | `#9E0F22` | Erreur (texte)        |
| `--color-error-bg`   | `#FCCDD5` | Erreur (fond)         |
| `--color-info`       | `#004178` | Information (texte)   |
| `--color-info-bg`    | `#BADEFA` | Information (fond)    |

#### Bordures

| Token CSS              | Hex       | Usage              |
| ---------------------- | --------- | ------------------ |
| `--color-border`       | `#C4C4CC` | Bordure par défaut |
| `--color-border-light` | `#C4C4CC` | Bordure légère     |
| `--color-border-dark`  | `#565666` | Bordure accentuée  |

### 5.3 Espacement

Échelle cohérente basée sur des multiples de 4px :

| Token     | Valeur  | Px  | Usage courant           |
| --------- | ------- | --- | ----------------------- |
| `$sp-4`   | 0.25rem | 4   | Micro-espacement        |
| `$sp-8`   | 0.5rem  | 8   | Padding interne compact |
| `$sp-12`  | 0.75rem | 12  | Padding boutons         |
| `$sp-16`  | 1rem    | 16  | Espacement standard     |
| `$sp-20`  | 1.25rem | 20  | Marges mobile           |
| `$sp-24`  | 1.5rem  | 24  | Gap entre éléments      |
| `$sp-32`  | 2rem    | 32  | Séparation de blocs     |
| `$sp-40`  | 2.5rem  | 40  | Marges tablette         |
| `$sp-48`  | 3rem    | 48  | Padding sections        |
| `$sp-64`  | 4rem    | 64  | Espacement sections     |
| `$sp-80`  | 5rem    | 80  | Marges desktop          |
| `$sp-128` | 8rem    | 128 | Grandes séparations     |
| `$sp-160` | 10rem   | 160 | Hero spacing            |

### 5.4 Arrondis

| Token          | Valeur | Usage                        |
| -------------- | ------ | ---------------------------- |
| `$radius-xs`   | 4px    | Inputs, badges               |
| `$radius-sm`   | 8px    | Cartes compactes             |
| `$radius-md`   | 12px   | Cartes, modales              |
| `$radius-lg`   | 20px   | Containers, sections         |
| `$radius-xl`   | 32px   | Hero container, grands blocs |
| `$radius-full` | 999px  | Boutons pill, avatars        |

### 5.5 Ombres & élévation

Définies dans `_shadows.scss` — utiliser les tokens, jamais de valeurs en dur.

### 5.6 Iconographie

- **Lucide Icons** : cohérence et modernité pour les icônes fonctionnelles (navigation, actions, UI)
- **Emojis** (2D) : dimension immersive et expressive pour le contenu nature (espèces, émotions)
- Équilibre entre **clarté fonctionnelle** et **expression émotionnelle**
- Toujours accompagner l'icône d'un label texte pour l'accessibilité

### 5.7 Photographie

- **Immersive et qualitative** — respect des formats pour une bonne lisibilité
- Suscite **curiosité, évasion, envie d'explorer**
- Types de photos : macro faune/flore, paysages, moments d'observation, ambiances de terrain
- Compression obligatoire (< 100 KB par image affichée, format WebP/AVIF avec fallback)

### 5.8 Animations

- Fluides et utiles, **jamais excessives** — chaque animation a une raison fonctionnelle
- Accompagnent : interactions, compréhension, sensation de progression (journal, défis)
- **CSS-only** autant que possible (IntersectionObserver pour scroll reveal, transitions CSS)
- Pas de librairie d'animation JS (framer-motion, GSAP) — sobriété numérique
- `prefers-reduced-motion: reduce` **toujours** respecté

### 5.9 Thèmes

| Thème     | Statut   | Fichier                                            |
| --------- | -------- | -------------------------------------------------- |
| **Light** | ✅ Actif | `_light-theme.scss`                                |
| **Dark**  | 🟡 Prévu | `_dark-theme.scss` (tokens définis, à implémenter) |

Le basculement se fait via l'attribut `data-theme` sur `<html>` et le signal `prefers-color-scheme`.

---

## 6. Architecture technique

### Stack

| Couche        | Technologie                | Justification                                     |
| ------------- | -------------------------- | ------------------------------------------------- |
| Framework     | React 19 + TypeScript      | Écosystème mature, typage fort, communauté active |
| Build         | Vite 7.3                   | HMR rapide, tree-shaking natif, build optimisé    |
| Styles        | Tailwind CSS v4 + SCSS 7-1 | Utilitaires rapides + design system structuré     |
| i18n          | react-i18next              | FR/EN, fichiers JSON séparés, détection auto      |
| Routing       | React Router v7            | Code splitting natif, lazy loading par page       |
| State serveur | TanStack Query             | Cache intelligent, gestion état serveur           |
| Maps          | Leaflet + react-leaflet    | Open source, léger, adapté MVP                    |
| Backend       | Supabase                   | Auth, BDD PostgreSQL, storage, temps réel         |
| Lint          | ESLint + Prettier          | Qualité et formatage automatique                  |
| Git hooks     | Husky v9 + lint-staged     | Pre-commit : lint + format automatiques           |

### Architecture CSS — Cohabitation SCSS / Tailwind v4

Le projet utilise deux systèmes CSS complémentaires qui cohabitent grâce au mécanisme `@layer` :

```
@layer base       ← SCSS (reset, typo, thèmes, containers)
@layer components  ← Composants Tailwind ou SCSS
@layer utilities   ← Tailwind CSS v4 (utilitaires)
```

**Règle fondamentale** : tout SCSS qui produit des règles CSS doit être enveloppé dans `@layer base`. Sans cela, les styles non-layered écrasent systématiquement les utilitaires Tailwind v4 (qui sont dans `@layer utilities`).

**Pourquoi** : en CSS natif, les styles sans `@layer` ont toujours une priorité supérieure aux styles dans un `@layer`, quelle que soit la spécificité. C'est un changement structurel de CSS que Tailwind v4 exploite.

### Organisation des fichiers SCSS (7-1 pattern)

```
src/styles/
├── abstracts/       # Variables, mixins, breakpoints, couleurs (pas de CSS output)
│   ├── _variables.scss
│   ├── _colors.scss
│   ├── _spacing.scss
│   ├── _breakpoints.scss
│   ├── _mixins.scss
│   ├── _shadows.scss
│   └── _zindex.scss
├── base/            # Reset, typographie, fonts (@layer base)
│   ├── _reset.scss
│   ├── _typography.scss
│   ├── _fonts.scss
│   └── _base.scss
├── components/      # Styles de composants spécifiques (@layer base)
├── layout/          # Grid, containers, header, footer (@layer base)
├── themes/          # Light/dark themes (CSS custom properties)
│   ├── _light-theme.scss
│   └── _dark-theme.scss
├── utilities/       # Helpers, accessibilité (@layer base ou supprimés si Tailwind les couvre)
│   ├── _accessibility.scss
│   ├── _helpers.scss      # Vidé — Tailwind fournit ces utilitaires
│   └── _visibility.scss   # Vidé — Tailwind fournit ces utilitaires
└── main.scss        # Point d'entrée, importe tout
```

### Navigateurs et devices cibles

- **Mobile-first** — usage terrain prioritaire (en extérieur, une main, plein soleil)
- Navigateurs modernes uniquement : Chrome/Edge 100+, Firefox 100+, Safari 15+
- Pas de support IE11

---

## 7. Éco-conception

### Principes fondamentaux

- **Sobriété fonctionnelle** : chaque fonctionnalité répond à un besoin réel — pas de feature "nice-to-have" sans justification
- **Mobile-first** : concevoir d'abord pour mobile, enrichir progressivement pour desktop
- **Budget performance** : chaque page reste sous les seuils définis ci-dessous
- **Réduire l'obsolescence** : supporter les terminaux récents, limiter la consommation CPU/RAM

### Seuils de performance

| Métrique                 | Seuil         | Outil de mesure       |
| ------------------------ | ------------- | --------------------- |
| Lighthouse mobile (perf) | **> 90**      | Lighthouse            |
| Lighthouse mobile (a11y) | **> 90**      | Lighthouse            |
| Poids total JS           | < 300 KB gzip | Vite build            |
| Poids total CSS          | < 50 KB gzip  | Vite build            |
| Poids page (transfert)   | < 500 KB      | Lighthouse / DevTools |
| LCP                      | < 2.5s        | Lighthouse            |
| FID / INP                | < 200ms       | Lighthouse            |
| CLS                      | < 0.1         | Lighthouse            |
| EcoIndex                 | A ou B        | GreenIT Analysis      |
| Requêtes HTTP            | < 30 par page | DevTools Network      |

### Images & médias

- Format **WebP ou AVIF** obligatoire (fallback PNG/JPG)
- `loading="lazy"` sur toutes les images hors viewport initial
- `width` et `height` explicites sur chaque `<img>` pour éviter le CLS
- Compression avant intégration : **< 100 KB** par image affichée
- Pas de vidéo en fond (background video)
- Pas d'autoplay sur les carrousels ou médias

### Polices

- Maximum **2 familles** : Quicksand + Mulish
- Charger uniquement les graisses utilisées
- `font-display: swap` pour éviter le FOIT (Flash of Invisible Text)
- `<link rel="preconnect">` vers les serveurs de fonts

### CSS & JS

- Préférer CSS natif aux animations JS
- Pas de dépendance JS ajoutée sans justification écrite
- Code splitting et lazy loading des pages (React Router `lazy()`)
- Tree-shaking automatique via Vite
- Pas de polyfill inutile

### Requêtes & données

- **Pagination** obligatoire — pas de scroll infini
- Cache client via TanStack Query (`staleTime` adapté au type de données)
- Pas de collecte de données inutile dans les formulaires
- Compression gzip/brotli activée côté serveur

### Animations

- Limitées au strict nécessaire (feedback UI, scroll reveal, transitions d'état)
- `prefers-reduced-motion: reduce` respecté systématiquement
- Pas de GIF animé
- Pas de chatbot

---

## 8. Accessibilité (WCAG AA)

### Principes directeurs

| Principe           | Application                                                        |
| ------------------ | ------------------------------------------------------------------ |
| **Perceptible**    | Tout contenu non-textuel a un équivalent textuel (alt, aria-label) |
| **Utilisable**     | Navigation complète au clavier (Tab, Enter, Escape, flèches)       |
| **Compréhensible** | Langue déclarée, messages d'erreur clairs et contextuels           |
| **Robuste**        | HTML sémantique, compatible lecteurs d'écran (NVDA, VoiceOver)     |

### Contexte terrain

Naturegraph est utilisé en extérieur — en forêt, en montagne, en bord de mer. Cela implique des contraintes qui vont au-delà du web classique :

- **Lisibilité en plein jour** — contrastes élevés, texte suffisamment grand, couleurs lisibles sur écran en plein soleil
- **Interactions simples** — utilisable en marchant, d'une seule main, avec des gants ou les doigts humides
- **Connexion instable ou absente** — les zones naturelles ont souvent peu ou pas de réseau

### Mode hors-ligne (accessibilité terrain)

L'usage terrain rend le mode hors-ligne essentiel à l'accessibilité réelle du produit. Un utilisateur en forêt sans réseau doit pouvoir continuer à utiliser Naturegraph :

| Fonctionnalité                 | Comportement hors-ligne                                | Priorité      |
| ------------------------------ | ------------------------------------------------------ | ------------- |
| **Créer une observation**      | Sauvegarde locale, synchronisation au retour du réseau | 🔴 Critique   |
| **Consulter son Journal**      | Données cachées disponibles en lecture                 | 🔴 Critique   |
| **Prendre des photos**         | Stockage local, upload différé                         | 🔴 Critique   |
| **Naviguer la carte**          | Tuiles cartographiques pré-cachées (zone favorite)     | 🟠 Important  |
| **Identifier une espèce**      | Recherche dans la base locale téléchargée              | 🟡 Roadmap    |
| **Voir le feed communautaire** | Dernière version cachée, message "hors-ligne" clair    | 🟡 Secondaire |

**Principes techniques du mode hors-ligne** :

- **Service Worker** pour le cache des assets statiques et des données utilisateur
- **IndexedDB** pour le stockage local des observations en brouillon
- **Synchronisation différée** — les observations créées hors-ligne sont marquées "en attente" et synchronisées automatiquement dès le retour du réseau
- **Indicateur visuel clair** — l'utilisateur sait toujours s'il est en ligne ou hors-ligne (badge discret, pas intrusif)
- **Aucune perte de données** — tout ce qui est saisi hors-ligne est préservé, jamais perdu

> Le mode hors-ligne n'est pas un "nice-to-have" : c'est une **exigence d'accessibilité terrain**. Un utilisateur qui perd son observation parce qu'il n'avait pas de réseau ne reviendra pas.

### Règles obligatoires

| Critère         | Règle                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| Contraste texte | ≥ 4.5:1 (texte normal), ≥ 3:1 (grand texte ≥ 18px bold ou ≥ 24px)                  |
| Contraste UI    | ≥ 3:1 pour tous les éléments interactifs et leurs bordures                         |
| Focus visible   | Outline `2px solid var(--color-primary)` + `offset 2px` sur tout élément focusable |
| Skip link       | `<a class="skip-link">Aller au contenu</a>` en premier élément du DOM              |
| Aria labels     | Sur tous les éléments interactifs sans texte visible (boutons icône, liens image)  |
| Alt text        | Descriptif sur les images informatives. `alt=""` sur les images décoratives        |
| HTML sémantique | `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, hiérarchie h1→h6           |
| Formulaires     | `<label>` associé à chaque input, erreurs liées par `aria-describedby`             |
| Responsive      | Contenu accessible à 200% de zoom sans perte ni troncature                         |
| Animations      | Désactivées ou réduites si `prefers-reduced-motion: reduce`                        |
| Langue          | `lang="fr"` sur `<html>`, attribut `lang` sur tout passage en langue différente    |

### Outils de vérification

| Outil                        | Usage                                       |
| ---------------------------- | ------------------------------------------- |
| **WAVE**                     | Audit accessibilité global                  |
| **axe DevTools**             | Audit automatisé, intégration CI possible   |
| **Colour Contrast Analyser** | Vérification manuelle des contrastes        |
| **Navigation clavier**       | Test manuel : Tab, Shift+Tab, Enter, Escape |
| **Lecteur d'écran**          | Test NVDA (Windows) ou VoiceOver (macOS)    |

---

## 9. Qualité du code

### TypeScript

- Mode strict activé (`strict: true` dans `tsconfig.json`)
- **Jamais de `any`** — utiliser `unknown` + type guards si le type est incertain
- Types explicites sur les props de composants (interface ou type exporté)
- Enums évités au profit des unions de types littéraux

### Composants React

- **Un composant = un fichier** — nommé comme le composant (PascalCase)
- **Maximum 200 lignes** par composant — au-delà, décomposer en sous-composants
- Séparation logique (hooks custom) / présentation (JSX)
- Props typées avec `interface` (préféré pour les composants) ou `type`
- **Commentaires JSDoc** sur les composants et hooks exportés
- **En-têtes de fichiers** : brève description du rôle du fichier

### Design system dans le code

- **Toujours utiliser les tokens** CSS custom properties (`var(--color-*)`)
- **Jamais de couleurs en dur** (hex, rgb) dans les composants
- Composants UI réutilisables dans `src/components/ui/`
- Respecter la nomenclature Figma pour les noms de tokens et composants

### Architecture CSS

- **SCSS** (7-1 pattern) pour le design system, les thèmes et le reset → toujours dans `@layer base`
- **Tailwind CSS v4** pour le layout et les utilitaires dans les composants → `@layer utilities`
- **Pas de `!important`** sauf dans le reset `prefers-reduced-motion`
- Pas de styles inline sauf cas dynamique justifié (valeur calculée en JS)
- Les fichiers `_helpers.scss` et `_visibility.scss` sont **vidés** — Tailwind couvre ces utilitaires

### Git

- Commits atomiques avec messages clairs
- Préfixes conventionnels : `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `perf:`, `test:`, `chore:`
- Branche `develop` pour le développement courant
- Branches feature (`feat/nom-feature`) pour les évolutions majeures
- Pre-commit automatique : ESLint + Prettier via Husky + lint-staged

### Environnements & déploiement

Le projet maintient **trois environnements séparés** pour garantir que la version en ligne n'est jamais cassée par un développement en cours :

| Environnement              | Branche   | URL                    | Rôle                                                           |
| -------------------------- | --------- | ---------------------- | -------------------------------------------------------------- |
| **Développement**          | `develop` | localhost              | Travail quotidien, nouvelles features, expérimentation libre   |
| **Staging / Démo interne** | `staging` | staging.naturegraph.fr | Tests équipe, validation avant mise en ligne, démo partenaires |
| **Production**             | `main`    | naturegraph.fr         | Version publique — **jamais touchée directement**              |

#### Flux de déploiement

```
develop (travail quotidien)
    ↓ PR + review + tests
staging (validation équipe)
    ↓ Tests validés + changelog rédigé
main → production (mise en ligne)
```

**Règles strictes** :

- **Jamais de push direct sur `main`** — uniquement via PR depuis `staging`
- **Jamais de push direct sur `staging`** — uniquement via PR depuis `develop` ou branches feature
- Chaque PR vers `staging` inclut une **description des changements** et une checklist de validation
- Chaque mise en production génère un **changelog versioned** (SemVer : v0.x.y)
- Les tests (lint, build, a11y) doivent passer avant toute fusion

#### Changelog & communication

Chaque mise à jour en production est accompagnée d'un **résumé des changements** qui sert à :

| Canal                 | Format                                                  | Audience                              |
| --------------------- | ------------------------------------------------------- | ------------------------------------- |
| **In-app**            | Notification ou banner "Quoi de neuf ?"                 | Utilisateurs actifs                   |
| **Discord**           | Post dans #changelog avec détails techniques + captures | Communauté engagée                    |
| **Instagram Stories** | Résumé visuel des nouveautés (3-5 slides)               | Grand public, acquisition             |
| **GitHub Releases**   | Changelog technique complet (SemVer)                    | Contributeurs, partenaires techniques |

> La transparence sur les mises à jour est un **levier de fidélisation**. Les utilisateurs qui voient le produit évoluer grâce à leurs retours restent engagés.

---

## 10. Communauté & engagement

### Principe fondamental

> **Sans la communauté, Naturegraph n'existe pas.** Les utilisateurs ne sont pas de simples consommateurs — ils sont **co-constructeurs** du produit. Leur engagement, leurs retours et leurs contributions façonnent chaque évolution.

### La communauté au cœur du produit

| Dimension             | Comment la communauté participe                                                        |
| --------------------- | -------------------------------------------------------------------------------------- |
| **Contenu**           | Les observations des utilisateurs SONT le contenu — sans eux, l'app est vide           |
| **Identification**    | L'aide collaborative entre membres remplace un algorithme coûteux                      |
| **Évolution produit** | Les retours terrain guident les prochaines fonctionnalités                             |
| **Acquisition**       | Le bouche-à-oreille et le partage entre passionnés sont le premier canal de croissance |
| **Qualité**           | La modération communautaire maintient un espace bienveillant                           |

### Canaux communautaires

| Canal             | Rôle                                                                  | Ton                             |
| ----------------- | --------------------------------------------------------------------- | ------------------------------- |
| **Discord**       | Cœur de la communauté — échanges, entraide, retours produit, annonces | Direct, convivial, participatif |
| **In-app (feed)** | Partage d'observations, commentaires, identification collaborative    | Bienveillant, encourageant      |
| **Instagram**     | Vitrine — belles observations, coulisses du projet, nouveautés        | Visuel, inspirant, émotionnel   |
| **LinkedIn**      | Crédibilité — vision, mission, partenariats, recrutement              | Professionnel, engagé           |

### Impliquer la communauté dans le développement

La communauté n'est pas juste informée des évolutions — elle y **participe activement** :

| Mécanisme                   | Description                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| **Bêta-test sur staging**   | Les membres Discord volontaires testent les nouvelles fonctionnalités avant la mise en production |
| **Vote de fonctionnalités** | Sondages Discord pour prioriser la roadmap selon les besoins réels                                |
| **Retours terrain**         | Canal dédié pour remonter les bugs, suggestions et frictions vécues sur le terrain                |
| **Changelog transparent**   | Chaque mise à jour crédite les retours communautaires qui l'ont motivée                           |
| **Ambassadeurs**            | Les membres les plus actifs deviennent "Migrateurs" — un rôle reconnu avec accès anticipé         |

### Cercles d'engagement

```
Visiteur anonyme
    ↓  essaie une observation sans compte
Utilisateur inscrit
    ↓  crée son journal, interagit
Membre Discord
    ↓  échange, aide, propose
Bêta-testeur
    ↓  teste les nouveautés sur staging
Migrateur (ambassadeur)
    ↓  co-construit le produit, influence la roadmap
```

Chaque cercle offre plus d'implication et de reconnaissance. La progression est **naturelle et volontaire** — jamais forcée.

---

## 11. Différenciation produit

### Comparatif concurrentiel

| Feature                     | Naturegraph                              | iNaturalist                | Pl@ntNet                |
| --------------------------- | ---------------------------------------- | -------------------------- | ----------------------- |
| Accès sans compte           | ✅ Observation anonyme, essai immédiat   | ❌ Compte obligatoire      | ⚠️ Identification seule |
| Émotion & ressenti          | ✅ Au cœur de l'expérience               | ❌ Absent                  | ❌ Absent               |
| Journal personnel           | ✅ Timeline, souvenirs, évolution        | ❌ Liste d'observations    | ❌ Historique simple    |
| Communauté co-constructrice | ✅ Bêta-test, vote roadmap, ambassadeurs | ⚠️ Validation scientifique | ❌ Minimal              |
| Qualité design              | ✅ WCAG AA, mobile-first terrain         | ⚠️ Interface datée         | ⚠️ Interface datée      |
| Gamification douce          | ✅ Défis, objectifs (roadmap)            | ❌ Absent                  | ❌ Absent               |
| Éco-conception              | ✅ RGESN, budget perf, sobriété          | ❌ Non prioritaire         | ❌ Non prioritaire      |
| Transparence produit        | ✅ Changelog public, Discord ouvert      | ❌ Opaque                  | ❌ Opaque               |

### Les 6 piliers différenciants

1. **Zéro friction** — essayer sans compte, s'inscrire quand on est convaincu
2. **Journal de la Nature personnel** — garder une trace dans le temps, visualiser son évolution
3. **Émotions & souvenirs** — chaque observation est une expérience vécue, pas une donnée froide
4. **Communauté co-constructrice** — les utilisateurs façonnent le produit, pas juste le consomment
5. **Gamification douce** (roadmap) — défis, objectifs et participation active sans pression
6. **Dimension temporelle** — relation durable avec la nature et le produit, qui s'enrichit au fil du temps

---

## 12. Checklists d'audit

À vérifier après chaque implémentation significative.

### Éco-conception

- [ ] Poids de la page < 500 KB (transfert)
- [ ] Lighthouse mobile performance > 90
- [ ] Images optimisées (WebP/AVIF, `loading="lazy"`, dimensions explicites)
- [ ] Pas de nouvelle dépendance JS sans justification
- [ ] Pas d'animation superflue
- [ ] Pagination (pas de scroll infini)
- [ ] `prefers-reduced-motion` respecté
- [ ] Requêtes HTTP < 30 par page

### Accessibilité

- [ ] Navigation clavier complète (Tab, Enter, Escape)
- [ ] Contrastes conformes (4.5:1 texte / 3:1 grands textes et UI)
- [ ] Focus visible sur tous les éléments interactifs
- [ ] Aria labels présents sur les éléments sans texte visible
- [ ] HTML sémantique (nav, main, header, footer, section, h1→h6)
- [ ] Alt text sur toutes les images (descriptif ou `alt=""`)
- [ ] Formulaires accessibles (labels + aria-describedby)
- [ ] Zoom 200% sans perte de contenu

### Qualité code

- [ ] Pas de `any` TypeScript
- [ ] Composants < 200 lignes
- [ ] Tokens CSS utilisés (pas de couleurs en dur)
- [ ] SCSS dans `@layer base`
- [ ] ESLint + Prettier passent sans erreur

### Outils recommandés

| Outil                  | Type      | Usage                                        |
| ---------------------- | --------- | -------------------------------------------- |
| **Lighthouse**         | Auto      | Performance + accessibilité + best practices |
| **axe DevTools**       | Auto      | Accessibilité approfondie                    |
| **GreenIT Analysis**   | Auto      | EcoIndex, requêtes, poids                    |
| **GTmetrix**           | Auto      | Waterfall, temps de chargement               |
| **Yellow Lab Tools**   | Auto      | Qualité frontend globale                     |
| **WAVE**               | Semi-auto | Audit accessibilité visuel                   |
| **Navigation clavier** | Manuel    | Tab, Shift+Tab, Enter, Escape                |
| **Lecteur d'écran**    | Manuel    | NVDA (Win) ou VoiceOver (Mac)                |

---

## 13. Conformité RGESN

Critères du Référentiel Général d'Écoconception des Services Numériques appliqués au projet :

| Critère | Description                            | Application Naturegraph                                           |
| ------- | -------------------------------------- | ----------------------------------------------------------------- |
| **1.4** | Méthodologie d'autoévaluation          | Ce document + checklists d'audit                                  |
| **1.9** | Technologies standards interopérables  | React, HTML5, CSS, SVG, JSON                                      |
| **2.2** | Test sur anciens terminaux             | Navigateurs modernes (Chrome/Firefox/Safari 2 dernières versions) |
| **2.3** | Test sur connexion 3G/bas-débit        | Budget perf < 500 KB, LCP < 2.5s                                  |
| **2.4** | Test sur anciennes versions navigateur | Support Chrome/Edge 100+, Firefox 100+, Safari 15+                |
| **2.5** | Design responsive multi-terminaux      | Mobile-first, 4 breakpoints (375→1440+)                           |
| **2.6** | Revue conception avant développement   | PRD par page, validation Figma avant code                         |
| **3.5** | Mises à jour correctives indépendantes | Git branches séparées, commits atomiques                          |
| **4.3** | Parcours de navigation optimisé        | Arborescence plate, accès < 3 clics                               |

---

## Lexique Naturegraph

Vocabulaire propre à la marque, au produit et à la communauté. Ces termes sont utilisés dans l'interface, la communication et la documentation interne.

### Univers produit

| Terme                     | Définition                                                                                                                                                                                                                                           | Contexte d'usage                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Rencontre Nature**      | Une observation partagée sur Naturegraph — pas une "donnée" ou un "signalement", mais un moment vécu avec la nature. Le mot "rencontre" insiste sur la dimension émotionnelle et personnelle.                                                        | CTA hero, formulaire d'observation, feed            |
| **Instant Nature**        | Une observation rapide, spontanée — une photo + un lieu + une émotion, sans nécessité d'identifier l'espèce. Le format le plus léger pour contribuer.                                                                                                | Formulaire simplifié, accès visiteur                |
| **Journal de la Nature**  | L'espace personnel de chaque utilisateur. Il rassemble chronologiquement toutes ses rencontres, photos, émotions et découvertes. C'est un carnet de terrain numérique qui s'enrichit au fil du temps — pas un "historique" ou une "base de données". | Profil, navigation principale, argumentaire produit |
| **Carnet d'observations** | Un regroupement thématique de rencontres — par lieu, par saison, par espèce, par sortie. L'utilisateur peut créer autant de carnets qu'il veut (privés, publics ou collaboratifs).                                                                   | Profil, organisation personnelle                    |
| **Sortie**                | Une session d'exploration en nature — une balade, une randonnée, une pause au parc. Le mot "sortie" est volontairement large : pas besoin d'être un trek de 3 jours pour que ça compte.                                                              | Ton éditorial, descriptions, onboarding             |

### Communauté

| Terme                    | Définition                                                                                                                                                                                                                                 | Contexte d'usage                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **Migrateur**            | Membre actif et engagé de la communauté Naturegraph. Le terme fait référence aux espèces migratrices : comme elles, les migrateurs parcourent, explorent et reviennent fidèlement. C'est un statut de reconnaissance, pas un grade imposé. | Discord (rôle), landing page, CTA "Devenir migrateur", section communauté |
| **Devenir migrateur**    | L'invitation à rejoindre la communauté Discord. C'est le CTA communautaire principal — il évoque le voyage, l'appartenance et le mouvement collectif.                                                                                      | Bouton CTA, landing page, footer                                          |
| **Rejoindre l'aventure** | L'invitation à créer un compte et devenir utilisateur. Le mot "aventure" positionne l'inscription comme le début d'un parcours, pas comme un formulaire administratif.                                                                     | CTA principal, hero, relances                                             |
| **Explorateur**          | Utilisateur inscrit qui découvre le produit, commence à partager ses premières rencontres. Premier niveau d'engagement après l'inscription.                                                                                                | Gamification (roadmap), profil                                            |
| **Observateur**          | Utilisateur régulier qui alimente son journal, contribue au feed et interagit avec la communauté. Niveau intermédiaire d'engagement.                                                                                                       | Gamification (roadmap), profil                                            |
| **Sentinelle**           | Utilisateur avancé reconnu pour la qualité de ses contributions et sa capacité à aider les autres (identification, conseils terrain). Rôle de référent bienveillant.                                                                       | Gamification (roadmap), modération communautaire                          |

### Identité & marque

| Terme           | Définition                                                                                                                                                                                                                                     | Contexte d'usage                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **L'Hermine**   | Animal totem de Naturegraph. Symbole de résilience, d'adaptabilité et de discrétion. Elle incarne la posture de l'utilisateur : observer, comprendre, évoluer avec la nature. Son pelage changeant inspire la palette de couleurs (écru/warm). | Storytelling, section Mission, identité visuelle |
| **Naturegraph** | Le nom combine "Nature" (le sujet) et "graph" (la trace, le lien, le réseau). Chaque utilisateur dessine son propre graphe de rencontres nature — un réseau de souvenirs, de lieux et de découvertes qui se connectent au fil du temps.        | Partout                                          |

### Fonctionnalités

| Terme                            | Définition                                                                                                                                                                            | Contexte d'usage                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Identification collaborative** | Quand un utilisateur partage une observation sans connaître l'espèce, la communauté peut proposer des identifications. C'est de l'entraide, pas de la validation scientifique.        | Feed, détail observation, notifications |
| **Feed**                         | Le fil d'actualité communautaire — les dernières rencontres partagées par les utilisateurs, accessible à tous (y compris les visiteurs sans compte).                                  | Navigation principale, accueil app      |
| **Carte des rencontres**         | La carte interactive qui géolocalise les observations de la communauté. Permet d'explorer la biodiversité par lieu et de découvrir ce qui a été observé autour de soi.                | Navigation principale, exploration      |
| **Défis** (roadmap)              | Des objectifs ludiques proposés par Naturegraph ou la communauté — "Observer 5 espèces d'oiseaux ce mois-ci", "Partager une sortie en forêt". Gamification douce, jamais compétitive. | Gamification, engagement                |

### Niveaux d'accès

| Terme         | Définition                                                                                                             | Accès                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Visiteur**  | Personne qui utilise Naturegraph sans compte. Peut explorer le feed, la carte et partager un Instant Nature anonyme.   | Feed public, carte, observation anonyme |
| **Membre**    | Utilisateur inscrit avec un compte. Accès complet au Journal de la Nature, aux interactions et à la sauvegarde.        | Tout le produit                         |
| **Migrateur** | Membre actif sur Discord, impliqué dans la vie du projet. Accès anticipé aux nouveautés, participation aux bêta-tests. | Discord + accès staging                 |

### Ton éditorial — Mots à utiliser vs à éviter

| ✅ Vocabulaire Naturegraph | ❌ À éviter                  |
| -------------------------- | ---------------------------- |
| Rencontre                  | Observation scientifique     |
| Sortie                     | Session de terrain           |
| Journal de la Nature       | Historique / Base de données |
| Partager                   | Soumettre / Envoyer          |
| Découvrir                  | Consulter                    |
| Migrateur                  | Utilisateur premium / Admin  |
| Instant Nature             | Signalement rapide           |
| Émotion, ressenti          | Catégorie, métadonnée        |
| Carnet                     | Collection / Dossier         |
| Aventure                   | Service / Plateforme         |
| Communauté                 | Utilisateurs                 |
| Rencontres nature          | Données naturalistes         |

---

## Références

- [Guide d'éco-conception — Designers Éthiques](https://designersethiques.org/fr/thematiques/ecoconception/guide-d-ecoconception) (CC-BY)
- [RGESN — Référentiel Général d'Écoconception](https://ecoresponsable.numerique.gouv.fr/publications/referentiel-general-ecoconception/)
- [WCAG 2.1 — W3C](https://www.w3.org/WAI/WCAG21/quickref/)
- [RGAA — Référentiel Général d'Amélioration de l'Accessibilité](https://accessibilite.numerique.gouv.fr/)
- [Figma — Naturegraph Design System](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/Naturegraph---Web-App--WIP-Nicolas-)

---

_Dernière mise à jour : 2026-03-20_
_Version : 4.0_
