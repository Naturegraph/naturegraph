# Naturegraph — Audit complet par flow (état réel produit)

> **Version** : 1.1 — 2026-05-02
> **Référentiel comparé** : `docs/USER_STORIES.md` v1.1
> **Méthodologie** : lecture du code (pas de modif), comparaison stricte aux user stories, posture QA senior bloquant un release.
> **Légende sévérité** : 🔴 critique (bloque release) · 🟠 grave (à fixer avant beta) · 🟡 moyen · 🔵 mineur · ℹ️ info

> **Changelog v1.1 (2026-05-02)** — 4 décisions produit MVP intégrées (cf. `PLAN_ACTION.md` §5) :
>
> - Q1 : description optionnelle → bloquant **C4 résolu par décision** (code déjà conforme)
> - Q2 : multi-observation retirée du MVP → écart "Bientôt" résolu par masquage UI
> - Q3 : boutons sociaux retirés du MVP → écart "stubs" résolu par masquage UI
> - Q4 : toggle "Aide à l'identification" + filtre feed retirés du MVP → écart résolu par masquage UI

---

## Synthèse exécutive

| Flow                | Conformité | Sévérité max | Bloquants                                                                 |
| ------------------- | ---------- | ------------ | ------------------------------------------------------------------------- |
| Landing             | 90 %       | 🟠           | A11Y FAQ accordion + burger menu                                          |
| Onboarding          | 60 %       | 🔴           | Motivations + frequency NON persistés                                     |
| Authentification    | 80 %       | 🟠           | Social login stubs, A11Y OTP form                                         |
| Home visiteur       | 85 %       | 🟡           | Panneaux Notif/Search ouverts en guest                                    |
| Home connecté       | 95 %       | 🔵           | OK                                                                        |
| Feed                | 75 %       | 🟠           | 5 types réactions vs 1 prévu, location_hidden côté front                  |
| Contribution        | 65 %       | 🔴           | Description NON requise (vs AC), HEIC mismatch                            |
| Upload images       | 70 %       | 🟠           | MIME mismatch entre form et service                                       |
| Profil              | 90 %       | 🟡           | statsService stubs, double empty state                                    |
| Modification profil | 90 %       | 🟡           | Focus trap incomplet à confirmer                                          |
| Paramètres          | 70 %       | 🔴           | Suppression compte sans double-confirm username, email change sans OTP UI |
| Notifications       | 95 %       | 🔵           | Empty state à confirmer                                                   |

**TOP 5 bloquants release** (post-décisions MVP — version v1.1) :

1. 🔴 **Onboarding** — `motivations` et `notification_frequency` ne sont **jamais sauvegardés** (`src/components/onboarding/index.tsx:88-105`, TODO explicite ligne 89-92)
2. 🔴 **Upload images** — `EncounterStep1` accepte `image/heic|heif` (`:57-58`), `mediaService` les rejette (`:14`) → upload échoue silencieusement (résolu par Quick Win QW1 : retirer HEIC du form)
3. 🔴 **Settings** — `DeleteAccountModal` n'a **pas de double confirmation par username** (vs AC US-SET-07) — simple bouton "Confirmer"
4. 🔴 **Settings** — `email change` ne gère pas l'écran OTP de confirmation (vs AC US-SET-02)
5. 🔴 **RGPD** — projection `lat/lng` quand `location_hidden=true` à auditer + EXIF non strippé avant upload (fuite GPS embarquée)

> **C4 (description requise) RETIRÉ du TOP 5** — décision Q1 : description optionnelle en MVP, le code actuel est conforme.

---

# Flow : Landing Page

### ✅ Conforme

- Sections présentes dans l'ordre (Hero, FeaturesCards, Values, ProductFeatures, CTABanner, Mission, Discord, FAQ, Partners, Footer)
- CTAs Connexion / Créer un compte fonctionnels
- FAQ accordéon implémenté
- 100 % statique, aucun appel Supabase

### ❌ Problèmes

- 🟠 **A11Y FAQ** : `aria-expanded` / `aria-controls` à confirmer sur les boutons (`pages/Landing/FAQ.tsx:39-55`)
- 🟠 **A11Y burger menu** : pas d'`aria-label` détecté (`Navbar.tsx:65`)
- 🟡 **Hero mouse tracking** : pas de throttle/RAF (`Hero.tsx:180`) → coût CPU élevé sur mobile

### ⚠️ Risques critiques

- Aucun. Page statique.

### ♿ Accessibilité

- Skip link à vérifier
- Contraste sur images Hero avec overlay non vérifié
- FAQ : ouvrir plusieurs items à la fois ou un seul ? Comportement non documenté

### 🌱 Éco

- ✅ Animations GPU (transform/opacity)
- ❌ Mouse tracking 60 fps sans throttle → batterie mobile
- À confirmer : WebP pour les images Hero

### 🔒 Non-régression

- Navbar responsive → tester breakpoints 360px / 768px / 1024px / 1440px
- Carrousel partenaires : pause sur hover/focus + `prefers-reduced-motion`

### 🔧 Backend gaps

- Aucun (page statique)

### 🧠 Recommandations

1. Ajouter `aria-expanded` + `aria-controls` à la FAQ (1 ligne par item)
2. Ajouter `aria-label="Ouvrir le menu"` au burger
3. Throttler le mouse tracking via `requestAnimationFrame` (optimisation 1 fichier)
4. Vérifier `prefers-reduced-motion` sur les orbs Hero

