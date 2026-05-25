# Changelog

> Historique public des versions de Naturegraph.
> Format inspire de [Keep a Changelog](https://keepachangelog.com/), versioning [Semver](https://semver.org/).

Les notes detaillees techniques sont archivees dans `docs/devops/releases/V[X.Y.Z]_TECHNICAL.md`.
Les notes user-friendly sont dans `docs/devops/releases/V[X.Y.Z]_USER.md`.

---

## [V1.0.1] - 2026-05-25, fix admin

### Admin (interne)

- AdminBeta : message de motivation des inscrits waitlist visible en entier (etait tronque a 1 ligne)
- Lien manuel du code NG-HMW8-D9U6 au compte de Claire (action DB, bug claim atomique a auditer)

### Aucun impact user

Cette release ne modifie aucune fonctionnalite cote utilisateur public.

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
