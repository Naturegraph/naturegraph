# Audit Supabase — BATCH 84 (2026-05-15)

> Statut : optimisations appliquées sur dev. À reproduire sur prod via la migration `20260515_audit_perf_optim.sql`.

## Méthode

Audit via `supabase_advisor` (security + performance) + inspection manuelle des tables, RLS policies, edge functions, storage buckets, migrations.

## Synthèse advisors

### Security (78 lints — la plupart faux positifs)

| Lint                                                 | Level | Count | Verdict                                                                                                                                   |
| ---------------------------------------------------- | ----- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `rls_disabled_in_public spatial_ref_sys`             | ERROR | 1     | ❌ Faux positif — table système PostGIS (`spatial_ref_sys`), pas applicable                                                               |
| `anon_security_definer_function_executable`          | WARN  | 36    | ❌ Faux positif — RPCs publiques contrôlées (check_beta_access_key_validity, is_admin, etc.). Toutes vérifient les permissions en interne |
| `authenticated_security_definer_function_executable` | WARN  | 36    | ❌ Idem                                                                                                                                   |
| `extension_in_public` (postgis, unaccent, pg_trgm)   | WARN  | 3     | ⏳ À traiter plus tard — déplacement lourd, faible impact                                                                                 |
| `rls_policy_always_true beta_waitlist INSERT`        | WARN  | 1     | ✅ Voulu — waitlist publique                                                                                                              |
| `auth_leaked_password_protection`                    | WARN  | 1     | 🔧 **À activer Dashboard** (HaveIBeenPwned)                                                                                               |

### Performance (avant BATCH 84)

| Lint                           | Count | Statut après fix                                         |
| ------------------------------ | ----- | -------------------------------------------------------- |
| `unindexed_foreign_keys`       | 10    | ✅ **Tous fixés** (+ 2 détectés au scan suivant)         |
| `unused_index`                 | 30    | ✅ 9 drops (vrais doublons) + 21 conservés (utiles prod) |
| `multiple_permissive_policies` | 15    | ✅ **Tous fusionnés** (4 tables consolidées)             |

## Actions appliquées (BATCH 84)

### 1. Indexes FK ajoutés (12 au total)

```sql
admin_actions(related_report_id, reverted_by)
admin_users(created_by)
admin_audit_logs(admin_user_id)
beta_access_keys(created_by, used_by_user_id)
beta_signup_log(user_id)
beta_waitlist(invited_with_key_id)
hidden_posts(post_id)
moderation_reports(assigned_to, reporter_id, resolved_by)
```

Tous en `WHERE col IS NOT NULL` quand la colonne est nullable (partial index).

### 2. Indexes morts droppés (9)

```sql
idx_hidden_posts_user_hidden       -- PK composite couvre
idx_hidden_posts_post_id           -- doublon
idx_reactions_user_id              -- PK composite couvre déjà (user_id, post_id)
idx_reports_status                 -- doublon de idx_reports_status_pending
idx_admin_audit_logs_admin/action/target  -- 3 indexes peu pertinents
idx_blocks_blocked_id              -- non utilisé
idx_notebook_obs_notebook_id       -- non utilisé
```

### 3. RLS policies consolidées (15 → 0 warnings)

Multiple permissive policies fusionnées via `OR` pour réduire le coût SELECT :

**Avant :**

- `profiles` : 2 policies SELECT distinctes
- `posts` : 3 policies SELECT distinctes
- `notebooks` : 2 policies SELECT distinctes
- `moderation_reports` : 3 policies (admins_manage_reports FOR ALL + 2 per-action)

**Après :**

- `Profiles read access` : public OU own
- `Posts read access` : own OU public published OU followers-only
- `Notebooks read access` : own OU public
- `moderation_reports_read/insert/admin_update/admin_delete` : 4 policies explicites per-action

## Storage buckets — RAS

| Bucket          | Public      | Limit | Allowed MIME      | Statut |
| --------------- | ----------- | ----- | ----------------- | ------ |
| avatars         | yes         | 2MB   | webp/jpeg/png     | ✅     |
| post-media      | yes         | 10MB  | webp/jpeg/png/mp4 | ✅     |
| notebook-covers | yes         | 2MB   | webp/jpeg/png     | ✅     |
| banners         | yes         | 2MB   | jpeg/png/webp     | ✅     |
| exports         | **private** | 100MB | zip               | ✅     |

## Edge functions — 5 actives

| Slug                         | Version | verify_jwt | Statut                                  |
| ---------------------------- | ------- | ---------- | --------------------------------------- |
| `delete-account`             | 3       | yes        | ✅ BATCH 78 fix CodeQL                  |
| `export-data`                | 4       | yes        | ✅ BATCH 78 fix CodeQL                  |
| `validate-beta-key`          | 1       | no         | ✅                                      |
| `weekly-species-digest`      | 1       | no         | ✅                                      |
| `send-waitlist-confirmation` | 1       | no         | ✅ BATCH 77 (en attente RESEND_API_KEY) |

## Migrations — 58 migrations, ordre cohérent

Pas de doublons détectés. Chronologie respectée (20260320 → 20260515).

## Actions Nicolas (Dashboard manuel)

1. **Activer HaveIBeenPwned** : Dashboard → Authentication → Policies → activer "Leaked password protection"
2. **Configurer RESEND_API_KEY** (cf. `docs/EMAIL_TEMPLATES_SETUP.md`)
3. **Configurer SMTP custom** (cf. même doc)
4. **OTP expiry** : 600s → 120s

## Actions prod après merge main

```sql
-- Appliquer dans l'ordre :
psql $PROD_URL < supabase/migrations/20260515_internal_users_invisibility.sql
psql $PROD_URL < supabase/migrations/20260515_audit_perf_optim.sql
```

Puis créer le compte admin sur prod (cf. `docs/SECURITY_HARDENING.md` §6).

## Pas modifié (volontairement)

Indexes conservés bien que "unused" actuellement car **dev DB encore vide** mais essentiels en prod :

- `idx_posts_*` (filtre type/published_at/country/habitat/location/species)
- `idx_media_*` (cover, watermark_pending, species, series)
- `idx_profiles_email/country/location_gist/subscription/is_internal_false`
- `idx_taxref_*`, `idx_species_master_*`, `idx_fr_cities_*` (lookup)
- `idx_community_photos_active`, `idx_support_tickets_*`, `idx_security_audit_log_*`

Ces indexes deviendront "used" dès que la prod aura des données et trafic.
