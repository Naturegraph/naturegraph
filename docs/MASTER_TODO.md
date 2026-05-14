# Naturegraph — MASTER TODO (post cycle 1)

> **Version** : 2.2 — 2026-05-14 (BATCH 36 — fixes critiques pre-launch)
> **Statut** : 📌 **Beta closed access ready** — 19 refactos optionnels restants
> **Voir le bilan complet** : [`STATUS_2026-05-13.md`](STATUS_2026-05-13.md)
> **Voir runbook launch** : [`BETA_LAUNCH_RUNBOOK.md`](BETA_LAUNCH_RUNBOOK.md)
> **Lecture cible** : ouvrir au debut de chaque session pour identifier la prochaine tache

---

## 🎯 Etat actuel (snapshot 2026-05-14)

- **3 branches alignees** au SHA `b77e1d7` + BATCH 36 sur `feat/batch-36-pre-launch-fixes` (PR en cours)
- **Bundle gzip** : 406 KB (budget 420 KB — bumpe pour absorber BATCH 28-35 admin/beta)
- **Tests** : 34/34 vitest + 5 smoke + 7 beta-flow Playwright
- **ESLint** : 0 warning ✅
- **DB** : **5 migrations** a appliquer sur PROD (3 cycle 1 + BATCH 28 + BATCH 36 cron RGPD)
- **i18n** : FR + EN couverts pour admin + beta (BATCH 36)
- **SEO** : sitemap.xml + robots.txt + manifest.json livres (BATCH 36)

---

## 📦 Cycle 1 livre (25 BATCHES — 98 taches)

Voir [`STATUS_2026-05-13.md`](STATUS_2026-05-13.md) pour le detail batch par batch.
Resume :

- **Foundations** : helpers Supabase + CI + types + drift detection (BATCH 1, 12, 13)
- **GitHub pro** : templates + CODEOWNERS + dependabot + CodeQL + changesets (BATCH 2, 11, 17, 25)
- **Design System** : 3 primitives + adoption 4 sites + ConfirmModal slots + upload spinners + page titles (BATCH 5-10)
- **A11Y WCAG AA** : onboarding + OTP + aria-live + Modal natif + StepIndicator (BATCH 3)
- **Performance** : RAF throttle + lazy routes + compression client + tree-shake (BATCH 4, 16)
- **DB Supabase** : audit advisors + 54 RLS policies wrap + 4 indexes drop + 7 doublons cleanup (BATCH 12, 14, 22, 24)
- **Tests & Quality** : Playwright E2E + tests unit + coverage v8 + ESLint 0 warning + knip + npm audit fix HIGH (BATCH 18, 20, 21, 23, 25)
- **Docs** : CONTRIBUTING + CHANGELOG + PATTERN_TYPE_CASTS + CONVENTIONS_TODO + AUDITS frais (BATCH 16, 17, 19, 26)

---

## 🚀 Cycle 2 livre — Beta launch (9 BATCHES — BATCH 27-35)

> **Statut** : 🟢 Tout livre, pret pour passage en prod. Voir [`BETA_LAUNCH_RUNBOOK.md`](BETA_LAUNCH_RUNBOOK.md).

- **BATCH 27** : Docs strategies v2.0 (BETA_CLOSED_ACCESS_STRATEGY + ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY)
- **BATCH 28** : DB foundation (8 tables admin + beta + 4 RPC + 13 RLS policies + trigger immutabilite audit log)
- **BATCH 29** : Edge Function `validate-beta-key` (Deno + rate limit 5/IP/10min + format regex + RPC claim atomic)
- **BATCH 30** : Front signup (BetaKeyGate + Waitlist + AuthPage mode 'beta-key' + service beta)
- **BATCH 31** : Admin layout (AdminGuard + AdminLayout + 5 routes lazy `/admin/*`)
- **BATCH 32** : Admin Module 1 Dashboard + Module 4 Beta + Module 5 Audit (RPC generate_beta_keys)
- **BATCH 33** : Admin Module 2 Users (search debounced + filter + 4 actions + log audit) + Module 3 Moderation (filters + 4 actions + reporter lookup + soft-remove content)
- **BATCH 34** : Tests E2E beta flow Playwright (7 tests : waitlist, signup gate, admin redirect, format auto)
- **BATCH 35** : Beta Launch Runbook (sections A-H : DB + Vercel + super_admin bootstrap + cles + invitations + monitoring + rollback + checklist)
- **BATCH 36** : Fixes critiques pre-launch (audit-driven) :
  - Fix bug `AdminGuard` redirect `/auth` (404) → `/login` (cohérent ProtectedRoute)
  - Migration `20260514_anonymize_beta_signup_log_cron.sql` (RGPD J+30 IP anonymise sur `beta_signup_log`)
  - i18n FR + EN : ajout sections `admin.*` (180+ cles) + `auth.beta.*` (16 cles)
  - SEO : `public/sitemap.xml` + `public/robots.txt` (Disallow /admin) + `public/manifest.json` PWA + lien dans `index.html`
  - `.env.example` : ajout `VITE_BETA_GATE_ENABLED`, `VITE_SENTRY_DSN`, `VITE_APP_ENV` avec commentaires
  - `BetaKeyGate` : checkbox "J'accepte les conditions de la beta" obligatoire (strategy ligne 643)
  - `useAdminAction` hook : DRY le logging audit (strategy ligne 562), refactor AdminUsers + AdminModeration + AdminBeta
  - `BETA_LAUNCH_RUNBOOK.md` : retire mention migration inexistante, ajoute verifs cron RGPD Section A.2

