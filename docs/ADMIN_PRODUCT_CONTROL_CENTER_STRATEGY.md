# Naturegraph — Admin Product Control Center (MVP)

> **Version** : 2.0 — 2026-05-13 (refondu BATCH 27 — SIMPLE MVP)
> **Statut** : 🟢 **PRET A IMPLEMENTER** — pré-requis cycle 1 valides
> **Posture** : product lead + tech lead. Plan **MVP minimal mais complet** pour piloter la beta.
> **Effort total MVP** : ~3-4 jours dev (24-32h)
> **Philosophie** : 5 modules essentiels, integres dans l'app existante (pas de sous-domaine). Iteration apres usage reel.

---

## 🎯 TL;DR

**Le but** : Avoir un admin **fonctionnel et simple** pour piloter la beta fermee — pas un Salesforce.

### Ce que l'admin MVP fait

- ✅ Voir l'etat du systeme en 5 secondes (Dashboard)
- ✅ Gerer la beta : generer cles, voir vagues, gerer waitlist
- ✅ Moderer le contenu : signalements + ban/suspend basique
- ✅ Voir + agir sur les users (chercher, modifier role, suspendre)
- ✅ Tracer toute action admin (audit log immuable)

### Ce que l'admin MVP **ne fait pas** (Phase 2+)

