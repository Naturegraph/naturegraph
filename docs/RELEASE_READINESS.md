# Naturegraph — Release Readiness Check

> **Date** : 2026-05-03
> **Posture** : strict, honnête, lucide. Pas de complaisance.
> **Limite méthodologique** : validation statique du code uniquement. Je n'ai pas accès à l'environnement Supabase réel ni aux navigateurs des testeurs. Les vérifications "🟠 À SURVEILLER" listent ce qui doit être fait par toi avant beta.
> **Verdict en bas de page**.

---

## État actuel — Snapshot

| Élément                                           | Statut                                   |
| ------------------------------------------------- | ---------------------------------------- |
| **Code des 5 fixes**                              | ✅ Écrit, validé TS+Lint+Build           |
| **PRs créées**                                    | ✅ #41, #42, #43, #44, #45 (toutes OPEN) |
| **PRs mergées en `develop`**                      | ❌ **0/5**                               |
| **Migrations SQL appliquées sur dev**             | ❌ Non appliquées                        |
| **Migrations SQL appliquées sur prod**            | ❌ Non appliquées                        |
| **`supabase.ts` régénéré post-migrations**        | ❌ Non régénéré (casts `any` actifs)     |
| **Recette E2E manuelle Fix #1-#5**                | ❌ Non exécutée                          |
| **Tests E2E automatisés**                         | ❌ Aucun (Playwright pas en place)       |
| **Causes racines résolues côté code**             | 3/5 (RC-A, RC-B, RC-C)                   |
| **Causes racines résolues côté UI/produit**       | 0/2 (RC-D, RC-E pas démarrées)           |
| **Migration `20260502_settings_phase2_complete`** | ❌ Toujours pas appliquée                |

---

# 1. Flows complets End-to-End

## 1.1 Onboarding → Feed

### 🔴 BLOQUANT — RC-E non résolu

**`onboarding/index.tsx:88-105`** : l'`upsert profile` final écrit uniquement `username` et `interests`. Les champs **`motivations` et `notif_frequency` collectés aux étapes 2-3 sont jetés**.

→ Un beta-tester remplit 4 étapes en pensant configurer ses préférences. Rien n'est sauvegardé. Il ne reçoit jamais le digest hebdo qu'il a demandé. **Trahison de la promesse produit**.

**Impact RGPD** : Art 5(1)(a) loyauté.

### 🟠 À SURVEILLER

- **A11Y multi-select** intérêts : `role="group"` + `aria-pressed` à confirmer
- **Étapes step indicator** : pas d'`aria-current="step"` (cf. AUDIT_FLOWS A1, A7)
- **Username race condition** non gérée (audit I8)

## 1.2 Création observation nature (3 étapes)

### 🟢 OK — Le flow fonctionnel marche

Steps 1, 2, 3 + publication via `createPost` + upload media OK.

### 🟢 OK — Strip EXIF (Fix #1, PR #41)

Si PR #41 mergée, EXIF est strippé sur toutes les photos uploadées.

### 🟠 À SURVEILLER

- **Description optionnelle** (décision Q1 MVP) — comportement actuel conforme, mais à monitorer le taux de complétion via analytics
- **HEIC mismatch** : Quick Win QW1 reverté lors du switch en mode multi-agent → l'UI accepte toujours `image/heic` qui sera rejeté à l'upload Supabase. **À traiter en sprint hors causes racines** (cf. PLAN_ACTION).
- **Multi-observation** : section "Bientôt" toujours visible (Quick Win QW6 non appliqué)
- **Toggle ID help** : toujours visible (Quick Win QW6 non appliqué)
- **Compression image client** : absente (audit I2 / Phase 2)

## 1.3 Upload image

### 🟢 OK (si Fix #1 mergé) — EXIF strippé sur 3 buckets

`mediaService.uploadAvatar`, `mediaService.uploadPostMedia`, `storageService.uploadImage` (avatars + banners) → tous strippés.

### 🟠 À SURVEILLER

