# Naturegraph — Document Master Engineering & Architecture

> **Version** : 1.0 — 2026-05-04
> **Statut** : 📌 **SOURCE DE VÉRITÉ UNIQUE** pour engineering, architecture, dette technique, backlog.
> **Posture** : staff engineer + tech lead + architecture. Pas de produit, pas de roadmap features, pas de release talk.
> **Lecture cible** : 30 min pour absorber, à consulter avant tout chantier.
> **Mise à jour** : à chaque ajout/modification structurelle. Versionné dans `main`.

---

# 📚 Table des matières

1. [État du projet](#1-état-du-projet)
2. [Audit global synthétisé](#2-audit-global-synthétisé)
3. [Backlog structuré](#3-backlog-structuré)
4. [Priorisation](#4-priorisation)
5. [Roadmap logique](#5-roadmap-logique)
6. [Règles projet](#6-règles-projet)

---

# 1. État du projet

## 1.1 Architecture actuelle

```
Frontend (Vite + React 19 + TypeScript)
    ↓
React Query (cache + invalidations)
    ↓
Supabase JS Client
    ↓
┌──────────────────────────────────────────────┐
│ Supabase                                     │
│  ├── PostgreSQL 15 + PostGIS                 │
│  ├── Row Level Security (RLS) sur 22 tables  │
│  ├── 3 Edge Functions (delete-account,       │
│  │   export-data, weekly-species-digest)     │
│  ├── Storage (avatars, post-media, banners,  │
│  │   exports)                                │
│  ├── Auth (magic link OTP, no password)      │
│  └── pg_cron (anonymize_orphan_audit_logs)   │
└──────────────────────────────────────────────┘
```

**Stack** :

- React 19.2, TypeScript strict, Vite 7
- Tailwind CSS v4 + SCSS 7-1 pattern
- React Router 7
- React Query (TanStack) v5
- i18next (FR + EN)
- Vitest + Testing Library
- Husky + lint-staged + Prettier + ESLint

## 1.2 État du repo Git

| Branche   | SHA    | Contenu             |
| --------- | ------ | ------------------- |
| `main`    | latest | Production publique |
| `staging` | latest | UAT / beta testers  |
| `develop` | latest | Dev interne         |

**Workflow** : `feat/*` → `develop` → `staging` → `main` (squash merge à chaque niveau).

**Configuration GitHub** :

- ✅ `delete_branch_on_merge: false` (develop ne disparaît plus)
- ✅ Branch protection actif sur `main` + `staging`
- ✅ CI obligatoire avant merge

**Nombre total** :

- 124 composants TSX
- 21 services
- 25+ hooks custom
- 41+ migrations SQL
- ~26 documents Markdown dans `docs/`

## 1.3 État backend Supabase (project ref `hrxgduvworofnrjmgpcj`)

### Tables (23) — RLS active sur toutes

| Table                      | Rows | Description                |
| -------------------------- | ---- | -------------------------- |
| `profiles`                 | 2    | Profils utilisateurs       |
| `posts`                    | 3    | Observations / encounters  |
| `media`                    | 4    | Photos liées aux posts     |
| `notifications`            | 25+  | Notifications utilisateurs |
| `follows`                  | 1    | Relations follow           |
| `reactions`                | 1    | Likes/réactions            |
| `comments`                 | 0    | Commentaires               |
| `notebooks`                | 0    | Carnets nature             |
| `species_master`           | 20   | Référentiel espèces        |
| `taxref_cache`             | 20   | Cache TAXREF               |
| `community_photos`         | 1    | Photos auth screens        |
| `blocks`                   | 1    | Blocages utilisateurs      |
| `hidden_posts`             | 1    | Posts masqués              |
| `saved_posts`              | 0    | Favoris                    |
| `notification_preferences` | 0    | Préférences notif          |
| `support_tickets`          | 0    | Tickets support            |
| `security_audit_log`       | 0    | Audit RGPD                 |
| `reports`                  | 0    | Signalements               |
| `identification_proposals` | 0    | Propositions ID            |
| `notebook_observations`    | 0    | Observations carnets       |
| `user_settings`            | 0    | Paramètres user            |
| `fr_cities`                | 0    | Référentiel villes FR      |
| `spatial_ref_sys`          | 8500 | PostGIS standard           |

### Vues (1)

| Vue            | Description                                                                           |
| -------------- | ------------------------------------------------------------------------------------- |
| `posts_public` | Lecture sécurisée avec masquage GPS si `location_hidden=true` (security_invoker=true) |

### Edge Functions (3)

| Function                | Version | Rôle                            |
| ----------------------- | ------- | ------------------------------- |
| `delete-account`        | v2      | Suppression RGPD complète       |
| `export-data`           | v3      | Export RGPD JSON signed URL 24h |
| `weekly-species-digest` | v1      | Cron digest hebdo opt-in        |

### Triggers de notification (3)

| Trigger              | Cible                | Comportement                                            |
| -------------------- | -------------------- | ------------------------------------------------------- |
| `notify_on_follow`   | `follows` (INSERT)   | Notif au suivi + catch-up post du dernier post du suivi |
| `notify_on_new_post` | `posts` (INSERT)     | Notif aux followers quand publication                   |
| `notify_on_reaction` | `reactions` (INSERT) | Notif à l'auteur du post                                |

### Cron jobs (1)

| Job                           | Schedule    | Description                  |
| ----------------------------- | ----------- | ---------------------------- |
| `anonymize_orphan_audit_logs` | `0 3 * * *` | Anonymise ip/user_agent J+30 |

### Storage buckets (5)

- `avatars` (public read, owner write)
- `post-media` (public read, owner write)
- `banners` (public read, owner write)
- `exports` (signed URL only, RGPD)
- `community-photos` (public read, admin write)

## 1.4 État UI / frontend

### Couches

- **`src/components/ui/`** : 38 primitives réutilisables (Button, Input, Modal, etc.)
- **`src/components/<domain>/`** : 86 composants métier (auth, contribute, home, profile, settings, etc.)
- **`src/pages/`** : 13 pages routées
- **`src/hooks/`** : 25+ custom hooks (useFeed, usePost, useFollow, etc.)
- **`src/services/`** : 21 services Supabase isolés
- **`src/styles/`** : SCSS 7-1 pattern (abstracts/base/components/layout/pages/themes/utilities)
- **`src/i18n/`** : Locales FR + EN, 914 appels `t()`

### Métriques bundle (Vite production build)

- JS gzip total : ~325 KB (budget CI : 325 KB)
- First-paint home : ~190 KB gzip (index + vendor + supabase + i18n)
- Lazy-loaded par route : Auth, Profile, Contribute, Settings, Notifications

### Dette technique observée

- **14 composants > 200 lignes** (CLAUDE.md violation)
- **22 casts `as unknown as`** (drift TypeScript ↔ DB)
- **3 tests** sur 124 composants (~2% coverage)

---

# 2. Audit global synthétisé

## 2.1 Causes racines identifiées (RC-A à RC-H)

| RC       | Domaine                                          | État                                                      | Référence                             |
| -------- | ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------- |
| **RC-A** | Discipline migration SQL inexistante             | ✅ **Résolu** (PRs #41-45)                                | `SYNTHESE_AUDITS.md`                  |
| **RC-B** | Sécurité column-level inexistante                | ✅ **Résolu** (PR #42, vue posts_public)                  | `SYNTHESE_AUDITS.md`                  |
| **RC-C** | Cycle de vie données RGPD non implémenté         | ✅ **Résolu** (PR #44, cron J+30)                         | `SYNTHESE_AUDITS.md`                  |
| **RC-D** | Privacy by Design absent UI                      | ✅ **Résolu** (PR #49)                                    | `SYNTHESE_AUDITS.md`                  |
| **RC-E** | Contrat données utilisateur incomplet onboarding | ✅ **Résolu** (PR #50)                                    | `SYNTHESE_AUDITS.md`                  |
| **RC-F** | Composants UI obèses + duplication services      | 🔴 **Actif**                                              | `AUDIT_TECH_DEBT_GLOBAL.md` C-1       |
| **RC-G** | Performance flows critiques sous-optimisée       | 🟠 **Partiel**                                            | `AUDIT_TECH_DEBT_GLOBAL.md` O-1 à O-7 |
| **RC-H** | Process Git fragile                              | ✅ **Résolu** (auto-delete-branch off, branch protection) | `SYNTHESE_GIT.md`                     |

## 2.2 Synthèse des audits par domaine

### Git / repo (`AUDIT_GIT.md`)

| ID  | Finding                            | État                          |
| --- | ---------------------------------- | ----------------------------- |
| G-1 | Rebase orphelin checkout principal | ✅ Résolu                     |
| G-2 | `origin/develop` auto-supprimée    | ✅ Résolu (config GitHub)     |
| G-3 | Stratégie merge incohérente        | 🟠 Documentée, à standardiser |
| G-4 | 15 branches locales mortes         | ✅ Cleanup régulier en place  |
| G-5 | Fichiers untracked                 | ✅ Tous commités              |
| G-6 | PR #19 fermée sans note            | 🟡 Cosmétique                 |
| G-7 | CI absent sur staging              | 🟠 À ajouter                  |
| G-8 | Convention commits                 | ✅ Respectée                  |

### Design system (`AUDIT_DESIGN_SYSTEM.md`)

- **🟢 7 bonnes pratiques** : 38 primitives isolées, tokens via CSS vars, SCSS 7-1, i18n 100%, a11y primitives, conventions naming
- **🟠 8 incohérences** : 3 couches tokens, naming Switch/ToggleSwitch/Checkbox flou, Modal vs ConfirmModal, Skeleton sous-utilisé, Container/Stack sous-utilisés, couleurs hardcodées résiduelles
- **🔴 6 problèmes structurels** : pas de séparation UI/business, pas de spec tokens, ~2% coverage, pas de Storybook, états non standardisés, pas de FormProvider

### Storybook readiness (`STORYBOOK_STRATEGY.md`)

- **38 atoms/molecules/organisms** prêts pour stories isolées
- **86 composants par domaine** nécessitent refacto container/presentational avant Storybook
- Roadmap MVP atoms (2j) → V1 complete (1 semaine) → V2 features (sprint dédié)

### Tech debt (`AUDIT_TECH_DEBT_GLOBAL.md`)

- **🔴 3 critiques** : composants obèses, TS drift, tests inexistants
- **🟠 7 importants** : patterns dispersés, forms, a11y, storage tests
- **🟡 7 perf** : compression image, WebP, throttle, code-split, banned usernames

### UX flows critiques (`AUDIT_FLOWS.md` v1.1)

- Landing : 90% conformité
- Onboarding : 60% (RC-E résolue)
- Auth : 80% (social login retiré MVP)
- Feed : 75% (5 réactions vs 1 prévu)
- Contribution : 65% (HEIC retiré, EXIF strippé)
- Profil : 90%
- Settings : 70% (delete account avec username matching)
- Notifications : 95%

---

# 3. Backlog structuré

## 3.1 UI

| ID    | Tâche                                                       | Priorité | Effort | Réf           |
| ----- | ----------------------------------------------------------- | -------- | ------ | ------------- |
| UI-1  | Refonte FeedPost (756L) → 4 sub-components                  | 🔴       | 2j     | C-1           |
| UI-2  | Refonte FeedSection (730L) → container/presentational       | 🔴       | 2j     | C-1, PS-1     |
| UI-3  | Refonte SettingsPanel (727L) → 4 sections autonomes         | 🔴       | 2j     | C-1           |
| UI-4  | Refonte ContributeEncounterForm (681L) → FormProvider       | 🔴       | 2j     | C-1, I-5      |
| UI-5  | Refonte OnboardingStep4 (667L) → extraire UsernameValidator | 🔴       | 2j     | C-1           |
| UI-6  | Implémenter ContributeEditForm (Phase 2 edit observation)   | 🟠       | 2j     | Bug menu Edit |
| UI-7  | Standardiser EmptyState/ErrorState/LoadingState             | 🟠       | 1j     | PS-5          |
| UI-8  | Merger Switch + ToggleSwitch                                | 🟡       | 4h     | INC-5         |
| UI-9  | Enrichir ConfirmModal avec slots                            | 🟡       | 4h     | INC-4         |
| UI-10 | Adopter Container/Stack systématiquement                    | 🟡       | 1j     | INC-7         |

## 3.2 UX

| ID   | Tâche                               | Priorité | Effort | Réf   |
| ---- | ----------------------------------- | -------- | ------ | ----- |
| UX-1 | Skeleton sur feed (vs Spinner)      | 🟠       | 4h     | INC-6 |
| UX-2 | Indicateur progression onboarding   | 🟠       | 4h     | UX1   |
| UX-3 | Spinner uploads photo               | 🟠       | 2h     | UX4   |
| UX-4 | OTP timer audio + resume            | 🟡       | 4h     | UX5   |
| UX-5 | Badge "Bientôt" Statistiques profil | 🟡       | 1h     | UX6   |
| UX-6 | Toast errors uniformisé             | 🟠       | 1j     | I-3   |

## 3.3 Backend

| ID   | Tâche                                            | Priorité | Effort  | Réf |
| ---- | ------------------------------------------------ | -------- | ------- | --- |
| BE-1 | Régénérer `supabase.ts` après chaque migration   | 🔴       | Process | C-2 |
| BE-2 | CI gate : drift detection types ↔ migrations     | 🔴       | 1j      | C-2 |
| BE-3 | Helper `requireSupabase()` centralisé            | 🟠       | 4h      | I-1 |
| BE-4 | Hook `useRequiredUser()` centralisé              | 🟠       | 4h      | I-2 |
| BE-5 | Invalidations React Query ciblées (pas globales) | 🟠       | 1j      | I-3 |
| BE-6 | Email change avec écran OTP confirmation         | 🟠       | 1j      | B4  |
| BE-7 | Forms avec react-hook-form + zod                 | 🟠       | 3j      | I-5 |
| BE-8 | Tests storage policies (unauthorized access)     | 🟠       | 1j      | I-6 |
| BE-9 | Banned usernames côté serveur (Edge Function)    | 🟡       | 4h      | O-6 |

## 3.4 Infra

| ID      | Tâche                                         | Priorité | Effort | Réf |
| ------- | --------------------------------------------- | -------- | ------ | --- |
| INFRA-1 | CI workflow declenche aussi sur staging       | 🟠       | 1h     | G-7 |
| INFRA-2 | Standardiser stratégie merge (squash partout) | 🟡       | 30 min | G-3 |
| INFRA-3 | Branch protection rules formalisées           | 🟡       | 1h     | R-1 |
| INFRA-4 | Tests E2E Playwright critical path            | 🔴       | 2j     | C-3 |
| INFRA-5 | Coverage gate CI > 30% services + utils       | 🟠       | 4h     | C-3 |
| INFRA-6 | Bundle size budget surveillance auto          | 🟡       | 2h     | O-7 |

## 3.5 Design System

| ID   | Tâche                                            | Priorité | Effort | Réf               |
| ---- | ------------------------------------------------ | -------- | ------ | ----------------- |
| DS-1 | Spec tokens documentée (1 source)                | 🔴       | 2j     | INC-1, PS-2       |
| DS-2 | Catalogue primitives (atoms/molecules/organisms) | 🟠       | 2j     | DS audit Phase 0  |
| DS-3 | Setup Storybook 8 + Vite                         | 🟠       | 1j     | Storybook Phase 0 |
| DS-4 | 15 stories atoms (MVP)                           | 🟠       | 2j     | Storybook Phase 1 |
| DS-5 | 38 stories complete (V1)                         | 🟡       | 5j     | Storybook Phase 2 |
| DS-6 | Tests visuels Chromatic ou Playwright            | 🟡       | 1j     | Storybook         |
| DS-7 | Stories features (post-refacto containers)       | 🧪       | 10j    | Storybook Phase 3 |

## 3.6 Performance

| ID     | Tâche                                    | Priorité | Effort | Réf |
| ------ | ---------------------------------------- | -------- | ------ | --- |
| PERF-1 | Compression image client avatars/banners | 🟠       | 2h     | O-1 |
| PERF-2 | Conversion WebP côté client              | 🟠       | 4h     | O-2 |
| PERF-3 | Throttle Hero mouse tracking 30fps       | 🟡       | 30 min | O-3 |
| PERF-4 | Lazy import StatsSidebar mobile          | 🟡       | 1h     | O-4 |
| PERF-5 | Lazy load `useFollowers`/`useFollowing`  | 🟡       | 1h     | O-5 |
| PERF-6 | Tree-shake lucide-react                  | 🟡       | 2h     | O-7 |
| PERF-7 | Code-split routes Auth/Profile/Settings  | 🟡       | 1j     | O-7 |
| PERF-8 | Dynamic import Leaflet                   | 🟡       | 4h     | O-7 |

## 3.7 Sécurité

| ID    | Tâche                                                        | Priorité | Effort | Réf                  |
| ----- | ------------------------------------------------------------ | -------- | ------ | -------------------- |
| SEC-1 | Audit advisors Supabase trimestriel                          | 🟠       | 2h     | Recurrent            |
| SEC-2 | RLS policies tests automatisés                               | 🟠       | 1j     | I-6                  |
| SEC-3 | Magic numbers vérification côté serveur (uploads)            | 🟠       | 4h     | TODO MediaUploader   |
| SEC-4 | Cleanup 50 RLS policies dupliquées (legacy)                  | 🟡       | 1j     | Advisors performance |
| SEC-5 | Indexes dupliqués DB (4)                                     | 🟡       | 30 min | Advisors performance |
| SEC-6 | Optimiser `auth.uid()` → `(SELECT auth.uid())` (55 policies) | 🟡       | 2h     | Advisors             |
| SEC-7 | A11Y WCAG AA complet (A1-A7)                                 | 🟠       | 1j     | I-7                  |

---

# 4. Priorisation

## 🔴 Critique (bloquant architecture)

| ID      | Description                        | Domaine        |
| ------- | ---------------------------------- | -------------- |
| C-1     | 14 composants > 200 lignes         | UI / Tech debt |
| C-2     | TypeScript drift (`as unknown as`) | Backend        |
| C-3     | Tests inexistants (~2%)            | Infra          |
| BE-1    | Régénérer types Supabase           | Backend        |
| BE-2    | CI drift detection                 | Infra          |
| INFRA-4 | Tests E2E critical path            | Infra          |
| DS-1    | Spec tokens documentée             | DS             |

**Total critique** : 7 chantiers, ~10-15 jours dev cumul.

## 🟠 Important (structure)

19 chantiers répartis : refactors moyens, standards, helpers centralisés, A11Y compliance, perf images.
**Total important** : ~15-20 jours dev cumul.

## 🟡 Amélioration

19 chantiers : optimisations isolées, cosmétique, cleanup.
**Total amélioration** : ~8-10 jours dev cumul.

## 🧪 Expérimental

1 chantier (DS-7 stories features post-refacto).
**Total expérimental** : ~10 jours dev (sprint dédié).

---

# 5. Roadmap logique

## Phase 1 — Fondations (2 semaines)

> **But** : résoudre les bloquants architecture qui empêchent toute évolution propre.

```
Semaine 1
├── BE-1  Régénérer supabase.ts                 (4h)
├── C-2   Fix les 22 casts as unknown as       (2j)
├── INFRA-1 CI sur staging                      (1h)
├── INFRA-5 Coverage gate CI                    (4h)
└── PERF-3 Throttle Hero                       (30 min)

Semaine 2
├── BE-2   CI drift detection                  (1j)
├── INFRA-4 Tests E2E critical path            (2j)
├── BE-3   Helper requireSupabase              (4h)
└── BE-4   Hook useRequiredUser                (4h)
```

**Sortie Phase 1** :

- Types stricts partout
- CI bloque les régressions critiques
- Filet de sécurité E2E pour les flows utilisateurs

## Phase 2 — Refacto composants critiques (3-4 semaines)

> **But** : passer les 5 composants les plus gros sous la barre des 200 lignes.

Ordre recommandé (du plus simple au plus complexe) :

```
1. UI-5  OnboardingStep4 → extraire UsernameValidator       (2j)
2. UI-3  SettingsPanel → 4 sections autonomes               (2j)
3. UI-4  ContributeEncounterForm → FormProvider             (2j)
4. UI-2  FeedSection → container/presentational             (2j)
5. UI-1  FeedPost → 4 sub-components                        (2j)
```

En parallèle :

```
DS-1   Spec tokens (2j)
DS-2   Catalogue primitives (2j)
UI-7   States standardisés (1j)
```

**Sortie Phase 2** :

- 0 composant > 200 lignes
- Tokens documentés
- États (loading/empty/error) uniformes

## Phase 3 — Storybook + DS (1 sprint dédié)

> **But** : catalogue UI exploitable + filet visuel.

```
DS-3  Setup Storybook                    (1j)
DS-4  15 atoms MVP                       (2j)
DS-5  38 primitives complete (V1)        (5j)
DS-6  Tests visuels (Chromatic ou PW)   (1j)
```

**Pré-requis** : Phase 2 terminée (composants assez petits pour stories isolées).

## Phase 4 — Forms unification (1 semaine)

> **But** : `react-hook-form` + `zod` partout.

```
BE-7   Schema zod par flow              (1j)
       Migration Onboarding              (1j)
       Migration Encounter               (1j)
       Migration Settings                (1j)
       Tests + cleanup                   (1j)
```

## Phase 5 — A11Y + perf (1 semaine)

```
SEC-7   A11Y WCAG AA (A1-A7)            (1j)
PERF-1  Compression avatars/banners     (2h)
PERF-2  Conversion WebP                 (4h)
PERF-7  Code-split routes               (1j)
PERF-8  Dynamic import Leaflet          (4h)
PERF-6  Tree-shake lucide-react         (2h)
```

## Phase 6 — Maintenance continue (recurrent)

```
Trimestriel :
├── SEC-1   Audit advisors Supabase
├── SEC-4   Cleanup RLS policies
└── INFRA-6 Bundle size review

Mensuel :
├── Cleanup branches locales mortes
├── Review TODOs `[BACKEND]`
└── Update dépendances (npm audit)
```

## Dépendances entre phases

```
Phase 1  ───────┐
                ├─→  Phase 2  ────┐
                │                 ├─→  Phase 3
                │                 │
                ├─→  Phase 4 ─────┤
                │                 ├─→  Phase 5
                └─→  Phase 6 (continu)
```

**Phase 1 doit être faite EN PREMIER** (filet de sécurité). Phases 2-3 ensuite. Phases 4-5 peuvent se faire en parallèle si plusieurs devs.

## Quick wins (< 1h chacun)

| Tâche                           | Gain                       |
| ------------------------------- | -------------------------- |
| INFRA-1 CI staging              | Détection régression UAT   |
| PERF-3 Throttle Hero            | UX mobile                  |
| INFRA-2 Stratégie merge         | Drift staging↔main éliminé |
| INFRA-3 Branch protection rules | Sécurité                   |
| PERF-4 Lazy StatsSidebar        | -2 KB bundle mobile        |
| PERF-6 Tree-shake lucide        | -8 KB bundle               |
| UX-5 Badge "Bientôt" Stats      | Clarté UX                  |

**Total Quick Wins** : ~5h cumul → à faire dès maintenant.

---

# 6. Règles projet

## 6.1 Conventions de code

### TypeScript

- ✅ **Strict mode obligatoire** : `tsconfig.app.json` avec `strict: true`
- ❌ **Pas de `any`** dans le code applicatif
- ❌ **Pas de `as unknown as`** dans le code applicatif (sauf cast Supabase temporaire avec commentaire)
- ✅ **Types stricts** : utiliser `Post`, `PostFeedItem` des `database.ts`, pas `any` ou `Record<string, unknown>`

### React

- ✅ **Composants < 200 lignes** (CLAUDE.md)
- ✅ **1 fichier = 1 composant exporté nommé**
- ✅ **Custom hooks** pour la logique métier (pas dans le composant)
- ✅ **Container/presentational** pour les composants > 100 lignes
- ❌ **Pas de logique fetch** dans les composants présentationnels

### Naming

- Components : `PascalCase.tsx`
- Hooks : `useCamelCase.ts`
- Services : `camelCaseService.ts`
- Utils : `camelCase.ts`
- Constants : `UPPER_SNAKE_CASE` exportées
- Types/Interfaces : `PascalCase`
- CSS variables : `--kebab-case` avec préfixe sémantique (`--color-`, `--font-`, `--spacing-`)

### Imports

- Path alias : `@/` pour `src/`
- Order : 1) React, 2) deps tierces, 3) `@/` internes, 4) styles
- Barrel index uniquement pour `ui/` (pas de barrel par domaine)

### Tests

- Co-located : `Component.test.tsx` à côté de `Component.tsx`
- Vitest + Testing Library
- Coverage cible : services + utils > 60%, components > 30%

## 6.2 Règles Git

### Branches

- `feat/<description-kebab>` — nouvelles features
- `fix/<description-kebab>` — corrections de bugs
- `chore/<description-kebab>` — maintenance, refacto, cleanup
- `docs/<description-kebab>` — documentation seule
- `refactor/<description-kebab>` — refacto sans changement comportement
- `perf/<description-kebab>` — optimisations performance

### Commits

Format : `<type>(<scope>): <description impérative>` (max 72 chars)

Types autorisés : `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `ci`, `test`, `style`

Body optionnel : explication du pourquoi (pas du quoi).
Footer optionnel : `Co-Authored-By:` si IA collaborated, `Closes #issue` si applicable.

### Workflow

```
feat/xxx → develop (squash merge, PR)
develop → staging (squash merge, PR)
staging → main (squash merge, PR)
```

- ❌ Jamais de push direct sur `main`
- ❌ Jamais de force-push sur `main` ou `staging`
- ✅ Push direct OK sur `develop` pour petits commits
- ✅ Tags release sur `main` : `release-YYYY-MM-DD`

### CI requirements

Toute PR doit passer :

- `npm run lint` (0 errors)
- `npm run build` (success)
- Tests vitest (success)
- Bundle size budget (≤ 325 KB gzip)

## 6.3 Règles UI

### Tokens

- ✅ Toujours utiliser `var(--color-*)` ou classes Tailwind
- ❌ Jamais de `#hexcolor` ou `rgb()` en dur
- ✅ Spacing : utiliser les tokens Tailwind (`gap-4`, `p-6`, etc.)
- ❌ Jamais de pixel values arbitraires (`top: 13px`)

### Composants

- ✅ Utiliser les primitives `ui/` avant de créer un composant custom
- ✅ Si tu crées un composant utilisé > 2 fois → le déplacer en `ui/`
- ❌ Pas de styles inline (`style={{...}}`) sauf valeurs dynamiques
- ✅ A11Y obligatoire : `aria-label`, `role`, focus management

### États

- ✅ Loading : Skeleton (préférable) ou Spinner
- ✅ Empty : EmptyState component (à créer Phase 2)
- ✅ Error : ErrorState component avec retry (à créer Phase 2)

### Performance

- ✅ Images : `loading="lazy"`, dimensions explicites
- ✅ Compression côté client avant upload
- ✅ Lazy import pour les routes non-critiques

## 6.4 Règles backend

### Migrations SQL

- Format : `YYYYMMDD_description_snake_case.sql`
- Une migration = un changement atomique (pas de mega-migrations)
- Toujours **testable manuellement** sur DEV avant PROD
- **Documentation obligatoire** : commentaire au top expliquant le pourquoi
- Mettre à jour `database-architecture.md` si schema change
- Régénérer `src/types/supabase.ts` après chaque migration

### RLS

- ✅ RLS **obligatoire** sur toute nouvelle table publique
- ✅ Policies pour : SELECT, INSERT, UPDATE, DELETE séparément
- ❌ Jamais de `USING (true)` sur table sensible
- ✅ Préférer `WITH CHECK` explicite plutôt qu'implicite

### Edge Functions

- TypeScript + Deno
- Auth obligatoire (header `Authorization: Bearer <jwt>`)
- Rate limiting recommandé
- Logs sortant : pas de PII

### Storage

- 5 buckets : `avatars`, `post-media`, `banners`, `exports`, `community-photos`
- RLS policies : owner write, public read (sauf exports = signed URL)
- EXIF stripping **obligatoire** avant upload (RGPD)
- Compression client recommandée

### React Query

- Query keys typées et structurées : `['feed', 'recent', userId, page]`
- Stale time par défaut : 30s
- GC time : 5 min
- Invalidations ciblées (pas globales)

## 6.5 Règles documentation

- Docs au format Markdown dans `docs/`
- Un sujet = un document maître (cf. `docs/README.md` master index)
- Naming : `MAJUSCULES_UNDERSCORE.md` au root, `kebab-case.md` dans subdirs
- Header obligatoire avec : Version, Date, Posture, Source, Lecture cible
- Mise à jour à chaque ajout/déplacement → mettre à jour `docs/README.md` + `PROJECT_STRUCTURE.md`

---

# 📊 Métriques de succès post-roadmap (3 mois)

| Métrique                    | Avant     | Cible             |
| --------------------------- | --------- | ----------------- |
| Composants > 200 lignes     | 14        | 0                 |
| Casts `as unknown as`       | 22        | 0                 |
| Coverage tests global       | ~2%       | > 30%             |
| Coverage services           | 5%        | > 60%             |
| Bundle JS gzip              | 325 KB    | < 280 KB          |
| Storybook primitives        | 0         | 38 (V1)           |
| WCAG AA fails               | 7         | 0                 |
| TypeScript drift            | Présent   | 0 (CI gate)       |
| Tests E2E critical path     | 0         | 1 (signup→delete) |
| Time to onboard nouveau dev | 1 semaine | 1 jour            |

---

# 📎 Documents source

Ce document master synthétise les audits suivants. Pour le détail :

- `docs/SYNTHESE_AUDITS.md` — Causes racines RC-A à RC-G
- `docs/SYNTHESE_GIT.md` — Cause racine RC-H
- `docs/AUDIT_FLOWS.md` — Audit fonctionnel par flow
- `docs/AUDIT_TECHNIQUE.md` — Dette technique v1
- `docs/AUDIT_TECH_DEBT_GLOBAL.md` — Dette technique globale post-fixes
- `docs/AUDIT_DESIGN_SYSTEM.md` — Audit DS complet
- `docs/STORYBOOK_STRATEGY.md` — Stratégie Storybook
- `docs/AUDIT_PERFORMANCE.md` — Audit perf
- `docs/AUDIT_LEGAL.md` — RGPD + Loi 25
- `docs/AUDIT_SUPABASE.md` — DB + RLS
- `docs/AUDIT_DB_LIVE.md` — État live MCP
- `docs/AUDIT_GIT.md` — Repo Git
- `docs/PLAN_ACTION.md` v1.1 — Priorisation produit
- `docs/PLAN_ACTION_GIT.md` — Plan Git
- `docs/CLEANUP_PLAN.md` v1.1 — Cleanup repo (✅ exécuté)
- `docs/PROJECT_STRUCTURE.md` — Carte vivante repo
- `docs/RELEASE_READINESS.md` — État pré-release
- `docs/DEPLOYMENT_RUNBOOK.md` — Procédure deploy

## Hierarchie de lecture pour un nouveau dev

```
JOUR 1 (3h)
├── CLAUDE.md (1h)              Instructions IA + culture projet
├── README.md (15 min)          Présentation produit
├── PROJECT_MASTER.md (1h)      ← CE DOCUMENT (référence master)
└── docs/PROJECT_STRUCTURE.md   Carte du repo

JOUR 2 (2h)
├── GUIDELINES.md               Éco-conception + a11y
├── docs/USER_STORIES.md        Vision produit
└── docs/PLAN_ACTION.md         Roadmap actuelle

JOUR 3 (technique)
├── docs/backend/database-architecture.md
├── docs/05-design-system/      Tokens + composants
└── (sélectionner audits selon domaine)
```

---

**📌 Ce document est la source de vérité unique pour engineering & architecture. Toute décision structurelle doit le mettre à jour.**
