# Naturegraph — Audit dette technique globale

> **Version** : 1.0 — 2026-05-04
> **Posture** : staff engineer + tech lead. Dette réelle observée, pas théorique.
> **Source** : inspection complète frontend + backend + DB + tests + CI, après tous les fixes Sprint causes racines (PR #41-#65).
> **Objectif** : base technique saine, sans dette cachée. Roadmap actionable.

---

## TL;DR

Naturegraph a un **socle sain** mais accumule **3 dettes structurelles** qui freinent la vélocité :

1. **14 composants > 200 lignes** — règle CLAUDE.md violée systématiquement
2. **22 casts `as unknown as`** sur 12 fichiers — drift TypeScript ↔ DB silencieux
3. **Tests quasi inexistants** — 3 tests sur 124 composants (2.4% coverage)

**Aucun bloquant fonctionnel** — tous les bugs critiques RC-A à RC-H sont corrigés. C'est de la dette **structurelle** qui rend le code fragile à long terme, pas une crise immédiate.

**Effort total** : ~25 jours dev pour résoudre les 3 dettes principales. Étalable sur 2-3 mois en parallèle des features.

---

# 🔴 CRITIQUES — bloquent l'évolution

## C-1 — Composants obèses (14 fichiers > 200 lignes)

CLAUDE.md exige `composants < 200 lignes`. Réalité observée :

| Fichier                     | Lignes | Excès | Sévérité |
| --------------------------- | ------ | ----- | -------- |
| FeedPost.tsx                | 756    | +278% | 🔴       |
| FeedSection.tsx             | 730    | +265% | 🔴       |
| SettingsPanel.tsx           | 727    | +263% | 🔴       |
| ContributeEncounterForm.tsx | 681    | +240% | 🔴       |
| OnboardingStep4.tsx         | 667    | +233% | 🔴       |
| Settings.tsx (page)         | 664    | +232% | 🔴       |
| SearchPanel.tsx             | 594    | +197% | 🟠       |
| EncounterStep3.tsx          | 574    | +187% | 🟠       |
| EncounterStep2.tsx          | 510    | +155% | 🟠       |
| FeedFilterPanel.tsx         | 508    | +154% | 🟠       |
| ProfileMenu.tsx             | 500    | +150% | 🟠       |
| PostOptionsMenu.tsx         | 500    | +150% | 🟠       |
| LocationModal.tsx           | 462    | +131% | 🟠       |
| NotificationsPanel.tsx      | 460    | +130% | 🟠       |

**Impact** :

- Onboarding nouveau dev : impossible de lire 750 lignes pour comprendre
- Tests : impossible à mocker proprement
- Bugs : surface de régression énorme à chaque changement
- Reviews PR : illisible, biais cognitif (on ne voit pas les bugs)

**Cause racine** : pas de règle de découpage en sub-components. Chaque composant grossit jusqu'à devenir un mini-app.

**Fix structurel** :

- Pattern container/presentational
- Custom hooks pour la logique métier (`useFeedFilters`, `useUploadProgress`)
- Sub-components par section visuelle

## C-2 — TypeScript drift (`as unknown as` partout)

**22 occurrences** de `as unknown as` sur 12 fichiers :

```ts
// src/services/postService.ts
const { data } = await supabase.from('posts')...
return data as unknown as PostFeedItem[]  // 🔴 silencieux, perd toute safety
```

**Cause racine** :

1. `src/types/supabase.ts` (généré) lag sur les migrations DB
2. Vue `posts_public` n'est pas dans le type généré
3. Tables récentes (`support_tickets`, `security_audit_log`, `community_photos`) absentes

**Risque** :

- Renomage colonne DB → 0 erreur TS, crash en runtime
- Suppression table → 0 erreur TS, crash en runtime
- Champ ajouté → invisible côté front (pas typé)

**Fix structurel** :

1. Régénérer `src/types/supabase.ts` après chaque migration : `npx supabase gen types typescript`
2. Adapter pattern : créer `src/types/database.ts` qui étend les types générés avec les vues + tables custom
3. CI check : fail si drift détecté entre `supabase.ts` et migrations

## C-3 — Tests quasi inexistants

| Catégorie            | Tests                       | Total    | Coverage estimée |
| -------------------- | --------------------------- | -------- | ---------------- |
| `src/components/ui/` | 1 (Button)                  | 38       | **3%**           |
| `src/components/*/`  | 0                           | 86       | **0%**           |
| `src/services/`      | 1 (notificationPreferences) | 21       | **5%**           |
| `src/utils/`         | 1 (groupNotifications)      | 11       | **9%**           |
| `src/hooks/`         | 0                           | 25+      | **0%**           |
| **TOTAL**            | **3**                       | **180+** | **~2%**          |

**Conséquence directe** : les bugs récents (display_order, title ignored, edit button, notifications catch-up) auraient été détectés par tests E2E ou unit.

**Risque** :

- Refacto = régression invisible
- PR review = faux sentiment de sécurité
- Bugs en production = découverts par utilisateurs

**Fix structurel** :

1. Vitest setup déjà OK (`src/test/setup.ts`)
2. Ajouter `@testing-library/react` (déjà là)
3. CI gate : coverage > 30% sur `src/services/` et `src/utils/`
4. Tests E2E Playwright : flow critique signup → onboarding → upload → delete

---

# 🟠 IMPORTANT — qualité dégradée

## I-1 — Pattern `if (!supabase) throw` dispersé (26 occurrences)

```ts
// Repeated in 26 places
export async function getFoo() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase non configuré')
  // ...
}
```

**Fix** : helper `requireSupabase()` ou Supabase context provider qui rend cette vérification implicite.

## I-2 — Pattern `getCurrentUser()` dispersé (46 occurrences)

```ts
const {
  data: { user },
} = await supabase.auth.getUser()
if (!user) throw new Error('Auth required')
```

**Fix** : hook `useRequiredUser()` ou helper `getRequiredUser()`.

## I-3 — Invalidations React Query trop larges

```ts
queryClient.invalidateQueries({ queryKey: ['feed'] }) // re-fetch TOUT le feed
```

**Impact perf** : refetch global au lieu de ciblé.

**Fix** : invalidations par variants (`['feed', 'recent', userId]`) + `invalidateQueries({ queryKey: ['feed'], exact: false })`.

## I-4 — TODOs `[BACKEND]` non tracés (57+ occurrences)

Code review montre `TODO [BACKEND]` partout sans :

- Issue Linear/GitHub
- Date de création
- Owner

**Fix** : convention `TODO(YYYY-MM-DD, owner, #issue): description`.

## I-5 — Forms sans validation schema

Chaque formulaire (Onboarding, Encounter, Settings) a sa propre logique :

- `useState` + validation custom
- Pas de schema partagé
- Erreurs gérées différemment

**Fix Phase 2** : `react-hook-form` + `zod`, pattern unique.

## I-6 — Storage policies non testées

Buckets Supabase :

- `avatars` (public read, owner write)
- `post-media` (public read, owner write)
- `banners` (récent, idem)
- `exports` (signed URL only)

Aucun test automatisé pour vérifier que les policies bloquent les accès non autorisés.

**Fix** : suite de tests qui essaie d'uploader/télécharger en tant que non-auth + non-owner.

## I-7 — Accessibilité incomplète

Audit AUDIT_FLOWS.md liste plusieurs WCAG fails :

- A1 : Onboarding multi-select sans `role="group"` + `aria-pressed`
- A2 : OTP form 6 inputs sans `aria-label` + `autocomplete="one-time-code"`
- A3 : OTP timer sans `aria-live`
- A4 : FAQ accordion `aria-expanded` à confirmer
- A5 : Burger menu mobile sans `aria-label`
- A6 : Focus trap modals à confirmer (boucle complète)
- A7 : Step indicator onboarding sans `aria-current="step"`

**Fix Phase 2** : 1 jour audit + correction.

---

# 🟡 OPTIMISATIONS — perf & éco

## O-1 — Compression image client absente

`mediaService.uploadPostMedia` upload directement sans compression. Si user uploade 12MP photo de 4 MB → upload de 4 MB direct.

**Fix** : `compressPhoto.ts` existe déjà ! Utilisé dans ContributeEncounterForm mais pas dans avatars/banners.

## O-2 — Pas de WebP conversion client

Toutes les uploads restent en JPEG. WebP réduit -30% le poids.

**Fix Phase 2** : convertir en WebP côté client avant upload. `compressPhoto.ts` peut le faire facilement.

## O-3 — Hero mouse tracking sans throttle

`Landing/Hero.tsx:180` track mouse position 60 fps sans debounce/throttle.

**Impact** : batterie mobile + CPU desktop bas de gamme.

**Fix** : throttle à 30 fps avec `requestAnimationFrame`.

## O-4 — StatsSidebar dans le bundle même mobile

`StatsSidebar` (311 lignes) dans le bundle initial même sur mobile où elle n'est jamais affichée.

**Fix** : lazy import conditional (`if (window.innerWidth > 768)`) ou pure CSS responsive.

## O-5 — `useFollowers` + `useFollowing` chargés en parallèle

Sur Profile page, les 2 hooks fire en parallèle même si l'onglet "Communauté" n'est pas actif.

**Fix** : lazy load hook au switch de tab.

## O-6 — Banned-usernames en dur (~436 entrées)

`OnboardingStep4.tsx` importe une liste de 436 usernames bannis directement → +5 KB bundle.

**Fix** : déplacer côté serveur (Supabase RPC ou Edge Function), check à la soumission.

## O-7 — Bundle 325 KB gzip total (limite éco)

Budget actuel : 325 KB. Cible idéale : 250 KB (cf. GUIDELINES.md).

**Optimisations possibles** :

- Code-split routes Auth (200ms gain LCP)
- Dynamic import Leaflet (60 KB économisés sur les pages sans carte)
- Tree-shake lucide-react (importer seulement les icons utilisés)

---

# 🧭 Roadmap dette technique

## Phase 1 — Quick Wins (1 semaine, gain immédiat)

**But** : résoudre les optimisations isolées sans refacto profond.

| #   | Action                                  | Effort | Gain                            |
| --- | --------------------------------------- | ------ | ------------------------------- |
| 1   | Régénérer `supabase.ts` + fix les casts | 4h     | -22 occurrences `as unknown as` |
| 2   | Helper `requireSupabase()`              | 2h     | -26 occurrences pattern         |
| 3   | Throttle Hero mouse tracking            | 30 min | UX mobile + batterie            |
| 4   | Lazy import StatsSidebar                | 1h     | -2 KB bundle mobile             |
| 5   | Tree-shake lucide-react                 | 2h     | -8 KB bundle                    |
| 6   | Compression images avatars              | 2h     | -50% upload size                |
| 7   | Convention TODO avec issue              | 1h     | Tracking dette                  |

**Total** : ~13h = 2 jours dev

## Phase 2 — Refonte composants critiques (10 jours)

**But** : passer les 5 composants les plus gros sous la barre des 200 lignes.

| Composant                     | Plan                                                         | Effort |
| ----------------------------- | ------------------------------------------------------------ | ------ |
| FeedPost (756)                | Sub-components Header/Content/Actions/Meta + hooks reactions | 2j     |
| FeedSection (730)             | Container/Presentational + `useFeedFilters` hook             | 2j     |
| SettingsPanel (727)           | 4 sous-composants par section + nav controlled               | 2j     |
| ContributeEncounterForm (681) | FormProvider + sub-steps autonomes                           | 2j     |
| OnboardingStep4 (667)         | Extraire UsernameValidator + BannedCheck                     | 2j     |

**Total** : 10 jours dev

## Phase 3 — Tests + tooling (5 jours)

**But** : filet de sécurité avant les refacto futurs.

1. Setup Vitest + RTL (1j) — déjà en place
2. Tests unitaires services (`postService`, `mediaService`, `notificationService`) — 1j
3. Tests utils (`stripExif`, `compressPhoto`, `extractPhotoMetadata`) — 1j
4. Tests E2E Playwright critical path : signup → onboarding → upload → delete — 2j

**Coverage cible post-Phase 3** : 30% global, 60% sur services + utils.

## Phase 4 — Storybook + DS (sprint dédié)

Cf. `STORYBOOK_STRATEGY.md` — 8 jours.

## Phase 5 — Forms unification (3 jours)

Migration progressive vers `react-hook-form` + `zod` :

- Onboarding (1j)
- Encounter (1j)
- Settings (1j)

## Phase 6 — A11Y compliance WCAG AA (1 jour)

Fix les 7 manquements identifiés dans AUDIT_FLOWS.md A1-A7.

## Phase 7 — Perf optimizations (2 jours)

- Code-split routes Auth/Profile/Settings (1j)
- Dynamic import Leaflet (4h)
- Banned usernames côté serveur (4h)

---

# 📊 Estimation effort total

| Phase                | Effort       | Délai calendaire |
| -------------------- | ------------ | ---------------- |
| Phase 1 (Quick Wins) | 2j           | 1 semaine        |
| Phase 2 (Refacto)    | 10j          | 3 semaines       |
| Phase 3 (Tests)      | 5j           | 2 semaines       |
| Phase 4 (Storybook)  | 8j           | 3 semaines       |
| Phase 5 (Forms)      | 3j           | 1 semaine        |
| Phase 6 (A11Y)       | 1j           | 1 jour           |
| Phase 7 (Perf)       | 2j           | 1 semaine        |
| **TOTAL**            | **31 jours** | **~10 semaines** |

→ Étalable sur **2.5 mois** en parallèle des features.

→ **Phase 1 + 6 livrables avant beta publique** (priorité absolue).

---

# 🎯 Critères de succès post-roadmap

✅ Tous les composants < 200 lignes
✅ 0 occurrence `as unknown as` (types stricts)
✅ Coverage > 30% global, > 60% services
✅ A11Y WCAG AA compliant
✅ Bundle < 280 KB gzip
✅ Storybook 38 primitives + 12 features
✅ Forms unifiés (react-hook-form + zod)
✅ CI gate : tests + lint + typecheck + bundle budget

---

# 📎 Références croisées

- `docs/SYNTHESE_AUDITS.md` — RC-A à RC-G (causes racines déjà résolues)
- `docs/SYNTHESE_GIT.md` — RC-H Git process
- `docs/AUDIT_DESIGN_SYSTEM.md` — DS audit complémentaire
- `docs/STORYBOOK_STRATEGY.md` — Phase 4 détaillée
- `docs/AUDIT_PERFORMANCE.md` — perf détails
- `docs/AUDIT_FLOWS.md` — A1-A7 a11y manquements
- `docs/AUDIT_TECHNIQUE.md` — version v1.0 (cet audit est la version v2 post-fixes)
- `CLAUDE.md` — règles obligatoires (composants < 200 lignes, tests, etc.)
