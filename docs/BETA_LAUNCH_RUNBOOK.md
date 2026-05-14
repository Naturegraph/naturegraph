# Beta Launch Runbook — Mise en production beta fermee

> **Statut** : 🟢 Pret pour deploiement
> **Date** : 2026-05-14
> **Refs** : BETA_CLOSED_ACCESS_STRATEGY.md v2.0 + ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 + BATCH 27-35

Document operationnel pour passer Naturegraph de "dev complet" a "beta ouverte aux 50 premiers testeurs".

---

## TL;DR — Ordre des operations

```
1. Setup Supabase PROD (DB)         → 15 min  → Section A
2. Configuration Vercel PROD (env)  → 5 min   → Section B
3. Bootstrap super_admin            → 2 min   → Section C
4. Generation premieres cles beta   → 3 min   → Section D
5. Envoi invitations testeurs       → 30 min  → Section E
6. Monitoring 7 premiers jours      → quotidien → Section F
```

**Pre-requis avant de commencer** :

- Acces console Supabase PROD (projet `naturegraph-prod`)
- Acces dashboard Vercel (projet `naturegraph`)
- Compte Sentry cree (optionnel mais recommande)
- Liste de 10 emails de testeurs valides

---

## Section A — Setup base de donnees PROD

### A.1 Appliquer les migrations beta + admin

Les migrations suivantes doivent etre appliquees sur **`naturegraph-prod`** dans l'ordre :

```bash
# Verifier d'abord ce qui est deja applique
npx supabase migration list --linked

# Migrations a appliquer (si absentes en PROD) :
1. 20260514_beta_admin_system.sql      # 8 tables + 4 RPC + 13 RLS policies
2. 20260514_add_generate_beta_keys.sql # RPC generate_beta_keys (utilise par /admin/beta)
```

**Via MCP Supabase** (recommande) :

```
> Use MCP supabase tool : apply_migration sur projet naturegraph-prod
```

**Via CLI** :

```bash
npx supabase db push --linked
```

### A.2 Verifier l'installation

```sql
-- Sur Supabase Dashboard > SQL Editor :

-- 1. Tables presentes ?
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE ANY(ARRAY['admin_%', 'beta_%'])
ORDER BY table_name;
-- Attendu : admin_actions, admin_audit_logs, admin_users,
--           beta_access_keys, beta_quota_config, beta_signup_log, beta_waitlist

-- 2. Quota config existe ?
SELECT * FROM beta_quota_config WHERE id = 1;
-- Attendu : 1 row (max_users_total=50, accepting_new_signups=true, current_phase=1)

-- 3. Fonctions RPC presentes ?
SELECT proname FROM pg_proc
WHERE proname IN ('claim_beta_access_key', 'is_admin', 'generate_beta_keys');
-- Attendu : 3 rows

-- 4. RLS policies actives ?
SELECT tablename, count(*) FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename LIKE 'admin_%' OR tablename LIKE 'beta_%')
GROUP BY tablename;
-- Attendu : 13 policies au total
```

### A.3 Deployer l'Edge Function

```bash
# Via MCP Supabase tool : deploy_edge_function

# Ou via CLI :
npx supabase functions deploy validate-beta-key --project-ref <PROD_REF>
```

Verifier sur Supabase Dashboard > Edge Functions :

- `validate-beta-key` doit etre **ACTIVE**
- `verify_jwt: false` (pre-auth signup)

---

## Section B — Configuration Vercel PROD

### B.1 Variables d'environnement (Production)

Aller dans **Vercel Dashboard > naturegraph > Settings > Environment Variables**.

Ajouter pour **Production** (sans toucher Preview/Development) :

| Variable                 | Valeur         | Source                            |
| ------------------------ | -------------- | --------------------------------- |
| `VITE_BETA_GATE_ENABLED` | `true`         | Active le BetaKeyGate sur /signup |
| `VITE_SENTRY_DSN`        | `<DSN sentry>` | Cf Section F.2                    |
| `VITE_APP_ENV`           | `production`   | Discriminer logs Sentry           |

> Les variables Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) sont deja configurees pour PROD.

### B.2 Redeploy

Apres ajout des env vars, **redeployer** la production (sinon les vars ne sont pas prises en compte) :

```
Vercel Dashboard > Deployments > [dernier deploy main] > "..." > "Redeploy"
```

Verifier apres deploy :

- `https://naturegraph.fr/signup` affiche le BetaKeyGate (input "NG-XXXX-XXXX")
- `https://naturegraph.fr/waitlist` affiche le formulaire
- `https://naturegraph.fr/admin` redirige vers `/login` si non authentifie