---

# Flow : Onboarding (4 étapes)

### ✅ Conforme

- 4 étapes présentes (`components/onboarding/index.tsx:45-195`)
- Multi-select intérêts, max 3 (`OnboardingInterests.tsx:27`)
- Fréquence radio (4 options) (`OnboardingStep2.tsx`)
- Username : debounce 800 ms + check unicité Supabase (`OnboardingStep4.tsx:496-543`)
- Banned usernames côté client (FR/EN/ES, ~436 entrées)
- Modal de sortie avec confirmation
- Opt-in `species_digest` aligné sur la fréquence (`index.tsx:120-126`)

### ❌ Problèmes

- 🔴 **`motivations` jamais persisté** — `userData.motivations` collecté mais l'`upsert` (`index.tsx:94-105`) ne le passe pas. TODO explicite ligne 89-92.
- 🔴 **`notification_frequency` jamais persisté** — même TODO. La colonne `user_settings.notif_frequency` existe (migration `20260502_settings_phase2_complete.sql`), mais l'onboarding ne l'écrit pas.
- 🟠 **Pas d'indicateur de progression** — l'utilisateur ne sait pas où il en est (3/4 ?)
- 🟡 **Pas de resume** — sortie en cours d'onboarding = perte du state (pas de `localStorage`)
- 🟡 **Banned-list maintenability** — 436 lignes en dur, à externaliser (DB ou edge function)

### ⚠️ Risques critiques

- 🔴 Données utilisateur **silencieusement perdues** (motivations, fréquence) → produit ment à l'utilisateur
- 🟠 Race condition username : check Supabase puis upsert plus tard → un autre user peut prendre le username entre-temps. Pas de `RETURNING` ni de `UNIQUE` violation explicitement gérée

### ♿ Accessibilité

- 🔴 Multi-select intérêts : pas de `role="group"` ni `aria-pressed` détecté
- 🔴 Steps : pas d'`aria-current="step"` → screen reader perd le contexte
- 🟡 Bouton "Continuer" disabled : `aria-disabled` à confirmer

### 🌱 Éco

- ✅ Debounce 800 ms (un peu long mais acceptable)
- ✅ Aucun appel réseau aux étapes 1-3 (state local)
- 🟡 Le check username déclenche 1 requête à chaque keystroke après debounce → pas de cache LRU

### 🔒 Non-régression

- Tester : onboarding complet → vérifier en DB que `interests` ET `motivations` ET `notif_frequency` sont écrits (cf. fix obligatoire)
- Tester : refresh page mid-onboarding → comportement attendu (forcer redémarrage ou resume ?)
- Tester : same username pris par 2 users en parallèle (race) → message d'erreur clair

### 🔧 Backend gaps

- 🔴 Étendre l'`upsert profiles` avec `motivations[]` (colonne à créer si absente)
- 🔴 Étendre l'écriture vers `user_settings.notif_frequency` (table déjà migrée)
- 🟠 Trigger Postgres sur `profiles.username` : SQL CHECK regex + UNIQUE constraint
- 🟡 Edge Function `check-username-availability` pour bypass RLS et accélérer le check

### 🧠 Recommandations

1. **PRIORITÉ #1** : compléter l'`upsert` final (10 lignes à ajouter)
2. Ajouter un step indicator visuel (progress bar 1/4 → 4/4) avec `aria-current`
3. Ajouter un toast clair si username pris au moment de l'upsert (vs preview)
4. Externaliser la banned list (table `banned_usernames` ou JSON mis en cache)

---

# Flow : Authentification (magic link OTP)

### ✅ Conforme

- Flow OTP signup + login (`AuthContext.tsx:205-481`)
- Email validation côté UI (`AuthForm.tsx`)
- VerificationForm 6 chiffres avec auto-advance + paste support (`VerificationForm.tsx:80-93`)
- Timer 2 min (`TIMER_SECONDS = 120`)
- Rate-limit OTP 30 s, signin 5 s
- Demo provider en fallback dev
- Session refresh auto 30 min

### ❌ Problèmes (post-décisions MVP)

- ✅ **Boutons sociaux Google/Apple/Facebook** — décision Q3 MVP : à masquer (Quick Win QW2). Magic link reste l'unique mode d'auth pour le MVP.
- 🟡 **Checkbox "Se souvenir de moi"** : présente UI mais état non persisté (`AuthForm.tsx:178-189`)
- 🟡 **OTP timeout 2 min** : si l'utilisateur ferme le navigateur, pas de resume → nouvelle demande obligatoire (UX confuse)

### ⚠️ Risques critiques

- 🟡 Accumulation de timers de refresh si l'user ouvre / ferme l'app souvent → vérifier cleanup `useEffect`
- ℹ️ Pas d'audit log pour les tentatives échouées (cf. `security_audit_log` existant mais inutilisé ici)

### ♿ Accessibilité

- 🔴 **Inputs OTP** : 6 `<input>` sans `aria-label`, sans `autocomplete="one-time-code"` à confirmer
- 🔴 **Timer countdown** : pas d'`aria-live="polite"` → screen reader ne lit pas l'expiration
- 🟠 Erreurs sans `aria-live` à confirmer

### 🌱 Éco

- ✅ Refresh 30 min raisonnable
- ✅ Pas de polling auth
- 🟡 Demo provider chargé côté client systématiquement (chunk supplémentaire) — pourrait être lazy-loaded

