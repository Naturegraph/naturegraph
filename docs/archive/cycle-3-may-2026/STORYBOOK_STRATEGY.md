# Naturegraph — Stratégie Storybook + UI Documentation

> **Version** : 1.0 — 2026-05-04
> **Posture** : design engineer + tooling. Construire une base Storybook exploitable et maintenable dès Phase 2.
> **Source** : audit DS (`AUDIT_DESIGN_SYSTEM.md`) + inspection composants UI.
> **Lecture cible** : 5 minutes pour décider de l'approche, 30 minutes pour planifier.

---

## TL;DR

Naturegraph a **38 primitives UI** réutilisables et **86 composants par domaine**. **Aucun catalogue visuel** n'existe aujourd'hui.

Pour Phase 2 beta + intégration équipe, on déploie **Storybook 8 progressivement** :

- **MVP (2 jours)** : 15 atoms isolés, mode statique, déployable Vercel
- **V1 (1 semaine)** : 38 primitives + variants + dark mode toggle
- **V2 (sprint dédié)** : composants par domaine (formulaires, modals, panels)

**Aucun composant ne sera modifié** pour Storybook — on documente l'existant. Si un composant ne peut pas être isolé (dépend de hooks de fetch), on l'identifie comme dette à refactorer (cf. `AUDIT_DESIGN_SYSTEM.md` PS-1).

---

# 🧭 Architecture Storybook proposée

## Stack technique

| Élément           | Choix                                                                             | Justification                         |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| Storybook         | v8.x (latest stable)                                                              | Support React 19 + Vite natif         |
| Builder           | Vite                                                                              | Cohérent avec le projet (pas Webpack) |
| Addons essentiels | `@storybook/addon-essentials`, `@storybook/addon-a11y`, `@storybook/addon-themes` | Couvre 90% des besoins                |
| Tests             | `@storybook/test-runner` + Playwright                                             | Tests visuels + interactions          |
| Déploiement       | Vercel (sous-domaine `storybook.naturegraph.fr`)                                  | Préview dédiée pour design + équipe   |

## Structure des stories

```
src/
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Button.stories.tsx       ← collocated avec le composant
│       └── Button.test.tsx
└── stories/                          (optionnel : stories cross-component)
    ├── Welcome.mdx                   (page d'accueil)
    ├── DesignTokens.stories.tsx     (tokens visuels)
    └── Patterns/                     (patterns transverses)
        ├── Forms.stories.tsx
        └── States.stories.tsx
```

**Principe** : `*.stories.tsx` à côté du composant. **Pas de séparation** dans un dossier `/stories` global (anti-pattern, complexifie les imports).

## Naming convention

```tsx
// Button.stories.tsx
export default {
  title: 'UI/Atoms/Button', // Hiérarchie : Catégorie/Niveau/Composant
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'], // Génère la doc auto
}

export const Primary: Story = { args: { variant: 'primary', children: 'Click' } }
export const Loading: Story = { args: { isLoading: true } }
export const Disabled: Story = { args: { disabled: true } }
```

**Hiérarchie** :

- `UI/Atoms/...` — primitives sans état (Button, Input, Badge)
- `UI/Molecules/...` — composés simples (FormField, Card, Tooltip)
- `UI/Organisms/...` — sections complexes (Modal, Tabs, Accordion)
- `Features/<Domain>/...` — composants par feature (Onboarding, Settings, Feed)
- `Patterns/...` — patterns transverses (Forms, States, Navigation)

---

# 🧩 Mapping Design System → Storybook

## Niveau 1 — Atoms (15 stories prioritaires)

| Composant  | Variants à story                                                | Effort |
| ---------- | --------------------------------------------------------------- | ------ |
| Button     | primary, secondary, ghost, danger, loading, disabled, with-icon | 30 min |
| IconButton | small, default, large, with-tooltip                             | 15 min |
| Input      | text, email, password, error, disabled                          | 20 min |
| Textarea   | default, error, autoResize                                      | 15 min |
| Select     | open, closed, with-search                                       | 20 min |
| Checkbox   | unchecked, checked, indeterminate, disabled                     | 10 min |
| Switch     | off, on, disabled                                               | 10 min |
| Badge      | default, primary, success, warning, error                       | 10 min |
| Tag        | removable, clickable, default                                   | 10 min |
| Avatar     | small, medium, large, with-fallback, with-badge                 | 15 min |
| Spinner    | small, medium, large                                            | 5 min  |
| Skeleton   | line, circle, custom-shape                                      | 10 min |
| Heading    | h1, h2, h3, h4                                                  | 5 min  |
| Text       | body, caption, label                                            | 5 min  |
| Divider    | horizontal, vertical                                            | 5 min  |