- ❌ Analytics complexes (utiliser Supabase Dashboard pour MVP)
- ❌ Mobile dedie (mobile = vue responsive de la version desktop)
- ❌ ML / automatisations moderation
- ❌ Permissions granulaires JSONB (rôles fixes suffisent)
- ❌ 2FA (magic link Supabase suffit pour MVP, 2FA Phase 2)
- ❌ Sous-domaine separe `admin.naturegraph.fr` (route `/admin` dans l'app suffit)

---

## ✈️ Pre-flight check

| Pre-requis                                                 | Statut                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Cycle 1 livre (98/117 done)                                | 🟢 OK                                                                 |
| RLS `(SELECT auth.uid())` partout                          | 🟢 OK (BATCH 22)                                                      |
| Tables `support_tickets` + `security_audit_log` existantes | 🟢 OK                                                                 |
| Auth Supabase magic link operationnel                      | 🟢 OK                                                                 |
| Beta system prevu en parallele                             | 🟡 [`BETA_CLOSED_ACCESS_STRATEGY.md`](BETA_CLOSED_ACCESS_STRATEGY.md) |

---

# 🏛️ Philosophie MVP

## 4 Principes

### 1. **Simple > Complet**

- 5 modules essentiels, pas 10
- 1 page par module
- Actions claires, pas de "ça depend"

### 2. **Integre > Separe**

- Route `/admin/*` dans l'app existante
- Reuse du DS Naturegraph (Button, Modal, Card, Table)
- Pas de stack admin separee (cohesion + simplicite deploy)

### 3. **Actionnable > Vanity**

- Chaque KPI affiche permet une action immediate
- Pas de graphs "joli mais inutile"
- Tableaux filtrables avec actions au bout de chaque ligne

### 4. **Securise > Convivial**

- RLS strict (admin only)
- Toute action loggee dans `admin_audit_logs`
- Confirmations modales pour actions destructives
- 2FA reporte Phase 2 (acceptable pour MVP a 50 users)

---

# 🧩 Architecture MVP — 5 modules

## Module 1 — Dashboard (page `/admin`)

**Objectif** : Vue d'ensemble en 5 secondes.

### Layout (1 ecran, pas de scroll initial)

```
┌─────────────────────────────────────────────────────┐
│  🟢 Systeme OK  •  Phase 1 beta  •  23 / 50 users    │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ Users   │ │ Posts   │ │ Signal. │ │ Errors  │    │
│  │  23     │ │  47     │ │  2 🟡   │ │  0 🟢   │    │
│  │ +3 / 7j │ │ +12/ 7j │ │ → Mod.  │ │ → Mon.  │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│                                                       │
│  ┌──── Activite 7j ─────────────────────────────┐   │
│  │  [Simple chart : signups + posts par jour]    │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌── Signalements ouverts (2) ─────┐ ┌── Beta ────┐ │
│  │ • Spam x1 (post #abc, 2h)       │ │ Cles total: 30  │
│  │ • Harcelement x1 (user X, 1d)   │ │ Utilisees: 23   │
│  │ [Tout voir →]                    │ │ Disponibles: 7  │
│  └─────────────────────────────────┘ │ Waitlist: 4     │
│                                       └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

### KPIs essentiels (4 boxes)

| KPI                      | Source                                                                    | Action liee          |
| ------------------------ | ------------------------------------------------------------------------- | -------------------- |
| **Users**                | `SELECT COUNT(*) FROM profiles`                                           | → Module Users       |
| **Posts (7j)**           | `SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL '7 days'` | → Module Moderation  |
| **Signalements ouverts** | `SELECT COUNT(*) FROM moderation_reports WHERE status='new'`              | → Module Moderation  |
| **Errors**               | Sentry API (futur) ou logs Postgres                                       | → Supabase Dashboard |

### Code couleur

- 🟢 Tout OK
- 🟡 Attention (a surveiller)
- 🔴 Critique (action requise)

---

## Module 2 — Utilisateurs (`/admin/users`)

**Objectif** : Trouver + agir sur un user en < 30 sec.

### Vue liste

Tableau filtrable :

```
[Search: email/username]    [Status: tous▾]    [Role: tous▾]    [Inscrits: 30j▾]

┌──────────────────────────────────────────────────────────────────────┐
│ Avatar | Username   | Email          | Role  | Status | Inscrit |     │
├──────────────────────────────────────────────────────────────────────┤
│  👤   | @alice     | alice@...      | user  | 🟢 actif | 2j      |⋮  │
│  👤   | @bob       | bob@...        | user  | 🟡 susp. | 5j      |⋮  │
│  👤   | @nicolas   | nicolas@...    | admin | 🟢 actif | 30j     |⋮  │
└──────────────────────────────────────────────────────────────────────┘

[Pagination: 1 / 1]
```

### Actions au bout de chaque ligne (menu ⋮)

| Action                     | Effet                                  | Confirmation          |
| -------------------------- | -------------------------------------- | --------------------- |
| 👁️ Voir profil             | Page publique du profil                | Non                   |
| ✉️ Voir email              | Affiche email complet                  | Non                   |
| ⚠️ Avertir                 | Notif privee a l'user                  | Oui                   |
| ⏸️ Suspendre 7j            | Bloque login                           | Oui                   |
| 🚫 Bannir                  | Disable compte                         | Oui (saisie username) |
| 🔄 Reset onboarding        | Reaffiche onboarding au prochain login | Oui                   |
| 👑 Promouvoir admin        | role = 'admin' (Super Admin only)      | Oui (saisie raison)   |
| 🗑️ Supprimer compte (RGPD) | Hard delete via Edge Function          | Oui (2 confirmations) |

**Toutes ces actions** sont loggees dans `admin_audit_logs`.

### Fiche user 360° (page `/admin/users/:id`)

Sections :

1. **Profil** : Username, email, bio, avatar, banner, date inscription
2. **Activite** : Nb posts, commentaires, reactions, follows
3. **Historique** : Sanctions recues, logs connexion (date, IP anonymisee)
4. **Actions** : Boutons des actions ci-dessus

---

## Module 3 — Moderation (`/admin/moderation`)

**Objectif** : Traiter les signalements rapidement.

### Vue queue

```
[Status: nouveau▾]    [Priorite: tous▾]    [Type: tous▾]

┌────────────────────────────────────────────────────────────────────┐
│ ⏰ | Priorite | Type     | Signale | Par      | Raison       | ⋮ │
├────────────────────────────────────────────────────────────────────┤
│ 2h | 🔴 Haute | post     | post#7  | @alice   | Harcelement  | ⋮ │
│ 1d | 🟡 Moy.  | post     | post#3  | @bob     | Spam         | ⋮ │
│ 3d | 🟢 Bas   | comment  | cmt#12  | @charlie | Hors-sujet   | ⋮ │
└────────────────────────────────────────────────────────────────────┘
```

### Types signalements (table `moderation_reports.reason`)

| Type                    | Priorite par defaut  | SLA reponse |
| ----------------------- | -------------------- | ----------- |
| `spam`                  | 🟡 Moyenne           | 24h         |
| `offensive`             | 🟠 Haute             | 12h         |
| `harassment`            | 🔴 Critique          | 4h          |
| `wrong_info`            | 🟡 Moyenne           | 48h         |
| `protected_species_gps` | 🔴 Critique          | 2h          |
| `illegal_content`       | 🔴 Critique + Police | 1h          |

### Actions par signalement

| Action                   | Effet                         |
| ------------------------ | ----------------------------- |
| 👁️ Voir contenu          | Modal preview du post/comment |
| 🗑️ Supprimer contenu     | Soft delete + notif auteur    |
| 👻 Masquer (shadow)      | Visible auteur seulement      |
| ⚠️ Avertir auteur        | Notif + comptage warnings     |
| ⏸️ Suspendre auteur      | 7/30 jours                    |
| ✅ Marquer faux positif  | Resout sans action            |
| ⬆️ Escalader Super Admin | Notif Nicolas                 |

---

## Module 4 — Beta management (`/admin/beta`)

> **Lie a** [`BETA_CLOSED_ACCESS_STRATEGY.md`](BETA_CLOSED_ACCESS_STRATEGY.md)

**Objectif** : Piloter les vagues hebdomadaires sans toucher SQL.

### Vue d'ensemble

```
PHASE 1 — Beta fermee
Users : 23 / 50  (46%)
Status : 🟢 Accepting signups

┌──── Vague actuelle (S3) ────────────────────────┐
│  Demarree : Lundi 6 mai                          │
│  Cles emises : 10                                │
│  Utilisees : 7                                   │
│  Expirees : 0                                    │
│  Decision vendredi : GO / NO-GO                  │
└──────────────────────────────────────────────────┘

[Generer 10 nouvelles cles (vague 4)]
```

### Sous-section : Cles d'acces

```
┌──────────────────────────────────────────────────────────┐
│ Code         | Batch | Status   | Used by | Expire dans   │
├──────────────────────────────────────────────────────────┤
│ NG-XK7M-9PQ2 | 3     | ✅ used  | @alice  | -             │
│ NG-7L3F-RT8Z | 3     | 🟢 valid | -       | 5j            │
│ NG-K9JR-2BFM | 2     | 🔴 expir | -       | -1d           │
└──────────────────────────────────────────────────────────┘
```

Actions par cle :

- 🚫 Desactiver (force `is_active = FALSE`)
- ⏰ Etendre expiration (+7j)
- 📋 Copier le code

### Sous-section : Waitlist

```
┌──────────────────────────────────────────────────────┐
│ Email             | Motivation       | Inscrit | ⋮  │
├──────────────────────────────────────────────────────┤
│ jean@example.com  | "Photographe..." | 2d      | ⋮  │
│ sophie@example.com| "Etudiante eco." | 5d      | ⋮  │
└──────────────────────────────────────────────────────┘

[Inviter ces 2 personnes (genere 2 cles + envoie mails)]
```

### Sous-section : Stats signups

Resume hebdo des `beta_signup_log` :

- Total tentatives : 47
- Succes : 23 (49%)
- Echecs : 24 (51%)
  - Invalid code : 18
  - Expired : 4
  - Already used : 2

→ Permet de detecter brute force / partage de cles.

---

## Module 5 — Audit logs (`/admin/audit`)

**Objectif** : Tracabilite complete + conformite RGPD.

### Vue logs

```
[Action: tous▾]    [Admin: tous▾]    [Date: 30j▾]    [User cible:]

┌────────────────────────────────────────────────────────────────┐
│ Quand       | Admin    | Action          | Cible         | Voir│
├────────────────────────────────────────────────────────────────┤
│ il y a 2h   | nicolas  | user.ban        | @malicious_x  | →   │
│ il y a 5h   | nicolas  | content.delete  | post#42       | →   │
│ il y a 1j   | nicolas  | beta.key_gen    | batch #4      | →   │
│ il y a 2j   | nicolas  | config.update   | beta_quota    | →   │
└────────────────────────────────────────────────────────────────┘
```

### Detail d'un log (modal)

```
Action : user.ban
Quand : 2026-05-13 14:32:15
Par : nicolas@naturegraph.fr (Super Admin)
Cible : User @malicious_x (uuid: xxx-xxx)
IP admin : 192.168.x.x (anonymisee J+90)
Raison : "Spam multiple posts"
Etat avant : { is_active: TRUE, posts_count: 12 }
Etat apres : { is_active: FALSE, posts_count: 12 }
Reversible : Oui [Revert]
```

**Table `admin_audit_logs` est INSERT-ONLY** (RLS + triggers empechent UPDATE/DELETE).

---

# 🏗️ Architecture technique

## Stack (reuse de l'existant)

| Couche    | Choix                                                                                        | Justification                                           |
| --------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Framework | **React 19 + TS strict + Vite**                                                              | Coherent avec app publique                              |
| Routing   | **React Router 7** (`/admin/*`)                                                              | Idem                                                    |
| State     | **TanStack Query** (deja en place)                                                           | DRY                                                     |
| Tables    | **Composant table custom** (reuse Card + Stack du DS)                                        | Pas de TanStack Table pour MVP, simple html table       |
| UI Kit    | **DS Naturegraph** (Button, Modal, ConfirmModal slots, EmptyState, ErrorState, LoadingState) | Coherence visuelle                                      |
| Forms     | **react-hook-form + zod** (deja installes BATCH 23)                                          | DRY                                                     |
| Charts    | **Aucun chart custom MVP**                                                                   | Supabase Dashboard suffit. Phase 2 : Tremor ou Recharts |
| Icons     | **lucide-react**                                                                             | Coherence                                               |

**Aucune nouvelle dependance** pour le MVP admin.

## Architecture DB — 4 tables nouvelles

> **Note** : `support_tickets` et `security_audit_log` existent deja (cycle 1).

### Table `admin_users`

```sql
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'moderator', 'support')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

CREATE INDEX idx_admin_users_active ON public.admin_users(user_id) WHERE is_active = TRUE;

-- Seed initial : Nicolas en super_admin
-- (a executer manuellement post-deploy avec son user_id reel)
-- INSERT INTO public.admin_users (user_id, role, notes)
-- VALUES ('<NICOLAS_UUID>', 'super_admin', 'Fondateur');
```

### Table `moderation_reports`

```sql
CREATE TABLE public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'profile')),
  target_id UUID NOT NULL,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'offensive', 'harassment', 'wrong_info', 'protected_species_gps', 'illegal_content', 'other')),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'dismissed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.admin_users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_moderation_reports_status ON public.moderation_reports(status, priority, created_at DESC);
CREATE INDEX idx_moderation_reports_target ON public.moderation_reports(target_type, target_id);
```

### Table `admin_actions` (action sur user/content)

```sql
CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,  -- 'warn', 'suspend', 'ban', 'delete_content', 'unban', 'role_change', etc.
  target_user_id UUID REFERENCES auth.users(id),
  target_content_id UUID,
  target_content_type VARCHAR(20),
  performed_by UUID NOT NULL REFERENCES public.admin_users(id),
  reason TEXT NOT NULL,
  duration_days INT,
  related_report_id UUID REFERENCES public.moderation_reports(id),
  is_reversible BOOLEAN NOT NULL DEFAULT TRUE,
  reverted_at TIMESTAMPTZ,
  reverted_by UUID REFERENCES public.admin_users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_target_user ON public.admin_actions(target_user_id, created_at DESC);
CREATE INDEX idx_admin_actions_performed_by ON public.admin_actions(performed_by, created_at DESC);
```

### Table `admin_audit_logs` (IMMUTABLE)

```sql
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id),
  action VARCHAR(100) NOT NULL,  -- 'user.ban', 'content.delete', 'beta.key_gen', 'config.update', etc.
  target_type VARCHAR(50),
  target_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin ON public.admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action, created_at DESC);
CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);

-- INSERT-ONLY : aucun UPDATE/DELETE autorise
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_logs is INSERT-ONLY';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_audit_logs
  BEFORE UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();
```

### RLS Policies (pattern BATCH 22)

```sql
-- admin_users : tous admins lisent, super_admin gere
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_admin_users" ON public.admin_users
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (SELECT user_id FROM public.admin_users WHERE is_active = TRUE));

CREATE POLICY "super_admin_manage_admin_users" ON public.admin_users
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.admin_users WHERE is_active = TRUE AND role = 'super_admin'
  ));

-- moderation_reports : users peuvent INSERT (signaler), admins lisent/modifient
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_reports" ON public.moderation_reports
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = reporter_id);

CREATE POLICY "admins_manage_reports" ON public.moderation_reports
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IN (SELECT user_id FROM public.admin_users WHERE is_active = TRUE));

-- admin_actions : admins lisent/inserent
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_admin_actions" ON public.admin_actions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IN (SELECT user_id FROM public.admin_users WHERE is_active = TRUE));

-- admin_audit_logs : admins INSERT + SELECT, jamais UPDATE/DELETE (trigger)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_audit_logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (SELECT user_id FROM public.admin_users WHERE is_active = TRUE));

CREATE POLICY "admins_insert_audit_logs" ON public.admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IN (SELECT user_id FROM public.admin_users WHERE is_active = TRUE));
```

---

# 🎨 Structure code front (route /admin)

```
src/
├── pages/
│   ├── Admin/                       # ← Nouveau (MVP admin)
│   │   ├── AdminLayout.tsx          # Layout commun (sidebar + header)
│   │   ├── AdminDashboard.tsx       # Module 1
│   │   ├── AdminUsers.tsx           # Module 2 (liste)
│   │   ├── AdminUserDetail.tsx      # Fiche user 360
│   │   ├── AdminModeration.tsx      # Module 3
│   │   ├── AdminBeta.tsx            # Module 4
│   │   └── AdminAuditLogs.tsx       # Module 5
│   └── ...
├── components/
│   ├── admin/                       # ← Nouveau
│   │   ├── AdminGuard.tsx           # Wrap route /admin/* — verifie role
│   │   ├── AdminSidebar.tsx
│   │   ├── KPIBox.tsx               # KPI card avec tendance
│   │   ├── ActionMenu.tsx           # Menu actions par row
│   │   ├── ConfirmDestructive.tsx   # Modal confirmation actions critiques
│   │   └── AuditTrailEntry.tsx
│   └── ...
├── hooks/
│   ├── useIsAdmin.ts                # Verifie role en DB
│   ├── useAdminUsers.ts             # CRUD admin_users
│   ├── useModerationReports.ts      # CRUD reports
│   └── useAdminActions.ts           # Wrapper pour logger toute action
├── services/
│   └── adminService.ts              # API layer pour admin
└── schemas/
    └── admin.ts                     # zod schemas admin (deja prepare T-068)
```

### Garde route

```typescript
// src/components/admin/AdminGuard.tsx
import { Navigate } from 'react-router-dom'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { LoadingState } from '@/components/ui'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useIsAdmin()
  if (isLoading) return <LoadingState />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
```

```typescript
// router.tsx (extrait, ajout des routes /admin/*)
{
  path: '/admin',
  element: <AdminGuard><AdminLayout /></AdminGuard>,
  children: [
    { index: true, element: <AdminDashboard /> },
    { path: 'users', element: <AdminUsers /> },
    { path: 'users/:userId', element: <AdminUserDetail /> },
    { path: 'moderation', element: <AdminModeration /> },
    { path: 'beta', element: <AdminBeta /> },
    { path: 'audit', element: <AdminAuditLogs /> },
  ],
},
```

### Pattern action admin loggee

```typescript
// hooks/useAdminActions.ts
export function useAdminAction() {
  const supabase = useSupabase()
  const { adminUser } = useIsAdmin()

  return async function performAction({
    action,
    target_type,
    target_id,
    before_state,
    after_state,
    reason,
  }: AdminActionInput) {
    // 1. Effectuer l'action (UPDATE user, DELETE post, etc.)
    // 2. Logger automatiquement
    await supabase.from('admin_audit_logs').insert({
      admin_user_id: adminUser.id,
      action,
      target_type,
      target_id,
      before_state,
      after_state,
      metadata: { reason },
    })
  }
}
```

---

# 🛡️ Sécurité MVP

## Authentification

- **Magic link Supabase** (cycle 1 livre) — pas de password
- **Session 24h max** par defaut Supabase
- **Audit log** de chaque login admin via trigger sur `auth.sessions`

## Autorisation

| Role            | Permissions                                           |
| --------------- | ----------------------------------------------------- |
| **super_admin** | Tout (Nicolas)                                        |
| **moderator**   | Moderation + lecture users + actions non-destructives |
| **support**     | Lecture users + reponse tickets                       |

Verification simple via row dans `admin_users` (pas de JSONB granulaire pour MVP).

## Protection actions destructives

| Action                | Protection                                         |
| --------------------- | -------------------------------------------------- |
| Bannir compte         | Modal confirmation + saisie username cible         |
| Supprimer compte RGPD | Modal + saisie email cible + audit log obligatoire |
| Modifier role         | Modal + saisie justification                       |
| Supprimer post        | Modal + raison                                     |

## Anti-leak admin role

- **Aucun rendu d'UI admin** cote client sans verification serveur (RLS)
- **Toutes les routes /admin/\*** appellent l'API qui re-verifie le role (defense en profondeur)
- **Pas de stockage role en localStorage** (uniquement contexte memoire)

---

# 🗓️ Plan implémentation MVP

## Effort développement par batch

| Batch        | Module              | Taches                                                                           | Effort |
| ------------ | ------------------- | -------------------------------------------------------------------------------- | ------ |
| **BATCH 34** | DB Setup            | T-300 Migration `admin_*` + `moderation_*` tables + RLS + trigger immuable audit | 4h     |
| **BATCH 35** | Route + Garde       | T-301 AdminGuard + AdminLayout + Sidebar + route `/admin`                        | 4h     |
| **BATCH 36** | Module 1 Dashboard  | T-302 AdminDashboard (4 KPIs + queries Supabase)                                 | 4h     |
| **BATCH 37** | Module 2 Users      | T-303 AdminUsers liste + AdminUserDetail fiche + 5 actions de base               | 1j     |
| **BATCH 38** | Module 3 Moderation | T-304 AdminModeration queue + actions par signalement                            | 1j     |
| **BATCH 39** | Module 4 Beta       | T-305 AdminBeta (cles + vagues + waitlist) — depend `BETA_STRATEGY`              | 1j     |
| **BATCH 40** | Module 5 Audit      | T-306 AdminAuditLogs lecture + filtres                                           | 4h     |

**Total MVP admin** : ~3-4 jours dev (24-32h)

## Pre-requis avant BATCH 34

- [ ] Decision Q-ADM-1 : route `/admin` ou sous-domaine ? **Recommandation : `/admin`** (MVP simple)
- [ ] Decision Q-ADM-2 : feature flag `is_admin_enabled` ? **Recommandation : oui** (toggle env var)
- [ ] User Nicolas declare comme super_admin (INSERT manuel apres migration)

---

# 📋 Checklist activation admin MVP

## Technique

- [ ] **T-300** Migration DB `admin_*` + `moderation_*` appliquee
- [ ] **T-301** AdminGuard fonctionnel (redirige non-admin)
- [ ] **T-302-306** 5 modules livres
- [ ] Tests E2E flow admin (login → action → audit log)
- [ ] RLS testees (non-admin doit recevoir 403 sur toutes les routes admin)

## Securite

- [ ] Action destructive sans confirmation = bug (tests E2E)
- [ ] `admin_audit_logs` immutable verifie (try UPDATE/DELETE doit fail)
- [ ] Aucune ref admin role en localStorage/sessionStorage
- [ ] Nicolas declare super_admin en DB

## Coherence visuelle

- [ ] Reuse complete DS Naturegraph (pas de classes Tailwind hardcoded)
- [ ] Adoption primitives EmptyState/ErrorState/LoadingState (BATCH 5+6+7)
- [ ] Adoption ConfirmModal slots (BATCH 8)

---

# 🎯 Critères de succès MVP

A la fin BATCH 40 :

| Critere                              | Cible | Verdict |
| ------------------------------------ | ----- | ------- |
| 5 modules accessibles via /admin/\*  | 100%  | ⬜      |
| Recherche user < 1 sec sur 100 users | < 1s  | ⬜      |
| 100% des actions admin sont loggees  | 100%  | ⬜      |
| 0 erreur permission (RLS strict)     | 0     | ⬜      |
| Generation cle beta utilisable       | OK    | ⬜      |
| Workflow signalement → resolution    | OK    | ⬜      |
| Tests E2E admin passing              | 100%  | ⬜      |

---

# 🔮 Roadmap Phase 2 admin (apres validation MVP)

> **A construire UNIQUEMENT si besoin reel** apres 50+ users actifs.

### Modules complementaires

| Module                                           | Quand l'ajouter                    |
| ------------------------------------------------ | ---------------------------------- |
| **Analytics avances** (cohortes, funnel)         | > 100 users actifs                 |
| **Monitoring technique** (graphs Sentry inline)  | Apres setup Sentry production      |
| **Sécurité enrichie** (detection anomalies auto) | Si abus detectes                   |
| **Support tickets workflow**                     | Si > 10 tickets/sem                |
| **Configuration plateforme** (feature flags UI)  | Si A/B testing necessaire          |
| **Mobile dedie**                                 | Si admin mobile devient blocant    |
| **2FA TOTP**                                     | Phase 2 (apres > 100 users)        |
| **Permissions granulaires JSONB**                | Si > 3 admins actifs               |
| **Notifications push admin**                     | Si reaction temps reel critique    |
| **App mobile PWA**                               | Phase 3 (apres ouverture publique) |

### Estimation effort Phase 2

| Phase                                               | Effort | Quand                               |
| --------------------------------------------------- | ------ | ----------------------------------- |
| Phase 2 admin (analytics + monitoring)              | ~5j    | Apres validation MVP + 1 mois usage |
| Phase 3 admin (securite + support enrichi + config) | ~5j    | Apres scale 100+ users              |
| Phase 4 admin (mobile + scale + automations)        | ~5j    | Apres go-live public                |

**Total Phase 2-4** : ~15 jours dev etalable sur 2-3 mois selon besoins reels.

---

# 📎 Références croisées

- [`STATUS_2026-05-13.md`](STATUS_2026-05-13.md) — etat technique cycle 1
- [`MASTER_TODO.md`](MASTER_TODO.md) — taches restantes
- [`BETA_CLOSED_ACCESS_STRATEGY.md`](BETA_CLOSED_ACCESS_STRATEGY.md) — Module 4 du admin (gestion beta)
- [`PATTERN_TYPE_CASTS.md`](PATTERN_TYPE_CASTS.md) — convention `as unknown as` pour les rows admin
- [`backend/database-architecture.md`](backend/database-architecture.md) — schema DB existant

---

# 📜 Historique versions

- **v2.0** (2026-05-13) — Refondu post cycle 1. **MVP simple en 5 modules** (vs 10 en v1.0). Effort divise par 3 (3-4j vs 11j). Route `/admin` integree (pas de sous-domaine). Reuse DS. 4 tables DB (vs 8). Pas de 2FA / Tremor / TanStack Table. Roadmap Phase 2-4 clair pour iteration future.
- **v1.0** (2026-05-04) — Version strategique complete (10 modules, app separee, 26 jours dev, 8 tables). Trop ambitieux pour MVP — refondu.

---

**📌 Document operationnel pret pour activation. MVP admin implementable en ~3-4 jours dev. Iteration Phase 2-4 quand besoin reel valide par usage.**
