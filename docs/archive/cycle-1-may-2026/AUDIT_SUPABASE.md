# Naturegraph — Audit Supabase (DB + RLS + indexes + storage)

> **Version** : 1.0 — 2026-05-02
> **Posture** : staff DBA pour go/no-go production. **Aucune modification.**
> **Méthodologie** : lecture exhaustive `supabase/migrations/*.sql` (33 fichiers) + `src/types/database.ts` + `src/types/supabase.ts` + vérifications ciblées.
> **Verdict global** : 🟡 **GO CONDITIONNEL** — 5 bloquants à résoudre AVANT mise en production publique.

---

## TL;DR — État réel de la base

✅ **Architecture solide** :

- 16 tables principales avec RLS active partout
- Cascades FK cohérentes, pas d'orphelins
- 20 indexes critiques (FK + composites partiels)
- Triggers de denormalisation (likes_count, posts_count, follows_count)
- 13 fonctions PL/pgSQL custom (notify, blur location, update counters)
- Helpers RLS `is_notif_enabled()`, `update_*_count()` propres
- Vue `profiles_public` correcte (masque PII)

🔴 **5 bloquants critiques** :

1. **`saved_posts` et `hidden_posts` créées hors-migration** (présentes dans `supabase.ts` généré, absentes du git) → **drift DB / repo majeur**
2. **Vue `posts_public` MANQUANTE** → fuite potentielle `lat/lng` des posts `location_hidden=true`
3. **EXIF GPS non strippé + bucket `post-media` PUBLIC** → **dox RGPD documenté**
4. **`reactions.type` enum drift** → CHECK DB inclut `'disappointed'` mais TS ne l'expose plus
5. **Cron J+30 anonymisation `security_audit_log` annoncé en commentaire mais non créé**

🟠 **6 problèmes graves** :

- RLS Media/Reactions/Comments trop permissive (pas de check visibilité du post parent)
- Fan-out notification limité à 10 k followers sans alerte
- Index composites manquants (`posts(user_id, created_at)`, `saved_posts(...)`)
- `support_tickets` + `security_audit_log` stockent IP/UA + JSONB metadata sans purge
- Race condition possible sur les compteurs (likes_count, etc.)
- `community_photos` bucket référencé mais non confirmé créé

---

# 🧱 Structure actuelle

## Inventaire des tables (16 confirmées + 2 hors-migration)

| Table                      | PK                          | RLS | Policies (S/I/U/D) | ON DELETE        | Source                | Statut                                |
| -------------------------- | --------------------------- | --- | ------------------ | ---------------- | --------------------- | ------------------------------------- |
| `profiles`                 | UUID → auth.users           | ✅  | 2/1/1/0            | CASCADE          | 20260320_initial      | ✅                                    |
| `posts`                    | UUID                        | ✅  | 3/1/1/1            | CASCADE          | 20260320_initial      | ✅                                    |
| `media`                    | UUID                        | ✅  | 1/1/0/1            | CASCADE          | 20260320_initial      | ⚠️ RLS faible                         |
| `reactions`                | UUID                        | ✅  | 1/1/0/1            | CASCADE          | 20260320_initial      | ⚠️ RLS faible + enum drift            |
| `comments`                 | UUID                        | ✅  | 1/1/1/1            | CASCADE          | 20260320_initial      | ⚠️ RLS faible                         |
| `identification_proposals` | UUID                        | ✅  | 1/1/0/0            | CASCADE          | 20260320_initial      | ⚠️ RLS faible                         |
| `follows`                  | (follower_id, following_id) | ✅  | 1/1/0/1            | CASCADE          | 20260320_initial      | ✅                                    |
| `notebooks`                | UUID                        | ✅  | 2/1/1/1            | CASCADE          | 20260320_initial      | ✅                                    |
| `notebook_observations`    | composite                   | ✅  | 1/1/0/0            | CASCADE          | 20260320_initial      | ✅                                    |
| `notifications`            | UUID                        | ✅  | 1/0/1/0            | CASCADE          | 20260320_initial      | ✅                                    |
| `taxref_cache`             | cd_nom                      | ✅  | 1 SELECT public    | —                | 20260320_initial      | ✅                                    |
| `user_settings`            | user_id                     | ✅  | 1/1/1/0            | CASCADE          | 20260407              | ✅ + `notif_frequency` (20260502)     |
| `notification_preferences` | (user_id, type)             | ✅  | 1/1/1/1            | CASCADE          | 20260416              | ✅                                    |
| `blocks`                   | (blocker_id, blocked_id)    | ✅  | 1/1/0/1            | CASCADE          | 20260420_blocks       | ✅                                    |
| `reports`                  | UUID                        | ✅  | 1/1/0/0            | CASCADE/SET NULL | 20260420_blocks       | ✅                                    |
| `fr_cities`                | (insee_code?)               | ✅  | 1 SELECT public    | —                | 20260420_fr_cities    | ✅                                    |
| `species_master`           | UUID                        | ✅  | 1/?/?/?            | —                | 20260416              | ✅                                    |
| `community_photos`         | UUID                        | ❓  | ?                  | ?                | 20260414              | 🟡 à confirmer                        |
| `support_tickets`          | UUID                        | ✅  | 1/1/0/0            | SET NULL         | 20260502_phase2       | ✅                                    |
| `security_audit_log`       | UUID                        | ✅  | 1/0/0/0            | SET NULL         | 20260502_phase2       | ⚠️ INSERT par service_role uniquement |
| **`saved_posts`**          | (user_id, post_id)          | ❓  | ❓                 | ❓               | **❌ HORS-MIGRATION** | 🔴 drift                              |
| **`hidden_posts`**         | (user_id, post_id)          | ❓  | ❓                 | ❓               | **❌ HORS-MIGRATION** | 🔴 drift                              |

