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

### Architecture de donnees

- Source de verite : `docs/DATA_ARCHITECTURE.md`
- Types TS : `src/types/database.ts` — TOUJOURS maintenir en sync avec le schema SQL
- Migrations SQL : `supabase/migrations/` — nuneroter sequentiellement (001*, 002*...)
- Toute modification de schema doit mettre a jour : SQL, database.ts, DATA_ARCHITECTURE.md
- Compteurs denormalises maintenus par triggers PostgreSQL (pas cote client)
- PostGIS pour les requetes geographiques (ST_DWithin)
- RLS obligatoire sur toute nouvelle table
- Pagination obligatoire (max 20 items par requete)
- TAXREF : attribution CC-BY INPN obligatoire

### Code

- TypeScript strict, pas de `any`
- Composants < 200 lignes
- Commits : `feat:`, `fix:`, `refactor:`, `perf:`, `docs:`
- **Commentaires obligatoires** : en-tete de fichier, JSDoc sur fonctions/composants, logique metier expliquee
- Le code doit etre lisible par un dev humain qui decouvre le projet
- Ne pas sur-commenter le trivial, commenter le "pourquoi" pas le "quoi"

### Donnees

- Ne JAMAIS utiliser de vraies donnees utilisateur
- Mock data : profils fictifs uniquement (src/data/mock/)
- Ne pas reutiliser les acces/credentials du legacy project sans autorisation

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
  data/mock/         Mock data pour dev (25 users, 125+ posts)
docs/
  DATA_ARCHITECTURE.md   Schema de donnees complet
supabase/
  migrations/        Migrations SQL PostgreSQL + PostGIS
```

## Legacy project

`C:\Users\Freelance\Desktop\naturegraph-main` contient le code de l'ancienne app.
Elements utiles : mock data, TAXREF service, mapping Supabase, assets photos.
Ne pas copier le code tel quel — adapter a notre architecture.
