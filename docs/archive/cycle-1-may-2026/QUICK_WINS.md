# Naturegraph — Quick Wins exhaustifs

> **Version** : 1.0 — 2026-05-04
> **Statut** : 📌 Document COMPLÉMENTAIRE au MASTER_TODO.md
> **Posture** : staff engineer + UX designer. Identification fine des micro-tâches qui font la qualité perçue.
> **Lecture cible** : 10 min pour absorber, à utiliser comme "to-do du jour"
> **Usage** : cocher au fur et à mesure, idéal pour les jours sans gros chantier

---

## 📌 Pourquoi un document dédié aux Quick Wins ?

Les quick wins (< 2h chacun) sont souvent **les plus impactants** pour :

- **Qualité perçue** par l'utilisateur (cohérence UX, feedback visuel, etc.)
- **Réduction dette UX** silencieuse (bugs micro, incohérences)
- **Stabilité des flows** (edge cases non couverts)
- **Cohérence globale** du MVP

Ils ne doivent **JAMAIS être oubliés** sous prétexte qu'ils sont "petits".

---

# 🔴 QUICK WINS CRITIQUES

> **Impact majeur, effort < 1h chacun, à faire EN PREMIER**.

## QW-C1 — Régénérer types Supabase

- **Description** : Régénérer `src/types/supabase.ts` (inclut `posts_public.title` + `display_format` + tables récentes)
- **Impact** : 🔴 Élimine drift TS↔DB, fondation pour fix les 22 casts `as unknown as`
- **Effort** : 30 min
- **Fichier(s)** : `src/types/supabase.ts`
- **Commande** : `npx supabase gen types typescript --project-id hrxgduvworofnrjmgpcj > src/types/supabase.ts`
- **Risque** : Peut révéler des erreurs TS dans composants (fixer progressivement)
- **Priorité réelle** : 🔴 P0
- **Dépendances** : Aucune
- **Lié à** : T-001 (MASTER_TODO)

## QW-C2 — CI sur push staging

- **Description** : Étendre triggers `.github/workflows/ci.yml` pour inclure staging
- **Impact** : 🔴 Détecte régressions UAT avant prod (actuellement aveugle)
- **Effort** : 30 min
- **Fichier(s)** : `.github/workflows/ci.yml`
- **Modif** : `branches: [develop, staging, main]` dans `on.push` et `on.pull_request`
- **Risque** : Aucun
- **Priorité réelle** : 🔴 P0
- **Lié à** : T-006

## QW-C3 — Désactiver merge_commit + rebase_merge GitHub

- **Description** : Forcer squash partout (déjà la pratique mais GitHub UI permet autre chose)
- **Impact** : 🔴 Cohérence stratégie merge garantie côté UI
- **Effort** : 5 min
- **Fichier(s)** : GitHub Settings → Pull Requests
- **Action** : Décocher "Allow merge commits" + "Allow rebase merging"
- **Risque** : Aucun
- **Priorité réelle** : 🔴 P0
- **Lié à** : T-042

## QW-C4 — `@types/leaflet` vers devDependencies

- **Description** : Type definitions ne devraient pas être dans `dependencies`
- **Impact** : 🟠 Cohérence package.json + petit gain bundle (négligeable mais propre)
- **Effort** : 5 min
- **Fichier(s)** : `package.json`
- **Commande** : `npm uninstall @types/leaflet && npm install -D @types/leaflet`
- **Risque** : Aucun
- **Priorité réelle** : 🔴 P0 (cohérence)
- **Lié à** : T-090

## QW-C5 — Fix 16 warnings ESLint react-refresh

- **Description** : Composants qui exportent constants en plus de components (Fast Refresh cassé)
- **Impact** : 🟠 Fast Refresh fonctionne, DX dev améliorée
- **Effort** : 30 min - 1h (selon refacto exports)
- **Fichier(s)** : 16 fichiers identifiés par eslint (contexts/, services/, etc.)
- **Action** : Séparer exports constants dans fichiers dédiés
- **Risque** : Imports à updater dans usages
- **Priorité réelle** : 🟠 P1
- **Lié à** : T-092

