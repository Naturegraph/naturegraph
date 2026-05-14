# Naturegraph — Audit Design System (Core UI System)

> **Version** : 1.1 — 2026-05-04 (consolidation post-master plan)
> **Posture** : staff design engineer / DS lead. Inspection de l'UI existante avant refacto.
> **Objectif** : cartographier l'état réel du design system pour définir une base scalable niveau SaaS moderne.
> **Source** : lecture exhaustive `src/components/ui/`, `src/styles/`, `src/index.css`, components par domaine.

> **Update v1.1 — Consolidation Master Plan (2026-05-04)** :
>
> Ce document s'intègre dans la suite documentaire consolidée :
>
> - `docs/PROJECT_MASTER.md` — Source de vérité globale
> - `docs/CONSOLIDATION_ROADMAP.md` — Plan séquencé 6 phases (Phase 5 = ce doc)
> - `docs/MASTER_TODO.md` — Tâches T-045 à T-052 + T-024, T-025 (fusion doublons UI)
> - `docs/STORYBOOK_STRATEGY.md` — Plan Storybook détaillé (complémentaire de ce doc)
> - `docs/AUDIT_TECH_DEBT_GLOBAL.md` — Composants obèses C-1 (lien direct avec PS-1)
>
> **À lire ensemble** pour avoir la vision complète DS + Architecture + Roadmap.

---

## TL;DR

L'UI a un **socle solide** (38 primitives `ui/`, design tokens via CSS variables, SCSS 7-1 pattern, naming cohérent) mais souffre de **3 problèmes structurels** qui freinent la scalabilité :

1. **14 composants > 200 lignes** (violation CLAUDE.md) — logique métier mélangée à la UI
2. **Bridge tokens fragile** — couches CSS variables + Tailwind v4 + SCSS qui se chevauchent sans documentation claire
3. **Aucune primitive testée** — 1 seul `Button.test.tsx` sur 38 composants UI

**Pas de refonte nécessaire** — le DS est utilisable. Il faut **discipliner et documenter** ce qui existe avant de construire dessus.

---

# 🟢 Bonnes pratiques existantes

## BP-1 — Couche UI primitives bien isolée

`src/components/ui/` contient **38 primitives réutilisables** organisées sans sous-domaines :

| Atomes                                                                                                                                                          | Molécules                                                                                                                                              | Organismes                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Button, IconButton, Input, Textarea, Select, Checkbox, Switch, ToggleSwitch, Badge, Tag, Avatar, Spinner, Skeleton, Divider, Heading, Text, NavLink, BackButton | FormField, Card, FeatureCard, IconCircle, SelectOption, Tooltip, Container, Stack, PaginationDots, StepIndicator, SocialLink, TaxrefCredit, PhoneFrame | Accordion, Alert, Modal, ConfirmModal, Tabs |

**Convention OK** : 1 fichier = 1 composant exporté nommé. Index barrel `index.ts` pour les imports propres.

## BP-2 — Design tokens via CSS variables

`src/styles/themes/_light-theme.scss` définit les vraies valeurs. `src/index.css` fait le bridge sémantique :

```css
:root {
  --color-bg-primary: #fefcf9;
  --color-text-primary: #0c0c14;
  --color-highlight-primary: #15616d; /* teal-dark */
  --color-action-primary: #6c63ff; /* violet primary */
  /* ... */
}
```

→ Permet le dark mode + thèmes alternatifs sans toucher au code component.

## BP-3 — Typographie typée Figma

| Famille   | Usage          | CSS var          |
| --------- | -------------- | ---------------- |
| Quicksand | Titres (h1-h6) | `--font-heading` |
| Mulish    | Body text      | `--font-body`    |

Tailwind utilise les classes `font-heading` et `font-body` automatiquement.

## BP-4 — SCSS 7-1 pattern respecté

```
src/styles/
├── abstracts/    Variables, mixins, fonctions
├── base/         Reset, typo, base
├── components/   Styles composants (legacy, à migrer)
├── layout/       Grid, header, footer
├── pages/        Styles pages spécifiques
├── themes/       Light + future dark
├── utilities/    Helpers (visually-hidden, etc.)
└── main.scss     Entry point
```

