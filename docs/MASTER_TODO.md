# Naturegraph — MASTER TODO (Document de pilotage central)

> **Version** : 1.0 — 2026-05-04
> **Statut** : 📌 **DOCUMENT DE PILOTAGE CENTRAL** — à mettre à jour à chaque tâche complétée
> **Source** : consolidation de tous les audits + roadmap
> **Lecture cible** : ouvrir chaque matin pour identifier la prochaine tâche
> **Usage** : cocher au fur et à mesure + ajouter date d'achèvement

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

- [ ] **T-001** | Backend | S | — | 🔴 | Régénérer `src/types/supabase.ts` via `npx supabase gen types typescript --project-id hrxgduvworofnrjmgpcj`
- [ ] **T-002** | Backend | M | T-001 | 🔴 | Fix les 22 casts `as unknown as` un par un (12 fichiers concernés)
- [ ] **T-003** | Backend | S | T-001+T-002 | 🔴 | CI gate : script drift detection types ↔ migrations (fail si désynchro)
- [ ] **T-004** | Backend | S | — | 🔴 | Helper `requireSupabase()` centralisé (élimine 26 occurrences pattern)
- [ ] **T-005** | Backend | S | — | 🔴 | Hook `useRequiredUser()` centralisé (élimine 46 occurrences pattern)

## Infrastructure / CI

- [ ] **T-006** | GitHub | XS | — | 🔴 | Étendre CI sur push `staging` (`.github/workflows/ci.yml` triggers)
- [ ] **T-007** | GitHub | M | — | 🔴 | Tests E2E Playwright critical path (signup → onboarding → upload → delete)
- [ ] **T-008** | GitHub | S | — | 🔴 | Coverage gate CI > 30% sur `src/services/` et `src/utils/`

## Tests & qualité

- [ ] **T-009** | Tests | L | — | 🔴 | Setup Playwright + 1er test E2E
- [ ] **T-010** | Tests | M | — | 🔴 | Tests unit services critiques : `postService`, `mediaService`, `notificationService`

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
- [ ] **T-017** | UI | S | — | 🟠 | Créer `<EmptyState />` primitive
- [ ] **T-018** | UI | S | — | 🟠 | Créer `<ErrorState />` primitive
- [ ] **T-019** | UI | S | — | 🟠 | Créer `<LoadingState />` primitive
- [ ] **T-020** | UI | S | T-017+T-018+T-019 | 🟠 | Adopter Empty/Error/Loading dans 5+ endroits clés
- [ ] **T-021** | UI | S | — | 🟠 | Skeleton sur feed (vs Spinner actuel)
- [ ] **T-022** | UI | S | — | 🟠 | Indicateur progression onboarding (4 étapes visibles)
- [ ] **T-023** | UI | S | — | 🟠 | Spinner pendant uploads photo
- [ ] **T-024** | UI | S | — | 🟠 | Fusion Switch + ToggleSwitch (doublon)
- [ ] **T-025** | UI | S | — | 🟠 | Enrichir `ConfirmModal` avec slots optionnels

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

