# Changelog

> Historique public des versions de Naturegraph.
> Format inspire de [Keep a Changelog](https://keepachangelog.com/), versioning [Semver](https://semver.org/).

Les notes detaillees techniques sont archivees dans `docs/devops/releases/V[X.Y.Z]_TECHNICAL.md`.
Les notes user-friendly sont dans `docs/devops/releases/V[X.Y.Z]_USER.md`.

---

## [V1.0.5] - 2026-05-26, attribution iNat + BDD taxonomique scalable

> Release de fondation pour V1.1.0. Voir `docs/devops/releases/V1.0.5_TECHNICAL.md`.

### Securite legale

- Attribution iNaturalist CC-BY 4.0 ajoutee dans 5 endroits : Settings, CGU section 7, Privacy section 12, Footer global, Docs.
- Conformite RGPD Art. 13 + Loi 25 Quebec (declaration des sous-traitants de donnees).
- i18n FR + EN complete pour les nouvelles sections legales.

### Infrastructure

- Nouvelle table `taxonomy_nodes` : hierarchie unifiee scalable (kingdom > class > order > family > genus > species).
- 43 823 nodes seedes via iNaturalist API (FR place_id 6753 + CA 6712) : 8 classes, 1500 familles d insectes, 42 315 especes (Aves/Mammalia/Amphibia/Reptilia/Insecta/Arachnida/Mollusca/Actinopterygii).
- `metadata` JSONB extensible pour ajouter sans migration cassante : statuts conservation IUCN/COSEWIC/SARA, protection regulation, habitats, migration patterns.
- RPC `search_taxonomy()` : recherche unifiee especes + familles + ordres avec filtre territoire + ranking match_score + popularity.

### Documentation

- `docs/backend/TAXONOMY_DATABASE_DESIGN.md` : source de verite scalable (500+ lignes) couvrant schema, conventions JSONB, tables annexes planifiees, politique d evolution sans casser.

### Devops

- `.github/dependabot.yml` : ignore les bumps majors pendant la beta (reactivable plus tard).

---

## [V1.0.4] - 2026-05-26, hotfix critique auth OTP + security Dependabot

> Hotfix prod V1.0.3. Voir `docs/devops/releases/V1.0.4_TECHNICAL.md`.

### Corrections critiques

- **Bug OTP** : users bloques apres saisie code OTP, necessitaient F5 manuel pour entrer dans la plateforme. `verifyOtp()` met desormais a jour le state synchronement depuis la response Supabase au lieu d attendre `onAuthStateChange`.

### Securite

- Resolution de 8 vulnerabilites JS (2 high + 4 moderate + 2 low) via overrides npm scopes sous `@vercel/node` et `@vercel/python-analysis`.
- Packages patches : undici, minimatch, path-to-regexp, ajv, smol-toml.
- `npm audit` : 0 vulnerabilites restantes.

---

## [V1.0.3] - 2026-05-25, consolidation Supabase Pro Phase B

> Note technique uniquement (zero impact UX visible). Voir `docs/devops/releases/V1.0.3_TECHNICAL.md` pour le detail.

### Securite

- Lockdown des 36 fonctions SECURITY DEFINER : REVOKE EXECUTE FROM PUBLIC + GRANT explicite par role. Surface d attaque reduite, advisor warnings 80+ -> 25.
- Extensions pgaudit + hypopg + index_advisor deplacees hors du schema public.

### Corrections

- Bug claim_beta_access_key : ecrit desormais `used_by_user_id` au moment du claim. Edge Function `validate-beta-key` v2 extrait le user_id du JWT.
- Backfill cle orpheline NG-NJQ6-Z3XZ liee a son user historique.

### Infrastructure

- DROP 17 indexes inutilises, KEEP 22 (FK + autocomplete + geo).
- ANALYZE sur les tables chaudes post-cleanup.
- Install pgaudit / hypopg / index_advisor.
- 4 jobs pg_cron de maintenance (cleanup logs RGPD + ANALYZE quotidien).
- Realtime active sur posts / follows / reactions / comments (prep V1.1.0 feed live).
- Bucket storage post-media : 10 MB -> 100 MB.

---

## [V1.0.2] - 2026-05-25, fix navigation mobile

### Securite / UX navigation

- Route `/` Landing protegee par `PublicRoute` : un utilisateur authentifie qui presse le bouton retour mobile reste dans l app (sur /home) au lieu de retomber sur la landing publique. Plus de friction de reconnexion intempestive.

---

## [V1.0.1] - 2026-05-25, fix admin + securite route post

### Admin (interne)

- AdminBeta : message de motivation des inscrits waitlist visible en entier (etait tronque a 1 ligne)
- Lien manuel du code NG-HMW8-D9U6 au compte de Claire (action DB, bug claim atomique a auditer)

### Securite

- Route `/post/:postId` desormais protegee : un visiteur non authentifie est redirige vers /welcome au lieu d acceder librement a la page detail d un post

---

## [V1.0.0] - 2026-05-25, premiere version officielle stable

Premiere version officielle stable du projet, base de reference apres consolidation finale.

### Nouveautes

- Section **Blocages** dans les Parametres pour gerer publications masquees et comptes bloques de maniere reversible
- Notification system pour communications officielles avec affichage multi-lignes
- Recovery automatique des sessions cote client (cas Flo.d)

### Ameliorations

- Photos de profil et bannieres synchronisees immediatement dans toute la navigation
- Image Transformations Supabase Pro (avatars 250x plus legers, photos feed 28x plus legeres)
- Storage 100 MB par fichier pour photos haute resolution
- Compte admin isole des stats publiques (compteurs reels users)

### Corrections

- Bouton Migrer (follow) reellement fonctionnel (etait cosmetique avant)
- Publications masquees visibles dans Settings (bug SQL hidden_posts.hidden_at)
- Body des notifications affiche sur plusieurs lignes
- Pipeline upload robuste avec retry exponentiel et tolerance echecs partiels
- Timeouts location / espèces / submit
- "Voir plus" mobile fonctionnel sur descriptions longues

### Documentation

- `PROJECT_MASTER.md` cree au root, document central unique
- 103 to 39 fichiers .md (-62 %), structure clarifiee
- Strategie 3 environnements officielle (prod / beta / dev)
- Process release double note (technique + user-friendly)
- Versioning officiel V[MAJOR].[MINOR].[PATCH] type SaaS
- Runbook force-logout users

### Infrastructure

- Supabase upgrade Pro plan ($25/mo, project hrxgduvworofnrjmgpcj)
- PITR backups 7 jours
- Tag git officiel `v1.0.0`

---

## [Versions a venir]

### V1.0.1 (prochaine PATCH)

- A definir selon retours users

### V1.1.0 (prochaine MINOR)

- Partage post fonctionnel via /post/:id
- PWA install prompt banner
- Profile OG preview Vercel Function

### V1.2.0 (planifiee)

- Refonte base d especes : 4 835 to 15 000+ especes
- Pipeline enrichissement FR (Wikidata + iNaturalist)
- Admin review queue noms FR

### V2.0.0 (long terme)

- A definir selon evolution business

---

## Format des entrees

Chaque release contient des sections optionnelles :

- **Nouveautes** : features ajoutees
- **Ameliorations** : modifications de features existantes
- **Corrections** : bugs fixes
- **Documentation** : changes docs
- **Infrastructure** : changements infra / DB
- **Securite** : fixes securite (toujours mentionnes meme si patch silencieux)
- **Retrait** : features supprimees ou deprecated