## BP-5 — Composants UI réellement utilisés

`Button` est utilisé dans **>150 endroits** dans le codebase, `Modal` dans **>30**. Pas de duplication "bouton custom" inline.

## BP-6 — Accessibilité respectée sur les primitives

- `Button.tsx` : focus visible, disabled state, loading state, aria-busy
- `Input.tsx` : aria-invalid, aria-describedby pour error
- `Modal.tsx` : focus trap, role=dialog, aria-modal, escape close
- `IconButton.tsx` : aria-label obligatoire

## BP-7 — i18n 100% adopté

914 appels `t()` dans le code, **0 string en dur** dans les composants UI.

---

# 🟠 Incohérences

## INC-1 — Bridge tokens à 3 niveaux

`src/index.css` montre **3 couches** de variables qui se chevauchent :

```css
:root {
  --off-white: var(--color-bg-primary); /* alias Figma Make */
  --warm-beige: var(--color-bg-tertiary); /* alias Figma Make */
  --teal-dark: var(--color-highlight-primary);
  --cream-lighter: var(--color-bg-secondary); /* tokens Home/Feed */
  /* ... 20+ aliases */
}
```

**Problème** : trois noms pour la même couleur (`--color-bg-primary`, `--off-white`, `--cream-lighter`). Un nouveau dev ne sait pas lequel utiliser.

**Sources** :

- `--color-*` : design system officiel (SCSS themes)
- `--off-white`, `--warm-beige` : aliases Figma Make
- `--cream-lighter`, `--card`, `--background` : tokens Tailwind v4

**Fix** : choisir UNE convention par usage et documenter (cf. roadmap §R-2).

## INC-2 — Composants qui violent le budget de lignes

CLAUDE.md exige `composants < 200 lignes`. Top 10 violations :

| Fichier                     | Lignes | Sévérité    |
| --------------------------- | ------ | ----------- |
| FeedPost.tsx                | 756    | 🔴 critique |
| FeedSection.tsx             | 730    | 🔴 critique |
| SettingsPanel.tsx           | 727    | 🔴 critique |
| ContributeEncounterForm.tsx | 681    | 🔴 critique |
| OnboardingStep4.tsx         | 667    | 🔴 critique |
| SearchPanel.tsx             | 594    | 🟠 grave    |
| EncounterStep3.tsx          | 574    | 🟠 grave    |
| EncounterStep2.tsx          | 510    | 🟠 grave    |
| FeedFilterPanel.tsx         | 508    | 🟠 grave    |
| ProfileMenu.tsx             | 500    | 🟠 grave    |

**14 composants > 200 lignes** au total. Cf. `AUDIT_TECHNIQUE.md` RT-1.

## INC-3 — Pas d'export par catégorie

`src/components/ui/index.ts` exporte tout en flat — pas de sous-catégorisation atoms/molecules/organisms qui faciliterait Storybook (cf. `STORYBOOK_STRATEGY.md`).

## INC-4 — Modal vs ConfirmModal — duplication partielle

- `Modal.tsx` (modale générique avec backdrop)
- `ConfirmModal.tsx` (wrapper de Modal avec boutons "Confirmer/Annuler")

`DeleteAccountModal.tsx` (settings) **n'utilise pas** `ConfirmModal` — il étend `Modal` directement avec sa propre logique de matching username. Pourquoi ? Parce que ConfirmModal n'expose pas assez de slots.

**Fix** : enrichir `ConfirmModal` avec slots optionnels (`<ConfirmModal beforeButtons={...}>`) ou créer une primitive `<Modal.Footer>` flexible.

## INC-5 — Toggle vs ToggleSwitch vs Switch

3 composants similaires :

- `Switch.tsx` (état booléen, style iOS)
- `ToggleSwitch.tsx` (variante avec label intégré)
- `Checkbox.tsx` (boolean classique)

Lequel utiliser ? Pas documenté. Risque de divergence visuelle.

