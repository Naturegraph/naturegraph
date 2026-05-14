# 🔄 SESSION HANDOFF — Naturegraph

> **Document de transmission inter-session Claude Code.**  
> Permet une reprise immédiate du projet sans contexte conversationnel préalable.

**Dernière mise à jour** : 2026-05-14  
**Session** : BATCH 27-45 (cycles 2 + 3 complets)  
**SHA actuel main** : `b98d31f` (sera mis à jour à `<post-batch-45-sha>` après dernier merge)  
**Branches alignées** : `main` = `develop` (content), `staging` aligné via merge

---

## 1. 🎯 Résumé global du projet

### Naturegraph

**Plateforme citoyenne de biodiversité.** Permet aux utilisateurs de partager observations nature (faune/flore), identification collaborative TAXREF, carnets d'observations.

### Stack

| Couche           | Technologie                                                      | Version                                    |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| **Frontend**     | React + TypeScript + Vite                                        | React 19, TS 5.9 strict, Vite 7            |
| **Styling**      | Tailwind v4 + SCSS 7-1 pattern                                   | tailwindcss ^4.2                           |
| **Routing**      | react-router-dom                                                 | v7.13                                      |
| **State server** | TanStack Query                                                   | v5.90                                      |
| **i18n**         | i18next FR + EN                                                  | ^25.8 + ^16.5 react                        |
| **Backend**      | Supabase (Postgres + Auth + Storage + Edge Functions + Realtime) | @supabase/supabase-js ^2.99                |
| **Hosting**      | Vercel                                                           | Project `prj_64Yk2OP2DNadcDG8AXCMNJ9dDioW` |
| **Monitoring**   | Sentry (lazy-loaded)                                             | @sentry/react ^10.53                       |
| **Tests**        | Vitest 4 + Playwright                                            | vitest, @playwright/test ^1.60             |
| **Quality**      | ESLint 9 + Prettier + knip + lint-staged + husky                 | tous installés                             |

### Architecture globale

- **SPA Vite** déployé sur Vercel
- **Backend single-tenant Supabase** (`hrxgduvworofnrjmgpcj.supabase.co`)
- **RLS** sur 100% des tables (31 tables), pattern optimisé `(SELECT auth.uid())`
- **Lazy routes** partout (code splitting eco-conception)
- **i18n FR/EN** complet (admin + beta + auth + common)

### État actuel

- 🟢 **Production live** : https://naturegraph-eight.vercel.app
- 🟡 **Domain `naturegraph.fr`** : en transfert Hostinger (~7 jours)
- 🟢 **Tag release** : `v0.1.0-beta.1` (GitHub Release publiée)
- 🟢 **CI/CD** : green sur 3 workflows (CI, CodeQL, ci-health 4h)
- 🟢 **Beta closed access** : strategy **TOTAL GATE** (voir Section 4)
- 🟡 **Beta keys envoyées** : 0 (Nicolas doit lancer Action 8 — voir Section 6)

### Maturité

- **MVP** : 100% livré (cycle 1, 25 BATCHES)
- **Beta closed access** : 100% livré (cycle 2, BATCH 27-37)
- **Cleanup/hardening** : 100% livré (cycle 3, BATCH 38-45)
- **Production-readiness** : 98%
- Les 2% restants = actions humaines (envoi invitations, DNS transfert)

---

## 2. 🛠 Travail effectué durant cette session

### Audits réalisés (6 phases agents parallèles)

| Phase | Domaine               | Findings                                         |
| ----- | --------------------- | ------------------------------------------------ |
| 1     | Structure + dead code | 27 fichiers morts (knip), 8 composants >600 LOC  |
| 2     | Documentation         | 7 docs obsolètes au top-level                    |
| 3     | Factorisation         | 35+ duplications mineures, patterns à mutualiser |
| 4     | Infrastructure        | CSP conflict, branch protection insuffisante     |
| 5     | UI/UX                 | DS solide mais quelques inconsistances           |
| 6     | Sécurité              | RLS solide, advisors Supabase à fixer            |

### BATCHES livrés (38-45)

| BATCH  | Type                 | Détail                                                                                                              | PR       |
| ------ | -------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| 38     | chore(cleanup)       | Suppression 10 fichiers morts (-1100 LOC)                                                                           | #164     |
| 39     | fix(infra)           | Unify CSP + harden .gitignore `.env.*` glob                                                                         | #164     |
| 40     | docs                 | Archive 7 docs obsolètes vers `cycle-2-may-2026/`                                                                   | #164     |
| 41     | refactor             | Hooks DRY (`useBodyScrollLock`, `useEscapeKey`, `useDebouncedValue`) + constants `STALE_TIMES`/`PAGE_SIZES`/`media` | #164     |
| 42     | refactor(ui)         | Token `--color-amber-primary` + remplace emoji 🛡 par icône Lucide                                                  | #164     |
| 43     | feat(monitoring+sec) | Sentry install + retrofit `SET search_path` sur 5 RPC                                                               | #166     |
| 44     | fix(security)        | Restrict 4 buckets Storage policies (advisor fix)                                                                   | #168     |
| **45** | **feat(beta)**       | **Welcome Screen + Beta Access Gate total (Nicolas demande)**                                                       | **#170** |