**Total Atoms** : ~3h30 d'implémentation.

## Niveau 2 — Molecules (12 stories)

| Composant      | Effort                                |
| -------------- | ------------------------------------- |
| FormField      | 20 min (label + input + error + hint) |
| Card           | 15 min (clickable, image, content)    |
| FeatureCard    | 10 min                                |
| IconCircle     | 10 min                                |
| SelectOption   | 10 min                                |
| Tooltip        | 15 min (positions)                    |
| Container      | 5 min                                 |
| Stack          | 10 min                                |
| PaginationDots | 10 min                                |
| StepIndicator  | 10 min                                |
| SocialLink     | 10 min                                |
| TaxrefCredit   | 5 min                                 |

**Total Molecules** : ~2h30.

## Niveau 3 — Organisms (5 stories)

| Composant    | Variants                                         | Effort |
| ------------ | ------------------------------------------------ | ------ |
| Accordion    | single, multiple, with-default-open              | 30 min |
| Alert        | info, success, warning, error, with-action       | 20 min |
| Modal        | basic, with-footer, with-header-icon, full-width | 45 min |
| ConfirmModal | confirm, danger                                  | 15 min |
| Tabs         | underline, pills, vertical                       | 30 min |

**Total Organisms** : ~2h20.

## Niveau 4 — Features (priorité décroissante)

⚠️ Ces composants ne sont PAS isolés (dépendent de hooks de fetch). Avant Storybook → refacto en container/presentational (cf. `AUDIT_DESIGN_SYSTEM.md` PS-1).

| Domain     | Composants candidats               | Pré-requis refacto                |
| ---------- | ---------------------------------- | --------------------------------- |
| Feed       | FeedPost, FeedSection, ImageSlider | Splitter container/presentational |
| Onboarding | OnboardingInterests, Step2/3/4     | Mocker le auth context            |
| Contribute | EncounterStep1/2/3, MediaUploader  | Mocker file upload                |
| Settings   | SettingsPanel sections             | Mocker user settings              |
| Profile    | ProfileHeader, ProfileTabs         | Mocker user data                  |

**Estimation Phase V2** : 2 sprints (10j ouvrés) après refacto.

---

# 🚀 Roadmap d'intégration

## Phase 0 — Setup (1 jour)

```bash
npx storybook@latest init --type react-vite
# Choisir : Vite, TypeScript, ESLint integration
```

Ajouts :

```bash
npm i -D \
  @storybook/addon-a11y \
  @storybook/addon-themes \
  @storybook/test-runner
```

Configuration `main.ts` :

```ts
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(tsx|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-themes'],
  framework: { name: '@storybook/react-vite', options: {} },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    // Inject les CSS variables du design system
    config.css = config.css || {}
    config.css.preprocessorOptions = {
      scss: { additionalData: `@import 'src/styles/main.scss';` },
    }
    return config
  },
}
```

**Vérification** : `npm run storybook` lance le serveur sur localhost:6006.

## Phase 1 — MVP atoms (2 jours)

Livrer :

- 15 stories atoms (cf. tableau Niveau 1)
- 1 story `DesignTokens.stories.tsx` qui visualise tous les tokens (couleurs, fonts, spacing)
- 1 page Welcome.mdx avec onboarding équipe
- Déploiement Vercel sur `storybook.naturegraph.fr`

**Critères de succès** :

- ✅ Designer + nouveau dev peuvent voir tous les atoms en isolation
- ✅ Dark mode toggle fonctionnel via `addon-themes`
- ✅ Tests a11y passent (addon-a11y)

## Phase 2 — V1 complete UI (1 semaine)

Livrer :

- 12 stories molecules
- 5 stories organisms
- 1 page `Patterns/Forms.stories.tsx` (FormField + validation visuelle)
- 1 page `Patterns/States.stories.tsx` (Loading, Empty, Error — après refacto Phase 1 du DS audit)

**Critères de succès** :

- ✅ 38/38 primitives `ui/` en story
- ✅ Tests visuels de régression via `test-runner`
- ✅ CI pipeline : `npm run build-storybook` dans le workflow

## Phase 3 — V2 features (sprint dédié, post-beta)

Livrer :

- Stories par feature après refacto container/presentational
- Tests d'interaction (clic, formulaire submit)
- Documentation usage par flow

**Pré-requis** : Phase 2 du DS audit (refacto top 5 composants obèses).

---

# 🧪 Tests visuels & maintenance