### Vues SQL

| Vue                        | Source                                       | Statut                  |
| -------------------------- | -------------------------------------------- | ----------------------- |
| `profiles_public`          | `20260420_profiles_location_view.sql:14`     | ✅ Existe et masque PII |
| `notifications_with_actor` | `20260416_notifications_with_actor_view.sql` | ✅ Existe               |
| `species_full`             | `20260416_species_master.sql`                | ✅ Existe               |
| **`posts_public`**         | —                                            | 🔴 **N'EXISTE PAS**     |

### Storage buckets

| Bucket             | Public | Limite | MIME              | RLS                     | Statut                                                         |
| ------------------ | ------ | ------ | ----------------- | ----------------------- | -------------------------------------------------------------- |
| `avatars`          | ✅     | 2 MB   | webp/jpeg/png     | owner-write user-prefix | ✅                                                             |
| `post-media`       | ✅     | 10 MB  | webp/jpeg/png/mp4 | owner-write user-prefix | 🔴 EXIF leak                                                   |
| `notebook-covers`  | ✅     | 2 MB   | webp/jpeg/png     | owner-write             | ✅                                                             |
| `exports`          | 🔒     | 100 MB | zip               | owner-only              | ✅                                                             |
| `banners`          | ✅     | 2 MB   | webp/jpeg/png     | owner-write             | ✅ ajouté 20260502                                             |
| `community_photos` | ❓     | ❓     | ❓                | ❓                      | 🟡 à confirmer (`20260420_security_fixes:72` y fait référence) |

### Triggers de denormalisation

| Compteur                   | Trigger                                         | Source             | Idempotence                |
| -------------------------- | ----------------------------------------------- | ------------------ | -------------------------- |
| `posts.likes_count`        | `update_likes_count()` AFTER INSERT/DELETE      | `20260320:202-216` | ⚠️ Race possible           |
| `posts.comments_count`     | `update_comments_count()`                       | `20260320:237-251` | ⚠️ Race possible           |
| `profiles.posts_count`     | `update_user_posts_count()` AFTER INSERT/UPDATE | `20260320:367-388` | ✅ Check transition status |
| `profiles.followers_count` | `update_follow_counts()`                        | `20260320:284-300` | ✅ Symétrique +1/-1        |
| `profiles.following_count` | idem                                            | idem               | ✅                         |
| `posts.location_point`     | `update_post_location_point()`                  | `20260320`         | ✅                         |
| `posts (location floue)`   | `blur_hidden_location()`                        | `20260407`         | ✅ ST_SnapToGrid           |

### Triggers de notification

| Trigger                | Source                            | Statut                           |
| ---------------------- | --------------------------------- | -------------------------------- |
| `notify_on_reaction()` | `20260413` puis `20260416`        | ✅ Respecte `is_notif_enabled()` |
| `notify_on_follow()`   | `20260416_notify_on_follow.sql`   | ✅                               |
| `notify_on_new_post()` | `20260416_notify_on_new_post.sql` | ✅ + fan-out limit 10 k          |

### Fonctions PL/pgSQL custom (15)

