# Naturegraph

Plateforme web citoyenne pour explorer, documenter et partager la biodiversite.

## Stack technique

- **Frontend** : React 19 + TypeScript + Vite
- **Styling** : Tailwind CSS + SCSS (7-1 pattern) avec themes light/dark
- **Backend** : Supabase (auth, database, storage)
- **Routing** : React Router v7 (lazy-loaded)
- **State** : TanStack React Query
- **i18n** : i18next (FR / EN)
- **Icons** : Lucide React
- **Fonts** : Quicksand (titres) + Mulish (body)

## Installation

```bash
npm install
cp .env.example .env
# Remplir les variables Supabase dans .env
```

## Scripts

```bash
npm run dev       # Serveur de developpement (port 5173)
npm run build     # Build production (TypeScript + Vite)
npm run preview   # Preview du build production
npm run lint      # ESLint
npm run format    # Prettier
```

## Architecture

```
src/
  components/     # Composants reutilisables (ui/, layout/)
  contexts/       # React contexts (Auth, Theme)
  hooks/          # Custom hooks
  i18n/           # Traductions FR/EN
  lib/            # Clients externes (Supabase, React Query)
  pages/          # Pages de l'application
  styles/         # Design system SCSS (7-1 pattern)
    abstracts/    # Variables, colors, breakpoints, mixins, spacing
    base/         # Reset, fonts, typography
    components/   # Styles des composants
    layout/       # Grid, containers, header, footer
    themes/       # Light / Dark mode (CSS custom properties)
    utilities/    # Helpers, visibility, accessibility
  types/          # Types TypeScript
```

## Design System

Les tokens du design system sont synchronises depuis Figma :
- **Colors** : Brand (violet), Highlight (teal), Background (warm), Greyscale, Semantic
- **Typography** : 8 tailles responsives (Desktop / Tablet / Mobile)
- **Spacing** : 15 niveaux (sp-0 a sp-180)
- **Radius** : 9 niveaux (None a Full)
- **Breakpoints** : Mobile (402px) / Tablet (768px) / Desktop (1440px)
