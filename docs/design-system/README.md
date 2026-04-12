# Design System Naturegraph — Atomic

Source de vérité unique entre Figma et le code. Structure Atomic Design (Brad Frost).

## Phases

| #   | Phase   | Fichier                                               | Statut             |
| --- | ------- | ----------------------------------------------------- | ------------------ |
| 1   | Audit   | `audit.md`                                            | À valider          |
| 2   | Tokens  | `tokens.md`                                           | Bloqué (Figma MCP) |
| 3   | Atomic  | `components/{atoms,molecules,organisms,templates}.md` | Brouillon          |
| 4   | Tasks   | `tasks-linear.md`                                     | À planifier        |
| 5   | Page DS | route `/design-system`                                | Backlog            |

## Règles

- **Figma = source de vérité** (tokens, specs, états)
- **Aucun dev sans validation Nicolas**
- Process : audit → structuration → proposition → validation → implémentation
- Suppression des doublons après validation de chaque phase

## Scope initial

Landing page + flow Auth/Onboarding (4 étapes post signup/login).
