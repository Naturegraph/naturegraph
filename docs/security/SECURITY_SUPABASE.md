# SECURITY_SUPABASE.md : Audit sécurité Supabase

> Audit réalisé le 2026-05-20 · Projet `hrxgduvworofnrjmgpcj` · PostgreSQL 15 + PostGIS
> Source : `get_advisors` (security + performance), inspection RLS / policies / fonctions.

---

## 0. Synthèse

Supabase est le **cœur de la sécurité** de Naturegraph : la clé `anon` étant publique
(embarquée dans le bundle client), **la RLS est la seule barrière réelle** entre un
attaquant et les données. Bonne nouvelle : **RLS activée sur les 29 tables
applicatives**. Les points relevés concernent la réduction de surface des fonctions
exposées et quelques réglages de durcissement.

| Sévérité     | Nombre |
| ------------ | ------ |
| 🔴 Critique  | 0      |
| 🟠 Important | 2      |
| 🟡 Moyen     | 4      |
| ⚪ Mineur    | 2      |

---

## 1. Row Level Security (RLS)

### 🟢 Couverture RLS : complète

- **29 tables applicatives** ont la RLS activée.
- Seule `spatial_ref_sys` (table système PostGIS) n'a pas de RLS → **faux positif** :
  c'est une table de référence en lecture seule, non modifiable (on n'en est pas
  propriétaire). Données publiques de projection cartographique, aucun enjeu.
- Tables sensibles vérifiées : `profiles`, `posts`, `media`, `beta_access_keys`,
  `admin_users`, `admin_audit_logs`, `moderation_reports`, `beta_waitlist`,
  `user_settings`, `fr_cities`, `species_master` → toutes sous RLS.

### 🟢 Policies data de référence

- `species_master` et `fr_cities` : **une seule policy SELECT publique**
  (`is_active = true` / lecture seule). Le doublon de policy sur `species_master` a été
  corrigé (migration `drop_duplicate_species_master_select_policy`). Les grants
  temporaires d'écriture (`anon`) utilisés pour les seeds ont été **révoqués** -
  vérifié : 1 policy SELECT chacune, aucun GRANT INSERT/UPDATE résiduel.

### 🟠 `beta_waitlist` : INSERT public non restreint

- **Description** : la policy `public_insert_waitlist` a `WITH CHECK (true)` → n'importe
  qui (rôle `anon`) peut insérer dans `beta_waitlist`.
- **Risque réel** : c'est **voulu** (formulaire d'inscription waitlist public). Mais
  sans rate limiting, un bot peut insérer des milliers de fausses entrées.
- **Impact** : pollution de la table waitlist, gonflement DB, bruit pour le super-admin.
  Pas de fuite de données.
- **Scénario d'attaque** : script qui POST en boucle `/rest/v1/beta_waitlist` avec des
  emails aléatoires.
- **Difficulté** : triviale.
- **Priorité** : importante avant ouverture publique du formulaire waitlist.
- **Mitigation** :
  1. Contrainte d'unicité sur `email` (empêche les doublons exacts).
  2. Rate limiting côté Edge Function / Vercel sur le endpoint waitlist.
  3. Honeypot ou hCaptcha/Turnstile sur le formulaire.
- **Effort** : 2-3 h.
- **Avant prod ?** OUI (avant que la waitlist soit publiquement accessible).

### ⚪ `admin_audit_logs` : INSERT-only (bonne pratique)

- Trigger `no_update_or_delete_admin_audit_logs` empêche UPDATE/DELETE → l'audit trail
  est **immuable**. ✅ Excellent pour la traçabilité (Loi 25 / RGPD).

---

## 2. Fonctions SECURITY DEFINER exposées

### 🟠 72 fonctions `SECURITY DEFINER` exécutables par `anon` / `authenticated`

- **Description** : l'advisor Supabase relève que **36 fonctions** sont appelables par
  `anon` ET `authenticated` via `/rest/v1/rpc/<fn>`. Beaucoup sont des **fonctions de
  trigger** (`update_likes_count`, `notify_on_follow`, `validate_post_content`,
  `update_updated_at_column`, etc.) qui n'ont aucun sens appelées directement.