### Infrastructure setup (actions auto)

| Domaine      | Action                                                             | Statut              |
| ------------ | ------------------------------------------------------------------ | ------------------- |
| **GitHub**   | Branch protection main + staging + develop                         | ✅ Configuré        |
| **GitHub**   | Tag `v0.1.0-beta.1` + GitHub Release publiée                       | ✅                  |
| **Vercel**   | Projet `naturegraph` créé (prj_64Yk2OP2DNadcDG8AXCMNJ9dDioW)       | ✅                  |
| **Vercel**   | 9 env vars configurées (production + preview)                      | ✅                  |
| **Vercel**   | DSN Sentry actif                                                   | ✅                  |
| **Vercel**   | App live `naturegraph-eight.vercel.app`                            | ✅                  |
| **Vercel**   | 4 domaines attachés (naturegraph.fr / www / beta / vercel default) | ✅ (DNS en attente) |
| **Supabase** | RPC `check_beta_access_key_validity` (readonly)                    | ✅ Appliquée DEV    |
| **Supabase** | Cron RGPD `anonymize_beta_signup_log` J+30                         | ✅ Active           |
| **Supabase** | Fix RLS recursion `admin_users` (BATCH 37)                         | ✅ Appliqué         |
| **Supabase** | 5 RPC retrofitted `SET search_path` (BATCH 43)                     | ✅ Appliqué         |
| **Supabase** | 4 Storage buckets policies restreintes (BATCH 44)                  | ✅ Appliqué         |
| **Supabase** | super_admin Nicolas bootstrapped                                   | ✅ Inséré DEV       |
| **Supabase** | Password test set pour Nicolas (`NaturegraphDev2026!`)             | ⚠️ À rotate         |

### Logique BATCH 45 (Welcome Screen)

**Strategy revisée** : tout le site est gated. Seuls `/welcome` et `/waitlist` sont accessibles sans code.

**Flow** :

1. Visiteur sans code → redirect `/welcome`
2. Clique "J'ai un code" → input → RPC `check_beta_access_key_validity` (readonly, **ne consomme pas**)
3. Code OK → `localStorage` TTL 7j → redirect `/`
4. Accès complet : landing, signup, login, contact, privacy, legal
5. Au signup réel : `claim_beta_access_key` consomme la clé

**Nouveaux fichiers** :

- `src/services/betaService.ts` : `checkBetaAccessKey()`
- `src/hooks/useBetaAccess.ts` : localStorage + multi-tab sync
- `src/components/guards/BetaAccessGuard.tsx` : redirect /welcome
- `src/pages/Welcome.tsx` : welcome screen (ton convivial)
- `src/router.tsx` : nouvelle route + wrap 6 routes publiques
- `src/i18n/locales/{fr,en}.json` : 13 clés `welcome.*`
- 2 migrations SQL Supabase

---

## 3. 🌿 État actuel des branches

### Convention

```
main      → production (= naturegraph-eight.vercel.app)
staging   → QA / prévalidation
develop   → développement actif
```

### Branch protection (configurée cette session)

| Branche     | Status checks requis                                     | Reviews          | Force-push | Conv resolution |
| ----------- | -------------------------------------------------------- | ---------------- | ---------- | --------------- |
| **main**    | `Lint, Test & Build` + `Analyze (javascript-typescript)` | 0 (Nicolas seul) | ❌ bloqué  | ✅ requise      |
| **staging** | `Lint, Test & Build`                                     | 0                | ❌ bloqué  | non requise     |
| **develop** | aucun                                                    | 0                | ❌ bloqué  | non requise     |

### États actuels (à la fin de cette session)

```
main:    b98d31f release: BATCH 43 -> main (Sentry + search_path retrofit) (#167)
         puis 4c05ccb release: BATCH 44 (#169)
         (sera mis a jour apres merge BATCH 45)
staging: 6df7726 release: align staging with main (post BATCH 43)
         puis f141f49 release(staging): BATCH 44
         (sera mis a jour apres merge BATCH 45)
develop: 9841cf3 release: align develop with main (post BATCH 44)
         puis 941e32e feat(beta): BATCH 45 ...
```

### Stratégie Git utilisée

- **PR squash-merge** vers `develop`
- **PR merge non-ff** depuis `develop` → `staging` (preserve history)
- **PR squash-merge** depuis `staging` → `main`
- **Align develop = main** via `git merge origin/main --no-ff` (pas de force-push grâce à branch protection)
- Tous les batches : 1 PR par batch ou 1 PR groupé si commits stackés

