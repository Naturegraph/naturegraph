# PRD — Landing Page Naturegraph

> Product Requirements Document
> Version : 2.0 — 2026-03-20
> Auteur : Nicolas (Design/Dev) + Claude (PM/Tech)
> Statut : En cours d'implémentation

---

## Table des matières

1. [Contexte & stratégie](#1-contexte--stratégie)
2. [Objectifs business](#2-objectifs-business)
3. [Parcours utilisateur](#3-parcours-utilisateur)
4. [Architecture des sections](#4-architecture-des-sections)
5. [Spécifications par section](#5-spécifications-par-section)
6. [Assets & contenu](#6-assets--contenu)
7. [Responsive design](#7-responsive-design)
8. [SEO](#8-seo)
9. [Contraintes techniques](#9-contraintes-techniques)
10. [Métriques de succès](#10-métriques-de-succès)
11. [Roadmap d'implémentation](#11-roadmap-dimplémentation)
12. [Décisions ouvertes](#12-décisions-ouvertes)

---

## 1. Contexte & stratégie

### Pourquoi cette landing page ?

Naturegraph n'est pas en mode waitlist. Le produit se lance directement — la landing page est la **porte d'entrée vers l'inscription et l'engagement immédiat**. Elle doit convaincre en quelques secondes et convertir en quelques scrolls.

### Rôle de la landing

| Fonction                 | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| **Vitrine produit**      | Faire comprendre ce qu'est Naturegraph et pourquoi c'est différent |
| **Machine à conversion** | Transformer les visiteurs en utilisateurs inscrits                 |
| **Pont communautaire**   | Amener les curieux vers Discord pour construire la communauté      |
| **Page SEO**             | Référencer Naturegraph sur les requêtes nature/observation         |
| **Carte de visite**      | Crédibiliser le projet auprès des partenaires et de la presse      |

La landing page est **indépendante de l'application**. Elle sera maintenue même après le lancement complet, en tant que vitrine publique permanente.

### Sources de vérité

| Source             | Rôle                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Figma**          | Design de référence — [Naturegraph Web App (WIP)](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/Naturegraph---Web-App--WIP-Nicolas-) |
| **naturegraph.fr** | Ancienne version live — base visuelle et contenu                                                                                           |
| **GUIDELINES.md**  | Identité de marque, design system, principes techniques                                                                                    |
| **Code**           | `src/pages/Landing.tsx` + composants associés                                                                                              |

---

## 2. Objectifs business

### Objectif principal

**Inscriptions et engagement immédiat** — lancement direct du produit, pas de waitlist.

Trois axes de conversion, par ordre de priorité :

1. **Essayer sans compte** → vivre l'expérience immédiatement, zéro friction
2. **Créer un compte** → débloquer le Journal de la Nature et les fonctionnalités complètes
3. **Rejoindre Discord** → intégrer la communauté active

### Philosophie d'accès : tester avant de s'engager

> **Principe fondamental** : un visiteur doit pouvoir tester Naturegraph sans créer de compte. La création de compte ne doit jamais être un mur, mais une **invitation naturelle** qui arrive quand l'utilisateur a déjà vécu une première expérience positive.

L'accès visiteur (sans compte) permet de :

| Action visiteur                            | Disponible sans compte | Nécessite un compte |
| ------------------------------------------ | ---------------------- | ------------------- |
| Explorer le feed public                    | ✅                     | —                   |
| Consulter les observations des autres      | ✅                     | —                   |
| Partager une première observation anonyme  | ✅                     | —                   |
| Naviguer la carte des observations         | ✅                     | —                   |
| Identifier une espèce (aide communautaire) | —                      | ✅                  |
| Créer son Journal de la Nature             | —                      | ✅                  |
| Commenter et interagir                     | —                      | ✅                  |
| Participer aux défis et objectifs          | —                      | ✅                  |
| Sauvegarder ses observations dans le temps | —                      | ✅                  |

**Moment de conversion naturel** : après sa première observation anonyme, le visiteur voit un message du type _"Ton observation a été partagée ! Crée ton compte pour la retrouver dans ton Journal de la Nature et suivre les réponses de la communauté."_

L'inscription devient une **récompense** (débloquer son journal, retrouver ses souvenirs) et non une **barrière** (formulaire obligatoire avant de tester).

### KPIs de succès

| KPI                                    | Objectif                                 | Priorité      | Fréquence       |
| -------------------------------------- | ---------------------------------------- | ------------- | --------------- |
| Observations anonymes créées           | Signal d'intérêt, premier engagement     | 🔴 Critique   | Quotidien       |
| Taux conversion visiteur → inscription | > 15% des visiteurs qui essaient         | 🔴 Critique   | Hebdomadaire    |
| Inscriptions / comptes créés           | Croissance constante dès le lancement    | 🔴 Critique   | Quotidien       |
| Taux de clic CTA principal             | > 5% des visiteurs landing               | 🔴 Critique   | Hebdomadaire    |
| Membres Discord actifs                 | Communauté engagée (messages, réactions) | 🟠 Important  | Hebdomadaire    |
| Scroll depth > 60%                     | > 40% des visiteurs                      | 🟠 Important  | Hebdomadaire    |
| Temps moyen sur page                   | > 45 secondes                            | 🟡 Secondaire | Hebdomadaire    |
| Taux de rebond                         | < 60%                                    | 🟡 Secondaire | Hebdomadaire    |
| Lighthouse perf mobile                 | > 90                                     | 🔴 Critique   | À chaque deploy |
| EcoIndex                               | A ou B                                   | 🟠 Important  | Mensuel         |

### Appels à l'action (CTA)

| CTA             | Libellé                                         | Destination                                       | Priorité |
| --------------- | ----------------------------------------------- | ------------------------------------------------- | -------- |
| **Principal**   | "Partager une observation"                      | Formulaire d'observation (accessible sans compte) | 🔴       |
| **Secondaire**  | "Rejoindre l'aventure"                          | Page d'inscription / création de compte           | 🔴       |
| **Tertiaire**   | "Rejoindre la communauté" / "Devenir migrateur" | Invitation Discord                                | 🟠       |
| **Quaternaire** | "Découvrir notre solution"                      | Scroll vers section Découvrir                     | 🟡       |

---

## 3. Parcours utilisateur

### D'où vient le visiteur ?

| Source                    | Contexte                                   | État d'esprit                           | Priorité |
| ------------------------- | ------------------------------------------ | --------------------------------------- | -------- |
| **Instagram**             | Story, reel, post nature                   | Visuel, émotionnel, rapide              | 🔴       |
| **TikTok**                | Vidéo courte, tendance nature              | Jeune, curieux, mobile                  | 🔴       |
| **LinkedIn**              | Post projet, article fondateur             | Professionnel, intéressé par la mission | 🟠       |
| **SEO / Google**          | "app observation nature", "journal nature" | En recherche active, comparatif         | 🟠       |
| **Bouche-à-oreille**      | Recommandation d'un ami ou naturaliste     | Confiant, ouvert, prêt à tester         | 🟠       |
| **Presse / articles**     | Mention dans un média nature ou tech       | Curieux, veut vérifier                  | 🟡       |
| **Discord / communautés** | Lien partagé dans un groupe nature         | Déjà engagé, veut en savoir plus        | 🟡       |

### Ce qu'il doit comprendre en 5 secondes

> Naturegraph est une **plateforme immersive pour explorer la nature**, où l'on peut **partager ses émotions et observations** et construire **son Journal de la Nature** avec une communauté bienveillante.

Trois messages clés, dans cet ordre :

1. **Émotion** — Ce n'est pas une app scientifique froide, c'est une expérience humaine
2. **Journal** — Chaque sortie devient un souvenir qui s'enrichit dans le temps
3. **Communauté** — On apprend ensemble, on partage ensemble

### Ce qu'il doit faire avant de partir

| Scénario       | Action                                                    | Taux visé |
| -------------- | --------------------------------------------------------- | --------- |
| **Idéal**      | Essayer → partager une première observation (sans compte) | > 8%      |
| **Très bon**   | S'inscrire via "Rejoindre l'aventure"                     | > 5%      |
| **Bon**        | Rejoindre le Discord                                      | > 3%      |
| **Acceptable** | Partager la page avec un ami                              | > 1%      |
| **Minimum**    | Scroller jusqu'à la FAQ et retenir le nom "Naturegraph"   | > 40%     |

### Tunnel de conversion sans friction

```
Landing page
    ↓
"Partager une observation" (CTA principal)
    ↓
Formulaire simplifié (photo + lieu + émotion) — SANS COMPTE
    ↓
Observation publiée ! 🎉
    ↓
"Crée ton compte pour retrouver cette observation
 dans ton Journal de la Nature"
    ↓
Inscription (email ou social login)
    ↓
Utilisateur engagé avec déjà un souvenir dans son journal
```

Ce tunnel réduit la friction à zéro : le visiteur **vit l'expérience avant de s'engager**. Son observation anonyme devient la première page de son journal une fois le compte créé.

---

## 4. Architecture des sections

### Structure validée — 11 sections

| #   | Section               | Rôle narratif                                    | Priorité      |
| --- | --------------------- | ------------------------------------------------ | ------------- |
| 1   | **Header**            | Navigation claire + CTA toujours visible         | 🔴 Critique   |
| 2   | **Hero**              | Accroche émotionnelle — comprendre en 5 secondes | 🔴 Critique   |
| 3   | **Découvrir**         | 3 piliers produit — ce qu'on peut faire          | 🔴 Critique   |
| 4   | **Valeurs**           | Pourquoi Naturegraph existe — les convictions    | 🔴 Critique   |
| 5   | **Fonctionnalités**   | Comment ça marche — le détail des features       | 🟠 Important  |
| 6   | **CTA intermédiaire** | Relance de conversion — micro-arguments          | 🟠 Important  |
| 7   | **Mission & Hermine** | Storytelling — identité, animal totem, vision    | 🟠 Important  |
| 8   | **Discord**           | Invitation communauté — preuve sociale           | 🟠 Important  |
| 9   | **FAQ**               | Lever les freins — répondre aux objections       | 🔴 Critique   |
| 10  | **Partenaires**       | Crédibilité — écosystème de confiance            | 🟡 Secondaire |
| 11  | **Footer**            | Navigation secondaire, légal, réseaux            | 🔴 Critique   |

### Flux narratif

```
ÉMOTION          → Hero : "Ensemble, donnons vie à tes rencontres !"
ESSAI IMMÉDIAT   → Hero CTA : "Partager une observation" (sans compte)
COMPRÉHENSION    → Découvrir : 3 piliers (observer, partager, construire)
CONVICTION       → Valeurs : pourquoi c'est différent
PROJECTION       → Fonctionnalités : comment ça marche concrètement
RELANCE          → CTA intermédiaire : "Commence ton journal"
CONNEXION        → Mission & Hermine : l'histoire, l'animal totem, la vision
COMMUNAUTÉ       → Discord : rejoindre les autres
RASSURANCE       → FAQ : lever les derniers doutes (+ "C'est gratuit ? Dois-je créer un compte ?")
CRÉDIBILITÉ      → Partenaires : ils nous soutiennent
CONVERSION       → Footer : dernière chance — essayer ou s'inscrire
```

Le CTA "Partager une observation" est le **premier bouton** du hero. Il ne demande rien — pas de compte, pas d'email. Le visiteur est immédiatement dans l'action. L'inscription vient après, comme une suite logique.

### Si on ne garde que 5 sections

1. Header/Hero — émotion + CTA
2. Découvrir — comprendre le produit
3. Valeurs — se reconnaître
4. FAQ — lever les freins
5. Footer — convertir

---

## 5. Spécifications par section

### 5.1 Header

**Node Figma** : `6449:259`

| Élément    | Spécification                                                            |
| ---------- | ------------------------------------------------------------------------ |
| Logo       | Wordmark SVG blanc, top left, `h-10 w-auto`                              |
| Navigation | Découvrir · Valeurs · Communauté · FAQ — liens ancre blancs, centrés     |
| CTA        | "Rejoindre l'aventure" — pill violet `--color-action-default`, top right |
| Mobile     | Burger menu, logo réduit, CTA maintenu                                   |

**Comportement** : intégré dans le fond teal du hero (pas de barre blanche séparée). Pas de sticky — le CTA est répété à plusieurs endroits de la page.

**Contenus i18n** : `landing.nav.*`

---

### 5.2 Hero

**Node Figma** : `6449:259`

| Élément          | Spécification                                                           |
| ---------------- | ----------------------------------------------------------------------- |
| Fond             | `--color-highlight-primary` (#006666), `border-radius: 32px` desktop    |
| Titre            | "Ensemble, donnons vie à tes rencontres !" — Quicksand Bold 64px, blanc |
| Sous-titre       | Description courte — Mulish 18px, blanc 80% opacité                     |
| CTA principal    | "Partager une observation" — pill violet                                |
| CTA secondaire   | "Découvrir notre solution" — outline blanc, scroll vers section 3       |
| Phone mockups    | 4 écrans app inclinés avec blobs décoratifs violet/menthe               |
| Scroll indicator | Icône souris SVG avec animation pulse douce                             |

**Responsive** :

- Mobile : titre 40px, pas de phones, boutons empilés full-width
- Tablette : titre 48px, 2 phones
- Desktop : titre 64px, 4 phones, blobs visibles

**Contenus i18n** : `landing.hero.*`

---

### 5.3 Découvrir (3 cartes)

| Élément    | Spécification                                                       |
| ---------- | ------------------------------------------------------------------- |
| Titre      | "Découvre Naturegraph" — Quicksand Bold                             |
| Sous-titre | "Observer et découvrir la nature, ensemble."                        |
| Carte 1    | 🔍 Explorer la nature — icône Lucide `Search` + titre + description |
| Carte 2    | 📸 Partager ses émotions et observations — icône Lucide `Camera`    |
| Carte 3    | 💚 Contribuer à la communauté — icône Lucide `Heart`                |

**Design** :

- Fond page : `--color-bg-primary` (#FFFDF8)
- Cartes : fond `--color-bg-secondary` (#FFFAF0), `border-radius: 20px`, ombre légère
- Grid : 1 col mobile → 3 col desktop
- Scroll reveal au défilement

**Contenus i18n** : `landing.features.*`

---

### 5.4 Valeurs

| Élément | Spécification                                                                |
| ------- | ---------------------------------------------------------------------------- |
| Image   | Photo nature immersive (demi-largeur desktop, pleine largeur mobile)         |
| Items   | 3 valeurs : accessibilité · curiosité · engagement                           |
| Texte   | Courte phrase expliquant ce que Naturegraph représente pour les utilisateurs |

**Layout** : asymétrique — image à gauche, contenu à droite (desktop). Empilé sur mobile.

**Contenus i18n** : `landing.values.*`

---

### 5.5 Fonctionnalités détaillées

| Élément      | Spécification                                                          |
| ------------ | ---------------------------------------------------------------------- |
| Fond         | `--color-highlight-primary` (#006666), texte blanc                     |
| Feature 1    | Journal de la Nature personnel — conserver et revivre ses observations |
| Feature 2    | Gamification douce — défis, objectifs, participation                   |
| Feature 3    | Identification collaborative — apprentissage communautaire             |
| Feature 4    | Carte interactive — localiser ses rencontres                           |
| Illustration | Phone mockup central + micro-animation par feature (CSS-only)          |

**Layout** : liste à gauche, phone à droite (desktop). Empilé sur mobile.

**Contenus i18n** : `landing.detailedFeatures.*`

---

### 5.6 CTA intermédiaire

| Élément         | Spécification                                                    |
| --------------- | ---------------------------------------------------------------- |
| Image           | Martin-pêcheur (pleine largeur ou côte-à-côte)                   |
| Titre           | Accroche de relance — ex: "Commence ton journal dès aujourd'hui" |
| Micro-arguments | 2-3 raisons courtes de s'inscrire maintenant                     |
| CTA             | "Rejoindre l'aventure" — pill violet (même que hero)             |

**Contenus i18n** : `landing.cta.*`

---

### 5.7 Mission, Storytelling & Animal totem

Cette section est le **cœur émotionnel** de la landing. Elle raconte l'histoire de Naturegraph à travers l'Hermine.

| Élément      | Spécification                                                                              |
| ------------ | ------------------------------------------------------------------------------------------ |
| Animal totem | L'Hermine — illustration ou photo de qualité                                               |
| Symbolique   | Résilience, discrétion, adaptabilité                                                       |
| Message      | Observer, comprendre, évoluer avec la nature                                               |
| Connexion    | Chaque sortie = souvenir + apprentissage                                                   |
| Identité     | Les couleurs racontent l'Hermine : vert (habitat), écru (pelage), violet (différenciation) |
| CTA          | Invitation inspirante à rejoindre l'aventure                                               |

**Ton** : narratif, personnel, inspirant. C'est le moment où le visiteur comprend **pourquoi** Naturegraph existe, pas juste **ce que** c'est.

**Contenus i18n** : `landing.mission.*`

---

### 5.8 Discord

| Élément   | Spécification                                                                   |
| --------- | ------------------------------------------------------------------------------- |
| Fond      | `--color-highlight-primary` (#006666)                                           |
| Titre     | "Rejoins-nous sur Discord !"                                                    |
| Arguments | Entraide · identification collaborative · échanges · partages · avant-premières |
| CTA       | "Devenir migrateur" — pill violet + icône Discord                               |
| Visuel    | Screenshot/preview du serveur Discord en décor                                  |

**Contenus i18n** : `landing.discord.*`

---

### 5.9 FAQ (Accordion)

| Élément   | Spécification                                                                                |
| --------- | -------------------------------------------------------------------------------------------- |
| Titre     | "Questions fréquentes"                                                                       |
| Questions | 4-6 questions ciblées pour lever les freins à l'inscription                                  |
| Thèmes    | Sécurité des données · accessibilité · types d'observations · gratuit ou payant · communauté |

**Accessibilité** :

- `aria-expanded`, `aria-controls` sur chaque toggle
- Une seule réponse ouverte à la fois
- Animation CSS fluide (max-height transition)
- Navigable au clavier (Enter/Space pour ouvrir, Escape pour fermer)

**Contenus i18n** : `landing.faq.*`

---

### 5.10 Partenaires

| Élément | Spécification                                |
| ------- | -------------------------------------------- |
| Titre   | "Ils nous soutiennent"                       |
| Logos   | eHub · Kreapulse · Paloume · Wazoom          |
| Style   | Niveaux de gris par défaut, couleur au hover |
| Liens   | Vers le site de chaque partenaire            |

**Évolution** : possibilité d'ajouter des mentions presse ou naturalistes reconnus.

**Contenus i18n** : `landing.partners.*`

---

### 5.11 Footer

| Élément   | Spécification                                                     |
| --------- | ----------------------------------------------------------------- |
| Logo      | Wordmark SVG couleur                                              |
| Tagline   | Phrase d'accroche courte                                          |
| Colonnes  | Produit · À propos · Nous rejoindre                               |
| Légal     | Mentions légales · CGU · Politique de confidentialité · Copyright |
| Réseaux   | Instagram · Discord · LinkedIn (icônes Lucide)                    |
| CTA final | Dernière invitation à s'inscrire                                  |

**Fond** : `--color-bg-secondary` (#FFFAF0)

**Contenus i18n** : `footer.*`

---

## 6. Assets & contenu

### Statut du contenu

| Type                       | Statut         | Notes                                               |
| -------------------------- | -------------- | --------------------------------------------------- |
| Textes FR                  | ✅ Validés     | Dans `fr.json`, ajustements mineurs possibles       |
| Textes EN                  | 🟡 À traduire  | Structure i18n prête, contenu FR à traduire         |
| Photos hero (phones)       | ✅ Définitives | Mockups app issus du Figma                          |
| Photo valeurs              | ⚠️ Provisoire  | Immersive et qualitative — finalisation à confirmer |
| Photo CTA (martin-pêcheur) | ✅ Définitive  | Image haute qualité                                 |
| Photo/illustration Hermine | 🟡 À sourcer   | Pour la section Mission & Storytelling              |
| Logos partenaires          | ✅ Confirmés   | SVG/PNG disponibles                                 |
| Logo Naturegraph           | ✅ Définitif   | SVG wordmark (blanc + couleur)                      |

### Contenu futur (post-lancement)

| Type                     | Statut       | Timing                                    |
| ------------------------ | ------------ | ----------------------------------------- |
| Vidéo hero / démo app    | 🟡 Optionnel | v2 — micro-animation ou vidéo courte      |
| Témoignages utilisateurs | 🟡 Optionnel | Post-bêta — bêta-testeurs ou naturalistes |
| Mentions presse          | 🟡 Optionnel | Dès les premières retombées               |

### Optimisation des images

Toutes les images intégrées doivent respecter :

- Format **WebP** (fallback PNG)
- Compression **< 100 KB** par image affichée
- `width` et `height` explicites (éviter le CLS)
- `loading="lazy"` sauf images above the fold (hero)
- Alt text descriptif ou `alt=""` si purement décoratif

---

## 7. Responsive design

### Breakpoints (Tailwind v4)

| Breakpoint   | Largeur     | Comportement                                                                                 |
| ------------ | ----------- | -------------------------------------------------------------------------------------------- |
| **Mobile**   | < 768px     | 1 colonne · burger menu · hero compact (pas de phones) · boutons empilés · sections empilées |
| **Tablette** | 768–1023px  | 2 colonnes · nav visible · 2 phones · grille adaptée                                         |
| **Desktop**  | 1024–1439px | Layout complet · 4 phones · navigation pleine · sections côte-à-côte                         |
| **Large**    | ≥ 1440px    | Centré `max-width: 1440px` · marges auto                                                     |

### Adaptations mobile prioritaires

| Composant       | Adaptation                                                         |
| --------------- | ------------------------------------------------------------------ |
| Header          | Burger menu animé, logo wordmark compact                           |
| Hero            | Titre 40px, sous-titre 16px, pas de phones, CTA empilés full-width |
| Découvrir       | Cartes empilées en 1 colonne                                       |
| Valeurs         | Image au-dessus du texte                                           |
| Fonctionnalités | Phone au-dessus de la liste                                        |
| FAQ             | Accordion pleine largeur, zones touch 48px minimum                 |
| Footer          | Colonnes empilées, CTA centré                                      |

### Principes responsive

- **Mobile-first** dans le code (classes de base = mobile, `md:` et `lg:` pour enrichir)
- CTA toujours visible sans scroll horizontal
- Zones touch minimum **48×48px** sur mobile
- Texte lisible sans zoom (minimum 16px corps)

---

## 8. SEO

### Mots-clés cibles

| Primaire                     | Secondaire             |
| ---------------------------- | ---------------------- |
| observation nature app       | journal nature         |
| partager observations nature | communauté naturaliste |
| carnet de terrain numérique  | identifier espèces     |
| app biodiversité             | sortie nature          |
| rencontre nature             | journal de la nature   |

### Balises obligatoires

| Balise               | Contenu                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `<title>`            | Naturegraph — Explore, observe, partage tes rencontres nature                                                        |
| `<meta description>` | Plateforme communautaire pour observer la nature, partager tes émotions et créer ton Journal de la Nature personnel. |
| `og:title`           | Naturegraph — Ton Journal de la Nature                                                                               |
| `og:description`     | Explore, observe et partage tes rencontres nature avec une communauté bienveillante.                                 |
| `og:image`           | Screenshot du hero (1200×630px)                                                                                      |
| `og:type`            | website                                                                                                              |

### Structured data (JSON-LD)

- `WebApplication` — nom, description, URL, catégorie
- `Organization` — Naturegraph, logo, réseaux sociaux
- `FAQPage` — questions/réponses de la section FAQ (rich snippets Google)

---

## 9. Contraintes techniques

### Performance (non-négociable)

| Métrique                 | Seuil                  | Outil            |
| ------------------------ | ---------------------- | ---------------- |
| Lighthouse mobile (perf) | **> 90**               | Lighthouse       |
| Lighthouse mobile (a11y) | **> 90**               | Lighthouse       |
| Poids total page         | **< 500 KB** transfert | DevTools Network |
| LCP                      | **< 2.5s**             | Lighthouse       |
| FID / INP                | **< 200ms**            | Lighthouse       |
| CLS                      | **< 0.1**              | Lighthouse       |
| EcoIndex                 | **A ou B**             | GreenIT Analysis |
| Requêtes HTTP            | **< 30**               | DevTools Network |

### Accessibilité (non-négociable)

- WCAG **AA** intégral — voir [GUIDELINES.md §8](./GUIDELINES.md#8-accessibilité-wcag-aa)
- Skip link en premier élément du DOM
- Navigation clavier complète sur tous les interactifs
- `prefers-reduced-motion` respecté sur toutes les animations

### Éco-conception

- CSS-only pour les animations (IntersectionObserver, transitions)
- Pas de librairie d'animation JS
- Images lazy-loaded et compressées
- Polices limitées à 2 familles (Quicksand + Mulish)

### Stack

- React 19 + TypeScript + Vite 7.3
- Tailwind CSS v4 + SCSS (7-1 pattern, `@layer base`)
- react-i18next pour l'internationalisation
- Pas de dépendance JS supplémentaire sans justification

---

## 10. Métriques de succès

### Outils de mesure

| Outil                   | Rôle               | Conformité                    |
| ----------------------- | ------------------ | ----------------------------- |
| **Plausible Analytics** | Analytics web      | RGPD-friendly, pas de cookies |
| **Lighthouse CI**       | Performance + a11y | Intégré au pipeline de deploy |
| **GreenIT Analysis**    | EcoIndex           | Audit mensuel                 |

> Pas de Google Analytics — choix éco-conception + respect RGPD.

### Tableau de bord post-lancement

| Métrique                | Objectif                   | Fréquence       | Action si KO                      |
| ----------------------- | -------------------------- | --------------- | --------------------------------- |
| Inscriptions            | Croissance semaine/semaine | Quotidien       | Revoir hero + CTA                 |
| Taux clic CTA principal | > 5%                       | Hebdomadaire    | A/B test libellé ou couleur       |
| Membres Discord actifs  | Communauté engagée         | Hebdomadaire    | Revoir section Discord            |
| Scroll depth > 60%      | > 40% visiteurs            | Hebdomadaire    | Revoir ordre des sections         |
| Temps moyen sur page    | > 45s                      | Hebdomadaire    | Enrichir le contenu               |
| Taux de rebond          | < 60%                      | Hebdomadaire    | Revoir hero + temps de chargement |
| Lighthouse perf mobile  | > 90                       | À chaque deploy | Bloquer le deploy si < 85         |
| EcoIndex                | A ou B                     | Mensuel         | Audit et optimisation images      |

---

## 11. Roadmap d'implémentation

### Phase 1 — Structure (✅ Fait)

- [x] Architecture `Landing.tsx` avec toutes les sections
- [x] Intégration i18n FR complète
- [x] Assets images importés depuis le legacy
- [x] Scroll reveal animations (CSS-only, IntersectionObserver)
- [x] Fix compatibilité Tailwind v4 / SCSS (`@layer base`)
- [x] Logo wordmark SVG (blanc + couleur)
- [x] Hook `useScrollReveal` avec `prefers-reduced-motion`

### Phase 2 — Pixel perfect Figma (🔄 En cours)

- [x] Header : logo wordmark, navigation, CTA violet
- [x] Hero : titre, sous-titre, boutons, fond teal
- [ ] Hero : phone mockups 4 écrans + blobs décoratifs
- [ ] Découvrir : 3 cartes avec icônes Lucide
- [ ] Valeurs : layout asymétrique image + texte
- [ ] Fonctionnalités : fond teal, phone mockup, 4 features
- [ ] CTA intermédiaire : martin-pêcheur + micro-arguments
- [ ] Mission & Hermine : storytelling, animal totem, vision
- [ ] Discord : invitation + preview serveur
- [ ] FAQ : accordion accessible (aria, clavier)
- [ ] Partenaires : grille logos hover
- [ ] Footer : 3 colonnes, réseaux, CTA final

### Phase 3 — Polishing

- [ ] Responsive mobile pixel-perfect (chaque section)
- [ ] Responsive tablette
- [ ] Optimisation images (conversion WebP, compression < 100 KB)
- [ ] SEO : meta tags, Open Graph, structured data JSON-LD, sitemap
- [ ] Tests accessibilité : WAVE, axe DevTools, navigation clavier, lecteur d'écran
- [ ] Tests performance : Lighthouse > 90, GreenIT A/B
- [ ] Tests cross-browser : Chrome, Firefox, Safari, Edge

### Phase 4 — Contenu & lancement

- [ ] Traduction EN complète
- [ ] Image Open Graph optimisée (1200×630px)
- [ ] Liens réseaux sociaux actifs (Instagram, Discord, LinkedIn)
- [ ] Intégration Plausible Analytics
- [ ] Illustration / photo Hermine pour section Mission
- [ ] Déploiement production
- [ ] Soumission Search Console + sitemap

### Phase 5 — Post-lancement (itérations)

- [ ] A/B test CTA (libellé, couleur, position)
- [ ] Ajout témoignages bêta-testeurs
- [ ] Micro-animations hero (CSS-only)
- [ ] Section mentions presse (si retombées)
- [ ] Vidéo courte démo app (si pertinent)

---

## 12. Décisions ouvertes

| Question                   | Options                                                | Statut                             |
| -------------------------- | ------------------------------------------------------ | ---------------------------------- |
| Photo/illustration Hermine | Photo réelle · Illustration 2D · SVG stylisé           | 🟡 À choisir                       |
| Vidéo hero en v2 ?         | Micro-animation CSS · Vidéo courte · Non               | 🟡 À évaluer post-lancement        |
| Témoignages                | Section dédiée · Intégrés dans les sections existantes | 🟡 Post-bêta                       |
| Blog / articles nature     | Section landing · Page séparée · Non pour MVP          | 🟡 À définir                       |
| Header sticky au scroll ?  | Oui (transparent → opaque) · Non (intégré dans hero)   | ✅ Non — intégré dans hero         |
| Nombre de FAQ              | 4 questions · 6 questions · Extensible                 | 🟡 À valider avec le contenu final |

---

## Annexe — Correspondance i18n

Mapping entre les sections et les clés de traduction dans `src/i18n/locales/fr.json` :

| Section             | Clés i18n                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Header / Navigation | `landing.nav.discover` · `landing.nav.values` · `landing.nav.community` · `landing.nav.faq` · `landing.nav.signup` · `landing.nav.login` |
| Hero                | `landing.hero.titleLine1` · `landing.hero.titleLine2` · `landing.hero.subtitle` · `landing.hero.ctaShare` · `landing.hero.ctaDiscover`   |
| Découvrir           | `landing.features.title` · `landing.features.subtitle` · `landing.features.card1Title` · `landing.features.card1Desc` · etc.             |
| Valeurs             | `landing.values.title` · `landing.values.item1Title` · `landing.values.item1Desc` · etc.                                                 |
| Fonctionnalités     | `landing.detailedFeatures.title` · `landing.detailedFeatures.subtitle` · `landing.detailedFeatures.item1Title` · etc.                    |
| CTA intermédiaire   | `landing.cta.title` · `landing.cta.description` · `landing.cta.button`                                                                   |
| Mission & Hermine   | `landing.mission.title` · `landing.mission.paragraph1` · `landing.mission.paragraph2`                                                    |
| Discord             | `landing.discord.title` · `landing.discord.description` · `landing.discord.benefit1` · etc. · `landing.discord.button`                   |
| FAQ                 | `landing.faq.title` · `landing.faq.q1` · `landing.faq.a1` · etc.                                                                         |
| Partenaires         | `landing.partners.title`                                                                                                                 |
| Footer              | `footer.tagline` · `footer.product.*` · `footer.about.*` · `footer.cta.*` · `footer.copyright`                                           |

---

_Ce document sera mis à jour au fil de l'implémentation._
_Chaque section validée sera cochée dans la roadmap._

_Dernière mise à jour : 2026-03-20_
_Version : 2.0_
