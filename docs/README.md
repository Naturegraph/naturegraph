# Documentation Naturegraph

> Le document central du projet est **[`../PROJECT_MASTER.md`](../PROJECT_MASTER.md)**.
> Cette doc/ contient les references techniques détaillées.

## Structure

### Devops

- [`devops/PIPELINE_DEV.md`](devops/PIPELINE_DEV.md), pipeline officiel a portes de validation (G0->G10, un role par porte)
- [`devops/environments.md`](devops/environments.md), config dev / staging / prod (2 bases Supabase separees, NG-007)
- [`devops/SUPABASE_DEV_PARITY_RUNBOOK.md`](devops/SUPABASE_DEV_PARITY_RUNBOOK.md), rebuild + seed de la base DEV
- [`devops/RELEASE_PROCESS.md`](devops/RELEASE_PROCESS.md), workflow release + template release note
- [`devops/VERSIONING.md`](devops/VERSIONING.md), convention de versions
- [`devops/deployment.md`](devops/deployment.md), procedure deploiement Vercel
- [`devops/monitoring.md`](devops/monitoring.md), logs et alerting (Sentry)
- [`devops/FORCE_LOGOUT_RUNBOOK.md`](devops/FORCE_LOGOUT_RUNBOOK.md), scripts SQL revoke sessions
- [`devops/ROLLBACK_OPEN_ACCESS.md`](devops/ROLLBACK_OPEN_ACCESS.md), procedure pour re-fermer l'acces si besoin
- [`devops/ROLLBACK_URGENCE.md`](devops/ROLLBACK_URGENCE.md), rollback d'urgence apres release (Vercel Instant Rollback + tag prod-stable-\*)
- [`devops/releases/`](devops/releases/), release notes recentes (historique dans `releases/archive/`)

**Chantier qualite -> V1 (en cours)** :

- [`devops/CHANTIER_QUALITE_CODE.md`](devops/CHANTIER_QUALITE_CODE.md), plan maitre (lots + registres, cap V1)
- [`devops/PLAN_DEMANTELEMENT_BETA.md`](devops/PLAN_DEMANTELEMENT_BETA.md), Lot 0 (retrait AdminBeta)

### Security

- [`security/SECURITY_AUDIT_GLOBAL.md`](security/SECURITY_AUDIT_GLOBAL.md), audit global
- [`security/SECURITY_HARDENING_ROADMAP.md`](security/SECURITY_HARDENING_ROADMAP.md), roadmap hardening
- [`security/PRIVACY_COMPLIANCE_AUDIT.md`](security/PRIVACY_COMPLIANCE_AUDIT.md), RGPD + Loi 25
- [`security/INCIDENT_RESPONSE_PLAN.md`](security/INCIDENT_RESPONSE_PLAN.md), plan incident
- [`security/SECURITY_CHECKLIST_PRE_PROD.md`](security/SECURITY_CHECKLIST_PRE_PROD.md), checklist avant deploiement
- [`security/SECURITY_SUPABASE.md`](security/SECURITY_SUPABASE.md), config Supabase
- [`security/SECURITY_VERCEL.md`](security/SECURITY_VERCEL.md), config Vercel
- [`security/SECURITY_GITHUB.md`](security/SECURITY_GITHUB.md), config GitHub
- [`security/rls-policies.md`](security/rls-policies.md), RLS reference
- [`security/data-protection.md`](security/data-protection.md), protection donnees personnelles
- [`security/media-security.md`](security/media-security.md), EXIF strip, upload validation

### Backend

- [`backend/database-architecture.md`](backend/database-architecture.md), schema complet + relations
- [`backend/relations.md`](backend/relations.md), graphe des relations
- [`backend/backend-guidelines.md`](backend/backend-guidelines.md), regles backend

### API Connection

- [`api-connection/supabase-setup.md`](api-connection/supabase-setup.md), setup initial
- [`api-connection/endpoints.md`](api-connection/endpoints.md), endpoints REST
- [`api-connection/auth-flow.md`](api-connection/auth-flow.md), flux auth complet

### Design System

- [`design-system/README.md`](design-system/README.md), entry point design system
- [`design-system/tokens.md`](design-system/tokens.md), tokens couleurs / typo / spacing
- [`design-system/guidelines.md`](design-system/guidelines.md), regles d usage
- [`design-system/audit.md`](design-system/audit.md), audit du DS
- `design-system/components/` : atoms, molecules, organisms, templates

### Briefs de chantier (a lire avant de demarrer le chantier concerne)

- [`BRIEF_COMMENTAIRES.md`](BRIEF_COMMENTAIRES.md), chantier commentaires sous les publications (fondation DB posee, frontend a construire)

### Roadmaps actives

- [`AUTH_ROADMAP.md`](AUTH_ROADMAP.md), plan reduction OTP (Google OAuth, refresh 90j)
- [`SUPABASE_PRO_ROADMAP.md`](SUPABASE_PRO_ROADMAP.md), exploitation Pro plan (Phases A-D)
- [`SEED_SPECIES_V2_RUNBOOK.md`](SEED_SPECIES_V2_RUNBOOK.md), procedure seed especes + plan V1.2.0

### PRD (source de verite produit, conservees pour les futures evolutions)

- [`USER_STORIES.md`](USER_STORIES.md), parcours user et histoires produit
- [`PRD_HOMEPAGE.md`](PRD_HOMEPAGE.md), specs feed + composants home
- [`PRD_PROFILE.md`](PRD_PROFILE.md), specs profil owner + visiteur
- [`PRD_ONBOARDING.md`](PRD_ONBOARDING.md), parcours onboarding 4 etapes
- [`PRD_LANDING.md`](PRD_LANDING.md), specs landing page publique
- [`PRD_FOLLOW_SYSTEM.md`](PRD_FOLLOW_SYSTEM.md), specs follow + migrateurs
- [`PRD_NOTIFICATIONS.md`](PRD_NOTIFICATIONS.md), specs notifications system
- [`PRD_POST_FORMATS.md`](PRD_POST_FORMATS.md), specs Rencontre + Instant Nature
- [`PRD_PHOTO_MANAGEMENT.md`](PRD_PHOTO_MANAGEMENT.md), specs upload + compression photos
- [`PRD_UPLOAD_STORAGE_BACKEND.md`](PRD_UPLOAD_STORAGE_BACKEND.md), specs storage Supabase
- [`PRD_LOCALIZATION.md`](PRD_LOCALIZATION.md), specs localisation + autocomplete villes
- [`PRD_SPECIES_DATABASE.md`](PRD_SPECIES_DATABASE.md), specs base especes + taxonomie
- [`PRD_IDENTIFICATIONS_COLLABORATIVE.md`](PRD_IDENTIFICATIONS_COLLABORATIVE.md), specs identification collaborative

### Archive

- [`_archive/`](_archive/), documents historiques non maintenus (prelancement, vieux audits).
- [`devops/releases/archive/`](devops/releases/archive/), release notes anterieures a V0.8.

---

Cf. **[`../PROJECT_MASTER.md`](../PROJECT_MASTER.md)** pour la vue d ensemble.