---

## Section C — Bootstrap super_admin (Nicolas)

> **CRITIQUE** : Nicolas DOIT etre super_admin sinon impossible d'acceder a /admin/\* et de generer des cles.

### C.1 Recuperer l'UUID utilisateur

```sql
-- Sur Supabase Dashboard PROD > SQL Editor :
SELECT id, email FROM auth.users WHERE email = 'tralorui@gmail.com';
-- Note l'UUID
```

### C.2 Inserer dans admin_users

```sql
INSERT INTO admin_users (user_id, role, is_active, notes)
VALUES (
  '<UUID_RECUPERE>',
  'super_admin',
  true,
  'Bootstrap initial — fondateur Nicolas'
);
```

### C.3 Verifier

```sql
-- Doit retourner 1 row avec role='super_admin', is_active=true
SELECT au.*, u.email
FROM admin_users au
JOIN auth.users u ON u.id = au.user_id
WHERE u.email = 'tralorui@gmail.com';
```

### C.4 Tester l'acces

1. Se connecter sur `https://naturegraph.fr/login` avec le compte Nicolas
2. Aller sur `https://naturegraph.fr/admin`
3. Verifier : badge "super_admin" dans le header, 5 modules visibles (Dashboard / Users / Moderation / Beta / Audit)

> Si redirection vers `/home` : verifier que `admin_users.is_active=true` et que la session est rafraichie (F5).

---

## Section D — Generation premieres cles beta

### D.1 Via l'interface /admin/beta

1. Aller sur `https://naturegraph.fr/admin/beta`
2. Cliquer "Generer 10 cles (vague 1)"
3. Confirmer

**Resultat attendu** : 10 nouvelles cles `NG-XXXX-XXXX` apparaissent dans la liste, avec :

- `batch_number: 1`
- `is_active: true`
- `current_uses: 0 / max_uses: 1`
- `expires_at: now() + 7 jours`

### D.2 Verifier en SQL

```sql
SELECT code, batch_number, is_active, expires_at, created_at
FROM beta_access_keys
WHERE batch_number = 1
ORDER BY created_at DESC;
```

### D.3 Copier les codes

Depuis l'interface admin, cliquer l'icone "Copier" a cote de chaque cle pour la mettre dans le clipboard.

Stocker dans un fichier local **TEMPORAIRE** (NE PAS commit !) :

```
cles-vague-1.txt :
NG-ABCD-1234   →  bob@email.com
NG-EFGH-5678   →  alice@email.com
...
```

> **Securite** : ne JAMAIS commiter ce fichier. Le supprimer apres envoi des invitations.

---

## Section E — Envoi invitations testeurs

### E.1 Template email (FR)

```
Sujet : Tu es invite(e) a la beta fermee de Naturegraph

Salut [Prenom],

Tu fais partie des 50 premiers testeurs de Naturegraph, la plateforme
citoyenne pour partager tes observations de biodiversite ! 🌱

Pour creer ton compte :
1. Va sur https://naturegraph.fr/signup
2. Entre ta cle d'acces : **NG-XXXX-XXXX**
3. Complete l'inscription (~3 min)
4. Onboarding en 4 etapes pour personnaliser ton profil

⚠️ La cle est a usage unique et expire dans 7 jours.

On compte sur tes retours pour ameliorer Naturegraph :
- 📧 Reponds a ce mail
- 💬 Rejoins notre Discord [lien]

Merci d'etre la des le debut !
Nicolas — Fondateur Naturegraph
```

### E.2 Suivre les conversions

Apres 24-48h, verifier le taux de conversion :

```sql
-- Sur Supabase Dashboard PROD :

-- 1. Cles utilisees vs generees (vague 1)
SELECT
  COUNT(*) FILTER (WHERE current_uses > 0) AS utilisees,
  COUNT(*) AS generees,
  ROUND(100.0 * COUNT(*) FILTER (WHERE current_uses > 0) / COUNT(*), 1) AS taux_pct
FROM beta_access_keys
WHERE batch_number = 1;

-- 2. Tentatives signups (succes vs echecs)
SELECT outcome, COUNT(*)
FROM beta_signup_log
WHERE created_at > now() - interval '7 days'
GROUP BY outcome
ORDER BY COUNT(*) DESC;

-- 3. Quota actuel
SELECT current_user_count, max_users_total, accepting_new_signups
FROM beta_quota_config WHERE id = 1;
```

### E.3 Gestion waitlist

Si users sans cle s'inscrivent sur la waitlist :

