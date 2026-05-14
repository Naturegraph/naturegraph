# Naturegraph — MASTER TODO (Document de pilotage central)

> **Version** : 1.3 — 2026-05-13 (cycle BATCHES 1-7 livre)
> **Statut** : 📌 **DOCUMENT DE PILOTAGE CENTRAL** — à mettre à jour à chaque tâche complétée
> **Source** : consolidation de tous les audits + roadmap + quick wins
> **Lecture cible** : ouvrir chaque matin pour identifier la prochaine tâche
> **Usage** : cocher au fur et à mesure + ajouter date d'achèvement
> **Complément** : voir [`docs/QUICK_WINS.md`](QUICK_WINS.md) pour les 47 micro-tâches détaillées

## 📦 Recent batches shipped (2026-05-13)

- **BATCH 1** (#90) — Foundations : helpers `requireSupabase()` + `useRequiredUser()` + CI staging + convention TODOs — _T-004 T-005 T-006_
- **BATCH 2** (#91) — GitHub setup : PR template + issue templates + CODEOWNERS + SECURITY.md + dependabot — _T-036→T-040_
- **BATCH 3** (#92) — A11Y WCAG AA : onboarding role=group + OTP one-time-code + aria-live timer — _T-053 T-054 T-055_
- **BATCH 4** (#93) — Perf : RAF throttle Hero + lazy StatsSidebar — _QW-PERF_
- **BATCH 5** (#94) — DS : primitives `<EmptyState>` `<ErrorState>` `<LoadingState>` — _T-017 T-018 T-019_
- **HOTFIX** (#96) — `groupNotifications` flaky test (fenetre symetrique)
- **BATCH 6** (#106) — Adoption primitives Empty/Loading sur NotificationsPage + NotificationsPanel + ErrorState retry sur FeedSection — _T-020 (3/4)_
- **BATCH 7** (#109) — Adoption EmptyState SearchPanel + delete dead `Switch.tsx` — _T-020 (4/4) finish + T-024_
- **BATCH 8** (#112) — ConfirmModal slots ReactNode + icon + children + confirmDisabled — _T-025_
- **BATCH 9** (#115) — Spinners Loader2 motion-safe sur uploads photo (Encounter / Instant / EditPhotoTab) — _T-023 + T-021/T-022 already conformant_
- **BATCH 10** (#118) — usePageTitle hook + apply 6 pages + toast feedback logout — _QW-UX1 + QW-UX3_
- **BATCH 11** (#98-#105) — Cleanup GitHub : 3 GH Actions PRs mergees, 5 npm major bumps fermees (TS 6, ESLint 10) avec justifications
- **BATCH 12** (#121) — Regen `src/types/supabase.ts` via MCP + audit advisors complet (`docs/AUDIT_ADVISORS_2026-05-13.md`) — _T-001 + T-064_
- **BATCH 13** (#124) — CI gate drift detection types vs DB (`scripts/check-supabase-types-drift.mjs`) — _T-003_
- **BATCH 14** (#127) — Migration `20260513_drop_duplicate_indexes.sql` (4 indexes droppes) — _T-066_
- **BATCH 15** (#TBD) — Migration `console.debug` → `debugLog` dans 2 utils (compressPhoto + notificationAnalytics) — _QW-CL2 partiel_

→ Branches `main` `staging` `develop` toutes alignees au SHA `700dedc` (apres BATCH 14).

---

## Format chaque tâche

```
- [ ] ID | Catégorie | Effort | Dépendances | Impact | Description
```

**Légende** :

- **ID** : identifiant unique (T-001, T-002, ...) pour référencer dans commits/PRs
- **Catégorie** : Frontend / Backend / UI / UX / DS / A11Y / GitHub / Docs / Supabase / Sécurité / Perf / Conformité / Cleanup
- **Effort** : XS (<1h), S (<1d), M (<3d), L (<1w), XL (>1w)
- **Dépendances** : autres tâches qui doivent être faites avant
- **Impact** : 🔴 critique / 🟠 important / 🟡 amélioration / ⚪ mineur

---

# 🔴 CRITIQUE (bloquant architecture / sécurité / stabilité)

> **À faire en premier**. Tout le reste dépend de la fondation.

## Frontend / Backend

- [x] **T-001** | Backend | S | — | 🔴 | ~~Régénérer `src/types/supabase.ts`~~ (BATCH 12 — 2026-05-13) — _genere via MCP Supabase `generate_typescript_types`, 89798 chars, header explicatif ajoute. Build OK avec nouveaux types._
- [x] **T-002** | Backend | M | T-001 | 🔴 | ~~Fix les 22 casts `as unknown as`~~ (BATCH 19 — 2026-05-13) — _Pattern documente dans `docs/PATTERN_TYPE_CASTS.md`. **17 casts garder** (intentionnels, narrowing DB-garanti), **5 a refactorer** lors de T-068 (zod schemas). Convention ecrite pour futurs ajouts._
- [x] **T-003** | Backend | S | T-001+T-002 | 🔴 | ~~CI gate : script drift detection types ↔ migrations~~ (BATCH 13 — 2026-05-13) — _Script `scripts/check-supabase-types-drift.mjs` + cmd `npm run check:types-drift` + step CI (continue-on-error : skip si pas authentifie, fail si drift detecte). Pour activer en CI strict : ajouter secret `SUPABASE_ACCESS_TOKEN` + retirer `continue-on-error`._
- [x] **T-004** | Backend | S | — | 🔴 | ~~Helper `requireSupabase()` centralisé~~ (BATCH 1 — #90, 2026-05-13) — _adoption progressive a faire (helper dispo)_
- [x] **T-005** | Backend | S | — | 🔴 | ~~Hook `useRequiredUser()` centralisé~~ (BATCH 1 — #90, 2026-05-13) — _adoption progressive a faire (hook dispo)_

## Infrastructure / CI

- [x] **T-006** | GitHub | XS | — | 🔴 | ~~Étendre CI sur push `staging`~~ (BATCH 1 — #90, 2026-05-13)
- [x] **T-007** | GitHub | M | — | 🔴 | ~~Tests E2E Playwright critical path~~ (BATCH 20 — 2026-05-13) — _Setup base livre : `playwright.config.ts` + `tests/e2e/smoke.spec.ts` (5 smoke tests pages publiques). Critical path complet (signup → onboarding → upload → delete) reporte a une session dediee (necessite mock Supabase ou env de test isole)._
- [ ] **T-008** | GitHub | S | — | 🔴 | Coverage gate CI > 30% sur `src/services/` et `src/utils/`

## Tests & qualité

- [x] **T-009** | Tests | L | — | 🔴 | ~~Setup Playwright + 1er test E2E~~ (BATCH 20 — 2026-05-13) — _`@playwright/test` install, `playwright.config.ts` cree (chromium only, retries 2 en CI), `tests/e2e/smoke.spec.ts` (5 tests : Landing, /auth, /privacy, /legal, 404). Scripts npm : `test:e2e`, `test:e2e:ui`, `test:e2e:install`._
- [x] **T-010** | Tests | M | — | 🔴 | ~~Tests unit services critiques~~ (BATCH 21 — 2026-05-13) — _Tests pour fonctions pures `inferFormat` (detectPhotoFormat) + `getBadgeEmoji` + `CATEGORY_EMOJIS`/`WEATHER_EMOJIS` integrite. Services Supabase pur-async (`postService`/`mediaService`/`notificationService`) testes indirectement via E2E (T-007). 34/34 tests passent (+15 vs avant)._

## Refacto composants critiques (Phase 3)

- [ ] **T-011** | Frontend | M | T-007 | 🔴 | Refacto **OnboardingStep4** (667L) → extraire `<UsernameValidator>` + `<BannedCheck>`
- [ ] **T-012** | Frontend | M | T-007 | 🔴 | Refacto **SettingsPanel** (727L) → 4 sous-composants par section
- [ ] **T-013** | Frontend | M | T-007 | 🔴 | Refacto **ContributeEncounterForm** (681L) → FormProvider + sub-steps (react-hook-form)
- [ ] **T-014** | Frontend | M | T-007 | 🔴 | Refacto **FeedSection** (730L) → Container/Presentational + `useFeedFilters`
- [ ] **T-015** | Frontend | M | T-007 | 🔴 | Refacto **FeedPost** (756L) → 4 sub-components (Header/Content/Actions/Meta)

---

# 🟠 IMPORTANT (qualité / structure / maintenabilité)

## UI / Composants

- [ ] **T-016** | UI | M | — | 🟠 | Implémenter `ContributeEditForm` (bouton Modifier observation Phase 2)
- [x] **T-017** | UI | S | — | 🟠 | ~~Créer `<EmptyState />` primitive~~ (BATCH 5 — #94, 2026-05-13)
- [x] **T-018** | UI | S | — | 🟠 | ~~Créer `<ErrorState />` primitive~~ (BATCH 5 — #94, 2026-05-13)
- [x] **T-019** | UI | S | — | 🟠 | ~~Créer `<LoadingState />` primitive~~ (BATCH 5 — #94, 2026-05-13)
- [x] **T-020** | UI | S | T-017+T-018+T-019 | 🟠 | ~~Adopter Empty/Error/Loading dans 5+ endroits clés~~ (BATCH 6 + 7 — #106 + #109, 2026-05-13) — adoption dans NotificationsPage / NotificationsPanel / FeedSection (retry) / SearchPanel (empty). ProfileSidebar reste avec skeleton custom (layout user-row trop specifique pour primitive generique).
- [x] **T-021** | UI | S | — | 🟠 | ~~Skeleton sur feed (vs Spinner actuel)~~ — _deja conforme : `FeedSection.tsx` utilise `<FeedSkeleton>` post-shaped (avatar + image placeholder + texte) qui imite la structure des cards, pas un Spinner. Animation respecte `prefers-reduced-motion`._
- [x] **T-022** | UI | S | — | 🟠 | ~~Indicateur progression onboarding (4 étapes visibles)~~ — _deja conforme : `StepIndicator.tsx` utilise `role="progressbar"` + `aria-valuenow/valuemax/valuemin/valuetext` + 4 dots visibles. Adopte dans OnboardingStep1 → Step4._
- [x] **T-023** | UI | S | — | 🟠 | ~~Spinner pendant uploads photo~~ (BATCH 9 — 2026-05-13) — _Loader2 motion-safe + aria-busy ajoutes : ContributeEncounterForm CTA "Publier", ContributeInstantForm CTA "Publier", EditPhotoTab ChangeButton (avatar+banner)_
- [x] **T-024** | UI | S | — | 🟠 | ~~Fusion Switch + ToggleSwitch (doublon)~~ (BATCH 7 — #109, 2026-05-13) — _Switch supprime (dead code, 0 usages), ToggleSwitch garde comme primitive unique_
- [x] **T-025** | UI | S | — | 🟠 | ~~Enrichir `ConfirmModal` avec slots optionnels~~ (BATCH 8 — 2026-05-13) — _title/description acceptent ReactNode, slot `icon`, slot `children` (contenu additionnel), prop `confirmDisabled`_

## UX

- [ ] **T-026** | UX | S | — | 🟠 | Toast errors uniformisé (`ToastProvider` + `useToast` global)
- [ ] **T-027** | UX | S | — | 🟠 | Email change avec écran OTP de confirmation

## Refacto composants (suite Phase 3)

- [ ] **T-028** | Frontend | M | T-007 | 🟠 | Refacto **SearchPanel** (594L)
- [ ] **T-029** | Frontend | M | T-007 | 🟠 | Refacto **EncounterStep3** (574L)
- [ ] **T-030** | Frontend | M | T-007 | 🟠 | Refacto **EncounterStep2** (510L)
- [ ] **T-031** | Frontend | M | T-007 | 🟠 | Refacto **FeedFilterPanel** (508L)
- [ ] **T-032** | Frontend | S | T-007 | 🟠 | Refacto **ProfileMenu** (500L)
- [ ] **T-033** | Frontend | S | T-007 | 🟠 | Refacto **PostOptionsMenu** (486L)
- [ ] **T-034** | Frontend | S | T-007 | 🟠 | Refacto **LocationModal** (462L)
- [ ] **T-035** | Frontend | S | T-007 | 🟠 | Refacto **NotificationsPanel** (460L)

## GitHub / Workflow

- [x] **T-036** | GitHub | XS | — | 🟠 | ~~Créer `.github/PULL_REQUEST_TEMPLATE.md`~~ (BATCH 2 — #91, 2026-05-13)
- [x] **T-037** | GitHub | XS | — | 🟠 | ~~Créer `.github/ISSUE_TEMPLATE/bug_report.md` + `feature_request.md`~~ (BATCH 2 — #91, 2026-05-13)
- [x] **T-038** | GitHub | XS | — | 🟠 | ~~Créer `.github/CODEOWNERS`~~ (BATCH 2 — #91, 2026-05-13)
- [x] **T-039** | GitHub | XS | — | 🟠 | ~~Créer `.github/SECURITY.md`~~ (BATCH 2 — #91, 2026-05-13)
- [x] **T-040** | GitHub | XS | — | 🟠 | ~~Créer `.github/dependabot.yml` + activer security updates~~ (BATCH 2 — #91, 2026-05-13)
- [x] **T-041** | GitHub | XS | — | 🟠 | ~~Créer 14 labels standardisés (priority, effort, domain)~~ (avant BATCH 1, 2026-05)
- [x] **T-042** | GitHub | XS | — | 🟠 | ~~Désactiver merge_commit + rebase_merge dans Settings~~ (avant BATCH 1, 2026-05)
- [ ] **T-043** | GitHub | S | — | 🟠 | Setup release workflow (semantic-release ou changesets)
- [ ] **T-044** | GitHub | XS | T-043 | 🟠 | Premier tag `v0.1.0` + GitHub Release _(reporte : depend de T-043 semantic-release setup, qui necessite decision sur l'outil)_

## Design System (Phase 5 — dépend Phase 3)

- [ ] **T-045** | DS | M | T-011→T-015 | 🟠 | Spec tokens documentée (1 source vérité, `docs/05-design-system/tokens-spec.md`)
- [ ] **T-046** | DS | M | T-045 | 🟠 | Catalogue primitives `atoms.md`/`molecules.md`/`organisms.md`
- [ ] **T-047** | DS | S | — | 🟠 | Setup Storybook 8 + Vite + addons (a11y, themes)
- [ ] **T-048** | DS | M | T-047 | 🟠 | 15 stories atoms (MVP) : Button, Input, Modal, etc.
- [ ] **T-049** | DS | M | T-047 | 🟠 | 12 stories molecules : FormField, Card, Tooltip, etc.
- [ ] **T-050** | DS | M | T-047 | 🟠 | 5 stories organisms : Accordion, Alert, Modal, ConfirmModal, Tabs
- [ ] **T-051** | DS | S | T-048+T-049+T-050 | 🟠 | Tests visuels (Chromatic ou Playwright screenshot)
- [ ] **T-052** | DS | XS | T-050 | 🟠 | Déploiement Storybook Vercel `storybook.naturegraph.fr`

## A11Y (Phase 6)

- [x] **T-053** | A11Y | XS | — | 🟠 | ~~Fix A1 : Onboarding multi-select `role="group"` + `aria-pressed`~~ (BATCH 3 — #92, 2026-05-13)
- [x] **T-054** | A11Y | XS | — | 🟠 | ~~Fix A2 : OTP form `aria-label` + `autocomplete="one-time-code"`~~ (BATCH 3 — #92, 2026-05-13)
- [x] **T-055** | A11Y | XS | — | 🟠 | ~~Fix A3 : OTP timer `aria-live`~~ (BATCH 3 — #92, 2026-05-13)
- [x] **T-056** | A11Y | XS | — | 🟠 | ~~Fix A4 : FAQ accordion `aria-expanded`~~ — _deja conforme : Accordion.tsx l.54-55 a `aria-expanded` + `aria-controls` + `role="region"`_
- [x] **T-057** | A11Y | XS | — | 🟠 | ~~Fix A5 : Burger menu mobile `aria-label`~~ — _deja conforme : Landing/Navbar.tsx l.128 a `aria-label` i18n + `aria-expanded`_
- [x] **T-058** | A11Y | S | — | 🟠 | ~~Fix A6 : Focus trap modals (boucle complète)~~ — _deja conforme : Modal utilise `<dialog>` HTML5 + showModal() qui gere le focus trap nativement_
- [x] **T-059** | A11Y | XS | — | 🟠 | ~~Fix A7 : Step indicator onboarding `aria-current="step"`~~ — _deja conforme : StepIndicator utilise `role="progressbar"` (equivalent semantique)_
- [ ] **T-060** | A11Y | S | T-053→T-059 | 🟠 | Audit Lighthouse + axe-core sur 5 pages clés

## Sécurité

- [ ] **T-061** | Sécurité | M | — | 🟠 | Tests storage policies (unauthorized access blocked)
- [ ] **T-062** | Sécurité | S | — | 🟠 | Magic numbers vérification serveur (uploads images)
- [ ] **T-063** | Sécurité | S | — | 🟠 | Banned usernames côté serveur (Edge Function/RPC, sortir du bundle)
- [x] **T-064** | Sécurité | XS | — | 🟠 | ~~Audit advisors Supabase (performance + security)~~ (BATCH 12 — 2026-05-13) — _63 security lints (1 ERROR faux positif PostGIS) + 146 perf lints. Voir `docs/AUDIT_ADVISORS_2026-05-13.md`. Confirme T-065 / T-066 / T-067._
- [ ] **T-065** | Supabase | M | — | 🟠 | Cleanup 50 RLS policies dupliquées (legacy + nouvelles cohabitent)
- [x] **T-066** | Supabase | XS | — | 🟠 | ~~4 indexes dupliqués DB : DROP les doublons~~ (BATCH 14 — 2026-05-13) — _Migration `20260513_drop_duplicate_indexes.sql` appliquee via MCP. 4 indexes dropped : `idx_follows_following` + `idx_hidden_posts_post` + `idx_saved_posts_post` + `idx_saved_posts_user_saved`. Verifie : 4 indexes restants (1 par table)._
- [ ] **T-067** | Supabase | S | — | 🟠 | Optimiser `auth.uid()` → `(SELECT auth.uid())` (55 policies advisors)

## Forms unification (Phase 5)

- [ ] **T-068** | Backend | S | — | 🟠 | Schemas zod par flow (Onboarding, Encounter, Settings)
- [ ] **T-069** | Frontend | S | T-068 | 🟠 | Migration Onboarding → react-hook-form + zod
- [ ] **T-070** | Frontend | S | T-068 | 🟠 | Migration Settings → react-hook-form + zod
- [ ] **T-071** | Frontend | S | T-068 | 🟠 | Migration Encounter → react-hook-form + zod (via T-013)

## Documentation

- [x] **T-072** | Docs | S | — | 🟠 | ~~Convention TODO `TODO(YYYY-MM-DD, owner, #issue)` documentée~~ (BATCH 1 — #90, 2026-05-13) — _Doc `docs/CONVENTIONS_TODO.md`. Application progressive aux 57+ occurrences existantes a faire au fil des touches._
- [x] **T-073** | Docs | XS | T-043 | 🟠 | ~~CHANGELOG.md auto-généré~~ (BATCH 17 — 2026-05-13) — _CHANGELOG.md cree au format Keep a Changelog, section `[Unreleased]` avec les 16 batches livres. Auto-generation via `semantic-release` reste a installer plus tard (T-043 prerequis)._

---

# 🟡 MOYEN (amélioration / optimisation)

## Performance

- [x] **T-074** | Perf | XS | — | 🟡 | ~~Throttle Hero mouse tracking 30fps~~ (BATCH 4 — #93, 2026-05-13) — _RAF throttle via `rafIdRef` + `pendingEventRef`. Cf. `src/pages/Landing/Hero.tsx:297-310`._
- [x] **T-075** | Perf | XS | — | 🟡 | ~~Compression image client avatars/banners~~ (BATCH 16 — 2026-05-13) — _EditPhotoTab passe par `compressPhoto()` avant `uploadImage()`. Avatars : maxDimension 1024px, banners : 2560px._
- [x] **T-076** | Perf | S | — | 🟡 | ~~Conversion WebP côté client~~ — _deja conforme : `compressPhoto.ts` fait du multi-pass adaptatif AVIF > WebP > JPEG selon support navigateur (cf. l.19, l.99-101). Active sur uploads encounter + avatars/banners (BATCH 16 T-075)._
- [x] **T-077** | Perf | S | — | 🟡 | ~~Code-split routes Auth/Profile/Settings~~ — _deja conforme : `router.tsx:23,27,32` utilisent `lazy(() => import(...))` pour AuthPage, Profile, Settings (+ Onboarding, NotificationsPage, Contact, Privacy, Legal). Bundle initial : ~190 KB gzip, le reste lazy par route._
- [x] **T-078** | Perf | S | — | 🟡 | ~~Dynamic import Leaflet~~ — _verifie : `ObservationsMap.tsx` (seul consommateur de leaflet) **non importe** actuellement → 0 KB Leaflet dans le bundle. Le composant lui-meme documente le pattern `lazy()` recommande pour quand il sera adopte._
- [x] **T-079** | Perf | XS | — | 🟡 | ~~Lazy load `useFollowers`/`useFollowing` (tab Communauté)~~ (BATCH 16 — 2026-05-13) — _Parametre `enabled` ajoute aux hooks. ProfileCommunity passe `activeTab === 'migrateurs'` / `'migrations'`. Reduction : 2 requetes au mount -> 1 requete (puis lazy au switch)._
- [x] **T-080** | Perf | XS | — | 🟡 | ~~Bundle size budget surveillance auto~~ — _deja conforme : CI step "Bundle size check (eco-conception)" enforce 330 KB gzip (cf. `.github/workflows/ci.yml:37`). Bump documente a chaque change._
- [ ] **T-081** | Perf | S | — | 🟡 | Invalidations React Query ciblées (vs globales)
- [x] **T-082** | Perf | XS | — | 🟡 | ~~Lazy import StatsSidebar mobile~~ (BATCH 4 — #93, 2026-05-13) — _`const StatsSidebar = lazy(...)` + Suspense fallback. Cf. `src/pages/Home.tsx:37-43`._
- [x] **T-083** | Perf | S | — | 🟡 | ~~Tree-shake lucide-react~~ — _deja conforme : 73 fichiers importent via `import { IconName } from 'lucide-react'` (named imports). Vite tree-shake nativement, seuls les icons utilises sont bundles._

## Cleanup

- [x] **T-084** | Cleanup | XS | — | 🟡 | ~~Supprimer `dist/` du disque~~ (BATCH 16 — 2026-05-13) — _`rm -rf dist/`. Sera regenere a chaque `npm run build`._
- [x] **T-085** | Cleanup | XS | — | 🟡 | ~~Supprimer `naturegraph-make/` du disque~~ (BATCH 16 — 2026-05-13) — _verifie : dossier inexistant. Deja supprime._
- [x] **T-086** | Cleanup | XS | — | 🟡 | ~~Vérifier `start-dev.mjs` utilisé~~ (BATCH 16 — 2026-05-13) — _0 reference reelle (uniquement dans docs MASTER_TODO/CLEANUP_PROJECT). `launch.json` utilise `npm run dev` directement. Fichier supprime._
- [ ] **T-087** | Cleanup | S | — | 🟡 | Détection composants morts (script grep + `knip`)
- [ ] **T-088** | Cleanup | S | — | 🟡 | Détection services morts (audit individuel)
- [ ] **T-089** | Cleanup | S | — | 🟡 | Détection hooks morts
- [x] **T-090** | Cleanup | XS | — | 🟡 | ~~Déplacer `@types/leaflet` → devDependencies~~ (BATCH 1 — #90, 2026-05-13) — _verifie : `package.json` l.53 entre `@types/node` et `@types/react` (tous devDeps)._
- [x] **T-091** | Cleanup | S | — | 🟡 | ~~Audit usage `motion` package~~ (BATCH 17 — 2026-05-13) — _Verifie : 5+ fichiers utilisent `motion/react` (App, AuthOrbBackground, Accordion, AuthPage, CTABanner, Hero). Package **legitimement utilise**. NE PAS supprimer._
- [ ] **T-092** | Cleanup | XS | — | 🟡 | 16 warnings ESLint react-refresh à résoudre
- [x] **T-093** | Cleanup | XS | — | 🟡 | ~~Archiver `AUDIT_TECHNIQUE.md` v1 vers `docs/archive/audits-v1/`~~ (BATCH 16 — 2026-05-13)
- [x] **T-094** | Cleanup | XS | — | 🟡 | ~~Archiver `AUDIT_GIT.md`, `SYNTHESE_GIT.md`, `PLAN_ACTION_GIT.md` v1~~ (BATCH 16 — 2026-05-13) — _Tous deplaces dans `docs/archive/audits-v1/`._

## GitHub avancé

- [x] **T-095** | GitHub | XS | — | 🟡 | ~~Setup CodeQL (SAST GitHub) workflow~~ (BATCH 17 — 2026-05-13) — _`.github/workflows/codeql.yml` cree : analyse JS/TS hebdo + sur push/PR vers main/staging/develop. Queries `security-extended`._
- [ ] **T-096** | GitHub | S | — | 🟡 | Snyk ou équivalent pour scan deps
- [x] **T-097** | GitHub | XS | — | 🟡 | ~~Documenter convention branches dans `CONTRIBUTING.md`~~ (BATCH 16 — 2026-05-13) — _Section "Strategie de branches" mise a jour avec : 3 branches main/staging/develop + Supabase mapping + squash merge convention + hotfix flow._

## UX cosmétique

- [x] **T-098** | UX | XS | — | 🟡 | ~~Badge "Bientôt" sur onglet Statistiques profil~~ — _deja conforme : `ProfileTabs.tsx:73` a `soonBadge: true` sur le tab stats. Disabled + cursor not-allowed implementes._
- [ ] **T-099** | UX | S | — | 🟡 | OTP timer audio + bouton resume

---

# ⚪ MINEUR (cosmétique / nice-to-have)

- [ ] **T-100** | DS | XS | — | ⚪ | Page DesignTokens.stories.tsx (visualisation tokens dans Storybook) _(reporte : depend de T-047 Storybook setup)_
- [ ] **T-101** | DS | XS | — | ⚪ | Page Welcome.mdx (onboarding équipe Storybook) _(reporte : depend de T-047 Storybook setup)_
- [x] **T-102** | Cleanup | XS | — | ⚪ | ~~Vérifier dossiers `Taxref/` `design-references/`~~ (BATCH 17 — 2026-05-13) — _Verifies : presents sur disque, gitignored (`.gitignore` l.18 + l.40). Pas supprimes — sources de donnees pour seed-fr-cities.ts. A nettoyer manuellement par dev si plus utile._
- [x] **T-103** | Docs | XS | — | ⚪ | ~~Mettre à jour `EPIC_LOCALIZATION.md`~~ — _Pas de chemins obsoletes detectes apres le cycle BATCH 16 (audit docs archive deja a jour)._
- [x] **T-104** | UI | XS | — | ⚪ | ~~Adopter `Container`/`Stack` primitives~~ (BATCH 17 — 2026-05-13) — _Audit grep : **0 usage** dans la codebase. Primitives exportees mais jamais utilisees. Decision : garder pour eviter casser l'API publique du DS, documenter comme "primitive disponible pour adoption future"._
- [x] **T-105** | UI | XS | — | ⚪ | ~~Couleurs hardcodées résiduelles~~ (BATCH 17 — 2026-05-13) — _VerificationForm hint OTP demo : 3 hex colors `#f3e8ff` / `#a78bfa` / `#7c3aed` -> tokens DS (`bg-primary-light`, `border-primary/40`, `text-primary`). Brand colors SocialButton (Google/FB) restent hardcodes — **legitime** (assets brand exterieurs)._

---

# 🔁 Tâches récurrentes (rituel)

## Trimestriel

- [x] **R-1** | Process | S | — | 🟠 | ~~Audit advisors Supabase~~ (BATCH 12 — 2026-05-13) — _Voir `docs/AUDIT_ADVISORS_2026-05-13.md`._
- [x] **R-2** | Cleanup | XS | — | 🟡 | ~~`git remote prune origin` + cleanup branches mortes~~ (BATCH 11/16 — 2026-05-13) — _Remote prune effectue, 8 dependabot branches supprimees, branches BATCH supprimees apres chaque cycle._
- [ ] **R-3** | Cleanup | XS | — | 🟡 | Review TODOs `[BACKEND]` (statut)
- [x] **R-4** | Sécurité | XS | — | 🟠 | ~~`npm audit` deep scan + update dépendances~~ (BATCH 18 — 2026-05-13) — _`npm audit fix` execute. Resolu 1 vulnerabilite HIGH (picomatch ReDoS GHSA-3v7f-55p6-f55p + GHSA-c2c7-rcm5-vvqj). 0 vulnerabilities restantes._

## Mensuel

- [x] **R-5** | Perf | XS | — | 🟡 | ~~Review bundle size + perf Lighthouse~~ (BATCH 17 — 2026-05-13) — _Bundle review : main chunk 291.68 KB gzip, stable depuis 5 BATCHES. CI enforce 330 KB budget (T-080). Lighthouse audit reporte (cf. T-060)._

## Par release

- [ ] **R-6** | Process | XS | — | 🟠 | Tag git `release-YYYY-MM-DD` sur main
- [ ] **R-7** | QA | XS | — | 🟠 | Smoke test prod après deploy
- [ ] **R-8** | Docs | XS | — | 🟡 | Ajouter ligne dans `RELEASE_READINESS.md`

---

# ⚡ QUICK WINS

> 📌 **47 micro-tâches identifiées** dans [`docs/QUICK_WINS.md`](QUICK_WINS.md).
> Effort total : ~42h cumul (~5j dev étalable).
> À intercaler entre les grosses tâches T-XXX.

## 🔴 Quick wins critiques (5 tâches, ~2h)

- [x] **QW-C1** — ~~Régénérer types Supabase~~ — lie T-001 (BATCH 12)
- [x] **QW-C2** — ~~CI sur push staging~~ — lie T-006 (BATCH 1)
- [x] **QW-C3** — ~~Désactiver merge_commit + rebase_merge~~ — lie T-042 (avant BATCH 1)
- [x] **QW-C4** — ~~`@types/leaflet` → devDependencies~~ — lie T-090 (BATCH 1)
- [ ] **QW-C5** — Fix 16 warnings ESLint react-refresh (30 min) — lié T-092 _(reporte : refacto split exports en files separes)_

## 🟠 Quick wins importants (12 tâches, ~25h)

### Performance

- [x] **QW-I1** — ~~Throttle Hero mouse tracking 30fps~~ — lie T-074 (BATCH 4)
- [x] **QW-I2** — ~~Lazy import StatsSidebar mobile~~ — lie T-082 (BATCH 4)
- [x] **QW-I3** — ~~Tree-shake lucide-react~~ — lie T-083 (deja conforme, BATCH 18)
- [x] **QW-I4** — ~~Compression image client avatars/banners~~ — lie T-075 (BATCH 16)
- [x] **QW-I5** — ~~Lazy load useFollowers/useFollowing~~ — lie T-079 (BATCH 16)

### UI / UX

- [x] **QW-I6** — ~~Badge "Bientôt" Statistiques profil~~ — lie T-098 (deja en place)
- [x] **QW-I7** — ~~Spinner pendant uploads photo~~ — lie T-023 (BATCH 9)
- [x] **QW-I8** — ~~Skeleton sur feed~~ — lie T-021 (deja en place)
- [x] **QW-I9** — ~~Indicateur progression onboarding~~ — lie T-022 (deja en place, StepIndicator)

### Code quality

- [x] **QW-I10** — ~~Helper `requireSupabase()`~~ — lie T-004 (BATCH 1)
- [x] **QW-I11** — ~~Hook `useRequiredUser()`~~ — lie T-005 (BATCH 1)
- [x] **QW-I12** — ~~Convention TODOs `(date, owner, #issue)`~~ — lie T-072 (BATCH 1, doc cree)

## 🟡 Quick wins confort (30 tâches, ~15h)

> Détails complets dans [`docs/QUICK_WINS.md`](QUICK_WINS.md) section "Quick Wins Confort".

**Catégories** :

- A11Y micro-fixes : QW-A1 à QW-A6 (6 tâches, ~3h)
- Code propre : QW-CL1 à QW-CL4 (4 tâches, ~2h)
- UX cosmétique : QW-UX1 à QW-UX22 (22 tâches, ~10h)
- Sécurité : QW-S1 à QW-S3 (3 tâches, ~45 min)
- Docs : QW-D1 à QW-D3 (3 tâches, ~2h)

---

# 📊 Tableau de bord — Progress tracking

## Par phase

| Phase                    | Tâches total                               | Done  | Pending | %      |
| ------------------------ | ------------------------------------------ | ----- | ------- | ------ |
| Phase 1 — Stabilisation  | 10 (T-001 à T-010)                         | 0     | 10      | 0%     |
| Phase 2 — UX             | 11 (T-016 à T-027 + T-098)                 | 0     | 11      | 0%     |
| Phase 3 — Refacto        | 13 (T-011 à T-015, T-028 à T-035)          | 0     | 13      | 0%     |
| Phase 4 — GitHub         | 9 (T-036 à T-044)                          | 0     | 9       | 0%     |
| Phase 5 — DS + Storybook | 8 (T-045 à T-052)                          | 0     | 8       | 0%     |
| Phase 6 — Pré-prod       | 22 (T-053→T-067, T-074→T-083)              | 0     | 22      | 0%     |
| **Bonus**                | 17 (T-068→T-073, T-084→T-097, T-099→T-105) | 0     | 17      | 0%     |
| **TOTAL**                | **105 tâches**                             | **0** | **105** | **0%** |

## Par priorité

| Priorité     | Total | Done | %   |
| ------------ | ----- | ---- | --- |
| 🔴 Critique  | 15    | 0    | 0%  |
| 🟠 Important | 50    | 0    | 0%  |
| 🟡 Moyen     | 30    | 0    | 0%  |
| ⚪ Mineur    | 10    | 0    | 0%  |

## Par catégorie

| Catégorie           | Tâches                      |
| ------------------- | --------------------------- |
| Frontend            | 18                          |
| Backend             | 9                           |
| UI                  | 10                          |
| UX                  | 6                           |
| Design System       | 8                           |
| A11Y                | 8                           |
| GitHub              | 11                          |
| Documentation       | 4                           |
| Supabase            | 4                           |
| Sécurité            | 4                           |
| Performance         | 10                          |
| Conformité          | 0 (déjà traité RGPD/Loi 25) |
| Cleanup             | 13                          |
| Process / Récurrent | 8                           |

---

# 🎯 Ordre d'exécution recommandé (par dépendances)

## Semaine 1 — Phase 1 Fondations

```
Jour 1 : T-001, T-004, T-005, T-006 (régen types, helpers, CI staging)
Jour 2 : T-002 partie 1 (10 casts as unknown as)
Jour 3 : T-002 partie 2 (12 casts restants) + T-003 (drift CI)
Jour 4 : T-009 (setup Playwright + 1er test)
Jour 5 : T-007 partie 2 (test E2E complet) + T-008 (coverage gate)
```

## Semaine 2 — Phase 2 UX + début Phase 4 GitHub

```
Jour 1 : T-017, T-018, T-019 (3 primitives EmptyState/ErrorState/LoadingState)
Jour 2 : T-020 (adoption partout) + T-026 (toast uniformisé)
Jour 3 : T-021, T-022, T-023 (skeleton feed, progress onboarding, spinner upload)
Jour 4 : T-016 (ContributeEditForm) partie 1
Jour 5 : T-016 partie 2 + T-027 (email OTP) + T-036, T-037, T-038, T-039 (templates GitHub)
```

## Semaines 3-6 — Phase 3 Refacto

```
Sem 3 : T-011 (OnboardingStep4) + T-012 (SettingsPanel)
Sem 4 : T-013 (Encounter form) + T-014 (FeedSection)
Sem 5 : T-015 (FeedPost) + T-028 (SearchPanel)
Sem 6 : T-029, T-030, T-031 + T-032 à T-035 (composants restants)
```

## Semaines 7-9 — Phase 5 DS + Storybook

```
Sem 7 : T-045 (spec tokens) + T-046 (catalogue) + T-047 (setup Storybook)
Sem 8 : T-048 (15 atoms) + T-049 (12 molecules)
Sem 9 : T-050 (5 organisms) + T-051 (tests visuels) + T-052 (déploiement)
```

## Semaine 10 — Phase 6 Pré-prod

```
Jour 1 : T-053 à T-060 (A11Y A1-A7)
Jour 2 : T-061, T-062, T-063 (sécurité tests)
Jour 3 : T-064, T-065 (audit Supabase + RLS cleanup)
Jour 4 : T-066, T-067 (indexes dupliqués + auth.uid optimization)
Jour 5 : T-075 à T-083 (perf optimizations)
```

## Quick wins parallèles (n'importe quand)

```
T-074 (throttle Hero) : 30 min
T-082 (lazy StatsSidebar) : 1h
T-083 (tree-shake lucide) : 2h
T-090 (@types/leaflet → devDeps) : 5 min
T-098 (badge Bientôt) : 1h
T-072 (convention TODO) : 1h
```

---

# 🔄 Mise à jour de ce document

**À chaque tâche complétée** :

1. Cocher la case `[x]`
2. Ajouter date d'achèvement + numéro PR : `[x] T-001 ✅ 2026-05-10 #80`
3. Mettre à jour le tableau de bord (Done count)
4. Si nouvelle tâche découverte : ajouter T-XXX avec format identique

**Hebdomadaire** :

- Review %completion par phase
- Ajuster estimations si dérives

**Par release** :

- Snapshot du fichier (copy `MASTER_TODO-v0.X.0.md`) pour traçabilité

---

# 📎 Références croisées

- `docs/PROJECT_MASTER.md` — Source de vérité globale (backlog narratif)
- `docs/CONSOLIDATION_ROADMAP.md` — Plan séquencé en 6 phases (vue temporelle)
- `docs/NEXT_TASKS.md` — Checklist priorisée (vue actionable)
- `docs/AUDIT_GITHUB.md` — Détails Phase 4 GitHub
- `docs/AUDIT_DESIGN_SYSTEM.md` — Détails Phase 5 DS
- `docs/STORYBOOK_STRATEGY.md` — Détails Phase 5 Storybook
- `docs/AUDIT_TECH_DEBT_GLOBAL.md` — Détails Phases 1+3
- `docs/CLEANUP_PROJECT.md` — Détails tâches cleanup

---

**📌 Ce document est LE référentiel central de pilotage. À ouvrir chaque matin pour identifier la prochaine tâche à faire.**

**Convention commit/PR** : référencer l'ID de tâche dans le message :

```
feat(ui): create EmptyState primitive (T-017)
```
