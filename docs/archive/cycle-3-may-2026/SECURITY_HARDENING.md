# Sécurité — Lockdown BATCH 78-82 (2026-05-15)

> Statut : appliqué sur dev. À reproduire sur prod lors du merge main.

## 1. Vulnérabilités CodeQL corrigées (BATCH 78)

| #   | Sévérité | Fichier                                          | Fix                                 |
| --- | -------- | ------------------------------------------------ | ----------------------------------- |
| #3  | HIGH     | `src/components/profile/EditPhotoTab.tsx:303`    | `sanitizeImageUrl(avatarUrl)`       |
| #4  | HIGH     | `src/components/profile/EditPhotoTab.tsx:352`    | `sanitizeImageUrl(bannerUrl)`       |
| #1  | MEDIUM   | `supabase/functions/delete-account/index.ts:111` | message générique + `console.error` |
| #2  | MEDIUM   | `supabase/functions/export-data/index.ts:84`     | message générique + `console.error` |

**Nouveau helper :** `src/lib/sanitize.ts` — fonction `sanitizeImageUrl(url)` qui autorise uniquement `http(s):`, `blob:`, `data:image/*`. Rejette `javascript:`, `data:text/html`, `file:`, etc.

## 2. GitHub lockdown (BATCH 79)

### Activé

- ✅ `secret_scanning` (était déjà actif)
- ✅ `secret_scanning_push_protection` (était déjà actif)
- ✅ `dependabot_security_updates` (BATCH 79 — patches auto sécurité)

### Main branch protection durcie

- ✅ `enforce_admins: true` (les admins suivent aussi les rules)
- ✅ `required_linear_history: true` (squash merge only)
- ✅ `dismiss_stale_reviews: true`
- ✅ `required_status_checks`: CI + CodeQL bloquants
- ✅ `allow_force_pushes: false`
- ✅ `allow_deletions: false`
- ✅ `required_conversation_resolution: true`

### Staging

- Inchangé : protection minimale (CI bloquant) pour permettre des merges rapides depuis develop.

### À noter

- `allow_forking: true` (impossible de changer sur repo public personal — nécessite passage à organisation). Pour le forker, voir manuellement les forks dans Insights.
- `required_signatures: false` (GPG signing à configurer plus tard si besoin).

## 3. Vercel (à vérifier manuellement)

L'API Vercel ne m'a pas autorisé l'audit automatique. Checklist à faire dans le Dashboard Vercel :

### Project Settings → Environment Variables

- [ ] Vérifier que `SUPABASE_SERVICE_ROLE_KEY` et autres secrets sont marqués **Sensitive**
- [ ] Vérifier qu'ils sont uniquement disponibles en **Production** (pas en Preview)
- [ ] Vérifier que les Preview deployments n'exposent PAS le service_role_key

### Project Settings → Git

- [ ] Vérifier que **Ignored Build Step** est OK
- [ ] Activer **Comments on Pull Requests** seulement si besoin (peut polluer)

### Project Settings → Domains

- [ ] Vérifier que tous les domaines pointent en HTTPS uniquement
- [ ] Activer **HSTS** sur naturegraph.fr (Strict-Transport-Security)

### Project Settings → Security

- [ ] **Vercel Authentication** sur Preview deployments si tu veux verrouiller les previews
- [ ] **Trusted IPs** si tu veux limiter l'accès admin par IP

### vercel.json (déjà dans le repo)

- ✅ CSP headers configurés (vérifié BATCH 39)
- ✅ Security headers OK (X-Frame-Options, X-Content-Type-Options, etc.)

## 4. Supabase — Système `is_internal` (BATCH 80)

### Architecture

- Nouvelle colonne `profiles.is_internal BOOLEAN DEFAULT FALSE`
- Helper `public.is_internal_user(uuid) RETURNS BOOLEAN` SECURITY DEFINER
- RLS policies mises à jour sur 7 tables pour exclure les internal users des SELECT publics :
  - `profiles` (Public profiles visible to all)
  - `posts` (Public + Followers-only)
  - `comments`
  - `reactions`
  - `follows`
  - `notebooks`

### Trade-off accepté

Les compteurs cache (`posts_count`, `likes_count`, etc.) sont incrémentés par les triggers même pour les internal users. Léger décalage visuel pour les autres users (compteur=5 mais ils voient 4 actions). **Acceptable pour la beta** — Nicolas sait que ses likes augmentent les compteurs.

### Vérifié par test

```sql
-- Test : un autre user fait SELECT sur profiles
SELECT count(*) FILTER (WHERE username = 'Admin_naturegraph') -- 0 ✅
       count(*) FILTER (WHERE username != 'Admin_naturegraph') -- 2 ✅
```

## 5. Compte super-admin Nicolas (BATCH 81)

| Champ                   | Valeur                                 |
| ----------------------- | -------------------------------------- |
| `email`                 | `nicolasdouaron.ca@gmail.com`          |
| `auth.users.id`         | `6b999dea-7526-404c-a0e7-a92f858023c0` |
| `profiles.username`     | `Admin_naturegraph`                    |
| `profiles.is_internal`  | `TRUE` ✅                              |
| `profiles.is_public`    | `FALSE`                                |
| `admin_users.role`      | `super_admin`                          |
| `admin_users.is_active` | `TRUE`                                 |

### Connexion

1. Va sur naturegraph.fr (ou preview)
2. Clique "Se connecter"
3. Saisis `nicolasdouaron.ca@gmail.com`
4. Reçois OTP par email
5. Connecté en tant que super-admin invisible

### Comportement

- ✅ Peut liker, commenter, poster, suivre — comme un user normal
- ✅ Ses actions augmentent les compteurs (mais ne s'affichent pas dans les listes publiques)
- ✅ A accès au dashboard `/admin/*` (AdminGuard valide via `admin_users.role`)
- ✅ Invisible des autres users (RLS filtre via `is_internal_user()`)

## 6. À appliquer sur naturegraph-prod (au merge main)

```bash
# 1. Migrations SQL
psql $PROD_DB_URL < supabase/migrations/20260515_internal_users_invisibility.sql

# 2. Créer le compte Nicolas sur prod (exécuter le bloc SQL avec son email)
# Voir scripts SQL utilisés en dev plus haut dans le commit BATCH 81

# 3. Redéployer edge functions corrigées
supabase functions deploy export-data --project-ref <prod>
supabase functions deploy delete-account --project-ref <prod>
```

## 7. Restants (à faire plus tard)

- [ ] Configurer SMTP custom (cf. `docs/EMAIL_TEMPLATES_SETUP.md`)
- [ ] Activer **2FA** sur les comptes Github / Vercel / Supabase
- [ ] Configurer **GPG signing** pour les commits (optionnel, projet solo)
- [ ] Audit **dependencies** (npm audit + Dependabot alerts mensuelles)
- [ ] Penser au **CSP nonce** pour scripts inline (actuellement on autorise unsafe-inline)
