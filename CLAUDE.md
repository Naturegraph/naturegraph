# Naturegraph — Instructions Claude Code

## Projet
Plateforme web citoyenne biodiversite. React 19 + TypeScript + Vite + Tailwind + SCSS.

## Regles obligatoires

### Eco-conception (priorite haute)
- Lire et respecter `GUIDELINES.md` pour tous les seuils et criteres
- Budget perf : < 300KB JS gzip, < 500KB total par page, LCP < 2.5s
- Images : WebP/AVIF, lazy loading, dimensions explicites
- Pas de dependance JS sans justification
- Pas d'animation superflue, respecter `prefers-reduced-motion`
- Pagination obligatoire (jamais de scroll infini)
- Preferer CSS aux solutions JS

### Accessibilite (WCAG AA)
- Contraste >= 4.5:1 (texte), >= 3:1 (UI/grand texte)
- Navigation clavier complete, focus visible
- HTML semantique, aria labels, alt text
- Skip link, lang attribute, formulaires accessibles

### Design system
- Utiliser les CSS custom properties (tokens Figma synchronises)
- Jamais de couleurs en dur — toujours `var(--color-*)`
- Fonts : Quicksand (titres) + Mulish (body)
- Composants UI reutilisables dans `src/components/ui/`

### Code
- TypeScript strict, pas de `any`
- Composants < 200 lignes
- Commits : `feat:`, `fix:`, `refactor:`, `perf:`, `docs:`

## Apres chaque implementation
Auditer eco-conception et accessibilite selon les checklists de `GUIDELINES.md`.

## Structure
```
src/
  components/ui/     Composants reutilisables
  components/layout/ Header, Footer, MainLayout
  contexts/          Auth, Theme
  hooks/             Custom hooks
  i18n/              Traductions FR/EN
  lib/               Supabase, React Query
  pages/             Pages application
  styles/            SCSS 7-1 pattern (synchro Figma)
  types/             Types TypeScript
```
