# SECURITY_SUPABASE.md : Audit sécurité Supabase

> Audit réalisé le 2026-05-20 · mis à jour le 2026-06-22 (re-scan advisors + revue
> Edge Functions, NG-007) · Projet `hrxgduvworofnrjmgpcj` · PostgreSQL 15 + PostGIS
> Source : `get_advisors` (security + performance), inspection RLS / policies / fonctions.
>
> Re-scan 2026-06-22 : advisors security/perf inchangés vs 2026-05-20 (mêmes findings
> by-design). RPC privilégiées re-vérifiées (`admin_set_user_role` exige `super_admin`,
> `claim_beta_access_key` atomique). Revue complète des Edge Functions ajoutée (§4).

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
| 🟠 Important | 3      |
| 🟡 Moyen     | 4      |
| ⚪ Mineur    | 2      |

> MAJ 2026-06-22 : +1 🟠 (`send-waitlist-confirmation` non authentifiée, §4) ; revue Edge
> Functions clôturée (autorisations OK hors ce point). Les 🟠 restants se traitent dans
> les chantiers waitlist/email (NG-009) et durcissement RPC (SECURITY_HARDENING_ROADMAP).

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

7 Edge Functions : `admin-delete-user`, `delete-account`, `export-data`,
`send-beta-invite`, `send-waitlist-confirmation`, `validate-beta-key`,
`weekly-species-digest`.

### 🟢 Vérification des autorisations dans les Edge Functions : revue faite (2026-06-22)

Revue ligne par ligne des 7 Edge Functions (NG-007). Verdict : **autorisations
correctes, aucun trou critique**. L'ordre est partout le bon : auth d'abord, droits
ensuite, `service_role` seulement après contrôle.

| Function                     | Contrôle d'accès                                                    | Verdict |
| ---------------------------- | ------------------------------------------------------------------- | ------- |
| `admin-delete-user`          | JWT (`getUser`) + `super_admin` actif + anti-suicide + audit log    | ✅      |
| `delete-account`             | JWT, opère uniquement sur `user.id` (pas de `target` du body)       | ✅      |
| `export-data`                | JWT, requêtes filtrées sur `user.id` + signed URL 24h, bucket privé | ✅      |
| `send-beta-invite`           | JWT + `admin_users.is_active`, rollback des clés orphelines         | ✅      |
| `validate-beta-key`          | rate-limit IP (5/10min) + claim atomique + quota + audit            | ✅      |
| `send-waitlist-confirmation` | `verify_jwt: false`, AUCUNE vérif d'appelant/secret (cf. 🟠)        | 🟠      |
| `weekly-species-digest`      | cron interne, pas de données sensibles renvoyées                    | ✅      |

Toutes assainissent les erreurs (message générique, pas de stack trace : CodeQL ✅) et
n'exposent jamais la `service_role` au client.