- **Photos historiques** uploadées avant Fix #1 contiennent encore EXIF GPS → migration storage à prévoir (hors scope)
- **Compression / WebP** absente → uploads de 10 MB possibles
- **Pas de spinner** pendant l'upload (UX 4G dégradée)

## 1.4 Sauvegarde / unsave post

### 🟢 OK fonctionnel

`useToggleSavedPost` + `savedPostsService` opérationnels.

### 🔴 BLOQUANT — Si migration Fix #3 pas appliquée

Si la migration `20260503_backfill_saved_hidden_posts.sql` n'est pas appliquée et que la table `saved_posts` est en réalité différente de la définition Git (ex: policy RLS différente), comportement imprévisible.

**Action obligatoire** : dump policies actuelles avant l'application (cf. PR #43).

## 1.5 Suppression compte complète

### 🟢 OK (si Fix #5 mergé)

- Politique alignée sur "suppression immédiate"
- Bucket `banners` ajouté à la liste de nettoyage
- Try/catch par bucket pour résilience

### 🔴 BLOQUANT — DeleteAccountModal sans double confirmation

**Audit AUDIT_FLOWS C3 + AUDIT_LEGAL NC-6** : la modal a un simple bouton "Confirmer" sans saisie du username. Risque de **suppression accidentelle**.

**RC-D non résolu** — pas dans ce sprint causes racines.

### 🟠 À SURVEILLER (à valider en recette manuelle)

