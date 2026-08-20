# Naturegraph, PROJECT MASTER

> Document central et unique de référence du projet. Tout ce qui doit être
> compris en arrivant sur le repo est ici, ou pointé depuis ici.
> Mis à jour à chaque release.

**Version actuelle** : **V0.8.2** (source de verite = `package.json`), aout 2026.
**Statut** : accès **ouvert à tous** (plus de gate beta depuis NG-029), Québec + France,
BDD taxonomique complete (45 764 nodes) + family fallback.

> ⚠️ **Note versioning (NG-025)** : la prod a été **renumérotée** de l'ancien schéma
> `V1.x` (mai 2026) vers `V0.0.1`, puis a progressé jusqu'à **V0.8.2**. Les mentions
> `V1.0.x` / `V1.1.0` / `V1.2.x` plus bas dans ce document appartiennent à l'**ancien
> schéma legacy** (leurs notes sont archivées dans `docs/devops/releases/archive/`).
> L'historique courant est dans `docs/devops/releases/` (V0.8.x visibles).
> Un **nouveau V1** sera défini à la fin du chantier qualité (`docs/devops/CHANTIER_QUALITE_CODE.md`).
> Ce document reste à réharmoniser en profondeur (tâche tracée, Registre A du chantier).

**Historique récent (schéma V0.x actuel)** : voir `docs/devops/releases/` (V0.8.0 → V0.8.2).

---

## 1. Vision et positionnement

**Naturegraph** est une plateforme web citoyenne dédiée à la biodiversité.
Elle permet aux naturalistes amateurs et confirmés de partager leurs observations,
documenter la faune et la flore locale, et collaborer pour l'identification
des espèces.

### Différenciants

- **Eco-conception stricte** : budgets perf, lazy loading, images optimisées, pagination obligatoire
- **Accessibilité WCAG AA** par défaut sur tout le produit
- **Privacy-first** : RGPD + Loi 25 Québec, EXIF strippé, localisation floutable
- **Source de données ouvertes** : iNaturalist (CC-BY 4.0) source principale + GBIF (CC0) + Wikidata (CC0) pour la taxonomie. Attribution dans CGU + Privacy + Settings + Footer.
- **Beta privée Québec + France** : démarrage contrôlé, retours photographes pro

### Audience cible

- Photographes nature passionnés
- Naturalistes amateurs et confirmés
- Communauté biodiversité francophone (FR + QC en priorité)

---

## 2. État V1.0.0, ce qui est livré et stable

### Authentification + Onboarding

- ✅ Sign-up + login par OTP email (Supabase Auth, code 6 chiffres)
- ✅ Refresh token persistant 30j, storage localStorage si "Se souvenir"
- ✅ Recovery automatique des sessions mortes côté client (`authGuard.assertActiveSession`)
- ✅ 4 étapes d'onboarding (centres d'intérêt, localisation, profil, photos)
- ✅ Mode invité (lecture seule sans compte)
- ✅ Beta gate avec clés NG-XXXX-XXXX, validité 30j en localStorage

### Profil utilisateur

- ✅ Profil owner : avatar, bannière, bio, ville, région, intérêts, réseaux sociaux
- ✅ Profil visiteur : header + tabs (Feed, Galerie, Inspirations, Communauté)
- ✅ Edit Profile Panel (3 tabs : Infos / Préférences / Photos)
- ✅ Photos avatar + bannière : upload Supabase Storage + compression client + transforms
- ✅ Settings Panel : Sécurité, Blocages, Notifications, Aide, Licence, Export RGPD, Logout, Suppression

### Feed et Publications

- ✅ Feed principal mobile + desktop
- ✅ 2 formats de post : Rencontre Nature (long, photos + détails) + Instant Nature (court)
- ✅ Upload photos avec retry exponentiel + tolérance échecs partiels + watchdog 60s
- ✅ Compression photo client + strip EXIF (RGPD)
- ✅ Édition de post existant (mode update)
- ✅ Masquer publication / Bloquer utilisateur (avec gestion réversible dans Settings > Blocages)
- ✅ Favoris, Signalement, Copier lien

### Social

- ✅ Follow / Unfollow (Migrer) avec optimistic UI + caches invalidés
- ✅ Compteurs followers / following denormalisés (triggers PostgreSQL)
- ✅ Notifications system (reaction, follow, comment, mention, post, species_digest, identification, system)
- ✅ Préférences notifications par type (RGPD compliant)

### Recherche