- **Risque réel** : la majorité de ces fonctions, appelées hors contexte de trigger,
  **échouent** (elles référencent `NEW`/`OLD` inexistants) → pas d'effet. Mais c'est de
  la **surface d'attaque inutile** et du bruit. Quelques fonctions métier légitimes
  sont là aussi (`claim_beta_access_key`, `check_beta_access_key_validity`,
  `search_cities`, `nearby_posts`) : celles-là DOIVENT rester appelables.
- **Impact** : faible à modéré. Pas de fuite directe identifiée, mais une fonction de
  trigger mal écrite pourrait être détournée. `generate_beta_keys` est protégée par un
  check `is_admin()` interne ✅.
- **Scénario** : un attaquant énumère `/rest/v1/rpc/` et appelle chaque fonction pour
  trouver un effet de bord exploitable.
- **Difficulté** : moyenne (nécessite de connaître les noms : le repo étant public,
  ils sont connus).
- **Priorité** : importante (réduction de surface).
- **Mitigation** : `REVOKE EXECUTE ... FROM anon, authenticated` sur **toutes les
  fonctions de trigger** (elles n'ont pas à être dans l'API REST). Garder l'EXECUTE
  uniquement sur les RPC métier réellement appelées par le front. Migration SQL
  dédiée : cf. SECURITY_HARDENING_ROADMAP §A2.
- **Effort** : 2-3 h (lister les triggers vs RPC métier, écrire la migration REVOKE).
- **Avant prod ?** OUI (réduction de surface significative, le repo public expose les
  noms de fonctions).

### 🟡 `search_path` des fonctions

- Bonne nouvelle : les migrations `search_path_hardening` et
  `batch_43_retrofit_search_path_alter_fn` ont déjà fixé `search_path` sur les
  fonctions → protection contre le détournement de `search_path` (attaque classique
  sur `SECURITY DEFINER`). ✅ À maintenir pour toute nouvelle fonction.

---

## 3. Auth Supabase

### 🟡 Protection « mots de passe compromis » désactivée

- **Description** : `auth_leaked_password_protection` est **désactivé** (advisor WARN).
  Supabase peut vérifier les mots de passe contre HaveIBeenPwned.
- **Risque réel** : un utilisateur choisit un mot de passe déjà fuité publiquement →
  credential stuffing facilité.
- **Impact** : modéré (compromission de comptes utilisateurs).
- **Scénario** : attaque par credential stuffing sur des comptes à mot de passe faible.
- **Difficulté** : faible si des mots de passe fuités sont réutilisés.
- **Priorité** : moyenne : **1 clic** à activer.
- **Mitigation** : Supabase Dashboard → Authentication → Settings → activer **Leaked
  Password Protection**. Activer aussi une longueur minimale (≥ 10).
- **Effort** : 5 min.
- **Avant prod ?** OUI (gratuit, immédiat).

### ⚪ OTP / magic link

- L'auth principale est OTP (pas de mot de passe pour le flux nominal) → surface
  credential stuffing réduite. ✅

---

## 4. Edge Functions

6 Edge Functions : `admin-delete-user`, `delete-account`, `export-data`,
`send-waitlist-confirmation`, `validate-beta-key`, `weekly-species-digest`.

### 🟡 Vérification des autorisations dans les Edge Functions

- **Description** : `admin-delete-user` et `delete-account` manipulent des données
  sensibles. Elles DOIVENT vérifier le JWT de l'appelant et ses droits (`is_admin`
  pour la première, `auth.uid() == cible` pour la seconde).
- **Risque réel** : si une de ces fonctions ne vérifie pas l'appelant, un attaquant
  pourrait supprimer le compte d'un tiers.
- **Impact** : élevé si faille (suppression de compte arbitraire).
- **Scénario** : appel direct de `/functions/v1/admin-delete-user` avec un JWT non-admin.
- **Difficulté** : faible si la vérification manque.
- **Priorité** : moyenne : **à auditer ligne par ligne** (non inspecté en profondeur
  ici, hors périmètre de la collecte rapide).