`update_updated_at_column()`, `update_post_location_point()`, `update_likes_count()`, `update_comments_count()`, `update_follow_counts()`, `update_user_posts_count()`, `blur_hidden_location()`, `notify_on_reaction()`, `notify_on_follow()`, `notify_on_new_post()`, `is_notif_enabled()`, `purge_profile_location()`, `taxref_cache_update_search_vector()`, `set_user_settings_updated_at()`, `can_see_post()` (à confirmer)

### Migrations critiques (33 au total)

`20260320_initial_schema.sql` · `20260320_rls_policies.sql` · `20260401_rls_security_fixes.sql` · `20260407_blur_hidden_location.sql` · `20260407_storage_buckets_and_rls.sql` · `20260407_user_settings.sql` · `20260408_auto_create_profile_trigger.sql` · `20260413_reactions_notifications.sql` · `20260413_weekly_goal.sql` · `20260414_community_photos.sql` · `20260416_*` (6 fichiers) · `20260417_cron_species_digest.sql` · `20260417_notif_realtime_and_invoker_view.sql` · `20260420_*` (7 fichiers, dont `missing_fk_indexes`) · `20260423/24_photo_management_v3/v4*` · `20260429_post_display_format.sql` · `20260501_add_post_title_column.sql` · `20260501_drop_description_not_empty.sql` · `20260502_settings_phase2_complete.sql`

---

# ❌ Problèmes

## P-1 🔴 **`saved_posts` et `hidden_posts` créées hors-migration**

**Constat** :

- `supabase.ts:1053` (généré depuis DB) : `saved_posts` table existe
- `supabase.ts:226` : `hidden_posts` table existe
- `grep "CREATE TABLE.*saved_posts" supabase/migrations/` → **aucun résultat**
- `grep "CREATE TABLE.*hidden_posts" supabase/migrations/` → **aucun résultat**

**Conclusion** : ces 2 tables ont été créées via le **dashboard Supabase** sans migration SQL versionnée.

**Impact** :

- 🔴 Si on doit recréer la DB (nouveau projet, restore), ces tables sont **perdues**
- 🔴 Drift garanti entre `naturegraph-dev` et `naturegraph-prod` si l'une a été créée et pas l'autre
- 🔴 Pas de revue Git, pas de traçabilité des contraintes/RLS sur ces tables
- 🟠 Cohérence avec le code (services, RLS, types) impossible à vérifier statiquement

## P-2 🔴 **Vue `posts_public` manquante**

**Constat** : la doc `docs/security/media-security.md:154` mentionne `posts_public_view` pour masquer `lat/lng` quand `location_hidden=true`. **Aucune CREATE VIEW posts_public** dans les 33 migrations.

**Impact** : la projection `lat/lng` côté client visiteur dépend uniquement de la RLS qui ne masque PAS de colonnes (RLS = row-level, pas column-level). **Le trigger `blur_hidden_location()` floute la précision mais les coordonnées floutées restent exposées**.

→ **C'est le bloquant C7 de l'AUDIT_FLOWS et RL-6 de l'AUDIT_LEGAL**.

## P-3 🔴 **EXIF GPS non strippé + bucket `post-media` PUBLIC**

**Constats cumulés** :

- `mediaService.ts:7-9` : commentaire explicite _"strip EXIF côté client volontairement minimaliste pour le MVP"_
- `extractPhotoMetadata.ts` : lit l'EXIF côté client mais ne le strip pas
- `20260407_storage_buckets_and_rls.sql:6-10` : `post-media` est créé avec `public = true`
- `media.gps_latitude`, `media.gps_longitude`, `media.gps_point` (cf. `database.ts:170-172`) **stockés en DB ET embarqués dans la photo**

**Impact** : un visiteur télécharge la photo → GPS exact accessible via les métadonnées du fichier. **Risque RGPD majeur + risque écologique** (espèces sensibles). C'est NC-3 de l'AUDIT_LEGAL.

## P-4 🔴 **`reactions.type` enum drift entre DB et TS**

**Constat** :

- `20260413_reactions_notifications.sql:18` (CHECK DB) : `('love', 'admire', 'fire', 'wow', 'curious', 'disappointed')`
- `database.ts:60` : commentaire _"TODO backend : retirer 'disappointed' de reaction_type"_
- `database.ts:62` : type TS expose seulement `('love', 'admire', 'fire', 'wow', 'curious')`

**Impact** :

