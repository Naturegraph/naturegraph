# Changelog

Tous les changements notables apportes a ce projet sont documentes ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et
le projet adhere a [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.0] — 2026-05-15

**🎉 PREMIÈRE VERSION STABLE — Release officielle V1.**

Plateforme citizen biodiversity prête pour l'onboarding des premiers utilisateurs
beta (Phase 1, 50 places). Toutes les features critiques sont fonctionnelles,
zéro fake data, zéro bug bloquant identifié.

Récap complet : `docs/CHANGELOG_V1.md`.
Roadmap future : `docs/ROADMAP_V2.md`.

### Highlights V1

- Auth OTP email + onboarding 4 étapes + beta gate (clés NG-XXXX-XXXX)
- Feed (observations + identifications) avec réactions, sauvegarde, masquage
- Profil owner/visiteur, settings complets, suppression compte RGPD
- Notifications realtime (8 types, groupement < 24h)
- Admin portal (dashboard, users, beta, moderation, audit) avec analytics
- Landing publique + waitlist
- i18n FR/EN (1 214 clés × 2)
- Responsive 375px → 2560px (WCAG 2.5.5)
- Cross-browser Safari/iOS 14+, Chrome 87+, Firefox 78+, Edge 88+

### Cycle 3 (BATCH 107-115) — Polish pré-V1

- **BATCH 107** : Notif markAllRead, AdminUsers delete account, AdminBeta cleanup
- **BATCH 108** : Admin polish (tabs + analytics + filtres)
- **BATCH 109** : AdminModeration menu Portal fix (anti-clipping)
- **BATCH 110** : Drawer modération riche + multi-select beta + icônes lucide
- **BATCH 111** : Fix critique clé Supabase publishable → JWT
- **BATCH 112** : Cleanup pré-launch (-22 fichiers / -3 deps / -10 docs)
- **BATCH 113** : Audit infra Supabase + Vercel
- **BATCH 114** : Audit responsive complet (5 commits)
- **BATCH 115** : Audit cross-browser + autoprefixer + Safari 14+

### Quality gates (V1)

- ✅ TypeScript : 0 erreur
- ✅ ESLint : 0 erreur, 0 warning
- ✅ Tests : 41/41 (vitest + 6 test files)
- ✅ Build prod : ~20s, bundle index gzip 103 KB
- ✅ Knip : 0 unused file

## [Unreleased]

### Added

- **BATCH 5** — Primitives DS `<EmptyState>` `<ErrorState>` `<LoadingState>` (T-017/018/019)
- **BATCH 6/7** — Adoption primitives dans NotificationsPage, NotificationsPanel, FeedSection (retry), SearchPanel (T-020)
- **BATCH 8** — `ConfirmModal` enrichi : `icon`, `children`, `confirmDisabled`, `title`/`description` ReactNode (T-025)
- **BATCH 9** — Spinners `Loader2` motion-safe sur uploads photo (T-023)
- **BATCH 10** — Hook `usePageTitle` + adoption 6 pages + toast feedback logout (QW-UX1 + QW-UX3)
- **BATCH 12** — Regen types Supabase via MCP + audit advisors complet (T-001 + T-064)
- **BATCH 13** — CI gate drift detection types vs DB (T-003)
- **BATCH 14** — Migration `20260513_drop_duplicate_indexes.sql` (T-066)
- **BATCH 16** — Compression client avatars/banners (T-075), lazy useFollowers/useFollowing (T-079), CONTRIBUTING.md (T-097)

### Changed

- **BATCH 2** — GitHub repo : templates PR/issue + CODEOWNERS + SECURITY.md + dependabot (T-036→T-040)
- **BATCH 3** — A11Y WCAG AA : onboarding `role=group`, OTP `autoComplete="one-time-code"`, aria-live timer (T-053-T-055)
- **BATCH 4** — Perf : RAF throttle Hero (T-074) + lazy StatsSidebar (T-082)
- **BATCH 15** — `console.debug` -> `debugLog` helper (QW-CL2 partiel)

### Fixed

- **HOTFIX** — `groupNotifications` flaky test (fenetre symetrique `Math.abs(diff)`)

### Removed

- **BATCH 7** — `src/components/ui/Switch.tsx` (dead code, 0 usages — T-024)
- **BATCH 16** — `scripts/start-dev.mjs` (0 ref reelle, T-086)
- **BATCH 16** — `dist/` regenerable (T-084)
- **BATCH 16** — Docs audit v1 archivees vers `docs/archive/audits-v1/` (T-093/T-094)

---

## Convention

A chaque release publiee :

1. Bumper la version dans `package.json`
2. Renommer `[Unreleased]` -> `[X.Y.Z] - YYYY-MM-DD`
3. Creer un tag git `vX.Y.Z` + GitHub Release
4. Demarrer une nouvelle section `[Unreleased]` au sommet

Voir aussi `CONTRIBUTING.md` pour les conventions de commit (`feat:` / `fix:` / `refactor:` / etc.).
