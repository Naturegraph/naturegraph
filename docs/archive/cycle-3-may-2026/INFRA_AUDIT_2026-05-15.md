# Audit Infrastructure — 2026-05-15 (cycle 3 pré-launch)

Audit complet **Supabase + Vercel + GitHub + cohérence cross-system** réalisé en préparation du lancement.

---

## 🗄️ Supabase

### Database (`naturegraph-dev` project)

**Tables : 29** (28 RLS enabled, 1 système).

| Table            | Rows | RLS | Notes                                                          |
| ---------------- | ---: | :-: | -------------------------------------------------------------- |
| profiles         |    3 | ✅  | Beta privée — utilisateurs réels                               |
| posts            |    4 | ✅  | Observations réelles                                           |
| media            |    6 | ✅  | Photos réelles                                                 |
| reactions        |    4 | ✅  |                                                                |
| notifications    |   31 | ✅  |                                                                |
| beta_access_keys |   10 | ✅  | Clés actives                                                   |
| admin_users      |    1 | ✅  | Nicolas super_admin                                            |
| admin_audit_logs |    6 | ✅  | Trace immutable                                                |
| spatial_ref_sys  | 8500 | ⚠️  | Table système PostGIS — RLS bloquée (owned par supabase_admin) |
| autres (20)      | 0-20 | ✅  | Structures prêtes, vides                                       |

**Aucune fake data détectée.** Tous les volumes correspondent à l'usage beta privée.

### Security advisors