---

# 🟠 QUICK WINS IMPORTANTS

> **Améliorations UX/UI/maintenabilité rapides, < 2h chacun**.

## Performance

### QW-I1 — Throttle Hero mouse tracking 30fps

- **Description** : `Landing/Hero.tsx:180` track 60fps sans throttle → batterie/CPU mobile
- **Impact** : 🟠 UX mobile + batterie + CPU bas de gamme
- **Effort** : 30 min
- **Fichier(s)** : `src/pages/Landing/Hero.tsx`
- **Solution** : `requestAnimationFrame` ou lodash.throttle
- **Lié à** : T-074

### QW-I2 — Lazy import StatsSidebar mobile

- **Description** : 311 lignes chargées même sur mobile où jamais affichée
- **Impact** : 🟠 -2 KB bundle mobile, LCP mobile -100ms
- **Effort** : 1h
- **Fichier(s)** : `src/components/home/StatsSidebar.tsx` + usage Home
- **Solution** : `lazy()` + conditional render via media query
- **Lié à** : T-082

### QW-I3 — Tree-shake lucide-react

- **Description** : Imports `lucide-react` peuvent être tree-shaked plus agressivement
- **Impact** : 🟠 -8 KB bundle
- **Effort** : 2h
- **Fichier(s)** : Audit tous les imports lucide-react, vérifier `import { Icon }` (pas `import * as`)
- **Solution** : Vite config + audit imports
- **Lié à** : T-083

### QW-I4 — Compression image client avatars/banners

- **Description** : `compressPhoto.ts` existe déjà mais pas utilisé pour avatars/banners
- **Impact** : 🟠 -50% upload size pour avatars (gain UX upload + storage)
- **Effort** : 2h
- **Fichier(s)** : `src/services/mediaService.ts`, `src/services/storageService.ts`
- **Solution** : Appliquer `compressPhoto()` avant stripImageExif dans uploadAvatar
- **Lié à** : T-075

### QW-I5 — Lazy load useFollowers/useFollowing (tab Communauté)

- **Description** : Les 2 hooks fire en parallèle même si tab Communauté pas actif
- **Impact** : 🟠 -2 requêtes inutiles à chaque visite profil
- **Effort** : 1h
- **Fichier(s)** : `src/components/profile/tabs/ProfileCommunity.tsx`
- **Solution** : `enabled: tabActive` sur les hooks
- **Lié à** : T-079

## UI / UX

### QW-I6 — Badge "Bientôt" Statistiques profil

- **Description** : Onglet Stats accessible mais empty/non implémenté → confusion
- **Impact** : 🟠 Clarté UX, évite frustration utilisateur
- **Effort** : 1h
- **Fichier(s)** : `src/components/profile/ProfileTabs.tsx:73`
- **Solution** : Badge `<Tag>Bientôt</Tag>` sur onglet
- **Lié à** : T-098

### QW-I7 — Spinner pendant uploads photo

- **Description** : Pas d'indicateur visuel pendant upload → "ça marche pas"
- **Impact** : 🟠 Élimine la confusion "pourquoi rien ne se passe"
- **Effort** : 2h
- **Fichier(s)** : `src/components/contribute/ContributeEncounterForm.tsx`
- **Solution** : Réutiliser `uploadProgress` state existant + UI overlay
- **Lié à** : T-023

### QW-I8 — Skeleton sur feed (vs Spinner)

- **Description** : Loading actuel = Spinner, plus moderne = Skeleton
- **Impact** : 🟠 Cohérence DS (Settings utilise déjà Skeleton)
- **Effort** : 4h
- **Fichier(s)** : `src/components/home/FeedSection.tsx`, `src/components/ui/Skeleton.tsx`
- **Solution** : Skeleton cards adaptées au format FeedPost
- **Lié à** : T-021

### QW-I9 — Indicateur progression onboarding