- ✅ Recherche espèces avec autocomplete (4 835 espèces actuelles)
- ✅ Recherche localisation (38 000 communes FR + QC)
- ✅ Pagination cliente + serveur

### Admin

- ✅ Dashboard avec stats temps réel
- ✅ Modération posts + signalements
- ✅ Gestion users (search, ban, role)
- ✅ Gestion beta keys (générer, révoquer)
- ✅ Analytics (Phase 1 : KPIs runbook + heatmap)
- ✅ Audit logs

### Performance et Infra

- ✅ Bundle JS < 480 KB gzip (budget eco-conception)
- ✅ Image Transformations Supabase Pro (avatars 8 KB, photos feed 180 KB)
- ✅ Storage 100 MB / fichier (RAW photographes pro)
- ✅ PITR backups 7 jours (Supabase Pro)
- ✅ Vercel auto-deploy, preview branches
- ✅ Beta gate + RLS + ProtectedRoute en defense en profondeur

### Légal et Sécurité

- ✅ CGU + Politique de confidentialité (FR + EN, RGPD + Loi 25 Québec)
- ✅ Export RGPD complet (Art 20)
- ✅ Suppression compte hard delete (cascade Storage + Auth)
- ✅ Audit logs admin
- ✅ EXIF strip automatique
- ✅ Rate limiting OTP + signin

---

## 3. Architecture actuelle

### Stack technique

```
Frontend
├── React 19 + TypeScript strict (no any)
├── Vite 5 (build + dev server)
├── React Router 7
├── TanStack Query (cache + mutations)
├── i18next FR/EN
├── Tailwind CSS 4 + design tokens Figma
└── SCSS 7-1 pattern (variables synchro Figma)

Backend
├── Supabase Postgres 17 + PostGIS + pg_trgm
├── Supabase Auth (JWT + refresh tokens)
├── Supabase Storage (avatars, banners, post-media)
├── Supabase Edge Functions (send-beta-invite, delete-account, export-data)
└── RLS sur toutes les tables sensibles

Infra
├── Vercel (hosting + auto-deploy)
├── Hostinger (DNS naturegraph.ca)
└── Supabase Pro ($25/mo, project hrxgduvworofnrjmgpcj)
```

### Structure projet

```
src/
├── components/
│   ├── ui/              Composants reutilisables (Button, Toggle, etc.)
│   ├── layout/          Header, Footer, MainLayout
│   ├── auth/            Forms, BetaKeyGate
│   ├── home/            Feed, Posts, Navbar, MobileNav
│   ├── profile/         Header, Tabs, EditPanel
│   ├── contribute/      Encounter form, Instant form
│   ├── settings/        SettingsPanel + sous-vues
│   └── admin/           AdminGuard, layouts
├── contexts/            AuthContext, ToastContext, LocationContext, etc.
├── hooks/               useFeed, useProfile, useFollow, useBlocks, etc.
├── services/            Couche Supabase (postService, followService, etc.)
├── lib/                 supabase client, authStorage, authGuard, image
├── pages/               Routes (Home, Profile, Settings, Admin, etc.)
├── i18n/locales/        fr.json + en.json
├── styles/              SCSS 7-1 pattern
└── types/               database.ts + supabase.ts (generes)

docs/
├── devops/              Release, force-logout, deployment, environments, monitoring
├── security/            RLS, audits, incident response, RGPD
├── backend/             Database architecture, relations
├── api-connection/      Supabase setup, endpoints, auth flow
├── design-system/       Tokens, components, guidelines
├── AUTH_ROADMAP.md      Plan reduction OTP (refresh 90j, Google OAuth)
├── SUPABASE_PRO_ROADMAP.md  Phases A-D Pro plan exploitation
├── SEED_SPECIES_V2_RUNBOOK.md  Procedure seed especes
├── USER_STORIES.md      Parcours user, source de verite produit
└── PRD_*.md             Product Requirements (12 specs feature, conservees comme source de verite)

supabase/
└── migrations/          SQL versionnees YYYYMMDD_description.sql
```

### Conventions code

- TypeScript strict, jamais de `any`
- Composants < 200 lignes
- Pas d'em-dash (-) ni en-dash (-) (cf CLAUDE.md)
- Commentaires obligatoires : header de fichier, JSDoc, logique métier expliquée
- Commits : `feat:`, `fix:`, `refactor:`, `perf:`, `docs:`, `chore:`
- Eco-conception : lazy loading, pagination, pas d'animation superflue, prefers-reduced-motion

Cf. `CLAUDE.md` pour les règles complètes, `GUIDELINES.md` pour les budgets perf.

---