### 🔒 Non-régression

- Tester `signOut()` → cache React Query bien vidé
- Tester double-tab : 2 sessions ouvertes → cohérence de l'état
- Tester signup → upsert profile auto-créé en DB après onboarding (pas avant)

### 🔧 Backend gaps

- 🟠 Pas d'INSERT `security_audit_log` pour `signin` / `signout` / `signout_all_devices` (table créée mais non utilisée)
- 🟡 Pas de bouton "Se déconnecter de tous les appareils"

### 🧠 Recommandations

1. **Masquer les boutons sociaux** tant que pas implémentés OU les retirer du MVP
2. Ajouter `aria-label` sur chaque input OTP, `autocomplete="one-time-code"` sur le 1er
3. Ajouter `aria-live="polite"` sur le countdown
4. Logger les events auth dans `security_audit_log` (Edge Function ou trigger)

---

# Flow : Home — visiteur non connecté

### ✅ Conforme

- Navbar avec CTAs Connexion / Créer un compte
- GuestSidebar avec carte d'invitation
- FeedSection en mode lecture seule
- Onglet "Pour vous" → `ForYouDiscoveryModal` (`FeedSection.tsx:717`)

### ❌ Problèmes

- 🟠 **NotificationsPanel + SearchPanel ouvrables en mode guest** (`HomeNavbar.tsx:123-129`) — l'auth gate est sur "Contribuer" mais pas sur ces panneaux. Soit accepter (et adapter le contenu en mode guest), soit gater.
- 🟡 ProfileSidebar : à vérifier qu'aucune fuite de données d'un autre user n'est possible si `user_id` injecté côté URL (RLS suffisante normalement, à confirmer)

### ⚠️ Risques critiques

- 🟡 Si NotificationsPanel tente un fetch authentifié sans user → 401 silencieux ou crash ?

### ♿ Accessibilité

- 🟠 Skip link "Aller au feed" à vérifier
- 🟠 MobileBottomNav : `aria-label` à confirmer

### 🌱 Éco

- ✅ Pas de polling notifs en guest (pas de subscribe Realtime)
- ✅ Pagination 20 posts par défaut
- 🟡 StatsSidebar : déjà masquée mobile, mais le bundle inclut son code → lazy-loader

### 🔒 Non-régression

- Tester : visiteur clique sur "réagir" → modal "Connexion requise" s'affiche, AUCUN appel Supabase
- Tester : RLS sur `posts` → seuls `published + public` accessibles à `anon`

### 🔧 Backend gaps

- ℹ️ Aucun gap critique

### 🧠 Recommandations

