# Naturegraph — Runbook déploiement Sprint causes racines

> **Date** : 2026-05-03
> **Périmètre** : déploiement Fix #1-#5 (sprint causes racines RC-A, RC-B, RC-C)
> **Statut Git** : ✅ 5 PRs mergées, code en `main`
> **Statut Supabase** : ⏳ Migrations à appliquer (voir ci-dessous)

---

## ✅ Phase Git — TERMINÉE (exécutée par Claude)

| #                         | PR                                                                                               | Commit sur main | Statut    |
| ------------------------- | ------------------------------------------------------------------------------------------------ | --------------- | --------- |
| 1                         | [#41](https://github.com/Naturegraph/naturegraph/pull/41) fix(security): strip EXIF metadata     | `5e725e1`       | ✅ MERGED |
| 2                         | [#42](https://github.com/Naturegraph/naturegraph/pull/42) fix(security): posts_public view       | `2c4d0cc`       | ✅ MERGED |
| 3                         | [#43](https://github.com/Naturegraph/naturegraph/pull/43) fix(db): backfill saved/hidden_posts   | `090055a`       | ✅ MERGED |
| 4                         | [#44](https://github.com/Naturegraph/naturegraph/pull/44) fix(rgpd): cron J+30 anonymisation     | `01ffe8b`       | ✅ MERGED |
| 5                         | [#45](https://github.com/Naturegraph/naturegraph/pull/45) fix(rgpd): politique alignée + banners | `da6cd37`       | ✅ MERGED |
| Promote develop → staging | [#46](https://github.com/Naturegraph/naturegraph/pull/46)                                        | `001b09b`       | ✅ MERGED |
| Promote staging → main    | [#47](https://github.com/Naturegraph/naturegraph/pull/47)                                        | `4d185a5`       | ✅ MERGED |

**Validation post-merge sur main** :

- ✅ `npx tsc --noEmit` → 0 erreurs
- ✅ `npm run lint` → 0 erreurs (8 warnings fast-refresh non-bloquants pré-existants)
- ✅ `npm run build` → OK (16.36 s)

---

## ⏳ Phase Supabase — À EXÉCUTER PAR NICOLAS

> **Pourquoi pas par Claude** : la CLI Supabase n'est pas liée au projet (`supabase/config.toml` absent + token de service requis). L'application des migrations doit se faire via le Dashboard Supabase OU `supabase CLI` après `supabase login` + `supabase link`.

### Procédure pas-à-pas (dev → staging → prod)

#### Option A — Via Supabase Dashboard (recommandé pour ce sprint)

1. **Se connecter** sur https://supabase.com/dashboard
2. **Sélectionner** le projet `naturegraph-dev`
3. Ouvrir **SQL Editor** (icône terminal)
4. **Avant chaque migration** : exécuter le dump de l'état actuel (cf. ci-dessous)
5. **Coller** le contenu de chaque fichier de migration dans l'ordre, exécuter

#### Option B — Via CLI Supabase

```bash
# Une seule fois (login + lien)
npx supabase login
npx supabase link --project-ref <project-ref-dev>

# Application
npx supabase db push
```

### Ordre d'application STRICT (4 migrations)

#### Migration 1 — `20260502_settings_phase2_complete.sql`

**Statut** : créée par sprint précédent, **non appliquée** sur dev/prod.

**Pré-requis** : aucun.

**Effets** :

- Ajoute colonne `user_settings.notif_frequency`
- Crée table `support_tickets` avec RLS
- Crée table `security_audit_log` avec RLS
- Crée bucket Storage `banners` (2 MB max)

**Vérification post-application** :

```sql
-- Doit retourner les nouvelles tables
SELECT tablename FROM pg_tables
 WHERE tablename IN ('support_tickets', 'security_audit_log');

-- Doit retourner la nouvelle colonne
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'user_settings' AND column_name = 'notif_frequency';

-- Doit retourner le nouveau bucket
SELECT id FROM storage.buckets WHERE id = 'banners';
```

#### Migration 2 — `20260503_audit_log_anonymization_cron.sql` (Fix #4)

**Pré-requis** : migration 1 doit être appliquée AVANT (table `security_audit_log` doit exister).

**Effets** :

- Active extension `pg_cron` (idempotent)
- Crée fonction `public.anonymize_orphan_audit_logs()` SECURITY DEFINER
- Schedule cron job `'0 3 * * *'` (quotidien 03:00 UTC)

**Vérification post-application** :

```sql
-- Extension active
SELECT extname FROM pg_extension WHERE extname = 'pg_cron';
-- → 1 row : 'pg_cron'

-- Fonction créée
SELECT proname, prosecdef FROM pg_proc
 WHERE proname = 'anonymize_orphan_audit_logs';
-- → prosecdef = true

-- Cron planifié
SELECT jobname, schedule, active FROM cron.job
 WHERE jobname = 'anonymize_orphan_audit_logs';
-- → schedule = '0 3 * * *', active = true
```

**Test data lifecycle (manuel)** :

```sql
-- a. Insérer une row à anonymiser (orpheline > 30 jours)
INSERT INTO security_audit_log (user_id, event_type, ip_address, user_agent, metadata, created_at)
VALUES (NULL, 'account_deletion_completed', '192.168.1.1'::inet, 'Mozilla/5.0',
        '{"old_email": "test@example.com"}'::jsonb, NOW() - INTERVAL '31 days');

-- b. Lancer manuellement la fonction
SELECT public.anonymize_orphan_audit_logs();
-- → 1 (1 row anonymisée)

-- c. Vérifier l'état
SELECT ip_address, user_agent, metadata FROM security_audit_log
 WHERE created_at < NOW() - INTERVAL '30 days' AND user_id IS NULL
 ORDER BY created_at DESC LIMIT 1;
-- → ip_address = NULL, user_agent = NULL, metadata = {"anonymized": true, ...}

-- d. Re-lancer (idempotence)
SELECT public.anonymize_orphan_audit_logs();
-- → 0
```

#### Migration 3 — `20260503_backfill_saved_hidden_posts.sql` (Fix #3)

**Pré-requis** : aucun.

**⚠️ AVANT APPLICATION** : capturer l'état actuel des policies pour comparaison :

```sql
SELECT policyname, cmd, qual, with_check
  FROM pg_policies
 WHERE tablename IN ('saved_posts', 'hidden_posts')
 ORDER BY tablename, policyname;
```

Si les policies actuelles sont DIFFÉRENTES de celles définies dans la migration, **arrêter et investiguer** avant de continuer (risque de régression sécurité).

**Effets** :

- `CREATE TABLE IF NOT EXISTS saved_posts` (idempotent — no-op si existe)
- `CREATE TABLE IF NOT EXISTS hidden_posts` (idempotent)
- 4 indexes composites
- 6 policies RLS owner-only
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

**Vérification post-application** :

```sql
-- Tables présentes
SELECT tablename FROM pg_tables
 WHERE tablename IN ('saved_posts', 'hidden_posts');
-- → 2 rows

-- 4 indexes attendus
SELECT tablename, indexname FROM pg_indexes
 WHERE tablename IN ('saved_posts', 'hidden_posts')
 ORDER BY tablename, indexname;

-- 6 policies au total
SELECT tablename, COUNT(*) FROM pg_policies
 WHERE tablename IN ('saved_posts', 'hidden_posts')
 GROUP BY tablename;
-- → 3 par table

-- RLS active
SELECT tablename, rowsecurity FROM pg_tables
 WHERE tablename IN ('saved_posts', 'hidden_posts');
-- → rowsecurity = true pour les 2

-- Compteurs cohérents (nb rows ne doit pas changer)
SELECT COUNT(*) FROM saved_posts;
SELECT COUNT(*) FROM hidden_posts;
-- → identiques aux valeurs pré-migration
```

#### Migration 4 — `20260503_posts_public_view.sql` (Fix #2)

**Pré-requis** : aucun (table `posts` existe).

**Effets** :

- Crée vue `posts_public` `WITH (security_invoker = true)`
- Masque `latitude/longitude/city/region/country/location_name/location_point` quand `location_hidden=true` ET viewer ≠ auteur
- `GRANT SELECT TO authenticated, anon`

**Vérification post-application** :

```sql
-- Vue présente
SELECT viewname FROM pg_views WHERE viewname = 'posts_public';

-- security_invoker activé
SELECT relname, reloptions FROM pg_class WHERE relname = 'posts_public';
-- → reloptions doit contenir 'security_invoker=on'

-- Test masquage anonyme (utiliser SQL Editor en mode anon, ou curl avec API key anon)
-- Voir tests API ci-dessous
```

**Test API curl (à exécuter localement)** :

```bash
# Sans JWT (anonyme) — coords doivent être NULL pour posts hidden
curl -s "https://<project>.supabase.co/rest/v1/posts_public?location_hidden=eq.true&select=id,latitude,longitude,city&limit=3" \
  -H "apikey: <anon-key>" | jq

# Avec JWT auteur — doit voir ses propres coords
curl -s "https://<project>.supabase.co/rest/v1/posts_public?user_id=eq.<my-id>&location_hidden=eq.true&select=latitude,longitude&limit=3" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <my-jwt>" | jq
```

---

## 🔄 Régénération des types TypeScript

**Après** application des 4 migrations sur dev :

```bash
# Si déjà link
npx supabase gen types typescript > src/types/supabase.ts

# Sinon avec project-ref
npx supabase gen types typescript --project-id <project-ref-dev> > src/types/supabase.ts
```

Cela va ajouter les nouveaux types pour :

- `support_tickets`, `security_audit_log` tables
- `posts_public` view
- `notif_frequency` colonne

**Puis** créer un commit dédié :

```bash
git checkout -b chore/regen-supabase-types
git add src/types/supabase.ts
git commit -m "chore(types): regen supabase types after Fix #1-5 migrations"
git push -u origin chore/regen-supabase-types
gh pr create --base main --title "chore(types): regen supabase types after Fix #1-5"
```

Cela permettra de retirer plus tard les casts `any` dans `postService.ts` et `useNearbyFeed.ts` (PR de hygiène séparé).

---

## 🧪 Recette E2E manuelle (à exécuter par Nicolas)

### Setup

- Préparer 2 comptes test : `tester-A@test.com`, `tester-B@test.com`
- Avoir une photo iPhone JPEG avec EXIF GPS connue

### Flow 1 — Onboarding → Feed

- [ ] Signup avec `tester-A@test.com` → réception OTP par email
- [ ] Saisie OTP → écran onboarding 4 étapes
- [ ] Compléter les 4 étapes (intérêts, fréquence, motivations, username)
- [ ] Atterrissage sur `/home`
- [ ] ⚠️ **Vérifier en DB** : `SELECT motivations, interests FROM profiles WHERE username = 'tester_a'` → motivations probablement NULL (RC-E non résolu)
- [ ] ⚠️ **Vérifier en DB** : `SELECT notif_frequency FROM user_settings WHERE user_id = ...` → probablement NULL (RC-E non résolu)

### Flow 2 — Création observation avec photo iPhone GPS

- [ ] Cliquer "Partager une observation" depuis `/home`
- [ ] Étape 1 : ajouter la photo iPhone avec EXIF GPS
- [ ] **Cocher "Région masquée"** à l'étape 3 (si visible)
- [ ] Publier
- [ ] **Vérifier en Supabase Storage Dashboard** :
  - Aller dans bucket `post-media/<userId>/<postId>/<uuid>.jpg`
  - Télécharger le fichier
  - Lancer `exiftool <fichier>` localement → **aucune balise GPS**
- [ ] **Vérifier en DB** :
  ```sql
  SELECT id, latitude, longitude, location_hidden FROM posts WHERE user_id = '<tester-A-id>';
  ```
  → `location_hidden = true`, `latitude/longitude` floutées (~0.1° par trigger)

### Flow 3 — posts_public masque coords pour visiteurs

- [ ] Se déconnecter (ou ouvrir tab anonyme)
- [ ] Ouvrir DevTools → Network tab
- [ ] Charger `/home`
- [ ] Inspecter la requête GET vers `/rest/v1/posts_public` :
  - Le payload JSON pour les posts du tester-A (hidden) doit avoir `latitude=null, longitude=null, city=null`
- [ ] Curl direct :
  ```bash
  curl -s "https://<project>.supabase.co/rest/v1/posts_public?location_hidden=eq.true&select=id,latitude,longitude,city&limit=5" \
    -H "apikey: <anon-key>" | jq
  ```
  → Tous les `latitude/longitude/city` à `null`

### Flow 4 — Sauvegarder/désauvegarder un post

- [ ] Se connecter en `tester-A`
- [ ] Cliquer Save sur un post du feed
- [ ] **Vérifier en DB** : `SELECT * FROM saved_posts WHERE user_id = '<tester-A-id>'` → 1 row
- [ ] Aller `/profile` → onglet Inspirations → le post sauvegardé apparaît
- [ ] Cliquer Unsave → row disparaît de DB
- [ ] **Test cross-user** : se connecter en `tester-B`, vérifier qu'il ne voit pas les saves de `tester-A` :
  ```sql
  -- En tant que tester-B (RLS s'applique)
  SELECT * FROM saved_posts; -- ne doit retourner que ses propres saves
  ```

### Flow 5 — Suppression compte complète

- [ ] Connecté en `tester-A`
- [ ] Settings > Zone de danger > Supprimer mon compte
- [ ] Confirmer
- [ ] Redirection vers `/`
- [ ] **Vérifier en DB** :
  ```sql
  SELECT * FROM profiles WHERE id = '<tester-A-id>';      -- 0 rows
  SELECT * FROM posts WHERE user_id = '<tester-A-id>';    -- 0 rows
  SELECT * FROM saved_posts WHERE user_id = '<tester-A-id>'; -- 0 rows
  SELECT * FROM hidden_posts WHERE user_id = '<tester-A-id>'; -- 0 rows
  ```
- [ ] **Vérifier en Storage Dashboard** : aucun fichier sous `<tester-A-id>/` dans `avatars`, `banners`, `post-media`, `notebook-covers`, `exports`
- [ ] **Vérifier audit log** : `SELECT * FROM security_audit_log WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 1` → row avec `event_type='account_deletion_completed'` et PII présentes (anonymisation à J+30 par cron)

### Flow 6 — Cron J+30 actif (à vérifier APRÈS 24h)

- [ ] Lendemain : `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'anonymize_orphan_audit_logs') ORDER BY start_time DESC LIMIT 5;` → status = 'succeeded'
- [ ] Si tu as inséré la row test à 31 jours : vérifier qu'elle est anonymisée

---

## 📊 Verdict final

### Statut Git : ✅ READY

- 5 PRs mergées dans l'ordre exact requis
- main HEAD : `4d185a5`
- TS + Lint + Build : 0 erreur
- Aucune régression introduite

### Statut Supabase : ⏳ EN ATTENTE

- 4 migrations SQL à appliquer (procédure ci-dessus)
- Régénération `supabase.ts` post-migration
- Recette E2E à exécuter

### Verdict global : 🟠 NOT READY YET

**Le code est en production sur `main`**, mais il **référence des objets Supabase qui n'existent pas encore** (vue `posts_public`, fonction cron, table `security_audit_log`, etc.).

**⚠️ Sans application des migrations dans les 24h, le site va probablement avoir des 500 errors** sur :

- Le feed (utilise `posts_public`)
- La suppression compte (utilise bucket `banners`)
- L'invocation `useNearbyFeed`

**Action recommandée** :

1. **MAINTENANT** : appliquer les 4 migrations sur `naturegraph-prod` via Dashboard SQL Editor
2. Régénérer types + commit
3. Recette E2E sur preview Vercel main
4. Si OK : la production sera **🟢 READY**

### Reste à faire pour BETA PRIVÉE OK (cf. RELEASE_READINESS.md)

- RC-D Privacy by Design (Privacy/Legal i18n branché, cookie banner, DeleteModal username, Email OTP, Export RGPD) — 3 jours
- RC-E Onboarding persistence (motivations + notif_frequency) — 1 heure
- RLS Media/Reactions/Comments cross-user (audit P-6) — 4 heures
- Quick Wins (HEIC, sociaux, multi-obs, etc.) — 1.5 heure

---

## Annexes

### A. Liens GitHub

- main : https://github.com/Naturegraph/naturegraph/tree/main
- staging : https://github.com/Naturegraph/naturegraph/tree/staging
- develop : https://github.com/Naturegraph/naturegraph/tree/develop
- PR #41 : https://github.com/Naturegraph/naturegraph/pull/41
- PR #42 : https://github.com/Naturegraph/naturegraph/pull/42
- PR #43 : https://github.com/Naturegraph/naturegraph/pull/43
- PR #44 : https://github.com/Naturegraph/naturegraph/pull/44
- PR #45 : https://github.com/Naturegraph/naturegraph/pull/45
- PR #46 develop → staging : https://github.com/Naturegraph/naturegraph/pull/46
- PR #47 staging → main : https://github.com/Naturegraph/naturegraph/pull/47

### B. Build stats main

```
✓ built in 16.36s
Top chunks (gzip):
  - index : 90.94 KB
  - supabase : 45.88 KB
  - cta-kingfisher : 41.74 KB
  - MobileBottomNav : 38.91 KB
  - vendor : 33.74 KB
  - ContributeEncounterForm : 27.46 KB
  - i18n : 16.11 KB
  - Profile : 11.94 KB
```

### C. Documents de référence

- `docs/USER_STORIES.md` — Référentiel produit
- `docs/AUDIT_FLOWS.md` — Audit fonctionnel
- `docs/AUDIT_LEGAL.md` — Audit RGPD/Loi 25
- `docs/AUDIT_SUPABASE.md` — Audit DB
- `docs/AUDIT_PERFORMANCE.md` — Audit perf
- `docs/AUDIT_TECHNIQUE.md` — Dette technique
- `docs/SYNTHESE_AUDITS.md` — Synthèse causes racines
- `docs/RELEASE_READINESS.md` — Pré-release check
- `docs/PLAN_ACTION.md` — Plan d'action global
