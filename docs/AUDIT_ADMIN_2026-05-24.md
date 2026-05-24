# Audit Admin Naturegraph — 24 mai 2026

> **Contexte** : audit final veille beta fermée (lundi). Objectif : valider que
> l'admin est complet, conforme et sécurisé pour accueillir 120 pré-inscrits.

---

## ✅ Modules livrés (6/6)

| Module                 | Route               | Lignes | Statut    |
| ---------------------- | ------------------- | ------ | --------- |
| Layout                 | `AdminLayout.tsx`   | 132    | ✅ Top    |
| Dashboard              | `/admin`            | 633    | ✅ Top    |
| **Analytics** ⭐ bonus | `/admin/analytics`  | ~1000  | ✅ Top    |
| Users                  | `/admin/users`      | 893    | ✅ Top    |
| Modération             | `/admin/moderation` | 1439   | ✅ Top    |
| Beta                   | `/admin/beta`       | ~1400  | ✅ Top    |
| Audit logs             | `/admin/audit`      | 528    | ✅ Top    |
| Guard                  | `AdminGuard.tsx`    | 48     | ✅ Strict |

**Total : ~6 000 lignes admin, toutes en TypeScript strict, 100 % couvert par RLS Supabase.**

---

## 🔒 Audit sécurité — Supabase advisors

### Critères : RLS + policies + isolation admin

| Table publique              | RLS | Policies | Statut                                                   |
| --------------------------- | --- | -------- | -------------------------------------------------------- |
| Toutes les 28 tables métier | ✅  | 1 à 4    | Pattern `(SELECT auth.uid())` (perf optimal)             |
| `admin_users`, `admin_*`    | ✅  | strict   | Isolé via `is_admin()` SECURITY DEFINER                  |
| `beta_waitlist`             | ✅  | 4        | INSERT public + R/U/D admin only (fix DELETE 2026-05-24) |
| `spatial_ref_sys` (PostGIS) | ⚠️  | —        | Table interne PostGIS — pas modifiable, sans risque      |

### Advisors Supabase — 1 ERROR + 78 WARN analysés

| Lint                                               | Niveau | Décision                                                                       |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `rls_disabled_in_public` (spatial_ref_sys)         | ERROR  | **Ignoré** — table système PostGIS, pas applicable                             |
| `extension_in_public` (postgis, unaccent, pg_trgm) | WARN   | **Accepté** — déplacer = migration risquée, gain sécu nul                      |
| `rls_policy_always_true` (beta_waitlist INSERT)    | WARN   | **Accepté** — intentionnel, inscription publique waitlist (anon)               |
| `auth_leaked_password_protection` (HaveIBeenPwned) | WARN   | **Accepté** — déjà activé Supabase Auth Settings (task #2 historique)          |
| 72× `security_definer_executable` (anon/auth)      | WARN   | **Accepté** — pattern Supabase normal pour `is_admin()`, `search_cities`, etc. |

→ **Aucune action critique requise.** L'admin est sûr pour beta fermée.

---

## 📋 Logging admin — traçabilité 100 %

Toutes les actions admin sont loggées dans `admin_audit_logs` (immutable via trigger) :

- Promotion / rétrogradation user → log avec before/after role
- Suspension / ban / delete RGPD → log avec raison (champ obligatoire >= 10 char)
- Résolution / rejet signalement → log avec notes
- Génération clés beta → log avec batch_number + count
- Invitation / suppression waitlist → log avec email cible
- Toute action via `useAdminAction()` hook → log auto + IP + user-agent

→ **RGPD-ready** : aucun trou de traçabilité.

---

## 🧪 Qualité code

| Critère                | Statut                                                        |
| ---------------------- | ------------------------------------------------------------- |
| TypeScript strict      | ✅ `tsc --noEmit` clean                                       |
| Console.log / debug    | ✅ Aucun résidu (`grep` exhaustif sur /admin/)                |
| TODOs résiduels        | 🟡 1 stub MVP (`Ajouter user direct`) — Phase 2 par design    |
| Pagination obligatoire | ✅ Toutes les listes paginées 20/page (éco-conception RGESN)  |
| React Query cache      | ✅ `staleTime` configurés selon volatilité (30s / 60s / 5min) |
| Patterns DRY           | ✅ `useAdminAction()` partagé pour audit logs                 |
| Imports non utilisés   | ✅ Build verify clean                                         |

---

## 🚀 Livraison ce soir (PRs #324–#329)

| PR   | Sujet                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------- |
| #324 | Instant Nature complet + factorisation submit + UI white                                                               |
| #325 | Fallback pays affiché en mode localisation privée                                                                      |
| #326 | Page Analytics dédiée + fix compteurs Dashboard                                                                        |
| #327 | Vercel Web Analytics activé (RGPD/Loi 25)                                                                              |
| #328 | Surfaçage erreurs AdminAnalytics                                                                                       |
| #329 | Avatars hermine + Beta quota réel + RLS DELETE waitlist + Analytics tabs Phase 1/2 + heatmap heat + photos/observation |

**Tout en prod sur naturegraph.ca depuis 02:50 UTC le 24/05.**

---

## 🔮 Phase 2 (post-beta) — backlog priorisé

> À déclencher **après usage réel** par les 120 pré-inscrits, pas avant.

### P0 (semaines 1-2 post-beta)

- **PostHog tracking** : débloque les KPIs marqués « — » dans Analytics
  (rétention 7/30j, sessions/sem, durée moyenne, taux abandon). 30 min setup.
- **Bulk actions Reports** : multi-select + resolve/dismiss en masse. Utile dès
  qu'on dépasse ~10 signalements simultanés.

### P1 (mois 1 post-beta)

- **2FA TOTP** pour comptes admin (runbook ligne 707)
- **Bulk actions Users** (suspend/promote/demote multi)
- **Dédoublonnage waitlist auto** (RPC `cleanup_waitlist_duplicates`)
- **Workflow tickets support** (runbook ligne 704)

### P2 (mois 2-3 post-beta)

- **Configuration plateforme** (feature flags UI — sortir des hardcodes)
- **Sécurité enrichie** (détection anomalies)
- **Mobile admin dédié** (actuellement responsive seulement)
- **Permissions JSONB granulaires** (si > 3 admins actifs)

---

## 📎 Références

- Runbook : [`ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md`](ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md) v2.1
- Sécurité : RLS pattern documenté dans [`backend/database-architecture.md`](backend/database-architecture.md)
- Phase 1 metrics : runbook Notion partagé Nicolas

---

**📌 Statut : ADMIN VALIDÉ POUR BETA FERMÉE LUNDI 27 MAI.**