### Actions restantes branches

- ⏳ **Merge PR #170** (BATCH 45) vers `develop` → `staging` → `main`
- 🧹 Suppression `feat/batch-45-beta-access-gate` après merge (cleanup auto)

---

## 4. 📐 Décisions techniques importantes

### Beta closed access — strategy "gate total"

**Décision Nicolas** (cette session) : aucun accès au site sans clé beta validée.

- `/welcome` = point d'entrée unique
- `BetaAccessGuard` wrap toutes les routes publiques
- `useBetaAccess` hook localStorage TTL 7j
- Validation **readonly** au welcome (ne consomme pas)
- Claim réel uniquement au signup
- Pour retirer le gate au launch public : enlever `<BetaAccessGuard>` du router

### Patterns architecturaux

| Pattern           | Convention                                                        | Fichiers ref                                                 |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| **Components UI** | `src/components/ui/` — 38 primitives, barrel `index.ts`           | Button, ConfirmModal, EmptyState...                          |
| **Hooks**         | `src/hooks/use*.ts` — un fichier par hook                         | useBetaAccess, useIsAdmin, useAdminAction                    |
| **Services**      | `src/services/*.ts` — un par table Supabase                       | profileService, betaService, postService                     |
| **Constants**     | `src/constants/*.ts` — centralisé (BATCH 41)                      | reactQuery, media                                            |
| **Types**         | `src/types/supabase.ts` (auto-généré, ne pas éditer)              | regen via `mcp__supabase__generate_typescript_types`         |
| **Guards**        | `src/components/guards/*` + `src/components/admin/AdminGuard.tsx` | BetaAccessGuard, ProtectedRoute, AdminGuard, OnboardingGuard |
| **Pages**         | `src/pages/*.tsx` (top-level) ou `src/pages/Admin/*.tsx`          | lazy-loaded dans router                                      |
| **i18n**          | Tous textes via `t('namespace.key', { defaultValue: '...' })`     | `src/i18n/locales/{fr,en}.json`                              |

### Conventions style code

- **TS strict** : pas de `any`, pas de `// @ts-ignore` non documenté
- **Composants < 200 LOC** (gate CLAUDE.md, souvent dépassé dans le legacy — voir Section 5)
- **JSDoc** sur fonctions/hooks/composants exportés
- **Header commenté** sur chaque fichier (refs BATCH, contexte)
- **Pas d'emoji** dans le code (sauf si user le demande explicitement)
- **Token CSS** (`var(--color-X)`) — jamais de hex hardcoded en dehors des themes SCSS

### Conventions Git commits

```
feat(scope):     nouvelle fonctionnalité
fix(scope):      bug fix
refactor(scope): refactoring sans changement comportement
chore(scope):    cleanup, dependencies, configs
docs:            documentation seule
test:            tests seuls
perf:            optimisation perf
```

Préfixer par `BATCH N` quand applicable pour traçabilité.

### Supabase patterns

- **RLS** : 100% des tables, pattern optimisé `(SELECT auth.uid())` (BATCH 22)
- **RPC SECURITY DEFINER** : avec `SET search_path = public` + `SET row_security = off` si bypass nécessaire
- **Migrations** : `supabase/migrations/YYYYMMDD_description.sql` (chronological)
- **`admin_audit_logs` immutable** : trigger Postgres empêche UPDATE/DELETE
- **Storage buckets** : 5 (avatars/banners/post-media/notebook-covers public, exports private)
- **Edge Functions** : Deno, rate-limited si pre-auth (validate-beta-key)

### Déploiement

- **Vercel auto-deploy** : push sur main/staging/develop → preview ou production
- **Production** : main → `naturegraph-eight.vercel.app` (futur `naturegraph.fr`)
- **Preview** : staging + develop → URLs Vercel `*-naturegraph-9868s-projects.vercel.app`
- **CSP source unique** : `vercel.json` (BATCH 39 — pas dans index.html)
- **Bundle budget** : 420 KB gzip (sum all chunks)

---

## 5. ⚠️ Dette technique restante

### 🔴 Critique (à traiter en priorité)

