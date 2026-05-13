# Naturegraph — Admin Product Control Center (Stratégie)

> **Version** : 1.0 — 2026-05-04
> **Statut** : 📌 **DOCUMENT STRATÉGIQUE FUTUR** — non à exécuter maintenant
> **Posture** : product manager + tech lead + design lead. Plan complet du futur centre de contrôle admin.
> **Pré-requis activation** : consolidation MVP + Phase 1 beta fermée terminée
> **Lecture cible** : 20 min pour absorber, à consulter avant implémentation admin

---

# ⚠️ Pré-requis activation

> Ce système admin ne doit **PAS** être construit tant que les pré-requis ne sont pas remplis.

## Conditions de déclenchement

1. ✅ `CONSOLIDATION_ROADMAP.md` Phase 1-6 terminées
2. ✅ `BETA_CLOSED_ACCESS_STRATEGY.md` Phase 1 démarrée (besoin réel admin testé)
3. ✅ Au moins 20 utilisateurs réels actifs (validation besoin)
4. ✅ Quelques signalements / bugs réels remontés (matériau pour modération)
5. ✅ Stack technique stabilisée (pas de gros refacto en cours)

**Construire l'admin TROP TÔT** = sur-engineering. **Construire TROP TARD** = chaos opérationnel.

**Timing recommandé** : début Phase 1 beta fermée (~mois 4 après consolidation MVP).

---

# 🎯 Vision

## Le Super Admin n'est PAS un dashboard

C'est un **vrai centre de contrôle produit** qui doit permettre de :

| Capacité            | Description                                 |
| ------------------- | ------------------------------------------- |
| 🩺 **Surveiller**   | Santé technique + comportement utilisateurs |
| 👥 **Gérer**        | Utilisateurs, rôles, sanctions              |
| 🚨 **Modérer**      | Spam, abus, contenu illégal                 |
| 📊 **Analyser**     | Croissance, rétention, engagement           |
| 🎫 **Beta piloter** | Vagues, clés d'accès, waitlist              |
| 🛡️ **Sécuriser**    | Détecter abus, brute-force, multi-comptes   |
| 🛠️ **Supporter**    | Tickets, signalements, communication        |
| ⚙️ **Configurer**   | Paramètres produit sans toucher au code     |
| 📝 **Tracer**       | Audit logs de toute action admin            |

## Anti-patterns à éviter

- ❌ Dashboard "vanity metrics" (DAU sans action possible)
- ❌ Tables sans filtres / recherche
- ❌ Actions destructives sans confirmation
- ❌ Pas de logs des actions admin (impossibilité audit)
- ❌ Frontend admin couplé au frontend public (déploiements liés)
- ❌ Pas de permissions granulaires (tout ou rien)
- ❌ Charts complexes sans contexte

---

# 🏛️ Philosophie système

## 4 Principes fondamentaux

### 1. Simplicité visuelle

- Hiérarchie forte (titres, espaces, contrastes)
- Lecture rapide (scan visuel < 5 sec)
- Informations actionnables (toujours un "que faire" à côté de "voir")

### 2. Data orientée décision

> Chaque donnée affichée DOIT permettre une décision OU une action.

**Mauvais** : "DAU = 47" (et alors ?)
**Bon** : "DAU = 47 (−12% vs hier) [Voir cohorte impactée]"

### 3. Architecture modulaire

```
Admin App
├── Modules (10)
│   ├── Dashboard
│   ├── Utilisateurs
│   ├── Modération
│   ├── Analytics
│   ├── Beta
│   ├── Sécurité
│   ├── Monitoring
│   ├── Support
│   ├── Config
│   └── Logs/Audit
│
├── Permissions (par module + par action)
│
└── Audit (toute action loggée)
```

### 4. Desktop FIRST, Mobile READY

| Plateforme  | Usage                                                     | Focus                               |
| ----------- | --------------------------------------------------------- | ----------------------------------- |
| **Desktop** | Cockpit complet, modération massive, analytics profonds   | Tables avancées, multi-panels       |
| **Mobile**  | Supervision rapide, modération urgente, alertes critiques | Actions essentielles, notifications |

---

# 🧩 Architecture en 10 modules

## Module 1 — Dashboard global

### Objectif

Vue d'ensemble en **< 5 secondes** : ce qui va, ce qui ne va pas, ce qui demande action.

### Widgets prioritaires