- **Description** : 4 étapes sans feedback visuel → abandons
- **Impact** : 🟠 Réduction taux abandon onboarding
- **Effort** : 4h
- **Fichier(s)** : `src/components/onboarding/index.tsx`, `src/components/ui/StepIndicator.tsx`
- **Solution** : `<StepIndicator currentStep={step} totalSteps={4} />`
- **Lié à** : T-022

## Code quality

### QW-I10 — Helper requireSupabase()

- **Description** : 26 occurrences `if (!supabase) throw` → 1 helper centralisé
- **Impact** : 🟠 DRY + maintenance + erreur cohérente
- **Effort** : 4h (création + migration usages)
- **Fichier(s)** : Nouveau `src/lib/requireSupabase.ts` + 26 fichiers services/
- **Lié à** : T-004

### QW-I11 — Hook useRequiredUser()

- **Description** : 46 occurrences `getCurrentUser()` pattern → 1 hook
- **Impact** : 🟠 DRY + pattern uniforme + types stricts
- **Effort** : 4h (création + migration)
- **Fichier(s)** : Nouveau `src/hooks/useRequiredUser.ts` + 46 usages
- **Lié à** : T-005

### QW-I12 — Convention TODOs documentée + appliquée

- **Description** : 56 TODOs dispersés sans format → impossible à tracker
- **Impact** : 🟠 Dette visible et trackée
- **Effort** : 1h (script find/replace + revue manuelle)
- **Fichier(s)** : Tous les fichiers avec TODO
- **Solution** : Convention `TODO(YYYY-MM-DD, owner, #issue): description`
- **Lié à** : T-072

---

# 🟡 QUICK WINS CONFORT

> **Petites améliorations non urgentes, < 30 min chacun**.

## A11Y micro-fixes

### QW-A1 — Onboarding multi-select role="group"

- **Description** : Step Interests sans `role="group"` ni `aria-pressed`
- **Impact** : 🟡 WCAG AA conformité
- **Effort** : 1h
- **Fichier(s)** : `src/components/onboarding/OnboardingInterests.tsx`
- **Lié à** : T-053

### QW-A2 — OTP form aria-label + autocomplete

- **Description** : 6 inputs OTP sans `aria-label` ni `autocomplete="one-time-code"`
- **Impact** : 🟡 Lecteurs d'écran + iOS auto-fill
- **Effort** : 1h
- **Fichier(s)** : `src/components/auth/VerificationForm.tsx`
- **Lié à** : T-054

### QW-A3 — OTP timer aria-live

- **Description** : Compteur dégressif non annoncé
- **Impact** : 🟡 Lecteurs d'écran
- **Effort** : 30 min
- **Fichier(s)** : `src/components/auth/VerificationForm.tsx`
- **Lié à** : T-055

### QW-A4 — FAQ accordion aria-expanded

- **Description** : Accordion sans `aria-expanded` toggle
- **Impact** : 🟡 A11Y
- **Effort** : 30 min
- **Fichier(s)** : `src/pages/Landing/FAQ.tsx`
- **Lié à** : T-056

### QW-A5 — Burger menu mobile aria-label

- **Description** : Bouton menu sans label
- **Impact** : 🟡 A11Y
- **Effort** : 15 min
- **Fichier(s)** : `src/pages/Landing/Navbar.tsx:65`
- **Lié à** : T-057

### QW-A6 — Step indicator aria-current="step"

- **Description** : Onboarding step non annoncé comme "current"
- **Impact** : 🟡 A11Y
- **Effort** : 30 min
- **Fichier(s)** : `src/components/onboarding/index.tsx`
- **Lié à** : T-059

## Code propre

### QW-CL1 — 26 alt="" vides → texte significatif ou alt=""+aria-hidden

- **Description** : Audit toutes les images, soit alt descriptif soit `alt="" aria-hidden="true"`
- **Impact** : 🟡 A11Y + SEO
- **Effort** : 1h
- **Fichier(s)** : 26 occurrences `alt=""`
- **Action** : Décider décoratif ou informatif pour chaque

### QW-CL2 — 31 console.log/warn/error → debugLog standardisé