1. Gater NotificationsPanel + SearchPanel en mode guest (afficher CTA d'inscription)
2. Ajouter un Sentry breadcrumb sur les tentatives de mutation en mode guest

---

# Flow : Home — utilisateur connecté

### ✅ Conforme

- Layout 3 colonnes desktop / 1 colonne mobile + bottom nav
- ProfileSidebar avec mon avatar
- StatsSidebar visible ≥ 1280px
- Feed personnalisé "Pour vous"
- Redirection forcée vers `/onboarding` si pas complété

### ❌ Problèmes

- ℹ️ Aucun écart majeur détecté

### ⚠️ Risques critiques

- 🟡 La logique `isOwnProfile` côté Profile (`Profile.tsx:104`) repose sur `authProfile && (!username || authProfile.username === username)` — robuste mais nécessite un test E2E

### ♿ Accessibilité

- ✅ Landmarks `<header>`, `<main>`, `<footer>`
- 🟡 MobileBottomNav `aria-label="Navigation principale"` à confirmer

### 🌱 Éco

- ✅ Avatar en cache React Query 5 min
- ✅ StatsSidebar masquée < 1280px

### 🔒 Non-régression

- Tester : refresh `/home` connecté → pas de re-fetch profile (cache)
- Tester : déconnexion → redirection landing

### 🔧 Backend gaps

- ℹ️ Aucun

### 🧠 Recommandations

- Aucune action urgente

---

# Flow : Feed — Tabs, filtres, interactions

### ✅ Conforme

- 3 onglets `recent` / `popular` / `for_you` avec gate guest sur `for_you`
- Filtres multi-catégories, radius, période (filtre "Aide à l'identification" à masquer en MVP — décision Q4, Quick Win QW6)
- Pagination 20 (`FeedSection.tsx:361`)
- Réactions optimistic UI avec rollback (`useToggleReaction`)
- Filtre radius par Haversine client-side (`useFeed.ts:90-107`)
- FilterChip avec `aria-pressed`
- Description tronquée à 2 lignes avec "Voir plus" (`FeedPost.tsx:243-255`)

### ❌ Problèmes

- 🟠 **5 types de réactions exposés** (`like`, `love`, `interesting`, `useful`, `funny`) (`FeedPost.tsx:127-133`) alors que l'AC US-FEED-03 ne mentionne que `like`. Soit l'AC est incomplète, soit c'est un overreach. **À aligner**.
- 🔴 **`location_hidden` côté front** : `postFeedItemToMockPost` (`FeedSection.tsx:121-219`) ne masque pas `lat/lng` quand `location_hidden=true` au niveau du payload UI. À VÉRIFIER si la projection RLS le fait, sinon **fuite de coordonnées** côté visiteur.
- 🟡 Filtre radius nécessite consentement de localisation : si refusé, comportement à confirmer (silencieux ou toast ?)

### ⚠️ Risques critiques

- 🔴 **Fuite de géolocalisation possible** si RLS ne masque pas `lat/lng` quand `location_hidden=true`
- 🟡 Réactions multiples (5 types) → modèle DB potentiellement non aligné si `reactions.type` est ENUM strict

### ♿ Accessibilité

- ✅ FilterChip `aria-pressed` correct
- ✅ Checkboxes `aria-checked`
- 🟡 Panneau filtres : focus trap à confirmer
- 🟡 Boutons icon-only (cœur, save, share) : `aria-label` à vérifier sur tous

### 🌱 Éco

- ✅ Pagination 20
- ✅ Cache React Query par combinaison filtres
- 🟡 `for_you` JOIN follows : à vérifier que l'index est en place côté `follows.follower_id`

### 🔒 Non-régression

- Tester : `location_hidden=true` côté DB → coords ABSENTES dans le payload visiteur (curl avec JWT autre user)
- Tester : pagination 20 stricte (pas de scroll infini introduit par mégarde)
- Tester : réaction → trigger PG met à jour `posts.likes_count`

### 🔧 Backend gaps

- 🔴 **Vérifier RLS / projection** sur `posts` pour masquer `lat/lng` quand `location_hidden=true` (ou utiliser une vue `posts_public`)
- 🟡 Ajouter index Postgres sur `posts(taxonomic_group, identification_status, published_at)` si manquant
- 🟡 Index sur `posts(user_id, created_at DESC)` pour `getPostsByUser`

### 🧠 Recommandations

1. **Auditer la projection lat/lng** quand `location_hidden=true` (priorité absolue, RGPD)
2. Aligner le nombre de types de réactions (1 ou 5) entre code, DB ENUM, et US
3. Ajouter aria-label aux boutons icon-only
4. Vérifier `EXPLAIN ANALYZE` sur le feed avec filtres combinés

---

# Flow : Création d'observation (Encounter)

### ✅ Conforme

- Step 1 : MAX_FILES=4, MAX_FILE_SIZE=10 MB, drag-drop, preview, format radio
- Step 2 : recherche TAXREF avec autocomplete
- Step 3 : champs date / time-of-day / weather / habitat / location autocomplete / visibility
- Privacy popover explique les règles location_hidden
- EXIF auto-collapse les options avancées si valeurs détectées

### ❌ Problèmes (post-décisions MVP)

- 🔴 **HEIC/HEIF mismatch** : Step1 accepte (`EncounterStep1.tsx:57-58, 435`), `mediaService.ts:14` rejette → upload échoue silencieusement (Quick Win QW1 : retirer HEIC du form)
- ✅ **`description` optionnelle** — décision Q1 MVP : code actuel conforme, plus un problème
- ✅ **Multi-observation "Bientôt"** — décision Q2 MVP : à masquer (Quick Win QW6)
- ✅ **Toggle "Aide à l'identification"** — décision Q4 MVP : à confirmer masquage (Quick Win QW6)
- 🟡 Pas de feedback visuel pendant l'upload (spinner par image)
- 🟡 Pas de retry sur upload partiel : si 2/4 photos uploadent et la 3e fail, le user doit tout recommencer

### ⚠️ Risques critiques

- 🔴 **Upload HEIC échoue silencieusement** = users iOS bloqués (résolu par QW1)
- 🟠 Pas de transaction côté serveur pour `posts + media` → si l'INSERT post réussit mais que les media uploads ratent, on a un post sans photo

### ♿ Accessibilité

- 🟡 Drag-drop zone : à confirmer présence d'une alternative clavier (input file caché)
- 🟡 Stepper steps 1/2/3 : `aria-current="step"` à confirmer
- 🟡 Switch "Rendre public" : `role="switch"` + `aria-checked` à vérifier

### 🌱 Éco

- ✅ Validation côté client AVANT upload (économie bande passante)
- 🔴 **Compression côté client absente** (mediaService.ts:7-9 commentaire explicite "TODO sprint suivant") → users uploadent des originaux 10 MB
- 🟡 Pas de WebP conversion → poids ×2-3 vs WebP

### 🔒 Non-régression

- Tester : tentative upload HEIC → message d'erreur explicite (pas crash silencieux)
- Tester : `location_hidden=true` → ville masquée dans le feed
- Tester : INSERT post avec 0 photo → bloqué côté client
- Tester : 4 photos exactement → OK, 5e refusée

### 🔧 Backend gaps

- 🔴 **Implémenter conversion HEIC→JPEG côté client** (lib `heic2any`) OU rejeter HEIC en amont avec message clair
- 🔴 **Implémenter compression image côté client** (canvas, cible 2 MB / 1600px)
- 🟠 **Implémenter strip EXIF** (lib `piexif` ou `exifr`) — RGPD : les coordonnées GPS embarquées ne doivent pas fuiter via EXIF
- 🟠 Transaction RPC côté serveur pour création post atomique (`create_post_with_media`)

### 🧠 Recommandations

1. **PRIORITÉ #1** : décider si `description` est requise ou non. Si oui : remettre la validation (`if (form.description.trim() === '') errors.description = ...`). Si non : aligner l'AC US-CONTRIB-03.
2. **PRIORITÉ #2** : aligner les MIME entre Step1 et mediaService (soit ajouter HEIC, soit le retirer du form)
3. Implémenter compression client AVANT upload (gain 70-80 % de poids)
4. Strip EXIF avant upload (RGPD)
5. Spinner visuel par image pendant upload

---

# Flow : Upload images (max 4)

### ✅ Conforme

- MAX_FILES=4 strict
- MAX_POST_MEDIA_BYTES=10 MB
- Validation MIME côté client (mediaService:14)
- Buckets Supabase séparés (`avatars`, `banners`, `posts`)
- RLS user-prefix (cf. migration 20260502)

### ❌ Problèmes

- 🔴 **HEIC/HEIF mismatch entre form et service** (déjà mentionné)
- 🟠 **Pas de compression / WebP** côté client (`mediaService.ts:7-9`)
- 🟠 **Pas de strip EXIF** → fuite GPS possible via les métadonnées du fichier
- 🟡 Pas de retry automatique sur upload partiel
- 🟡 Avatars limite 2 MB — à valider que c'est cohérent avec la taille affichée (40px à 120px → 2 MB c'est trop large)