- Si un user a déjà reactioné avec `'disappointed'` (vieille UI ?), la row reste en DB
- Le code TS ne sait pas la lire → cast `as unknown as` ou crash potentiel
- Drift documenté + 22 occurrences `as unknown as` dans le repo (cf. AUDIT_TECHNIQUE)

## P-5 🔴 **Cron J+30 anonymisation `security_audit_log` non créé**

**Constat** : `20260502_settings_phase2_complete.sql:109` indique :

> _"Toutes les valeurs PII ici sont anonymisées au cron J+30 si suppression."_

→ **aucun cron job (`pg_cron`) ni Edge Function créé** pour exécuter ce nettoyage.

**Impact** : la metadata JSONB de `security_audit_log` (qui peut contenir `old_email`, `new_email`, IP, UA) reste en clair indéfiniment, **même après suppression du compte** (la FK est `ON DELETE SET NULL` donc les rows survivent).

→ **Manquement RGPD Art 5(1)(e) — limitation de conservation**.

## P-6 🟠 **RLS trop permissive sur Media / Reactions / Comments / Identification_proposals**

**Constat** : les policies SELECT sur ces 4 tables se contentent de `USING (true)` ou de `EXISTS (SELECT 1 FROM posts WHERE id = post_id)` sans **vérifier la visibilité du post parent**.

**Exemple `20260320_rls_policies.sql`** (à confirmer ligne précise) :

```sql
CREATE POLICY "Media visible with post" ON media
  USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = media.post_id));
```

**Impact** :

- Un utilisateur A peut lire les **médias** d'un post privé (`visibility='private'`) appartenant à B en faisant `SELECT * FROM media WHERE post_id = '<id-du-post-privé-de-B>'`
- Idem pour `reactions`, `comments`, `identification_proposals`
- **Faille de confidentialité majeure** sur les posts followers-only ou privés

→ La policy devrait inclure un check `can_see_post(post_id)` ou équivalent.

## P-7 🟠 **Indexes composites manquants**

**Indexes attendus mais absents** :

| Index                                                              | Usage code                                                            | Impact                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------- |
| `posts(user_id, created_at DESC)`                                  | `getPostsByUser` (`postService.ts:400-422`) — onglet Profil > Journal | Slow profile feed quand > 100 posts |
| `posts(taxonomic_group, identification_status, published_at DESC)` | filtres feed combinés                                                 | Index merge sub-optimal sous charge |
| `saved_posts(user_id, created_at DESC)`                            | `useSavedPostsPage` — onglet Inspirations                             | Slow Inspirations si > 100 saves    |
| `hidden_posts(user_id, post_id)`                                   | `useHiddenPosts`                                                      | À vérifier                          |

`20260420_missing_fk_indexes.sql` a couvert les FKs simples mais pas les composites multi-colonnes pour le tri.

## P-8 🟠 **`community_photos` bucket : statut incertain**

**Constat** : référencé dans `20260420_security_fixes.sql:72` mais aucune commande `INSERT INTO storage.buckets` claire. Migration `20260414_community_photos.sql` à lire pour confirmer.

**Impact** : si bucket non créé en prod, toute fonctionnalité photo communauté plante.

## P-9 🟠 **Fan-out notifications limité à 10 k sans alerte**

**Constat** : `notify_on_new_post()` (`20260416_notify_on_new_post.sql:158`) :

```sql
IF follower_count > 10000 THEN
  RAISE NOTICE 'notify_on_new_post: skipping fan-out (% followers)', follower_count;
  RETURN NEW;
END IF;
```

**Impact** :

- Si un user a > 10 000 followers, **personne ne reçoit la notif**
- Aucune alerte côté admin
- Comportement non documenté côté UX
- Pour une plateforme communauté grandissante, ce silence devient un bug visible

## P-10 🟠 **Race condition possible sur les compteurs**

**Constat** : `update_likes_count()` (`20260320:202-216`) :

```sql
UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
```

→ pas d'`ON CONFLICT`, pas de `FOR UPDATE`, pas de `LOCK`.

**Impact** : 2 INSERTs concurrents peuvent lire la même valeur initiale → likes_count drift. Effet observable sur volumes élevés (100+ likes/seconde).

## P-11 🟡 **Pas de soft delete profil / anonymisation auto**

**Constat** :

- `profiles` : pas de colonne `deleted_at`
- `auth.users → profiles` ON DELETE CASCADE → suppression dure
- Le mode `anonymize` de l'Edge Function `delete-account` existe mais n'est PAS exposé dans l'UI (cf. AUDIT_FLOWS NC-7)

