# PRD : Auth + Onboarding Naturegraph

> Product Requirements Document
> Version : 1.0 : 2026-04-01
> Auteur : Nicolas (Lead Product Designer) + Claude (PM/Dev/UX/UI)
> Statut : Reference active : guide d'implementation

---

## Table des matieres

1. [Contexte & objectifs](#1-contexte--objectifs)
2. [Etats utilisateur](#2-etats-utilisateur)
3. [Layout & responsive](#3-layout--responsive)
4. [Page Auth : Signup](#4-page-auth--signup)
5. [Page Auth : Login](#5-page-auth--login)
6. [Page Auth : Verification OTP](#6-page-auth--verification-otp)
7. [Flow Onboarding : Etape 1 : Centres d'interet](#7-flow-onboarding--etape-1--centres-dinteret)
8. [Flow Onboarding : Etape 2 : Frequence d'exploration](#8-flow-onboarding--etape-2--frequence-dexploration)
9. [Flow Onboarding : Etape 3 : Motivations](#9-flow-onboarding--etape-3--motivations)
10. [Flow Onboarding : Etape 4 : Nom d'utilisateur](#10-flow-onboarding--etape-4--nom-dutilisateur)
11. [Modal de sortie d'onboarding](#11-modal-de-sortie-donboarding)
12. [Mode demo (demoAuth)](#12-mode-demo-demoauth)
13. [Guest mode & restrictions](#13-guest-mode--restrictions)
14. [Mots bannis (bannedWords)](#14-mots-bannis-bannedwords)
15. [Navigation & routing](#15-navigation--routing)
16. [Architecture de donnees (AuthContext, etats)](#16-architecture-de-donnees-authcontext-etats)
17. [Internationalisation](#17-internationalisation)
18. [Accessibilite (WCAG AA)](#18-accessibilite-wcag-aa)
19. [Performance & eco-conception](#19-performance--eco-conception)
20. [Inventaire composants](#20-inventaire-composants)
21. [TODO Backend](#21-todo-backend)
22. [Roadmap d'implementation](#22-roadmap-dimplementation)

Annexe A : [Design tokens reference](#annexe-a--design-tokens-reference)
Annexe B : [Etats de l'AuthContext](#annexe-b--etats-de-lauthcontext)

---

## 1. Contexte & objectifs

### Pourquoi ce flow ?

Le flow Auth + Onboarding est la **premiere impression** que l'utilisateur a de Naturegraph. Il conditionne directement le taux de conversion visiteur → compte actif et la qualite des donnees de profil collectees pour la personnalisation du feed.

L'objectif est double :

1. **Frictionless auth** : permettre la creation de compte en moins de 2 minutes via un systeme OTP sans mot de passe (magic link).
2. **Onboarding signifiant** : collecter les donnees de profil minimales (interets, frequence, motivations, username) pour personnaliser l'experience des le premier affichage du feed.

### Objectifs produit

| Objectif                       | Mesure cible                                     |
| ------------------------------ | ------------------------------------------------ |
| Taux de completion onboarding  | > 70% des comptes crees finalisent l'onboarding  |
| Temps de creation de compte    | < 2 minutes signup + verification OTP            |
| Temps de completion onboarding | < 3 minutes pour les 4 etapes                    |
| Taux d'abandon OTP             | < 15% (reduction grace au hint OTP en mode demo) |
| Qualite des profils            | > 60% des utilisateurs selectionne >= 1 interet  |
| Performance                    | LCP < 2.5s, < 300KB JS gzip                      |

### Sources de verite

| Source    | Role                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Figma** | Design de reference : [Onboarding Web App Light](https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6381-67389) |
| **Code**  | `src/pages/AuthPage.tsx` : orchestrateur principal                                                                        |
| **Code**  | `src/components/auth/` : 9 composants (Signup, Login, Verification, etc.)                                                 |
| **Code**  | `src/components/onboarding/` : 6 composants (Interests, Step2-4, ExitModal, Button)                                       |
| **Code**  | `src/lib/demoAuth.ts` : OTP en memoire pour le mode demo                                                                  |
| **Code**  | `src/contexts/AuthContext.tsx` : etat global auth + DemoAuthProvider                                                      |
| **Types** | `src/types/database.ts` : type Profile                                                                                    |
| **i18n**  | `src/i18n/locales/fr.json`, `en.json` : cles `auth.*` et `onboarding.*`                                                   |

---

## 2. Etats utilisateur

Le flow Auth + Onboarding gere **4 etats utilisateur principaux** et **7 modes d'ecran**.

### 2.1 Etats principaux

#### Visiteur anonyme (non connecte, non invite)

Acces a la landing page `/`. Peut cliquer sur "S'inscrire" → route `/signup` ou "Se connecter" → route `/login`. Le feed `/home` est accessible en lecture seule via le mode guest.

#### Utilisateur en cours d'authentification

L'utilisateur est sur `AuthPage` dans l'un des modes : `signup` | `login` | `verification`. Il n'est pas encore authentifie (pas de session Supabase).

#### Utilisateur authentifie sans profil (onboarding non complete)

Etat transitoire apres la verification OTP reussie. Le champ `profile.username` est `null`. L'`AuthContext` derive `onboardingCompleted: false`. L'utilisateur est redirige vers le mode `onboarding` de l'`AuthPage`.

#### Utilisateur authentifie avec profil complet

`profile.username` est renseigne → `onboardingCompleted: true`. L'utilisateur est redirige vers `/home`.

### 2.2 Modes d'ecran de l'AuthPage

```
AuthMode = 'signup' | 'login' | 'verification' | 'onboarding'
```

Les transitions entre modes se font via `AnimatePresence` de `motion/react` avec un slide vertical subtil (opacity 0→1, translateY 10→0, duree 300ms, ease easeInOut).

### 2.3 Flux complets

#### Flux Signup (nouvel utilisateur)

```
Landing / n'importe quelle page
  → /signup (AuthPage initialMode="signup")
  → SignupForm : saisie email
  → [signUp(email)] → generateAndStoreOtp en demo / signInWithOtp Supabase en prod
  → mode = 'verification' (VerificationForm)
  → [verifyOtp(email, token)] → validation
  → mode = 'onboarding' (OnboardingComponent)
  → Etape 1 (interets) → 2 (frequence) → 3 (motivations) → 4 (username)
  → [profiles.upsert] → completeOnboarding()
  → navigate('/home')
```

#### Flux Login (utilisateur existant)

```
/login (AuthPage initialMode="login")
  → LoginForm : saisie email + mot de passe
  → [signIn(email, password)]
  → handleLoginSuccess → navigate('/home')

OU via OTP (si pas de mot de passe) :
  → [signInWithOtp(email)] → mode = 'verification'
  → [verifyOtp] → user.onboarding_completed ? home : onboarding
```

#### Flux Guest (decouverte sans compte)

```
SignupForm / LoginForm → bouton "Decouvrir sans compte"
  → navigate('/home') en mode guest
```

---

## 3. Layout & responsive

### 3.1 Breakpoints

| Breakpoint | Largeur | Comportement                                                    |
| ---------- | ------- | --------------------------------------------------------------- |
| Mobile     | 402px   | Formulaire pleine largeur, pas de colonne photo, fond off-white |
| Tablet     | 768px   | Idem mobile (fond off-white)                                    |
| Desktop    | 1440px  | Card centree sur fond teal-dark + motifs SVG decoratifs         |
| XL Desktop | 1920px  | Idem desktop, max-width 1728px centre                           |

### 3.2 Layout Auth (Signup, Login, Verification)

**Mobile / Tablet** :

- Fond : `bg-off-white` (blanc casse)
- Card : pleine largeur, pas de radius haut, pas de bordure visible
- Photo hero : masquee (`hidden lg:flex`)
- Formulaire : padding `p-6`, contenu full-width

**Desktop / XL** :

- Fond : `bg-teal-dark` (vert fonce Naturegraph)
- Motifs SVG decoratifs (`AuthPatterns`) : grand cercles en stroke blanc opacity 4-7%, feuilles, lignes diagonales : `aria-hidden="true"`
- Card : `rounded-[32px]`, hauteur fixe `md:h-[832px]`, shadow legere
- Card 2 colonnes : formulaire 512px + photo hero 512px
- Photo hero : `rounded-r-[32px]`, `object-cover`, credit photo en overlay bas

### 3.3 Layout Onboarding

**Mobile** :

- Fond : `bg-warm-beige`
- Card : pleine hauteur (`h-screen`), pleine largeur, pas de radius
- Content : `p-6`, scrollable si besoin
- Pas de motifs SVG

**Tablet (768px)** :

- Fond : `bg-warm-beige`
- Card : pleine hauteur (768px), `w-[636px]` si espace suffisant
- Content : `p-8`

**Desktop / XL (1440px, 1920px)** :

- Fond : `bg-warm-beige`
- Card : `w-[636px]`, `h-auto`, `md:rounded-[32px]`
- Min-height contenu par etape : 730px
- Centree verticalement dans l'ecran

### 3.4 Node IDs Figma : Reference

#### Section globale : `6381:67389`

| Node ID      | Ecran                | Breakpoint          |
| ------------ | -------------------- | ------------------- |
| `6381:67390` | Signup               | XL Desktop (1920px) |
| `6381:68393` | Login                | XL Desktop (1920px) |
| `6381:67432` | Code OTP             | XL Desktop (1920px) |
| `6381:67472` | Onboarding : etape 1 | XL Desktop (1920px) |
| `6381:67528` | Onboarding : etape 2 | XL Desktop (1920px) |
| `6381:67578` | Onboarding : etape 3 | XL Desktop (1920px) |
| `6381:67612` | Onboarding : etape 4 | XL Desktop (1920px) |
| `6381:68276` | Signup               | Desktop (1440px)    |
| `6381:68541` | Login                | Desktop (1440px)    |
| `6381:67977` | Code OTP             | Desktop (1440px)    |
| `6381:68067` | Onboarding : etape 1 | Desktop (1440px)    |
| `6381:68123` | Onboarding : etape 2 | Desktop (1440px)    |
| `6381:68317` | Onboarding : etape 3 | Desktop (1440px)    |
| `6381:68351` | Onboarding : etape 4 | Desktop (1440px)    |
| `6381:67682` | Signup               | Tablet (768px)      |
| `6381:68450` | Login                | Tablet (768px)      |
| `6381:67653` | Code OTP             | Tablet (768px)      |
| `6381:67712` | Onboarding : etape 1 | Tablet (768px)      |
| `6381:67768` | Onboarding : etape 2 | Tablet (768px)      |
| `6381:67845` | Onboarding : etape 3 | Tablet (768px)      |
| `6381:67879` | Onboarding : etape 4 | Tablet (768px)      |
| `6381:68173` | Signup               | Mobile (402px)      |
| `6381:68496` | Login                | Mobile (402px)      |
| `6381:67818` | Code OTP             | Mobile (402px)      |
| `6381:67921` | Onboarding : etape 1 | Mobile (402px)      |
| `6381:68017` | Onboarding : etape 2 | Mobile (402px)      |
| `6381:68202` | Onboarding : etape 3 | Mobile (402px)      |
| `6381:68235` | Onboarding : etape 4 | Mobile (402px)      |

---

## 4. Page Auth : Signup

**Composant** : `src/components/auth/SignupForm.tsx`
**Node IDs Figma** : `6381:67390` (XL), `6381:68276` (Desktop), `6381:67682` (Tablet), `6381:68173` (Mobile)

### 4.1 Structure visuelle

#### Colonne formulaire (512px desktop, full-width mobile)

```
[Logo Naturegraph]                          ← src/components/auth/Logo.tsx

[H2] "Rejoins-nous !"
[P] "Decouvre et partage la nature..."      ← description 2 lignes max

[Formulaire]
  [AuthInput] Adresse e-mail ou telephone   ← label + helper text + error state
    placeholder: "ton@email.com"
    helper: "Nous t'enverrons un code de connexion securise."
    type="text" inputMode="email" autocomplete="email"

  [AuthButton primary] "Creer mon compte"  ← full-width, pill shape
  [AuthButton secondary] "Decouvrir sans compte"  ← full-width

[Separateur] "ou continuer avec"            ← ligne + texte centre sur fond off-white

[Boutons sociaux : 3 egaux]
  [Google] [Apple] [Facebook]              ← SocialButton, icone SVG seule

[Lien] "Tu as deja un compte ?" [Se connecter]  ← texte + lien primary underline
```

#### Colonne photo hero (512px, desktop uniquement)

- Image : `src/assets/images/mission-observer.png`
- `object-cover`, `rounded-r-[32px]`
- Credit photo en overlay bas : fond semi-transparent `rgba(12,12,20,0.32)`, coin arrondi
  - Icone Instagram + "Credit photo" en italique
  - Lien `@emie_photographie_nature` (href Instagram, `target="_blank"`)
- Fallback : si l'image fail, l'image par defaut est utilisee (gestion `onError`)

### 4.2 Composant AuthInput : Specs detaillees

Structure interne (`src/components/auth/AuthInput.tsx`) :

```
[Label] texte + * decoratif (aria-hidden)
[Input container - pill h-12]
  [Input text]                               ← focus:ring-2 ring-primary
  [Helper text / Error message]              ← role="alert" si erreur
```

**Etats** :

- Default : `border-border` (0.5px), `bg-off-white`
- Focus : `ring-2 ring-primary`, border-transparent
- Error : `border-destructive`, message d'erreur en rouge sous le champ, `role="alert"`
- Disabled : `opacity-50 cursor-not-allowed`
- Loading : champ desactive pendant la requete

### 4.3 Etats du formulaire Signup

| Etat             | Comportement                                                             |
| ---------------- | ------------------------------------------------------------------------ |
| Default          | Champ vide, bouton "Creer mon compte" actif (validation a la soumission) |
| Loading          | Spinner dans le bouton, tous champs desactives                           |
| Error email vide | Message "Ce champ est requis" sous le champ                              |
| Error reseau     | Message d'erreur generique ou message Supabase sanitise                  |
| Success          | Notification toast "Code envoye !", transition vers VerificationForm     |

### 4.4 Gestion des boutons sociaux

- 3 boutons egaux en flexbox gap-4
- Chaque bouton : icone SVG du provider, fond blanc/off-white, border, pill
- Clic : appel `signInWithSocial(provider)` → stub en mode demo → message d'erreur "Connexion sociale bientot disponible"
- TODO BACKEND : implementer via `supabase.auth.signInWithOAuth()`

---

## 5. Page Auth : Login

**Composant** : `src/components/auth/LoginForm.tsx`
**Node IDs Figma** : `6381:68393` (XL), `6381:68541` (Desktop), `6381:68450` (Tablet), `6381:68496` (Mobile)

### 5.1 Structure visuelle

```
[Logo Naturegraph]

[H2] "Bon retour !"
[P] "Content de te revoir. Connecte-toi..."

[Formulaire]
  [AuthInput] Adresse e-mail ou nom d'utilisateur
    type="text" inputMode="email" autocomplete="username"

  [Input mot de passe - custom]
    [Input type="password"|"text" selon toggle]
    [Bouton toggle oeil - Eye/EyeOff Lucide]  ← aria-label dynamique
    border-[0.5px], h-12, rounded-button, pr-14 (espace bouton)

  [Options row]
    [Checkbox] Se souvenir de moi             ← checkbox custom visuelle + sr-only input
    [Bouton] Mot de passe oublie ?            ← text-primary underline bold

  [AuthButton primary] "Se connecter"
  [AuthButton secondary] "Decouvrir sans compte"

[Separateur] "ou continuer avec"

[Boutons sociaux] Google | Apple | Facebook

[Lien] "Pas encore de compte ?" [Creer un compte]
```

### 5.2 Checkbox "Se souvenir de moi" : Specs detaillees

La checkbox utilise le pattern "sr-only real input + custom visual" :

- Input natif (`type="checkbox"`) : `peer sr-only`
- Conteneur visuel : `size-5 rounded border`, classes `peer-focus:ring-2 peer-focus:ring-primary peer-focus:ring-offset-2`
- Etat checked : `bg-primary border-primary`
- Coche SVG : `viewBox="0 0 12 10"`, stroke white, position absolute pointer-events-none
- Group hover : `group-hover:border-primary`

**Note implementation** : `rememberMe` est capture dans l'etat local mais pas encore transmis a Supabase. TODO BACKEND : passer `options.persistSession` dans `signInWithPassword`.

### 5.3 Toggle mot de passe : Specs detaillees

- Bouton absolu dans le champ (`right-6 top-1/2 -translate-y-1/2`)
- Icone : `Eye` (mot de passe masque) | `EyeOff` (mot de passe visible) : Lucide, size 18
- `aria-label` dynamique : "Afficher le mot de passe" / "Masquer le mot de passe"
- Transition : opacity sur hover/active

### 5.4 Etats du formulaire Login

| Etat               | Comportement                                                  |
| ------------------ | ------------------------------------------------------------- |
| Default            | Champs vides, bouton actif                                    |
| Error champs vides | "Ce champ est requis" a la soumission                         |
| Loading            | Spinner dans le bouton, tout desactive                        |
| Error identifiants | Message d'erreur sanitise (pas de message technique Supabase) |
| Success            | Toast + navigate('/home')                                     |

---

## 6. Page Auth : Verification OTP

**Composant** : `src/components/auth/VerificationForm.tsx`
**Node IDs Figma** : `6381:67432` (XL), `6381:67977` (Desktop), `6381:67653` (Tablet), `6381:67818` (Mobile)

### 6.1 Structure visuelle

```
[Row] [Bouton retour fleche ArrowLeft] [Logo]

[Zone centree verticalement]
  [H2] "Verifie ta messagerie"
  [P] "Nous t'avons envoye un code a 6 chiffres a {{email}}."

  [Label] "Code de verification"

  [Inputs OTP : 6 cases]
    6 inputs cote a cote, flex gap-2
    Chaque case : w-full aspect-square max-w-[56px]
    background : var(--color-action-light)
    Focus : ring-2 ring-primary
    Erreur : border-destructive (rouge)
    text-center, text-xl, font-semibold

  [Message erreur : si code invalide]
    role="alert", text-destructive text-xs

  [Timer] "Code valide pendant MM:SS"         ← countdown 2:00 → 0:00

  [Hint OTP : mode demo uniquement]
    Visible si !isSupabaseConfigured && demoOtp
    Fond : bg-[#f3e8ff], border-[#a78bfa], rounded-xl, px-4 py-3
    Icone 🔐 + "Mode demo : Ton code OTP : XXXXXX"
    Texte violet : text-[#7c3aed], font-semibold

  [Renvoyer le code]
    "Tu n'as pas recu le code ?"
    [Bouton] "Renvoyer le code"               ← desactive si timer > 0
```

### 6.2 Comportements des inputs OTP

**Saisie chiffre par chiffre** :

- N'accepte que les chiffres (`/^\d?$/.test(value)`)
- Auto-avance : apres saisie d'un chiffre, focus sur le champ suivant
- Auto-submit : quand les 6 cases sont remplies, `handleVerify()` est appele automatiquement

**Navigation clavier** :

- `Backspace` sur case vide : retourne au champ precedent
- `Enter` : non implemente (auto-submit suffit)

**Copier/coller** :

- Interception de l'evenement `onPaste` sur le conteneur
- Extraction des chiffres uniquement depuis le clipboard
- Remplissage automatique de toutes les cases disponibles
- Focus sur la derniere case remplie (ou la 6e)
- Auto-submit si les 6 cases sont completes

### 6.3 Timer et renvoi de code

- Duree initiale : **120 secondes (2 minutes)** : constante `TIMER_SECONDS = 120`
- Format d'affichage : `MM:SS` (ex: "02:00" → "01:45" → "00:00")
- Le bouton "Renvoyer le code" est desactive tant que le timer > 0
- Au clic "Renvoyer" : reset du timer a 120s, reset des cases, nouvel OTP genere
- En mode demo : le hint OTP est mis a jour apres renvoi (`getDemoOtp(email)`)

### 6.4 Logique de validation OTP

**Mode demo (DemoAuthProvider)** :

1. `validateOtp(email, token)` verifie le format (6 chiffres), la correspondance avec `otpStore`, l'expiration (2 min)
2. Usage unique : suppression de l'entree apres validation reussie
3. En cas d'erreur : message "Code invalide : verifiez la console de votre navigateur"

**Mode production (Supabase)** :

- Appel `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- Erreur sanitisee avant affichage

**Apres verification reussie** :

- Si `initialAuthMode === 'signup'` → mode 'onboarding'
- Si utilisateur sans `onboarding_completed` → mode 'onboarding'
- Sinon → navigate('/home')

---

## 7. Flow Onboarding : Etape 1 : Centres d'interet

**Composant** : `src/components/onboarding/OnboardingInterests.tsx`
**Node IDs Figma** : `6381:67472` (XL), `6381:68067` (Desktop), `6381:67712` (Tablet), `6381:67921` (Mobile)

### 7.1 Structure visuelle

```
[Header : fixe en haut]
  [Row]
    [Badge teal] "Profil"                    ← bg-teal-dark, h-8, px-3, rounded-button
    [Row]
      [Texte aria-hidden] "Etape 1/4"
      [Bouton X] Quitter l'onboarding        ← bg-[#f0f0f5], size-8, rounded-full

  [Barre progression 4 segments]
    Segment 1 : bg-teal-dark (actif)
    Segments 2-4 : bg-border (inactif)
    role="progressbar" aria-valuenow=1 aria-valuemax=4

[Contenu scrollable]
  [H3] "Quels sont tes centres d'interet ?"
  [P] "Aide-nous a mieux te connaitre..."

  [Compteur : visible si >= 1 selectionne]
    "X / 3 selectionnes" aria-live="polite"

  [Grille categories : flex-wrap gap-2]
    9 cartes : flex-col, h-24, rounded-xl
    Width : 50% mobile - 4px | 33.33% desktop - 5.33px

    [Carte : etat default]
      border border-border, bg-transparent
      hover:shadow-md (motion-safe)
      active:scale-95 (motion-safe)
      focus-visible:ring-2 ring-primary

    [Carte : etat selectionne]
      border-2 border-primary, bg-primary-light
      hover:shadow-md (motion-safe)

    [Carte : etat desactive (max atteint)]
      opacity-40, cursor-not-allowed, border border-border

    Contenu : emoji (aria-hidden) + label traduit

[Actions : fixes en bas]
  [OnboardingButton secondary] "Passer"      ← flex-1
  [OnboardingButton primary] "Continuer"    ← flex-1
```

### 7.2 Categories disponibles (9)

| ID           | Label FR   | Emoji |
| ------------ | ---------- | ----- |
| `birds`      | Oiseaux    | 🐦    |
| `mammals`    | Mammiferes | 🦌    |
| `insects`    | Insectes   | 🦋    |
| `reptiles`   | Reptiles   | 🦎    |
| `amphibians` | Amphibiens | 🐸    |
| `arachnids`  | Arachnides | 🕷️    |
| `mollusks`   | Mollusques | 🐌    |
| `fish`       | Poissons   | 🐟    |
| `plants`     | Plantes    | 🌿    |

Emojis centralises dans `src/utils/badgeHelpers.ts` → `CATEGORY_EMOJIS` (source de verite).

### 7.3 Regles de selection

- **Maximum 3 centres d'interet** (constante `MAX_INTERESTS = 3`)
- La selection d'un 4e element est **bloquee** (la carte devient `disabled`)
- L'element deja selectionne reste togglable (deselectionnement)
- Ordre de selection conserve (affiche en badge numerote dans les versions futures)
- La selection est optionnelle : bouton "Passer" disponible en permanence

**Decision technique** : `MAX_INTERESTS = 3` est valide uniquement cote client pour l'instant. TODO BACKEND : validation via contrainte DB sur `profiles.interests` (array max 3 elements).

### 7.4 Comportements

**Toggle d'une carte** :

```
Si selectionne → retire de la liste
Si non selectionne && count < MAX_INTERESTS → ajoute a la liste
Si non selectionne && count >= MAX_INTERESTS → ignore (disabled)
```

**Continuer** : appelle `onContinue(selectedInterests)` : tableau vide autorise si passe via "Passer"
**Passer** : appelle `onSkip()` → avance a l'etape 2 sans interets

---

## 8. Flow Onboarding : Etape 2 : Frequence d'exploration

**Composant** : `src/components/onboarding/OnboardingStep2.tsx`
**Node IDs Figma** : `6381:67528` (XL), `6381:68123` (Desktop), `6381:67768` (Tablet), `6381:68017` (Mobile)

### 8.1 Structure visuelle

```
[Header]
  [Badge teal] "Profil"
  [Row]
    [Texte] "Etape 2/4"
    [Bouton X] Quitter

  [Barre progression 4 segments]
    Segments 1-2 : bg-teal-dark
    Segments 3-4 : bg-border
    role="progressbar" aria-valuenow=2 aria-valuemax=4

[Contenu scrollable]
  [H3] "A quelle frequence explores-tu la nature ?"
  [P] "Cela nous permettra d'adapter ton experience..."

  [Groupe radio : role="radiogroup"]
    4 cartes options, flex-col gap-3, full-width

    [Carte option : etat default]
      border-border, bg-transparent
      hover:border-foreground/20
      rounded-card, p-6
      focus-visible:ring-2 ring-primary

    [Carte option : etat selectionne]
      border-primary, bg-primary-light
      aria-pressed="true"

    Contenu de chaque carte :
      [Row] [Titre en gras] [Indicateur radio custom]
      [Description]

    [Indicateur radio custom]
      Defaut : bg-off-white, border-[1.5px] border-border, w-6 h-6 rounded-full
      Selectionne : bg-primary + point interieur bg-off-white w-3 h-3

[Actions]
  [Bouton retour] fleche ArrowLeft + "Retour" (masque sur mobile)  ← h-12 px-6, border
  [OnboardingButton primary] "Continuer"  ← flex-1, desactive si aucune option
```

### 8.2 Options de frequence

| ID             | Titre FR                  | Description FR                                                 |
| -------------- | ------------------------- | -------------------------------------------------------------- |
| `daily`        | Tous les jours            | "Je sors regulierement et j'observe la nature quotidiennement" |
| `weekly`       | Quelques fois par semaine | "Je profite du week-end et de mon temps libre pour explorer"   |
| `monthly`      | Quelques fois par mois    | "J'aime decouvrir de nouveaux endroits de temps en temps"      |
| `occasionally` | Occasionnellement         | "Quand l'occasion se presente lors de voyages ou sorties"      |

### 8.3 Mapping vers les notifications

La frequence choisie sera mappee vers les parametres de notification Supabase :

| Option         | Frequence notifications (futur)                         |
| -------------- | ------------------------------------------------------- |
| `daily`        | Temps reel (notifications immediates)                   |
| `weekly`       | 1 digest par jour                                       |
| `monthly`      | 1 digest par semaine                                    |
| `occasionally` | Aucune notification push (email uniquement, max 1/mois) |

TODO BACKEND : stocker dans `profiles.notification_frequency` (type ENUM) et creer une entree dans `notification_settings`.

### 8.4 Comportements

- Selection obligatoire pour continuer (bouton "Continuer" desactive si aucune option)
- Une seule option selectionnee a la fois (comportement radio)
- `initialValue` : restitue la valeur si l'utilisateur revient en arriere
- Bouton retour : revient a l'etape 1 (interets)

---

## 9. Flow Onboarding : Etape 3 : Motivations

**Composant** : `src/components/onboarding/OnboardingStep3.tsx`
**Node IDs Figma** : `6381:67578` (XL), `6381:68317` (Desktop), `6381:67845` (Tablet), `6381:68202` (Mobile)

### 9.1 Structure visuelle

```
[Header]
  [Badge teal] "Profil"
  [Row]
    [Texte] "Etape 3/4"
    [Bouton X] Quitter

  [Barre progression 4 segments]
    Segments 1-3 : bg-teal-dark
    Segment 4 : bg-border
    role="progressbar" aria-valuenow=3 aria-valuemax=4

[Contenu scrollable]
  [H3] "Pourquoi souhaites-tu utiliser Naturegraph ?"
  [P] "Dis-nous ce qui te motive le plus ! Cela nous aidera..."

  [Groupe motivations : role="group"]
    4 options toggle, flex-col gap-4, full-width

    [Option : etat default]
      bg-off-white, border border-border
      hover:border-foreground/20
      rounded-button, h-[52px]
      flex row : checkbox visuelle + label

    [Option : etat selectionne]
      bg-primary/10, border border-primary
      aria-pressed="true"

    [Checkbox visuelle]
      Defaut : bg-off-white, border-[1.5px] border-border, size-5, rounded-sm
      Selectionne : bg-primary + icone Check blanc (Lucide, strokeWidth=3)

    [Label]
      Defaut : text-foreground font-bold
      Selectionne : text-primary font-bold
      Utilise <span> et non <p> (phrasing content dans <button>)

[Actions]
  [Bouton retour] ArrowLeft + "Retour" (masque mobile)
  [OnboardingButton primary] "Continuer"     ← toujours actif (multi-select libre)
```

### 9.2 Options de motivation

| ID          | Label FR                 |
| ----------- | ------------------------ |
| `learn`     | Apprendre sur la nature  |
| `share`     | Partager mes decouvertes |
| `community` | Rejoindre une communaute |
| `identify`  | Identifier des especes   |

### 9.3 Comportements

- **Multi-select libre** : aucune limite de selection, aucune obligation
- Le bouton "Continuer" est **toujours actif** (tableau vide accepte)
- Toggle : clic sur une option selectionnee la deselectionnent
- `initialMotivations` : restitue les selections si retour en arriere
- Bouton retour : revient a l'etape 2 (frequence)

**Decision technique** : Pas de limite de selection contrairement a l'etape 1 (les motivations sont de nature differente : toutes peuvent coexister).

TODO BACKEND : stocker `motivations` dans `profiles.motivations TEXT[]` ou table `user_motivations` si ponderation ML future.

---

## 10. Flow Onboarding : Etape 4 : Nom d'utilisateur

**Composant** : `src/components/onboarding/OnboardingStep4.tsx`
**Node IDs Figma** : `6381:67612` (XL), `6381:68351` (Desktop), `6381:67879` (Tablet), `6381:68235` (Mobile)

### 10.1 Structure visuelle

```
[Header]
  [Badge teal] "Profil"
  [Row]
    [Texte] "Etape 4/4"
    [Bouton X] Quitter

  [Barre progression 4 segments]
    Tous les segments : bg-teal-dark
    role="progressbar" aria-valuenow=4 aria-valuemax=4

[Contenu scrollable]
  [H3] "Tu es pret(e) a explorer la nature !"
  [P] "Avant de commencer, dis-nous comment tu souhaites etre appele(e)."

  [Champ username]
    [Label] "Nom d'utilisateur" [*] (aria-hidden)

    [Conteneur input]
      bg conditionnel :
        - Vide : bg-off-white
        - Erreur : bg-destructive/10
        - Valide : bg-primary-light
      border overlay conditionnel :
        - Defaut : border-border
        - En cours de verification : border-primary
        - Erreur : border-destructive-foreground
        - Valide : border-primary
      h-12, rounded-button
      has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary

      [Input] type="text", autoFocus
        aria-required="true"
        aria-invalid={!!error}
        aria-describedby="username-error" (si erreur)
        min 3 car | max 25 car

      [Indicateur droite : aria-hidden]
        Si en cours : "Verification..." (text-primary)
        Sinon : compteur "X" restants (opacity 0.64)

    [Message erreur / aide]
      Si erreur && hasTyped : role="alert" text-destructive (id="username-error")
      Sinon : texte italique d'aide en cours

[Actions]
  [Bouton retour] ArrowLeft + "Retour" (masque mobile)
  [OnboardingButton primary] "Choisis ton pseudo" | "C'est parti !"
    Desactive si : format invalide | en cours de verif | < 3 caracteres
    Label change quand valide : "C'est parti !"
```

### 10.2 Regles de validation du nom d'utilisateur

#### Validation format (instantanee)

| Regle                                       | Erreur                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Longueur < 3                                | `tooShort` : "Le pseudo doit contenir au moins 3 caracteres"                                    |
| Longueur > 25                               | `tooLong` : "Le pseudo ne peut pas depasser 25 caracteres"                                      |
| Caracteres invalides                        | `invalidFormat` : "Seules les lettres, chiffres, points (.) et underscores (\_) sont autorises" |
| Commence/termine par . ou \_                | `invalidFormat`                                                                                 |
| Deux separateurs consecutifs (`..` ou `__`) | `invalidFormat`                                                                                 |
| Mot banni                                   | `bannedWord` : "Ce pseudo n'est pas disponible"                                                 |

**Regex** : `/^[a-zA-Z0-9._]+$/` : seuls lettres, chiffres, point, underscore

#### Validation disponibilite Supabase (debounce 800ms)

- Appel `supabase.from('profiles').select('username').eq('username', value).maybeSingle()`
- Declenchee uniquement si le format est valide
- Annulation du timer precedent si l'utilisateur continue de taper
- En mode demo (sans Supabase) : liste de noms hardcodes reserves (`admin`, `naturegraph`, `user`, `test`)
- Erreur `alreadyTaken` → "Ce pseudo est deja utilise"

#### Validation mots bannis (cote client)

- Normalisation anti-contournement : retire `.` et `_`, passe en minuscules
- Ex : `"f.u.c.k"` → `"fuck"` ❌ | `"ad_min"` → `"admin"` ❌ | `"nature"` → `"nature"` ✅
- 434 entrees en dur dans `OnboardingStep4.tsx` (voir section 14)

### 10.3 UX de l'indicateur de validation

Le feedback visuel est progressif :

1. **Pas encore tape** : champ neutre, pas d'indicateur
2. **En train de saisir (format KO)** : fond rouge pale, bordure rouge, message d'erreur sous le champ
3. **Format OK, verification en cours** : bordure primary, "Verification..." dans le champ
4. **Disponible** : fond primary-light, bordure primary, bouton change en "C'est parti !"
5. **Indisponible** : fond rouge pale, bordure rouge, message d'erreur

### 10.4 Sauvegarde finale

A la confirmation du username, `handleUsernameComplete(username)` est appele :

1. `supabase.from('profiles').upsert({ id, username, email, first_name, interests, notification_frequency, motivations, ... }, { onConflict: 'id' })`
2. Appel `onComplete()` → `completeOnboarding()` dans AuthContext → `refreshProfile()`
3. Navigation vers `/home`

---

## 11. Modal de sortie d'onboarding

**Composant** : `src/components/onboarding/OnboardingExitModal.tsx`

### 11.1 Declencheur

Le bouton X present dans le header de chaque etape d'onboarding ouvre cette modal. Ce n'est pas une fermeture directe mais une confirmation avec choix.

### 11.2 Structure visuelle

```
[Overlay] fixed inset-0, bg-foreground/40, backdrop-blur-sm
[Card] relative bg-off-white, rounded-card, shadow, max-w-md, centree
  [H3] "Quitter l'onboarding ?"
  [P] "Tu peux revenir finaliser ton profil a tout moment..."

  [OnboardingButton primary] "Quitter l'onboarding"   → navigate('/home')
  [OnboardingButton secondary] "Se connecter"          → mode 'login'
  [OnboardingButton ghost] "Continuer l'onboarding"   → fermeture modal
```

### 11.3 Accessibilite : Focus trap complet

La modal implementee repond au pattern ARIA Dialog :

- `role="dialog"` `aria-modal="true"` `aria-labelledby="exit-modal-title"`
- A l'ouverture : sauvegarde de `document.activeElement`, focus sur le premier element focusable
- Pendant l'ouverture : `document.body.style.overflow = 'hidden'` (scroll bloque)
- Tab / Shift+Tab : cycle dans la modal uniquement (trap complet)
- ESC : fermeture + restauration du focus
- Clic sur l'overlay : fermeture
- A la fermeture : restauration du focus sur l'element qui a declenche la modal

---

## 12. Mode demo (demoAuth)

**Fichier** : `src/lib/demoAuth.ts`
**Actif quand** : `isSupabaseConfigured === false` (variables d'env Supabase manquantes)

### 12.1 Architecture

Quand Supabase n'est pas configure, `AuthProvider` rend `DemoAuthProvider` a la place. Les interfaces sont identiques : aucune difference pour les composants qui consomment `useAuth()`.

```
isSupabaseConfigured = false
  → AuthProvider → DemoAuthProvider
  → memes methodes exposees : signUp, verifyOtp, completeOnboarding, signOut...
```

### 12.2 Fonctionnement de l'OTP demo

**Stockage** : `Map<email, { otp: string, expiresAt: number }>` en memoire
**Expiration** : `OTP_TTL_MS = 2 * 60 * 1000` (2 minutes)

**Fonctions exposees** :

- `generateAndStoreOtp(email)` : cree un OTP 6 chiffres, le logue en console avec style CSS violet, retourne l'OTP
- `validateOtp(email, token)` : verifie format + correspondance + expiration + usage unique (supprime apres validation)
- `getDemoOtp(email)` : retourne l'OTP actuel si valide (pour affichage dans l'UI)
- `hasPendingOtp(email)` : booleen indiquant si un OTP est en attente

**Affichage en UI** : le `VerificationForm` affiche un hint violet en mode demo :

- Badge `🔐 Mode demo : Ton code OTP : XXXXXX`
- Fond `#f3e8ff`, border `#a78bfa`, texte `#7c3aed`
- Mis a jour apres chaque renvoi

### 12.3 Utilisateur demo cree en memoire

Apres validation OTP, `DemoAuthProvider.verifyOtp()` cree un objet `User` minimal :

```typescript
{
  id: `demo-${Date.now()}`,
  email,
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}
```

Apres `completeOnboarding()`, un `Profile` demo est cree avec le username derive de l'email (`alice@example.com` → `username: 'alice'`).

### 12.4 Limitations du mode demo

| Limitation                    | Impact                                 |
| ----------------------------- | -------------------------------------- |
| OTP perdu au refresh de page  | L'utilisateur doit recommencer le flux |
| Pas de persistance de session | Deconnecte au refresh                  |
| Social login non disponible   | Message d'erreur explicite             |
| Username uniqueness simulee   | Liste hardcodee minimale               |

**Note** : Le mode demo est uniquement pour le developpement local. Il ne doit jamais etre deploy en production.

---

## 13. Guest mode & restrictions

### 13.1 Definition

Un "guest" est un visiteur qui clique sur "Decouvrir sans compte" depuis le formulaire Signup ou Login. Il est redirige vers `/home` sans session authentifiee.

### 13.2 Acces autorise en guest

- Lecture du feed public (posts, photos, commentaires en lecture seule)
- Navigation dans les types de posts
- Consultation des profils publics
- Utilisation des filtres de recherche geographique

### 13.3 Restrictions du guest (redirection vers auth)

Les actions suivantes declenchent un CTA de conversion vers `/signup` :

- Reagir a un post (like, reaction)
- Ajouter un commentaire
- Contribuer (bouton "+ Contribuer")
- Sauvegarder / favoris
- Partager (selon implementation)

Ces redirections s'appliquent via la detection `!isAuthenticated` dans les composants d'action.

### 13.4 Composants cles en mode guest

- `GuestSidebar` : sidebar gauche simplifiee (migrateurs populaires seulement)
- `HomeNavbar` : bouton "Se connecter" remplace l'avatar utilisateur
- `FeedPost` : boutons d'action desactives avec CTA conversion au clic

---

## 14. Mots bannis (bannedWords)

**Localisation** : `src/components/onboarding/OnboardingStep4.tsx` : constante `BANNED_USERNAMES`

### 14.1 Contenu de la liste

**Total : 434 entrees** (comptage du code source)

| Categorie                 | Exemples                                                             | Volume approximatif |
| ------------------------- | -------------------------------------------------------------------- | ------------------- |
| Mots reserves systeme     | admin, moderator, naturegraph, bot, null, undefined                  | ~22                 |
| Vulgarites francaises     | merde, putain, connard, etc. + abreviations (fdp, ntm)               | ~60                 |
| Vulgarites anglaises      | fuck, shit, bitch, etc. + abreviations (wtf, stfu)                   | ~55                 |
| Vulgarites espagnoles     | puta, joder, coño, etc. + abreviations (hdp, ctm)                    | ~70                 |
| Termes discriminatoires   | Racisme, homophobie, sexisme, handicap, violence, drogue, extremisme | ~60                 |
| Contournements leetspeak  | fuc, fuk, sh1t, btch, n1gger, etc.                                   | ~40                 |
| Termes sexuels explicites | sex, porn, xxx, nude, orgasm, etc.                                   | ~30                 |

### 14.2 Algorithme de detection

```typescript
function normalizeForBannedCheck(username: string): string {
  return username.toLowerCase().replace(/[._]/g, '')
}

// Detection :
BANNED_USERNAMES.includes(normalizeForBannedCheck(username))
```

**Exemples** :

- `"f.u.c.k"` → `"fuck"` → ❌ banni
- `"ad_min"` → `"admin"` → ❌ banni
- `"natur3gr4ph"` → `"natur3gr4ph"` → ✅ non detecte (limitation actuelle)
- `"naturegraph"` → `"naturegraph"` → ❌ banni (reserve)

### 14.3 Limitations et TODO Backend

La detection actuelle est cote client uniquement et presente des limitations :

- Substitutions leetspeak complexes non gerees (`4 → a`, `3 → e`, `$ → s`, etc.)
- Variantes avec accents non normalisees
- Repetitions de caracteres (`fuuuck`) non detectees

TODO BACKEND (voir code source) :

- Creer une table `banned_usernames` dans Supabase (RLS read-only pour tous)
- Trigger PostgreSQL de validation a l'upsert du profil
- Normalisation enrichie cote serveur (leetspeak, accents, repetitions)
- La verification finale DOIT toujours etre cote serveur

---

## 15. Navigation & routing

### 15.1 Routes du flow

| Route         | Composant                       | Guard            | Notes                                |
| ------------- | ------------------------------- | ---------------- | ------------------------------------ |
| `/signup`     | `AuthPage initialMode="signup"` | `PublicRoute`    | Redirige vers /home si deja connecte |
| `/login`      | `AuthPage initialMode="login"`  | `PublicRoute`    | Redirige vers /home si deja connecte |
| `/onboarding` | `Onboarding` (standalone)       | `ProtectedRoute` | Fallback pour acces directs          |
| `/home`       | `Home`                          | Aucun            | Accessible en guest ET connecte      |

**Note** : La verification OTP et l'onboarding ne sont pas des routes separees. Ils sont geres en interne par `AuthPage` via le state `mode`. C'est un choix delibere pour simplifier la gestion de la sequence et eviter des redirections intermediaires.

### 15.2 PublicRoute vs ProtectedRoute

**PublicRoute** (`src/components/guards/`):

- Si `isAuthenticated && onboardingCompleted` → redirect `/home`
- Si `isAuthenticated && !onboardingCompleted` → redirect `/onboarding`
- Sinon → rend les enfants

**ProtectedRoute** :

- Si `!isAuthenticated` → redirect `/login`
- Sinon → rend les enfants

### 15.3 Transitions entre modes (AuthPage)

Les transitions sont gerees via `AnimatePresence` de `motion/react` :

```typescript
const slideVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}
const slideTransition = { duration: 0.3, ease: 'easeInOut' }
```

- Chaque changement de `mode` declenche une animation entree/sortie
- `mode="wait"` sur AnimatePresence assure que la sortie est complete avant l'entree
- L'onboarding change le fond (`bg-warm-beige` vs `bg-teal-dark`) et masque les motifs SVG

### 15.4 Redirections post-authentification

```
Signup reussi → OTP envoye → mode 'verification'
OTP valide (signup) → mode 'onboarding'
OTP valide (login, onboarding non complete) → mode 'onboarding'
OTP valide (login, onboarding complete) → navigate('/home') + toast
Onboarding complete → completeOnboarding() → navigate('/home') + toast
Login mot de passe reussi → navigate('/home') + toast
Guest → navigate('/home')
```

---

## 16. Architecture de donnees (AuthContext, etats)

### 16.1 Interface AuthState

```typescript
interface AuthState {
  user: User | null // Objet Supabase User (null si non connecte)
  session: Session | null // Session Supabase (null en mode demo)
  profile: Profile | null // Profil depuis la table 'profiles'
  isLoading: boolean // Chargement initial (getSession)
  isAuthenticated: boolean // Derive de user !== null
  onboardingCompleted: boolean // Derive de profile.username !== null
}
```

### 16.2 Derive de `onboardingCompleted`

```typescript
function deriveState(base: Omit<AuthState, 'onboardingCompleted'>): AuthState {
  return { ...base, onboardingCompleted: !!base.profile?.username }
}
```

**Logique** : si le profil a un `username`, l'onboarding est considere comme complete. C'est le seul champ obligatoire de l'etape 4, et la seule etape non skippable dans le flux normal.

### 16.3 Methodes exposees par le contexte

| Methode              | Signature                                | Mode demo                   | Mode Supabase            |
| -------------------- | ---------------------------------------- | --------------------------- | ------------------------ |
| `signUp`             | `(emailOrPhone) → SignUpResult`          | Genere OTP en memoire       | `signInWithOtp` Supabase |
| `signIn`             | `(email, password) → { success, error }` | Retourne erreur (non dispo) | `signInWithPassword`     |
| `signInWithOtp`      | `(email) → { error }`                    | Genere OTP en memoire       | `signInWithOtp` Supabase |
| `signInWithSocial`   | `(provider) → SocialResult`              | Retourne stub               | TODO BACKEND             |
| `verifyOtp`          | `(email, token) → { error }`             | `validateOtp` memoire       | `verifyOtp` Supabase     |
| `completeOnboarding` | `() → void`                              | Cree profil demo            | `refreshProfile`         |
| `signOut`            | `() → void`                              | Reset state                 | `supabase.auth.signOut`  |
| `refreshProfile`     | `() → void`                              | No-op                       | Requete DB profiles      |

### 16.4 Rate limiting cote client

Uniquement en mode production (AuthProvider Supabase) :

| Protection       | Valeur                           | Portee                      |
| ---------------- | -------------------------------- | --------------------------- |
| OTP rate limit   | 30 secondes entre deux envois    | `lastOtpSentAtRef` (useRef) |
| Login rate limit | 5 secondes entre deux tentatives | `lastSignInAtRef` (useRef)  |

Ces valeurs sont stockees dans des `ref` (non-reactive) pour eviter des re-renders.

**Note** : Ces limites sont cote client uniquement. Le vrai rate limiting DOIT etre implemente cote serveur (Supabase Edge Functions ou regles Auth Supabase). Voir section 21 TODO Backend.

### 16.5 Sanitisation des erreurs

La methode `sanitizeAuthError` filtre les messages Supabase avant affichage :

```typescript
const safeMessages = {
  'Invalid login credentials': 'Identifiants incorrects.',
  'Email not confirmed': 'Adresse e-mail non confirmee...',
  'User already registered': 'Un compte existe deja...',
  'Email rate limit exceeded': 'Trop de tentatives...',
}
return safeMessages[message] ?? 'Une erreur est survenue. Reessaie plus tard.'
```

Objectif : eviter la fuite d'informations (enumeration d'emails, structure interne Supabase).

### 16.6 Refresh de session automatique

Toutes les 30 minutes, la session Supabase est rafraichie via `setInterval` :

```typescript
setInterval(() => {
  supabase?.auth.refreshSession().catch(...)
}, 30 * 60 * 1000)
```

Le cleanup est effectue dans le `return` du `useEffect` (unsubscribe + clearInterval).

### 16.7 Structure du Profile (database.ts)

```typescript
interface Profile {
  id: string // = user.id (UUID Supabase)
  username: string // Unique, 3-25 chars : cle d'onboarding complet
  email: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  birth_date: string | null
  bio: string | null
  interests: Interest[] // enum: birds | mammals | insects | ...
  city: string | null
  region: string | null
  country: string | null
  instagram: string | null
  twitter: string | null
  website: string | null
  is_public: boolean
  email_verified: boolean
  avatar_url: string | null
  banner_url: string | null
  posts_count: number // Compteur denormalise : maintenu par trigger
  followers_count: number // Compteur denormalise : maintenu par trigger
  following_count: number // Compteur denormalise : maintenu par trigger
  created_at: string
  updated_at: string
  last_login_at: string | null
}
```

---

## 17. Internationalisation

### 17.1 Cles i18n existantes : namespace `auth`

```
auth.login (general)
auth.signup (general)
auth.logout
auth.email, auth.emailPlaceholder, auth.emailHelper
auth.password, auth.passwordPlaceholder
auth.forgotPassword, auth.rememberMe
auth.signupTitle, auth.signupSubtitle
auth.loginTitle, auth.loginSubtitle
auth.emailOrPhone, auth.creditPhoto
auth.continueWith, auth.hasAccount, auth.noAccount
auth.createAccount, auth.discoverWithout, auth.connectNow
auth.verifyTitle, auth.verifySubtitle, auth.verifyCodeLabel
auth.verifyTimer, auth.verifyNoCode, auth.verifyResend, auth.verifying

auth.resetPassword.title, .description, .passwordLabel
auth.resetPassword.passwordPlaceholder, .confirmLabel
auth.resetPassword.confirmPlaceholder, .submit, .backToLogin

auth.errors.required, .invalidFormat, .accountExists
auth.errors.accountNotFound, .generic, .invalidCode, .expiredCode

auth.success.signupTitle, .signupDesc, .signupDescription
auth.success.loginTitle, .loginDesc, .loginDescription
auth.success.codeSent, .codeSentDesc, .codeSentDescription
auth.success.passwordReset, .passwordResetDesc

auth.signup.title, .description, .emailLabel, .emailHelper
auth.signup.createAccount, .discoverWithout, .orContinueWith
auth.signup.alreadyAccount, .login, .photoCredit, .photographer

auth.login.title, .description, .emailLabel, .passwordLabel
auth.login.rememberMe, .forgotPassword, .connect
auth.login.discoverWithout, .orContinueWith, .noAccount, .signup

auth.verify.title, .description, .codeLabel
auth.verify.noCode, .resend, .timer, .demoCode
```

### 17.2 Cles i18n existantes : namespace `onboarding`

```
onboarding.stepLabel, .back, .continue
onboarding.exitButtonLabel, .progressLabel
onboarding.categories.profile

onboarding.interests.title, .description
onboarding.interests.categories.birds/mammals/insects/reptiles/amphibians/arachnids/mollusks/fish/plants
onboarding.interests.skip, .continue, .counter, .helperText

onboarding.frequency.title, .description
onboarding.frequency.options.daily.title, .description
onboarding.frequency.options.weekly.title, .description
onboarding.frequency.options.monthly.title, .description
onboarding.frequency.options.occasionally.title, .description

onboarding.motivations.title, .description
onboarding.motivations.options.learn, .share, .community, .identify

onboarding.username.title, .description
onboarding.username.inputLabel, .inputRequired, .inputHelper
onboarding.username.buttonDisabled, .buttonEnabled
onboarding.username.errors.tooShort, .tooLong, .invalidFormat
onboarding.username.errors.alreadyTaken, .bannedWord, .checking

onboarding.exitModal.title, .description
onboarding.exitModal.goHome, .goLogin, .continue
```

### 17.3 Cles i18n manquantes ou a creer

| Cle manquante                               | Usage                                                                 | Priorite   |
| ------------------------------------------- | --------------------------------------------------------------------- | ---------- |
| `auth.verify.demoCode`                      | Hint OTP en mode demo (present en code, absent en fr.json)            | A verifier |
| `auth.social.google`, `.apple`, `.facebook` | Labels accessibles pour les boutons sociaux                           | Basse      |
| `auth.login.otpMode`                        | Si login passe par OTP plutot que mot de passe                        | Future     |
| `onboarding.step1Hint`                      | Helper texte bas de page etape 1 (present dans Onboarding.tsx legacy) | A verifier |
| `onboarding.usernameErrors.invalidStart`    | Si commence/termine par separateur                                    | A verifier |

### 17.4 Support des langues

- Langue principale : **Francais (fr)** : `src/i18n/locales/fr.json`
- Langue secondaire : **Anglais (en)** : `src/i18n/locales/en.json`
- Detection automatique depuis `navigator.language`
- Fallback vers `fr` si la langue n'est pas supportee

---

## 18. Accessibilite (WCAG AA)

### 18.1 Points implementes

#### Navigation clavier

| Element             | Implementation                                      |
| ------------------- | --------------------------------------------------- |
| Inputs OTP          | Auto-avance + Backspace navigation + Enter submit   |
| Toggle mot de passe | Bouton focusable avec aria-label dynamique          |
| Cartes interets     | `aria-pressed` + keyboard toggle                    |
| Options frequence   | `role="radiogroup"` + `aria-pressed`                |
| Options motivations | `role="group"` + `aria-pressed`                     |
| Input username      | `aria-required`, `aria-invalid`, `aria-describedby` |
| Bouton retour       | `aria-label` (icone seule sur mobile)               |
| Bouton fermer       | `aria-label` "Quitter l'onboarding"                 |
| Focus trap modal    | Tab/Shift+Tab cycle + ESC fermeture                 |

#### Structure semantique

- `<h2>` pour les titres de formulaires auth (Signup, Login, Verify)
- `<h3>` pour les titres d'etapes onboarding
- Toutes les etapes utilisent `<label htmlFor>` ou `aria-label` sur les champs
- `role="progressbar"` avec `aria-valuenow`, `aria-valuemax`, `aria-valuetext` sur les barres de progression
- Emojis decoratifs : `aria-hidden="true"` (categories, SVG icons)
- Messages d'erreur : `role="alert"` pour annonce immediate par les lecteurs d'ecran
- Compteur de selection interets : `aria-live="polite"` pour annonce non-urgente

#### Focus visible

Tous les elements interactifs ont un ring visible en mode clavier :

- `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- Input username : pattern `has-[:focus-visible]:ring-2` sur le conteneur (expose le ring sans affecter le focus souris)
- Bouton retour (logo) : `focus-visible:outline-2 focus-visible:outline-offset-2`

#### Contrastes

- Texte principal sur fond off-white : verifie WCAG AA (4.5:1 minimum)
- Badge teal-dark sur fond off-white : verifie
- Texte primary-light sur fond primary : verifie dans les cartes selectionnees
- Texte blanc sur fond teal-dark (motifs desktop) : decoratif, non fonctionnel

### 18.2 Points a verifier / ameliorer

| Point                                              | Statut                                                                | Priorite |
| -------------------------------------------------- | --------------------------------------------------------------------- | -------- |
| Focus au premier champ au chargement de SignupForm | Non implemente (autofocus evite par convention, sauf OnboardingStep4) | Basse    |
| Annonce de changement d'etape onboarding par SR    | Pas de `aria-live` sur le changement d'etape                          | Moyenne  |
| Label manquant sur les inputs OTP (chiffre 1-6)    | `aria-label="Chiffre X"` present dans VerificationForm ✅             | OK       |
| `lang` attribute sur HTML                          | A verifier dans `index.html`                                          | Haute    |
| Skip link                                          | Pas implemente sur les pages auth/onboarding (page courte)            | Basse    |

### 18.3 Prefers-reduced-motion

Tous les composants onboarding respectent `prefers-reduced-motion` via la classe Tailwind `motion-safe:` :

- `motion-safe:hover:shadow-md` sur les cartes interets et options
- `motion-safe:active:scale-95` sur les boutons
- Les transitions AuthPage (`AnimatePresence`) : non conditionnel actuellement : TODO

---

## 19. Performance & eco-conception

### 19.1 Code splitting

Toutes les pages sont lazy-loaded via `React.lazy()` dans `src/router.tsx` :

```typescript
const AuthPage = lazy(() => import('./pages/AuthPage'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
```

Le composant `LazyPage` fournit un fallback spinner accessible (`role="status"` `aria-label="Chargement"`).

### 19.2 Dependances

| Dependance      | Usage                                | Justification                                                           |
| --------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| `motion/react`  | Transitions AuthPage                 | Animations fluides signup/login/verify/onboarding : essentiel pour l'UX |
| `lucide-react`  | Icones Eye, EyeOff, ArrowLeft, Check | Tree-shakable, pas d'import global                                      |
| `react-i18next` | Traductions FR/EN                    | Pilier i18n du projet                                                   |

Aucune dependance superflue : les animations de cartes sont en CSS pur (Tailwind).

### 19.3 Images

La photo hero auth (`mission-observer.png`) :

- TODO : convertir en WebP/AVIF pour reduire le poids
- Dimensions explicites a definir (`width` et `height` sur l'`<img>`)
- Lazy loading non necessaire (above-the-fold sur la page auth)

### 19.4 Validation sans JavaScript server-round-trip

La validation du format username est instantanee (regex + liste memoire) et ne necessite pas d'appel reseau. L'appel Supabase (disponibilite) n'est declenche qu'avec un debounce de 800ms apres que le format est valide. Cela minimise les appels inutiles.

### 19.5 OTP en memoire (mode demo)

`otpStore` est une `Map` legere en memoire. Elle est automatiquement purgee :

- Apres validation reussie (usage unique)
- A la verification de disponibilite si expiration detectee

Aucune fuite memoire possible (la map est bornee par le nombre d'emails en attente de verification).

---

## 20. Inventaire composants

### 20.1 Composants existants : Auth (`src/components/auth/`)

| Composant                     | Description                                          | Lignes |
| ----------------------------- | ---------------------------------------------------- | ------ |
| `AuthPage.tsx` (`src/pages/`) | Orchestrateur principal : gere les 4 modes           | ~180   |
| `SignupForm.tsx`              | Formulaire inscription email + boutons sociaux       | ~160   |
| `LoginForm.tsx`               | Formulaire connexion email + mdp + toggle + checkbox | ~265   |
| `VerificationForm.tsx`        | Saisie OTP 6 cases + timer + resend + hint demo      | ~220   |
| `AuthInput.tsx`               | Input reutilisable avec label + helper + error       | ~80    |
| `AuthButton.tsx`              | Bouton pill primary/secondary + spinner loading      | ~55    |
| `SocialButton.tsx`            | Bouton provider social (Google, Apple, Facebook)     | ~50    |
| `AuthHeroPhoto.tsx`           | Colonne photo hero + credit photographe              | ~110   |
| `AuthPatterns.tsx`            | SVG decoratif fond desktop                           | ~90    |
| `Logo.tsx`                    | Logo Naturegraph + lien vers landing                 | ~30    |
| `index.ts`                    | Re-exports                                           | ~10    |

### 20.2 Composants existants : Onboarding (`src/components/onboarding/`)

| Composant                 | Description                                              | Lignes |
| ------------------------- | -------------------------------------------------------- | ------ |
| `index.tsx`               | Orchestrateur 4 etapes + OnboardingExitModal             | ~180   |
| `OnboardingInterests.tsx` | Etape 1 : grille 9 categories, multi-select max 3        | ~190   |
| `OnboardingStep2.tsx`     | Etape 2 : frequence, 4 options radio custom              | ~197   |
| `OnboardingStep3.tsx`     | Etape 3 : motivations, multi-select libre                | ~182   |
| `OnboardingStep4.tsx`     | Etape 4 : username + validation + 434 mots bannis        | ~700   |
| `OnboardingExitModal.tsx` | Modal de sortie + focus trap complet                     | ~160   |
| `OnboardingButton.tsx`    | Bouton reutilisable onboarding (primary/secondary/ghost) | ~60    |

### 20.3 Pages existantes

| Page             | Route               | Description                                                                               |
| ---------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| `AuthPage.tsx`   | `/signup`, `/login` | Orchestrateur avec AnimatePresence                                                        |
| `Onboarding.tsx` | `/onboarding`       | Version standalone (fallback) : 3 etapes (interests/frequency/username, sans motivations) |

**Note importante** : Il existe deux implementations de l'onboarding en parallel :

1. `src/pages/Onboarding.tsx` : version standalone accessible via `/onboarding` : 3 etapes (sans l'etape motivations)
2. `src/components/onboarding/index.tsx` : version integree dans `AuthPage` : 4 etapes completes

La version `components/onboarding` est la **version cible** (4 etapes). La page standalone est un fallback pour les acces directs. TODO : aligner les deux implementations.

### 20.4 Composants a creer

| Composant            | Description                                                           | Priorite                  |
| -------------------- | --------------------------------------------------------------------- | ------------------------- |
| `ResetPasswordForm`  | Formulaire reinitialisation mot de passe (cles i18n presentes)        | Moyenne                   |
| `AuthCallback` page  | Gerer le retour OAuth apres social login                              | Haute (pour social login) |
| `OnboardingProgress` | Composant barre de progression reutilisable (factoriser des 4 etapes) | Basse (refactoring)       |

---

## 21. TODO Backend

### 21.1 Supabase Auth : Configuration

| Item                   | Description                                                              | Priorite |
| ---------------------- | ------------------------------------------------------------------------ | -------- |
| Variables d'env        | Configurer `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` en production | Critique |
| OTP TTL                | Configurer le TTL des OTP Supabase a 2 minutes (identique au mode demo)  | Haute    |
| Email template         | Personnaliser le template d'email OTP avec la charte Naturegraph         | Moyenne  |
| Social providers       | Configurer Google, Apple, Facebook dans Supabase Auth > Providers        | Haute    |
| Apple Sign In          | Necessite Apple Developer account ($99/an)                               | Basse    |
| Rate limiting          | Configurer les regles de rate limiting OTP dans Supabase Auth            | Haute    |
| `signInWithOAuth`      | Implementer `signInWithSocial()` avec `supabase.auth.signInWithOAuth()`  | Haute    |
| Route `/auth/callback` | Creer la page callback OAuth pour capturer le token de retour            | Haute    |
| `rememberMe`           | Passer `options.persistSession` dans `signInWithPassword`                | Moyenne  |

### 21.2 Supabase DB : Schema

| Item                              | Description                                                        | Priorite |
| --------------------------------- | ------------------------------------------------------------------ | -------- |
| `profiles.notification_frequency` | Ajouter colonne ENUM pour la frequence choisie a l'etape 2         | Haute    |
| `profiles.motivations`            | Ajouter colonne `TEXT[]` pour les motivations de l'etape 3         | Haute    |
| `banned_usernames` table          | Table avec RLS read-only : remplacer la liste statique             | Haute    |
| Contrainte `interests`            | Limiter `profiles.interests` a max 3 elements cote DB              | Moyenne  |
| `notification_settings` table     | Preferences notifications par utilisateur (push, email, frequence) | Moyenne  |
| `community_photos` table          | Photos hero dynamiques : rotation mensuelle avec flag `is_active`  | Basse    |
| `profiles` RLS                    | Verifier les politiques RLS sur la table profiles                  | Critique |

### 21.3 Supabase DB : Triggers

| Item                        | Description                                                     | Priorite |
| --------------------------- | --------------------------------------------------------------- | -------- |
| Validation username trigger | Trigger PostgreSQL qui revalide le username avant INSERT/UPDATE | Haute    |
| `last_login_at` trigger     | Mettre a jour `profiles.last_login_at` a chaque connexion       | Moyenne  |
| Profile auto-creation       | Trigger qui cree un profil minimal apres `auth.users` insertion | Haute    |

### 21.4 Rate limiting cote serveur

Le rate limiting actuel est uniquement cote client (refs non-reactive). Implementer cote serveur :

- Supabase Edge Functions pour intercepter les appels OTP
- Ou regles de rate limiting dans Supabase Auth
- Ou service externe (Upstash, etc.)

### 21.5 Photo hero communautaire

La photo hero est actuellement un asset statique (`mission-observer.png`) :

- Creer table `community_photos` avec `is_active`, `photographer_name`, `instagram_url`, `consent_verified`
- Remplacer la config statique dans `AuthHeroPhoto.tsx` par une requete Supabase
- Ajouter un champ `consent_verified` : ne pas afficher sans consentement explicite du photographe

---

## 22. Roadmap d'implementation

### Sprint 1 : Foundation (complete)

| Item                                                  | Statut   |
| ----------------------------------------------------- | -------- |
| AuthPage unifiee (4 modes avec AnimatePresence)       | ✅ Livre |
| SignupForm avec OTP                                   | ✅ Livre |
| LoginForm avec mot de passe + toggle                  | ✅ Livre |
| VerificationForm 6 cases + timer                      | ✅ Livre |
| DemoAuthProvider (OTP en memoire)                     | ✅ Livre |
| Onboarding 4 etapes (components/onboarding)           | ✅ Livre |
| OnboardingExitModal avec focus trap                   | ✅ Livre |
| Validation username (format + mots bannis + Supabase) | ✅ Livre |
| i18n FR + EN complet                                  | ✅ Livre |
| Guard PublicRoute / ProtectedRoute                    | ✅ Livre |

### Sprint 2 : Polish & Accessibilite

| Item                                                                      | Statut | Priorite |
| ------------------------------------------------------------------------- | ------ | -------- |
| Aligner Onboarding.tsx (standalone) avec components/onboarding (4 etapes) | TODO   | Haute    |
| Convertir photo hero en WebP/AVIF                                         | TODO   | Haute    |
| Ajouter `aria-live` sur les changements d'etape onboarding                | TODO   | Haute    |
| Verifier attribut `lang` sur `<html>`                                     | TODO   | Haute    |
| Ajouter dimensions sur `<img>` photo hero                                 | TODO   | Moyenne  |
| Conditionner les animations AuthPage sur prefers-reduced-motion           | TODO   | Moyenne  |
| Cles i18n manquantes (voir section 17.3)                                  | TODO   | Moyenne  |

### Sprint 3 : Backend Supabase

| Item                                                     | Statut | Priorite |
| -------------------------------------------------------- | ------ | -------- |
| Configurer Supabase en production                        | TODO   | Critique |
| Schema DB : `notification_frequency`, `motivations`      | TODO   | Haute    |
| Table `banned_usernames` + RLS                           | TODO   | Haute    |
| Trigger creation profil auto apres inscription           | TODO   | Haute    |
| Route `/auth/callback` OAuth                             | TODO   | Haute    |
| Implementer `signInWithSocial` (Google, Apple, Facebook) | TODO   | Haute    |
| Rate limiting serveur OTP                                | TODO   | Haute    |
| Photo hero communautaire dynamique                       | TODO   | Basse    |

### Sprint 4 : Features additionnelles

| Item                                                    | Statut | Priorite |
| ------------------------------------------------------- | ------ | -------- |
| Page "Mot de passe oublie ?"                            | TODO   | Moyenne  |
| Composant `ResetPasswordForm`                           | TODO   | Moyenne  |
| Notification push setup (preferences issues onboarding) | TODO   | Moyenne  |
| Dark mode pour les ecrans auth                          | TODO   | Basse    |
| Tests E2E flow complet (Playwright)                     | TODO   | Haute    |

---

## Annexe A : Design tokens reference

### Couleurs cles du flow auth/onboarding

| Token                 | Valeur                    | Usage                                              |
| --------------------- | ------------------------- | -------------------------------------------------- |
| `--color-primary`     | Violet Naturegraph        | CTA primaires, ring focus, barres progression      |
| `bg-teal-dark`        | Vert fonce                | Fond desktop auth, badges "Profil", barres actives |
| `bg-off-white`        | Blanc casse               | Fond formulaires, cartes, inputs                   |
| `bg-warm-beige`       | Beige chaud               | Fond onboarding                                    |
| `bg-primary-light`    | Violet clair (primary/10) | Cartes selectionnees (interets, options)           |
| `text-foreground`     | Noir principal            | Titres, labels                                     |
| `text-text-dark`      | Gris fonce                | Descriptions, helpers                              |
| `text-text-light`     | Blanc                     | Texte sur fonds sombres (badge teal)               |
| `border-border`       | Gris clair                | Bordures par defaut                                |
| `--color-destructive` | Rouge                     | Erreurs, username invalide                         |

### Typographie

| Element                  | Font      | Style                   |
| ------------------------ | --------- | ----------------------- |
| `<h2>` formulaires auth  | Quicksand | Bold, taille H2         |
| `<h3>` etapes onboarding | Quicksand | Bold, taille H3         |
| Labels, body             | Mulish    | Regular/Medium          |
| Titres options frequence | Quicksand | Bold (via style inline) |
| Helper texte italic      | Mulish    | Italic                  |

### Rayons de bordure

| Token Tailwind   | Usage                                      |
| ---------------- | ------------------------------------------ |
| `rounded-button` | Inputs, badges, boutons pill               |
| `rounded-card`   | Cards, modal exit                          |
| `rounded-[32px]` | Card auth principale (desktop)             |
| `rounded-xl`     | Cases OTP, inputs username conteneur       |
| `rounded-full`   | Bouton fermer onboarding, indicateur radio |

### Espacements

| Context                         | Valeur         |
| ------------------------------- | -------------- |
| Padding card formulaire desktop | `p-16` (64px)  |
| Padding card formulaire mobile  | `p-6` (24px)   |
| Gap entre sections formulaire   | `gap-8` (32px) |
| Padding onboarding desktop      | `p-8` (32px)   |
| Padding onboarding mobile       | `p-6` (24px)   |
| Gap entre elements onboarding   | `gap-8` (32px) |
| Min-height etapes onboarding    | `730px`        |

---

## Annexe B : Etats de l'AuthContext

### Matrice des etats

| Etat                                    | user     | session | profile                     | isAuthenticated | onboardingCompleted |
| --------------------------------------- | -------- | ------- | --------------------------- | --------------- | ------------------- |
| Non connecte                            | null     | null    | null                        | false           | false               |
| En cours de connexion (loading)         | null     | null    | null                        | false           | false               |
| Authentifie, onboarding non fait        | User     | Session | null                        | true            | false               |
| Authentifie, onboarding complet         | User     | Session | Profile (avec username)     | true            | true                |
| Mode demo, OTP valide, avant onboarding | DemoUser | null    | null                        | true            | false               |
| Mode demo, onboarding complet           | DemoUser | null    | DemoProfile (avec username) | true            | true                |

### Transitions d'etat

```
[Non connecte]
  → signUp() → [Non connecte] (OTP envoye, pas de session)
  → verifyOtp() success → [Authentifie, onboarding non fait]

[Authentifie, onboarding non fait]
  → completeOnboarding() → [Authentifie, onboarding complet]
  → signOut() → [Non connecte]

[Authentifie, onboarding complet]
  → signOut() → [Non connecte]
  → refreshProfile() → [Authentifie, onboarding complet] (profil mis a jour)
```

---

## Changelog

| Version | Date       | Auteur           | Modifications                                            |
| ------- | ---------- | ---------------- | -------------------------------------------------------- |
| 1.0     | 2026-04-01 | Nicolas + Claude | Creation initiale : couverture complete du flow existant |

---

> Fichier genere automatiquement depuis le code source existant.
> Source de verite : `src/components/auth/`, `src/components/onboarding/`, `src/pages/AuthPage.tsx`, `src/lib/demoAuth.ts`, `src/contexts/AuthContext.tsx`
> Node IDs Figma : section `6381:67389` : Onboarding Web App Light
