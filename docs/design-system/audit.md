# Audit — Design System Atomic

> Phase 1. Consolidation des audits Landing + Onboarding/Auth. À valider par Nicolas avant Phase 2 (Tokens).

## Executive summary

- **Scope auditée** : Landing page complète + flow Auth (Signup/Login) + Onboarding 4 étapes
- **Composants partagés existants** : `Button`, `Input`, `Card`, `Badge` (incomplets, sous-utilisés)
- **Doublons critiques** : `OnboardingButton` (vs `Button`), `OnboardingHeader` répété 4x, `IconCircle` pattern réécrit 6+ fois
- **Hardcoding massif** : ~15 `rounded-[Xpx]` arbitraires, ~30 imports legacy (`bg-off-white`, `text-foreground`, `rounded-button`)
- **Bloqueur Phase 2** : Figma MCP (maintenant reconnecté ✅)

---

## 1. Duplications top 10

### Landing

| #   | Pattern                             | Occurrences | Candidat Atomic            |
| --- | ----------------------------------- | ----------- | -------------------------- |
| 1   | IconCircle (cercle coloré + icône)  | 6+          | Atom `IconCircle`          |
| 2   | LayoutImageText 50/50               | 4           | Template `ImageTextLayout` |
| 3   | FeatureCard (icône + titre + desc)  | 3           | Molecule `FeatureCard`     |
| 4   | Section container (max-w + padding) | 9           | Template `Section`         |
| 5   | Background circle decoratifs        | 5+          | Atom `DecorCircle`         |

### Onboarding/Auth

| #   | Pattern                                  | Occurrences | Candidat Atomic             |
| --- | ---------------------------------------- | ----------- | --------------------------- |
| 6   | OnboardingHeader (logo + step indicator) | 4           | Organism `OnboardingHeader` |
| 7   | Exit button SVG inline                   | 4           | Atom `IconButton`           |
| 8   | Back button                              | 3           | Molecule `BackButton`       |
| 9   | Select option pattern                    | 6           | Molecule `SelectOption`     |
| 10  | Form layout (card + footer)              | 3           | Template `AuthFormLayout`   |

---

## 2. Hardcoding top 5

1. **Border-radius arbitraires** : `rounded-[32px]`, `rounded-[48px]`, `rounded-[20px]`, `rounded-[40px]` (~15 occurrences) → tokens manquants `--radius-{md,lg,xl,2xl}`
2. **Hauteurs fixes** : `h-12` (15+), tailles px en dur (~12) → token `--size-input-h`, `--size-button-h`
3. **Padding responsive** : `p-6 md:p-8` (25+) → token `--space-card-padding`
4. **Opacités inline** : `opacity-[0.6]`, `opacity-[0.85]` (10+) → tokens `--opacity-{muted,hover}`
5. **Animation timings** : `duration-300`, `duration-500` (10+) → tokens `--motion-{fast,base,slow}`

---

## 3. Imports legacy à éradiquer

| Classe legacy                        | Occurrences | Remplacement                       |
| ------------------------------------ | ----------- | ---------------------------------- |
| `bg-off-white`                       | 20+         | `bg-[var(--color-bg-secondary)]`   |
| `bg-warm-beige`                      | 8+          | `bg-[var(--color-bg-tertiary)]`    |
| `text-foreground` / `text-text-dark` | 30+         | `text-[var(--color-text-primary)]` |
| `bg-primary-light`                   | 25+         | `bg-[var(--color-action-soft)]`    |
| `rounded-button` / `rounded-card`    | 20+         | tokens `--radius-*`                |

---

## 4. Issues critiques

### 🔴 OnboardingButton = doublon de Button

- Fichier : `src/components/onboarding/OnboardingButton.tsx`
- Action : **migrer vers `Button`** + supprimer le composant
- Impact : 4 fichiers d'onboarding

### 🔴 Token --color-primary désormais unifié ✅

- Fix appliqué : `--color-primary: var(--color-action-default)` dans `index.css`

### 🟡 btn-press global ✅

- Fix appliqué : déplacé dans `_buttons.scss` (importé partout)

### 🟡 Figma MCP — reconnecté ✅

- Phase 2 (Tokens) débloquée

---

## 5. Candidats Atomic Design

### Atoms (briques irréductibles)

`Button` ✅ · `Input` (à compléter) · `Label` · `IconCircle` · `IconButton` · `Badge` · `Divider` · `Avatar` · `DecorCircle` · `Logo` · `Spinner` · `Link`

### Molecules (atoms combinés)

`FormField` (Label + Input + Error) · `FeatureCard` · `BackButton` · `SocialLink` · `SelectOption` · `StepIndicator` · `AccordionItem` · `LanguageToggle` · `ThemeToggle`

### Organisms (composants complets)

`Header` · `Footer` · `OnboardingHeader` · `AuthForm` · `HeroSection` · `FeatureGrid` · `LocationModal` · `PostCard`

### Templates (mises en page)

`Section` · `ImageTextLayout` · `AuthFormLayout` · `OnboardingLayout` · `LandingPageLayout`

---

## 6. Critères de sortie Phase 1

- [ ] Audit validé par Nicolas
- [ ] Liste atomic finale figée
- [ ] Bloqueur Figma MCP levé ✅
- [ ] Décision : refonte from scratch confirmée ✅

## Entrée Phase 2 (Tokens)

- Extraction Figma via MCP : `colors`, `typography`, `spacing`, `radius`, `shadows`, `motion`
- Mapping vers `src/styles/abstracts/_variables.scss` + `src/index.css @theme inline`
- Production de `tokens.md` (référence humaine)
