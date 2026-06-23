# Guidelines : Design System Naturegraph

## Règles d'or

1. **Figma = source de vérité** : toute divergence est un bug à corriger côté code
2. **Aucune valeur en dur** : toujours `var(--token-*)` ou utility Tailwind mappée sur token
3. **Pill-first** : boutons `rounded-full` par défaut
4. **A11y WCAG AA** : contraste 4.5:1, focus visible, navigation clavier complète
5. **Éco-conception** : < 300KB JS gzip, lazy loading images, pas d'animation superflue
6. **Composants < 200 lignes** : sinon découper

## Naming

- **Atoms** : nom singulier (`Button`, `Input`)
- **Molecules** : composition explicite (`FormField`, `BackButton`)
- **Organisms** : section (`Header`, `AuthForm`)
- **Templates** : suffixe `Layout` (`AuthFormLayout`)

## Process d'ajout d'un composant

1. Existe-t-il déjà ? Grep dans `src/components/ui/`
2. Specs Figma à jour ?
3. Atomique : peut-on le composer depuis des atoms existants ?
4. Props minimales (YAGNI)
5. États : default, hover, focus, active, disabled, loading, error
6. A11y : roles ARIA, labels, focus management
7. Doc dans `docs/design-system/components/{niveau}.md`
8. Validation Nicolas avant merge

## Anti-patterns

- ❌ Couleurs hex inline
- ❌ `rounded-[Xpx]` arbitraires
- ❌ `OnboardingButton`, `AuthButton` etc. (= duplication de `Button`)
- ❌ Imports legacy (`bg-off-white`, `text-foreground`, `rounded-button`)
- ❌ Style inline `style={{ ... }}` sauf valeur dynamique
- ❌ Composants > 200 lignes
