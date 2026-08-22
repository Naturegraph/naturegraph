# Naturegraph, Instructions Claude Code

## Projet

Plateforme web citoyenne biodiversite. React 19 + TypeScript + Vite + Tailwind + SCSS.

**Version actuelle** : V0.8.2 (aout 2026). NB : versioning renumerote depuis l ancien
schema V1.x vers V0.0.1 (NG-025) ; un nouveau V1 sera fige a la fin du chantier qualite.
Source de verite = `package.json`. Details : `PROJECT_MASTER.md`.

> **Document central** : `PROJECT_MASTER.md` au root du repo, a lire en premier
> pour comprendre l etat du projet, sa roadmap, sa TODO, son workflow.
>
> **Pipeline de dev officiel (portes de validation sequentielles)** :
> `docs/devops/PIPELINE_DEV.md`. Toute tache traverse les portes G0 -> G11 (dont
> G3 Product Designer : design system + accessibilite WCAG AA), chacune validee avant
> la suivante, avec un suivi remis a Nicolas. Deux skills operent ce process :
> `pipeline-dev` (les portes) et `release-prod` (la release G10). Environnements
> dev/prod separes : `docs/devops/environments.md`.

## Regles obligatoires

### Eco-conception (priorite haute)

- Lire et respecter `GUIDELINES.md` pour tous les seuils et criteres
- Budget perf : < 300KB JS gzip, < 500KB total par page, LCP < 2.5s
- Images : WebP/AVIF, lazy loading, dimensions explicites
- Pas de dependance JS sans justification
- Pas d'animation superflue, respecter `prefers-reduced-motion`
- Scroll infini autorise (NG-026 decision Nicolas 2026-06-03) avec garde-fous obligatoires :
  - Pagination backend conservee (cap N items par requete cote serveur)
  - Cap React Query `maxPages: 10` pour borner la memoire navigateur
  - Lazy load images (loading="lazy") + dimensions explicites
  - Virtualisation (react-window ou equivalent) recommandee si liste regulierement > 200 items
  - IntersectionObserver pour detecter le bas de liste (pas de scroll listener qui s execute en continu)
- Preferer CSS aux solutions JS

### Accessibilite (WCAG AA)

- Contraste >= 4.5:1 (texte), >= 3:1 (UI/grand texte)
- Navigation clavier complete, focus visible
- HTML semantique, aria labels, alt text
- Skip link, lang attribute, formulaires accessibles

### Design system

- Utiliser les CSS custom properties (tokens Figma synchronises)
- Jamais de couleurs en dur, toujours `var(--color-*)`
- Fonts : Quicksand (titres) + Mulish (body)
- Composants UI reutilisables dans `src/components/ui/`

### Architecture de donnees

- Source de verite : `docs/backend/database-architecture.md` + `docs/backend/schema.sql`
- Types TS : `src/types/supabase.ts` : generes via `npx supabase gen types typescript`, jamais edites a la main
- Migrations SQL : `supabase/migrations/` : format timestamp YYYYMMDD_nom.sql (ex: 20260401_rls_fixes.sql)
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

- INTERDIT d utiliser le tiret cadratin et le tiret demi-cadratin (les longs tirets de style anglosaxon, em dash et en dash) dans tout contenu : code, commentaires, JSDoc, strings UI, messages d erreur, commit messages, docs, reponses dans le chat.
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
  README.md                          Index docs technique
  AUTH_ROADMAP.md                    Plan reduction OTP
  SUPABASE_PRO_ROADMAP.md            Phases A-D Pro plan
  SEED_SPECIES_V2_RUNBOOK.md         Procedure seed especes
  backend/                           Architecture DB + relations
  api-connection/                    Setup Supabase + endpoints + auth flow
  design-system/                     Tokens + composants Figma
  security/                          RLS + RGPD + audits
  devops/                            Release process + force-logout + deployment
supabase/
  migrations/        Migrations SQL PostgreSQL + PostGIS
```

## Strategie 3 environnements (norme officielle V1.0.0+)

```
PROD       main      naturegraph.ca         public, ultra stable
BETA       staging   beta.naturegraph.ca    testeurs autorises, instable OK
DEV        develop   preview Vercel         Nicolas, tres instable
```

**Flux obligatoire** : `develop` → `staging` → `main` (sans raccourci).
**Hotfix urgent** : `hotfix/xxx` depuis `main` → merge main → remonter dans staging + develop.

Cf. `docs/devops/environments.md` pour le detail complet.

### Release process (regle permanente)

- **JAMAIS de push prod systematique**. On accumule plusieurs fixes/ameliorations puis on release groupé.
- Avant tout merge `staging → main` :
  1. Rediger 2 release notes (technique + user-friendly, template `docs/devops/RELEASE_PROCESS.md`)
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

- `naturegraph.ca` → main (production publique, Hostinger DNS + Vercel + Supabase prod)
- `staging-naturegraph-git-staging-*.vercel.app` → staging (URL Vercel auto, preview)
- `naturegraph-eight.vercel.app` → URL Vercel auto pour les autres preview branches
- Preview Vercel auto → feature branches (URL changeante, pour review interne uniquement)

## Legacy project

`C:\Users\Freelance\Desktop\naturegraph-main` contient le code de l'ancienne app.
Elements utiles : mock data, TAXREF service, mapping Supabase, assets photos.
Ne pas copier le code tel quel, adapter a notre architecture.
