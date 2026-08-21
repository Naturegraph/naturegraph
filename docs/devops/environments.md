# Environnements Naturegraph, Norme officielle V1.0.0+

> Strategie de separation production / beta / dev, decision Nicolas 2026-05-25.
> S applique a partir de la stabilisation officielle V1.0.0.

---

## ⚠️ MISE A JOUR 2026-08-19 : dev et prod sont 2 BASES SEPAREES (NG-007 resolu)

Le document ci-dessous decrivait la "Phase 1" ou dev/staging/prod partageaient la
MEME base Supabase. **Ce n'est PLUS le cas.** Etat REEL desormais :

| Environnement | Branche              | Vercel     | Base Supabase                   |
| ------------- | -------------------- | ---------- | ------------------------------- |
| DEV           | `develop`, `staging` | Preview    | **DEV** `nkgdgxwejqqnqmwqwegy`  |
| PROD          | `main`               | Production | **PROD** `hrxgduvworofnrjmgpcj` |

- Le dev = copie du schema prod (40 tables) + donnees de reference seedees, ZERO
  donnee utilisateur. Isole : crons off + triggers vers la prod neutralises.
- Vercel : variables `VITE_SUPABASE_*` scope **Preview** -> dev, scope **Production**
  -> prod. **NE JAMAIS modifier les variables Production** (casse naturegraph.ca).

### Processus FIXE (a tenir dans le temps)

> **Pipeline complet a portes de validation : `PIPELINE_DEV.md`.** Chaque tache
> traverse les portes G0 -> G10 (cadrage, implementation, optim, qualite, securite,
> DB, docs, preview/UX, staging, release prod, suivi), chaque porte validee avant
> de passer a la suivante. Le resume ci-dessous en est la version courte.

1. **Developper sur `develop`** : la preview lit le DEV -> experimentation sans
   risque pour la prod. Puis `develop -> staging` (tests), puis PR `staging -> main`
   (release notes + validation Nicolas) pour la prod.
2. **Migrations DB** : creer via `npm run migration:new -- "description"` (fichier
   HORODATE unique `YYYYMMDDHHMMSS_nom.sql`). L'appliquer et la TESTER sur le DEV
   d'abord, puis sur la PROD au merge vers main. Idempotence recommandee.
   - Pourquoi horodate : les migrations historiques (format `YYYYMMDD`) ont des
     versions dupliquees qui cassent la CLI supabase. Toute NOUVELLE migration doit
     etre unique.
3. **Re-synchroniser le dev** depuis la prod quand le schema a diverge :
   `scripts/run-dev-rebuild.mjs` (schema) + `scripts/copy-refdata-prod-to-dev.mjs`
   (donnees de reference). Cf. `SUPABASE_DEV_PARITY_RUNBOOK.md`.
4. **Ce qui reste protege vs ce qui demande de la vigilance** :
   - PROTEGE par construction : le travail de dev (code + experiences DB) ne touche
     plus jamais la prod.
   - DEMANDE DE LA DISCIPLINE (aucun outil ne remplace la prudence) : ce qui va sur
     `main` part en prod ; toute operation manuelle sur la base prod (MCP prod /
     dashboard) est reelle. Toujours passer par develop -> staging -> main.

---

## Vue d ensemble

```
                 PROD                    BETA (privee)            DEV (interne)
                 ════                    ═════════════            ══════════════

Branche Git      main                    staging                  develop
Domaine          naturegraph.ca          beta.naturegraph.ca      preview Vercel
Audience         public                  testeurs autorises       Nicolas + collab
Stabilite        ULTRA stable            instable OK              tres instable
Validation       QA complete obligatoire QA UX requise            aucune
Donnees          prod reelles            donnees de test          donnees de test
Features         seulement stables       experimentales OK        toutes
Deploy           apres validation Nicolas auto sur push staging   auto sur push develop
```

---

## 1. PROD, Production stable

### Identite

- **Branche** : `main`
- **Domaine** : `naturegraph.ca`
- **Vercel deploy** : automatique sur merge to main
- **Supabase project** : `naturegraph-prod` (id hrxgduvworofnrjmgpcj)

### Public

- Tous les users (beta privee ouverte au Quebec + France)
- Doit etre fiable, rapide, sans bug

### Regles strictes

✅ DOIT :

- Etre stable et fiable
- Recevoir seulement du code valide (QA + responsive + cross-browser + Supabase + Vercel OK)
- Etre taggee proprement (v1.X.Y)
- Avoir une release note technique + user-friendly

❌ NE DOIT JAMAIS :

- Servir de terrain de test
- Contenir des features incompletes
- Contenir du debug ou des console.log
- Recevoir des hotfixes sauvages
- Contenir de la fake data
- Avoir des feature flags oublies
- Recevoir du code non valide par Nicolas

### Process deploiement

1. Code valide en beta (cf section 2)
2. PR `staging -> main` avec release note (template `RELEASE_PROCESS.md`)
3. Validation Nicolas (date, heure, tests, force-logout, notif)
4. Merge admin + Vercel deploy
5. Tag git `v[X.Y.Z]`
6. Surveillance 30-60 min post-deploy
7. Archive release notes dans `releases/`

---

## 2. BETA, Beta privee

### Identite

- **Branche** : `staging`
- **Domaine** : `beta.naturegraph.ca` (a configurer cote Hostinger DNS + Vercel)
- **Vercel deploy** : automatique sur push staging
- **Supabase project** : base **DEV** `naturegraph-dev` (nkgdgxwejqqnqmwqwegy), comme develop (cf. bandeau en tete). La beta ne touche jamais la base prod.

### Public

- Beta testeurs autorises uniquement
- Acces controle via allowlist email + beta gate existant
- Pas indexe par Google (robots.txt + meta noindex sur beta domain)