**Fix** : merger Switch + ToggleSwitch, garder Checkbox pour les contextes form classiques.

## INC-6 — Skeleton n'est jamais utilisé sur le feed

`Skeleton.tsx` existe mais le feed (`FeedSection`) utilise un Spinner pendant le loading. Incohérent : skeleton est plus moderne et apparait dans Settings.

## INC-7 — Container et Stack peu utilisés

`Container.tsx` et `Stack.tsx` existent mais la majorité des composants utilisent `<div className="flex flex-col gap-4">` directement. Adoption partielle.

## INC-8 — Couleurs hardcodées résiduelles

Quelques `#ffffff`, `rgb(...)` traînent dans certains composants alors que la règle CLAUDE.md interdit. Cf. `AUDIT_TECHNIQUE.md` RT-3.

---

# 🔴 Problèmes structurels

## PS-1 — Pas de séparation UI / business / data

Beaucoup de composants mélangent :

- Logique de fetch (`useQuery`, services)
- Logique métier (filtres, calculs)
- Présentation pure

Exemple : `FeedSection.tsx` (730 lignes) gère :

- Fetch posts via `useFeed`
- Filtrage Haversine côté client
- Mapping PostFeedItem → MockPost
- Rendu cards
- Empty states
- Pagination

**Conséquence** : impossible à testunit, impossible à mettre dans Storybook (dépend de tous les hooks).

**Fix structurel** :

- Créer `<FeedSectionPure>` qui ne reçoit que des props
- `FeedSectionContainer` orchestre les hooks
- Pattern container/presentational classique

## PS-2 — Aucun système de tokens documenté

Pas de doc qui dit :

- Quels tokens utiliser pour quoi
- Comment ajouter un nouveau token
- Quelle convention naming

→ Chaque dev ajoute des CSS variables ad-hoc, dérive du DS, étend l'incohérence INC-1.

**Fix** : créer `docs/05-design-system/tokens-spec.md` (référentiel + règles).

## PS-3 — Tests UI quasi inexistants

| Catégorie            | Tests                       | Total | Coverage |
| -------------------- | --------------------------- | ----- | -------- |
| `src/components/ui/` | 1 (Button)                  | 38    | **3%**   |
| `src/components/*/`  | 0                           | 86    | **0%**   |
| `src/services/`      | 1 (notificationPreferences) | 21    | 5%       |
| `src/utils/`         | 1 (groupNotifications)      | 11    | 9%       |

→ Refacto de n'importe quel composant = risque de régression invisible.

## PS-4 — Aucune Storybook ni catalogue UI

Pas de moyen de voir tous les composants UI en isolation. Pas de doc visuelle.

→ Designer + nouveau dev découvrent l'UI au cas par cas dans le code.

→ Cf. `STORYBOOK_STRATEGY.md` pour la roadmap.

## PS-5 — États (loading/empty/error) non standardisés

Patterns observés dans le codebase :

- `FeedSection` : Spinner pendant load, empty state custom, error toast
- `Settings` : Skeleton bars, empty state custom, error inline
- `NotificationsPanel` : Spinner, "Aucune notification", pas de gestion error

→ Pas de composant `<EmptyState />`, `<ErrorState />`, `<LoadingState />` réutilisable.

**Fix** : créer 3 primitives standardisées :

```
ui/states/
├── EmptyState.tsx    (icon + titre + sous-titre + CTA optionnel)
├── ErrorState.tsx    (icon + message + bouton retry)
└── LoadingState.tsx  (skeleton ou spinner selon prop)
```

## PS-6 — Forms — pas de FormProvider partagé

Chaque formulaire (Onboarding, Encounter, Settings) gère son state localement avec `useState` + validation custom. Pas de :

- Schema validation (zod, yup)
- FormContext partagé
- Erreur uniformisée

→ Duplication de code, validation inconsistante.

**Fix Phase 2** : intégrer `react-hook-form` + zod (déjà dans la dépendance ?). Cf. `AUDIT_TECHNIQUE.md` recommandation.

---

# 📊 Synthèse exécutive