- [ ] **T-036** | GitHub | XS | — | 🟠 | Créer `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] **T-037** | GitHub | XS | — | 🟠 | Créer `.github/ISSUE_TEMPLATE/bug_report.md` + `feature_request.md`
- [ ] **T-038** | GitHub | XS | — | 🟠 | Créer `.github/CODEOWNERS`
- [ ] **T-039** | GitHub | XS | — | 🟠 | Créer `.github/SECURITY.md`
- [ ] **T-040** | GitHub | XS | — | 🟠 | Créer `.github/dependabot.yml` + activer security updates
- [ ] **T-041** | GitHub | XS | — | 🟠 | Créer 14 labels standardisés (priority, effort, domain)
- [ ] **T-042** | GitHub | XS | — | 🟠 | Désactiver merge_commit + rebase_merge dans Settings
- [ ] **T-043** | GitHub | S | — | 🟠 | Setup release workflow (semantic-release ou changesets)
- [ ] **T-044** | GitHub | XS | T-043 | 🟠 | Premier tag `v0.1.0` + GitHub Release

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

- [ ] **T-053** | A11Y | XS | — | 🟠 | Fix A1 : Onboarding multi-select `role="group"` + `aria-pressed`
- [ ] **T-054** | A11Y | XS | — | 🟠 | Fix A2 : OTP form `aria-label` + `autocomplete="one-time-code"`
- [ ] **T-055** | A11Y | XS | — | 🟠 | Fix A3 : OTP timer `aria-live`
- [ ] **T-056** | A11Y | XS | — | 🟠 | Fix A4 : FAQ accordion `aria-expanded`
- [ ] **T-057** | A11Y | XS | — | 🟠 | Fix A5 : Burger menu mobile `aria-label`
- [ ] **T-058** | A11Y | S | — | 🟠 | Fix A6 : Focus trap modals (boucle complète)
- [ ] **T-059** | A11Y | XS | — | 🟠 | Fix A7 : Step indicator onboarding `aria-current="step"`
- [ ] **T-060** | A11Y | S | T-053→T-059 | 🟠 | Audit Lighthouse + axe-core sur 5 pages clés

## Sécurité

- [ ] **T-061** | Sécurité | M | — | 🟠 | Tests storage policies (unauthorized access blocked)
- [ ] **T-062** | Sécurité | S | — | 🟠 | Magic numbers vérification serveur (uploads images)
- [ ] **T-063** | Sécurité | S | — | 🟠 | Banned usernames côté serveur (Edge Function/RPC, sortir du bundle)
- [ ] **T-064** | Sécurité | XS | — | 🟠 | Audit advisors Supabase (performance + security)
- [ ] **T-065** | Supabase | M | — | 🟠 | Cleanup 50 RLS policies dupliquées (legacy + nouvelles cohabitent)
- [ ] **T-066** | Supabase | XS | — | 🟠 | 4 indexes dupliqués DB : DROP les doublons
- [ ] **T-067** | Supabase | S | — | 🟠 | Optimiser `auth.uid()` → `(SELECT auth.uid())` (55 policies advisors)

## Forms unification (Phase 5)

- [ ] **T-068** | Backend | S | — | 🟠 | Schemas zod par flow (Onboarding, Encounter, Settings)
- [ ] **T-069** | Frontend | S | T-068 | 🟠 | Migration Onboarding → react-hook-form + zod
- [ ] **T-070** | Frontend | S | T-068 | 🟠 | Migration Settings → react-hook-form + zod
- [ ] **T-071** | Frontend | S | T-068 | 🟠 | Migration Encounter → react-hook-form + zod (via T-013)

## Documentation

- [ ] **T-072** | Docs | S | — | 🟠 | Convention TODO `TODO(YYYY-MM-DD, owner, #issue)` documentée + appliquée (57+ occurrences)
- [ ] **T-073** | Docs | XS | T-043 | 🟠 | CHANGELOG.md auto-généré

---

# 🟡 MOYEN (amélioration / optimisation)

## Performance

- [ ] **T-074** | Perf | XS | — | 🟡 | Throttle Hero mouse tracking 30fps (`Landing/Hero.tsx:180`)
- [ ] **T-075** | Perf | XS | — | 🟡 | Compression image client avatars/banners (utilise `compressPhoto.ts` existant)
- [ ] **T-076** | Perf | S | — | 🟡 | Conversion WebP côté client
- [ ] **T-077** | Perf | S | — | 🟡 | Code-split routes Auth/Profile/Settings
- [ ] **T-078** | Perf | S | — | 🟡 | Dynamic import Leaflet (60 KB économisés)
- [ ] **T-079** | Perf | XS | — | 🟡 | Lazy load `useFollowers`/`useFollowing` (tab Communauté)
- [ ] **T-080** | Perf | XS | — | 🟡 | Bundle size budget surveillance auto (alerte > 300 KB)
- [ ] **T-081** | Perf | S | — | 🟡 | Invalidations React Query ciblées (vs globales)
- [ ] **T-082** | Perf | XS | — | 🟡 | Lazy import StatsSidebar mobile
- [ ] **T-083** | Perf | S | — | 🟡 | Tree-shake lucide-react (importer seulement icons utilisés)

## Cleanup

- [ ] **T-084** | Cleanup | XS | — | 🟡 | Supprimer `dist/` du disque si présent (gitignoré)
- [ ] **T-085** | Cleanup | XS | — | 🟡 | Supprimer `naturegraph-make/` du disque si présent (gitignoré)
- [ ] **T-086** | Cleanup | XS | — | 🟡 | Vérifier `start-dev.mjs` utilisé (sinon supprimer)
- [ ] **T-087** | Cleanup | S | — | 🟡 | Détection composants morts (script grep + `knip`)
- [ ] **T-088** | Cleanup | S | — | 🟡 | Détection services morts (audit individuel)
- [ ] **T-089** | Cleanup | S | — | 🟡 | Détection hooks morts
- [ ] **T-090** | Cleanup | XS | — | 🟡 | Déplacer `@types/leaflet` → devDependencies
- [ ] **T-091** | Cleanup | S | — | 🟡 | Audit usage `motion` package (supprimer si non utilisé)
- [ ] **T-092** | Cleanup | XS | — | 🟡 | 16 warnings ESLint react-refresh à résoudre
- [ ] **T-093** | Cleanup | XS | — | 🟡 | Archiver `AUDIT_TECHNIQUE.md` v1 vers `docs/archive/audits-v1/`
- [ ] **T-094** | Cleanup | XS | — | 🟡 | Archiver `AUDIT_GIT.md`, `SYNTHESE_GIT.md`, `PLAN_ACTION_GIT.md` v1 (remplacés)

## GitHub avancé

- [ ] **T-095** | GitHub | XS | — | 🟡 | Setup CodeQL (SAST GitHub) workflow
- [ ] **T-096** | GitHub | S | — | 🟡 | Snyk ou équivalent pour scan deps
- [ ] **T-097** | GitHub | XS | — | 🟡 | Documenter convention branches dans `CONTRIBUTING.md`

## UX cosmétique

- [ ] **T-098** | UX | XS | — | 🟡 | Badge "Bientôt" sur onglet Statistiques profil
- [ ] **T-099** | UX | S | — | 🟡 | OTP timer audio + bouton resume

---

# ⚪ MINEUR (cosmétique / nice-to-have)

- [ ] **T-100** | DS | XS | — | ⚪ | Page DesignTokens.stories.tsx (visualisation tokens dans Storybook)
- [ ] **T-101** | DS | XS | — | ⚪ | Page Welcome.mdx (onboarding équipe Storybook)
- [ ] **T-102** | Cleanup | XS | — | ⚪ | Vérifier dossiers `Taxref/` `design-references/` (gitignorés, suppression disque)
- [ ] **T-103** | Docs | XS | — | ⚪ | Mettre à jour `EPIC_LOCALIZATION.md` avec nouveaux chemins post-cleanup
- [ ] **T-104** | UI | XS | — | ⚪ | Adopter `Container`/`Stack` primitives systématiquement (audit usage actuel)
- [ ] **T-105** | UI | XS | — | ⚪ | Couleurs hardcodées résiduelles → CSS variables (audit grep `#hexcolor`)

---

# 🔁 Tâches récurrentes (rituel)

## Trimestriel

- [ ] **R-1** | Process | S | — | 🟠 | Audit advisors Supabase (performance + security)
- [ ] **R-2** | Cleanup | XS | — | 🟡 | `git remote prune origin` + cleanup branches mortes
- [ ] **R-3** | Cleanup | XS | — | 🟡 | Review TODOs `[BACKEND]` (statut)
- [ ] **R-4** | Sécurité | XS | — | 🟠 | `npm audit` deep scan + update dépendances

## Mensuel

- [ ] **R-5** | Perf | XS | — | 🟡 | Review bundle size + perf Lighthouse

## Par release

- [ ] **R-6** | Process | XS | — | 🟠 | Tag git `release-YYYY-MM-DD` sur main
- [ ] **R-7** | QA | XS | — | 🟠 | Smoke test prod après deploy
- [ ] **R-8** | Docs | XS | — | 🟡 | Ajouter ligne dans `RELEASE_READINESS.md`

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
