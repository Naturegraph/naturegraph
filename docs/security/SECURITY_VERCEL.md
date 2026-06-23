# SECURITY_VERCEL.md : Audit sécurité Vercel

> Audit réalisé le 2026-05-20 · Projet Vercel `naturegraph` (équipe `naturegraph-9868s-projects`)

---

## 0. Synthèse

L'hébergement Vercel est **correctement configuré** : headers de sécurité HTTP
complets, SPA rewrites propres, déploiements protégés par Vercel Authentication.
Les points à traiter concernent la gestion des variables d'environnement par
environnement et l'accès des testeurs.

| Sévérité     | Nombre |
| ------------ | ------ |
| 🔴 Critique  | 0      |
| 🟠 Important | 1      |
| 🟡 Moyen     | 3      |
| ⚪ Mineur    | 1      |

---

## 1. Headers HTTP de sécurité

### 🟢 Headers complets (`vercel.json`)

Tous appliqués sur `/(.*)` :

| Header                      | Valeur                            | Verdict               |
| --------------------------- | --------------------------------- | --------------------- |
| `Strict-Transport-Security` | présent                           | ✅ HTTPS forcé        |
| `Content-Security-Policy`   | `default-src 'self'` + allowlists | ✅ (cf. §1.1)         |
| `X-Frame-Options`           | `DENY`                            | ✅ anti-clickjacking  |
| `X-Content-Type-Options`    | `nosniff`                         | ✅ anti MIME-sniffing |
| `Referrer-Policy`           | présent                           | ✅                    |
| `Permissions-Policy`        | présent                           | ✅                    |
| `Cache-Control`             | présent                           | ✅                    |

### 🟡 1.1 : CSP : `'unsafe-inline'` sur `script-src`

- **Description** : CSP =
  `default-src 'self'; script-src 'self' 'unsafe-inline' https://*.vercel-insights.com
https://*.sentry.io; style-src 'self' 'unsafe-inline' …; img-src 'self' data: blob:
https://*.supabase.co …; connect-src 'self' https://*.supabase.co wss://*.supabase…`.
- **Risque réel** : `'unsafe-inline'` sur `script-src` réduit la protection CSP contre
  une éventuelle injection de script inline. Limitation classique de Vite (scripts de
  bootstrap inline).
- **Impact** : faible : couplé à l'absence de `dangerouslySetInnerHTML`/`eval`, la
  surface d'injection inline est quasi nulle.