**Actions Nicolas requises pour go-live** : voir [`BETA_LAUNCH_RUNBOOK.md`](BETA_LAUNCH_RUNBOOK.md) Section H.

---

## 📋 19 taches restantes (sessions dediees)

### 🔴 Refactos composants > 200 lignes (13 taches, M chacun)

> **Pas bloquants pour MVP** — a faire au fil des features touchant ces composants.

| ID    | Composant                                               | LOC | Plan refacto                                                                                                |
| ----- | ------------------------------------------------------- | --- | ----------------------------------------------------------------------------------------------------------- |
| T-011 | `src/components/onboarding/OnboardingStep4.tsx`         | 667 | Extraire `<UsernameValidator>` + `<BannedCheck>`. **Couple avec T-063** (banned words server-side).         |
| T-012 | `src/components/settings/SettingsPanel.tsx`             | 727 | 4 sous-composants par section. **Couple avec T-070** (react-hook-form Settings).                            |
| T-013 | `src/components/contribute/ContributeEncounterForm.tsx` | 681 | FormProvider + sub-steps. **Couple avec T-071** (react-hook-form Encounter, zod schemas T-068 deja livres). |
| T-014 | `src/components/home/FeedSection.tsx`                   | 730 | Container/Presentational + `useFeedFilters`. Affecte le feed central — refacto sensible.                    |
| T-015 | `src/components/home/FeedPost.tsx`                      | 756 | 4 sub-components (Header/Content/Actions/Meta). Composant le **plus consomme** — refacto sensible.          |
| T-028 | `src/components/home/SearchPanel.tsx`                   | 594 | —                                                                                                           |
| T-029 | `src/components/contribute/EncounterStep3.tsx`          | 574 | —                                                                                                           |
| T-030 | `src/components/contribute/EncounterStep2.tsx`          | 510 | —                                                                                                           |
| T-031 | `src/components/home/FeedFilterPanel.tsx`               | 508 | —                                                                                                           |
| T-032 | `src/components/home/ProfileMenu.tsx`                   | 500 | —                                                                                                           |
| T-033 | `src/components/home/PostOptionsMenu.tsx`               | 486 | —                                                                                                           |
| T-034 | `src/components/location/LocationModal.tsx`             | 462 | —                                                                                                           |
| T-035 | `src/components/home/NotificationsPanel.tsx`            | 460 | —                                                                                                           |

**Recommandation** : commencer par T-015 (FeedPost) car composant le plus visible + reutilise. Tests E2E (BATCH 20) couvrent les pages, ajouter tests unit specifiques au moment du refacto.

---

### 🟠 Phase 2 features (5 taches)

| ID    | Feature                                              | Effort  | Notes                                                                                                                                                                                                                |
| ----- | ---------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-016 | `ContributeEditForm` (bouton "Modifier observation") | M       | Pre-fill form + updatePost service + reuse Step1/2/3 components                                                                                                                                                      |
| T-063 | Banned usernames Edge Function                       | S dedie | (1) Table `banned_usernames` RLS read-only + (2) Edge Function `check-username` avec normalisation leetspeak/accents/repetitions + (3) Remplace filter client par appel async + debounce. Sortir 358 mots du bundle. |
| T-069 | Onboarding → react-hook-form + zod                   | M       | zod schemas T-068 deja livres dans `src/schemas/profile.ts`                                                                                                                                                          |
| T-070 | Settings → react-hook-form + zod                     | M       | zod schemas dans `src/schemas/settings.ts`                                                                                                                                                                           |
| T-071 | Encounter → react-hook-form + zod                    | M       | Couple avec T-013, schemas dans `src/schemas/encounter.ts`                                                                                                                                                           |

---

### 🟠 Documentation DS + Storybook (10 taches, ~2 semaines)

> **A faire APRES les refactos critiques** (T-011-T-015) pour eviter de documenter une API qui va changer.