- **Description** : Remplacer les `console.log/warn` par `debugLog` (créé en RC-E)
- **Impact** : 🟡 Pas de pollution console en prod
- **Effort** : 1h
- **Fichier(s)** : 31 fichiers identifiés par grep
- **Note** : Garder `console.error` pour errors fatales (sentry catch)

### QW-CL3 — Vérifier `dist/` supprimé du disque

- **Description** : Build artifact gitignoré mais peut traîner en local
- **Impact** : ⚪ Disque + perf IDE
- **Effort** : 5 sec
- **Commande** : `rm -rf dist/`

### QW-CL4 — Vérifier `naturegraph-make/` supprimé du disque

- **Description** : Idem
- **Impact** : ⚪
- **Effort** : 5 sec
- **Commande** : `rm -rf naturegraph-make/`

## UX cosmétique

### QW-UX1 — Page title dynamique par route

- **Description** : 0 page n'utilise `document.title` ou Helmet → toujours "Naturegraph"
- **Impact** : 🟡 SEO + UX navigation onglets
- **Effort** : 1h
- **Fichier(s)** : Créer hook `usePageTitle()` + apply sur 13 pages
- **Solution** : React Helmet OU hook custom

### QW-UX2 — Favicon + apple-touch-icon multi-sizes

- **Description** : Vérifier toutes tailles favicon (16, 32, 48, 192, 512)
- **Impact** : 🟡 Affichage sur multiples device
- **Effort** : 30 min
- **Fichier(s)** : `public/`, `index.html`

### QW-UX3 — Toast feedback on logout

- **Description** : Logout sans confirmation visuelle
- **Impact** : 🟡 UX feedback
- **Effort** : 15 min
- **Fichier(s)** : Settings logout button
- **Solution** : `useToast` après signOut

### QW-UX4 — Profile copy link feedback visuel

- **Description** : Vérifier feedback "Lien copié !" sur Profile share
- **Impact** : 🟡 UX feedback
- **Effort** : 15 min
- **Fichier(s)** : Profile share menu

### QW-UX5 — Notification badge mark-as-read on open

- **Description** : Badge count doit décrementer quand notifs lues
- **Impact** : 🟡 UX
- **Effort** : 30 min
- **Fichier(s)** : `NotificationsPanel.tsx`
- **Vérifier** : RPC mark_notifications_read appelée à l'ouverture

### QW-UX6 — Form submit prevent double-click

- **Description** : Vérifier `isSubmitting` désactive le bouton submit
- **Impact** : 🟡 Évite doublons posts
- **Effort** : 15 min (audit)
- **Fichier(s)** : `ContributeEncounterForm.tsx`, `OnboardingStep4.tsx`

### QW-UX7 — OnboardingExitModal fonctionne

- **Description** : Vérifier que la modal d'exit confirme bien avant quit
- **Impact** : 🟡 Évite perte de saisie
- **Effort** : 15 min (audit)
- **Fichier(s)** : `OnboardingExitModal.tsx`

### QW-UX8 — Hover states cohérents sur boutons

- **Description** : Audit `hover:` sur tous les buttons
- **Impact** : 🟡 UX feedback uniforme
- **Effort** : 1h (audit + fix)

### QW-UX9 — Cursor: pointer manquants

- **Description** : 29 occurrences `cursor-pointer` mais vérifier que tous les éléments cliquables l'ont
- **Impact** : 🟡 Affordance UX
- **Effort** : 30 min (audit grep onClick sans cursor-pointer)

### QW-UX10 — Disabled state visual

- **Description** : Audit `disabled:opacity-50` ou équivalent sur tous les buttons
- **Impact** : 🟡 UX feedback désactivation
- **Effort** : 30 min

### QW-UX11 — Lazy loading images vérifié partout

- **Description** : 25 occurrences `loading="lazy"`, vérifier toutes les images de feed/profile/landing
- **Impact** : 🟡 Perf + bande passante
- **Effort** : 30 min (audit)

### QW-UX12 — Mobile viewport tag