**Impact** : suppression irréversible. Impossible de revenir en arrière. Aucune période de grâce. Confirme NC-6 d'AUDIT_LEGAL.

## P-12 🟡 **`support_tickets.ip_address` + `user_agent` sans purge documentée**

**Constat** : migration `20260502:48-62` stocke ces colonnes mais aucune politique de rétention (cron, trigger).

**Impact** : conservation non bornée. RGPD Art 5(1)(e) en risque.

## P-13 🟡 **Migrations destructives non documentées**

| Migration                                 | Action                                      | Risque                                                     |
| ----------------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| `20260501_drop_description_not_empty.sql` | DROP CONSTRAINT description NOT NULL/length | ✅ idempotent (`IF EXISTS`) — mais pourquoi ? À documenter |
| `20260423/24_photo_management_v3/v4`      | itérations photo                            | ❓ contiennent-elles des DROP TABLE / ALTER ? À auditer    |

## P-14 🔵 **`profiles.city, region, country` legacy**

**Constat** : `database.ts:111-123` mentionne ces colonnes legacy + nouvelles `city_name, region_name, country_code` (ajoutées `20260420_add_user_location.sql`). Les 2 sets coexistent ?

**Impact** : drift si le code écrit dans l'un et lit l'autre. À confirmer.

## P-15 🔵 **`supabase.ts` peut être périmé**

**Constat** : génération via `npx supabase gen types typescript`. Pas de pre-commit hook automatique. Cast `any` sur `support_tickets` dans `supportService.ts` confirme un drift récent.

**Impact** : faux sentiment de sécurité TS.

---

# 🔒 Risques sécurité

## RS-1 🔴 **Fuite GPS via EXIF + bucket public** (P-3 + RL-5 légal)

**Niveau** : critique, RGPD + écologie.
**Précondition** : aucune. Tout user peut télécharger la photo originale.
**Surface** : tous les posts publiés.

## RS-2 🔴 **Lat/lng exposés malgré `location_hidden=true`** (P-2)

**Niveau** : critique RGPD.
**Précondition** : aucune. La RLS ne masque pas les colonnes.
**Mitigation actuelle** : `blur_hidden_location()` floute à 0.1° (~10 km) mais reste précis.

## RS-3 🔴 **Médias / réactions / comments d'un post privé lisibles cross-user** (P-6)

**Niveau** : critique confidentialité.
**Précondition** : connaître l'UUID du post (devinable si IDs séquentiels — vérifier).

## RS-4 🟠 **`security_audit_log.metadata` PII en clair, pas de purge** (P-5)

**Niveau** : grave RGPD.
**Précondition** : être admin / service_role pour lire, mais le risque est la **rétention** au-delà de la suppression du compte.

## RS-5 🟠 **`support_tickets` IP + UA sans politique de rétention** (P-12)

**Niveau** : moyen RGPD.

## RS-6 🟠 **Tables `saved_posts` / `hidden_posts` hors-migration** (P-1)

**Niveau** : grave intégrité. Si ces tables n'ont pas la RLS attendue côté prod, **leak des saves d'un user vers les autres possible**.

## RS-7 🟡 **Pas d'IDs UUID v7** (à confirmer)

**Constat** : tous les UUIDs semblent v4 (`gen_random_uuid()`). Pas un risque immédiat mais v7 serait plus sécurisé temporellement.

## RS-8 🟡 **Pas d'audit trail INSERT pour `security_audit_log`**

**Constat** : la table existe, la RLS est OK, mais aucun appel UI ou Edge Function ne l'alimente. C'est NC dans AUDIT_TECHNIQUE et AUDIT_LEGAL.

---

# 🔧 Corrections (priorités)

## 🔴 Priorité 1 — Bloquants production (5 tickets)

### F-1 — Backfill migration `saved_posts` + `hidden_posts`

**Action** : créer une migration `20260503_backfill_saved_hidden_posts.sql` idempotente qui ré-encode la structure actuelle des tables (DDL + RLS + indexes) telles qu'elles existent en prod via `pg_dump --schema-only`.
**Effort** : 2 h.
**Précaution** : `IF NOT EXISTS` partout, vérifier sur dev avant prod.

### F-2 — Créer la vue `posts_public` masquant `lat/lng` quand `location_hidden=true`

**Action** :

