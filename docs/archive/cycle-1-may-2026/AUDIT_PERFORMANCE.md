# Naturegraph — Audit performance & éco-conception

> **Version** : 1.0 — 2026-05-02
> **Posture** : staff engineer perf web. **Aucune modification de code.**
> **Méthodologie** : `npm run build` + lecture code + analyses parallèles + vérifications ciblées.
> **Objectif** : produit rapide et sobre, conforme aux budgets de `GUIDELINES.md` (< 300 KB JS gzip, < 500 KB total, LCP < 2.5 s).

---

## TL;DR — État actuel

Le produit est **proche de l'optimal** :

✅ **Bons points** :

- Code-splitting actif sur 13 routes (`React.lazy()`)
- Tree-shaking efficace (`lucide-react` imports nommés, pas de `import *`)
- Tailwind 4 + tokens CSS
- `motion/react` (lib légère vs framer-motion classique)
- React Query : `refetchOnWindowFocus: false` (éco)
- 0 polling, 0 `console.log` en prod
- Pagination 20 cohérente
- Triggers Postgres maintiennent les compteurs denormalisés (pas de COUNT en runtime)
- RLS optimisée (helper `can_see_post()` STABLE + index FK)

⚠️ **Points d'amélioration concrets** :

1. **Chunk `MobileBottomNav` à 166 KB raw / 39 KB gzip** — anormal pour un composant nav. À investiguer (asset embarqué ?)
2. **Chunk `cta-kingfisher` à 127 KB raw / 42 KB gzip** — ressemble à un asset image bundlé en JS
3. **`hydrateCommunityProfiles` : 3 requêtes série** sur l'onglet Communauté → 150-300 ms de latence
4. **`FeedPost` (756 lignes) sans `React.memo`** → re-renders inutiles à chaque scroll/like
5. **Compression image client absente** (cf. PLAN_ACTION) → upload 10 MB au lieu de 2 MB
6. **EXIF non strippé** (cf. PLAN_ACTION) → fuite GPS embarquée
7. **`select('*')` sur `profiles`** (4 occurrences) → remonte `email` (RGPD) + colonnes inutiles

**Budget JS gzip** : ~215 KB sur la route initiale → **dans le budget 300 KB** ✅, mais marge serrée.

---

# 1. Stats de build actuelles

## 1.1 Top chunks (gzip)

| Chunk                     | Brut   | Gzip      | Type            |
| ------------------------- | ------ | --------- | --------------- |
| `index-J4vcA6Dw`          | 282 KB | **91 KB** | Entry principal |
| `supabase`                | 173 KB | **46 KB** | SDK Supabase    |
| `MobileBottomNav`         | 166 KB | **39 KB** | ⚠️ **Anormal**  |
| `cta-kingfisher`          | 127 KB | **42 KB** | ⚠️ Asset bundlé |
| `vendor` (React + Router) | 100 KB | **34 KB** | OK              |
| `ContributeEncounterForm` | 92 KB  | **27 KB** | Lazy ✅         |
| `i18n`                    | 49 KB  | **16 KB** | OK (FR + EN)    |
| `Profile`                 | 46 KB  | **12 KB** | Lazy ✅         |
| `query` (React Query)     | 37 KB  | **11 KB** | OK              |
| `Settings`                | 28 KB  | **7 KB**  | Lazy ✅         |
| `AuthPage`                | 20 KB  | **7 KB**  | Lazy ✅         |
| `Home`                    | 18 KB  | **5 KB**  | Lazy ✅         |

## 1.2 Estimation initial load

**Route `/` (Landing)** :

- index principal : ~91 KB gzip
- vendor : ~34 KB gzip
- query : ~11 KB gzip (pas chargé sur landing si pas d'API call)
- i18n : ~16 KB gzip
- Landing chunk : ~5-10 KB gzip
- **Total estimé** : **~150-160 KB gzip** ✅ (sous budget)

**Route `/home` connecté** :

- index : 91 KB
- vendor : 34 KB
- supabase : 46 KB
- query : 11 KB
- i18n : 16 KB
- Home : 5 KB
- MobileBottomNav : 39 KB ⚠️
- **Total estimé** : **~242 KB gzip** ✅ (proche du budget)

**Marge restante avant dépassement** : ~60 KB gzip. Si on ajoute Lighthouse + analytics + une lib de compression image, on dépasse.

---

# 🐢 Problèmes

## P-FRONT-1 — Chunk `MobileBottomNav` anormalement lourd (39 KB gzip)

**Constat** : un composant de barre de navigation à 5 onglets ne devrait pas peser 166 KB raw. Probablement un asset image (logo, illustration) embarqué via import.
**Impact** : 39 KB gzip chargés systématiquement sur mobile (la bottom nav est partout sauf landing). **Sur 4G : ~100 ms de download**.
**Causes possibles** :

- Import direct d'une image PNG/SVG sans `?url` ou compression
- Bundle d'une lib lourde (genre une autre lib d'icônes) dans ce chunk
- Mauvais split Vite (assets agrégés au composant)