**🟡 Mineur (suivi, non bloquant)** : `validate-beta-key` décode le JWT en base64 pour
extraire `sub` **sans vérifier la signature**, uniquement pour renseigner
`used_by_user_id`. Un JWT forgé pourrait donc associer un claim à un `user_id` arbitraire,
mais il faut déjà un **code beta valide** pour claim, et l'effet se limite à un mauvais
étiquetage (pas de fuite, pas d'élévation). Durcissement possible : remplacer le décodage
manuel par `auth.getUser()` (vérifie la signature). Effort : 15 min. Avant prod ? Non
(cosmétique sécurité).

- `send-beta-invite` n'existait pas lors de l'audit du 2026-05-20 : ajoutée et revue ici.
- **Avant prod ?** Point initial RÉSOLU. Checklist SECURITY_CHECKLIST_PRE_PROD.md à cocher.

### 🟠 `send-waitlist-confirmation` : endpoint d'envoi d'email non authentifié (2026-06-22)

- **Description** : la function a `verify_jwt: false` (elle est déclenchée par un trigger
  PostgreSQL via `pg_net` à l'INSERT dans `beta_waitlist`). Mais elle **ne vérifie aucun
  secret partagé ni l'identité de l'appelant** : elle accepte n'importe quel
  `POST { record: { email, id } }` et envoie un email brandé Naturegraph (via Resend) à
  l'adresse fournie. Elle ne vérifie même pas que `record.id` existe réellement dans la
  table (le rang tombe à `#0` si absent, l'email part quand même).
- **Risque réel** : le repo étant public, l'URL `/functions/v1/send-waitlist-confirmation`
  est connue → un attaquant peut envoyer des emails Naturegraph à des adresses arbitraires :
  spam, phishing à notre nom, **épuisement du quota Resend** et surtout **dégradation de la
  réputation du domaine d'envoi**.
- **Impact** : modéré à important, **et critique dans le contexte du prélancement** : on
  s'apprête à monter la délivrabilité email (NG-009). Un domaine grillé par de l'abus
  ferait tomber nos mails de campagne ET nos OTP en spam.
- **Scénario** : script qui POST en boucle avec des emails cibles.
- **Difficulté** : triviale (aucune auth). Dormant uniquement si `RESEND_API_KEY` n'est
  pas configuré (mode dégradé sans envoi).
- **Priorité** : importante, à traiter dans le chantier email (NG-009).
- **Mitigation** : faire passer au trigger `pg_net` un **secret partagé** (header type
  `x-webhook-secret`, stocké en secret Edge Function) et **rejeter** tout appel sans ce
  secret. Alternative : vérifier que `record.id` existe et a été créé il y a < 1 min, et
  que l'email correspond. Note : la refonte email MailerLite (NG-009) va de toute façon
  retoucher ce flux, c'est le bon moment pour sécuriser l'appel.
- **Annexe** : `from` actuel = `naturegraph.fr@gmail.com` (gmail + domaine `.fr` en cours
  de redirection) → à remplacer par une adresse du domaine d'envoi pro (NG-009).
- **Effort** : 1-2 h. **Avant prod publique ?** OUI (avant d'activer l'envoi d'emails réels).
- **Note logs** : un `console.log` affiche la position + l'email en clair dans les logs
  Edge Function (warning lint historique) : acceptable côté serveur, à garder en tête RGPD.

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

| Domaine            | État                                                         |
| ------------------ | ------------------------------------------------------------ |
| RLS                | ✅ 29/29 tables, policies vérifiées                          |
| Storage            | ✅ MIME/taille limités, exports privés                       |
| Auth               | 🟡 activer leaked-password protection (5 min)                |
| Fonctions exposées | 🟠 REVOKE EXECUTE sur les triggers (réduction surface)       |
| `beta_waitlist`    | 🟠 anti-spam avant ouverture publique                        |
| Edge Functions     | ✅ autz OK ; `send-waitlist-confirmation` sécurisée (secret) |
| Cron / Realtime    | ✅ RLS-aware, anonymisation en place                         |

**Supabase est solide pour la beta.** Avant prod publique : leaked-password (5 min),
REVOKE EXECUTE triggers (3 h), anti-spam waitlist (3 h). Revue Edge Functions faite
(2026-06-22) : autorisations OK. `send-waitlist-confirmation` sécurisée le 2026-06-23
(secret partagé, cf. section 9). Reste à poser le secret en prod lors du chantier email.

---

## 9. Secret partagé `send-waitlist-confirmation` (NG-007, 2026-06-23)

`send-waitlist-confirmation` est en `verify_jwt:false` (appelée par le trigger DB
`waitlist_send_confirmation`, pas par un client). Comme elle est publiquement
atteignable, elle était vulnérable à l'abus : n'importe qui pouvait POSTer un
`record.email` arbitraire pour déclencher l'envoi d'un email brandé Naturegraph
(spam / phishing + consommation du quota Resend).

**Correctif (code déployé)** : la fonction exige un header `x-waitlist-secret`
égal à l'env `WAITLIST_TRIGGER_SECRET` (comparaison à temps constant). Le trigger
PostgreSQL lit le secret depuis Supabase Vault (`waitlist_trigger_secret`) et le
transmet. Rollout progressif : tant que le secret n'est posé ni côté Vault ni côté
env, le comportement est inchangé (header omis + warning loggé). Une fois posé des
deux côtés, le secret devient obligatoire (401 sinon).

Migration : `20260623_waitlist_confirmation_secret.sql` (trigger).

### Setup one-time du secret (par environnement : dev/staging ET prod)

1. Générer un secret aléatoire : `openssl rand -hex 32`.
2. Vault (SQL Editor du bon projet) :
   ```sql
   select vault.create_secret('<le_secret>', 'waitlist_trigger_secret');
   ```
3. Edge Function Secrets (Dashboard → Edge Functions → Secrets) :
   `WAITLIST_TRIGGER_SECRET = <le_meme_secret>`.
4. Vérifier : une inscription waitlist déclenche un envoi (logs de la fonction) ; un
   POST direct sans header renvoie `401`.

Secret distinct par environnement (ne pas réutiliser le secret dev en prod).