| Sévérité        | Findings          | Action immédiate ?               |
| --------------- | ----------------- | -------------------------------- |
| 🟢 OK           | 7 (BP-1 à BP-7)   | À conserver                      |
| 🟠 Incohérences | 8 (INC-1 à INC-8) | À documenter, refacto progressif |
| 🔴 Structurels  | 6 (PS-1 à PS-6)   | Roadmap dédié                    |

---

# 🧭 Design System Roadmap

## Phase 0 — Documenter l'existant (1 semaine, 0 refacto)

**But** : transformer le DS implicite en DS explicite.

### Étape 1 — Spec tokens (2j)

Créer `docs/05-design-system/tokens-spec.md` :

- Liste exhaustive des tokens disponibles (`--color-*`, `--font-*`, `--spacing-*`)
- Convention naming (sémantique, pas valeur)
- Règle : interdire d'ajouter des aliases (résoudre INC-1)

### Étape 2 — Catalogue primitives (2j)

Créer `docs/05-design-system/components/atoms.md`, `molecules.md`, `organisms.md` :

- 1 page par composant : nom, props, exemples, do/don't
- Règles d'usage (quand utiliser Switch vs Checkbox vs ToggleSwitch)

### Étape 3 — État de la dette (1j)

Lister les 14 composants > 200 lignes avec plan de scission :

- Quel composant extraire en sub-component
- Quelle logique extraire en hook custom
- Estimation effort

## Phase 1 — Standardiser les états (3-5 jours)

**But** : 3 primitives pour loading/empty/error utilisées partout.

```tsx
// Avant
{isLoading && <Spinner />}
{!isLoading && data.length === 0 && <p>Aucun résultat</p>}

// Après
<DataView
  isLoading={isLoading}
  isEmpty={data.length === 0}
  onRetry={refetch}
  loadingFallback={<SkeletonList rows={5} />}
  emptyFallback={<EmptyState icon="..." title="..." />}
>
  {data.map(...)}
</DataView>
```

## Phase 2 — Refonte composants critiques (10-15 jours)

**But** : passer les 5 composants les plus gros sous la barre des 200 lignes.

| #   | Composant                      | Plan                                                                                    |
| --- | ------------------------------ | --------------------------------------------------------------------------------------- |
| 1   | FeedPost (756L)                | Extraire `<FeedPostHeader>`, `<FeedPostContent>`, `<FeedPostActions>`, `<FeedPostMeta>` |
| 2   | FeedSection (730L)             | Container/Presentational split + `useFeedFilters` hook                                  |
| 3   | SettingsPanel (727L)           | Refonte en sous-composants par section (Profil, Notifs, Privacy, Compte)                |
| 4   | ContributeEncounterForm (681L) | FormProvider + sub-steps autonomes                                                      |
| 5   | OnboardingStep4 (667L)         | Extraire `<UsernameValidator>`, `<BannedUsernameCheck>`                                 |

## Phase 3 — Tests & Storybook (parallèle à Phase 2)

Cf. `STORYBOOK_STRATEGY.md` — 50% des primitives en Storybook + tests visuels.

---

# 🎯 État cible (3 mois)

```
✅ Tokens documentés (1 source de vérité)
✅ 38 primitives en Storybook avec doc + tests
✅ EmptyState / ErrorState / LoadingState partout
✅ Top 5 composants obèses scindés
✅ FormProvider unifié (zod + react-hook-form)
✅ Tests visuels de régression
```

**Impact** :

- Onboarding nouveau dev : 1 jour vs 1 semaine (Storybook + spec)
- Vélocité features : ×1.5 (pas de re-implémentation, primitives prêtes)
- Régression UI : -80% (tests visuels)

---

# 📎 Références croisées

- `docs/STORYBOOK_STRATEGY.md` — plan Storybook complémentaire
- `docs/AUDIT_TECHNIQUE.md` — détails dette technique (composants obèses)
- `docs/05-design-system/` — design system existant (à enrichir)
- `CLAUDE.md` — règle composants < 200 lignes
- `GUIDELINES.md` — éco-conception + a11y (impact UI)
