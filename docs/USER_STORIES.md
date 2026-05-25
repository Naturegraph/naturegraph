# Naturegraph — Référentiel User Stories (SOCLE)

> **Version** : 1.1 — 2026-05-02
> **Statut** : Socle de référence pour les audits QA, eco-conception, accessibilité, et tests utilisateurs.
> **Périmètre** : 100 % des flows existants dans le code à la date du document. **Aucune feature future** n'est listée ici.
> **Convention** : chaque US est testable indépendamment. Les critères Gherkin (Given/When/Then) sont le contrat QA.

> **Changelog v1.1 (2026-05-02)** — 4 décisions produit MVP intégrées :
>
> - Q1 : description **optionnelle** (US-CONTRIB-03 alignée)
> - Q2 : multi-observation **retirée du MVP** (US-CONTRIB-02 alignée)
> - Q3 : boutons sociaux Google/Apple/Facebook **retirés du MVP** (US-AUTH alignée)
> - Q4 : toggle "Aide à l'identification" + filtre feed **retirés du MVP** (US-CONTRIB / US-FEED alignés)

---

## Sommaire

1. [Landing Page](#1-landing-page)
2. [Onboarding (4 étapes)](#2-onboarding-4-étapes)
3. [Authentification (magic link OTP)](#3-authentification-magic-link-otp)
4. [Home — visiteur non connecté](#4-home--visiteur-non-connecté)
5. [Home — utilisateur connecté](#5-home--utilisateur-connecté)
6. [Feed — Tabs, filtres, interactions post](#6-feed--tabs-filtres-interactions-post)
7. [Création d'une observation (Encounter, 3 étapes)](#7-création-dune-observation-encounter-3-étapes)
8. [Upload images (max 4)](#8-upload-images-max-4)
9. [Profil — affichage owner / visiteur](#9-profil--affichage-owner--visiteur)
10. [Modification du profil (3 onglets)](#10-modification-du-profil-3-onglets)
11. [Paramètres (Sécurité, Notifs, Aide, Licence, Suppression)](#11-paramètres-sécurité-notifs-aide-licence-suppression)
12. [Notifications](#12-notifications-page-dédiée)
13. [Accessibilité — exigences transverses](#13-accessibilité--exigences-transverses-wcag-aa)
14. [Éco-conception — exigences transverses](#14-éco-conception--exigences-transverses)
15. [Non-régression — invariants critiques](#15-non-régression--invariants-critiques)

---

## Conventions

- **US** = User Story (format « En tant que … je veux … afin de … »)
- **AC** = Acceptance Criteria (Gherkin)
- **EC** = Edge Cases
- **DEP** = Dépendances backend (services Supabase, RLS, Edge Functions)
- **A11Y** = Accessibilité spécifique
- **ECO** = Éco-conception spécifique

---

# 1. Landing Page

**Route** : `/`
**Composants** : `pages/Landing` (Hero, FeaturesCards, Values, ProductFeatures, CTABanner, Mission, Discord, FAQ, Partners, Footer)

## US-LAND-01 — Visite de la landing en tant que visiteur

> **En tant que** visiteur non connecté
> **Je veux** découvrir l'offre Naturegraph
> **Afin de** comprendre le projet et décider de m'inscrire ou de continuer à explorer

### AC

```gherkin
Given je suis un visiteur non connecté
When  j'arrive sur "/"
Then  je vois la barre de navigation avec les CTA "Connexion" et "Créer un compte"
And   je vois la section Hero avec un titre, un sous-titre et un CTA principal
And   je peux faire défiler la page jusqu'au footer sans erreur
And   chaque section ci-dessous est rendue dans l'ordre :
      Hero, FeaturesCards, Values, ProductFeatures, CTABanner, Mission, Discord, FAQ, Partners, Footer
```

```gherkin
Given je clique sur le CTA "Créer un compte" (Hero ou Navbar)
When  la navigation s'effectue
Then  je suis redirigé vers "/auth" en mode signup
```

```gherkin
Given je clique sur le CTA "Connexion"
When  la navigation s'effectue
Then  je suis redirigé vers "/auth" en mode login
```

```gherkin
Given je clique sur une question de la FAQ
When  l'accordéon s'ouvre
Then  la réponse devient visible
And   l'attribut aria-expanded passe à "true"
And   un seul item peut être ouvert à la fois (ou plusieurs selon comportement implémenté — à valider)
```

### EC

- Connexion lente : afficher fallback texte si images Hero pas encore chargées (sans CLS)
- Si l'utilisateur est déjà connecté et arrive sur `/` → ne pas le bloquer, mais proposer un CTA vers `/home` cohérent
- Mobile (< 640px) : Hero passe en single-column, ProductFeatures en slider

### DEP

- Aucune (page 100 % statique, pas d'appel Supabase)

### A11Y

- `<nav>` avec aria-label sur la navbar
- FAQ : `<button>` avec aria-expanded + aria-controls pointant sur la zone réponse
- Skip link "Aller au contenu principal" présent
- Contraste texte sur images Hero ≥ 4.5:1 (vérifier overlay)
- Toutes les images décoratives ont `alt=""`, les images informatives un alt descriptif

### ECO

- Images au format WebP/AVIF avec dimensions explicites (`width` / `height`)
- `loading="lazy"` sur toutes les images en dessous du fold
- Pas d'animation infinie (carrousel partenaires : pause sur hover/focus, respect `prefers-reduced-motion`)
- Pas d'appel API au chargement de la landing

---

# 2. Onboarding (4 étapes)

**Route** : `/onboarding` (ou enchaîné depuis `/auth` après signup)
**Composants** : `components/onboarding/index.tsx` + 4 step components
**Étapes** : Intérêts → Fréquence → Motivations → Username

## US-ONB-01 — Choisir mes centres d'intérêt (étape 1)

> **En tant que** nouveau membre
> **Je veux** sélectionner les groupes taxonomiques qui m'intéressent
> **Afin de** personnaliser mon feed et mes notifications

### AC

```gherkin
Given je viens de valider mon code OTP
When  l'étape 1 de l'onboarding s'affiche
Then  je vois 10 chips multi-sélectionnables (oiseaux, mammifères, insectes, amphibiens, reptiles, arachnides, mollusques, poissons, plantes, autre)
And   le bouton "Continuer" est actif (la sélection est facultative)
```

```gherkin
Given je sélectionne au moins une chip d'intérêt
When  je clique sur "Continuer"
Then  ma sélection est conservée en mémoire locale (state du composant onboarding)
And   l'étape 2 s'affiche
```

```gherkin
Given je clique sur "Continuer" sans aucune sélection
When  l'étape passe à 2
Then  l'array `interests` reste vide (aucun blocage)
```

### EC

- Toggle d'une chip déjà sélectionnée → la dé-sélectionne
- Bouton "Retour" inactif sur l'étape 1 (pas d'étape précédente)
- Si modal "Quitter" déclenchée → confirmation requise avant abandon

### DEP

- Aucun appel réseau à cette étape (state local jusqu'à l'étape finale)

### A11Y

- Chips = `<button role="checkbox" aria-checked="true|false">` ou inputs natifs cachés + label
- Indication visuelle ET textuelle de la sélection (pas seulement couleur)
- Tab order logique : chips → Continuer

## US-ONB-02 — Choisir ma fréquence (étape 2)

> **En tant que** nouveau membre
> **Je veux** choisir à quelle fréquence je compte contribuer
> **Afin que** Naturegraph m'envoie des notifications adaptées

### AC

```gherkin
Given je suis sur l'étape 2
When  l'écran s'affiche
Then  je vois 4 options radio mutuellement exclusives : quotidien, hebdomadaire, mensuel, occasionnel
And   le bouton "Continuer" est désactivé tant qu'aucune option n'est sélectionnée
```

```gherkin
Given je sélectionne "hebdomadaire"
When  je clique sur "Continuer"
Then  la fréquence est conservée
And   l'étape 3 s'affiche
```

### EC

- Une seule option active à la fois (radio group)
- Bouton "Retour" me ramène à l'étape 1 avec mes intérêts préservés

### DEP

- Aucun appel réseau ici. La valeur est combinée dans l'INSERT final sur `user_settings.notif_frequency`.

### A11Y

- `role="radiogroup"` avec aria-labelledby
- Navigation flèches haut/bas entre options

## US-ONB-03 — Choisir mes motivations (étape 3)

> **En tant que** nouveau membre
> **Je veux** indiquer ce qui me motive (apprendre, contribuer, partager, …)
> **Afin de** rejoindre une communauté alignée

### AC

```gherkin
Given je suis sur l'étape 3
When  l'écran s'affiche
Then  je vois des chips multi-sélectionnables de motivations
And   le bouton "Continuer" est toujours actif (sélection facultative)
```

### EC

- Idem US-ONB-01 (multi-select, toggle, Quitter)

### DEP

- Aucun appel réseau

## US-ONB-04 — Choisir mon username (étape 4)

> **En tant que** nouveau membre
> **Je veux** choisir un nom d'utilisateur unique
> **Afin que** mes contributions soient identifiables

### AC

```gherkin
Given je suis sur l'étape 4
When  l'écran s'affiche
Then  je vois un input texte avec un placeholder explicatif
And   le bouton "Terminer" est désactivé tant que le champ ne respecte pas le format (alphanumérique + underscore)
```

```gherkin
Given je saisis un username valide et unique
When  je clique sur "Terminer"
Then  un appel UPSERT sur `profiles` est déclenché avec username + interests + motivations + frequency
And   un appel UPDATE sur `user_settings.notif_frequency` est aligné
And   je suis redirigé vers "/home"
```

```gherkin
Given je saisis un username déjà pris
When  je clique sur "Terminer"
Then  un toast d'erreur s'affiche : "Ce nom est déjà utilisé"
And   l'étape 4 reste affichée
```

```gherkin
Given je saisis un username avec caractères invalides (espaces, accents, ponctuation)
When  je perds le focus du champ
Then  un message d'erreur explicite s'affiche sous le champ
And   le bouton "Terminer" reste désactivé
```

### EC

- Username de moins de 3 caractères → invalide
- Username de plus de 30 caractères → invalide (à confirmer côté DB)
- Latence réseau > 2 s : afficher un spinner sur le bouton "Terminer"
- Échec réseau (offline) : toast "Connexion perdue. Réessayer."

### DEP

- `profileService.updateProfile()` ou trigger Supabase sur `profiles`
- `settingsService.updateSettings()` pour `notif_frequency`
- RLS : INSERT / UPDATE sur sa propre ligne `profiles` uniquement

### A11Y

- Label visible associé à l'input via `htmlFor`
- Erreur sous le champ avec `aria-describedby` et `aria-invalid="true"`

### ECO

- Une seule requête finale (à la validation step 4) — pas de check d'unicité à chaque keystroke (debounce 500 ms minimum si implémenté)

---

# 3. Authentification (magic link OTP)

**Route** : `/auth`, `/login`, `/signup`
**Composants** : `pages/AuthPage`, `SignupForm`, `LoginForm`, `VerificationForm`
**Modes** : signup → verification → onboarding | login → verification → /home

> **Décision MVP (Q3)** : seul le **magic link OTP par email** est exposé. Les boutons sociaux (Google/Apple/Facebook) sont masqués pour le MVP — implémentés post-beta selon la demande utilisateur réelle.

## US-AUTH-01 — S'inscrire avec un email

> **En tant que** nouveau visiteur
> **Je veux** créer un compte avec mon email
> **Afin de** rejoindre la plateforme sans avoir à gérer un mot de passe

### AC

```gherkin
Given je suis sur "/auth" en mode signup
When  je saisis un email valide
And   je clique sur "Envoyer un code"
Then  Supabase envoie un OTP à 6 chiffres à mon email
And   l'écran VerificationForm s'affiche
And   un toast "Code envoyé" est visible
```

```gherkin
Given je saisis un email au format invalide
When  je clique sur "Envoyer un code"
Then  un message d'erreur "Email invalide" apparaît sous le champ
And   aucun appel Supabase n'est effectué
```

```gherkin
Given le serveur Supabase répond avec rate-limit (>3 envois/h)
When  je clique sur "Envoyer un code"
Then  un toast d'erreur "Veuillez réessayer plus tard" s'affiche
And   l'écran reste en mode signup
```

### EC

- Email contenant des espaces → trim avant validation
- Email avec majuscules → conservé tel quel (Supabase normalise)
- Network offline → toast "Connexion perdue"

### DEP

- `supabase.auth.signInWithOtp({ email })` (création + login en un appel pour les nouveaux comptes)

### A11Y

- `<input type="email">` natif (clavier mobile adapté)
- `<label>` visible (pas seulement placeholder)
- Erreurs avec `aria-live="polite"`

## US-AUTH-02 — Se connecter avec un email existant

> **En tant que** membre existant
> **Je veux** me connecter via mon email
> **Afin d'** accéder à mon compte sans mot de passe

### AC

```gherkin
Given je suis sur "/auth" en mode login
When  je saisis un email rattaché à un compte existant
And   je clique sur "Se connecter"
Then  un OTP est envoyé
And   l'écran VerificationForm s'affiche
```

```gherkin
Given je saisis un email qui n'est associé à aucun compte
When  je clique sur "Se connecter"
Then  Supabase retourne une erreur (ou crée un nouveau compte selon config)
And   un message clair m'oriente vers "Créer un compte"
```

### DEP

- `supabase.auth.signInWithOtp({ email })`

## US-AUTH-03 — Valider le code OTP

> **En tant que** membre en cours d'authentification
> **Je veux** saisir le code reçu par email
> **Afin de** finaliser ma connexion

### AC

```gherkin
Given un OTP a été envoyé à mon email
When  je saisis les 6 chiffres dans VerificationForm
And   je clique sur "Vérifier"
Then  Supabase valide le code et crée la session
And   si signup → l'écran Onboarding s'affiche
And   si login → je suis redirigé vers "/home"
```

```gherkin
Given je saisis un OTP incorrect
When  je clique sur "Vérifier"
Then  un toast "Code invalide" s'affiche
And   le champ OTP est effacé pour ressaisie
```

```gherkin
Given l'OTP a expiré (> 1h ou selon config Supabase)
When  je clique sur "Vérifier"
Then  un toast "Code expiré, demandez-en un nouveau" s'affiche
And   un bouton "Renvoyer un code" est proposé
```

### EC

- Saisie partielle (< 6 chiffres) → bouton "Vérifier" désactivé
- Copier-coller du code complet → tous les champs se remplissent automatiquement
- Bouton "Retour" → ramène à l'écran signup/login en préservant l'email

### DEP

- `supabase.auth.verifyOtp({ email, token, type: 'email' })`

### A11Y

- Inputs OTP avec `inputMode="numeric"` et `autocomplete="one-time-code"`
- Focus auto sur le premier champ à l'arrivée
- Annonce screen reader : "Code envoyé à {email}"

## US-AUTH-04 — Se déconnecter

> **En tant que** utilisateur connecté
> **Je veux** me déconnecter
> **Afin de** sécuriser ma session sur appareil partagé

### AC

```gherkin
Given je suis connecté
And   j'ouvre le panneau Paramètres
When  je clique sur "Se déconnecter"
Then  une modal de confirmation s'affiche
And   en confirmant, `supabase.auth.signOut()` est appelé
And   le cache React Query est vidé
And   je suis redirigé vers "/" (landing)
```

### DEP

- `supabase.auth.signOut()`
- `queryClient.clear()`

---

# 4. Home — visiteur non connecté

**Route** : `/home` (accessible sans auth grâce au "guest mode")
**Composants** : `Home`, `HomeNavbar`, `GuestSidebar`, `FeedSection`, `MobileBottomNav`

## US-HOME-G-01 — Découvrir le feed sans être connecté

> **En tant que** visiteur curieux
> **Je veux** parcourir les contributions de la communauté
> **Afin de** me faire une idée du contenu avant de m'inscrire

### AC

```gherkin
Given je ne suis pas connecté
When  j'arrive sur "/home"
Then  je vois la HomeNavbar avec CTA "Connexion" et "Créer un compte"
And   je vois la GuestSidebar avec une carte explicative et 2 CTA d'inscription
And   le FeedSection affiche les posts publics (status='published', visibility='public')
And   les onglets "Récent" et "Populaire" sont actifs
And   l'onglet "Pour vous" déclenche un modal d'invitation à se connecter
```

```gherkin
Given je suis sur le feed en mode visiteur
When  je tente de réagir à un post (cœur)
Then  un modal "Connexion requise" s'affiche avec CTA vers "/auth"
And   aucune mutation n'est envoyée à Supabase
```

```gherkin
Given je clique sur l'avatar d'un contributeur
When  la navigation s'effectue
Then  j'arrive sur "/profile/:username" en mode visiteur
```

### EC

- Filtres par radius désactivés tant que le consentement de localisation n'a pas été donné
- Le bouton "Partager une observation" → modal "Connexion requise"

### DEP

- `feedService.getFeed({ tab, filters })` avec `currentUserId = undefined`
- RLS : `posts` lisibles si `status='published' AND visibility='public'`

### A11Y

- Skip link "Aller au feed"
- HomeNavbar `<header>` + `<nav>` avec rôles ARIA

### ECO

- Pagination 20 posts (jamais de scroll infini)
- Lazy-load images des posts hors viewport
- Pas de polling notifications en mode guest

---

# 5. Home — utilisateur connecté

**Route** : `/home`
**Composants** : `Home`, `HomeNavbar`, `ProfileSidebar`, `FeedSection`, `StatsSidebar`, `MobileBottomNav`

## US-HOME-C-01 — Voir mon feed personnalisé

> **En tant qu'** utilisateur connecté
> **Je veux** retrouver une page d'accueil avec mon profil et le feed
> **Afin d'** accéder rapidement à toutes les fonctionnalités

### AC

```gherkin
Given je suis connecté
When  j'arrive sur "/home"
Then  je vois HomeNavbar (avec mon avatar, badge notifications)
And   sur desktop ≥ 1280px : ProfileSidebar (320px) | FeedSection | StatsSidebar (320px)
And   sur tablet : ProfileSidebar | FeedSection (StatsSidebar masqué)
And   sur mobile : FeedSection plein écran + MobileBottomNav
And   l'onglet "Pour vous" est désormais actif
```

```gherkin
Given je clique sur "Partager une observation" dans la navbar ou la sidebar
When  l'overlay de contribution s'ouvre
Then  je vois le formulaire ContributeEncounter à l'étape 1
```

### EC

- Si je n'ai pas complété l'onboarding → redirection forcée vers `/onboarding`
- Si mon profil n'a pas de username → blocage redirection onboarding

### DEP

- `useAuth()` (session active)
- `useProfile()` pour la sidebar
- `useFeed({ tab, filters, currentUserId })` pour le feed personnalisé

### A11Y

- Navigation principale dans `<nav>` avec aria-label
- MobileBottomNav `<nav role="navigation" aria-label="Navigation principale">`

### ECO

- StatsSidebar masquée < 1280px (pas de calcul si pas affichée)
- Avatar mis en cache via React Query (staleTime 5 min)

---

# 6. Feed — Tabs, filtres, interactions post

**Composants** : `FeedSection`, `FeedFilterPanel`, `FeedPost`, `SharePopover`, `PostOptionsMenu`

## US-FEED-01 — Naviguer entre les onglets du feed

> **En tant qu'** utilisateur (connecté ou non)
> **Je veux** changer d'onglet (Récent / Populaire / Pour vous)
> **Afin de** voir le feed selon le tri qui m'intéresse

### AC

```gherkin
Given je suis sur le feed
When  je clique sur l'onglet "Populaire"
Then  les posts sont triés par likes_count desc
And   l'URL ou la query React Query reflète le changement
And   un nouveau fetch est déclenché si pas en cache
```

```gherkin
Given je suis visiteur non connecté
When  je clique sur "Pour vous"
Then  un modal de découverte propose de me connecter
And   l'onglet actif reste "Récent"
```

### DEP

- `feedService.getFeed({ tab: 'recent' | 'popular' | 'for_you' })`
- Pour `for_you` : JOIN sur table `follows` côté serveur

## US-FEED-02 — Filtrer le feed

> **En tant qu'** utilisateur
> **Je veux** filtrer le feed par catégorie / type / radius / période
> **Afin de** voir uniquement ce qui m'intéresse

### AC

```gherkin
Given le panneau de filtres est ouvert
When  je sélectionne 2 catégories (Oiseaux + Insectes)
And   je clique sur "Appliquer"
Then  seuls les posts dont `taxonomic_group` est dans ['birds', 'insects'] sont affichés
And   un badge "2 filtres actifs" est visible
```

> **Décision MVP (Q4)** : le filtre "Aide à l'identification" est **masqué pour le MVP** (le toggle de demande d'aide en publication est aussi retiré, cf. US-CONTRIB-02). Le filtre sera ré-activé en Phase 3 quand le toggle de publication le sera.

```gherkin
Given je sélectionne radius = 100 km
And   je n'ai pas autorisé la géolocalisation
When  j'applique
Then  un prompt de demande de localisation s'affiche
And   si je refuse, le filtre est ignoré et un toast l'explique
```

```gherkin
Given je clique sur "Réinitialiser"
When  l'action s'exécute
Then  tous les filtres reviennent aux valeurs par défaut
And   le feed re-fetch sans filtres
```

### EC

- Filtres combinés (catégorie + période + radius) → AND logique
- Période = "Aujourd'hui" → utiliser le timezone du client (à confirmer)
- Filtre radius nécessite ST_DWithin côté serveur OU calcul Haversine côté client

### DEP

- `feedService.getFeed({ filters: FeedFilterParams })`
- Index Postgres sur `posts(taxonomic_group, identification_status, published_at)`

### A11Y

- Panneau filtres : focus trap quand ouvert, Escape pour fermer
- Chips multi-select avec aria-pressed

### ECO

- Cache React Query par combinaison (tab + filtres)
- Pas de fetch tant que l'utilisateur n'a pas cliqué sur "Appliquer"
- Pagination 20 posts

## US-FEED-03 — Réagir à un post (like)

> **En tant qu'** utilisateur connecté
> **Je veux** liker un post
> **Afin d'** exprimer mon appréciation

### AC

```gherkin
Given je suis connecté et un post est affiché sans réaction de ma part
When  je clique sur l'icône cœur
Then  l'icône passe en état "rempli" immédiatement (optimistic UI)
And   `likes_count` s'incrémente de 1 dans l'UI
And   un INSERT est fait sur `reactions(post_id, user_id, type='like')`
And   un trigger PG met à jour `posts.likes_count`
```

```gherkin
Given j'ai déjà liké ce post
When  je clique à nouveau sur le cœur
Then  l'icône passe en état "vide"
And   `likes_count` se décrémente de 1
And   un DELETE est fait sur `reactions`
```

```gherkin
Given le serveur retourne une erreur (réseau, RLS)
When  la mutation échoue
Then  l'optimistic update est rollback
And   un toast d'erreur s'affiche
```

### DEP

- `postService.toggleReaction(postId, userId, type)`
- Trigger PG `update_post_likes_count`
- RLS sur `reactions` : INSERT/DELETE limité à `auth.uid()`

## US-FEED-04 — Sauvegarder un post

> **En tant qu'** utilisateur connecté
> **Je veux** ajouter un post à ma collection
> **Afin de** le retrouver dans mon onglet Inspirations

### AC

```gherkin
Given je suis connecté et un post n'est pas encore dans ma collection
When  je clique sur l'icône Bookmark
Then  l'icône passe en état "rempli"
And   un INSERT est fait sur `saved_posts(user_id, post_id)`
And   le post apparaît dans mon onglet Profil > Inspirations
```

```gherkin
Given je suis visiteur non connecté
When  je clique sur Bookmark
Then  un modal "Connexion requise" s'affiche
```

### DEP

- `savedPostsService.toggleSavedPost(userId, postId, currentlySaved)`
- RLS `saved_posts` : owner only

## US-FEED-05 — Partager un post

> **En tant qu'** utilisateur (connecté ou non)
> **Je veux** copier le lien d'un post
> **Afin de** le partager avec quelqu'un d'extérieur

### AC

```gherkin
Given un post est affiché
When  je clique sur l'icône Share
Then  un popover s'ouvre avec le lien direct (`/post/:id`) et un bouton "Copier"
And   au clic sur "Copier", le lien est dans le presse-papiers
And   un toast "Lien copié" s'affiche
```

### EC

- API `navigator.clipboard` indisponible → fallback `document.execCommand('copy')` ou toast d'instruction
- Web Share API disponible (mobile) → utiliser `navigator.share`

### DEP

- Aucun appel backend (lien public)

## US-FEED-06 — Menu options d'un post (… 3 points)

> **En tant qu'** utilisateur
> **Je veux** ouvrir le menu options d'un post
> **Afin de** signaler, supprimer, ou ne plus voir ce contributeur

### AC

```gherkin
Given je suis le propriétaire du post
When  j'ouvre le menu options
Then  je vois "Supprimer mon post"
And   au clic, une modal de confirmation s'affiche
And   en confirmant, le post est supprimé (DELETE posts.id)
And   le feed est invalidé et re-fetch
```

```gherkin
Given je ne suis pas l'auteur du post
When  j'ouvre le menu options
Then  je vois "Signaler", "Masquer ce post", "Ne plus suivre cet auteur"
And   chaque action est confirmée par un toast et persiste côté serveur
```

### DEP

- `postService.deletePost(postId)`
- `hiddenPostsService.hidePost(userId, postId)` (table `hidden_posts`)
- `followService.unfollow(targetUserId)`

---

# 7. Création d'une observation (Encounter, 3 étapes)

**Composants** : `ContributeEncounterForm` + 3 step components
**Flows** : `nature_encounter` (3 étapes complètes), `nature_instant` (réservé MVP+)

## US-CONTRIB-01 — Étape 1 : Photos + format d'affichage

> **En tant que** contributeur connecté
> **Je veux** ajouter jusqu'à 4 photos
> **Afin d'** illustrer mon observation

### AC

```gherkin
Given je suis sur l'étape 1 du formulaire encounter
When  je clique sur "Ajouter une photo"
Then  un sélecteur de fichier s'ouvre
And   j'accepte uniquement les MIME types image/jpeg, image/png, image/webp
```

```gherkin
Given j'ai ajouté 1 à 4 photos
When  je sélectionne un format d'affichage (16:9 / 3:4 portrait / 1:1)
And   je clique sur "Suivant"
Then  l'étape 2 s'affiche avec les photos en thumbnail compressées (max 1600px côté long)
```

```gherkin
Given j'essaie d'ajouter une 5e photo
When  je sélectionne le fichier
Then  un toast "Maximum 4 photos" s'affiche
And   la photo n'est PAS ajoutée
```

```gherkin
Given une photo dépasse la taille max (10 Mo brut)
When  l'upload commence
Then  la compression côté client la réduit (cible 2 Mo max après compression)
And   si après compression elle dépasse encore, un toast d'erreur s'affiche
```

### EC

- Drag and drop également supporté (à confirmer)
- HEIC (iOS) → conversion JPEG côté client (lib `heic2any`)
- Réordonner les photos par drag (à confirmer)
- Suppression d'une photo en attente : icône X sur la thumbnail

### DEP

- `compressPhoto()` (lib client)
- Pas d'upload Supabase tant que le formulaire n'est pas soumis (étape 3)

## US-CONTRIB-02 — Étape 2 : Espèce observée

> **En tant que** contributeur
> **Je veux** identifier l'espèce observée et indiquer son nombre
> **Afin d'** enrichir l'observation

> **Décisions MVP** :
>
> - **Q2** : une seule espèce par post pour le MVP (multi-observation reportée Phase 3). Cohérent avec iNaturalist mobile et Instagram.
> - **Q4** : le toggle "Demander de l'aide à la communauté" est **masqué pour le MVP** (sera ré-activé Phase 3 avec le filtre feed associé).

### AC

```gherkin
Given je suis à l'étape 2
When  je tape dans le champ "Rechercher une espèce"
Then  un appel debouncé (300ms) interroge le service taxref/cache
And   une liste de suggestions s'affiche (nom commun + scientifique)
```

```gherkin
Given je sélectionne une espèce et règle le nombre à 3
When  je clique sur "Ajouter"
Then  l'espèce apparaît avec un compteur "3"
And   je ne peux PAS ajouter une autre espèce (1 espèce / post en MVP)
```

```gherkin
Given je n'ai ajouté aucune espèce
When  je clique sur "Suivant"
Then  un message d'erreur "Une espèce requise" apparaît
And   le passage à l'étape 3 est bloqué
```

### EC

- Espèce inconnue → on permet quand même la publication (`identification_status` reste `null` en MVP)
- Compteur min 1, max 999

### DEP

- `taxrefService.search(query)` avec cache Supabase `taxref_cache`
- Service tier INPN (CC-BY) — attribution obligatoire

### ECO

- Debounce 300ms minimum sur la recherche
- Cache local des dernières recherches (LRU 50 entrées)

## US-CONTRIB-03 — Étape 3 : Contexte (date, lieu, météo, habitat)

> **En tant que** contributeur
> **Je veux** documenter le contexte de l'observation
> **Afin de** la rendre exploitable scientifiquement

> **Décision MVP (Q1)** : la **description est optionnelle** pour le MVP (posture data-driven). Seule la longueur max (1500 chars) est contrôlée. Si à l'analyse les utilisateurs la complètent dans > 70 % des cas, on pourra la rendre requise en Phase 3.

### AC

```gherkin
Given je suis à l'étape 3
When  l'écran s'affiche
Then  je vois les champs : titre (optionnel), description (optionnelle, max 1500), date (default = aujourd'hui), moment (matin/midi/soir/nuit), météo, habitat, localisation (autocomplete fr_cities), visibilité (public / région masquée)
```

```gherkin
Given je remplis seulement la localisation (le seul champ requis)
When  je clique sur "Publier"
Then  les photos sont uploadées sur Storage (bucket `posts`)
And   un INSERT est fait sur `posts` avec status='published'
And   les rows `media` associées sont créées
And   un toast de succès s'affiche
And   le feed est invalidé et le nouveau post apparaît en première position
And   l'overlay de contribution se ferme
```

```gherkin
Given je saisis une description > 1500 caractères
When  je clique sur "Publier"
Then  un message d'erreur "Description trop longue (max 1500)" s'affiche
And   le passage à l'étape suivante est bloqué
```

```gherkin
Given l'upload d'une image échoue (réseau, taille, MIME)
When  l'erreur se produit
Then  un toast d'erreur précis s'affiche
And   le formulaire reste ouvert pour ré-essayer
And   les autres images déjà uploadées ne sont pas perdues
```

```gherkin
Given je choisis "Région masquée" pour la visibilité
When  le post est créé
Then  `posts.location_hidden = true`
And   les visiteurs ne voient ni la ville ni le département (cf. règle confidentialité)
```

### EC

- Description vide → autorisé (publication possible sans description en MVP)
- Description > 1500 chars → blocage avec message
- Date dans le futur → blocage avec message
- Localisation non sélectionnée dans l'autocomplete → blocage
- Coordonnées GPS hors France métropolitaine → permis mais avertir

### DEP

- `mediaService.uploadPostMedia(files)`
- `postService.createPost(userId, payload)`
- `geocodingService` pour reverse-geocoding ville
- RLS posts : INSERT limité à `auth.uid() = user_id`

### A11Y

- Tous les champs labellisés
- Erreurs avec aria-live + aria-invalid
- Sélecteur de date accessible clavier (input `type="date"`)

### ECO

- Compression images avant upload (cible 2 Mo / 1600 px côté long)
- Bucket Supabase avec policies RLS strictes
- Pas de re-upload des images si l'utilisateur revient à l'étape 1 → 3

---

# 8. Upload images (max 4)

> Cf. AC dans US-CONTRIB-01. Cette section formalise les invariants partagés.

## US-UPLOAD-01 — Contraintes d'upload images

### AC

```gherkin
Given je tente d'uploader une image
When  le fichier passe le filtre client
Then  son MIME doit être dans ['image/jpeg', 'image/png', 'image/webp']
And   sa taille brute doit être ≤ 10 Mo
And   après compression elle doit être ≤ 2 Mo
And   le format ratio doit correspondre au format choisi à l'étape 1 (compatible avec recadrage)
```

```gherkin
Given le bucket Supabase a une RLS owner-write
When  je tente d'uploader sous un dossier `{user_id}/...`
Then  l'upload réussit uniquement si auth.uid() == user_id
```

### EC

- HEIC iOS → conversion JPEG côté client
- GIF / SVG → refusés (toast "Format non supporté")
- Image corrompue → toast "Fichier illisible"

### DEP

- Bucket `posts` avec RLS user-prefix
- Bucket `avatars` avec RLS user-prefix
- Bucket `banners` avec RLS user-prefix (cf. migration `20260502_settings_phase2_complete`)

### ECO

- Compression côté client OBLIGATOIRE (économie bande passante + stockage)
- WebP en priorité, JPEG fallback
- `loading="lazy"` sur tous les `<img>` du feed

---

# 9. Profil — affichage owner / visiteur

**Route** : `/profile` (owner) / `/profile/:username` (visiteur)
**Composants** : `Profile`, `ProfileHeader`, `ProfileTabs`, `ProfileAboutCard`, `ProfileDNACard`, `ProfileFeed`, `ProfileInspirations`, `ProfileCommunity`, `ProfileStats`

## US-PROF-01 — Visiter mon propre profil

> **En tant qu'** utilisateur connecté
> **Je veux** consulter mon profil
> **Afin de** voir ce que les autres voient (et accéder aux actions owner)

### AC

```gherkin
Given je suis connecté
When  je navigue vers "/profile"
Then  ProfileHeader affiche : banner, avatar, username, bio, ville, région, badges intérêts
And   les boutons "Modifier le profil", "Paramètres" et "Partager" sont visibles
And   le bouton "Migrer" (follow) n'est PAS affiché (c'est mon profil)
And   sur desktop : ProfileAboutCard + ProfileDNACard visibles au-dessus des onglets
And   les onglets visibles : Journal nature, Inspirations, Communauté, Statistiques
And   sur mobile : un onglet "À propos" supplémentaire en première position
```

```gherkin
Given mon profil est chargé
When  je clique sur l'onglet "Journal nature"
Then  je vois mes posts publiés (status='published') triés du plus récent au plus ancien
And   le badge à côté du titre de l'onglet affiche le nombre de posts
And   si aucun post : empty state avec hermine + CTA "Partager une observation"
```

```gherkin
Given je clique sur l'onglet "Inspirations"
When  l'onglet s'active
Then  je vois mes posts sauvegardés (table `saved_posts`)
And   le badge affiche le nombre
And   empty state si aucun
```

```gherkin
Given je clique sur l'onglet "Communauté"
When  l'onglet s'active
Then  je vois 2 sous-onglets pills : "Migrateurs" (followers) et "Migrations" (following)
And   chaque sous-onglet liste les profils avec banner, avatar, count, bouton Migrer
And   au clic sur "Migrer" pour un user, optimistic toggle + persistance
```

```gherkin
Given je clique sur l'onglet "Statistiques"
When  l'onglet s'active
Then  je vois un placeholder "Bientôt disponible" (Sprint 4 stub)
```

### EC

- Si chargement profil > 1 s : afficher ProfileSkeleton
- Si Supabase down : afficher empty state "Profil indisponible"
- Si je n'ai pas de banner : afficher banner default

### DEP

- `profileService.getProfile(id)` ou `getProfileByUsername(username)`
- `useUserPosts(profileId)` (Journal)
- `useSavedPostsPage(1, 20)` (Inspirations)
- `useFollowers(profileId)` / `useFollowing(profileId)` (Communauté)
- RLS profiles : SELECT public (sauf si is_public = false → SELECT self only)

## US-PROF-02 — Visiter le profil d'un autre utilisateur

> **En tant qu'** utilisateur (connecté ou non)
> **Je veux** consulter le profil d'un autre membre
> **Afin de** découvrir ses contributions et le suivre éventuellement

### AC

```gherkin
Given je navigue vers "/profile/:username" avec un username valide
When  la page se charge
Then  ProfileHeader affiche les infos publiques du membre
And   le bouton "Migrer" (follow) est visible (à la place de "Modifier le profil")
And   les boutons "Partager" et "Options" (3 points) sont visibles
And   l'onglet "Inspirations" est masqué OU vide (RLS saved_posts = owner-only)
```

```gherkin
Given le username demandé n'existe pas
When  la query se résout sans data
Then  un empty state "Utilisateur introuvable" s'affiche avec hermine + lien retour feed
```

```gherkin
Given le profil cible est privé (is_public = false)
And   je ne suis pas connecté ou pas follower validé
When  la page se charge
Then  je vois le header minimal mais pas les contributions
```

### DEP

- `profileService.getProfileByUsername(username)`
- `useFollowers / useFollowing` (publics)
- RLS profiles : SELECT conditionnel selon is_public

### A11Y

- `<h1>` = username du profil affiché
- Skip link "Aller aux contributions"

---

# 10. Modification du profil (3 onglets)

**Composant** : `EditProfilePanel` avec 3 tabs (Info, Photos, Préférences)

## US-EDIT-01 — Modifier mes infos textuelles

> **En tant qu'** utilisateur connecté
> **Je veux** modifier mon username, bio, ville, réseaux sociaux
> **Afin de** garder mon profil à jour

### AC

```gherkin
Given je suis sur EditProfilePanel onglet "Info"
When  je modifie ma bio (max 160 chars) et clique sur "Sauvegarder"
Then  un appel `updateProfile()` est fait
And   le cache React Query du profil est invalidé/mis à jour
And   un toast "Profil mis à jour" s'affiche
And   le panneau se ferme
```

```gherkin
Given je modifie mon username avec une valeur déjà prise
When  je clique sur "Sauvegarder"
Then  un toast d'erreur "Ce nom est déjà utilisé" s'affiche
And   le panneau reste ouvert
```

```gherkin
Given je dépasse 160 caractères dans la bio
When  je tape la 161e
Then  le compteur passe en rouge
And   le bouton "Sauvegarder" est désactivé
```

```gherkin
Given je saisis une URL invalide pour Instagram
When  je perds le focus du champ
Then  un message d'erreur sous le champ s'affiche
And   "Sauvegarder" reste désactivé
```

### DEP

- `profileService.updateProfile(payload)`
- RLS : owner-only

## US-EDIT-02 — Modifier mes photos (avatar + bannière)

### AC

```gherkin
Given je suis sur l'onglet "Photos"
When  je clique sur "Changer l'avatar" et sélectionne un fichier
Then  l'image est uploadée vers le bucket `avatars` sous `{user_id}/{timestamp}.{ext}`
And   `profiles.avatar_url` est mis à jour
And   l'avatar visible se met à jour partout (cache invalidé)
```

```gherkin
Given je clique sur "Changer la bannière"
When  l'upload réussit
Then  `profiles.banner_url` est mis à jour (bucket `banners`, max 2 Mo)
```

### EC

- Upload échoue → toast erreur, ancienne photo conservée
- Si Supabase non configuré (mode local dev) → fallback blob URL

### DEP

- `storageService.uploadImage(bucket, file)`
- Buckets `avatars` (1 Mo max) et `banners` (2 Mo max)

## US-EDIT-03 — Modifier mes préférences (intérêts)

### AC

```gherkin
Given je suis sur l'onglet "Préférences"
When  je modifie ma sélection d'intérêts et clique sur "Sauvegarder"
Then  `profiles.interests[]` est mis à jour
And   l'ADN observateur (ProfileDNACard) reflète la nouvelle sélection
```

### DEP

- `profileService.updateProfile({ interests })`

---

# 11. Paramètres (Sécurité, Notifs, Aide, Licence, Suppression)

**Route** : `/settings` (panel ouvert depuis n'importe où)
**Composants** : `SettingsPanel`, `SettingsList`, `SettingsSecurityView`, `SettingsNotificationsView`, `SettingsHelpView`, `SettingsLicenseView`, `DeleteAccountModal`, `LogoutModal`

## US-SET-01 — Ouvrir le panneau Paramètres

### AC

```gherkin
Given je suis connecté
When  je clique sur "Paramètres" depuis ProfileHeader OU depuis la sidebar
Then  un panneau modal s'ouvre avec une liste de sections
And   les sections accessibles sont : Sécurité, Notifications, Aide, Licence, + Zone de danger (Logout, Suppression)
And   l'overlay capture le focus (focus trap)
And   Escape ferme le panneau
```

## US-SET-02 — Section Sécurité (changer son email)

### AC

```gherkin
Given je suis dans Paramètres > Sécurité
When  l'écran s'affiche
Then  je vois mon email actuel en lecture seule
And   un champ "Nouvel email" et un bouton "Mettre à jour"
And   pas de champ mot de passe (auth = magic link uniquement)
```

```gherkin
Given je saisis un nouvel email valide
When  je clique sur "Mettre à jour"
Then  `supabase.auth.updateUser({ email })` est appelé
And   un OTP de confirmation est envoyé au nouvel email
And   un toast "Vérifiez votre boîte mail" s'affiche
```

```gherkin
Given je saisis un email invalide ou identique à l'actuel
When  je clique sur "Mettre à jour"
Then  un message d'erreur s'affiche
And   aucun appel API n'est fait
```

### DEP

- `supabase.auth.updateUser({ email })`
- (Phase 2) trigger `security_audit_log` event_type='email_change_requested'

## US-SET-03 — Section Notifications

### AC

```gherkin
Given je suis dans Paramètres > Notifications
When  l'écran s'affiche
Then  je vois 3 sous-sections :
      - "Méthodes" (radios : Email + Push, Email seul, Push seul, Aucune)
      - "Nouvelles" (toggle Newsletter / mises à jour produit)
      - "Fréquence" (radios : Temps réel / Quotidien / Hebdomadaire)
And   les valeurs initiales viennent de `user_settings`
```

```gherkin
Given je change la fréquence à "Quotidien"
When  l'option est sélectionnée
Then  un appel `updateSettings({ notif_frequency: 'daily' })` est fait
And   un toast "Préférences mises à jour" s'affiche
```

### DEP

- `settingsService.getSettings()` / `updateSettings()`
- Colonne `user_settings.notif_frequency` (cf. migration phase 2)

## US-SET-04 — Section Aide (formulaire support)

### AC

```gherkin
Given je suis dans Paramètres > Aide
When  l'écran s'affiche
Then  je vois un select "Sujet" (Technique / Aide / Suggestion / Signaler / Autre)
And   un textarea Message (min 20, max 2000 caractères)
And   un bouton "Envoyer"
```

```gherkin
Given je remplis sujet + message valide
When  je clique sur "Envoyer"
Then  un INSERT est fait sur `support_tickets`
And   un toast "Message envoyé" s'affiche
And   le formulaire est réinitialisé
```

```gherkin
Given mon message fait moins de 20 caractères
When  je clique sur "Envoyer"
Then  un message d'erreur s'affiche
And   aucun INSERT n'est fait
```

### DEP

- `supportService.submitHelpRequest({ subject, message })`
- Table `support_tickets` avec RLS user-self
- (Phase 2) Edge Function `submit-help` pour relai Discord webhook

## US-SET-05 — Section Licence et droits d'auteur

### AC

```gherkin
Given je suis dans Paramètres > Licence
When  l'écran s'affiche
Then  je vois le texte légal complet (droits, attribution TAXREF/INPN, sources)
And   le contenu est lisible (typographie, contrastes)
```

### DEP

- Aucun (texte statique)

## US-SET-06 — Se déconnecter avec confirmation

### AC

```gherkin
Given je clique sur "Se déconnecter"
When  la modal LogoutModal s'ouvre
Then  je vois un message de confirmation et 2 boutons : Annuler / Se déconnecter
And   au clic sur "Se déconnecter", `supabase.auth.signOut()` + `queryClient.clear()`
And   je suis redirigé vers "/"
```

### DEP

- `supabase.auth.signOut()`

## US-SET-07 — Supprimer mon compte (double confirmation)

### AC

```gherkin
Given je clique sur "Supprimer mon compte"
When  DeleteAccountModal s'ouvre
Then  je vois un avertissement RGPD et un champ pour saisir mon username
And   le bouton "Confirmer" est désactivé tant que le username saisi ne correspond pas
```

```gherkin
Given je saisis correctement mon username
When  je clique sur "Confirmer"
Then  l'Edge Function `delete-account` est invoquée avec mode='hard'
And   `auth.users` + `profiles` + médias storage sont supprimés en cascade
And   `queryClient.clear()` + signOut local
And   je suis redirigé vers "/" avec un toast "Compte supprimé"
```

```gherkin
Given l'Edge Function échoue
When  l'erreur remonte
Then  un toast d'erreur s'affiche
And   le compte n'est PAS supprimé (transaction côté serveur)
```

### EC

- Mode 'anonymize' (préserver contributions, anonymiser identité) — supporté par l'Edge Function mais pas exposé dans l'UI MVP
- Réseau coupé pendant l'opération → l'Edge Function est idempotente

### DEP

- Edge Function `delete-account` (modes 'hard' | 'anonymize')
- Trigger d'audit `security_audit_log` event_type='account_deletion_completed'

### A11Y

- DeleteAccountModal : focus trap, Escape ferme, ARIA dialog
- Bouton Confirmer = couleur danger (rouge) avec contraste ≥ 4.5:1

---

# 12. Notifications (page dédiée)

**Route** : `/notifications`
**Composants** : `NotificationsPage`, `NotifItem`, hooks `useNotifications`, `useMarkAsRead`, `useMarkAllAsRead`

## US-NOTIF-01 — Consulter mes notifications

### AC

```gherkin
Given je suis connecté
When  je navigue vers "/notifications"
Then  je vois 4 onglets : Toutes / Sociales / Espèces / Système
And   l'onglet "Toutes" est actif par défaut
And   les notifications sont paginées (20 par page) avec un bouton "Charger plus"
```

```gherkin
Given des notifications sont du même type et < 24h d'écart
When  l'affichage se fait
Then  elles sont groupées : "Alice et 3 autres ont aimé ton post"
```

```gherkin
Given je clique sur une notification
When  l'action s'exécute
Then  l'élément est marqué comme lu (UPDATE notifications SET read=true)
And   je suis redirigé selon `reference_type` (post → /post/:id, profile → /profile/:username, species → /species/:id)
```

```gherkin
Given je clique sur "Tout marquer comme lu"
When  l'action s'exécute
Then  toutes mes notifications non lues passent à read=true
And   le badge de la navbar disparaît
```

### EC

- Aucune notification → empty state avec illustration
- Notification expirée (auteur supprimé, post supprimé) → afficher message dégradé "Contenu indisponible"

### DEP

- `notifService.getNotifications({ tab, cursor, limit })`
- `notifService.markAsRead(id)` / `markAllAsRead()`
- Pagination cursor-based (created_at)

### A11Y

- Liste avec `<ul role="list">` et `<li>`
- Badge non-lu via aria-label "Non lue"
- Live region pour annoncer "X nouvelles notifications" à l'arrivée

### ECO

- Pagination 20 (jamais de scroll infini)
- Pas de polling automatique (refresh au focus de l'onglet uniquement)

---

# 13. Accessibilité — exigences transverses (WCAG AA)

> **Référentiel** : WCAG 2.1 niveau AA. Tout flow ci-dessus DOIT respecter ces invariants.

## A11Y-01 — Navigation clavier complète

```gherkin
Given je navigue uniquement au clavier
When  j'utilise Tab / Shift+Tab / Enter / Escape / flèches
Then  toutes les fonctionnalités sont accessibles
And   l'ordre de tabulation suit l'ordre logique du document
And   aucun piège clavier n'existe (sauf focus trap intentionnel sur modals)
And   Escape ferme tout overlay (modals, panels, popovers)
```

## A11Y-02 — Focus visible

```gherkin
Given un élément interactif a le focus
Then  un anneau focus visible apparaît (outline ou ring Tailwind ≥ 2px)
And   le contraste de l'anneau ≥ 3:1 par rapport au fond
```

## A11Y-03 — Labels et descriptions

```gherkin
Given un champ de formulaire est affiché
Then  il a un <label> visible (pas seulement un placeholder)
And   les erreurs sont liées via aria-describedby + aria-invalid="true"
And   les boutons icon-only ont aria-label
```

## A11Y-04 — Contraste

```gherkin
Given du texte standard (< 18.66 px) est affiché
Then  son ratio de contraste avec le fond est ≥ 4.5:1
Given du texte large (≥ 18.66 px gras OU ≥ 24 px) est affiché
Then  son ratio est ≥ 3:1
Given un composant UI (bordure de bouton, icône) porte de l'information
Then  son ratio est ≥ 3:1
```

## A11Y-05 — Screen reader

```gherkin
Given un screen reader (NVDA, JAWS, VoiceOver) est actif
Then  toutes les pages ont un <h1> unique et hiérarchie hN cohérente
And   les images informatives ont un alt descriptif
And   les images décoratives ont alt=""
And   les zones dynamiques (toasts, erreurs) utilisent aria-live="polite" ou "assertive"
And   chaque page déclare lang="fr" ou "en" selon i18n
```

## A11Y-06 — `prefers-reduced-motion`

```gherkin
Given mon OS a "Réduire les mouvements" activé
When  je navigue dans Naturegraph
Then  toutes les animations non essentielles sont désactivées ou réduites
And   les transitions sont instantanées ou ≤ 100 ms
And   les carrousels/sliders ne défilent pas automatiquement
```

## A11Y-07 — Skip links et landmarks

```gherkin
Given je tabule depuis le début d'une page
When  le premier élément focusable apparaît
Then  c'est un skip link "Aller au contenu principal"
And   chaque page a les landmarks <header>, <nav>, <main>, <footer>
```

---

# 14. Éco-conception — exigences transverses

> **Référentiel** : RGESN, GUIDELINES.md interne. Budget : < 300 KB JS gzip / < 500 KB total / LCP < 2.5 s.

## ECO-01 — Pagination obligatoire

```gherkin
Given une liste contient potentiellement > 20 items (feed, notifications, communauté, posts profil)
Then  elle est paginée (page-based ou cursor-based)
And   un bouton "Charger plus" est utilisé (jamais de scroll infini)
And   chaque requête remonte au maximum 20 items
```

## ECO-02 — Images optimisées

```gherkin
Given une image est affichée
Then  elle est servie en WebP ou AVIF (avec fallback JPEG si nécessaire)
And   ses dimensions width/height sont explicites (évite CLS)
And   elle a loading="lazy" si hors du fold initial
And   les avatars ont 2 tailles (40 px UI, 80–120 px header)
```

## ECO-03 — Appels API minimisés

```gherkin
Given une donnée a été fetchée
Then  elle est mise en cache via React Query (staleTime ≥ 60 s)
And   les invalidations sont ciblées (queryKey précis)
And   aucun polling périodique n'est utilisé sans nécessité
And   les recherches autocomplete sont debouncées (300 ms minimum)
```

## ECO-04 — Payload réduit

```gherkin
Given une requête SELECT Supabase est faite
Then  la projection ne sélectionne que les colonnes nécessaires (jamais SELECT *)
And   les jointures sont limitées (max 2 niveaux)
And   les compteurs denormalisés (likes_count, posts_count, followers_count) sont utilisés au lieu de COUNT(*)
```

## ECO-05 — Pas de dépendances JS superflues

```gherkin
Given une feature peut être faite en CSS pur
Then  elle l'est (animations, transitions, layout)
And   aucune lib lourde (Moment.js, Lodash full) n'est ajoutée si une alternative légère existe
And   le bundle final est < 300 KB JS gzip
```

## ECO-06 — Mode hors-ligne dégradé

```gherkin
Given le réseau est coupé
When  une mutation échoue
Then  l'optimistic update est rollback
And   un toast clair invite à réessayer
And   l'UI ne fige pas (timeout configuré)
```

---

# 15. Non-régression — invariants critiques

> **Liste des comportements qui DOIVENT rester stables** entre toutes les versions. Toute modification de cette liste nécessite une revue produit explicite.

## NR-01 — Authentification

- Le flow magic link OTP (signup + login) ne doit JAMAIS demander de mot de passe
- L'OTP a 6 chiffres et expire selon la config Supabase
- Après signup, l'utilisateur DOIT compléter l'onboarding avant d'accéder à `/home`
- `signOut()` vide TOUJOURS le cache React Query

## NR-02 — Profil

- `/profile` (sans username) = mon profil ssi connecté ; sinon doit rediriger vers /auth
- `/profile/:username` accessible aux visiteurs non connectés (sauf si is_public = false)
- L'onglet "Inspirations" ne doit JAMAIS afficher les saved_posts d'un autre utilisateur (RLS owner-only)
- L'onglet par défaut à l'arrivée sur un profil = "Journal nature"

## NR-03 — Feed

- Pagination 20 posts max par requête
- Onglet "Pour vous" en mode visiteur → modal de connexion (pas d'accès)
- Filtres combinés = AND logique
- Réactions = optimistic UI avec rollback en cas d'erreur

## NR-04 — Création d'observation

- Maximum 4 photos par post (jamais 5+)
- MIME types acceptés : JPEG, PNG, WebP uniquement (HEIC à convertir côté client iOS — Phase 3)
- Description **optionnelle** en MVP (Q1) — seule la borne max 1500 chars est contrôlée
- Une espèce par post en MVP (Q2) — multi-observation Phase 3
- Localisation requise pour publication
- `location_hidden = true` masque ville + département (pas seulement le marqueur carte)
- Toggle "Aide à l'identification" masqué en MVP (Q4)

## NR-05 — Données utilisateur

- Aucune vraie donnée utilisateur en base de dev (mock users only — convention `feedback-mock-users`)
- Suppression de compte = transaction atomique (pas d'état intermédiaire orphelin)
- TAXREF : attribution CC-BY INPN obligatoire visible dans Licence

## NR-06 — Accessibilité

- Skip links présents sur toutes les pages
- Hiérarchie h1-h6 respectée
- Contraste WCAG AA respecté
- Navigation clavier complète testée
- `prefers-reduced-motion` honoré

## NR-07 — Éco-conception

- Pas de scroll infini, jamais
- Bundle JS gzip < 300 KB (vérifié au CI par `npm run build`)
- Images en WebP/AVIF, dimensions explicites
- Pagination 20 items max

## NR-08 — Sécurité

- RLS activée sur toutes les tables exposées (profiles, posts, reactions, follows, saved_posts, notifications, support_tickets, security_audit_log, user_settings)
- Aucune clé service_role exposée côté client
- Edge Functions protégées par JWT
- Buckets storage : RLS user-prefix sur les écritures

## NR-09 — Internationalisation

- FR (par défaut) + EN supportés
- Tous les textes UI passent par i18next
- Pas de chaîne en dur dans les composants (sauf cas marginal documenté)

---

# Annexes

## A. Tables Supabase impliquées

| Table                | Rôle                                  | RLS                                                     |
| -------------------- | ------------------------------------- | ------------------------------------------------------- |
| `profiles`           | Identité utilisateur                  | SELECT public conditionnel ; UPDATE owner               |
| `posts`              | Observations                          | SELECT si published+public ; INSERT/UPDATE/DELETE owner |
| `media`              | Photos rattachées aux posts           | Hérite de posts                                         |
| `reactions`          | Likes/réactions                       | Owner only                                              |
| `comments`           | Commentaires (placeholder MVP)        | À définir                                               |
| `follows`            | Relations sociales                    | Owner-write own row                                     |
| `saved_posts`        | Bookmark personnel                    | Owner only                                              |
| `notifications`      | Notifs utilisateur                    | Owner only                                              |
| `user_settings`      | Préférences (incl. `notif_frequency`) | Owner only                                              |
| `support_tickets`    | Tickets d'aide                        | INSERT/SELECT owner                                     |
| `security_audit_log` | Audit RGPD                            | SELECT owner ; INSERT service_role                      |
| `taxref_cache`       | Cache espèces INPN                    | SELECT public                                           |
| `fr_cities`          | Localisation autocomplete             | SELECT public                                           |

## B. Edge Functions

| Fonction                                   | Rôle                                                            |
| ------------------------------------------ | --------------------------------------------------------------- |
| `delete-account`                           | Suppression / anonymisation compte (modes 'hard' / 'anonymize') |
| (Phase 2) `submit-help`                    | Relai Discord webhook après ticket support                      |
| (Phase 2) `digest-daily` / `digest-weekly` | Cron envoi digests notifications                                |

## C. Hooks React Query principaux

`useAuth` · `useProfile` · `useProfileByUsername` · `useUpdateProfile` · `useFeed` · `useUserPosts` · `useSavedPostIds` · `useSavedPostsPage` · `useToggleSavedPost` · `useToggleReaction` · `useCreatePost` · `useDeletePost` · `useUpdatePost` · `useFollowers` · `useFollowing` · `useToggleFollow` · `useIsFollowing` · `useNotifications` · `useMarkAsRead` · `useMarkAllAsRead` · `useSettings` · `useUpdateSettings` · `useSubmitHelpRequest` · `useDeleteAccount`

---

> **Document maintenu** par l'équipe Naturegraph. Toute évolution produit doit donner lieu à une mise à jour de ce référentiel **avant** déploiement.