- Storage `banners/{userId}/*` bien supprimé (Fix #5)
- Cascade DB complète (toutes les tables associées vidées)
- `support_tickets.user_id` → NULL
- `security_audit_log.user_id` → NULL puis anonymisation J+30 (Fix #4)

## 1.6 Navigation profil / settings

### 🟢 OK fonctionnel

Navigation OK sur les 5 onglets profil + 5 sections settings.

### 🔴 BLOQUANT — Privacy + Legal pages = placeholders

**Audit AUDIT_LEGAL NC-1 + NC-2** : `Privacy.tsx` et `Legal.tsx` rendent un placeholder "Bientôt disponible" alors que **le contenu RGPD complet existe dans `fr.json:1023-1056` et `en.json` mais n'est pas branché à l'UI**.

**Impact** : un utilisateur ne peut **PAS consulter la politique de confidentialité avant de s'inscrire**. Bloquant RGPD Art 12-13 + Loi 25 Art 8.3.

**RC-D non résolu** — pas dans ce sprint causes racines.

### 🟠 À SURVEILLER

- **Email change** sans écran OTP de confirmation (NC-7 légal)
- **Pas de bouton export RGPD** (NC-4 — Art 20 portabilité)
- **Pas de cookie banner** (NC-5)

---

# 2. Sécurité / Data

## 2.1 Aucune fuite GPS

### 🟢 OK (avec PR #41 + #42 mergées + migrations appliquées)

- **Fix #1** strippe EXIF avant upload → fichier propre
- **Fix #2** vue `posts_public` masque `latitude/longitude/city/region/country/location_name/location_point` pour visiteurs non-auteurs

### 🟠 À VALIDER en recette

- `curl GET /rest/v1/posts_public?location_hidden=eq.true` → coords NULL pour visiteur anonyme
- `exiftool` sur photo téléchargée → aucune GPS metadata
- Embed PostgREST `?select=*,author:profiles!user_id(...),media(*)` fonctionne sur la vue (pas seulement la table)

### 🔴 RISQUE — Photos historiques

Photos uploadées AVANT Fix #1 ont leurs EXIF GPS intacts dans le bucket `post-media` public. Tant que ces photos ne sont pas re-strippées via une migration storage, fuite résiduelle possible.

## 2.2 Aucune fuite email

### 🟠 À SURVEILLER

- **`profileService.ts:73`** fait toujours `select('*')` sur `profiles` → remonte la colonne `email`
- **AUDIT_PERFORMANCE P-BACK-3** non corrigé
- À traiter dans la **Phase 2 fiabilisation** (cf. PLAN_ACTION)

**Statut RGPD** : non bloquant car la RLS owner-only sur `profiles` empêche un autre user de lire `email`. Mais c'est une mauvaise pratique de minimisation.

## 2.3 RLS correctement appliqué

### 🟢 OK structurellement

- 16 tables avec RLS (cf. AUDIT_SUPABASE.md A)
- Cascades FK cohérentes
- Helper `can_see_post()` STABLE

### 🔴 BLOQUANT — RLS Media/Reactions/Comments trop permissive

**AUDIT_SUPABASE P-6** : un user A peut lire les médias d'un post privé de B (`SELECT * FROM media WHERE post_id = ...` sans check de visibilité du post parent).

**Non corrigé par Fix #2** (qui couvre seulement la vue `posts_public`).

→ **Faille de confidentialité majeure non résolue**.

À ajouter en sprint Phase 1 du PLAN_ACTION.

### 🟠 À VALIDER

Tests RLS automatisés cross-user (audit AUDIT_SUPABASE.md F-19) → pas en place.

## 2.4 posts_public cohérent

### 🟢 OK structurel (Fix #2 PR #42)

Vue avec `WITH (security_invoker = true)` + CASE conditionnel sur 7 colonnes sensibles.

### 🟠 À VALIDER en recette

- Pagination `count: 'exact'` fonctionne sur la vue
- Embed PostgREST `profiles!user_id` + `media` fonctionne
- Performance acceptable (aucun overhead notable attendu)

### 🔴 RISQUE — Filtre radius

`useFeed.ts:75-95` filtre Haversine côté client. Avec `lat/lng=null` pour les posts hidden, ces posts sont **automatiquement exclus du filtre radius** (ligne 94). Comportement attendu mais à valider en recette.

## 2.5 Anonymisation active

### 🟢 OK structurel (Fix #4 PR #44)

- Fonction `public.anonymize_orphan_audit_logs()` SECURITY DEFINER
- Schedule pg_cron `'0 3 * * *'`
- Idempotence garantie via marqueur `metadata.anonymized`

### 🟠 À VALIDER après application migration

- Extension `pg_cron` active sur le projet Supabase
- Cron tourne réellement (logs `cron.job_run_details` après 24h)
- Test data lifecycle manuel (insérer rows test, vérifier UPDATE)

---

# 3. Supabase / Backend

## 3.1 Migrations appliquées correctement

### 🔴 BLOQUANT — RIEN n'est appliqué actuellement

**État réel** :

- `20260502_settings_phase2_complete.sql` : créée mais **non appliquée** (les tables `support_tickets`, `security_audit_log`, le bucket `banners` n'existent pas en prod)
- `20260503_audit_log_anonymization_cron.sql` (Fix #4) : pas appliquée
- `20260503_backfill_saved_hidden_posts.sql` (Fix #3) : pas appliquée
- `20260503_posts_public_view.sql` (Fix #2) : pas appliquée

**Procédure d'application obligatoire avant merge** :

```
1. Sur naturegraph-dev :
   - Appliquer 20260502_settings_phase2_complete.sql
   - Appliquer 20260503_backfill_saved_hidden_posts.sql (avec dump policies avant)
   - Appliquer 20260503_audit_log_anonymization_cron.sql
   - Appliquer 20260503_posts_public_view.sql
   - Régénérer src/types/supabase.ts via `npx supabase gen types typescript`

2. Tests E2E manuels sur preview Vercel

3. Sur naturegraph-prod : idem ordre

4. Merger PRs dans l'ordre : #43 → #44 → #41 → #42 → #45
```

## 3.2 Aucune table orpheline

### 🟢 OK avec Fix #3

Une fois Fix #3 mergé : `saved_posts` et `hidden_posts` deviennent versionnées Git.

### 🟠 À VÉRIFIER

- Structure exacte DB vs migration (`pg_dump --schema-only -t saved_posts -t hidden_posts` à comparer)
- Bucket `community_photos` (référencé dans `20260420_security_fixes:72`) existence à confirmer

## 3.3 Indexes OK

### 🟢 OK avec Fix #3

4 nouveaux indexes (2 par table) ajoutés dans la migration backfill.

### 🔴 BLOQUANT — Indexes composites manquants ailleurs

**AUDIT_SUPABASE P-7** : non corrigé.

- `posts(user_id, created_at DESC)` pour `getPostsByUser` Profile
- `posts(taxonomic_group, identification_status, published_at DESC)` pour filtres feed
- Performance dégradée sous charge.

## 3.4 Cron actif et fonctionnel

### 🟠 À VALIDER après application migration Fix #4

- `SELECT * FROM cron.job WHERE jobname = 'anonymize_orphan_audit_logs'` → schedule = '0 3 \* \* \*', active = true
- Après 24h : `cron.job_run_details` → status = 'succeeded'

### 🟠 À VALIDER

Le cron `weekly_species_digest` existant (`20260417`) tourne-t-il en prod ? Si oui, c'est une preuve que pg_cron est bien actif sur le projet.

---

# 4. RGPD / Loi 25 — Final Check

## 4.1 Suppression immédiate conforme

### 🟢 OK (Fix #5 PR #45)

- Politique FR + EN alignée sur "suppression immédiate"
- 5 buckets nettoyés (avatars, banners, post-media, notebook-covers, exports)
- Cascade DB complète

### ⚖️ Conformité atteinte

- RGPD Art 5(1)(a) loyauté : politique = code
- RGPD Art 17 droit à l'effacement : effet maximal
- Loi 25 Art 27.1 droit à la cessation

## 4.2 Anonymisation correcte

### 🟢 OK structurel (Fix #4)

- `ip_address`, `user_agent`, `metadata` effacés à J+30 pour rows orphelines
- `event_type`, `created_at` conservés pour preuve d'audit

### ⚖️ Conformité

- RGPD Art 5(1)(c) + Art 5(1)(e)
- Loi 25 Art 1.1 + Art 9

## 4.3 Politique alignée

### 🟢 OK i18n (Fix #5)

Textes FR + EN alignés.

### 🔴 BLOQUANT — Pages Privacy/Legal restent placeholder (RC-D)

**Audit NC-1 + NC-2** : la politique alignée existe en i18n mais **la page `/privacy` n'affiche pas ce contenu**. Elle rend "Bientôt disponible".

→ **Conformité RGPD Art 12-13 + Loi 25 Art 8.3 NON atteinte**.

## 4.4 Absence de données résiduelles

### 🟢 OK structurel (Fix #5)

Cascade complète + 5 buckets + anonymisation J+30.

### 🟠 À VALIDER en recette

- Test compte test : créer compte, uploader avatar + bannière + 1 post avec photo, supprimer, vérifier en Storage admin que TOUS les buckets sont vides
- Backups Supabase : 7-30 jours (mentionné dans politique Fix #5)

## 4.5 Bloquants RGPD/Loi 25 RESTANTS (hors sprint causes racines)

| #        | Manquement                         | Fix prévu           |
| -------- | ---------------------------------- | ------------------- |
| **NC-1** | Privacy page placeholder           | RC-D Sprint Phase 1 |
| **NC-2** | Legal page placeholder             | RC-D Sprint Phase 1 |
| **NC-4** | Bouton export RGPD absent (Art 20) | RC-D Sprint Phase 1 |
| **NC-5** | Cookie banner absent               | RC-D Sprint Phase 1 |
| **NC-7** | Email DPO non vérifié actif        | Process admin       |
| **NC-8** | Désignation responsable traitement | Process admin       |

---

# 5. Performance

## 5.1 Feed

### 🟢 OK structurel

- Pagination 20 (cf. AUDIT_PERFORMANCE.md)
- Cache React Query staleTime 5 min
- 0 polling

### 🟠 À SURVEILLER

- **`hydrateCommunityProfiles` 3 requêtes série** (~200 ms onglet Communauté) — non corrigé
- **`getFeed for_you` 2 requêtes série** — non corrigé
- **Filtre radius Haversine côté client** — fonctionnel mais sub-optimal

## 5.2 Upload

### 🟢 OK avec Fix #1

- Strip EXIF + resize si > 4096px → bonus compression légère

### 🟠 À SURVEILLER

- **Compression image client absente** — upload 10 MB possible (audit I2)
- **Pas de variantes images** — avatars 1600×1600 chargés pour affichage 40 px
- **Spinner upload absent** — UX 4G dégradée

## 5.3 Chargement initial

### 🟢 OK budget respecté

- Bundle JS gzip route `/home` : ~242 KB (sous budget 300 KB)
- Build time 19 s (acceptable)

### 🟠 À SURVEILLER

- **Chunk `MobileBottomNav` 39 KB gzip anormal** — non investigé
- **Chunk `cta-kingfisher` 42 KB gzip** — asset bundlé en JS, non corrigé
- **Marge 60 KB** sur le budget : si on ajoute Lighthouse/analytics → dépassement

## 5.4 Queries Supabase

### 🟢 OK structurel

- Triggers denormalized counters
- Index FK essentiels présents (migration `20260420`)

### 🟠 À SURVEILLER

- **3 indexes composites manquants** (cf. P-7 audit Supabase)
- **`select('*')` profiles** remonte 20 colonnes inutiles (cf. P-BACK-3)
- **RLS `can_see_post()` appelée 60+ fois par feed** (audit P-BACK-4)

---

# 6. Risques restants

## 6.1 Bugs silencieux

### 🔴 Critique

1. **Migrations non appliquées** = code références tables/vues inexistantes → 500 errors silencieux à l'invocation
2. **Onboarding silencieux** = données utilisateur jetées sans erreur visible
3. **EXIF historique** = photos pré-Fix #1 leak GPS sans alerte

### 🟠 Moyens

1. **Boutons sociaux non masqués** = clic = erreur générique = perte confiance (Quick Win QW2 non appliqué)
2. **HEIC mismatch** = upload iPhone échoue silencieusement (Quick Win QW1 non appliqué)
3. **Race condition compteurs** = drift `likes_count` sous charge

## 6.2 Régressions UX

### 🟢 Aucune introduite par les 5 fixes

- Fix #1 transparent (strip arrière-plan)
- Fix #2 transparent (vue côté serveur)
- Fix #3 transparent (migration descriptive)
- Fix #4 transparent (cron arrière-plan)
- Fix #5 textes politique alignés + 1 bucket de plus

### 🟠 Risques de validation manuelle nécessaire

- Embed PostgREST sur `posts_public` (jamais testé sur cette config)
- Cron `pg_cron` peut ne pas tourner si extension pas activée sur le projet Supabase actuel

## 6.3 Incohérences data

### 🟠 À VALIDER

1. Compteurs `likes_count` etc. peuvent drift après suppression compte → script de réconciliation à prévoir
2. `support_tickets.user_id` NULL conservé sans purge IP/UA documentée (audit RL-7) — non corrigé
3. Notifications expirées (auteur supprimé) → comportement UI non documenté

---

# 📊 Synthèse — Décompte

## 🟢 OK (validé statiquement)

- Code des 5 fixes propre, validé TS+Lint+Build
- 5 PRs créées avec descriptions complètes
- 3 causes racines critiques résolues côté code (RC-A, RC-B, RC-C)
- Suppression compte cascade complète + 5 buckets nettoyés
- Vue `posts_public` masque coords pour non-auteurs
- EXIF strippé sur 3 services d'upload
- Cron J+30 anonymisation prêt à activer
- Politique RGPD i18n alignée (FR + EN)

## 🟠 À SURVEILLER (validation manuelle requise)

- Application des 4 migrations SQL dans l'ordre sur dev → staging → prod
- Régénération `supabase.ts` post-migration (retirer casts `any`)
- Recette E2E manuelle des 5 fixes avec compte test (5 buckets + cascade DB)
- Test API curl direct (vue `posts_public` + embed PostgREST)
- Cron `pg_cron` actif après 24h (logs `cron.job_run_details`)
- Test cross-user RLS (un user A ne lit pas les saves/hides de B)

## 🔴 BLOQUANT (avant beta publique)

1. **PRs non mergées** : 5 PRs OPEN, aucune en `develop` (donc 0 en `main`)
2. **Migrations non appliquées** : tout le code Fix #2-#5 référence des objets DB inexistants
3. **RC-E onboarding silencieux** : `motivations` + `notif_frequency` jetés à l'inscription (pas dans ce sprint)
4. **RC-D Privacy/Legal placeholder** : politique de confidentialité INACCESSIBLE (NC-1, NC-2 légal)
5. **RC-D Cookie banner absent** : NC-5 légal
6. **RC-D Export RGPD absent** : Art 20 portabilité non implémenté (NC-4 légal)
7. **RC-D DeleteAccountModal sans username matching** : suppression accidentelle facile (NC-6 légal, C3 flows)
8. **RC-D Email change sans OTP UI** : politique brisée (NC-7 légal, C5 flows)
9. **RLS Media/Reactions/Comments trop permissive** : faille cross-user (P-6 Supabase, non corrigée)
10. **Boutons sociaux non masqués + HEIC mismatch + multi-obs/ID-help visibles** : Quick Wins non appliqués

## ⚖️ Conformité — État final

| Référentiel                          | Avant Fix #1-#5           | Après Fix #1-#5 (mergés + déployés)        | Après RC-D + RC-E              |
| ------------------------------------ | ------------------------- | ------------------------------------------ | ------------------------------ |
| **RGPD Art 5(1)(a)** loyauté         | ❌                        | 🟢 Politique = code                        | 🟢                             |
| **RGPD Art 5(1)(c)** minimisation    | ❌                        | 🟢 EXIF + posts_public                     | 🟢                             |
| **RGPD Art 5(1)(e)** conservation    | ❌                        | 🟢 Cron J+30 + suppression immédiate       | 🟢                             |
| **RGPD Art 12-13** transparence      | ❌                        | ⚠️ Politique alignée mais page placeholder | 🟢 (si NC-1+2 fix)             |
| **RGPD Art 17** droit à l'effacement | ⚠️ Partial (banners leak) | 🟢 5 buckets + cascade                     | 🟢                             |
| **RGPD Art 20** portabilité          | ❌                        | ❌ (NC-4 hors scope)                       | 🟢 (si NC-4 fix)               |
| **RGPD Art 25** Privacy by Default   | ❌                        | 🟢 EXIF + masquage par défaut              | 🟢                             |
| **RGPD Art 32** sécurité             | ⚠️                        | 🟢 Defense en profondeur                   | 🟢 (+ Media/Reactions RLS fix) |
| **Loi 25 Art 1.1** minimisation      | ❌                        | 🟢                                         | 🟢                             |
| **Loi 25 Art 8.3** transparence      | ❌                        | ⚠️ Idem RGPD Art 12                        | 🟢                             |
| **Loi 25 Art 9** sécurité            | ⚠️                        | 🟢                                         | 🟢                             |
| **Loi 25 Art 27.1** cessation        | ❌                        | 🟢 Suppression immédiate                   | 🟢                             |

**Conformité RGPD/Loi 25 atteignable** :

- Après merge Fix #1-#5 + application migrations : **80 %**
- Après RC-D + RC-E résolus : **100 %** (les 6 manquements légaux résiduels disparaissent)

---

# 🚀 READY FOR BETA ?

## ❌ NON — Pas prêt pour utilisateurs réels

### Justification

**Bloquants techniques de déploiement** (5/5 PRs ouvertes, migrations non appliquées) :

- Le code est prêt, mais le **déploiement n'est pas fait**
- Sans application des migrations, le code Fix #2-#5 référence des objets DB inexistants → **500 errors immédiats** sur le feed et la suppression compte

**Bloquants RGPD/Loi 25** (RC-D non démarré) :

- Politique de confidentialité **INACCESSIBLE** (page placeholder)
- Aucun cookie banner
- Aucun bouton d'export RGPD
- Suppression compte en 1 clic (accident garanti)

**Bloquants UX** (RC-E non démarré) :

- Onboarding ment à l'utilisateur (motivations + frequency jetés)
- Trahison de la promesse produit dès l'inscription

**Bloquant sécurité non corrigé** :

- RLS Media/Reactions/Comments cross-user permissive (un user lit les médias d'un post privé d'un autre)

## ✅ Ce qui peut être lancé MAINTENANT

**Beta privée, friends & family, NDA strict, max 5 testeurs internes** — pour tester techniquement les 5 fixes après merge + migration. **Pas pour des inconnus**.

## 🎯 Prérequis MINIMUM pour beta privée (5 j de travail estimé)

### Step 1 — Déploiement Fix #1-#5 (1 jour)

1. Appliquer les 4 migrations SQL sur dev
2. Régénérer `supabase.ts`
3. Recette manuelle 5 flows critiques sur preview
4. Merger PRs #43 → #44 → #41 → #42 → #45 dans l'ordre (5 fixes)
5. Appliquer migrations sur prod
6. Recette finale staging

### Step 2 — RC-D Privacy by Design UI (3 jours)

1. Brancher `Privacy.tsx` + `Legal.tsx` à l'i18n existant (3 h)
2. Cookie banner minimal informatif (4 h)
3. DeleteAccountModal avec saisie username (2 h)
4. Email change avec écran OTP intermédiaire (4 h)
5. Edge Function `export-user-data` + bouton Settings (1 j)
6. Désignation Responsable de traitement publique (1 h)

### Step 3 — RC-E Onboarding (1 jour)

1. Migration : ajouter colonne `motivations` sur `profiles` (15 min)
2. Étendre l'`upsert` onboarding (15 min)
3. Étendre upsert `user_settings.notif_frequency` (15 min)
4. Tests E2E onboarding complet (15 min)

### Step 4 — Quick Wins (1.5 h)

1. QW1 retirer HEIC du form (5 min)
2. QW2 masquer boutons sociaux (10 min)
3. QW3 throttle Hero RAF (15 min)
4. QW4 aria-label burger + FAQ (15 min)
5. QW5 supprimer empty state Profile dupliqué (10 min)
6. QW6 masquer multi-obs + ID help + filtre Aide (20 min)

### Step 5 — Bloquant sécurité hors causes racines (4 h)

- RLS Media/Reactions/Comments avec check `can_see_post(post_id)` (audit P-6)

## 🎯 Prérequis pour BETA PUBLIQUE (additional ~10 j)

- Phase 2 fiabilisation du PLAN_ACTION (A11Y WCAG AA, compression image, indexes composites, etc.)
- Tests E2E Playwright sur 5 flows critiques
- Lighthouse a11y > 95
- Sandbox de test pour stress test cron + Realtime

---

# Résumé exécutif

**Le sprint causes racines a été un succès côté code** — 5 fixes critiques propres, 0 régression, 0 impact UX. **3 causes racines sur 5 sont résolues**.

**Mais le produit n'est pas encore en production**. Tant que les migrations ne sont pas appliquées et les PRs mergées, **rien n'est actif**.

**Et même après le déploiement, 6 bloquants RGPD/UX persistent** (RC-D + RC-E + RLS Media + Quick Wins).

**Estimation honnête** : **5 jours de travail concentré supplémentaire** pour atteindre l'état "beta privée OK", **15 jours** pour "beta publique OK".

---

> **Document à valider avec Nicolas avant tout lancement utilisateur.**
> **Prochaine étape recommandée** : déployer les 5 fixes (Step 1) puis attaquer RC-D + RC-E (Steps 2-3) en parallèle.