- **Mitigation** : revue de code dédiée des 6 Edge Functions : (1) vérifier le JWT,
  (2) vérifier les droits, (3) ne jamais utiliser la `service_role` key sans contrôle
  d'autorisation préalable, (4) valider/échapper les inputs.
- **Effort** : 2 h (revue des 6 fonctions).
- **Avant prod ?** OUI : checklist dans SECURITY_CHECKLIST_PRE_PROD.md.

### 🟡 `send-waitlist-confirmation` : `console.log` (1 warning ESLint)

- Présence d'un `console.log` (warning lint non bloquant). Vérifier qu'aucune donnée
  sensible (email en clair, token) n'est loggée dans les logs Edge Function.
- **Effort** : 15 min. **Avant prod ?** OUI (vérification).

---

## 5. Storage

### 🟢 Buckets : configuration saine

- `avatars` (2 MB, image/webp|jpeg|png), `banners` (2 MB), `post-media` (10 MB,
  +video/mp4), `notebook-covers` (2 MB) : **publics en lecture, MIME + taille limités**.
- `exports` : **privé** (104 MB, application/zip) → exports RGPD non exposés
  publiquement ✅.
- Suppression directe de `storage.objects` protégée par trigger
  `protect_objects_delete` (anti-suppression accidentelle d'orphelins) ✅.

### 🟡 Buckets publics : énumération d'objets

- **Description** : les buckets `public` permettent de servir les fichiers sans auth.
  Les noms de fichiers sont des UUID/hashs → non énumérables facilement, mais une URL
  partagée reste accessible indéfiniment.
- **Risque** : une photo d'observation « privée » dont l'URL fuite reste accessible.
- **Impact** : modéré (photo nature : peu sensible, mais géolocalisation possible dans
  l'image… EXIF déjà strippé ✅).
- **Mitigation** : pour les médias réellement privés (Phase 2), utiliser des **signed
  URLs** à durée limitée plutôt que des buckets publics. Pour le MVP (observations
  destinées au partage), bucket public acceptable.
- **Effort** : Phase 2.
- **Avant prod ?** NON (acceptable pour des observations partagées).

---

## 6. Realtime, cron, quotas

- **Cron** : `anonymize_beta_signup_log` (anonymisation RGPD planifiée) ✅, +
  `weekly-species-digest`. Vérifier que les jobs cron tournent sous un rôle limité.
- **Realtime** : utilisé pour les notifications (`notifications:user_id=eq.{id}`). Les
  canaux Realtime respectent la RLS de la table → un utilisateur ne reçoit que ses
  notifications. ✅
- **🟡 Quotas / abuse** : pas de rate limiting au niveau PostgREST. Mitigations =
  beta fermée (clés `max_uses=1`) + à compléter avant ouverture publique (cf.
  SECURITY_HARDENING_ROADMAP + INFRA dans SECURITY_AUDIT_GLOBAL).

---

## 7. Extensions

### ⚪ Extensions dans le schéma `public`

- `postgis`, `pg_trgm`, `unaccent` installées dans `public` (advisor WARN).
- **Risque** : très faible : bonne pratique de les isoler dans un schéma `extensions`.
- **Mitigation** : déplacement en Phase 2 (non trivial : peut casser des fonctions).
- **Avant prod ?** NON.

---

## 8. Verdict Supabase

| Domaine            | État                                                   |
| ------------------ | ------------------------------------------------------ |
| RLS                | ✅ 29/29 tables, policies vérifiées                    |
| Storage            | ✅ MIME/taille limités, exports privés                 |
| Auth               | 🟡 activer leaked-password protection (5 min)          |
| Fonctions exposées | 🟠 REVOKE EXECUTE sur les triggers (réduction surface) |
| `beta_waitlist`    | 🟠 anti-spam avant ouverture publique                  |
| Edge Functions     | 🟡 revue d'autorisation des 6 fonctions                |
| Cron / Realtime    | ✅ RLS-aware, anonymisation en place                   |

**Supabase est solide pour la beta.** 3 actions avant prod publique : leaked-password
(5 min), REVOKE EXECUTE triggers (3 h), anti-spam waitlist (3 h). Revue Edge Functions
recommandée.