**À vérifier** : `vite-bundle-visualizer` ou `npx vite-bundle-analyzer` pour voir le contenu exact du chunk.

## P-FRONT-2 — Chunk `cta-kingfisher` (42 KB gzip)

**Constat** : ce nom évoque une image (martin-pêcheur = kingfisher) bundlée en JS au lieu d'asset CDN.
**Impact** : 42 KB gzip pour une image qui devrait être en WebP/AVIF servie directement par Supabase Storage ou CDN.
**À vérifier** : où ce chunk est utilisé. Probablement dans `CTABanner` de la landing.

## P-FRONT-3 — `FeedPost` (756 lignes) sans `React.memo`

**Constat** : à chaque action sur le feed (like, save, scroll), tous les `FeedPost` du viewport se re-rendent. 20 instances × ~50 ms de render = 1 s de jank perceptible.
**Impact** : feed saccadé sur mobile bas-de-gamme et 4G.
**Mesure proposée** : React DevTools Profiler avant / après `React.memo + useCallback` sur les props.

## P-FRONT-4 — Object `buckets` recréé à chaque render dans `FeedSection`

**Constat** : `const buckets = { love: 0, admire: 0, fire: 0, wow: 0, curious: 0 }` créé inline → nouvelle référence à chaque render → invalide les memos enfants.
**Impact** : ~5-10 % de re-renders évitables.

## P-FRONT-5 — Images sans aspect-ratio explicite (CLS risk)

**Constat** : certaines images du feed (`FeedGallery`, `ImageSlider`) n'ont pas de `width`/`height` explicites ou d'aspect-ratio Tailwind. Sur connexion lente, le contenu shifte au chargement.
**Impact** : Score Lighthouse CLS dégradé (cible < 0.1).
**Précaution** : `aspect-[16/9]`, `aspect-[3/4]`, `aspect-square` selon le format Figma déjà choisi à la publication.

## P-FRONT-6 — `motion/react` 649 KB en `node_modules` (mais OK en build)

**Constat** : la lib pèse 649 KB **en dev**. En build, Vite tree-shake correctement (utilisée seulement pour Hero + Accordion + AuthOrb).
**Impact** : aucun en prod. Juste lent en dev (HMR plus long).

## P-FRONT-7 — `gcTime` React Query non override

**Constat** : valeur par défaut de Tanstack = 5 min. Si l'utilisateur scrolle son feed, quitte 6 minutes, revient → re-fetch complet.
**Impact** : trafic réseau inutile.
**Précaution** : passer à 30 min sur les queries de lecture stables (`usePost`, `useProfile`, `useFeed`).

## P-FRONT-8 — Pas de Service Worker / PWA

**Constat** : aucun `manifest.json`, aucun SW configuré.
**Impact** : pas de mode offline, pas d'install écran d'accueil sur mobile.
**Justifié** pour le MVP, mais à prévoir Phase 3 pour les naturalistes terrain (zones blanches).

## P-BACK-1 — `hydrateCommunityProfiles` : 3 requêtes série

**Fichier** : `followService.ts:110-149`
**Constat** :

1. SELECT follower_id FROM follows
2. SELECT profiles WHERE id IN (ids)
3. SELECT follows WHERE follower_id = me AND following_id IN (ids)

**Impact** : 150-300 ms de latence sur l'onglet Communauté (3 RTT × 50-100 ms).
**Précaution** : fusionner via une RPC Postgres ou une vue SQL avec join.

## P-BACK-2 — `getFeed` tab "for_you" : 2 requêtes série