### ⚠️ Risques critiques

- 🔴 **Fuite GPS via EXIF non strippé** alors que l'utilisateur a coché "Région masquée" → contradiction RGPD majeure
- 🔴 **Users iOS bloqués** par HEIC

### ♿ Accessibilité

- 🟡 Bouton "Supprimer cette photo" : `aria-label` à vérifier sur la croix de chaque thumbnail

### 🌱 Éco

- 🔴 Originaux 10 MB envoyés au lieu de WebP compressés
- 🟠 Pas de variantes (thumbnail, medium, full) → on charge la full taille même pour les avatars 40px

### 🔒 Non-régression

- Tester : MIME `image/svg+xml` → refusé
- Tester : MIME `image/gif` → refusé
- Tester : taille 11 MB → refusé avec message clair
- Tester : RLS user-prefix → un user A ne peut pas écrire dans `posts/{user_B}/`

### 🔧 Backend gaps

- 🔴 Conversion HEIC client
- 🔴 Compression WebP client
- 🟠 Strip EXIF client
- 🟡 Génération de variantes (thumbnail) côté Edge Function ou trigger storage

### 🧠 Recommandations

1. Aligner les MIME en URGENCE
2. Implémenter compression + WebP avant fin du sprint
3. Strip EXIF systématique avant upload (RGPD)

---

# Flow : Profil — affichage owner / visiteur

### ✅ Conforme

- Routes `/profile` (owner) et `/profile/:username` (visiteur)
- ProfileHeader avec banner, avatar, username, bio, stats
- Boutons adaptés au mode (Modifier+Paramètres+Share owner / Migrer+Share+Options visiteur)
- ProfileTabs : 4 desktop / 5 mobile (avec "À propos")
- Onglet par défaut "Journal nature" (`ProfileTabs.tsx:94`)
- ProfileSkeleton avec `aria-busy="true"`
- Sécurité `isOwnProfile` rigoureuse
- Inspirations vide pour visiteur (RLS owner-only)

### ❌ Problèmes

- 🟡 **Empty state dupliqué** (`Profile.tsx:193-219` puis `:221-247`) — la 2e branche est code mort si la 1re a déjà capturé le cas
- 🟡 **statsService non implémenté** → `badges=[]`, `stats.species=0`, `stats.streak=0` (`Profile.tsx:61-66`) → onglet Statistiques affiche un placeholder "Bientôt"
- 🟡 ProfileDNACard avec `percent=0` pour tous les intérêts → affichage neutre (visuel à valider)

### ⚠️ Risques critiques

- 🟡 Si RLS `profiles.is_public=false` est ajoutée plus tard, l'empty state actuel ne distinguera pas "introuvable" vs "privé"

### ♿ Accessibilité

- ✅ ProfileSkeleton `aria-busy`
- 🟡 `<h1>` = username à confirmer
- 🟡 Bouton Migrer (TreeDeciduous) : `aria-label` correct (`profile.migrating` / `profile.migrer`)

### 🌱 Éco

- ✅ Tabs lazy : seul l'onglet actif fetch (Journal, Inspirations, Communauté)
- ✅ React Query staleTime 60s sur followers/following
- 🟡 `useFollowers` + `useFollowing` chargés en parallèle même si l'onglet n'est pas actif (`ProfileCommunity.tsx`) → optimisation possible

### 🔒 Non-régression

- Tester : visiteur sur profil owner → AUCUN bouton Modifier/Paramètres
- Tester : owner sur son profil → AUCUN bouton Migrer
- Tester : `/profile/inconnu` → empty state "Utilisateur introuvable"
- Tester : visiteur sur Communauté → liste followers visible (publique)

### 🔧 Backend gaps

- 🟡 statsService à implémenter (`stats.species` = COUNT DISTINCT taxref_id)
- 🟡 Badges (logique métier à définir)

### 🧠 Recommandations

1. Supprimer la branche dupliquée empty state (dead code)
2. Stub clair sur l'onglet Statistiques avec date prévue
3. Charger Communauté en lazy si onglet pas actif

---

# Flow : Modification du profil

### ✅ Conforme

- Modal `role="dialog"`, `aria-modal="true"`, ESC ferme
- 3 onglets Info / Préférences / Photos
- Footer sticky Sauvegarder (sauf onglet Photo en auto-save)
- Responsive : fullpage mobile / panneau 420 px droit desktop
- Sauvegarde via `useUpdateProfile` avec invalidation cache