- **Description** : Vérifier `<meta name="viewport" content="width=device-width, initial-scale=1">`
- **Impact** : 🟡 Responsive mobile
- **Effort** : 5 min
- **Fichier(s)** : `index.html`

### QW-UX13 — Cookie banner z-index correct

- **Description** : Vérifier banner au-dessus du contenu mais pas au-dessus des modales
- **Impact** : 🟡 UX
- **Effort** : 15 min
- **Fichier(s)** : `src/components/layout/CookieBanner.tsx`

### QW-UX14 — Theme toggle persisted

- **Description** : Si dark mode toggle existe, vérifier localStorage
- **Impact** : 🟡 UX (préférence retenue)
- **Effort** : 15 min
- **Fichier(s)** : ThemeContext

### QW-UX15 — Search debounce delay approprié

- **Description** : Vérifier delay (300ms recommandé)
- **Impact** : 🟡 Perf serveur + UX (pas de spam de requêtes)
- **Effort** : 15 min
- **Fichier(s)** : `useSearch.ts` / `SearchPanel.tsx`

### QW-UX16 — Date format consistent i18n

- **Description** : "03/05/2026" partout en FR, "May 3, 2026" en EN
- **Impact** : 🟡 Cohérence i18n
- **Effort** : 30 min (audit)
- **Solution** : Utiliser `Intl.DateTimeFormat` ou date-fns avec locale

### QW-UX17 — Plural forms i18n

- **Description** : Vérifier `{{count}} non lues` pluralise correctement (0, 1, 2+)
- **Impact** : 🟡 i18n correct
- **Effort** : 30 min
- **Fichier(s)** : `fr.json`, `en.json` + composants

### QW-UX18 — 404 page stylée

- **Description** : Vérifier que `NotFound.tsx` est stylée et utile (lien retour home, etc.)
- **Impact** : 🟡 UX
- **Effort** : 1h
- **Fichier(s)** : `src/pages/NotFound.tsx`

### QW-UX19 — Empty states uniformes