1. Aller sur `https://naturegraph.fr/admin/beta`
2. Section "Waitlist" : voir les emails en attente
3. Quand quota libere (revoke / desactivation), generer nouvelles cles et envoyer aux waitlist

---

## Section F — Monitoring 7 premiers jours

### F.1 Daily check (5 min/jour)

Chaque matin, aller sur `https://naturegraph.fr/admin` et verifier :

| Module    | Quoi regarder              | Seuil alerte                        |
| --------- | -------------------------- | ----------------------------------- |
| Dashboard | Signalements ouverts       | > 5 = a traiter ce jour             |
| Beta      | Cles utilisees vs generees | < 30% apres 48h = relancer testeurs |
| Audit     | Activite suspecte          | Banissements > 0 = investiguer      |

### F.2 Setup Sentry (optionnel mais recommande)

Si pas encore fait, installer Sentry pour les erreurs JS :

```bash
# Installer la dep (lazy-load via src/lib/monitoring.ts deja en place)
npm install @sentry/react
git add package.json package-lock.json
git commit -m "chore(monitoring): install @sentry/react for production errors"
git push
```

Puis sur Vercel : ajouter `VITE_SENTRY_DSN=<from Sentry dashboard>` et redeployer.

Verifier sur https://sentry.io que les erreurs remontent (declencher une erreur volontaire ou attendre).

### F.3 Supabase Advisors

Une fois par semaine, lancer l'audit advisors :

```
MCP supabase : get_advisors --type security --project_id <PROD_REF>
MCP supabase : get_advisors --type performance --project_id <PROD_REF>
```

Si nouveaux warnings : creer une issue GitHub, traiter dans le sprint suivant.

### F.4 Logs Edge Function

Surveiller les rate-limits / erreurs sur `validate-beta-key` :

```
Supabase Dashboard > Edge Functions > validate-beta-key > Logs
```

Si beaucoup de `rate_limited` : ajuster le rate limit (5/IP/10min actuellement, code in-memory).

---

## Section G — Procedures de rollback

### G.1 Desactiver la beta gate (rollback rapide)

Si gros probleme avec le BetaKeyGate :

```
Vercel > Env Vars > Production > VITE_BETA_GATE_ENABLED = false
Redeploy
```

Resultat : `/signup` revient au formulaire classique (sans cle requise).

### G.2 Bloquer tous les signups

```sql
UPDATE beta_quota_config
SET accepting_new_signups = false
WHERE id = 1;
```

L'Edge Function `validate-beta-key` retournera `quota_full` pour toute tentative.

### G.3 Desactiver toutes les cles d'une vague

```sql
UPDATE beta_access_keys
SET is_active = false
WHERE batch_number = 1;
```

### G.4 Suspendre temporairement /admin

Si compromis admin :

```sql
-- Desactiver tous les admins (sauf super_admin)
UPDATE admin_users SET is_active = false WHERE role != 'super_admin';
```

Le super_admin peut ensuite re-activer selectivement.

---

## Section H — Checklist finale avant launch

Cocher chaque element avant d'envoyer les invitations testeurs :

- [ ] Migrations beta + admin appliquees sur PROD (Section A.1)
- [ ] Edge Function `validate-beta-key` ACTIVE sur PROD (A.3)
- [ ] `VITE_BETA_GATE_ENABLED=true` dans Vercel PROD (B.1)
- [ ] Vercel redeploye apres ajout env vars (B.2)
- [ ] Nicolas inscrit dans `admin_users` comme `super_admin` (C.2)
- [ ] Test acces `/admin` reussi (C.4)
- [ ] Generation 10 cles vague 1 reussie (D.1)
- [ ] Template email prepare (E.1)
- [ ] Liste 10 testeurs validee
- [ ] Sentry configure OU planifie pour BATCH 36 (F.2)
- [ ] Daily check planifie (F.1)
- [ ] Procedures de rollback connues de l'equipe (G.x)

---

## Contacts urgence

- **Founder** : Nicolas — tralorui@gmail.com
- **Supabase support** (paid plan) : support@supabase.com
- **Vercel support** : https://vercel.com/help
- **Sentry support** : https://sentry.io/support

---

**Refs** :

- `docs/BETA_CLOSED_ACCESS_STRATEGY.md` v2.0 — Strategie complete
- `docs/ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md` v2.0 — Strategie admin MVP
- `docs/devops/monitoring.md` — Stack monitoring details
- `docs/devops/deployment.md` — Process deploy general
- `supabase/migrations/20260514_beta_admin_system.sql` — Migration SQL
- `supabase/functions/validate-beta-key/index.ts` — Edge Function
