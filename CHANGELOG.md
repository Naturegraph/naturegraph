# Changelog

Tous les changements notables apportes a ce projet sont documentes ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et
le projet adhere a [Semantic Versioning](https://semver.org/lang/fr/).

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