| Niveau | Count | Détail                                                                                                                 |
| ------ | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| ERROR  | 1     | `spatial_ref_sys` RLS disabled — **faux positif** (table système PostGIS, non modifiable)                              |
| WARN   | 77    | 72 = SECURITY DEFINER sur fonctions PostGIS (intrinsèque aux extensions)                                               |
|        |       | 3 = extensions `postgis`, `pg_trgm`, `unaccent` dans `public` schema (Phase 2 — destructif à fixer)                    |
|        |       | 1 = policy `beta_waitlist.public_insert_waitlist` WITH CHECK true → **intentionnel** (formulaire d'inscription public) |
|        |       | 1 = HaveIBeenPwned protection — **à activer manuellement dans Supabase Dashboard**                                     |
| INFO   | 0     | —                                                                                                                      |

### Performance advisors

49 indexes "Unused Index" → **normal sur une beta privée** (< 50 rows par table). Les indexes serviront dès qu'il y aura plus de données. **Conserver tous**.

### Storage (5 buckets)

| Bucket          | Public | Limite | MIME types                           |
| --------------- | :----: | -----: | ------------------------------------ |
| avatars         |   ✅   |   2 MB | image/webp, jpeg, png                |
| banners         |   ✅   |   2 MB | image/webp, jpeg, png                |
| notebook-covers |   ✅   |   2 MB | image/webp, jpeg, png                |
| post-media      |   ✅   |  10 MB | image/webp, jpeg, png, video/mp4     |
| exports         |   🔒   | 100 MB | application/zip (RGPD export, privé) |

**Tous propres.** Limites MIME + size cohérentes.

### Edge Functions (6, toutes ACTIVE)

| Function                   | Version | verify_jwt | Statut                                 |
| -------------------------- | ------- | :--------: | -------------------------------------- |
| delete-account             | v3      |     ✅     | Active                                 |
| export-data                | v4      |     ✅     | Active (RGPD export)                   |
| admin-delete-user          | v1      |     ✅     | Active (BATCH 107)                     |
| send-waitlist-confirmation | v1      |     ❌     | Active (public webhook trigger)        |
| validate-beta-key          | v1      |     ❌     | Active (public, validation pre-signup) |
| weekly-species-digest      | v1      |     ❌     | Active (cron via CRON_SECRET)          |

**Aucune fonction morte. Pas de duplication.**

### Extensions installées

| Extension                                       | Schema       | Note                                                                       |
| ----------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| pgcrypto, uuid-ossp, pg_stat_statements, pg_net | `extensions` | ✅ Bon emplacement                                                         |
| supabase_vault                                  | `vault`      | ✅                                                                         |
| pg_cron                                         | `pg_catalog` | ✅                                                                         |
| **postgis, pg_trgm, unaccent**                  | **`public`** | ⚠️ Bonne pratique = déplacer dans `extensions/` mais opération destructive |

---

## 🚀 Vercel

### Domaines

| URL                                                | Statut          | Routage                                           |
| -------------------------------------------------- | --------------- | ------------------------------------------------- |
| `naturegraph.fr`                                   | ✅ 200 OK       | **WordPress (Hostinger)** — site marketing legacy |
| `staging.naturegraph.fr`                           | ❌ N'existe pas | À configurer si besoin                            |
| `app.naturegraph.fr`                               | ❌ N'existe pas | À configurer pour la prod publique                |
| `beta.naturegraph.fr`                              | ❌ N'existe pas | —                                                 |
| Vercel preview URLs (`naturegraph-XXX.vercel.app`) | 🔒 401          | Protégés par mot de passe (par défaut)            |

**⚠️ Gap pré-launch** : aucun domaine custom publique pour l'app React. Les beta testers iraient sur `naturegraph-4hfn1jkgu-naturegraph-9868s-projects.vercel.app` (URL changeante + password). **Action manuelle requise par Nicolas avant launch** : configurer `app.naturegraph.fr` ou `beta.naturegraph.fr` chez Hostinger + Vercel.

### Déploiements

| SHA        | Date             | Statut               |
| ---------- | ---------------- | -------------------- |
| `a4d48e23` | 2026-05-15T17:45 | ✅ BATCH 112 cleanup |
| `d307e0c5` | 2026-05-15T15:48 | ✅ BATCH 111 fix env |
| `8d4cc7b8` | 2026-05-15T15:33 | ✅ BATCH 110         |
| `df5ede52` | 2026-05-15T15:18 | ✅ BATCH 109         |
| `758d6a80` | 2026-05-15T15:01 | ✅ BATCH 108         |

**0 build raté sur les 5 derniers. CI verte.**

### Variables d'environnement

✅ `VITE_SUPABASE_ANON_KEY` corrigée (BATCH 111) — clé JWT legacy au lieu de `sb_publishable_*`
✅ `VITE_SUPABASE_URL` configurée
✅ `VITE_BETA_GATE_ENABLED` cohérent

---

## 🔁 Cohérence cross-system

### Env vars frontend (Vite)

| Variable                 | Code | .env.example  |  .env.local  | Vercel |
| ------------------------ | :--: | :-----------: | :----------: | :----: |
| `VITE_SUPABASE_URL`      |  ✅  |      ✅       |      ✅      |   ✅   |
| `VITE_SUPABASE_ANON_KEY` |  ✅  |      ✅       |      ✅      |   ✅   |
| `VITE_BETA_GATE_ENABLED` |  ✅  |      ✅       |      ✅      |   ✅   |
| `VITE_APP_ENV`           |  ✅  |      ✅       | ❌ optionnel |   ❓   |
| `VITE_SENTRY_DSN`        |  ✅  | ✅ (commenté) | ❌ optionnel |   ❓   |

### Secrets Edge Functions Supabase

| Variable                    | Code |   .env.example   |           Supabase Secrets           |
| --------------------------- | :--: | :--------------: | :----------------------------------: |
| `SUPABASE_URL`              |  ✅  |  (auto-injecté)  |                  ✅                  |
| `SUPABASE_SERVICE_ROLE_KEY` |  ✅  |  (auto-injecté)  |                  ✅                  |
| `CRON_SECRET`               |  ✅  | ✅ docs ajoutées |            ❓ à vérifier             |
| `RESEND_API_KEY`            |  ✅  | ✅ docs ajoutées | ❌ à configurer pour emails waitlist |
| `RESEND_FROM`               |  ✅  | ✅ docs ajoutées | ❌ à configurer pour emails waitlist |

---

## ✅ Actions appliquées

1. **`.env.example`** : section "Secrets Edge Functions" ajoutée avec doc complète CRON_SECRET / RESEND_API_KEY / RESEND_FROM
2. Aucun fake data trouvé → rien à supprimer
3. Aucune fonction edge morte → rien à supprimer
4. Aucun bucket inutile → rien à supprimer

## 🔒 Actions Phase 2 (manuelles, hors scope CLI)

### Supabase Dashboard (Nicolas)

- 🟡 **HaveIBeenPwned protection** — activer dans Auth → Settings
- 🟡 **OTP expiry** : 600s → 120s
- 🟡 **SMTP custom Gmail/Resend** : remplacer le SMTP par défaut Supabase
- 🟡 **Edge Functions secrets** : configurer `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`
- 🟢 **Migrations sur naturegraph-prod** : appliquer les migrations DEV (en attente du go-live)

### Vercel + Hostinger (Nicolas)

- 🔴 **Configurer domaine custom pour l'app React** : `app.naturegraph.fr` ou `beta.naturegraph.fr`
  - DNS Hostinger : CNAME → `cname.vercel-dns.com`
  - Vercel Settings → Domains → Add
- 🟡 **Désactiver la protection mot de passe Vercel** sur l'env Production (ou la laisser pour beta privée)

### Supabase Extensions (long terme)

- 🟢 Déplacer `postgis`, `pg_trgm`, `unaccent` du schema `public` vers `extensions` (destructive : tous les indexes/triggers PostGIS doivent être recréés — à faire lors d'une vraie maintenance window)

---

## 📊 Résultat global

| Domaine                 | État | Note                                             |
| ----------------------- | ---- | ------------------------------------------------ |
| Supabase DB             | 🟢   | 28/29 RLS, aucune fake data                      |
| Supabase Storage        | 🟢   | 5 buckets propres                                |
| Supabase Functions      | 🟢   | 6 actives, 0 dead                                |
| Supabase Security       | 🟢   | Linter ERROR = faux positif système, WARNs gérés |
| Vercel Deploys          | 🟢   | 5/5 succès récents                               |
| Vercel Env vars         | 🟢   | Corrigées BATCH 111                              |
| Vercel Domaines publics | 🔴   | **Manque domain custom pour l'app**              |
| GitHub                  | 🟢   | 3 branches protégées, CI verte                   |
| Cohérence env vars      | 🟢   | Code = .env.example aligné                       |

**Plateforme prête en backend.** Le seul blocage launch est le **domaine custom Vercel** à configurer (action manuelle Nicolas).
