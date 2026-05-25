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

- Source de verite : `docs/backend/database-architecture.md` + `docs/backend/schema.sql`
- Types TS : `src/types/supabase.ts` — generes via `npx supabase gen types typescript`, jamais edites a la main
- Migrations SQL : `supabase/migrations/` — format timestamp YYYYMMDD_nom.sql (ex: 20260401_rls_fixes.sql)
- Toute modification de schema doit mettre a jour : SQL, database.ts, docs/backend/database-architecture.md
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

### Style d ecriture (regle permanente)

- INTERDIT d utiliser les em-dash (—) et en-dash (–) dans tout contenu : code, commentaires, JSDoc, strings UI, messages d erreur, commit messages, docs, reponses dans le chat.
- Remplacer par virgule, deux-points, parentheses, ou point selon le contexte.
- Cette regle vaut pour Nicolas (lassitude des marques IA) et pour la coherence FR (l em-dash est anglosaxon).
- Si tu trouves des em-dash dans le code existant, les corriger au passage.

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
  README.md                          Index master de la doc
  PROJECT_STRUCTURE.md               Carte vivante du repo
  USER_STORIES.md, PLAN_ACTION.md    Vision + roadmap
  PRD_*.md, EPIC_*.md                Specs produit par feature
  AUDIT_*.md, SYNTHESE_*.md          Audits + causes racines
  backend/                           Architecture DB + relations + schema.sql
  api-connection/                    Setup Supabase + endpoints + auth flow
  design-system/                     Tokens + composants Figma
  security/                          RLS + RGPD + media
  devops/                            Environments + deployment + monitoring
  archive/sessions/                  Notes session passees (memoire historique)
supabase/
  migrations/        Migrations SQL PostgreSQL + PostGIS
```

## Strategie de branches Git

```
main      →  production publique  (Supabase PROD)
staging   →  beta testers / UAT   (Supabase DEV — donnees ephemeres)
develop   →  dev interne           (Supabase DEV)
```

**Flux de promotion (sens unique) :**

```
feat/xxx  →  develop  →  staging  →  main
```

**Regles :**

- `develop` : push direct OK pour petits changements, PR recommandee pour features
- `staging` : PR obligatoire depuis develop (jamais depuis une feature branch)
- `main` : PR obligatoire depuis develop + **release note validee par Nicolas**
- Hotfix urgents : `hotfix/xxx` depuis `main` → merger dans `main` → remonter dans `develop`

### Release process (regle permanente, Nicolas 2026-05-25)

- **JAMAIS de push prod systematique**. On accumule plusieurs fixes/ameliorations puis on release groupé.
- Avant tout merge `develop → main` :
  1. Rediger une release note (template `docs/devops/RELEASE_PROCESS.md`)
  2. Soumettre a Nicolas pour validation (date, heure, tests, force-logout, notif)
  3. Attendre son OK explicite avant de merger
- Cycle ideal : 1 release par jour ou par grappe coherente de 3-5 changements, pas par bug isole.
- Force-logout des users seulement de temps en temps (refonte auth, schema casse), pas par defaut.
- Notification in-app systeme : redaction + validation Nicolas avant insertion.

**Supabase (Phase 1 MVP) :**

- `naturegraph-dev` : utilise par develop + staging
- `naturegraph-prod` : utilise par main uniquement
- Variables Vercel configurees separement par branche (Production vs Preview)

**Convention migrations SQL :**

- Format : `YYYYMMDD_description.sql` (ex: `20260401_rls_security_fixes.sql`)
- Appliquer manuellement sur le bon projet Supabase lors de chaque merge vers staging et main
- Ne jamais laisser les schemas diverger entre environnements sans le documenter

**URLs cibles :**

- `naturegraph.ca` → main (production publique — Hostinger DNS + Vercel + Supabase prod)
- `staging-naturegraph-git-staging-*.vercel.app` → staging (URL Vercel auto, preview)
- `naturegraph-eight.vercel.app` → URL Vercel auto pour les autres preview branches
- Preview Vercel auto → feature branches (URL changeante, pour review interne uniquement)

## Legacy project

`C:\Users\Freelance\Desktop\naturegraph-main` contient le code de l'ancienne app.
Elements utiles : mock data, TAXREF service, mapping Supabase, assets photos.
Ne pas copier le code tel quel — adapter a notre architecture.