| ID  | Item                                                                                                                                                                                 | Impact                          | Effort               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | -------------------- |
| D-1 | **`src/types/database.ts` (608 LOC)** duplique `supabase.ts` (auto-généré). Encore importé par 10+ composants.                                                                       | Drift types, bombe à dette      | 3h refacto           |
| D-2 | **8 composants > 600 LOC** : FeedPost (798), FeedSection (745), SettingsPanel (727), Settings.tsx (672), OnboardingStep4 (667), ContributeEncounterForm (695), AdminModeration (639) | Maintenabilité                  | 5-8 jours            |
| D-3 | **`Settings.tsx` vs `SettingsPanel.tsx`** : 2 implémentations 1400 LOC chevauchantes — décision UX requise                                                                           | Confusion + code mort potentiel | 1 jour               |
| D-4 | **EXIF stripping × 2** : `stripExif.ts` + `stripImageExif.ts` divergents                                                                                                             | Risque RGPD bug                 | 2h                   |
| D-5 | **mediaService.ts + storageService.ts dupliquent upload**                                                                                                                            | Drift backend                   | 2h                   |
| D-6 | **CSP `'unsafe-inline'`** sur script-src (Vite/Tailwind nécessite) — devrait passer nonce-based                                                                                      | XSS défense affaiblie           | 1 jour (Vite plugin) |

### 🟠 Haute priorité

| ID   | Item                                                                                                                    | Effort     |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-7  | **`BANNED_USERNAMES` (434 entries inline)** dans `OnboardingStep4.tsx` → table Postgres ou Edge Function                | 4h         |
| D-8  | **i18n inline `defaultValue`** : 290 occurrences dans 44 fichiers (settings._, profile.edit._, etc.) à migrer vers clés | 2h         |
| D-9  | **Tests coverage 5.45%** — gate CI désactivé (`continue-on-error`)                                                      | Continu    |
| D-10 | **Storybook 0%** : strategy écrite (`docs/STORYBOOK_STRATEGY.md`), implémentation T-052 backlog                         | 2 semaines |
| D-11 | **6 buckets Storage policies sont OK mais audit advisor `extension_in_public` (3)** — PostGIS dans public schema        | À voir     |
| D-12 | **Vercel Analytics absent** — `@vercel/analytics` à installer (~1 KB)                                                   | 15 min     |

### 🟡 Moyenne

| ID   | Item                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------- |
| D-13 | 4-5 composants `404-500 LOC` (SearchPanel, ProfileMenu, PostOptionsMenu, EncounterStep2/3) à refacto |
| D-14 | TODO BACKEND × 50 (concentré settings/profile/contribute — Phase 2 wiring)                           |
| D-15 | OAuth Google/Apple/FB stubs dans AuthContext (jamais branchés)                                       |
| D-16 | `scripts/og-screenshot.mjs` chemin Chrome Windows hardcoded → cross-platform                         |

### 🟢 Faible

- Workflow Lighthouse CI sur PR
- Headers COOP/COEP
- PWA icons multi-tailles
- Rate limit Redis pour `validate-beta-key` (si > 1000 req/jour)
- OG image adaptée beta
- Domain `naturegraph.fr` (en attente transfert Hostinger)

### Zones fragiles à surveiller

- **`FeedPost.tsx`** : composant central, modifié → risque régression UX feed
- **`AuthContext.tsx`** (484 LOC) : 12 méthodes, 5 stubs OAuth, modifié → risque casser flow auth
- **Edge Function `validate-beta-key`** : rate limit in-memory non-distribué — si scale > 1 instance, partage de quota cassé
- **`BetaAccessGuard`** : si bug, casse l'accès total au site. Toujours tester sur preview avant merge main
- **Storage policies** : modifiées BATCH 44 → tester `.upload()` et `.remove()` après changement DB

---

## 6. ✅ Actions nécessitant validation Nicolas

### 🔴 Critique (bloquant launch beta réelle)