| Widget                  | Données                              | Action associée       |
| ----------------------- | ------------------------------------ | --------------------- |
| **Utilisateurs actifs** | DAU, WAU, MAU avec tendance 7j       | → Module Analytics    |
| **Nouveaux users**      | Aujourd'hui / Semaine / Mois         | → Module Users        |
| **Rétention**           | J1, J7, J30 (cohortes)               | → Analytics > Cohorts |
| **Observations**        | Total + aujourd'hui + moyenne/jour   | → Module Modération   |
| **Uploads**             | Volume, échecs, taille moyenne       | → Module Monitoring   |
| **Modération**          | Signalements ouverts, urgents        | → Module Modération   |
| **Sécurité**            | Tentatives suspectes, bans récents   | → Module Sécurité     |
| **Santé système**       | Status Supabase / Vercel / API       | → Module Monitoring   |
| **Beta**                | Clés utilisées / restantes (Phase 1) | → Module Beta         |
| **Tickets support**     | Ouverts, en attente                  | → Module Support      |

### KPIs visibles permanents (bandeau top)

```
[🟢 Système OK]  [Users: 47]  [DAU: 23]  [Signalements: 0]  [Beta: 23/50]
```

Code couleur :

- 🟢 Tout OK
- 🟡 Attention (à surveiller)
- 🔴 Critique (action requise)

---

## Module 2 — Gestion utilisateurs

### Fonctionnalités

#### Recherche avancée

Filtres simultanés :

- Email, username, ID
- Date inscription (range)
- Rôle (user, admin, moderator)
- Statut (active, suspended, banned, deleted)
- Activité (active 7j, inactive 30j+)
- Pays (via IP)
- Source invitation (batch beta)
- A des signalements (oui/non)

#### Fiche utilisateur 360°

**Section Profil** :

- Username, email, bio, avatar, banner
- Rôle, statut
- Date inscription, dernière connexion

**Section Activité** :

- Nb observations créées
- Nb commentaires
- Nb réactions données
- Nb réactions reçues
- Nb followers / following
- Fréquence connexion (heatmap 30j)

**Section Historique** :

- Logs connexions (date, IP, device)
- Changements username
- Sanctions reçues (warnings, suspensions)
- Suppressions de contenu

**Section Sécurité** :

- IPs uniques (anonymisées J+30 per RGPD)
- Appareils détectés
- Sessions actives
- Comportements suspects flaggés

### Actions admin (avec confirmation)

| Action                          | Sévérité | Impact                   | Réversible    |
| ------------------------------- | -------- | ------------------------ | ------------- |
| Avertir utilisateur             | 🟢       | Notif privée             | Oui           |
| Suspendre 7 jours               | 🟡       | Pas de login             | Auto-fin      |
| Shadow ban                      | 🟡       | Contenu caché aux autres | Oui           |
| Bannir définitivement           | 🔴       | Compte désactivé         | Oui (un-ban)  |
| Reset onboarding                | 🟢       | Réaffiche onboarding     | Oui           |
| Reset email (changement forcé)  | 🟡       | Demande nouvelle vérif   | Oui           |
| Forcer logout (toutes sessions) | 🟢       | Sécurité                 | Auto-rétablit |
| Modifier rôle                   | 🔴       | Permission élevée        | Oui           |
| Supprimer contenu               | 🟡       | Soft delete              | Oui           |
| Anonymiser compte               | 🔴       | RGPD anonymisation       | **Non**       |
| Supprimer compte                | 🔴       | RGPD hard delete         | **Non**       |

**Toutes ces actions** sont loggées dans `admin_audit_logs`.

---

## Module 3 — Modération contenu

### Types de signalements

| Type                                              | Priorité par défaut  | SLA réponse |
| ------------------------------------------------- | -------------------- | ----------- |
| Spam                                              | 🟡 Moyenne           | 24h         |
| Contenu offensant                                 | 🟠 Haute             | 12h         |
| Harcèlement                                       | 🔴 Critique          | 4h          |
| Faux contenu (info erronée)                       | 🟡 Moyenne           | 48h         |
| Contenu dangereux (espèces protégées GPS visible) | 🔴 Critique          | 2h          |
| Contenu illégal                                   | 🔴 Critique + Police | 1h          |

### File modération (queue)

Filtres :

- Urgence (critique/haute/moyenne/basse)
- Nb signalements (1, 2-5, 5+, 10+)
- Utilisateur signalé (récidive : 2+ signalements antérieurs)
- Type contenu (post, comment, profil)
- Statut (nouveau, en cours, résolu)
- Date

### Actions modération