### Regles

✅ DOIT :

- Etre la passerelle obligatoire entre dev et prod
- Recevoir toutes les nouvelles features avant prod
- Permettre validation UX en conditions reelles
- Conserver des donnees reelles (ou snapshot prod)

⚠️ PEUT :

- Etre instable temporairement
- Contenir des features experimentales derriere feature flags

❌ NE DOIT PAS :

- Etre publique
- Etre indexee par les moteurs de recherche
- Servir de prod (les vrais users restent sur naturegraph.ca)

### Process

1. Feature finie sur `develop`
2. PR `develop -> staging`
3. Tests beta privee par Nicolas + collaborateurs autorises sur `beta.naturegraph.ca`
4. Iteration UX, fixes
5. Quand stable : PR `staging -> main` (process release stable cf section 1)

---

## 3. DEV, Developpement interne

### Identite

- **Branche** : `develop`
- **Domaine** : preview Vercel auto (`naturegraph-eight.vercel.app` ou equivalent)
- **Vercel deploy** : automatique sur push develop
- **Supabase project** : base **DEV** separee `naturegraph-dev` (nkgdgxwejqqnqmwqwegy), cf. bandeau en tete. Copie du schema prod + donnees de reference, zero donnee utilisateur.

### Public

- Nicolas + collaborateurs eventuels uniquement
- Acces possible via preview Vercel, lien partage manuel

### Regles

✅ DOIT :

- Etre l environnement de travail principal
- Recevoir tous les commits intermediaires
- Permettre experimentation totale

⚠️ PEUT :

- Etre tres instable
- Contenir du debug
- Avoir des features cassees
- Avoir des fake data temporaires

❌ NE DOIT PAS :

- Etre partage publiquement
- Etre confondu avec la prod

---

## Feature flags

Pour isoler les features experimentales :

```ts
// src/lib/featureFlags.ts (a creer)
export const FEATURES = {
  GOOGLE_OAUTH: import.meta.env.VITE_FEATURE_GOOGLE_OAUTH === 'true',
  PWA_PROMPT: import.meta.env.VITE_FEATURE_PWA_PROMPT === 'true',
  // etc.
}
```

Config Vercel par environnement :

- Prod : `VITE_FEATURE_GOOGLE_OAUTH=false`
- Beta : `VITE_FEATURE_GOOGLE_OAUTH=true` (testeurs voient la feature)
- Dev : `VITE_FEATURE_GOOGLE_OAUTH=true`

---

## Securite et separation

### Variables d environnement

Etat actuel (dev et prod = 2 bases separees, cf. bandeau en tete) :

| Variable               | Production (main)                | Preview (develop + staging)      |
| ---------------------- | -------------------------------- | -------------------------------- |
| VITE_SUPABASE_URL      | hrxgduvworofnrjmgpcj.supabase.co | nkgdgxwejqqnqmwqwegy.supabase.co |
| VITE_SUPABASE_ANON_KEY | cle PROD                         | cle DEV                          |
| VITE*FEATURE*\*        | false (sauf si validee)          | true pour les en-cours           |

Cote Vercel : ces variables sont definies par scope (Production vs Preview).
**Ne JAMAIS modifier les variables Production** (casse naturegraph.ca).

### Cles API et callbacks

- Auth callbacks distincts par domaine (Supabase Dashboard, Auth, URL Configuration)
  - `https://naturegraph.ca/auth/callback` (prod)
  - `https://beta.naturegraph.ca/auth/callback` (beta)
  - `https://naturegraph-eight.vercel.app/auth/callback` (dev)

### Analytics

- Vercel Web Analytics : isolation par domaine deja en place
- PostHog (futur) : projet separe par environnement

---

## Etat actuel vs objectif

### Existe

- `main` + naturegraph.ca + base **PROD** (hrxg) : ✅ en place
- `develop` + `staging` + preview Vercel + base **DEV** separee (nkgd) : ✅ en place (NG-007 resolu)
- Variables Vercel par scope (Production vs Preview) : ✅ en place
- Feature flags (`src/lib/featureFlags.ts`) : ✅ en place
- Acces ouvert a tous (`OPEN_ACCESS_ENABLED = true`, plus de gate beta) : ✅ actif depuis NG-029
- Pipeline de validation `PIPELINE_DEV.md` (G0->G10) : ✅ en place
- CI build / lint / TypeScript / bundle budget : ✅ en place

### A mettre en place / a decider

- [ ] Domaine dedie `beta.naturegraph.ca` (aujourd'hui la beta = URL preview Vercel de `staging`)
- [ ] Documenter le workflow develop -> staging -> main dans CONTRIBUTING.md

### Long terme (V1.X+)

- Github Actions deploy specifique par environnement
- Database branching Supabase Pro pour les feature branches lourdes

---

## Workflow officiel

```
                 develop                    staging                main
                 ━━━━━━━                    ━━━━━━━                ━━━━
                 push libre  →→→ PR validee →→→ release note + Nicolas → tag git v1.X.Y
```

### Quand merger ou ?

| Action                      | Branche cible                                                           |
| --------------------------- | ----------------------------------------------------------------------- |
| Fix bug rapide non bloquant | develop, puis staging plus tard                                         |
| Bug critique (prod cassee)  | hotfix/x depuis main → main, remonter vers staging + develop            |
| Nouvelle feature            | develop → staging quand prete → main quand validee                      |
| Refactor / cleanup          | develop → staging → main (pas de raccourci)                             |
| Hotfix urgent               | `hotfix/x` depuis `main` → merge main → remonter dans staging + develop |

---

## Reference

- Process de release : `RELEASE_PROCESS.md`
- Force-logout users : `FORCE_LOGOUT_RUNBOOK.md`
- Document central : `../../PROJECT_MASTER.md`