**Fichier** : `postService.ts:125-130`
**Constat** : 1ère query pour récupérer `following_id`, 2e pour le feed filtré.
**Impact** : 100-200 ms supplémentaires sur l'onglet "Pour vous".
**Précaution** : matérialiser une vue `user_following_set` ou utiliser une RPC `get_for_you_feed(user_id)`.

## P-BACK-3 — `select('*')` sur `profiles` (4 occurrences)

**Fichiers** : `profileService.ts:73, 89, 145` + ailleurs
**Constat** : remonte tous les champs incluant `email` (RGPD) + métadonnées internes.
**Impact** : payload inutilement gonflé + risque RGPD si endpoint exposé publiquement.
**Précaution** : créer une constante `PROFILE_SAFE_SELECT` et l'utiliser partout (sauf upsert/update du propriétaire).

## P-BACK-4 — `can_see_post()` appelée 60+ fois par feed

**Fichier** : migration `20260401_*` ligne 27
**Constat** : la helper RLS `can_see_post(post_id)` est appelée par les policies media, reactions, comments, proposals. Pour un feed de 20 posts × 3 tables jointes, on peut atteindre 60+ appels.
**Impact** : ~50-100 ms cumulés (la fonction est `STABLE` mais Supabase ne cache pas forcément).
**Précaution** : matérialiser une vue `posts_with_access` ou intégrer la logique directement dans la policy posts.

## P-DATA-1 — Compression image absente côté client (RGESN bloquant)

**Fichier** : `mediaService.ts:7-9` (TODO explicite)
**Constat** : aucune compression / conversion WebP avant upload. Une photo iPhone fait facilement 5-10 MB en JPEG.
**Impact** :

- Upload 5-10 MB sur 4G rurale = 30-60 secondes
- Stockage Supabase × N posts × N utilisateurs → coût réel
- Bande passante visiteurs feed ×3-5 vs WebP optimisé

**Précaution** : lib `browser-image-compression` (5 KB) ou canvas natif. Cible : 1600 px côté long, qualité 85 %, format WebP.

## P-DATA-2 — EXIF non strippé (RGPD bloquant)

**Fichier** : `mediaService.ts:7-9` (TODO explicite)
**Constat** : les métadonnées EXIF (dont GPS) sont conservées même si l'utilisateur active "Région masquée".
**Impact** : fuite de coordonnées GPS via les métadonnées du fichier — contradiction RGPD.
**Précaution** : lib `exifr` ou `piexifjs` pour strip systématique avant upload.

## P-DATA-3 — Pas de variantes d'images (thumbnail / medium / full)

**Constat** : la même image pleine résolution est servie pour les avatars 40 px et les vues fullscreen.
**Impact** : un avatar 1600×1600 chargé pour afficher 40×40 = ×40 trop de pixels.
**Précaution** : Edge Function ou trigger Supabase Storage pour générer 3 variantes au moment de l'upload.

## P-DATA-4 — Index Postgres potentiellement manquants

**Constat** : la migration `20260420_missing_fk_indexes.sql` a couvert les FK essentiels, mais 3 index composites sont à vérifier :

- `posts(user_id, created_at DESC)` pour `getPostsByUser` (Profile > Journal nature)
- `posts(taxonomic_group, identification_status, published_at DESC)` pour les filtres feed
- `saved_posts(user_id, created_at DESC)` pour `getSavedPosts`

**Impact** : query lente quand un utilisateur a > 100 posts ou > 100 saved.
**Précaution** : `EXPLAIN ANALYZE` sur les 3 queries avec un dataset réaliste avant la beta publique.

---

# ⚡ Optimisations recommandées

> **Classées effort × impact**. Effort = temps dev. Impact = ms ou KB gagnés.

## O-1 — Investigation chunk `MobileBottomNav` + `cta-kingfisher` (effort 30 min, impact -40 KB gzip)

**Action** : `npx vite-bundle-visualizer` ou installer `rollup-plugin-visualizer` pour identifier ce qui gonfle ces chunks.
**Hypothèses** :

- Asset image inliné via `import logo from './x.png'` au lieu de `?url`
- Lucide icon set partial inclus
- Lib externe accidentellement bundlée

**Gain estimé** : -30 à -40 KB gzip si c'est une image qu'on déplace en `<img src="...">` direct.

## O-2 — Compression image client avant upload (effort 1 j, impact -70 % poids)

**Action** : intégrer `browser-image-compression` dans `mediaService.ts`. Cible : 1600 px côté long, qualité 85 %, format WebP.
**Gain** :