## 4. Roadmap réelle restante

### Phase B Supabase Pro (apres stabilisation V1.0.0)

Cf. `docs/SUPABASE_PRO_ROADMAP.md` section Phase B.

- VACUUM ANALYZE species_master post-seed
- Cleanup ~40 unused indexes (gain write performance)
- Installer extensions Pro : pgaudit, pgmq, hypopg
- Auth DB connections en mode percentage-based
- Setup pg_cron jobs (cleanup beta_signup_log, refresh stats)

### Quick wins Auth (5 min a 2h)

Cf. `docs/AUTH_ROADMAP.md`.

1. Refresh token Supabase 30j → 90j (5 min, gain 50% reduction OTP)
2. Activer Google OAuth (2h, gain 80%)
3. PWA install prompt (Safari iOS preserve localStorage)
4. Passkeys / WebAuthn (long terme)

### Features V1.1.0 (prochaines)

- Partage post fonctionnel : route `/post/:id` + OG preview Vercel Function
- PWA install prompt banner (Chrome beforeinstallprompt + iOS guide)
- Post espèce non affichée : taxref_id manquant + individuals_count colonne
- EncounterStep3 : afficher options avancées par défaut
- Profile OG preview : Vercel Function `/api/profile-og`

### Refonte espèces V1.2.0 (a planifier)

Cf. `docs/SEED_SPECIES_V2_RUNBOOK.md`.

- Migration `species_master` : `common_name_fr` nullable + `fr_source` + `fr_validated`
- Script seed acceptant EN-only pour insectes
- Pipeline enrichissement FR (Wikidata SPARQL + iNaturalist API)
- Admin review queue pour valider les noms FR
- Cible : 15k+ espèces avec couverture FR/CA complète

### Phase D scaling (quand traffic le justifie)

- Read replicas Supabase (+$5/mo, > 200 users actifs)
- Vector search espèces (embeddings OpenAI ~$1.5 one-shot)
- PGroonga fulltext si pg_trgm devient lent > 50k espèces
- Partitioning posts via pg_partman > 100k rows
- Database branching CI/CD

---

## 5. TODO réelle (single source of truth)

Cette TODO remplace toutes les anciennes listes (MASTER_TODO, NEXT_TASKS, etc.).

### Bugs ouverts

(aucun bug critique connu en V1.0.0 : les derniers ont été fixés le 2026-05-25)

### Améliorations UX

- [ ] PWA install prompt banner
- [ ] EncounterStep3 : options avancées par défaut
- [ ] Post espèce non affichée : taxref_id manquant + individuals_count colonne

### Features V1.1.0

- [ ] Partage post fonctionnel `/post/:id`
- [ ] Profile OG preview
- [ ] PWA install prompt

### Infrastructure Pro (Phase B)

- [ ] VACUUM ANALYZE species_master
- [ ] Cleanup unused indexes
- [ ] Installer pgaudit + pgmq + hypopg
- [ ] Auth connections percentage-based
- [ ] pg_cron jobs cleanup beta_signup_log

### Auth refonte (au choix)

- [ ] Refresh token 30j → 90j (5 min, dashboard Supabase)
- [ ] Google OAuth (2h, code stubbed dans AuthContext ligne 468)

### Refonte espèces (V1.2.0)

- [ ] Migration `species_master` colonnes nullable + sources
- [ ] Script enrichissement FR Wikidata + iNaturalist
- [ ] Admin review queue noms FR

---

## 6. Versioning, stratégie officielle V1.0.0+

### Format semver type SaaS / jeu vidéo

```
V[MAJOR].[MINOR].[PATCH]
```

### PATCH (V1.0.1, V1.0.2, ...)

- Bugfix
- Cleanup
- Responsive
- Optimisations
- Petits ajustements UX
- Sécurité mineure
- Stabilité

### MINOR (V1.1.0, V1.2.0, ...)

- Nouvelles fonctionnalités importantes
- Améliorations UX majeures
- Nouveaux systèmes
- Évolutions produit visibles

### MAJOR (V2.0.0, ...)

- Grosses évolutions produit
- Refonte architecture
- Refonte UX importante
- Changement majeur business

### Tag git

```bash
git tag -a v1.0.0 -m "Release v1.0.0 stabilisation"
git push origin v1.0.0
```

---

## 7. Workflow projet

### Strategie 3 environnements (norme officielle V1.0.0+)