| Action                               | Effet                                    |
| ------------------------------------ | ---------------------------------------- |
| Supprimer post                       | Soft delete + notif auteur               |
| Masquer post (shadow)                | Visible auteur seulement, retiré du feed |
| Avertir utilisateur                  | Notif + comptage warnings                |
| Suspendre compte                     | 7/30 jours configurable                  |
| Bannir compte                        | Définitif + IP block                     |
| Demander review humaine              | Escalade vers Super Admin                |
| Marquer faux positif                 | Apprentissage filtre auto                |
| Forcer édition (description, espèce) | Modal édition côté admin                 |

### Automatisations futures (Phase 2 admin)

| Détection        | Approche                                               | Risque faux positif |
| ---------------- | ------------------------------------------------------ | ------------------- |
| Spam             | Patterns texte + fréquence                             | Moyen               |
| Uploads suspects | Hash images + dimensions                               | Bas                 |
| Bots             | Heuristique comportement (vitesse signup, taux upload) | Moyen               |
| Multi-comptes    | Fingerprint device + IP + patterns                     | Haut                |
| NSFW dans photos | Modèle ML externe (Modération API)                     | Bas                 |

⚠️ **Phase 1 admin = modération MANUELLE** (volume bas, qualité prime).
Phase 2 = automatisations seulement si volume > 50 signalements/sem.

---

## Module 4 — Analytics & métriques

### Acquisition

| Métrique                     | Description                              | Source                          |
| ---------------------------- | ---------------------------------------- | ------------------------------- |
| Source users                 | Beta key batch, waitlist, direct (futur) | `beta_signup_log`               |
| Conversion landing → signup  | % visiteurs landing → signup             | Web analytics (Plausible/Umami) |
| Conversion waitlist → signup | Time-to-signup post-invitation           | `waitlist` + `auth.users`       |

### Activation

| Métrique                        | Cible MVP | Source                          |
| ------------------------------- | --------- | ------------------------------- |
| Onboarding terminé (4/4 étapes) | > 80%     | `profiles.username IS NOT NULL` |
| Première observation < 7j       | > 50%     | `posts` first                   |
| Premier follow < 14j            | > 30%     | `follows` first                 |
| Première réaction < 7j          | > 60%     | `reactions` first               |

### Rétention (cohortes)

```
Tableau cohort visuel :

Cohort   | J1  | J7  | J30 | J90
S1       | 90% | 60% | 40% | 25%
S2       | 85% | 55% | 35% | -
S3       | ...
```

Code couleur :

- > 50% J7 : 🟢
- 30-50% : 🟡
- < 30% : 🔴

### Engagement

| Métrique                       | Période |
| ------------------------------ | ------- |
| DAU / MAU ratio                | Hebdo   |
| Sessions par user actif        | Hebdo   |
| Temps moyen session            | Hebdo   |
| Posts par user actif / semaine | Hebdo   |
| Réactions données / post       | Mensuel |

### Métriques produit

**Feed** :

- Vues totales feed
- Scroll depth moyen
- Posts lus / session
- Taux clic sur post

**Observations** :

- Volume créé / jour
- Distribution géographique (carte)
- % avec espèce identifiée
- % photos par observation

**Onboarding** :

- Drop-off par étape (1→2, 2→3, 3→4)
- Temps moyen par étape
- Sources d'abandon (back button, exit modal, timeout)

**Fonctionnalités** :

- Heatmap usage features
- Features inutilisées (< 5% users)
- Top features (par usage)

### Métriques business futures

- Coût infra / user actif
- LTV (lifetime value, post-monétisation)
- Conversion premium (si applicable)

---

## Module 5 — Beta management

> **Lié à** [`BETA_CLOSED_ACCESS_STRATEGY.md`](BETA_CLOSED_ACCESS_STRATEGY.md)

### Sous-module : Gestion clés d'accès

- Liste clés (filtres : batch, status, expirée, utilisée)
- Bouton "Générer X clés" (batch automatique)
- Export CSV pour envoi emails
- Désactivation manuelle / extension expiration

### Sous-module : Gestion vagues

- Vue chronologique (S1, S2, S3, ...)
- Status par vague (active, terminée, GO/NO-GO)
- KPIs par cohorte (rétention, engagement)
- Décision GO/NO-GO formalisée (bouton + notes)

### Sous-module : Suivi testeurs

- Liste testeurs actifs / inactifs
- Feedback hebdo (lien Tally)
- Bugs remontés (par testeur)
- Notes admin par testeur

### Sous-module : Waitlist

- Liste demandes (date, email, motivation)
- Priorités (par profil)
- Bouton "Inviter ces X personnes" (génère clés + envoie emails)

---

## Module 6 — Sécurité & conformité

### Surveillance temps réel