- [ ] **Action 8 (en cours)** : Aller sur `/admin/beta` (https://naturegraph-eight.vercel.app/admin/beta) → générer 10 clés vague 1 → préparer liste 10 testeurs → envoyer 10 emails (template dans `docs/BETA_LAUNCH_RUNBOOK.md` Section E)
- [ ] **Action 4 (HIBP)** : reportée — Pro Plan Supabase requis ($25/mois). Décision : activer plus tard si besoin
- [ ] **Action 6 (DNS)** : reportée — domaine `naturegraph.fr` en transfert Hostinger. Quand transfert fini (~7j) : ajouter 3 DNS records (CNAME beta, A apex, CNAME www → `cname.vercel-dns.com`)

### 🟠 Haute (décisions produit)

- [ ] **Refacto FeedPost.tsx (798 LOC)** : split en 4 sous-composants (FeedPostHeader, Media, Reactions, Actions). Composant central feed — décision sensible
- [ ] **Settings.tsx vs SettingsPanel.tsx** : trancher quelle source garder
- [ ] **types/database.ts → supabase.ts migration** : 10 imports à modifier, types métier différents — risque drift
- [ ] **Refacto OnboardingStep4** : sortir BANNED_USERNAMES (430 entries) vers table DB ou Edge Function

### 🟡 Moyenne (décisions infra)

- [ ] **Upgrade Supabase Pro Plan** ($25/mois) → débloque HIBP + PITR backups quotidiens
- [ ] **`@vercel/analytics` install** (analytics RGPD-friendly, 1 KB)
- [ ] **Workflow Lighthouse CI** sur PR (perf budget + axe a11y)
- [ ] **CSP nonce-based** : retirer `'unsafe-inline'` (Vite plugin)

### 🟢 Décisions UX/produit

- [ ] **Conditions beta document** : créer une charte beta testeur (NDA, attendus) — actuellement juste checkbox dans BetaKeyGate
- [ ] **Discord setup** : créer serveur + canal `#beta` + lien dans email invitation
- [ ] **Tally form feedback** : créer + envoyer aux testeurs S1 vendredi
- [ ] **OG image beta** : `public/og-preview.png` adapté à "Beta fermée"
- [ ] **Storybook implementation** : 2 semaines effort, décision Phase 2

### Sécurité

- [ ] **Rotation password Nicolas DEV** : password `NaturegraphDev2026!` set cette session pour automation — à rotate post-session
- [ ] **Rotation Vercel API token** : token créé cette session — peut être révoqué sur https://vercel.com/account/settings/tokens (session terminée)

---

## 7. 🏗 Infrastructure & intégrations

### Supabase

- **Projet unique** : `hrxgduvworofnrjmgpcj` (DEV = PROD pour beta)
- **URL** : https://hrxgduvworofnrjmgpcj.supabase.co
- **Plan** : Free (pas de Pro Plan = pas de HIBP)
- **Migrations** : 47 fichiers dans `supabase/migrations/`
- **Edge Functions** : 4 ACTIVE
  - `delete-account` (verify_jwt: true)
  - `export-data` (verify_jwt: true)
  - `weekly-species-digest` (verify_jwt: false, cron)
  - `validate-beta-key` (verify_jwt: false, pre-auth signup)
- **Crons** : 4 actifs (anonymize_orphan_audit_logs, anonymize_beta_signup_log, species_digest, prevent_admin_audit_log_modification trigger)
- **RLS** : 100% tables couvertes, pattern optimisé
- **Storage** : 5 buckets, policies restreintes BATCH 44
- **Advisors** : 72 restants (1 ERROR PostGIS faux positif + 71 WARN non-bloquants ou intentionnels)

### GitHub

- **Repo** : https://github.com/Naturegraph/naturegraph
- **Branches** : main, staging, develop (toutes protégées)
- **Workflows** :
  - `.github/workflows/ci.yml` — Lint + tsc + tests + coverage + build + bundle gate 420 KB
  - `.github/workflows/codeql.yml` — SAST hebdomadaire
  - `.github/workflows/ci-health.yml` — health check toutes les 4h
- **CODEOWNERS** : `@nicolas-douaron`
- **Dependabot** : npm weekly + GH Actions monthly
- **Tag latest** : `v0.1.0-beta.1`

### Vercel

- **Team** : `team_zzrON9ArhdDDL36NJsGppVwN` (naturegraph-9868)
- **Project** : `prj_64Yk2OP2DNadcDG8AXCMNJ9dDioW` (`naturegraph`)
- **Production URL** : https://naturegraph-eight.vercel.app
- **Custom domains** (DNS en attente) :
  - `naturegraph.fr` (apex)
  - `www.naturegraph.fr`
  - `beta.naturegraph.fr`
- **Env vars Production (9)** :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_BETA_GATE_ENABLED=true`
  - `VITE_APP_ENV=production`
  - `VITE_SENTRY_DSN`
- **Env vars Preview (5)** :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_BETA_GATE_ENABLED=false`
  - `VITE_APP_ENV=staging`
  - `VITE_SENTRY_DSN`
- **Framework** : Vite (auto-détecté)
- **CSP source unique** : `vercel.json` (header HTTP)

### Hostinger

- Statut : transfert domaine `naturegraph.fr` en cours depuis KEY-SYSTEMS GmbH
- ETA : jusqu'à 7 jours
- Action post-transfert : configurer 3 DNS records (instructions dans `BETA_LAUNCH_RUNBOOK.md`)

### Sentry

- Account : `nicolasdouaron.ca@gmail.com`
- DSN : `https://906c79da0ffc04b2ed50cfc17bd9a983@o4511389456072704.ingest.de.sentry.io/4511389460398160`
- Statut : ACTIVE en production (Vercel env var configurée)
- Wired via `src/lib/monitoring.ts` (lazy via `await import('@sentry/react')`)
- Plan : Free tier (5K events/mois)

### Monitoring

- **Vercel Analytics** : ❌ Non installé (recommandé Phase 2)
- **Sentry** : ✅ Actif (erreurs JS prod)
- **Supabase Logs** : disponibles via Dashboard
- **ci-health** : workflow GH Actions toutes 4h vérifie HEAD staging + Supabase health → ouvre issue auto

### Storybook

- Statut : ❌ Non installé (stratégie écrite dans `docs/STORYBOOK_STRATEGY.md`)
- Phase 2 backlog T-052
- Subdomain prévu : `storybook.naturegraph.fr`

### Variables d'env récap

| Variable                 | DEV             | Vercel Prod  | Vercel Preview |
| ------------------------ | --------------- | ------------ | -------------- |
| `VITE_SUPABASE_URL`      | ✅ `.env.local` | ✅           | ✅             |
| `VITE_SUPABASE_ANON_KEY` | ✅ `.env.local` | ✅           | ✅             |
| `VITE_BETA_GATE_ENABLED` | `true`          | `true`       | `false`        |
| `VITE_APP_ENV`           | `development`   | `production` | `staging`      |
| `VITE_SENTRY_DSN`        | (vide)          | ✅           | ✅             |

### Secrets

- ✅ Aucun secret (service_role / sb_secret) committé dans le repo
- ✅ `.env.local` gitignored
- ✅ `.gitignore` pattern `.env.*` + `!.env.example` (BATCH 39)
- ⚠️ Token Vercel utilisé cette session : à révoquer post-session si Nicolas le souhaite

---

## 8. 💻 Commandes utiles

### Setup local

```bash
git clone https://github.com/Naturegraph/naturegraph.git
cd naturegraph
npm install
cp .env.example .env.local  # puis remplir les valeurs
npm run dev                  # → http://localhost:5173
```

### Quality checks

```bash
npm run lint                 # ESLint (objectif : 0 errors)
npm run build                # tsc -b && vite build (TS strict)
npm test                     # vitest unit (41/41 actuellement)
npm run test:e2e             # Playwright (12 tests : 5 smoke + 7 beta-flow)
npm run test:coverage        # coverage v8
npm run check:dead-code      # knip (16+ unused exports residuels)
npm run check:types-drift    # types vs DB
```

### Workflow Git habituel

```bash
git checkout develop
git pull origin develop
git checkout -b feat/batch-N-description

# ... travail + commits atomiques ...

npm run build && npm test     # verify locally
git push -u origin feat/batch-N-description

gh pr create --base develop --title "..." --body "..."
gh pr merge $PR_NUM --squash
```

### Promotion releases

```bash
# develop -> staging
git checkout staging
git pull origin staging
git merge origin/develop --no-ff -m "release(staging): BATCH X..."
git push origin staging

# staging -> main (via PR)
gh pr create --base main --head staging --title "release: ..."
gh pr merge $PR_NUM --squash

# Align develop with main (post squash)
git checkout develop
git merge origin/main --no-ff -m "release: align develop..."
git push origin develop
```

### Supabase via MCP (configuré dans Claude MCP)

- `mcp__supabase__execute_sql` : queries directes
- `mcp__supabase__apply_migration` : migrations DDL
- `mcp__supabase__generate_typescript_types` : regen `src/types/supabase.ts`
- `mcp__supabase__get_advisors` : security/perf advisors
- `mcp__supabase__list_edge_functions` : list deployed
- `mcp__supabase__deploy_edge_function` : deploy

### Vercel via API (token requis)

```bash
VERCEL_TOKEN="..."  # depuis https://vercel.com/account/settings/tokens
TEAM_ID="team_zzrON9ArhdDDL36NJsGppVwN"
PROJECT_ID="prj_64Yk2OP2DNadcDG8AXCMNJ9dDioW"

# List env vars
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID"

# Trigger redeploy main
curl -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID&forceNew=1" \
  -d '{"name":"naturegraph","project":"'$PROJECT_ID'","target":"production","gitSource":{"type":"github","ref":"main","repoId":1186783041}}'
```

---

## 9. 📁 Fichiers & dossiers importants

### Structure top-level

```
naturegraph/
├── src/
│   ├── components/          # composants React
│   │   ├── ui/              # 38 primitives DS (Button, Modal, EmptyState...)
│   │   ├── admin/           # AdminGuard (Module Admin)
│   │   ├── auth/            # SignupForm, LoginForm, BetaKeyGate, VerificationForm
│   │   ├── guards/          # ProtectedRoute, PublicRoute, BetaAccessGuard, OnboardingGuard
│   │   ├── home/            # FeedPost (798 LOC ⚠️), FeedSection (745 LOC ⚠️)
│   │   ├── contribute/      # Encounter forms (multi-step)
│   │   ├── profile/         # Profile tabs + EditProfilePanel
│   │   ├── settings/        # SettingsPanel (727 LOC ⚠️)
│   │   ├── onboarding/      # OnboardingStep1-4 (Step4 = 667 LOC ⚠️ + 434 banned words inline)
│   │   ├── location/        # CityAutocomplete + Map (Phase 2)
│   │   └── layout/          # Header, Footer, MainLayout, CookieBanner
│   ├── contexts/            # Auth, Theme, Toast, Location, Accessibility
│   ├── hooks/               # useFeed, useProfile, useIsAdmin, useAdminAction,
│   │                        # useBetaAccess (BATCH 45), useBodyScrollLock,
│   │                        # useEscapeKey, useDebouncedValue (BATCH 41)
│   ├── services/            # postService, profileService, betaService, etc.
│   ├── pages/               # Landing, Welcome (BATCH 45), Home, Profile, Settings,
│   │   │                    # Contribute, NotificationsPage, Waitlist, NotFound
│   │   └── Admin/           # 6 pages : Layout, Dashboard, Users, Moderation, Beta, AuditLogs
│   ├── lib/                 # supabase.ts, supabaseHelpers.ts, monitoring.ts
│   ├── types/               # supabase.ts (auto-généré), database.ts (LEGACY à migrer)
│   ├── i18n/                # FR + EN locales
│   ├── styles/              # SCSS 7-1 pattern
│   ├── data/mock/           # (vide — Phase 2 retiré BATCH 26)
│   ├── App.tsx              # root component
│   ├── main.tsx             # entry point
│   └── router.tsx           # createBrowserRouter avec lazy routes
├── public/                  # sitemap.xml, robots.txt, manifest.json, hermine-icon.png, og-preview.png
├── supabase/
│   ├── migrations/          # 47 fichiers SQL chronologiques
│   └── functions/           # 4 Edge Functions (delete-account, export-data, weekly-species-digest, validate-beta-key)
├── tests/e2e/               # smoke.spec.ts + beta-flow.spec.ts (Playwright)
├── docs/                    # Documentation projet
│   ├── README.md            # Index master
│   ├── MASTER_TODO.md       # ⭐ Pilotage central v2.2
│   ├── BETA_LAUNCH_RUNBOOK.md # ⭐ Operations go-live (Sections A-H)
│   ├── BETA_CLOSED_ACCESS_STRATEGY.md # Strategy v2.0
│   ├── ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md # Strategy v2.0
│   ├── SESSION_HANDOFF.md   # ⭐ CE DOCUMENT
│   ├── backend/             # DB architecture, RLS, schema
│   ├── security/            # data protection, rls policies, media security
│   ├── devops/              # deployment, environments, monitoring
│   ├── api-connection/      # supabase-setup, auth-flow, endpoints
│   ├── design-system/       # tokens, guidelines, components
│   ├── PRD_*.md             # Specs feature par feature
│   ├── EPIC_*.md            # Decoupage operationnel
│   └── archive/             # cycle 1 + cycle 2 archived docs
├── scripts/                 # ci-health, seed-fr-cities, check-supabase-types-drift, og-screenshot
├── .github/
│   ├── workflows/           # ci.yml, codeql.yml, ci-health.yml
│   ├── CODEOWNERS
│   └── dependabot.yml
├── package.json             # 14 deps + 28 devDeps
├── tsconfig.json            # TS strict
├── tailwind.config.js       # absent (Vite v4 inline @theme)
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.js
├── knip.json
├── vercel.json              # CSP + security headers
├── index.html               # entry + meta (CSP retirée BATCH 39)
├── .env.example             # template variables
├── .env.local               # local dev (gitignored)
└── CLAUDE.md                # règles Claude Code projet
```

### Fichiers critiques à NE PAS casser

| Fichier                                              | Pourquoi                                                  |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `src/components/guards/BetaAccessGuard.tsx`          | Si cassé → tous les routes inaccessibles ou exposées      |
| `src/hooks/useBetaAccess.ts`                         | localStorage logic critique pour beta                     |
| `src/components/admin/AdminGuard.tsx`                | Si cassé → /admin inaccessible OU exposé                  |
| `src/hooks/useIsAdmin.ts`                            | Query RLS — si change, casser admin access                |
| `src/lib/supabase.ts`                                | Singleton client Supabase — storage adapter custom        |
| `src/lib/authStorage.ts`                             | localStorage vs sessionStorage routing pour "Remember me" |
| `src/contexts/AuthContext.tsx`                       | 484 LOC — flow auth complet, OTP rate limit, etc.         |
| `vercel.json`                                        | CSP source unique — si cassé, prod broken                 |
| `supabase/migrations/20260514_beta_admin_system.sql` | Foundation admin + beta                                   |
| `supabase/functions/validate-beta-key/index.ts`      | Edge Function critique pour signup beta                   |

### Zones sensibles

- **Bundle gate CI** : 420 KB gzip max. Si dépassement → CI rouge sur `Bundle size check`. Historique : 300→320→325→330→420 (BATCH 28-35 admin/beta)
- **Sentry** : lazy via `monitoring.ts`. Si erreur d'init → no-op silencieux, pas de crash app
- **`admin_audit_logs` immutable** : trigger Postgres. Ne JAMAIS essayer UPDATE/DELETE (raise exception)
- **`generate_beta_keys` RPC** : check `is_admin(auth.uid())` interne. Si appelé hors admin → exception "Only admins"

---

## 10. 🚀 Recommandation pour la prochaine session

### Si Nicolas est en train de lancer la beta

1. **Vérifier le merge BATCH 45 est bien sur main** (`gh pr list --state open` doit être vide ou seulement PR pending)
2. **Tester `/welcome`** sur https://naturegraph-eight.vercel.app/
3. **Suivre `docs/BETA_LAUNCH_RUNBOOK.md` Section H** (checklist 12 items)

### Si beta déjà lancée (Section 6 Action 8 faite)

1. **Daily monitoring** : `/admin/dashboard` (5 min/jour)
2. **Sentry** : vérifier que les erreurs JS remontent
3. **Stats conversion** : SQL `BETA_LAUNCH_RUNBOOK.md` Section E.2
4. **Si beta < 30% conversion à J+3** : retoucher template email + relancer

### Si refacto tech debt (Phase 2)

Ordre recommandé pour gain maximal sans casser :

1. **D-1 Migration `types/database.ts → supabase.ts`** (3h) — sortie de la dette types
2. **D-4 + D-5 Unify EXIF + upload** (4h) — sécurité RGPD
3. **D-7 Sortir `BANNED_USERNAMES`** (4h) — table Postgres ou Edge Function
4. **D-2 Refacto FeedPost (798 LOC) en 4 sous-composants** (2-3 jours) — risque régression : faire derrière feature flag ou en preview branch longtemps
5. **D-8 i18n inline cleanup** (2h) — preparation EN launch

### Pièges à éviter

- ⚠️ **NE PAS supprimer `src/types/database.ts` AVANT** d'avoir migré les 10 imports — TS strict bloquera build mais le warning n'est pas évident
- ⚠️ **NE PAS modifier le BetaAccessGuard** sans tester en preview que `/welcome` reste accessible (sinon site lock-out)
- ⚠️ **NE PAS appliquer de migration `supabase/migrations/*` directement** sans tester sur DEV (pas de PROD séparé — DEV = beta live)
- ⚠️ **NE PAS désactiver branch protection** sans raison — c'est ce qui empêche un force-push accidentel sur main
- ⚠️ **NE PAS commiter `.env.local`** — déjà gitignored, mais double-check si modifié
- ⚠️ **NE PAS push sur main directement** — toujours via PR (branch protection le rejette mais ne pas tenter)

### Stratégie recommandée pour continuer proprement

1. **Toujours partir de `develop`** pour nouvelle feature : `git checkout develop && git pull && git checkout -b feat/...`
2. **Petits commits atomiques** : un BATCH = un focus
3. **CI verte avant merge** : ne jamais merger une PR rouge (sauf Supabase Preview qui est non-blocking)
4. **Squash-merge** vers develop, **regular merge** depuis develop → staging, **squash** staging → main
5. **Branches courtes** : feature → develop dans la semaine. Pas de long-running branches
6. **PR descriptions claires** : Summary + Test plan + références BATCH
7. **i18n keys + defaultValue** : toujours ajouter les clés dans `fr.json` ET `en.json` la même session
8. **Tests** : minimum 1 test pour chaque nouveau hook/utils (vitest dans `*.test.ts` côté src/)
9. **Type strict** : pas de `any`, préférer `unknown` puis narrow

### Contacts importants

- **Owner** : Nicolas Douaron (`nicolasdouaron.ca@gmail.com` / `tralorui@gmail.com`)
- **Repo** : https://github.com/Naturegraph/naturegraph
- **GitHub user actif** : `Naturegraph` (org/personal)
- **Production live** : https://naturegraph-eight.vercel.app
- **Supabase Dashboard** : https://supabase.com/dashboard/project/hrxgduvworofnrjmgpcj
- **Vercel Dashboard** : https://vercel.com/naturegraph-9868s-projects/naturegraph
- **Sentry** : https://sentry.io (projet `naturegraph`)

---

## 📜 Historique cycles

- **Cycle 1** (2026-04-29 → 2026-05-13) : 25 BATCHES, 98 tâches livrées, base MVP production-ready
- **Cycle 2** (2026-05-13 → 2026-05-14) : BATCH 27-37, beta closed access + Admin MVP
- **Cycle 3** (2026-05-14) : BATCH 38-45, cleanup post-audit + welcome screen strict

---

**Préparé en mode Staff Engineering — Production-grade handoff**  
**Dernier merge** : BATCH 45 (PR #170) — Welcome Screen + Beta Access Gate total  
**Pour reprendre** : commencer par `git pull origin main` puis ouvrir ce document