## Stratégie tests

| Type              | Outil                                | Fréquence                         |
| ----------------- | ------------------------------------ | --------------------------------- |
| Snapshot DOM      | `@storybook/test-runner`             | Chaque PR                         |
| Visual regression | Chromatic ou Playwright + screenshot | Chaque PR sur main                |
| A11y              | `addon-a11y`                         | À chaque story                    |
| Interaction       | Storybook play function              | Stories critiques (forms, modals) |

## Workflow ajout composant

```
1. Dev crée Component.tsx
2. Dev crée Component.stories.tsx (collocated)
3. Dev crée Component.test.tsx (vitest)
4. PR → CI lance :
   - npm run build-storybook (vérifie compilation)
   - npm run test-storybook (vérifie a11y + interactions)
   - npm run test (unit tests vitest)
5. Review : reviewer voit la story dans Chromatic preview
6. Merge → déploiement auto Storybook
```

## Règle d'or — DRY

Si un composant n'a pas de story, **on ne le merge pas**. La PR template Storybook :

```markdown
- [ ] Composant a une story `*.stories.tsx`
- [ ] Story couvre tous les variants (default, hover, disabled, error)
- [ ] addon-a11y green sur la story
- [ ] (si interactif) play function testée
```

---

# 👥 Maintenance — ownership

## Qui maintient quoi

| Élément                     | Owner                     | Fréquence              |
| --------------------------- | ------------------------- | ---------------------- |
| Stories atoms/molecules     | Dev qui crée le composant | Au commit              |
| Stories organisms           | Lead frontend             | À la review            |
| Tokens visualization        | Designer + lead frontend  | Trimestriel            |
| Patterns/States             | Lead frontend             | Quand ajout primitive  |
| Documentation Welcome.mdx   | Tech lead                 | Trimestriel            |
| Configuration `.storybook/` | Tech lead                 | Mises à jour Storybook |

## Synchronisation Storybook ↔ code

**Règle** : si un composant change, sa story doit changer dans la même PR.

CI fail si :

- Story importe un export qui n'existe plus (TS check)
- Tests visuels divergent (Chromatic baseline)

Pas de drift possible → Storybook est toujours à jour.

## Évolution du Design System

```
1. Designer propose nouveau composant (Figma)
2. Discussion équipe : nécessaire ? variant d'existant ?
3. Si nouveau → ticket Linear, story + tests obligatoires
4. Si variant → étendre composant existant + nouvelle story variant
5. Update docs/05-design-system/components/<niveau>.md
6. Update docs/PROJECT_STRUCTURE.md si nouvelle catégorie
```

---

# 📊 Effort total estimé

| Phase                         | Effort      | Délai calendaire        |
| ----------------------------- | ----------- | ----------------------- |
| Phase 0 — Setup               | 1 jour      | 1 jour                  |
| Phase 1 — MVP atoms (15)      | 2 jours     | 1 semaine (avec review) |
| Phase 2 — V1 complete UI (38) | 5 jours     | 2 semaines              |
| Phase 3 — V2 features         | 10 jours    | 1 sprint dédié          |
| **Total Phase 0+1+2**         | **8 jours** | **~3 semaines**         |

→ **Phase 0+1+2 livrable avant fin Phase 2 produit** (pendant la fiabilisation MVP).

---

# 🎯 Critères de succès finaux

Storybook est **réussi** si :

✅ Un nouveau dev arrive et navigue les composants en autonomie en **<30 min**
✅ Le designer voit les variants directement (pas besoin de demander au dev)
✅ Une régression UI est détectée AUTOMATIQUEMENT en CI
✅ Toute PR ajoutant un composant inclut sa story (CI bloque sinon)
✅ Le DS reste cohérent (chaque ajout passe par Storybook + spec tokens)

**Anti-patterns à éviter** :

- ❌ Story qui dépend de hooks de fetch (utiliser Mocks)
- ❌ Story dans `src/stories/` séparé (collocated only)
- ❌ Story sans variants (au moins 3 par composant)
- ❌ Skip de story "parce que pas le temps" (PR bloquée)

---

# 📎 Références croisées

- `docs/AUDIT_DESIGN_SYSTEM.md` — état actuel du DS
- `docs/05-design-system/` — composants existants (à connecter)
- `docs/AUDIT_TECHNIQUE.md` — composants obèses à refacto avant Phase 3
- `docs/PROJECT_STRUCTURE.md` — convention naming
- Site officiel Storybook : https://storybook.js.org
- Chromatic (visual regression) : https://www.chromatic.com
