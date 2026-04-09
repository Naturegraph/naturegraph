# Tokens — Design System Naturegraph

> Phase 2. **Source : Figma — Style Guide** (node `2061:2837`).
> Extraction via `mcp__Figma__get_variable_defs` le 2026-04-09.
> Mapping : `src/styles/abstracts/_variables.scss` + `src/index.css @theme inline`.

---

## 1. Couleurs

### Backgrounds

| Token Figma                      | Valeur    | Var CSS                       |
| -------------------------------- | --------- | ----------------------------- |
| `Background/Neutral/Primary`     | `#FFFDF8` | `--color-bg-primary`          |
| `Background/Neutral/Secondary`   | `#FFFAF0` | `--color-bg-secondary`        |
| `Background/Neutral/Tertiary`    | `#FFF4E0` | `--color-bg-tertiary`         |
| `Background/Neutral/Menthe`      | `#99FFCC` | `--color-bg-mint`             |
| `Background/Highlight/Primary`   | `#006666` | `--color-highlight-primary`   |
| `Background/Highlight/Secondary` | `#005353` | `--color-highlight-secondary` |
| `Background/Highlight/Tertiary`  | `#33B6B6` | `--color-highlight-tertiary`  |

### Content (text)

| Token Figma                       | Valeur    | Var CSS                  |
| --------------------------------- | --------- | ------------------------ |
| `Content/Neutral/Primary`         | `#0C0C14` | `--color-text-primary`   |
| `Content/Neutral/Secondary`       | `#20203D` | `--color-text-secondary` |
| `Content/Neutral/Tertiary`        | `#13131A` | `--color-text-tertiary`  |
| `Content/Neutral/Disabled`        | `#7E7E8F` | `--color-text-disabled`  |
| `Content/Neutral/White`           | `#F0F0F5` | `--color-text-white`     |
| `Content/Neutral/Black`           | `#000000` | `--color-text-black`     |
| `Content/Neutral/Primary-inverse` | `#F0F0F5` | `--color-text-inverse`   |

### Action (buttons / interactive)

| Token Figma               | Valeur    | Var CSS                   |
| ------------------------- | --------- | ------------------------- |
| `Content/Action/Default`  | `#5F5DD8` | `--color-action-default`  |
| `Content/Action/Hover`    | `#3C4380` | `--color-action-hover`    |
| `Content/Action/Active`   | `#525AAA` | `--color-action-active`   |
| `Content/Action/Light`    | `#E7E9F7` | `--color-action-soft`     |
| `Content/Action/Disabled` | `#CED3F0` | `--color-action-disabled` |

### Semantic

| Token Figma                       | Valeur    | Var CSS              |
| --------------------------------- | --------- | -------------------- |
| `Semantic/Content/Positive`       | `#00673F` | `--color-success`    |
| `Semantic/Content/Warning`        | `#6C350D` | `--color-warning`    |
| `Semantic/Content/Negative`       | `#9E0F22` | `--color-error`      |
| `Semantic/Content/Informative`    | `#004178` | `--color-info`       |
| `Semantic/Background/Positive`    | `#C7F2DF` | `--color-success-bg` |
| `Semantic/Background/Warning`     | `#FEE1C8` | `--color-warning-bg` |
| `Semantic/Background/Negative`    | `#FCCDD5` | `--color-error-bg`   |
| `Semantic/Background/Informative` | `#BADEFA` | `--color-info-bg`    |

### Stroke

| Token Figma    | Valeur    | Var CSS                |
| -------------- | --------- | ---------------------- |
| `Stroke/Light` | `#C4C4CC` | `--color-border-light` |
| `Stroke/Dark`  | `#565666` | `--color-border-dark`  |

---

## 2. Typographie

### Familles

- **Titres** : `Quicksand` (700 Bold)
- **Body** : `Muli` / `Mulish` (400 Regular, 700 Bold)

### Échelle (Figma)

| Token                   | Size | Family    | Weight | Line-height | Letter-spacing | Var CSS             |
| ----------------------- | ---- | --------- | ------ | ----------- | -------------- | ------------------- |
| `Title/H1` (Display)    | 64   | Quicksand | 700    | 1.2         | 0              | `--text-h1`         |
| `Title/H2` (Title)      | 48   | Quicksand | 700    | 1.2         | 0              | `--text-h2`         |
| `Title/H3` (Subtitle)   | 32   | Quicksand | 700    | 1.2         | 0              | `--text-h3`         |
| `Title/H4` (Heading)    | 24   | Quicksand | 700    | 1.2         | 0              | `--text-h4`         |
| `Title/H5` (Subheading) | 18   | Quicksand | 700    | 1.2         | 0              | `--text-h5`         |
| `Paragraph/Base`        | 16   | Mulish    | 400    | 1.5         | 0              | `--text-body`       |
| `Paragraph/Bold`        | 16   | Mulish    | 700    | 1.5         | 0              | `--text-body-bold`  |
| `Paragraph/Small`       | 14   | Mulish    | 400    | 1.5         | 0              | `--text-small`      |
| `Paragraph/SmallBold`   | 14   | Mulish    | 700    | 1.5         | 0              | `--text-small-bold` |
| `Caption/Labels`        | 12   | Mulish    | 400    | 1.2         | 4              | `--text-caption`    |
| `Button/Primary`        | 16   | Mulish    | 700    | 1.5         | 0              | `--text-button`     |