```
                 PROD                    BETA (privee)            DEV (interne)
                 ════                    ═════════════            ══════════════
Branche Git      main                    staging                  develop
Domaine          naturegraph.ca          beta.naturegraph.ca      preview Vercel
Audience         public                  testeurs autorises       Nicolas + collab
Stabilite        ULTRA stable            instable OK              tres instable
Validation       QA complete obligatoire QA UX requise            aucune
```

**Flux obligatoire** : `develop` → `staging` → `main` (sans raccourci).
**Hotfix urgent** : `hotfix/x` depuis `main` → merge main → remonter dans staging + develop.

Cf. `docs/devops/environments.md` pour le detail complet (regles, securite, feature flags).

### Règle de release (depuis 2026-05-25)

**PAS de push prod systematique.** On accumule plusieurs fixes/améliorations puis on release groupé. Workflow :

1. Push libre sur `develop`
2. Quand grappe cohérente (3-5 changements ou fix urgent), rédiger release note
3. Soumettre à Nicolas pour validation (date, heure, tests, force-logout, notif)
4. Une fois validé : PR `develop → main` avec release note en body
5. Merge + Vercel auto-deploy
6. Force-logout users SI changement auth/schema (sinon non)
7. Surveiller 30-60 min post-deploy

Cf. `docs/devops/RELEASE_PROCESS.md` pour le template release note complet.

### Force-logout users

Cf. `docs/devops/FORCE_LOGOUT_RUNBOOK.md`.

Cas d'usage :

- Refonte auth → force tous
- Schema DB cassant → force tous
- Photographe coincé avec session morte → force un user

Scripts SQL prêts dans le runbook.

### Validation QA

Pour les grosses MAJ : tests manuels par Nicolas sur naturegraph.ca avec un compte test, suivant la checklist de la release note.

---

## 8. Infrastructure

### GitHub

- Repo : `Naturegraph/naturegraph`
- Branches protégées : `main` (CI required + admin merge possible)
- CI : Lint, TypeScript check, Build, Bundle budget eco-conception (480 KB)
- CodeQL SAST sur chaque PR

### Supabase

- Project ID : `hrxgduvworofnrjmgpcj` (Pro plan, $25/mo)
- URL : `https://hrxgduvworofnrjmgpcj.supabase.co`
- Storage : 100 GB total, 100 MB / fichier
- Auth : JWT 1h + refresh 30j, OTP email via Gmail App Password SMTP
- PITR backups 7 jours
- Image Transformations + S3 Protocol actifs

### Vercel

- Project : `naturegraph` (team naturegraph-9868s-projects)
- Domaine : `naturegraph.ca` (DNS Hostinger)
- Preview branches automatiques
- Edge Functions activées
- Web Analytics : Pro plan

### Mail

- SMTP Gmail App Password (Phase 1, ~500/jour)
- Templates auth : 3 (signup, magic link, recovery) dans Supabase Auth Email Templates
- TODO : migrer vers Resend / Mailgun Pro pour limites plus élevées

### Domaine

- `naturegraph.ca` (prod)
- `naturegraph-eight.vercel.app` (preview Vercel auto)

---

## 9. Pour démarrer sur le projet

### Premier setup local

```bash
git clone https://github.com/Naturegraph/naturegraph.git
cd naturegraph
npm install
cp .env.example .env.local  # remplir avec credentials Supabase dev
npm run dev                  # localhost:5173
```

### Tester

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run build       # Build prod local
npm run dev         # Dev server
```

### Documents clés (par ordre d'importance)

1. **`PROJECT_MASTER.md`** (ce document) : vue d ensemble
2. **`CLAUDE.md`** : instructions Claude Code + règles permanentes
3. **`GUIDELINES.md`** : budgets eco-conception + accessibilité
4. **`README.md`** : entry point repo
5. **`docs/devops/RELEASE_PROCESS.md`** : comment release
6. **`docs/backend/database-architecture.md`** : schema DB
7. **`docs/security/`** : RLS, RGPD, incident response

Tout le reste de `docs/` est de référence (consulter au besoin).

---

## 10. Contact et responsabilité

- **Lead Product Designer + Dev** : Nicolas (fondateur)
- **Support beta photographes** : Discord beta privée
- **Issues techniques** : GitHub Issues `Naturegraph/naturegraph`
- **Email contact** : via le formulaire `Settings > Besoin d'aide` (table support_tickets)

---

## Historique des versions

| Version | Date       | Résumé                                                             | Notes                                                            |
| ------- | ---------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| V1.0.0  | 2026-05-25 | Stabilisation beta privée Québec + nettoyage complet documentation | Première version officielle stable. Base de référence du projet. |

À mettre à jour à chaque release.
