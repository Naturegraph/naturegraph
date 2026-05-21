# PROJECT STATUS — Naturegraph

> **Document de continuité entre sessions Claude Code.**
> Dernière mise à jour : **2026-05-15 (post V1.0.0)**
> Lecture cible : **5 minutes maximum**

---

## 1. État global

**Statut : 🟢 V1.0.0 RELEASED — Production-ready beta privée**

- ✅ Tag git `v1.0.0` poussé sur GitHub (PR #206 mergée)
- ✅ Vercel auto-déployé sur `main`
- ✅ Supabase `naturegraph-dev` opérationnel (prod = `naturegraph-prod` à activer le jour J)
- 🟡 **Bloquant launch** : pas de domaine custom Vercel encore configuré pour l'app React (`naturegraph.fr` = WordPress legacy)

**Confiance globale : élevée.** Le code est stable, propre, testé, audité. Reste 3 actions manuelles côté Nicolas (Vercel + Supabase Dashboard + secrets).

---

## 2. Ce qui a été fait (cycle 3 : BATCH 107-115)

| BATCH   | Type            | Résumé                                                                                                               |
| ------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| 107     | Feature         | Notif markAllRead · AdminUsers delete account · AdminBeta cleanup                                                    |
| 108     | Feature         | Admin polish complet (tabs Beta/Audit + analytics Dashboard + filtres)                                               |
| 109     | Bugfix          | AdminModeration menu actions React Portal (anti-clipping)                                                            |
| 110     | Feature         | Drawer modération riche (preview live post/profil + actions) + multi-select beta + icônes lucide partout (no emojis) |
| **111** | **🚨 Critical** | **Fix clé Supabase `sb_publishable_*` → JWT (admin actions silencieusement cassées)**                                |
| 112     | Chore           | Cleanup pré-launch : -22 fichiers morts · -3 deps (leaflet, react-leaflet, zod) · -10 docs archivées                 |
| 113     | Audit           | Supabase + Vercel + cohérence cross-system + `.env.example` enrichi                                                  |
| 114     | Responsive      | 35 issues identifiées · 11 CRITICAL + MEDIUM fixées · WCAG 2.5.5 touch targets · clamp() typography                  |
| 115     | Compat          | Cross-browser Safari/iOS 14+ · UUID polyfill · localStorage Private Mode safety · viewport-fit cover · autoprefixer  |
| V1      | Release         | Bump 0.1.0 → 1.0.0 · CHANGELOG_V1.md + ROADMAP_V2.md · tag git v1.0.0 + GitHub Release                               |

**Quality gates V1** (validés) : tsc 0 erreur · ESLint 0 erreur 0 warning · vitest 41/41 · build ~20s · knip 0 unused · i18n 1214/1214 clés · 0 fake data · 0 console.log.

---

## 3. État des branches

| Branche   | Rôle                            | État              | Protection                                                                         |
| --------- | ------------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| `main`    | Production (Vercel auto-deploy) | ✅ `v1.0.0` taggé | 🔒 Strict (CI required, no force, linear history, enforce admins, conv resolution) |
| `staging` | Beta testers / UAT              | ✅ Aligné main    | 🔒 CI required + conv resolution                                                   |
| `develop` | Dev interne                     | ✅ Aligné main    | 🔒 CI required                                                                     |

**Cascade flow** : `feat/xxx` → `develop` → `staging` → `main` (PR obligatoire pour staging et main).

**Worktree info** : la session a tourné depuis `.claude/worktrees/loving-shaw-034524/`. Les commits sont sur les 3 branches via le main worktree (`C:/Users/Freelance/Desktop/ClaudeDev_Naturegraph`). Travailler désormais directement sur le main worktree.

---

## 4. Problèmes restants

### 🔴 Bloquant launch public

- ✅ ~~Pas de domaine custom~~ — résolu 2026-05-21 : `naturegraph.ca` configuré (Hostinger DNS + Vercel + Supabase Auth Site URL).

### 🟡 Hardening Supabase (Dashboard manuel)

- HaveIBeenPwned protection : à activer (Auth → Settings)
- OTP expiry : 600s → 120s
- SMTP custom (Gmail/Resend) au lieu du défaut Supabase
- Edge Functions secrets en prod : `RESEND_API_KEY`, `RESEND_FROM`, `CRON_SECRET` (waitlist + cron)

### 🟡 Dette technique connue (non-bloquant)

- 24+ TODOs `[BACKEND]` documentés (upload Storage workflow complet, identifications collaboratives, follow system) — **flows V1 fonctionnent**, ce sont des features Phase 2
- 3 extensions PostgreSQL dans schema `public` (postgis, pg_trgm, unaccent) — bonne pratique de les déplacer dans `extensions/` mais destructive → maintenance window Phase 3
- 49 indexes "Unused Index" Supabase (normal en beta < 50 rows par table — utiles dès qu'on monte en volume)
- 55 exports UI inutilisés (Card, Modal, etc.) — composants atomiques DS gardés pour Phase 2
- 7 LOW issues responsive cosmétiques laissées en l'état
- `@sentry/react` en deps mais Sentry pas activé (`VITE_SENTRY_DSN` vide) — lazy-loaded opt-in OK

### Risques connus

- iOS Safari Private Mode : auth fonctionne en mémoire (BATCH 115b), mais la session ne persiste pas entre fermetures d'onglet (acceptable Private Mode)
- spatial_ref_sys RLS désactivée : faux positif linter (table système PostGIS owned par supabase_admin)

---

## 5. Actions prioritaires suivantes

1. ✅ ~~Configurer domaine custom Vercel~~ — fait 2026-05-21 (`naturegraph.ca`)
2. 🟡 **Supabase Dashboard hardening** (5 min) :
   - Auth → Settings → activer HaveIBeenPwned protection
   - Auth → Email OTP → expiry 600 → 120s
   - Auth → SMTP → configurer Gmail ou Resend (sinon limite 30 emails/h par défaut)
3. 🟡 **Edge Functions secrets prod** (Supabase Dashboard → Edge Functions → Secrets) :
   - `RESEND_API_KEY` = clé Resend (https://resend.com)
   - `RESEND_FROM` = `"Naturegraph <hello@naturegraph.fr>"` (domain à vérifier sur Resend)
   - `CRON_SECRET` = token aléatoire 32+ chars
4. 🟢 **Inviter les 50 premiers beta testers** (Phase 1 — gestion via /admin/beta)
5. 🟢 **Mesurer** : monitor erreurs (Sentry opt-in), feedback users via /admin/moderation et form support

---

## 6. Infos importantes à ne pas oublier

### Conventions Git (CLAUDE.md)

- Commits : `feat:`, `fix:`, `chore:`, `refactor:`, `perf:`, `docs:`, `release:`
- Branches : `feat/xxx`, `fix/xxx`, `chore/xxx`, `release/xxx`
- Cascade : **jamais de push direct sur main/staging**. PR obligatoire.
- Hotfix : `hotfix/xxx` depuis `main` → merger → remonter dans `staging` et `develop`
- Migrations SQL : `YYYYMMDD_description.sql` (format imposé)

### Décisions architecture

- **React 19 + Vite 7 + Tailwind v4** (inline `@theme`) + SCSS 7-1 pattern
- **Supabase** : 29 tables · 6 Edge Functions · 5 Storage buckets · PostGIS · Realtime
- **TanStack Query v5** : staleTime 30s-5min selon type
- **Mock data BANNIE en prod** : seul `demoAuth.ts` pour le mode OTP quand Supabase indisponible
- **EXIF strip obligatoire** sur upload photo (RGPD)
- **`is_internal` profile flag** : super_admin invisibles des compteurs publics
- **Tailwind v4** : utilities prioritaires sur `body h1` SCSS car @layer utilities > @layer base
- **WCAG 2.5.5** : btn-press minimum 44x44 sur mobile (relâché ≥1024px)

### Contraintes infra

- **Clé Supabase** : utiliser le JWT legacy `anon` (`eyJ...`), PAS le nouveau `sb_publishable_*` (BATCH 111). Le format publishable rejette SILENCIEUSEMENT DELETE/UPDATE/RPC alors que GET passe.
- **Vercel env vars** : si on régénère un projet Supabase, REFAIRE l'update sur Vercel (Production + Preview + Development) + redeploy SANS cache.
- **Branches Supabase** : `naturegraph-dev` pour develop+staging, `naturegraph-prod` pour main uniquement (Phase 1 MVP).
- **Cross-browser target** : Safari 14+, iOS 14+, Chrome 87+, Firefox 78+, Edge 88+ (browserslist + vite.target).

### Points sensibles

- **Auth refresh token loop** (BATCH 103) : si jamais l'AuthContext re-boucle à l'infini = clé Supabase invalide ou refresh tokens corrompus. Fix : purge `naturegraph-auth` localStorage + signOut local.
- **HMR Vite cache** : si modifs visibles dans le code mais pas dans le browser → `rm -rf node_modules/.vite` + restart dev server.
- **Worktree confusion** : si tu travailles dans `.claude/worktrees/*` mais commits via main worktree, certains fichiers locaux peuvent diverger. Stash + checkout develop sur ton worktree pour resync.

### Règle versioning (post-V1)

- **Patch (1.0.x)** : bug fixes, micro-refactors, cleanup mineurs, polish responsive
- **Minor (1.x.0)** : nouvelle feature notable (ex: dark mode, OAuth)
- **Major (x.0.0)** : refonte architecture/UX majeure (ex: app mobile, monétisation, redesign)

⚠️ **PAS de V2 sans BATCH d'audits complets** (responsive + browser + infra) comme cycle 3.

---

## 7. Validation finale

| Item                                | Statut                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| **V1 validée**                      | ✅ OUI — tag `v1.0.0` + GitHub Release officielle                                          |
| **Produit prêt utilisateurs**       | ✅ OUI techniquement · 🟡 **manque domaine custom Vercel** pour exposer l'app publiquement |
| **Niveau de confiance**             | 🟢 **ÉLEVÉ** — code stable, audité, testé, propre                                          |
| **Bugs bloquants identifiés**       | 🟢 Aucun                                                                                   |
| **Confiance lancement beta privée** | 🟢 GO — onboarding 50 premiers users dès que domaine configuré                             |

---

## 📍 Pour reprendre en nouvelle session

**Lire en ordre** :

1. Ce fichier (`PROJECT_STATUS.md`)
2. `docs/CHANGELOG_V1.md` — récap complet état V1
3. `docs/ROADMAP_V2.md` — pistes Phase 2/3/4
4. `CLAUDE.md` — règles projet
5. `GUIDELINES.md` — éco-conception + a11y
6. `docs/README.md` — index master de la documentation
7. `CHANGELOG.md` — historique commits structuré

**Working directory** : `C:/Users/Freelance/Desktop/ClaudeDev_Naturegraph` (main worktree, branche `develop` par défaut)
**Dev server** : `npm run dev` (port 5173, config `.claude/launch.json`)
**Supabase MCP** : connecté à `naturegraph-dev`
**GitHub** : `Naturegraph/naturegraph`, branche par défaut `main`

**Si quelque chose ne marche pas après pull récent** :

```bash
rm -rf node_modules/.vite     # bust Vite cache
npm install                    # sync deps si package.json changé
npm run dev                    # restart dev server
```