---

## 3. Radius

| Token Figma   | Valeur | Var CSS         |
| ------------- | ------ | --------------- |
| `Radius/XXS`  | 2      | `--radius-xxs`  |
| `Radius/XS`   | 4      | `--radius-xs`   |
| `Radius/S`    | 8      | `--radius-sm`   |
| `Radius/M`    | 12     | `--radius-md`   |
| `Radius/L`    | 20     | `--radius-lg`   |
| `Radius/XL`   | 32     | `--radius-xl`   |
| `Radius/Full` | 999    | `--radius-pill` |

> ⚠️ Tous les `rounded-[20px]` / `rounded-[32px]` du code doivent être remplacés par ces tokens.

---

## 4. Stroke (border width)

| Token Figma               | Valeur | Var CSS       |
| ------------------------- | ------ | ------------- |
| `Border/XS` / `Stroke/XS` | 0.5    | `--border-xs` |
| `Border/S` / `Stroke/S`   | 1      | `--border-sm` |
| `Border/M`                | 1.5    | `--border-md` |
| `Stroke/M`                | 2      | `--border-lg` |
| `Stroke/L`                | 4      | `--border-xl` |

---

## 5. Shadows

| Token Figma   | offset Y | blur | spread | color             | Var CSS         |
| ------------- | -------- | ---- | ------ | ----------------- | --------------- |
| `Shadow/None` | 0        | 0    | 0      | `#00000000`       | `--shadow-none` |
| `Shadow/S`    | 6        | 16   | -4     | `#0000001A` (10%) | `--shadow-sm`   |
| `Shadow/M`    | 14       | 30   | -4     | `#00000026` (15%) | `--shadow-md`   |
| `Shadow/L`    | 20       | 44   | -4     | `#00000033` (20%) | `--shadow-lg`   |

CSS :

```css
--shadow-sm: 0 6px 16px -4px rgb(0 0 0 / 0.1);
--shadow-md: 0 14px 30px -4px rgb(0 0 0 / 0.15);
--shadow-lg: 0 20px 44px -4px rgb(0 0 0 / 0.2);
```

---

## 6. Layout / Grid

| Token Figma         | Valeur | Var CSS              |
| ------------------- | ------ | -------------------- |
| `Layout/Breakpoint` | 1440   | `--layout-max-width` |
| `Layout/Columns`    | 12     | `--layout-columns`   |
| `Layout/Margin`     | 80     | `--layout-margin`    |
| `Layout/Gutter`     | 32     | `--layout-gutter`    |

---

## 7. Spacing (à confirmer Figma)

> ⚠️ Pas de tokens spacing dans le style guide actuel. Recommandation : créer une échelle 4px-based dans Figma puis sync.
> En attendant, utiliser l'échelle Tailwind par défaut (1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px).

---

## 8. Action items

- [x] **DS-01** Extraction Figma effectuée ✅
- [x] **DS-02a** `_colors.scss` aligné Figma ✅ (déjà sync 2026-03-19)
- [x] **DS-02b** `_variables.scss` (radius/fonts) aligné Figma ✅
- [x] **DS-02c** `_spacing.scss` aligné (4px-based) ✅
- [x] **DS-02d** `_light-theme.scss` aligné ✅
- [x] **DS-02e** `_shadows.scss` corrigé pour matcher Figma S/M/L ✅
- [x] **DS-02f** Shadows exposées en CSS vars (`--shadow-sm/md/lg`) + `index.css @theme` ✅
- [ ] **DS-02g** Dark mode reporté post-MVP (décision Nicolas 2026-04-09)
- [ ] **DS-02h** Spacing : pas de tokens Figma — garder l'échelle 4px-based actuelle (suffisante)

---

## 9. Audit d'écarts — résolu

| Élément                               | Statut                                               |
| ------------------------------------- | ---------------------------------------------------- |
| Couleurs (`#5F5DD8`, `#FFFDF8`, etc.) | ✅ Aligné                                            |
| Radius (2/4/8/12/20/32/999)           | ✅ Aligné dans `_variables.scss`                     |
| Typo Quicksand/Mulish                 | ✅ Aligné — Figma écrit "Muli", on garde "Mulish"    |
| Shadows S/M/L                         | ✅ Corrigé en DS-02e                                 |
| Mode dark                             | ⏸️ Reporté post-MVP                                  |
| Spacing tokens                        | ⚠️ Absents Figma — échelle 4px-based locale acceptée |

## 10. Reste à faire

Le SCSS est aligné. Les écarts restants sont **côté composants** :

- Utility classes legacy (`bg-off-white`, `text-foreground`, `rounded-button`) → DS-04
- `rounded-[20px]` / `rounded-[32px]` arbitraires → migrer vers `rounded-lg` / `rounded-xl` (Tailwind = nos tokens) → DS-04
