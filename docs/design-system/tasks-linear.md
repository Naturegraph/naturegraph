# Tasks — Roadmap d'implémentation

> Découpage en micro-tâches livrables. Chaque tâche = 1 PR review-friendly.

## Sprint 0 — Fondations (bloque tout le reste)

- [ ] **DS-01** Extraire tokens Figma via MCP → mettre à jour `_variables.scss` + `index.css`
- [ ] **DS-02** Documenter tokens dans `tokens.md` (valeurs réelles)
- [ ] **DS-03** Supprimer `OnboardingButton`, migrer vers `Button` partagé
- [ ] **DS-04** Purger imports legacy (`bg-off-white`, `text-foreground`, `rounded-button`) — search & replace par token

## Sprint 1 — Atoms manquants

- [ ] **DS-10** `Label` + intégration formulaires
- [ ] **DS-11** `IconCircle` (remplace 6 occurrences landing)
- [ ] **DS-12** `IconButton` (remplace 4 exit + 3 back)
- [ ] **DS-13** `Divider`
- [ ] **DS-14** `Avatar` (avec fallback initiales)
- [ ] **DS-15** `DecorCircle` (cercles décoratifs landing)
- [ ] **DS-16** `Spinner`
- [ ] **DS-17** `Link` (interne / externe)
- [ ] **DS-18** Compléter `Input` (états error, icon)
- [ ] **DS-19** Compléter `Badge` (variants)

## Sprint 2 — Molecules

- [ ] **DS-30** `FormField` (Label + Input + Error) — refactor Signup/Login
- [ ] **DS-31** `FeatureCard` — refactor landing (3 occurrences)
- [ ] **DS-32** `BackButton` — refactor onboarding (3 occurrences)
- [ ] **DS-33** `SelectOption` — refactor onboarding (6 occurrences)
- [ ] **DS-34** `StepIndicator`
- [ ] **DS-35** `AccordionItem` — refactor FAQ landing
- [ ] **DS-36** `SocialLink`

## Sprint 3 — Organisms

- [ ] **DS-50** `OnboardingHeader` (élimine 4 doublons)
- [ ] **DS-51** `AuthForm` (Signup + Login)
- [ ] **DS-52** `HeroSection` (landing)
- [ ] **DS-53** `FeatureGrid`
- [ ] **DS-54** Refactor `Header` complet
- [ ] **DS-55** Refactor `Footer` complet

## Sprint 4 — Templates

- [ ] **DS-70** `Section` — refactor 9 sections landing
- [ ] **DS-71** `ImageTextLayout` — refactor 4 sections landing
- [ ] **DS-72** `AuthFormLayout`
- [ ] **DS-73** `OnboardingLayout`

## Sprint 5 — Page DS

- [ ] **DS-90** Route `/design-system` (dev only ou public ?)
- [ ] **DS-91** Showcase tokens (couleurs, typo, spacing, radius)
- [ ] **DS-92** Showcase atoms avec tous les états
- [ ] **DS-93** Showcase molecules
- [ ] **DS-94** Showcase organisms
- [ ] **DS-95** Showcase templates avec exemples

## Sprint 6 — Audit final

- [ ] **DS-99** Audit éco-conception (Lighthouse, bundle size)
- [ ] **DS-100** Audit a11y (axe, navigation clavier)
- [ ] **DS-101** Audit responsive (320px → 1920px)
- [ ] **DS-102** Audit dark mode complet
- [ ] **DS-103** Suppression code mort