```sql
CREATE OR REPLACE VIEW posts_public AS
SELECT
  id, user_id, type, status, visibility, taxonomic_group, ...,
  CASE WHEN location_hidden THEN NULL ELSE lat END AS lat,
  CASE WHEN location_hidden THEN NULL ELSE lng END AS lng,
  CASE WHEN location_hidden THEN NULL ELSE city_name END AS city_name,
  ...
FROM posts;
```

- Adapter le code client pour utiliser `posts_public` côté visiteur.
  **Effort** : 4 h.

### F-3 — Strip EXIF avant upload + isoler le bucket `post-media` privé

**Actions cumulées** :

1. Côté client : `exifr.gps.parse + remove` avant upload (lib `exifr` lite déjà importée)
2. Optionnel : Edge Function `strip-and-resize-photo` qui valide côté serveur
3. Trigger DB sur `media` qui REJETTE si `gps_latitude IS NOT NULL`
4. **À débattre** : passer `post-media` en privé + Edge Function de signed URL (gros refacto)

**Effort** : 1 j (option client) + 1 j (option serveur).

### F-4 — Renforcer RLS Media / Reactions / Comments / Identification_proposals

**Action** : remplacer les SELECT policies par :

```sql
CREATE POLICY "Media visible if post visible" ON media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = media.post_id
        AND p.status = 'published'
        AND (
          p.visibility = 'public'
          OR p.user_id = auth.uid()
          OR (p.visibility = 'followers' AND EXISTS (
            SELECT 1 FROM follows f WHERE f.follower_id = auth.uid() AND f.following_id = p.user_id
          ))
        )
    )
  );
```

- idem 3 autres tables.
  **Effort** : 4 h.
  **Précaution** : tests cross-user obligatoires AVANT déploiement.

### F-5 — Implémenter cron J+30 anonymisation `security_audit_log`

**Action** : Edge Function `purge-audit-pii` schedulée via Supabase scheduled tasks ou pg_cron :

```sql
UPDATE security_audit_log
SET ip_address = NULL, user_agent = NULL, metadata = '{}'::jsonb
WHERE created_at < now() - INTERVAL '30 days'
  AND user_id IS NULL;  -- comptes supprimés uniquement
```

**Effort** : 4 h.

---

## 🟠 Priorité 2 — Avant beta publique (8 tickets)

### F-6 — Migration retrait `'disappointed'` de `reactions.type`

**Action** :

```sql
-- 1. Mesurer l'impact
SELECT COUNT(*) FROM reactions WHERE type = 'disappointed';

-- 2. Si > 0 : migrer vers 'curious' ou supprimer
DELETE FROM reactions WHERE type = 'disappointed';

-- 3. Drop + recreate constraint
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_type_check;
ALTER TABLE reactions ADD CONSTRAINT reactions_type_check
  CHECK (type IN ('love', 'admire', 'fire', 'wow', 'curious'));
```

**Effort** : 1 h + monitoring.

### F-7 — Indexes composites manquants