- Upload : 10 MB → 1.5 MB (×6.6 plus rapide)
- Stockage : 70 % de moins
- Bande passante feed visiteurs : 70 % de moins

**Précaution** : tests qualité visuelle (jardins en faible lumière surtout). Garder la full pour les zoom détaillés.

## O-3 — Strip EXIF avant upload (effort 4 h, impact RGPD critique)

**Action** : lib `exifr` (3 KB gzip) pour strip systématique.
**Gain** : conformité RGPD + ~10 KB de moins par photo.

## O-4 — `React.memo` + `useCallback` sur FeedPost (effort 2 h, impact -50 % renders)

**Action** : envelopper `FeedPost` dans `React.memo`, mémoriser les callbacks parents (`onReact`, `onSave`, `onShare`, `onOptions`) avec `useCallback`.
**Gain** : feed fluide sur mobile bas-de-gamme. Mesurable via React DevTools Profiler.

## O-5 — Fusionner `hydrateCommunityProfiles` en RPC (effort 4 h, impact -200 ms)

**Action** : créer une fonction Postgres `get_community_with_follow_status(target_user_id, type)` qui fait le join en 1 RTT.
**Gain** : onglet Communauté instantané au lieu de 200-300 ms.

## O-6 — Variantes images (effort 2 j, impact -50 % bande passante feed)

**Action** : Edge Function `generate-image-variants` triggered par insert media. Génère 3 tailles : thumb (300 px), medium (800 px), full (1600 px). Sert la bonne taille selon le contexte UI.
**Gain** : avatars qui chargent en < 50 ms au lieu de 500 ms. Feed allégé.

## O-7 — `select` ciblés sur `profiles` (effort 1 h, impact RGPD + perf)

**Action** : remplacer `select('*')` par une constante `PROFILE_SAFE_SELECT` partout sauf upsert.
**Gain** : payload réduit + plus de risque de fuite `email`.

## O-8 — Index composites Postgres (effort 2 h, impact -50 ms par query)

**Action** : créer une migration ajoutant les 3 index composites manquants après `EXPLAIN ANALYZE`.
**Précaution** : `CREATE INDEX CONCURRENTLY` pour ne pas bloquer la prod.

## O-9 — `gcTime` sur hooks lecture (effort 30 min, impact -20 % refetches)

**Action** : passer `gcTime: 30 * 60 * 1000` sur `usePost`, `useProfile`, `useFeed`.
**Gain** : moins de re-fetches après navigation.

## O-10 — Mémorisation `buckets` dans FeedSection (effort 5 min, impact -5 % renders)

**Action** : `const buckets = useMemo(() => ({ love: 0, admire: 0, fire: 0, wow: 0, curious: 0 }), [])`.

## O-11 — `aspect-ratio` explicite sur toutes les images (effort 1 h, impact CLS)

**Action** : auditer toutes les `<img>` du feed et profil. Ajouter `aspect-[16/9]` ou `aspect-square` selon le format.
**Gain** : score Lighthouse CLS < 0.1.

---

# 🌱 Gains éco

> Triés par impact environnemental réel.

## E-1 — Compression image (gain : ×3 à ×5 sur la bande passante)

Une plateforme nature qui partage des photos haute résolution sans optimisation = aberration éco. La compression WebP réduit drastiquement l'empreinte carbone du transport réseau **et** du stockage.

**Calcul d'impact** (pour 1 000 utilisateurs actifs / 1 photo / jour pendant 1 an) :

- Sans compression : 365 000 × 5 MB = **1.8 TB/an**
- Avec compression : 365 000 × 1.5 MB = **0.55 TB/an**
- **Gain : 1.25 TB/an de transit + stockage évité**

## E-2 — Variantes d'images (gain : ×4 à ×40 selon contexte)

L'avatar d'un user vu 100 fois par jour à 40×40 px ne devrait jamais charger l'image 1600×1600.

**Calcul** (1 000 users actifs × 100 vues feed/jour × 1 an, avatars seuls) :

- Sans variantes : 36.5 M × 200 KB = **7.3 TB/an d'avatars**
- Avec variante 40 px : 36.5 M × 5 KB = **0.18 TB/an**
- **Gain : 7.1 TB/an** (énorme pour un usage quasi gratuit en dev)