### ❌ Problèmes

- 🟡 **Focus trap** : à confirmer que la dernière touche Tab ramène au premier élément (boucle complète)
- 🟡 Max 3 intérêts dans EditPrefsTab : implémentation à confirmer (mention en commentaire seulement)
- 🟡 EditPhotoTab auto-save : pas de confirmation visuelle entre upload et save sur `profiles`

### ⚠️ Risques critiques

- 🟡 Si l'upload avatar réussit mais l'UPDATE `profiles.avatar_url` échoue → orphelin dans le bucket
- 🟡 Bio max 160 chars : à confirmer côté DB CHECK constraint (sinon corruption possible si client bypassé)

### ♿ Accessibilité

- ✅ ARIA dialog
- 🟡 Compteur bio (160 chars) : `aria-live="polite"` à confirmer
- 🟡 Onglets : `role="tablist"` / `role="tab"` à confirmer

### 🌱 Éco

- ✅ Save unique (pas de auto-save sur chaque keystroke)
- 🟡 EditPhotoTab : auto-save → 1 mutation par changement (acceptable mais à mesurer)

### 🔒 Non-régression

- Tester : modifier username → autres users ne peuvent plus accéder via l'ancien
- Tester : annuler les modifs → state initial restauré
- Tester : upload avatar → image visible partout (cache invalidé)

### 🔧 Backend gaps

- 🟡 CHECK constraint `bio` ≤ 160 chars en DB
- 🟡 Validation URL Instagram/Twitter/Website en DB (regex ou Edge Function)

### 🧠 Recommandations

1. Confirmer le focus trap (test clavier manuel)
2. Toast explicite après auto-save photo
3. Ajouter `aria-live` sur le compteur bio

---

# Flow : Paramètres

### ✅ Conforme

- Sections Sécurité / Notifications / Aide / Licence / Danger Zone
- Migration `20260502_settings_phase2_complete.sql` ajoute `notif_frequency`, `support_tickets`, `security_audit_log`, bucket `banners`
- Logout avec modal de confirmation
- `useSubmitHelpRequest` + RLS owner-only sur `support_tickets`
- Edge Function `delete-account` avec modes `hard` / `anonymize`

### ❌ Problèmes

- 🔴 **DeleteAccountModal sans double-confirmation par username** (`DeleteAccountModal.tsx:61-79`) — simple bouton "Confirmer" alors que l'AC US-SET-07 exige la saisie du username pour confirmer
- 🔴 **Email change sans écran OTP** : `supabase.auth.updateUser({ email })` lance le flow mais aucune UI ne gère le code de confirmation reçu par mail
- 🟠 **Cast `any` sur `support_tickets`** (`supportService.ts`) en attendant régénération des types Supabase — code temporaire à retirer
- 🟡 SettingsHelpView : pas de rate-limit côté client (3 tickets/24h annoncé en commentaire mais pas enforced)

### ⚠️ Risques critiques

- 🔴 **Suppression compte trop facile** : 1 clic "Confirmer" et toutes les données partent. À combiner avec :
  - Saisie du username
  - Re-saisie email + OTP
- 🔴 **Email change sans confirmation visible** : l'utilisateur croit que c'est validé, alors qu'il faut cliquer sur le lien dans le mail
- 🟡 Pas d'audit log déclenché côté UI (les triggers DB existent mais l'UI n'INSERT pas explicitement)

### ♿ Accessibilité

- ✅ ConfirmModal a focus trap (cf. composant générique)
- 🟡 Notifications view : sliders/toggles `aria-checked` à confirmer
- 🟡 SettingsList : navigation flèches haut/bas entre items à confirmer

### 🌱 Éco

- ✅ Sauvegardes ciblées (1 mutation par changement de toggle)
- 🟡 Zone "Notifications" pourrait grouper les toggles dans une seule mutation (debounced)

### 🔒 Non-régression

- Tester : suppression compte → cascade DELETE + signOut + cache cleared
- Tester : suppression échoue → compte intact, toast erreur
- Tester : email change → ancien email reste actif tant que pas confirmé

### 🔧 Backend gaps

- 🔴 Implémenter UI OTP confirmation email change (écran intermédiaire)
- 🔴 Ajouter étape username matching dans DeleteAccountModal
- 🟠 Régénérer types Supabase pour retirer le cast `any` sur support_tickets
- 🟠 Logger les events `email_change_requested`, `account_deletion_requested` dans `security_audit_log` côté Edge Function

### 🧠 Recommandations

1. **PRIORITÉ #1** : ajouter un input "Tape ton username pour confirmer" dans DeleteAccountModal
2. **PRIORITÉ #2** : flow email change complet (mail envoyé + écran "Vérifie ta boîte" + handler OTP)
3. Régénérer les types Supabase et retirer le cast `any` (`npx supabase gen types typescript`)
4. Rate-limit côté UI sur l'envoi de tickets (3/24h)
5. Logger systématiquement dans `security_audit_log` (Edge Function `log-security-event`)

---

# Flow : Notifications

### ✅ Conforme