- **Description** : Audit empty states feed/profile/notifs/search (créer EmptyState primitive d'abord)
- **Impact** : 🟡 Cohérence UX
- **Effort** : 1h (après QW-I8 EmptyState créée)
- **Dépendances** : T-017 (EmptyState component)

### QW-UX20 — Settings sidebar mobile responsive

- **Description** : Vérifier que Settings fonctionne bien sur mobile (sidebar collapse)
- **Impact** : 🟡 UX mobile
- **Effort** : 15 min (audit visuel)

### QW-UX21 — Privacy/Legal page mobile responsive

- **Description** : Vérifier que pages légales sont lisibles sur mobile
- **Impact** : 🟡 UX mobile + conformité légale
- **Effort** : 15 min (audit visuel)

### QW-UX22 — Auth page redirect after signup

- **Description** : Vérifier que après signup → onboarding (pas /home directement)
- **Impact** : 🟡 UX critical flow
- **Effort** : 15 min (audit code + test)

## Sécurité micro-tâches

### QW-S1 — `.env.example` à jour

- **Description** : Vérifier que toutes les vars utilisées sont documentées
- **Impact** : 🟡 Onboarding nouveau dev
- **Effort** : 15 min
- **Fichier(s)** : `.env.example`

### QW-S2 — Audit secrets `gh secret list`

- **Description** : Vérifier secrets GitHub à jour (Vercel, Supabase)
- **Impact** : 🟡 Sécurité
- **Effort** : 15 min
- **Note** : Hors code, action GitHub Settings

### QW-S3 — `dependabot.yml` activé

- **Description** : Activer security updates auto
- **Impact** : 🟡 Sécurité deps
- **Effort** : 15 min
- **Lié à** : T-040

## Docs micro-fixes

### QW-D1 — README root project enrichi

- **Description** : Ajouter badges CI, license, tech stack, screenshot
- **Impact** : 🟡 First impression repo
- **Effort** : 1h
- **Fichier(s)** : `README.md` (root)

### QW-D2 — Documenter scripts npm

- **Description** : Section `## Scripts` dans README expliquant `npm run dev`, `npm run build`, etc.
- **Impact** : 🟡 Onboarding dev
- **Effort** : 30 min

### QW-D3 — Mettre à jour `EPIC_LOCALIZATION.md` chemins

- **Description** : Vérifier que les chemins post-cleanup sont à jour
- **Impact** : ⚪ Cosmétique
- **Effort** : 15 min

---

# 📊 Récapitulatif

| Catégorie     | Tâches            | Effort cumul | Priorité                  |
| ------------- | ----------------- | ------------ | ------------------------- |
| 🔴 Critiques  | 5                 | ~2h          | P0 — immédiat             |
| 🟠 Importants | 12                | ~25h         | P1 — semaine 1-2          |
| 🟡 Confort    | 30                | ~15h         | P2 — parallèle aux phases |
| **TOTAL**     | **47 quick wins** | **~42h**     | **~5j dev éparpillés**    |

## Effort par catégorie

| Catégorie     | Heures  |
| ------------- | ------- |
| Performance   | ~10h    |
| UI / UX       | ~12h    |
| A11Y          | ~5h     |
| Code quality  | ~6h     |
| Cleanup       | ~10 min |
| UX cosmétique | ~10h    |
| Sécurité      | ~45 min |
| Docs          | ~2h     |

---

# 🎯 Ordre d'exécution recommandé

## Sprint Quick Wins 1 — Critiques (2h)

```
✅ QW-C1 — Régénérer types Supabase (30 min)
✅ QW-C2 — CI sur staging (30 min)
✅ QW-C3 — Désactiver merge_commit + rebase_merge (5 min)
✅ QW-C4 — @types/leaflet → devDeps (5 min)
✅ QW-C5 — Fix 16 warnings ESLint react-refresh (30 min)
```

## Sprint Quick Wins 2 — Performance immédiate (4h)

```
QW-I1 — Throttle Hero (30 min)
QW-I2 — Lazy StatsSidebar (1h)
QW-I3 — Tree-shake lucide (2h)
QW-I5 — Lazy useFollowers (1h)
```

## Sprint Quick Wins 3 — UX feedback (3h)

```
QW-I6 — Badge "Bientôt" Stats (1h)
QW-UX3 — Toast on logout (15 min)
QW-UX4 — Copy link feedback (15 min)
QW-UX6 — Form submit prevent double-click (15 min)
QW-UX12 — Mobile viewport tag (5 min)
QW-UX1 — Page title dynamique (1h)
```

## Sprint Quick Wins 4 — A11Y micro-fixes (4h)

```
QW-A1 à QW-A6 (A11Y WCAG AA points isolés)
QW-CL1 — alt="" audit
```

## Sprint Quick Wins 5 — Code propre (3h)

```
QW-CL2 — console.log → debugLog
QW-I12 — Convention TODOs
QW-I10 — Helper requireSupabase
QW-I11 — Hook useRequiredUser
```

---

# 🔁 Mise à jour de ce document

À chaque quick win complété :

1. Cocher dans la section concernée (ajout `[x] ✅ 2026-MM-DD`)
2. Référencer ID dans commit : `chore(ui): throttle Hero (QW-I1)`
3. Mettre à jour récapitulatif (Done count)

---

# 📎 Références croisées

- `docs/MASTER_TODO.md` — Tâches T-001 à T-105 (référencent les QW)
- `docs/NEXT_TASKS.md` — Checklist actionable (Q1-Q8 = sous-ensemble des QW)
- `docs/CONSOLIDATION_ROADMAP.md` — Plan 6 phases (QW intercalables)
- `docs/AUDIT_TECH_DEBT_GLOBAL.md` — Source quick wins perf (O-1 à O-7)
- `docs/AUDIT_DESIGN_SYSTEM.md` — Source quick wins UI (INC-1 à INC-8)

---

**📌 Document complémentaire au MASTER_TODO. À ouvrir quand on a 30 min entre 2 tâches grosses pour avancer.**

**Convention commit** : `<type>(<scope>): <description> (QW-XXX)`
