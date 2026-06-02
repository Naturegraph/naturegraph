# Naturegraph, Instructions Claude Code

## Projet

Plateforme web citoyenne biodiversite. React 19 + TypeScript + Vite + Tailwind + SCSS.

**Version actuelle** : V1.0.0 (stabilisee 2026-05-25).

> **Document central** : `PROJECT_MASTER.md` au root du repo, a lire en premier
> pour comprendre l etat du projet, sa roadmap, sa TODO, son workflow.

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

**Supabase (etat 2026-06-02) : un seul projet BDD, partage dev + prod**

- **UN SEUL projet Supabase** : `hrxgduvworofnrjmgpcj` (region ca-central-1).
- Utilise par develop local + staging + main en simultane.
- Pas de naturegraph-dev separe pour le moment (decision Nicolas 2026-06-02 :
  cout 10$/mois supplementaire non justifie tant que le volume reste limite).
- Variables Vercel : production + preview pointent vers la meme BDD.

**ATTENTION precautions critiques (decoulant du fait qu il n y a qu une BDD) :**

1. **Migrations** : avant `apply_migration` ou `execute_sql DDL`, verifier que
   le changement est compatible avec l usage prod. Toute migration impacte
   immediatement la prod.
2. **Tests de schema en dev** : ne PAS appliquer de migrations de feature
   branches sur la BDD prod. Si tu dois tester une feature avec changement de
   schema (ex V1.2.0 carnets), DEMANDER A NICOLAS de creer un projet dev temporaire
   avant d ecrire la moindre migration.
3. **Drop / destructive operations** : interdit sans validation explicite.
4. **Tests E2E qui ecrivent en DB** : utiliser des donnees mock fictives
   (cf. src/data/mock/), pas de vraie INSERT en prod.

**Convention migrations SQL :**

- Format : `YYYYMMDD_description.sql` (ex: `20260401_rls_security_fixes.sql`)
- Une migration appliquee = appliquee partout (puisque BDD unique).
- Ne jamais laisser une migration en local sans apply (ou alors la commenter
  EXPLICITEMENT dans le fichier avec `-- DO NOT APPLY UNTIL ...`).

**URLs cibles :**

- `naturegraph.ca` → main (production publique — Hostinger DNS + Vercel + Supabase unique)
- `staging-naturegraph-git-staging-*.vercel.app` → staging (URL Vercel auto, preview)
- `naturegraph-eight.vercel.app` → URL Vercel auto pour les autres preview branches
- Preview Vercel auto → feature branches (URL changeante, pour review interne uniquement)

**Cas a creer un projet Supabase dev separe (futur)** :

- Si feature complexe avec gros changement de schema (carnets V1.2.0, refonte
  taxonomy, etc.).
- Si volume utilisateurs depasse Free tier prod et qu on veut isoler les tests
  de perf / load.
- Cout estime : 10$/mois pour un projet ou une branche Supabase Pro.

## Legacy project

`C:\Users\Freelance\Desktop\naturegraph-main` contient le code de l'ancienne app.
Elements utiles : mock data, TAXREF service, mapping Supabase, assets photos.
Ne pas copier le code tel quel — adapter a notre architecture.