- **Difficulté** : élevée (il faut d'abord une XSS).
- **Priorité** : moyenne.
- **Mitigation** : CSP basée sur `nonce` (middleware Vercel) en Phase 2. Le `connect-src`
  et `img-src` restreints sont déjà une bonne barrière.
- **Effort** : 3-4 h (Phase 2).
- **Avant prod ?** NON.

---

## 2. Variables d'environnement

### 🟠 Cloisonnement des environnements Vercel

- **Description** : Vercel gère des variables par scope (Production / Preview /
  Development). L'app utilise `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_SENTRY_DSN`, `VITE_APP_ENV`, `VITE_BETA_GATE_ENABLED`.
- **Risque réel** : si la **même** clé Supabase est utilisée en Production et en Preview,
  un déploiement Preview (URL devinable, partagée en PR) tape la **base de
  production**. Les commentaires du repo (`.env.example`) prévoient pourtant
  `naturegraph-dev` (preview/staging) vs `naturegraph-prod` (production).
- **Impact** : modéré : un testeur sur une URL Preview pourrait écrire en prod ; les
  données de test polluent la prod.
- **Scénario** : PR ouverte → déploiement Preview public → écritures dans la base prod.
- **Difficulté** : faible (pas une attaque, plutôt un risque opérationnel).
- **Priorité** : importante.
- **Mitigation** : dans Vercel → Settings → Environment Variables, vérifier que :
  - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` **Production** pointent sur le projet
    de prod, **Preview/Development** sur le projet de dev.
  - `VITE_APP_ENV` distinct par environnement.
  - Aucune clé `service_role` n'est dans les variables `VITE_*` (elles sont
    embarquées dans le bundle client !). Les secrets serveur (service*role) doivent
    être des variables \*\*non-`VITE*`\*\* réservées aux Edge Functions Supabase, pas à
    Vercel.
- **Effort** : 30 min (vérification + correction).
- **Avant prod ?** OUI.

### 🟡 Rappel : `VITE_*` = public

- Toute variable `VITE_*` est **embarquée en clair dans le bundle JavaScript** livré au
  navigateur. C'est correct pour l'URL Supabase et la clé `anon` (publiques par
  design). **Ne jamais** y mettre un secret. Vérifié : aucun secret côté front.

---

## 3. Déploiements Preview & protection

### 🟢 Vercel Authentication sur les déploiements

- Les URLs de déploiement (`naturegraph-<hash>-…vercel.app`) sont protégées par
  **Vercel Authentication** (SSO) : vérifié lors de l'audit (un `curl` non authentifié
  est redirigé vers `vercel.com/sso-api`).
- **Bénéfice** : les Preview deployments ne fuient pas : un lien de PR ne donne pas
  accès à l'app à un tiers. ✅ Bonne protection anti-leak.

### 🟡 Accès des testeurs beta

- **Conséquence** : pour que les **5 testeurs beta** accèdent à l'app, la protection
  Vercel Authentication les bloquera (ils ne sont pas membres de l'équipe Vercel).
- **Mitigation** : deux options -
  1. Pour la **production** (`main`), désactiver Vercel Authentication (Settings →
     Deployment Protection) pour que l'URL prod soit publique : la **gate beta interne**
     (clé d'accès) prend le relais comme contrôle d'accès.
  2. Ou configurer un **Protection Bypass token** partagé aux testeurs.
     → Recommandé : option 1 pour la prod, **garder** Vercel Auth sur les Preview.
- **Effort** : 10 min.
- **Avant prod ?** OUI (sinon les testeurs ne peuvent pas accéder).

### 🟡 Branches déployées

- `vercel.json` : `deploymentEnabled` pour `main`, `staging`, `develop`. Chaque branche
  produit un déploiement. Vérifier que `develop`/`staging` utilisent bien la base de
  **dev** (cf. §2) et restent derrière Vercel Auth.
- **Effort** : inclus dans §2. **Avant prod ?** OUI.

---

## 4. Domaines, logs, accès équipe

### ⚪ Domaine de production

- Domaine cible `naturegraph.fr` (cf. CLAUDE.md). Au branchement DNS : forcer HTTPS
  (HSTS déjà en place), activer le préchargement HSTS une fois stable.
- **Avant prod ?** NON (au moment du branchement DNS).

### 🟡 Accès équipe Vercel

- L'équipe Vercel a accès aux déploiements, logs et variables d'environnement (donc
  potentiellement aux URLs/clés). Principe du moindre privilège : limiter les membres
  de l'équipe Vercel au strict nécessaire, **2FA obligatoire** sur les comptes ayant
  accès. Les **logs runtime** Vercel peuvent contenir des données utilisateurs : accès
  à restreindre.
- **Effort** : 15 min (revue des membres). **Avant prod ?** OUI.

---

## 5. SPA rewrites & caching

### 🟢 Rewrites

- `vercel.json` : `rewrites` renvoie tout (`/((?!assets/|.*\..*).*)`) vers `index.html`
  : pattern SPA correct, n'expose pas de fichiers serveur.

### 🟢 Cache

- `Cache-Control` présent. Vérifier qu'aucune réponse contenant des données
  utilisateurs n'est mise en cache public/CDN (les appels API vont directement à
  Supabase, hors cache Vercel : OK).

---

## 6. Verdict Vercel

| Domaine               | État                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| Headers HTTP sécurité | ✅ complets (CSP, HSTS, X-Frame-Options…)                               |
| CSP                   | 🟡 `'unsafe-inline'` : durcir en Phase 2                                |
| Variables d'env       | 🔴 cloisonnement KO : Preview tape la prod (cf. addendum) ; 0 secret OK |
| Preview protection    | ✅ Vercel Auth (anti-leak)                                              |
| Accès testeurs        | 🟡 désactiver Auth sur prod uniquement                                  |
| Accès équipe          | 🟡 moindre privilège + 2FA                                              |

**Vercel est bien configuré.** Action principale avant prod : vérifier le
cloisonnement des variables d'environnement (prod vs preview) et l'accès des testeurs.

---

## Addendum 2026-06-17 : cloisonnement vérifié (finding confirmé, NG-007)

Vérification effectuée. Constats :

- **Aucun secret côté Vercel** : toutes les variables sont `VITE_*` (publiques par design),
  aucune `service_role`. OK.
- `VITE_APP_ENV` : Production = `production`, Preview = `staging`. OK.
- **🔴 Cloisonnement Supabase KO** : `VITE_SUPABASE_URL` vaut le projet **prod**
  (`hrxgduvworofnrjmgpcj`) **en Production ET en Preview**. Comme `vercel.json` déploie
  `develop` et `staging` en environnement Preview, ces deux branches lisent/écrivent
  actuellement dans la **base de production**. Risque : pollution des données prod par les
  tests, exposition de données réelles sur des URLs preview.
- Nettoyé : 2 variables résiduelles scopées sur la branche morte `feat/v1.2.0-carnets`
  supprimées.

**Pourquoi non corrigé immédiatement** : la sonde du projet dev (`nkgdgxwejqqnqmwqwegy`)
montre qu'il n'est pas à parité (table `app_config` manquante, `species_master` vide,
`taxonomy_nodes` partielle). Repointer Preview vers dev maintenant casserait develop/staging.

**Remédiation obligatoire avant lancement public** :

1. Mettre le projet dev à parité (appliquer toutes les migrations `supabase/migrations/`,
   au moins `app_config` ; seeder `species_master`).
2. Repointer les variables Vercel Preview vers le projet dev (`VITE_SUPABASE_URL` +
   `VITE_SUPABASE_ANON_KEY` format legacy JWT).
3. Redéployer `develop` et valider l'app sur la base dev.
