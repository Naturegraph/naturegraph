# Atoms

> Briques irréductibles. Aucune dépendance à un autre composant DS.
> **Audit révisé 2026-04-09** : 25 atoms existent déjà dans `src/components/ui/`, alignés sur les tokens Figma.

## Atoms existants

| Atom       | Fichier             | Tokens OK | Notes                                              |
| ---------- | ------------------- | --------- | -------------------------------------------------- |
| Alert      | `ui/Alert.tsx`      | ✅        |                                                    |
| Avatar     | `ui/Avatar.tsx`     | ✅        | Avec fallback                                      |
| Badge      | `ui/Badge.tsx`      | ✅        |                                                    |
| Button     | `ui/Button.tsx`     | ✅        | 5 variants, 3 sizes, polymorphique (button/Link/a) |
| Card       | `ui/Card.tsx`       | ✅        | + CardHeader/Content/Footer                        |
| Checkbox   | `ui/Checkbox.tsx`   | ✅        |                                                    |
| Container  | `ui/Container.tsx`  | ✅        | Layout                                             |
| Divider    | `ui/Divider.tsx`    | ✅        |                                                    |
| FormField  | `ui/FormField.tsx`  | ✅        | Label + Input + error wrapper                      |
| Heading    | `ui/Heading.tsx`    | ✅        |                                                    |
| IconButton | `ui/IconButton.tsx` | ✅        | 3 variants, 3 sizes                                |
| Input      | `ui/Input.tsx`      | ✅        | Avec label + error builtin                         |
| Modal      | `ui/Modal.tsx`      | ✅        |                                                    |
| NavLink    | `ui/NavLink.tsx`    | ✅        |                                                    |
| Select     | `ui/Select.tsx`     | ✅        |                                                    |
| Skeleton   | `ui/Skeleton.tsx`   | ✅        | + SkeletonGroup                                    |
| Spinner    | `ui/Spinner.tsx`    | ✅        |                                                    |
| Stack      | `ui/Stack.tsx`      | ✅        | Layout flex                                        |
| Switch     | `ui/Switch.tsx`     | ✅        |                                                    |
| Tabs       | `ui/Tabs.tsx`       | ✅        | + TabPanel                                         |
| Tag        | `ui/Tag.tsx`        | ✅        |                                                    |
| Text       | `ui/Text.tsx`       | ✅        |                                                    |
| Textarea   | `ui/Textarea.tsx`   | ✅        |                                                    |
| Tooltip    | `ui/Tooltip.tsx`    | ✅        |                                                    |
| Logo       | `ui/Logo.tsx`       | ✅        | (hors barrel)                                      |

## Atoms à créer

| Atom           | Statut | Justification                                               | Priorité   |
| -------------- | ------ | ----------------------------------------------------------- | ---------- |
| **IconCircle** | ❌     | Pattern répété 6+ fois dans landing (cercle coloré + icône) | 🔴 Haute   |
| DecorCircle    | ❌     | Cercles décoratifs landing (5+ occurrences)                 | 🟡 Moyenne |
| Link           | ⏳     | Souvent géré via `Button` polymorphique (`href`/`to`)       | 🟢 Basse   |

## Specs Button (référence)

- **Variants** : `primary`, `outline`, `secondary`, `ghost`, `danger`
- **Sizes** : `sm` (h-10) | `md` (h-12) | `lg` (h-14)
- **Shape** : pill par défaut (`rounded-full`)
- **Effet** : `btn-press` 3D (variants `primary` + `outline`)
- **A11y** : focus-visible outline, `aria-busy` si loading

## Specs IconCircle (à implémenter)

- **Props** : `icon: ReactNode`, `size?: 'sm'|'md'|'lg'|'xl'`, `color?: 'primary'|'highlight'|'soft'`
- **Default** : md (48px), color primary
- **Tokens** : `--color-action-light` (soft bg), `--color-action-default` (icône), `--color-highlight-primary` (variant teal)
- **A11y** : `aria-hidden="true"` (toujours décoratif : le contexte porte le sens)
