# Naturegraph — Audit technique SAFE

> **Version** : 1.0 — 2026-05-02
> **Posture** : staff engineer qui prépare un refactor sécurisé. **Aucune modification de code.**
> **Objectif** : cartographier la dette technique pour la résorber sans régression.
> **Source** : lecture exhaustive `src/` + `supabase/migrations/`, analyses parallèles + vérifications ciblées.

---

## TL;DR — État réel de la dette

Le code est **globalement sain** (architecture cohérente, conventions respectées, i18n adoptée à 914 appels `t()`, 0 `console.log`, RLS active partout). Mais il accumule **5 dettes structurelles** qui freinent la vélocité :

1. **46 occurrences du pattern `getCurrentUser()`** dispersées → besoin d'un helper centralisé
2. **22 casts `as unknown as`** sur 12 fichiers → contournement TypeScript silencieux
3. **14 composants > 200 lignes** (règle CLAUDE.md violée), avec un cluster critique `FeedPost.tsx` (756) + `FeedSection.tsx` (730) + `ContributeEncounterForm.tsx` (681)
4. **57+ TODOs `[BACKEND]`** dont 3 bloquent encore des features (Edit/Delete post, Instant nature, Like Phase 2)
5. **Invalidations React Query trop larges** (`['feed']`, `['followers']`) → re-fetch global au lieu de ciblé

**Coût de la dette** : ~3-4 semaines de refacto en parallèle des fixes Phase 1 + Phase 2 si on veut tout résoudre. **Mais on peut refactorer par étapes** sans bloquer la roadmap.

**Aucun bloquant fonctionnel** : ce n'est pas urgent comme l'audit fonctionnel. C'est de la dette technique, pas un bug produit.

---

# ❌ Code inutile

## CI-1 — Stubs et features désactivées (risque : confusion lors des reviews)

| #      | Localisation                          | Nature                                       | État                                                 |
| ------ | ------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| CI-1.1 | `ContributeModal.tsx:25`              | Bouton "Instant nature" `disabled: true`     | Décision MVP : à confirmer si on retire complètement |
| CI-1.2 | `DeleteConfirmModal.tsx:9`            | Suppression post non branchée                | TODO existe                                          |
| CI-1.3 | `PostOptionsMenu.tsx:70`              | Edit/delete post stubs                       | TODO existe                                          |
| CI-1.4 | `Landing/Navbar.tsx:14, 60, 109, 146` | Language switcher (4 occurrences commentées) | i18n FR/EN actif, switcher caché                     |
| CI-1.5 | `AuthForm.tsx:216-231`                | Boutons sociaux Google/Apple/Facebook        | **Quick Win QW2** : à masquer (décision Q3)          |
| CI-1.6 | `EncounterStep2.tsx:472-486`          | Multi-observation "Bientôt"                  | **Quick Win QW6** : à masquer (décision Q2)          |
| CI-1.7 | `EncounterStep2.tsx:414-416`          | Toggle "Aide à l'identification"             | **Quick Win QW6** : à masquer (décision Q4)          |

**Risque** : feature toggle visibles mais non fonctionnelles → utilisateurs frustrés, reviewers confus.
**Précaution** : vérifier que chaque masquage a un ticket backlog Phase 3 associé pour ne pas oublier de réactiver.

## CI-2 — Empty state Profile dupliqué (`Profile.tsx:193-247`)

Deux branches identiques rendent le même empty state. La 2e est dead code (la 1re capture déjà tous les cas).
**Risque** : divergence au prochain refacto si seule l'une des deux est modifiée.
**Précaution** : suppression simple, **Quick Win QW5** (10 min). Test manuel : visiter `/profile/inconnu` → empty state bien rendu.

## CI-3 — Migration TODO non appliquée

`src/types/database.ts:60` mentionne _"TODO backend : retirer 'disappointed' de reaction_type"_.
**À vérifier** : la migration SQL `20260416_reactions_notifications.sql` est-elle alignée ?
**Risque** : drift entre les types TS et l'enum DB.
**Précaution** : ne pas supprimer 'disappointed' avant de confirmer qu'aucun post en DB ne l'utilise.