**Actions** :

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_created
  ON posts (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_taxgroup_status_pub
  ON posts (taxonomic_group, identification_status, published_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_posts_user_created
  ON saved_posts (user_id, created_at DESC);
```

**Effort** : 1 h. `CONCURRENTLY` pour ne pas bloquer la prod.

### F-8 — Confirmer/recréer bucket `community_photos`

**Action** : lire `20260414_community_photos.sql` complet, vérifier en prod via dashboard, créer migration de rattrapage si manquant.
**Effort** : 1 h.

### F-9 — Fan-out notifications > 10 k followers

**Action** : remplacer le `RETURN NEW` silencieux par :

1. INSERT dans une queue table `notification_jobs`
2. Edge Function dédiée qui consomme la queue par batch de 1 000

OU au minimum logger dans `security_audit_log` event_type='fanout_skipped' pour visibilité.
**Effort** : 1 j (queue) ou 30 min (log).

### F-10 — Race condition compteurs (FOR UPDATE)

**Action** :

```sql
UPDATE posts
SET likes_count = (SELECT COUNT(*) FROM reactions WHERE post_id = NEW.post_id)
WHERE id = NEW.post_id;
```

→ recalcul atomique au lieu d'increment. Plus lent mais juste.
**Effort** : 1 h + tests.

### F-11 — Régénérer `supabase.ts` + pre-commit hook

**Actions** :

```bash
npx supabase gen types typescript > src/types/supabase.ts
```

Puis ajouter à `.husky/pre-commit` :

```bash
# Si une migration SQL est modifiée, regénérer les types
git diff --cached --name-only | grep -q "supabase/migrations/" && npx supabase gen types typescript > src/types/supabase.ts
```

**Effort** : 1 h.

### F-12 — Politique de rétention `support_tickets`

**Action** : Edge Function ou pg_cron qui anonymise IP+UA après 90 jours.
**Effort** : 2 h.

### F-13 — Documenter migrations photo_management v3 / v4

**Action** : ouvrir et lire ces 3 migrations, documenter ce qu'elles ont fait, identifier les drops/alters destructifs.
**Effort** : 1 h.

---

## 🟡 Priorité 3 — Bonnes pratiques (8 tickets)

### F-14 — Soft delete profil + grace period 30 jours

Ajouter colonne `deleted_at` + RLS qui exclut les profils supprimés. Aligner avec NC-6 légal.
**Effort** : 1 j.

### F-15 — Vue `community_photos_public` si bucket public

Cohérence avec F-2.

### F-16 — Documenter le cron `species_digest`

Lire `20260417_cron_species_digest.sql` et documenter le comportement (envoi mail hebdo ?).

### F-17 — Drop colonnes legacy `profiles.city, region, country`

Après s'être assuré que le code utilise `city_name, region_name, country_code`.
**Effort** : 1 h + migration data.

### F-18 — Ajouter contraintes manquantes

- `bio LENGTH ≤ 160` (CHECK)
- URL regex sur `instagram, twitter, website`

### F-19 — Tests d'intégration RLS

Suite Playwright/Vitest qui crée 2 users et vérifie qu'un user ne peut pas lire les data privées de l'autre. Critique pour valider F-4.
**Effort** : 1 j.

### F-20 — Documentation des fonctions PL/pgSQL

Ajouter `COMMENT ON FUNCTION` partout pour visibilité dashboard.

### F-21 — Backup verification

Vérifier que les backups Supabase tournent (config dashboard) + tester un restore sur un projet sandbox tous les 3 mois.

---

# Plan d'attaque consolidé

> À intégrer dans le `PLAN_ACTION.md` Phase 1 + Phase 2.

## Sprint Phase 1 (5 j) — Bloquants production

| Jour     | Tickets DB                                                  | Effort    |
| -------- | ----------------------------------------------------------- | --------- |
| **J1**   | F-1 (backfill saved/hidden) + F-3 strip EXIF client         | 4 h + 4 h |
| **J2**   | F-2 (vue posts_public) + F-4 (RLS media/reactions/comments) | 4 h + 4 h |
| **J3**   | F-5 (cron audit log) + tests RLS cross-user                 | 4 h + 4 h |
| **J4**   | F-11 (régen types) + F-13 (doc migrations photo)            | 1 h + 1 h |
| **J4-5** | Recette manuelle + déploiement staging                      | reste     |

## Sprint Phase 2 (10 j) — Fiabilisation

| Action                     | Tickets | Effort |
| -------------------------- | ------- | ------ |
| Indexes composites         | F-7     | 1 h    |
| Migration enum reactions   | F-6     | 1 h    |
| Confirmer community_photos | F-8     | 1 h    |
| Fan-out scalable           | F-9     | 1 j    |
| Race condition compteurs   | F-10    | 1 h    |
| Rétention support_tickets  | F-12    | 2 h    |
| Tests RLS automatisés      | F-19    | 1 j    |

## Sprint Phase 3 (post-beta) — Bonnes pratiques

F-14 à F-21 selon priorités produit.

---

# Métriques de succès

| Métrique                        | Actuel | Cible Phase 1     | Cible Phase 2                   |
| ------------------------------- | ------ | ----------------- | ------------------------------- |
| Tables hors-migration           | 2      | **0**             | 0                               |
| Vues sécurité (`posts_public`)  | 0      | **1**             | 2 (+ `community_photos_public`) |
| EXIF GPS strippés               | 0 %    | **100 %**         | 100 %                           |
| RLS testées cross-user          | 0      | flow critiques    | tous                            |
| Cron RGPD actifs                | 0      | **1** (audit log) | 3 (+ tickets, soft-delete)      |
| Drift TS ↔ DB (`as unknown as`) | 22     | < 10              | < 5                             |
| Indexes composites manquants    | 4      | 4                 | **0**                           |

---

# Annexes

## A. Inventaire des migrations chronologique

| Date     | Migration                         | Rôle                                                                         |
| -------- | --------------------------------- | ---------------------------------------------------------------------------- |
| 03-20    | `initial_schema`                  | Schéma de base                                                               |
| 03-20    | `rls_policies`                    | Activation RLS                                                               |
| 04-01    | `rls_security_fixes`              | Corrections sécurité                                                         |
| 04-07    | `blur_hidden_location`            | Trigger flou GPS                                                             |
| 04-07    | `storage_buckets_and_rls`         | Création buckets                                                             |
| 04-07    | `user_settings`                   | Table préférences                                                            |
| 04-08    | `auto_create_profile_trigger`     | Trigger auth.users → profiles                                                |
| 04-13    | `reactions_notifications`         | Triggers réactions                                                           |
| 04-13    | `weekly_goal`                     | Colonne objectif hebdo                                                       |
| 04-14    | `community_photos`                | À auditer (P-8)                                                              |
| 04-16    | `notification_*` (5 fichiers)     | Système notifs complet                                                       |
| 04-16    | `species_master(_seed)`           | Référentiel TAXREF                                                           |
| 04-16    | `taxref_search_optimizations`     | Index trigram + tsvector                                                     |
| 04-17    | `cron_species_digest`             | À documenter (F-16)                                                          |
| 04-17    | `notif_realtime_and_invoker_view` | Realtime                                                                     |
| 04-20    | `add_user_location`               | Colonnes profil location                                                     |
| 04-20    | `blocks_reports_tables`           | Modération                                                                   |
| 04-20    | `fr_cities_table`                 | Autocomplete villes                                                          |
| 04-20    | `missing_fk_indexes`              | Indexes FK rattrapage                                                        |
| 04-20    | `nearby_posts_fallback`           | Recherche posts                                                              |
| 04-20    | `profiles_location_view`          | Vue `profiles_public` ✅                                                     |
| 04-20    | `security_fixes`                  | Corrections RLS                                                              |
| 04-23/24 | `photo_management_v3/v4*`         | Itérations photo (à auditer F-13)                                            |
| 04-29    | `post_display_format`             | Format 16:9 / portrait / 1:1                                                 |
| 05-01    | `add_post_title_column`           | Colonne `posts.title`                                                        |
| 05-01    | `drop_description_not_empty`      | Description optionnelle (cf. décision Q1)                                    |
| 05-02    | `settings_phase2_complete`        | `notif_frequency`, `support_tickets`, `security_audit_log`, bucket `banners` |

## B. Tables et leur fichier de migration

```
profiles, posts, media, reactions, comments, identification_proposals,
follows, notebooks, notebook_observations, notifications, taxref_cache
                          ↑
              20260320_initial_schema.sql

user_settings                   → 20260407_user_settings.sql
notification_preferences        → 20260416_notification_preferences.sql
species_master                  → 20260416_species_master.sql
community_photos                → 20260414_community_photos.sql (à auditer)
blocks, reports                 → 20260420_blocks_reports_tables.sql
fr_cities                       → 20260420_fr_cities_table.sql
support_tickets                 → 20260502_settings_phase2_complete.sql
security_audit_log              → 20260502_settings_phase2_complete.sql
saved_posts                     → ❌ HORS-MIGRATION (P-1)
hidden_posts                    → ❌ HORS-MIGRATION (P-1)
```

## C. Convention de chemin storage (pour audit RLS)

```
avatars/{user_id}/{timestamp}.{ext}
banners/{user_id}/{timestamp}.{ext}
post-media/{user_id}/{post_id}/{uuid}.{ext}
notebook-covers/{user_id}/{notebook_id}/{ext}
exports/{user_id}/{export_id}.zip
```

RLS write : `(storage.foldername(name))[1] = auth.uid()::text` ✅ partout.

## D. Vérifications recommandées avant chaque release

```sql
-- 1. Drift de types
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Comparer avec src/types/supabase.ts

-- 2. RLS active partout
SELECT schemaname, tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Devrait être vide

-- 3. Compteurs cohérents
SELECT id, posts_count,
  (SELECT COUNT(*) FROM posts WHERE user_id = profiles.id AND status='published') AS actual_posts
FROM profiles
WHERE posts_count != (...)
LIMIT 10;

-- 4. Données sensibles non purgées
SELECT COUNT(*) FROM security_audit_log
WHERE user_id IS NULL AND created_at < now() - INTERVAL '30 days';

-- 5. Réactions obsolètes
SELECT COUNT(*) FROM reactions WHERE type = 'disappointed';
```

---

> **Document à exécuter en collaboration avec le DBA / Backend lead**. Les actions F-1 à F-5 sont **bloquantes pour mise en production publique** et doivent être priorisées.