- 4 onglets : Toutes / Sociales / Espèces / Système
- Pagination cursor-based 20 items
- Bouton "Charger plus" (pas de scroll infini)
- Grouping `formatGroupedActors` ("Alice et 3 autres")
- `useMarkAsRead` + `useMarkAllAsRead` avec invalidation
- Realtime via Supabase channel `notif:${userId}`
- Deep-link selon `reference_type`
- `useUnreadCount` synchronisé avec mutations

### ❌ Problèmes

- 🟡 **Empty state** : à confirmer que tous les onglets ont un état vide explicite
- 🟡 **Notifications expirées** (auteur supprimé, post supprimé) : comportement à confirmer (afficher "Contenu indisponible" vs masquer)

### ⚠️ Risques critiques

- 🟡 Realtime subscribe : un user mal configuré pourrait recevoir des notifs cross-account → confirmer le filtre `user_id=eq.${userId}` côté channel
- 🟡 Pas de retry sur Realtime disconnect → si la WS coupe, les notifs nouvelles sont perdues jusqu'au prochain re-fetch

### ♿ Accessibilité

- 🟡 Liste `<ul role="list">` à confirmer
- 🟡 Live region pour annoncer "X nouvelles notifications" à l'arrivée
- 🟡 Badge non-lu : `aria-label="Non lue"` à vérifier

### 🌱 Éco

- ✅ Pas de polling, Realtime + invalidation
- ✅ Pagination 20
- 🟡 Realtime subscribe : 1 channel par user → coût Supabase à monitorer en prod

### 🔒 Non-régression

- Tester : Realtime → nouvelle notif arrive sans refresh
- Tester : Mark all → tous les badges disparaissent
- Tester : deep-link post supprimé → 404 gracieux

### 🔧 Backend gaps

- 🟡 Cron pour nettoyer les notifications > 90 jours (RGPD)
- 🟡 Edge Function pour générer les digest_daily / digest_weekly (cf. user_settings.notif_frequency)

### 🧠 Recommandations

1. Confirmer empty states sur les 4 onglets
2. Ajouter `aria-live="polite"` sur le badge non-lu
3. Documenter le retry sur Realtime disconnect
4. Implémenter les Edge Functions de digest selon `notif_frequency`

---

# 🧩 Audits transverses

## ♿ Accessibilité — synthèse

| Domaine                  | État                                    | Bloquants                         |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Skip links               | 🟡 À auditer page par page              | Landing, Home, Profile            |
| Focus visible            | 🟢 OK (Tailwind ring partout)           | —                                 |
| Labels formulaires       | 🟠 Lacunes OTP, multi-select onboarding | Auth, Onboarding                  |
| Contraste WCAG AA        | 🟢 OK (tokens DS validés)               | À retester sur images de fond     |
| Screen reader            | 🟠 ARIA absent par endroits             | Landing FAQ, OTP, multi-select    |
| `prefers-reduced-motion` | 🟡 À auditer (Hero, carrousel)          | Landing                           |
| Navigation clavier       | 🟢 OK globalement                       | Drag-drop alternative à confirmer |

**Bloquants A11Y AA** :

- Onboarding multi-select (US-ONB-01) — `role="group"` + `aria-pressed` manquants
- Auth OTP (US-AUTH-03) — `aria-label` + `aria-live` sur timer manquants
- Landing FAQ (US-LAND-01) — `aria-expanded` à confirmer

## 🌱 Éco-conception — synthèse

| Critère                 | État        | Action                                        |
| ----------------------- | ----------- | --------------------------------------------- |
| Pagination 20 partout   | 🟢 OK       | —                                             |
| Pas de scroll infini    | 🟢 OK       | —                                             |
| Images WebP/AVIF        | 🟠 Manquant | Compression + conversion côté client (upload) |
| Lazy-load images        | 🟢 OK feed  | À confirmer landing                           |
| Compression côté client | 🔴 Absente  | Lib canvas + cible 2 MB/1600 px               |
| Strip EXIF              | 🔴 Absent   | Lib `piexif` ou `exifr`                       |
| Cache React Query       | 🟢 OK       | staleTime ≥ 60s partout                       |
| Debounce search         | 🟢 OK       | 300-800 ms                                    |
| Bundle JS gzip          | 🟢 < 300 KB | Vérifier au CI à chaque release               |
| Polling                 | 🟢 Aucun    | Realtime utilisé                              |

**Bloquants ECO** :

- Upload images sans compression ni WebP (Contribution + EditPhotoTab)
- EXIF non strippé → coordonnées GPS embarquées dans la photo

## 🔒 Non-régression — top invariants à monitorer

1. **Authentification magic link** uniquement, JAMAIS de mot de passe
2. **Pagination 20** stricte, aucun scroll infini
3. **Maximum 4 photos** par post
4. **MIME stricts** : JPEG/PNG/WebP (HEIC à aligner)
5. **`location_hidden=true`** masque ville + département (à vérifier RLS)
6. **RLS `saved_posts`** owner-only (déjà OK)
7. **RLS `support_tickets`** owner-only (OK migration)
8. **RLS `security_audit_log`** SELECT owner / INSERT service_role uniquement
9. **TAXREF attribution CC-BY** visible dans Licence
10. **Onboarding obligatoire** avant accès `/home`
11. **`signOut()` vide queryClient.clear()** → confirmé dans `useDeleteAccount`
12. **Suppression compte** = transaction atomique (Edge Function)
13. **Bundle gzip < 300 KB** (CI à blinder)

---

# 🚦 Plan d'action proposé

## Sprint immédiat (cette semaine — bloquants release, post-décisions MVP)