## CI-4 — Services exotiques à vérifier d'usage

D'après ma vérification (`grep` sur les imports) :

- ✅ `searchService` utilisé par `SearchPanel`, `SpeciesSearch`, `SpeciesContext`
- ✅ `blockService` utilisé par `PostOptionsMenu`
- ✅ `reportService` utilisé par `ReportModal`
- ✅ `statsService` utilisé par `StatsSidebar` + `useStats`
- ✅ `identificationService` utilisé par `ContributeEncounterForm`
- ✅ `notebookService` — à vérifier (a priori non utilisé MVP)

**Risque** : pas de service orphelin clair (contrairement à ce que l'agent suggérait). À auditer `notebookService` spécifiquement.
**Précaution** : avant de supprimer, `grep -r "notebookService"` exhaustif.

## CI-5 — `eslint-disable` non documenté

`src/components/contribute/MediaUploader.tsx` : `// eslint-disable-next-line react-hooks/exhaustive-deps` sans commentaire explicatif.
**Risque** : on ne sait pas si la dépendance manquante est intentionnelle ou un bug latent.
**Précaution** : ajouter un commentaire `// Intentional: la callback X est stable, ré-exécution non souhaitée`.

---

# 🔧 Refactor recommandé

> Classés du plus rentable (effort/gain) au moins.

## RR-1 — Helper centralisé Supabase + auth (priorité 🔥)

**Constat** : `if (!supabase) throw new Error('Supabase non configuré')` répété **26 fois** dans 10 fichiers + `auth.getUser()` direct **12 fois**.

**Refacto recommandé** :

```ts
// src/lib/supabaseGuard.ts (nouveau)

/** Garantit le client Supabase ou throw — usage : `const sb = ensureSupabase()` */
export function ensureSupabase(): SupabaseClient { ... }

/** Récupère l'user authentifié ou throw — usage : `const userId = await requireUserId()` */
export async function requireUserId(): Promise<string> { ... }

/** Wrapper higher-order : `withSupabase(async (sb, userId) => { ... })` */
export function withSupabase<T>(fn: (sb, userId) => Promise<T>): Promise<T> { ... }
```

**Gain** : -200 lignes répétitives, fix d'un seul endroit si la signature Supabase change.
**Risque refacto** : 🟡 moyen — changement transverse 10 services. Régression silencieuse possible si certains throw sont attendus.
**Précautions** :

- Refactorer **un service à la fois** avec PR séparée
- Tests E2E sur les flows clés AVANT et APRÈS chaque PR (login, post, follow, settings)
- Conserver le comportement exact (même message d'erreur, même type d'erreur)

## RR-2 — Centraliser les query keys React Query (priorité 🔥)

**Constat** : 3 patterns coexistent (`['post', id]` direct, `FEED_QUERY_KEY()` factory, `FOLLOW_KEY()` arrow). Pas de registre central.

**Refacto recommandé** :

```ts
// src/hooks/queryKeys.ts (nouveau)

export const queryKeys = {
  post: {
    byId: (id: string) => ['post', id] as const,
    byUser: (userId: string, sort: 'recent' | 'popular') =>
      ['posts', 'by-user', userId, sort] as const,
  },
  feed: {
    recent: (filters: FeedFilterParams) => ['feed', 'recent', filters] as const,
    popular: (filters: FeedFilterParams) => ['feed', 'popular', filters] as const,
    forYou: (userId: string, filters: FeedFilterParams) =>
      ['feed', 'for-you', userId, filters] as const,
  },
  profile: {
    byId: (id: string) => ['profile', id] as const,
    byUsername: (username: string) => ['profile', 'by-username', username] as const,
  },
  // ...
}
```

**Gain** : invalidations ciblées, refactor sécurisé, IDE auto-complete.
**Risque refacto** : 🟡 moyen — invalidations actuelles trop larges.
**Précautions** :

- Documenter les invariants d'invalidation actuels avant refacto
- Mesurer le nombre de re-fetch avant/après (Chrome devtools React Query plugin)
- Garder les anciens keys en deprecated pendant 1 sprint

## RR-3 — Extraire FeedPost.tsx (756 lignes) en sous-composants (priorité 🟠)

**Sous-composants à extraire** (chacun ~80-120 lignes) :

- `<PostHeader />` (avatar, username, date, location, post type icon)
- `<PostContent />` (titre, description, "Voir plus")
- `<PostMetadataChips />` (météo, moment, catégorie, espèce — gère les 3 cas chip)
- `<PostReactionRow />` (cœur, save, share, options)
- `<PostImagesSection />` (slider + format)

**Hook à extraire** :

- `usePostState()` qui regroupe les 5 useState actuels en un useReducer (`isExpanded`, `showOptions`, `showReactionPicker`, `showShare`, `isOverflowing`)

**Gain** : composant principal < 200 lignes, testabilité unitaire, re-renders ciblés.
**Risque refacto** : 🔴 **élevé** — c'est le composant le plus utilisé du feed (20 instances par page).
**Précautions** :

- **Tests visuels Playwright/Chromatic AVANT** le refacto pour bloquer les régressions visuelles
- Mesurer le nombre de re-renders avant/après (React DevTools Profiler)
- Refacto en **3 PRs successives** (PostHeader → PostMetadataChips → reste), pas tout d'un coup
- Vérifier les classes Tailwind exactes (le pixel-perfect Figma est délicat)

## RR-4 — Extraire FeedSection.tsx (730 lignes)

**Sous-composants** :

- `<FeedTabs />` (Récent/Populaire/Pour vous + gating guest)
- `<FeedEmptyState />` (déjà existe peut-être ?)
- `<FeedSkeleton />` (déjà existe via Skeleton.tsx)

**Hook à extraire** :

- `useFeedFilters()` qui encapsule `tab`, `filters`, `page`, et l'état dérivé (prevTab, prevFiltersKey actuellement en synchrone dans le render → **anti-pattern React 19**)

**Gain** : isolation logique filtres + pagination, composant principal lisible.
**Risque refacto** : 🟠 moyen-élevé — la dérivation synchrone d'état dans le render (lignes 384-399) est un bug latent qui pourrait empirer avec React 19 strict mode.
**Précautions** :

- Lever le bug sync-render en **priorité avant le découpage** (le résoudre via useEffect ou mieux via useQuery state)
- Test E2E : changer de tab → vérifier que le feed se rafraîchit
- Tester filtres combinés (catégorie + radius + période)

## RR-5 — Extraire ContributeEncounterForm.tsx (681 lignes)

**Hook à extraire** : `useEncounterForm()` avec useReducer pour `form` (au lieu de useState complexe).

**Sous-composants** : déjà splittés en EncounterStep1/2/3 — bon découpage existant.

**À nettoyer** : la logique métier (uploadPostMedia + createPost + createProposal) doit migrer vers un service dédié `encounterFlow.ts` ou un hook `useCreateEncounter`.

**Risque refacto** : 🟡 moyen — chemin critique de contribution.
**Précautions** :

- Test E2E manuel sur les 3 étapes après chaque PR
- Conserver les invariants : max 4 photos, location requise, status='published' à la création

## RR-6 — Standardiser les modales (11 occurrences)

**Constat** : 11 modales dans le projet (`DeleteConfirmModal`, `LogoutModal`, `ReportModal`, `ContributeModal`, `LocationModal`, `ForYouDiscoveryModal`, `OnboardingExitModal`, `ConfirmModal`, `DeleteAccountModal`, `Modal` base, `EditProfilePanel`).

Deux patterns coexistent :

- `<dialog>` natif (Modal.tsx) avec gestion ESC native
- Wrapper React custom (autres)

**Refacto recommandé** : convergence vers `<ConfirmModal>` ou `<Modal>` avec API uniforme :

```tsx
<Modal open={...} onClose={...} title={...} ariaLabel={...}>
  {children}
</Modal>
```

**Gain** : focus trap centralisé, body overflow géré 1 fois, A11Y cohérente.
**Risque refacto** : 🟡 moyen — touche tous les flows critiques (suppression, déconnexion, signalement).
**Précautions** :

- Migrer **une modale à la fois**
- Tester chaque modale au clavier après migration (Tab, Shift+Tab, Esc)
- Vérifier le focus restoration après fermeture

## RR-7 — Adapter pour `as unknown as` (22 occurrences)

**Constat** : 22 casts `as unknown as` répartis sur 12 fichiers — dont 4 dans `profileService.ts` et 3 dans `postService.ts`.

**Refacto recommandé** : créer des fonctions de coerce avec validation runtime :

```ts
function toProfile(raw: unknown): Profile {
  // Optionnel : Zod validation si on veut être sûr
  return raw as Profile // au moins on a un point de patch unique
}
```

**Gain** : surface de couplage réduite, ajout futur de Zod facile.
**Risque refacto** : 🟢 faible — pas de changement de comportement.
**Précautions** : grep all `as unknown as` pour ne rien manquer.

---

# ⚠️ Risques techniques

## RT-1 — Anti-pattern React 19 dans FeedSection (`:384-399`)

**Constat** : dérivation d'état synchrone dans le render (calcul de `prevTab`, `prevFiltersKey`).
**Risque** : sous React 19 strict mode + concurrent rendering, peut déclencher des warnings ou des renders inattendus.
**Sévérité** : 🟠 grave — bug latent.
**Précaution** : à fixer **avant le découpage RR-4**. Migrer vers `useEffect(() => setPrevX(x), [x])` ou supprimer la dérivation si non nécessaire.

## RT-2 — `Memoization absente` sur callbacks de `FeedPost`

**Constat** : `handleReact` créé à chaque render du parent → 20 instances re-créent leurs callbacks → tous les `FeedPost` se re-rendent.
**Risque** : performance dégradée sur le feed (perceptible mobile bas-de-gamme).
**Sévérité** : 🟡 moyen — perceptible si > 50 posts.
**Précaution** : ajouter `useCallback` côté parent + `React.memo` sur `FeedPost`. Mesurer avec React DevTools Profiler avant/après.

## RT-3 — Mutations sans optimistic update (`useCreatePost`, `useUpdatePost`)

**Constat** : pas de mutation optimiste sur la création/update de post.
**Risque** : décalage UI (le post n'apparaît qu'après le round-trip Supabase).
**Sévérité** : 🟡 moyen.
**Précaution** : facultatif pour MVP, à prévoir Phase 2.

## RT-4 — Drift potentiel `database.ts` ↔ `supabase.ts`

**Constat** : `database.ts` (606 lignes, écrit à la main) coexiste avec `supabase.ts` (généré via `npx supabase gen types`).
**Risque** : si on applique une migration sans regen `supabase.ts`, drift silencieux. Déjà arrivé avec `support_tickets` (cast `any` dans `supportService.ts`).
**Sévérité** : 🟠 grave — corruption de types possible.
**Précaution** :

- Pre-commit hook (lefthook ou husky) qui regénère `supabase.ts` automatiquement après application de migration
- Documenter dans CLAUDE.md la procédure complète : migration → apply → gen types → commit

## RT-5 — Invalidations React Query trop larges

**Constat** :

- `useFeed` invalide `['feed']` → tous les tabs/pages re-fetch
- `useFollow` invalide `['followers']` → toutes les listes followers re-fetch (pas seulement celle concernée)

**Risque** : lag perceptible après chaque action (like, follow, etc.) sur connexion lente.
**Sévérité** : 🟡 moyen.
**Précaution** : à corriger avec RR-2 (centraliser les query keys).

## RT-6 — Edge Function `delete-account` : auth header parsing fragile

**Constat** : la validation JWT se fait via `auth.getUser()` mais le parsing du header Authorization ne valide pas la forme `Bearer <token>` strictement.
**Risque** : 🟢 faible (Supabase gère en interne) mais à confirmer.
**Précaution** : test manuel avec un token mal formé → vérifier que la fonction renvoie une erreur claire et n'exécute aucune action.

## RT-7 — Migration `20260502_settings_phase2_complete` : statut d'application à vérifier

**Constat** : la migration ajoute `notif_frequency`, `support_tickets`, `security_audit_log`, bucket `banners`. Le code l'utilise déjà (avec cast `any` côté `supportService`).
**Risque** : 🔴 critique si non appliquée en prod → toutes les insertions support_tickets échoueront.
**Précaution** :

- Vérifier le statut sur dev / staging / prod via Supabase dashboard avant le prochain release
- Régénérer `supabase.ts` immédiatement après application

## RT-8 — Indexes Postgres potentiellement manquants

**Constat** : `posts(user_id, created_at DESC)` utilisé par `getPostsByUser` — pas d'index dédié vérifié.
**Risque** : query lente sur profil avec beaucoup de posts.
**Sévérité** : 🟡 moyen (pas perceptible en MVP avec peu de data).
**Précaution** : `EXPLAIN ANALYZE` sur les requêtes du feed et du profil avec un dataset réaliste avant la beta publique.

---

# 🧠 Améliorations structurelles

## AS-1 — Architecture : créer `lib/supabaseGuard.ts` + `hooks/queryKeys.ts`

Comme vu dans RR-1 + RR-2. Investissement : 2 jours, gain durable sur l'évolution future.

## AS-2 — Convention nommage : renommer `components/onboarding/index.tsx` en `Onboarding.tsx`

**Constat** : `index.tsx` est un composant orchestrateur, pas un barrel export. Brise la convention : on devrait avoir `Onboarding.tsx` + `index.ts` (barrel).
**Précaution** : refactor simple, mais nombreux imports à mettre à jour. Search & replace.

## AS-3 — Splitter `AuthContext.tsx` (484 lignes)

**Refacto** : extraire `RealAuthProvider` dans `src/contexts/auth/RealAuthProvider.tsx` (le `DemoAuthProvider` peut rester dans le fichier principal car plus court).
**Gain** : isolation logique demo / prod, fichier principal < 200 lignes.
**Précaution** : tests E2E auth (signup, login, signout, refresh) avant + après.

## AS-4 — Extraire les classes Tailwind dupliquées

**Constat** : `INPUT_PILL_CLASS` déjà extrait en `src/styles/inputs.ts` ✅. Probablement d'autres patterns à extraire (cards, badges, chips).
**Précaution** : recenser via `grep` les chaînes de 3+ classes répétées.

## AS-5 — Standardiser le pattern d'erreur services

**Convention proposée** :

- Services qui peuvent rater silencieusement (lecture optionnelle) → `return null`
- Services critiques (mutations, lectures requises) → `throw Error`
- Wrapper `withSupabase` retourne le résultat ou throw

**Gain** : convention claire pour les nouveaux services. Documenté dans CLAUDE.md.

## AS-6 — RLS documenté en JSDoc systématiquement

**Pattern proposé** :

```ts
/**
 * @security RLS : owner-only pour INSERT/UPDATE, SELECT public si visibility='public'
 */
export async function createPost(...) { ... }
```

**Gain** : reviewer comprend instantanément le contrat sécurité. Évite les bugs RLS au prochain refacto.

## AS-7 — Ajouter `gcTime` explicite sur les hooks longue-durée

**Constat** : `gcTime` non override → default 5 min. Posts archivés re-fetch après 5 min même si l'user scrolle.
**Précaution** : passer à 30 min sur les hooks de lecture stables (`usePost`, `useProfile`).

## AS-8 — Pre-commit hook : lint + tsc + prettier

**Constat** : déjà partiellement en place (lint + prettier dans la pipeline lint-staged).
**À ajouter** : `tsc --noEmit` pour bloquer les commits avec erreurs TS.
**Précaution** : pour ne pas ralentir, faire le tsc seulement sur les fichiers touchés (lefthook permet ça).

## AS-9 — Tests E2E Playwright sur les 5 flows critiques

**Couverture cible** :

1. Signup → onboarding → premier post
2. Login → like + save + share
3. Edit profile → modification réelle
4. Création observation 3 étapes complète
5. Suppression compte avec confirmation

**Gain** : sécurise tout le refacto futur (RR-3, RR-4, RR-5 deviennent moins risqués).
**Précaution** : Playwright + un projet Supabase de test isolé. Effort initial : 2 jours.

---

# 🔒 Non-régression — récap par item

## Règles transverses pour tout refacto

| Règle                                                                    | Justification                        |
| ------------------------------------------------------------------------ | ------------------------------------ |
| 1 PR = 1 refacto isolé                                                   | Permet le rollback si régression     |
| Tests E2E AVANT toute extraction de composant                            | Sinon on ne sait pas si on a cassé   |
| Mesure performance AVANT/APRÈS                                           | Surtout pour FeedPost / FeedSection  |
| Conserver les classes Tailwind exactes                                   | Pixel-perfect Figma sensible         |
| Garder l'ancien code en deprecated 1 sprint                              | Permet le retour arrière             |
| Recette manuelle sur les 5 flows critiques avant merge develop           | Auth, post, profil, settings, notifs |
| `prefers-reduced-motion` à respecter sur toutes les nouvelles animations | A11Y obligatoire                     |
| RLS testée avec un autre user                                            | Vérifier qu'on ne fuit rien          |

## Map risque par refacto

| Refacto                | Risque            | Précaution dominante                                 |
| ---------------------- | ----------------- | ---------------------------------------------------- |
| RR-1 helper Supabase   | 🟡 moyen          | 1 service à la fois, garder messages d'erreur exacts |
| RR-2 query keys        | 🟡 moyen          | Mesurer re-fetch avant/après                         |
| RR-3 FeedPost split    | 🔴 élevé          | Tests visuels obligatoires (Chromatic / Playwright)  |
| RR-4 FeedSection split | 🟠 moyen-élevé    | Fixer le bug sync-render d'abord                     |
| RR-5 EncounterForm     | 🟡 moyen          | Tests E2E manuels 3 étapes                           |
| RR-6 modales           | 🟡 moyen          | 1 modale à la fois, test clavier                     |
| RR-7 casts adapter     | 🟢 faible         | Grep exhaustif `as unknown as`                       |
| AS-3 split AuthContext | 🟡 moyen          | Tests E2E auth complets                              |
| AS-9 tests E2E         | 🟢 faible (ajout) | Sandbox Supabase isolé                               |

---

# Plan refacto par étapes (ordre suggéré)

> **Principe** : refactorer **après** la stabilisation Phase 1 + Phase 2 du `PLAN_ACTION.md`, pas pendant. Sinon on cumule les risques.

## Vague 1 — Hygiène (1 semaine, après Phase 1)

| #   | Action                                                                   | Effort |
| --- | ------------------------------------------------------------------------ | ------ |
| 1   | RR-7 : adapter `as unknown as` avec coerce functions                     | 0.5 j  |
| 2   | RR-1 : helper `supabaseGuard.ts` + migration progressive                 | 1.5 j  |
| 3   | CI-2 : supprimer empty state dupliqué Profile (Quick Win QW5 déjà prévu) | 10 min |
| 4   | CI-5 : documenter `eslint-disable` MediaUploader                         | 5 min  |
| 5   | AS-2 : renommer onboarding index.tsx                                     | 30 min |
| 6   | AS-8 : ajouter tsc au pre-commit                                         | 30 min |
| 7   | RT-7 : vérifier statut migration 20260502 partout                        | 1 h    |

## Vague 2 — Foundations React Query (1 semaine, après Phase 2)

| #   | Action                                                | Effort |
| --- | ----------------------------------------------------- | ------ |
| 1   | RR-2 : centraliser query keys + invalidations ciblées | 2 j    |
| 2   | RT-1 : fixer le bug sync-render FeedSection           | 0.5 j  |
| 3   | AS-7 : `gcTime` explicite sur hooks lecture           | 30 min |
| 4   | RT-4 : pre-commit regen supabase.ts                   | 1 h    |
| 5   | AS-6 : JSDoc `@security` sur tous les services        | 0.5 j  |

## Vague 3 — Découpage composants (2-3 semaines)

| #   | Action                                                | Effort |
| --- | ----------------------------------------------------- | ------ |
| 1   | AS-9 : Tests E2E Playwright (préalable indispensable) | 2 j    |
| 2   | RR-3 : FeedPost en sous-composants (3 PRs)            | 2-3 j  |
| 3   | RR-4 : FeedSection split + useFeedFilters             | 1-2 j  |
| 4   | RR-5 : ContributeEncounterForm orchestrateur          | 1 j    |
| 5   | AS-3 : splitter AuthContext                           | 0.5 j  |
| 6   | RR-6 : standardiser modales                           | 1 j    |

## Vague 4 — Optimisations performance (1 semaine, ad-hoc)

| #   | Action                                                  | Effort |
| --- | ------------------------------------------------------- | ------ |
| 1   | RT-2 : memoization FeedPost callbacks                   | 0.5 j  |
| 2   | RT-3 : optimistic updates sur createPost/updatePost     | 0.5 j  |
| 3   | RT-8 : EXPLAIN ANALYZE + ajout index Postgres si besoin | 0.5 j  |
| 4   | AS-4 : extraction classes Tailwind dupliquées           | 1 j    |

**Total** : ~6 semaines de refacto réparties post-stabilisation, en parallèle d'autres features.

---

# Métriques pour mesurer la réussite

| Métrique                          | Avant | Cible             | Outil                    |
| --------------------------------- | ----- | ----------------- | ------------------------ |
| Composants > 200 lignes           | 14    | < 5               | grep + wc -l             |
| `as unknown as`                   | 22    | < 5               | grep                     |
| `if (!supabase) throw`            | 26    | 0                 | grep (helper centralisé) |
| `auth.getUser()` directs          | 12    | < 3               | grep                     |
| Score Lighthouse Performance feed | ?     | > 90              | Lighthouse CI            |
| Score Lighthouse A11Y             | ?     | > 95              | Lighthouse CI            |
| Bundle JS gzip                    | ?     | < 280 KB          | vite build               |
| Couverture E2E                    | 0 %   | 5 flows critiques | Playwright               |
| Time-to-interactive feed          | ?     | < 1.5s            | RUM                      |

---

# Annexes

## A. Top 14 composants > 200 lignes

| Rang | Fichier                       | Lignes |
| ---- | ----------------------------- | ------ |
| 1    | `FeedPost.tsx`                | 756    |
| 2    | `FeedSection.tsx`             | 730    |
| 3    | `ContributeEncounterForm.tsx` | 681    |
| 4    | `OnboardingStep4.tsx`         | 667    |
| 5    | `Settings.tsx` (page)         | 664    |
| 6    | `SettingsPanel.tsx`           | 663    |
| 7    | `SearchPanel.tsx`             | 594    |
| 8    | `EncounterStep3.tsx`          | 574    |
| 9    | `EncounterStep2.tsx`          | 510    |
| 10   | `FeedFilterPanel.tsx`         | 508    |
| 11   | `ProfileMenu.tsx`             | 500    |
| 12   | `PostOptionsMenu.tsx`         | 500    |
| 13   | `AuthContext.tsx`             | 484    |
| 14   | `LocationModal.tsx`           | 462    |
| 14   | `EncounterStep1.tsx`          | 462    |
| 14   | `NotificationsPanel.tsx`      | 460    |

## B. Stats de l'audit

- 26 occurrences `if (!supabase) throw` dans 10 fichiers
- 22 occurrences `as unknown as` dans 12 fichiers
- 12 occurrences `auth.getUser()` directs (hors AuthContext)
- 11 modales différentes (focus trap pas standardisé)
- 57+ TODOs `[BACKEND]` dispersés
- 914 appels `t()` (i18n bien adoptée)
- 0 `console.log` (clean)
- 1 `eslint-disable` non documenté

## C. Outils recommandés pour le refacto

- **Tests visuels** : Playwright (déjà fonctionnel) ou Chromatic
- **Performance** : Lighthouse CI + React DevTools Profiler
- **Bundle analysis** : `vite-bundle-visualizer`
- **Pre-commit** : Lefthook (déjà en place via lint-staged) + tsc
- **Type generation** : `npx supabase gen types typescript`

---

> **Document vivant**. Toute décision de refacto doit être tracée dans le commit message du fix associé. Re-mesurer les métriques à chaque vague.