| ID    | Tache                                                                                  |
| ----- | -------------------------------------------------------------------------------------- |
| T-045 | Spec tokens documentee (`docs/design-system/tokens-spec.md`) — source de verite unique |
| T-046 | Catalogue primitives `atoms.md` / `molecules.md` / `organisms.md`                      |
| T-047 | Setup Storybook 8 + Vite + addons (a11y, themes)                                       |
| T-048 | 15 stories atoms (Button, Input, Modal, etc.)                                          |
| T-049 | 12 stories molecules (FormField, Card, Tooltip, etc.)                                  |
| T-050 | 5 stories organisms (Accordion, Alert, Modal, ConfirmModal, Tabs)                      |
| T-051 | Tests visuels (Chromatic ou Playwright screenshot)                                     |
| T-052 | Deploy Storybook Vercel `storybook.naturegraph.fr`                                     |
| T-100 | Page `DesignTokens.stories.tsx` (visualisation tokens)                                 |
| T-101 | Page `Welcome.mdx` (onboarding equipe Storybook)                                       |

Strategie : voir [`STORYBOOK_STRATEGY.md`](STORYBOOK_STRATEGY.md).

---

### 🟡 Post-deploy (4 taches, declenchees par go-live beta)

| ID    | Action                                                   | Quand                |
| ----- | -------------------------------------------------------- | -------------------- |
| T-060 | Audit Lighthouse + axe-core sur 5 pages cles             | Apres staging deploy |
| R-6   | Tag git `release-YYYY-MM-DD` ou `v0.1.0-beta.1` sur main | Au go-live           |
| R-7   | Smoke test prod apres deploy                             | Post-deploy          |
| R-8   | Update `RELEASE_READINESS.md` (a recreer)                | Post-deploy          |

---

## 🛠️ Workflow de session

### Au debut de session

```bash
git fetch --all --prune
git log -1 --oneline origin/main          # verifier SHA
npm install                                # sync deps
npm test                                   # 34/34 verts
```

### Pour creer un nouveau batch

```bash
git checkout develop
git pull origin develop
git checkout -b feat/batch-N-description
# ... travail ...
npm run build && npm test                  # CI local
git add -A
git commit -m "feat: ..."                  # convention commits
git push -u origin feat/batch-N-description
gh pr create --base develop --title "..." --body "..."
```

### Pour terminer un batch (cycle develop -> staging -> main)

1. PR merge develop : `gh pr merge $PR_NUM --squash --delete-branch=false`
2. PR develop → staging
3. PR staging → main
4. Force-align les 3 branches au meme SHA (voir `STATUS_2026-05-13.md` pour le script)

### Outils dispo

```bash
npm run lint                # ESLint (0 warning attendu)
npm run build               # TS + Vite build
npm test                    # vitest unit
npm run test:coverage       # coverage v8
npm run test:e2e            # Playwright E2E
npm run test:e2e:install    # premier setup (~150 MB)
npm run check:dead-code     # knip
npm run check:types-drift   # types vs DB schema
npm run changeset           # add changeset for release
```

---

## 📚 Reference docs

- **[`STATUS_2026-05-13.md`](STATUS_2026-05-13.md)** — bilan complet cycle 1 + recommandations pour reprise
- **[`PROJECT_MASTER.md`](PROJECT_MASTER.md)** — source de verite engineering
- **[`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)** — carte vivante du repo
- **[`../CONTRIBUTING.md`](../CONTRIBUTING.md)** — workflow branches + commits
- **[`../CHANGELOG.md`](../CHANGELOG.md)** — historique versions
- **[`CONVENTIONS_TODO.md`](CONVENTIONS_TODO.md)** — format TODO `(YYYY-MM-DD, owner, #issue)`
- **[`PATTERN_TYPE_CASTS.md`](PATTERN_TYPE_CASTS.md)** — convention `as unknown as X`
- **[`AUDIT_ADVISORS_2026-05-13.md`](AUDIT_ADVISORS_2026-05-13.md)** — audit DB Supabase live (security + performance)
- **[`AUDIT_DEAD_CODE_2026-05-13.md`](AUDIT_DEAD_CODE_2026-05-13.md)** — audit knip dead code
- **[`archive/cycle-1-may-2026/`](archive/cycle-1-may-2026/)** — 16 docs cycle 1 archives (plans + audits)

---

## 📜 Historique versions

- **v2.2** (2026-05-14) — BATCH 36 fixes critiques pre-launch (RGPD + i18n + SEO + consent + DRY admin).
- **v2.1** (2026-05-14) — BATCH 27-35 livres pour beta closed access. Beta launch ready.
- **v2.0** (2026-05-13) — Refondu post-cycle 1 (BATCH 26). 98/117 done, focus sur les 19 restantes.
- **v1.5** (2026-05-13) — Cycle BATCHES 1-24 livre. 91/117 done.
- **v1.0** (2026-05-04) — Document de pilotage initial avec 105 taches T-001 a T-105.