## E-3 — `gcTime` réseau évité (gain : -20 à -30 % de requêtes)

Un user qui scrolle 10 fois sa page profil dans la journée → 10 fetches profile au lieu de 1 si `gcTime` correctement réglé.

## E-4 — `select` ciblés (gain : -30 à -50 % payload services)

Profiles `select('*')` remonte 20 colonnes là où on en utilise 8 côté UI. Cumulé sur le feed (20 posts × 1 author chacun = 20 profiles), c'est 40 % de payload évitable.

## E-5 — Investigation chunks anormaux (gain : -40 KB gzip × 100 % visites)

Tout le monde paie le coût de chargement à chaque visite. -40 KB gzip × 1 M visites/mois = **40 GB/mois** économisés sur le réseau global.

## E-6 — Lazy load systématique des composants lourds (gain ponctuel)

Déjà bien fait sur les routes. Pas de gain immédiat.

## E-7 — Pas de polling, pas de `refetchOnWindowFocus` (déjà acquis ✅)

Le projet a fait les bons choix éco par défaut : aucun fetch parasite. À préserver dans les non-régressions.

## E-8 — Compteurs denormalisés (déjà acquis ✅)

`likes_count`, `posts_count`, etc. maintenus par triggers Postgres → 0 COUNT(\*) en runtime. Excellent pour la sobriété DB.

---

# 🚀 Gains performance

> Triés par perception utilisateur.

## G-1 — Feed plus fluide (cible -50 % de jank)

**Actions cumulées** : O-4 (memo FeedPost) + O-10 (buckets) + O-11 (CLS images)
**Impact perçu** : feed qui scrolle sans saccades sur Android bas de gamme + 4G.
**Métrique** : INP < 200 ms (Interaction to Next Paint).

## G-2 — Onglet Communauté instantané (-200 ms)

**Action** : O-5 (RPC fusionnée).
**Impact perçu** : passage à l'onglet "Migrateurs" / "Migrations" sans loading visible.
**Métrique** : TTI Community < 300 ms.

## G-3 — Upload photo 6× plus rapide (-80 % temps)

**Action** : O-2 (compression).
**Impact perçu** : publication d'observation de 30 s → 5 s sur 4G. Cruciale pour la rétention.
**Métrique** : 95 % des uploads < 10 s.

## G-4 — Initial load plus léger (-40 KB gzip)

**Action** : O-1 (chunks anormaux).
**Impact perçu** : -100 ms sur le LCP en 4G.
**Métrique** : LCP < 2.0 s sur Lighthouse mobile.

## G-5 — Communauté + profil avec avatars instantanés

**Action** : O-6 (variantes images).
**Impact perçu** : grilles d'avatars qui apparaissent ensemble au lieu d'un par un.
**Métrique** : CLS < 0.1 + load time avatars < 50 ms.

## G-6 — Feed for_you 2× plus rapide

**Action** : O-2 backend (RPC `get_for_you_feed`).
**Impact perçu** : onglet "Pour vous" ouvert en < 200 ms vs 400 ms actuellement.

## G-7 — Profil > Journal nature scalable

**Action** : O-8 (index composite `posts(user_id, created_at)`).
**Impact perçu** : aucun lag même quand un utilisateur a 1 000 posts.

---

# Plan de mise en œuvre

> **Posture** : intégrer ces optims **en parallèle des phases du PLAN_ACTION.md**, pas comme un sprint perf isolé. Chaque optim est greffée à la phase pertinente.

## Phase 1 (stabilisation, 5 j) — déjà prévue

Inclut **gratuitement** ces gains perf :