| #   | Action                                                     | Fichier                    | Effort |
| --- | ---------------------------------------------------------- | -------------------------- | ------ |
| 1   | Persister `motivations` + `notif_frequency` à l'onboarding | `onboarding/index.tsx`     | 1 h    |
| 2   | Retirer HEIC/HEIF du form (Quick Win QW1)                  | `EncounterStep1.tsx`       | 5 min  |
| 3   | Ajouter username matching à DeleteAccountModal             | `DeleteAccountModal.tsx`   | 2 h    |
| 4   | Ajouter UI OTP confirmation email change                   | `SettingsSecurityView.tsx` | 4 h    |
| 5   | Auditer projection `lat/lng` quand `location_hidden=true`  | RLS / vue `posts_public`   | 2 h    |
| 6   | Strip EXIF avant upload (RGPD)                             | `mediaService.ts`          | 4 h    |

> **Décision Q1** : description optionnelle MVP → action #2 (description requise) supprimée du plan original.

## Sprint suivant (avant beta)

| #   | Action                                                  | Effort |
| --- | ------------------------------------------------------- | ------ |
| 7   | Compression image client + WebP                         | 1 j    |
| 8   | Strip EXIF avant upload                                 | 0.5 j  |
| 9   | Implémenter A11Y manquante (FAQ, OTP, multi-select)     | 1 j    |
| 10  | Logger events dans `security_audit_log` (Edge Function) | 1 j    |
| 11  | Régénérer types Supabase + retirer cast `any`           | 1 h    |
| 12  | Empty states cohérents partout                          | 0.5 j  |
| 13  | Retirer ou implémenter boutons sociaux auth             | 0.5 j  |
| 14  | StatsService MVP (observations, species count, streak)  | 2 j    |

## Sprint long terme (post-beta)

- Conversion HEIC client (lib `heic2any`)
- Externaliser banned-usernames en DB
- Account deletion 30-day grace period
- Digest_daily / digest_weekly Edge Functions selon `notif_frequency`
- Variantes images (thumbnail / medium / full)
- Cron RGPD nettoyage notifs > 90 j

---

# Annexes

## A. Couverture par fichier source

| Fichier                                             | LOC approx | Audit               | Sévérité max |
| --------------------------------------------------- | ---------- | ------------------- | ------------ |
| `pages/Landing/*`                                   | 600+       | ✅                  | 🟠           |
| `components/onboarding/index.tsx`                   | 200+       | ✅                  | 🔴           |
| `components/onboarding/OnboardingStep4.tsx`         | 600+       | ⚠️ Long, à splitter | 🟡           |
| `pages/AuthPage.tsx` + `auth/*`                     | 500+       | ✅                  | 🟠           |
| `contexts/AuthContext.tsx`                          | 480+       | ✅                  | 🟠           |
| `pages/Home.tsx`                                    | 100+       | ✅                  | 🟡           |
| `components/home/FeedSection.tsx`                   | 700+       | ⚠️ Long             | 🟠           |
| `components/home/FeedPost.tsx`                      | 500+       | ✅                  | 🟠           |
| `components/contribute/ContributeEncounterForm.tsx` | 300+       | ✅                  | 🔴           |
| `components/contribute/EncounterStep1.tsx`          | 450+       | ✅                  | 🔴           |
| `components/contribute/EncounterStep2.tsx`          | 500+       | ✅                  | 🟠           |
| `components/contribute/EncounterStep3.tsx`          | 500+       | ✅                  | 🟠           |
| `services/mediaService.ts`                          | 200+       | ✅                  | 🔴           |
| `pages/Profile.tsx`                                 | 380+       | ✅                  | 🟡           |
| `components/profile/ProfileTabs.tsx`                | 220+       | ✅                  | 🟢           |
| `components/profile/EditProfilePanel.tsx`           | 200+       | ✅                  | 🟡           |
| `components/settings/SettingsPanel.tsx`             | 480+       | ✅                  | 🔴           |
| `components/settings/DeleteAccountModal.tsx`        | 80         | ✅                  | 🔴           |
| `pages/NotificationsPage.tsx`                       | 300+       | ✅                  | 🔵           |

## B. Tables / Migrations à vérifier

- `user_settings.notif_frequency` — ✅ migration 20260502 (à vérifier appliquée sur dev/staging/prod)
- `support_tickets` — ✅ migration 20260502 (cast `any` à retirer après régénération types)
- `security_audit_log` — ✅ migration 20260502 (non utilisée par l'UI actuellement)
- `bucket banners` — ✅ migration 20260502
- `posts.location_hidden` — ⚠️ vérifier la projection RLS / vue `posts_public`
- `motivations` colonne sur `profiles` — ❌ à créer si on veut persister
- `account_deletion_requests` (Phase 2) — ❌ pas encore créée

## C. Edge Functions

- `delete-account` — ✅ existe, supporte `hard` / `anonymize`
- `submit-help` — ❌ Phase 2 (relai Discord webhook)
- `digest-daily` / `digest-weekly` — ❌ Phase 2
- `log-security-event` — ❌ recommandé (pour `security_audit_log`)
- `check-username-availability` — ❌ recommandé pour onboarding step 4

---

> **Document maintenu** par l'équipe Naturegraph. À comparer aux PR de fix pour vérifier la résolution des bloquants. Dernière revue : 2026-05-02.
