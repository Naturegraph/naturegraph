# Documentation Naturegraph

> Le document central du projet est **[`../PROJECT_MASTER.md`](../PROJECT_MASTER.md)**.
> Cette doc/ contient les references techniques détaillées.

## Structure

### Devops

- [`devops/RELEASE_PROCESS.md`](devops/RELEASE_PROCESS.md), workflow release + template release note
- [`devops/FORCE_LOGOUT_RUNBOOK.md`](devops/FORCE_LOGOUT_RUNBOOK.md), scripts SQL revoke sessions
- [`devops/deployment.md`](devops/deployment.md), procedure deploiement Vercel
- [`devops/environments.md`](devops/environments.md), config dev / staging / prod
- [`devops/monitoring.md`](devops/monitoring.md), logs et alerting

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

---

Cf. **[`../PROJECT_MASTER.md`](../PROJECT_MASTER.md)** pour la vue d ensemble.