| Événement                                   | Source                   | Alerte                |
| ------------------------------------------- | ------------------------ | --------------------- |
| Connexions suspectes (login pays différent) | `auth.sessions` + IP     | Email admin           |
| Tentatives brute-force                      | `beta_signup_log` failed | Email + auto-block IP |
| Spam burst (10+ posts en 1h)                | `posts` count par user   | Email                 |
| Abus API (rate limit dépassé)               | Edge Function logs       | Slack                 |
| Uploads suspects (taille anormale)          | `media` stats            | Email                 |
| Multi-comptes (même fingerprint)            | Custom detector          | Email                 |

### RGPD / Loi 25

| Action                        | Module concerné               |
| ----------------------------- | ----------------------------- |
| Exports données utilisateur   | Module Utilisateurs > Fiche   |
| Suppressions / anonymisations | Module Utilisateurs > Actions |
| Consentements actifs          | Module Config > Consentements |
| Audit logs accès admin        | Module Logs                   |
| Cron J+30 anonymisation IP    | Backend (déjà actif)          |

### Permissions admin

| Rôle            | Permissions                                                   |
| --------------- | ------------------------------------------------------------- |
| **Super Admin** | Tout (rôle de Nicolas)                                        |
| **Modérateur**  | Modération + Support + Vue Users (pas d'actions destructives) |
| **Support**     | Support + Vue Users + lecture seule autres modules            |
| **Analyste**    | Analytics + Monitoring (lecture seule)                        |

⚠️ **Aucun rôle "Admin" générique** : toujours granulaire pour limiter dégâts en cas de compromission.

---

## Module 7 — Monitoring technique

### Dashboard temps réel

| Métrique            | Source             | Seuil alerte  |
| ------------------- | ------------------ | ------------- |
| Erreurs front 5xx   | Sentry (futur)     | > 5 / minute  |
| Erreurs back 5xx    | Edge Function logs | > 10 / minute |
| Erreurs auth        | `auth.audit_log`   | > 20 / heure  |
| Erreurs DB          | Postgres logs      | > 5 / heure   |
| Uploads failed      | Storage logs       | > 10%         |
| Latence API moyenne | Custom telemetry   | > 1s          |
| Temps réponse home  | RUM                | > 2s          |
| CPU Supabase        | Dashboard          | > 80%         |
| Storage Supabase    | Quota check        | > 80%         |
| Bandwidth Supabase  | Quota check        | > 80%         |

### Alerting

- **Email** : alertes critiques (24/7)
- **Slack/Discord** : alertes warning
- **In-app banner admin** : si système dégradé

### Health checks

```
[ ] Supabase DB     OK / Slow / Down
[ ] Supabase Auth   OK / Slow / Down
[ ] Supabase Storage OK / Slow / Down
[ ] Vercel Frontend OK / Slow / Down
[ ] Edge Functions  OK / Slow / Down
```

---

## Module 8 — Support & signalements

### Tickets support

Structure standard :

- ID, statut, priorité, sujet
- User concerné (lien fiche)
- Catégorie (bug, demande, question, signalement)
- Historique messages
- Tags
- Assignation (qui traite)
- SLA (temps réponse cible)

### Workflow

```
Ticket créé → Triage (auto ou manuel)
    ↓
Assigné à un agent
    ↓
En cours (réponses + investigation)
    ↓
Résolu (notif user + ticket fermé)
    OU
Escaladé (super admin requis)
```

### Bugs / Feedback

Module séparé des tickets car nature différente :

- **Bug** : doit être reproduit + corrigé (lien à `MASTER_TODO.md` T-XXX)
- **Feedback** : suggestion produit (lien à `PROJECT_MASTER.md` backlog)

---

## Module 9 — Configuration plateforme

### Paramètres modifiables sans deploy

| Paramètre                           | Type  | Effet                                   |
| ----------------------------------- | ----- | --------------------------------------- |
| `beta_accepting_signups`            | bool  | Active/désactive nouvelles inscriptions |
| `max_users_total`                   | int   | Plafond utilisateurs (Phase 1, 2)       |
| `max_upload_size_mb`                | int   | Limite upload photos                    |
| `max_observations_per_day_per_user` | int   | Anti-spam quota                         |
| `maintenance_mode`                  | bool  | Affiche page maintenance pour tous      |
| `feature_flags`                     | jsonb | Active/désactive features               |
| `global_banner_message`             | text  | Bannière info top app                   |
| `cookie_banner_version`             | int   | Force re-consentement RGPD              |

### Feature flags (futur)

Exemple :

```json
{
  "enable_comments": true,
  "enable_notebooks": false,
  "enable_dark_mode": true,
  "enable_export_pdf": false,
  "enable_share_external": true
}
```

Permet de :

- A/B tester features
- Désactiver rapidement une feature buggée
- Rollout progressif (% users)

---

## Module 10 — Logs & audit trail

### Logs admin obligatoires

Toute action admin DOIT être loggée :

| Action                         | Données loggées                         |
| ------------------------------ | --------------------------------------- |
| Connexion admin                | Qui, quand, IP, device                  |
| Modification rôle user         | Avant/après, par qui, raison            |
| Suppression contenu            | Qui, quand, raison, snapshot du contenu |
| Ban user                       | Qui, durée, raison                      |
| Export données user (RGPD)     | Qui (admin), quand, user concerné       |
| Modification config plateforme | Qui, avant/après, raison                |
| Suppression compte forcée      | Qui (admin), user, raison               |

### Historique navigation

| Quoi                      | Quand            | Qui         | Impact           |
| ------------------------- | ---------------- | ----------- | ---------------- |
| Bouton "Bannir" cliqué    | 2026-05-10 14:32 | nicolas@... | User X banni 7j  |
| Config max_upload modifié | 2026-05-10 11:00 | nicolas@... | 10 → 15 MB       |
| Export RGPD user Y        | 2026-05-09 16:15 | nicolas@... | Données envoyées |

### Recherche dans les logs

Filtres :

- Date range
- Type d'action
- Admin concerné
- User impacté
- Sévérité (critique, importante, normale)

---

# 🧱 Architecture technique recommandée

## Stack frontend admin

| Couche    | Choix                                                         | Justification                        |
| --------- | ------------------------------------------------------------- | ------------------------------------ |
| Framework | **React 19 + TypeScript + Vite**                              | Cohérent avec app publique           |
| Routing   | **React Router 7** (admin = `/admin/*`)                       | Idem                                 |
| State     | **TanStack Query** (server state) + **Zustand** (UI state)    | Server vs UI séparés                 |
| Tables    | **TanStack Table v8**                                         | Standard du marché, performant       |
| Charts    | **Recharts** ou **Tremor**                                    | Light, customisable                  |
| UI Kit    | **shadcn/ui** (composants admin) ou **réutiliser DS interne** | Décision à prendre selon DS maturité |
| Forms     | **react-hook-form + zod** (cohérent avec app)                 | DRY                                  |
| Dates     | **date-fns** ou **Day.js**                                    | Plus light que Moment                |
| Icons     | **lucide-react** (déjà dans le projet)                        | Cohérence                            |

## Stack backend

### Supabase

| Composant                  | Usage                                      |
| -------------------------- | ------------------------------------------ |
| Tables admin (8 nouvelles) | Voir architecture DB ci-dessous            |
| RLS policies role-based    | Admin / Moderator / Support / Analyst      |
| Edge Functions             | Actions complexes (bulk ban, exports)      |
| pg_cron                    | Refresh stats matérialisées                |
| Realtime                   | Notifications admin (signalements urgents) |

### Hosting

- Frontend admin : `admin.naturegraph.fr` (sous-domaine, Vercel séparé)
- Authentification : SSO via auth.naturegraph (rôle admin requis)
- **Bonne pratique** : déploiement admin **séparé** du frontend public (release indépendantes)

## Architecture DB — 8 tables

### Table `admin_users`

```sql
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,  -- 'super_admin', 'moderator', 'support', 'analyst'
  permissions JSONB NOT NULL DEFAULT '{}',  -- Granularité fine
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  CONSTRAINT valid_role CHECK (role IN ('super_admin', 'moderator', 'support', 'analyst'))
);

CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id) WHERE is_active = TRUE;
```

### Table `moderation_reports`

```sql
CREATE TABLE public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  target_type VARCHAR(20) NOT NULL,  -- 'post', 'comment', 'profile'
  target_id UUID NOT NULL,
  reason VARCHAR(50) NOT NULL,  -- 'spam', 'offensive', 'harassment', etc.
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'new',  -- 'new', 'in_review', 'resolved', 'dismissed'
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.admin_users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_target_type CHECK (target_type IN ('post', 'comment', 'profile')),
  CONSTRAINT valid_status CHECK (status IN ('new', 'in_review', 'resolved', 'dismissed')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX idx_moderation_reports_status ON public.moderation_reports(status, priority, created_at DESC);
CREATE INDEX idx_moderation_reports_target ON public.moderation_reports(target_type, target_id);
```

### Table `moderation_actions`

```sql
CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,  -- 'warn', 'suspend', 'ban', 'delete_content', 'unban', etc.
  target_user_id UUID REFERENCES auth.users(id),
  target_content_id UUID,  -- post_id, comment_id, etc.
  target_content_type VARCHAR(20),
  performed_by UUID NOT NULL REFERENCES public.admin_users(id),
  reason TEXT NOT NULL,
  duration_days INT,  -- pour suspensions
  related_report_id UUID REFERENCES public.moderation_reports(id),
  is_reversible BOOLEAN NOT NULL DEFAULT TRUE,
  reverted_at TIMESTAMPTZ,
  reverted_by UUID REFERENCES public.admin_users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_moderation_actions_target_user ON public.moderation_actions(target_user_id, created_at DESC);
CREATE INDEX idx_moderation_actions_performed_by ON public.moderation_actions(performed_by, created_at DESC);
```

### Table `admin_audit_logs`

```sql
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id),
  action VARCHAR(100) NOT NULL,  -- 'user.ban', 'config.update', 'data.export', etc.
  target_type VARCHAR(50),
  target_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,  -- Anonymisée J+90 (audit RGPD plus long que normal)
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin ON public.admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action, created_at DESC);
CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);

-- Cette table est INSERT-ONLY (immutable). RLS + triggers empêchent UPDATE/DELETE.
```

### Table `support_tickets` (déjà existe)

Existe déjà en MVP (vue plus haut). À enrichir avec :

- `priority`, `category`, `assigned_to`, `sla_due_at`

### Table `analytics_events`

```sql
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID,
  event_type VARCHAR(50) NOT NULL,  -- 'page_view', 'click', 'form_submit', 'feature_used', etc.
  event_name VARCHAR(100) NOT NULL,
  properties JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitionnement par mois (volume potentiellement gros)
CREATE INDEX idx_analytics_events_user ON public.analytics_events(user_id, occurred_at DESC);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type, occurred_at DESC);
```

⚠️ **Alternative recommandée** : utiliser **Plausible** ou **Umami** (analytics tiers RGPD-friendly) plutôt que rouler son propre analytics. Moins de dette technique.

### Table `security_events` (déjà existe partiellement)

Existe déjà (`security_audit_log`). À enrichir avec :

- `event_severity` (low, medium, high, critical)
- `auto_resolved` (bool)

### Table `platform_config`

```sql
CREATE TABLE public.platform_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.admin_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lecture publique (pour feature flags côté front)
-- Écriture admin seulement

-- Seed avec config initiale :
INSERT INTO public.platform_config (key, value, description) VALUES
('beta_accepting_signups', 'true', 'Accept new beta signups'),
('max_users_total', '50', 'Phase 1 user cap'),
('max_upload_size_mb', '10', 'Max upload size per file'),
('maintenance_mode', 'false', 'Show maintenance page to all users'),
('feature_flags', '{"comments": true, "notebooks": false}', 'Feature toggles');
```

---

# 🎨 UX Admin

## Layout desktop (cible)

```
┌─────────────────────────────────────────────────────────────────┐
│ Naturegraph Admin  | 🟢 Système OK | 👤 Nicolas | 🔔 3 alerts |⚙ │
├──────────┬──────────────────────────────────────────────────────┤
│          │ ► Dashboard                                          │
│ [Logo]   │                                                       │
│          │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│ 📊 Dash  │  │ DAU      │ │ Nouv.    │ │ Signal.  │ │ Erreurs  ││
│ 👥 Users │  │   47     │ │   12     │ │   2 🟡   │ │   0 🟢   ││
│ 🚨 Mod   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│ 📈 Anal  │                                                       │
│ 🎫 Beta  │  ┌──────────────────────────────────────────────┐    │
│ 🛡️ Sec   │  │ Activité 7 derniers jours [chart]            │    │
│ 🛠️ Mon   │  │                                              │    │
│ 💬 Supp  │  └──────────────────────────────────────────────┘    │
│ ⚙ Conf   │                                                       │
│ 📝 Logs  │  ┌────────────────────┐ ┌────────────────────────┐  │
│          │  │ Signalements rec.  │ │ Tickets support        │  │
│          │  │ - Spam x2          │ │ #42 Login bug          │  │
│          │  │ - Harcèlement x1   │ │ #41 Upload fail        │  │
│          │  └────────────────────┘ └────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────────┘
```

## Layout mobile (cible)

```
┌──────────────────────┐
│ 🟢 OK   ☰   🔔 3     │  ← Header collapsed
├──────────────────────┤
│                      │
│  DAU: 47 ↗           │  ← KPIs prioritaires
│  Signal.: 2 🟡       │
│  Erreurs: 0 🟢       │
│                      │
│ ─────────────────── │
│                      │
│ 🚨 ALERTES URGENTES  │
│ • Harcèlement (#42)  │  ← Tap → action rapide
│ • Spam burst (#41)   │
│                      │
│ ─────────────────── │
│                      │
│ [📊][👥][🚨][📈]    │  ← Bottom nav modules
└──────────────────────┘
```

## Densité d'information

| Vue                | Densité cible                                   |
| ------------------ | ----------------------------------------------- |
| Dashboard          | **Faible** (vue scan rapide)                    |
| Tables users / mod | **Haute** (50+ rows visible)                    |
| Fiche user 360°    | **Moyenne** (informations groupées par section) |
| Analytics charts   | **Moyenne** (1-2 charts par écran)              |

## Composants admin spécifiques (en plus du DS public)

| Composant                | Usage                                            |
| ------------------------ | ------------------------------------------------ |
| `<DataTable>`            | TanStack Table wrapper avec filtres + pagination |
| `<KPIBox>`               | Widget chiffre + tendance + lien action          |
| `<StatusBadge>`          | Statut user (active/banned/etc.)                 |
| `<SeverityChip>`         | Critical / High / Medium / Low                   |
| `<ActionMenu>`           | Menu actions avec confirmation                   |
| `<AuditTrailEntry>`      | Ligne d'historique format standard               |
| `<CohortMatrix>`         | Tableau cohort coloré (rétention)                |
| `<TimelineChart>`        | Recharts wrapper avec axe temps                  |
| `<UserAvatarWithStatus>` | Avatar + badge statut user                       |
| `<ConfigEditor>`         | Form JSON avec validation schema                 |

---

# 🔐 Sécurité admin

## Authentification

- **2FA obligatoire** pour tous les admins (TOTP via Supabase Auth)
- **Sessions courtes** : 24h max, renouvelable
- **IP whitelist** optionnelle (fonctionne Phase 2)
- **Audit log** de chaque login admin

## Autorisations

```
Super Admin    → Tout, sauf supprimer sa propre fiche admin
Moderator      → Modération + lecture users (pas d'actions destructives)
Support        → Lecture users + tickets + signalements
Analyst        → Analytics + monitoring (lecture seule)
```

Granularité fine via `admin_users.permissions` (JSONB) :

```json
{
  "users.read": true,
  "users.suspend": true,
  "users.ban": false,
  "users.delete": false,
  "moderation.review": true,
  "config.read": true,
  "config.write": false
}
```

## Protection actions destructives

| Action                     | Protection                                   |
| -------------------------- | -------------------------------------------- |
| Bannir compte              | Confirmation modale + saisie username target |
| Supprimer compte (RGPD)    | Confirmation + 2FA challenge + audit log     |
| Modifier rôle              | Confirmation + saisie justification          |
| Export massif données      | Limit rate + audit log + chiffrement export  |
| Modifier config plateforme | Confirmation + diff visible avant validation |

## Monitoring anomalies admin

- Alertes si :
  - 1 admin fait > 10 actions destructives en 1h
  - Connexion admin depuis nouvelle IP/pays
  - Tentative login admin sans 2FA
  - Tentative accès endpoint admin sans rôle

---

# 🗓️ Plan implémentation par phases

## Phase 0 — Pré-requis (avant tout dev admin)

- [ ] MVP consolidé (cf. CONSOLIDATION_ROADMAP)
- [ ] Beta Phase 1 démarrée (~20 users actifs)
- [ ] Premiers signalements / bugs réels remontés
- [ ] Décision : framework admin (shadcn vs DS interne)

## Phase 1 admin — MVP admin (~10 jours dev)

**Objectif** : centre de contrôle minimal mais fonctionnel.

### Modules livrés

- Module 1 : Dashboard global (10 KPIs essentiels)
- Module 2 : Gestion users (recherche + fiche + actions de base)
- Module 3 : Modération basique (signalements + suppression)
- Module 5 : Beta management (gestion clés, vagues, waitlist)
- Module 10 : Audit logs (toute action loggée)

### Stack

- Frontend séparé sous `admin.naturegraph.fr`
- 5 tables DB : `admin_users`, `moderation_reports`, `moderation_actions`, `admin_audit_logs`, `platform_config`
- Edge Functions pour actions complexes
- RLS strict role-based

### Effort estimé

- Architecture + setup : 1 jour
- Module 1 Dashboard : 2 jours
- Module 2 Users : 3 jours
- Module 3 Modération : 2 jours
- Module 5 Beta : 1 jour
- Module 10 Audit logs : 1 jour
- Tests + documentation : 1 jour

**Total Phase 1 admin** : ~11 jours dev

## Phase 2 admin — Analytics + Monitoring (~5 jours)

- Module 4 : Analytics complets (cohortes, métriques produit)
- Module 7 : Monitoring technique (alerting, health checks)
- Integration tiers : Plausible/Umami pour analytics web
- Sentry pour erreurs frontend

## Phase 3 admin — Avancé (~5 jours)

- Module 6 : Sécurité avancée (détection anomalies)
- Module 8 : Support enrichi (workflow tickets)
- Module 9 : Configuration plateforme (feature flags)
- Automatisations modération (Phase 1 du module)

## Phase 4 admin — Mobile + Scale (~5 jours)

- App mobile admin (PWA ou React Native)
- Notifications push pour alertes critiques
- Optimisations perf (gros volumes)
- Cache intelligent pour analytics lourds

**Total roadmap admin** : ~26 jours dev étalable sur ~2 mois.

---

# 🎯 Critères de succès

## Phase 1 admin

- [ ] 100% des actions admin sont loggées
- [ ] Recherche user < 1 sec sur 100 users
- [ ] Workflow signalement → résolution fonctionnel
- [ ] 0 erreur permission (RLS strict)
- [ ] Gestion clés beta utilisable (vague hebdo via UI)
- [ ] 2FA actif sur tous les comptes admin

## Phase 4 admin (objectif final)

- [ ] Admin desktop : 10 modules complets
- [ ] Admin mobile : actions essentielles
- [ ] Analytics : cohortes + funnel + rétention temps réel
- [ ] Modération : 80% des cas standards traités < 4h
- [ ] Alertes proactives sur anomalies
- [ ] Onboarding nouveau admin : 1 jour

---

# 📋 Décisions à trancher (avant implémentation)

## Q-ADM-1 : Framework UI admin

- **A** : shadcn/ui (rapide setup, lookFeel pro standard) — recommandé Phase 1
- **B** : Réutiliser DS Naturegraph (cohérence visuelle, plus de travail)
- **C** : Hybride (shadcn pour primitives admin spécifiques, DS pour le reste)

## Q-ADM-2 : Analytics — interne ou tiers ?

- **A** : Plausible/Umami (RGPD-friendly, simple, gratuit pour < 100k events/mois) — recommandé
- **B** : Roll own (table `analytics_events`, plus de contrôle, plus de dette)
- **C** : Mixed (Plausible pour web + table custom pour events produit)

## Q-ADM-3 : Déploiement admin

- **A** : Sous-domaine séparé `admin.naturegraph.fr` (Vercel séparé) — recommandé
- **B** : Route `/admin` dans app publique (couplé, déploiement lié)
- **C** : App séparée hébergée différemment

## Q-ADM-4 : Permissions granularité

- **A** : Rôles fixes (super_admin, moderator, support, analyst) — recommandé Phase 1
- **B** : Permissions JSONB granulaire (flexibilité max, plus complexe)
- **C** : Hybride : rôles par défaut + override par admin

---

# 📎 Références croisées

- `docs/CONSOLIDATION_ROADMAP.md` — Pré-requis MVP consolidé
- `docs/BETA_CLOSED_ACCESS_STRATEGY.md` — Module 5 Beta management
- `docs/AUDIT_LEGAL.md` — RGPD/Loi 25 (Module 6 conformité)
- `docs/AUDIT_SUPABASE.md` — Architecture DB existante
- `docs/MASTER_TODO.md` — Tâches admin à ajouter quand activé
- `docs/PROJECT_MASTER.md` — Source vérité globale
- `docs/AUDIT_DESIGN_SYSTEM.md` — DS à étendre pour admin
- `CLAUDE.md` — Conventions code

---

# ⚠️ Rappel statut

**Ce document est STRATÉGIQUE pour la suite.**

**Il NE doit PAS être construit tant que** :

1. Consolidation MVP terminée
2. Beta Phase 1 démarrée avec ~20 users actifs
3. Besoins admin validés par usage réel (signalements, modération nécessaire)

**Quand commencer ?** Probablement **mois 4-5** après finalisation consolidation, en parallèle du début de la beta fermée.

**Anti-pattern à éviter** : construire l'admin AVANT d'avoir des utilisateurs réels = devine les besoins, mauvaise architecture, refonte ultérieure inévitable.

---

**📌 Document de référence pour la stratégie Admin Product Control Center. À enrichir progressivement avec les retours d'usage réels, ne pas exécuter prématurément.**