- O-3 strip EXIF (déjà dans Phase 1 — RGPD)
- O-7 select ciblés profiles (à inclure dans le sprint d'audit lat/lng)

## Phase 2 (fiabilisation, 10 j) — déjà prévue

Inclut :

- **O-2 compression image** (1 j, déjà compté)

À ajouter (estimer +2 j) :

- **O-4 React.memo FeedPost** (2 h)
- **O-10 buckets useMemo** (5 min)
- **O-11 aspect-ratio images** (1 h)
- **O-9 gcTime hooks** (30 min)
- **O-1 investigation chunks anormaux** (30 min)
- **O-8 index composites Postgres** (2 h)

## Phase 3 (amélioration, post-beta)

Inclut :

- **O-5 RPC hydrate communauté** (4 h)
- **O-6 variantes images** (2 j)
- Backend RPC `get_for_you_feed` (1 j)
- Service Worker PWA (1 j)

---

# Métriques de succès — chiffres cibles

| Métrique                                        | État actuel estimé | Cible Phase 2  | Cible Phase 3 |
| ----------------------------------------------- | ------------------ | -------------- | ------------- |
| **Bundle JS gzip (route initiale)**             | ~150 KB            | ~140 KB        | ~130 KB       |
| **Bundle JS gzip (route /home)**                | ~242 KB            | ~220 KB        | ~200 KB       |
| **LCP mobile 4G**                               | ~2.5 s             | < 2.0 s        | < 1.5 s       |
| **CLS feed**                                    | ? (à mesurer)      | < 0.1          | < 0.05        |
| **INP feed scroll**                             | ?                  | < 200 ms       | < 100 ms      |
| **Upload photo 5 MB sur 4G**                    | ~30 s              | ~5 s           | ~3 s          |
| **Onglet Communauté open**                      | ~300 ms            | ~200 ms        | ~50 ms        |
| **For You feed open**                           | ~400 ms            | ~300 ms        | ~150 ms       |
| **Score Lighthouse Performance**                | ?                  | > 85           | > 90          |
| **Score Lighthouse Accessibility**              | ?                  | > 95           | > 98          |
| **Score Lighthouse Best Practices**             | ?                  | > 90           | > 95          |
| **Bande passante moyenne / utilisateur / mois** | ?                  | -50 % vs avant | -70 %         |

---

# Annexes

## A. Outils recommandés

| Outil                        | Usage                                    |
| ---------------------------- | ---------------------------------------- |
| `npx vite-bundle-visualizer` | Analyser composition des chunks          |
| Chrome DevTools Performance  | Mesurer renders, INP, jank               |
| React DevTools Profiler      | Identifier composants qui re-rendent     |
| Lighthouse CI                | Score perf / a11y / SEO automatisé en CI |
| `EXPLAIN ANALYZE` Supabase   | Plan d'exécution requêtes                |
| `web-vitals` JS lib          | RUM (Real User Monitoring) en prod       |

## B. Liste des `select('*')` à éliminer

| Fichier                  | Ligne   | Table                    | Justifié ?                             |
| ------------------------ | ------- | ------------------------ | -------------------------------------- |
| `profileService.ts`      | 73      | profiles                 | ❌ Remplacer par `PROFILE_SAFE_SELECT` |
| `profileService.ts`      | 89      | profiles                 | ✅ upsertProfile (owner)               |
| `profileService.ts`      | 145     | profiles                 | ✅ updateProfile (owner)               |
| `notificationService.ts` | 44      | notifications_with_actor | ✅ vue déjà filtrée                    |
| `supportService.ts`      | 80, 100 | support_tickets          | ✅ propriétaire RLS                    |
| `savedPostsService.ts`   | ?       | saved_posts              | À vérifier                             |

## C. Triggers Postgres maintenus (à monitorer pour drift)

| Trigger           | Compteur                                      | Risque drift        |
| ----------------- | --------------------------------------------- | ------------------- |
| reactions trigger | `posts.likes_count`                           | Faible (idempotent) |
| posts trigger     | `profiles.posts_count`                        | Faible              |
| follows trigger   | `profiles.followers_count`, `following_count` | Faible              |
| comments trigger  | `posts.comments_count`                        | À confirmer         |

**Recommandation** : cron mensuel de re-calcul si dataset > 10 k rows pour détecter les drifts éventuels.

## D. Build stats actuels (référence)

```
Total chunks : 50
Top 10 cumulés (gzip) : ~330 KB
Initial load (estimé) : ~150 KB gzip (Landing) / ~242 KB (Home)
Build time : 20.44 s
```

## E. Heuristiques perf mobile

- **4G médian** : 1-3 Mbit/s download, 100-150 ms RTT
- **WiFi médian** : 25-50 Mbit/s, 30-50 ms RTT
- **Mobile bas-de-gamme CPU** : 3-4× plus lent qu'un MacBook Pro
- **Budget JS gzip mobile** : 200-300 KB max pour TTI < 3 s

---

> **Document vivant**. Re-mesurer les métriques après chaque vague d'optims. Ajouter Lighthouse CI au pipeline pour bloquer les régressions perf.
