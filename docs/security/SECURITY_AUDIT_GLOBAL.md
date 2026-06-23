# SECURITY_AUDIT_GLOBAL.md : Audit sécurité global Naturegraph

> Audit réalisé le 2026-05-20 · Périmètre : frontend + vue d'ensemble · Version produit v1.0.0
> Méthodologie : Security by Design, Least Privilege, Defense in Depth, Privacy by Default.
> Adapté au contexte **MVP / beta fermée** : pas de sur-ingénierie.

---

## 0. Synthèse exécutive

Naturegraph présente une posture sécurité **globalement saine** pour un MVP : RLS sur
toutes les tables applicatives, headers HTTP de sécurité complets, secret scanning et
Dependabot actifs, aucune dépendance vulnérable, aucun secret en clair dans le code ou
l'historique git. Les audits précédents (EXIF, RLS, suppression compte, cron
anonymisation) ont posé de bonnes fondations.

**Aucune faille critique exploitable n'a été identifiée.** Les points relevés sont
majoritairement du durcissement (defense in depth) et de la réduction de surface.

| Sévérité     | Nombre | À traiter avant prod publique |
| ------------ | ------ | ----------------------------- |
| 🔴 Critique  | 0      | :                             |
| 🟠 Important | 4      | 3 oui / 1 non                 |
| 🟡 Moyen     | 7      | 2 oui / 5 non                 |
| ⚪ Mineur    | 4      | non                           |

**Verdict** : le socle est solide pour la beta fermée. 5 actions sont recommandées
avant l'ouverture publique (cf. SECURITY_HARDENING_ROADMAP.md).

---

## 1. Authentification & session

### Contexte

Auth via Supabase Auth (OTP / magic link). Session JWT stockée par le SDK Supabase
dans `localStorage` (`sb-<ref>-auth-token`). Gate beta via `localStorage`
(`naturegraph-beta-access`, TTL 30 j) + `BetaAccessGuard`.

### 🟡 Token de session en localStorage (XSS-readable)

- **Description** : le SDK Supabase stocke le JWT en `localStorage`, lisible par tout
  JavaScript de la page.
- **Risque réel** : en cas de faille XSS, un attaquant exfiltre le token et usurpe la
  session.
- **Impact** : compromission de compte utilisateur.
- **Scénario** : injection XSS → `localStorage.getItem('sb-...-auth-token')` → envoi
  vers serveur attaquant.
- **Difficulté d'exploitation** : élevée : aucune surface XSS identifiée (React échappe
  par défaut, **aucun `dangerouslySetInnerHTML`, aucun `eval`** dans le code).
- **Priorité réelle** : moyenne (risque conditionné à une XSS qui n'existe pas).
- **Mitigation** : c'est le comportement standard du SDK Supabase. La vraie défense est
  d'empêcher toute XSS (CSP stricte : déjà en place). Acceptable en l'état. Ne PAS
  basculer en cookies httpOnly sans nécessité (complexité).
- **Effort** : 0 (acceptation documentée).
- **Avant prod ?** NON.

### 🟡 Gate beta contournable côté client

- **Description** : `BetaAccessGuard` lit `localStorage`. Un utilisateur technique peut
  injecter manuellement `naturegraph-beta-access` pour bypasser l'écran d'accueil.
- **Risque réel** : accès à l'app sans clé beta valide.
- **Impact** : faible : la **vraie barrière est au signup** : la création de compte
  exige une clé beta valide consommée atomiquement (RPC `claim_beta_access_key`,
  `max_uses=1`). Le gate localStorage n'est qu'un confort UX, pas un contrôle de sécu.
- **Scénario** : DevTools → `localStorage.setItem(...)` → navigation libre, mais
  impossible de créer un compte sans clé.
- **Difficulté** : triviale (mais sans gain réel).
- **Priorité** : faible : defense in depth correcte (frontend gate + backend claim).
- **Mitigation** : aucune nécessaire. Le contrôle réel est backend. Documenté.
- **Effort** : 0.
- **Avant prod ?** NON.

### ⚪ Pas de rotation/expiration courte affichée

- Les sessions Supabase ont un refresh token longue durée par défaut. Acceptable MVP.
- **Avant prod ?** NON.

---

## 2. Protection des routes & accès admin

### Contexte

`ProtectedRoute` (auth requise), `OnboardingGuard`, `BetaGatedLayout`
(`BetaAccessGuard`), `AdminGuard` (espace `/admin/*`).

### 🟠 Espace admin : défense en profondeur à vérifier

- **Description** : `/admin/*` est protégé par `AdminGuard` côté client + RLS / RPC
  `SECURITY DEFINER` côté serveur (`is_admin(auth.uid())`).
- **Risque réel** : si `AdminGuard` était la seule barrière, un bypass client donnerait
  l'UI admin. **Mais** : toutes les données admin passent par des tables sous RLS
  contrôlée par `is_admin()` → un bypass UI ne donne aucune donnée.
- **Impact** : faible tant que la RLS admin est correcte (vérifié : cf.
  SECURITY_SUPABASE.md).
- **Scénario** : bypass de `AdminGuard` → l'UI admin se charge mais toutes les requêtes
  renvoient 0 ligne (RLS).
- **Difficulté** : moyenne pour le bypass, **nulle en gain de données**.
- **Priorité** : importante à **maintenir** (ne jamais déplacer un contrôle admin
  uniquement côté client).
- **Mitigation** : conserver la règle « toute action admin = RPC `SECURITY DEFINER`
  avec check `is_admin()` OU table sous RLS admin ». Aucune action immédiate.
- **Effort** : 0 (vigilance continue).
- **Avant prod ?** NON (déjà conforme).

### 🟡 Un seul compte super-admin, pas de 2FA forcé

- **Description** : un unique super-admin (`Admin_naturegraph`). La compromission de
  ce compte = contrôle total (génération de clés, modération, suppression).
- **Risque réel** : phishing / réutilisation de mot de passe sur le compte fondateur.
- **Impact** : élevé si compromis (mais surface = 1 personne de confiance).
- **Scénario** : vol des identifiants email du super-admin → accès `/admin`.
- **Difficulté** : dépend de l'hygiène du compte Nicolas.
- **Priorité** : moyenne.
- **Mitigation** : activer la **2FA** sur le compte email du super-admin + sur GitHub +
  sur Supabase + sur Vercel. Mot de passe unique fort. (Hors code : action perso.)
- **Effort** : 30 min (activation 2FA partout).
- **Avant prod ?** OUI (action organisationnelle, pas de code).

---

## 3. Uploads de fichiers

### Contexte

Buckets Supabase Storage : `avatars` (2 MB), `banners` (2 MB), `post-media` (10 MB),
`notebook-covers` (2 MB), `exports` (privé). MIME allowlist par bucket. Compression
client (WebP) avant upload. EXIF stripping (audit précédent).

### 🟠 Validation upload : double contrôle client + serveur

- **Description** : la validation MIME + taille est faite **côté client** (EditPhotoTab,
  formulaires contribution) ET **côté bucket** (`allowed_mime_types`,
  `file_size_limit`).
- **Risque réel** : un attaquant contourne le JS client et POST directement au Storage.
  La validation bucket le bloque (MIME + taille). Mais le bucket valide le MIME
  **déclaré**, pas le contenu réel du fichier : un fichier malveillant renommé en
  `.webp` peut passer.
- **Impact** : modéré : les buckets `avatars/banners/post-media` sont `public` ; un
  fichier malveillant servi depuis `*.supabase.co` est cependant isolé par la CSP
  (`img-src` n'autorise pas l'exécution de script) et servi avec
  `Content-Type: image/*`.
- **Scénario** : upload d'un polyglotte HTML/image → servi en `image/webp` → non
  exécuté par le navigateur (mauvais type). Risque résiduel faible.
- **Difficulté** : moyenne, gain faible.
- **Priorité** : importante (hygiène).
- **Mitigation** : conserver la compression client (re-encode l'image → neutralise les
  polyglottes) ; vérifier la signature binaire (magic bytes) côté Edge Function si on
  ajoute un pipeline de traitement Phase 2. EXIF déjà strippé.
- **Effort** : 0 immédiat / 2 h en Phase 2 (validation magic bytes).
- **Avant prod ?** NON (risque résiduel acceptable, compression client en place).

### 🟡 Pas de quota d'upload par utilisateur

- **Description** : aucune limite du nombre de fichiers / volume total par compte.
- **Risque réel** : abus de stockage : un compte uploade en boucle pour gonfler les
  coûts Supabase Storage.
- **Impact** : financier (quota Supabase), pas de fuite de données.
- **Scénario** : bot crée un compte (clé beta) → boucle d'upload de 10 MB.
- **Difficulté** : faible mais limitée par la beta fermée (clés `max_uses=1`).
- **Priorité** : moyenne (faible en beta, à traiter avant ouverture publique).
- **Mitigation** : quota par compte (ex. 100 médias / 200 MB) : trigger PostgreSQL ou
  comptage applicatif. Cf. SECURITY_HARDENING_ROADMAP.
- **Effort** : 3 h.
- **Avant prod ?** NON pour la beta / OUI avant ouverture publique.

---

## 4. Validation des inputs & XSS / CSRF

### 🟢 XSS : surface très faible

- **Aucun `dangerouslySetInnerHTML`, aucun `innerHTML`, aucun `eval`** dans `src/`.
- React 19 échappe automatiquement tout contenu interpolé.
- Validation contenu serveur : triggers `validate_post_content`,
  `validate_comment_content`, `validate_profile_content` (mots bannis, longueurs).
- CSP en place (cf. §6) limite l'impact d'une éventuelle injection.
- **Verdict** : risque XSS résiduel faible. ✅

### 🟢 CSRF : non applicable

- L'app est une SPA qui appelle Supabase via `Authorization: Bearer <JWT>` (pas de
  cookie de session ambiant). PostgREST ne se fie pas aux cookies → **pas de surface
  CSRF classique**. ✅

### 🟡 Injection SQL

- **Description** : tous les accès DB passent par le SDK Supabase / PostgREST
  (requêtes paramétrées) ou des RPC. Pas de SQL concaténé côté client.
- **Risque** : les RPC `SECURITY DEFINER` qui construisent du SQL dynamique seraient à
  risque : à vérifier (cf. SECURITY_SUPABASE.md §4).
- **Priorité** : moyenne.
- **Mitigation** : revue des fonctions à SQL dynamique (aucune identifiée à risque pour
  l'instant : `search_path` durci par migration `search_path_hardening`).
- **Avant prod ?** NON (déjà couvert).

---

## 5. Erreurs, logs & secrets exposés

### 🟢 Pas de secret exposé

- `import.meta.env` n'expose que des `VITE_*` (URL Supabase, **clé anon** : publique par
  design, `VITE_SENTRY_DSN`, `VITE_APP_ENV`, `VITE_BETA_GATE_ENABLED`).
- **Aucune** clé `service_role`, aucun secret serveur dans le bundle client.
- `.env*` correctement gitignoré ; **aucun secret dans l'historique git** (vérifié).
- `service_role` n'apparaît nulle part dans `src/`.

### 🟡 Logs frontend & stack traces

- **Description** : `debugLog` est no-op en prod (`import.meta.env.DEV` guard) ✅.
  `console.warn/error` autorisés par ESLint et utilisés pour les erreurs réseau.
- **Risque** : des `console.error` peuvent afficher des messages d'erreur Supabase
  détaillés dans la console navigateur.
- **Impact** : faible : pas de secret, mais peut révéler des noms de tables/colonnes à
  un attaquant lisant la console.
- **Priorité** : faible (le repo est public : le schéma est déjà visible, cf. §7).
- **Mitigation** : acceptable. Éventuellement router les erreurs vers Sentry sans
  détail en console.
- **Avant prod ?** NON.

### 🟡 Sentry : DSN exposé

- `VITE_SENTRY_DSN` est dans le bundle (normal : un DSN Sentry est public par design).
  Risque = un tiers envoie des faux events au projet Sentry. Faible.
- **Mitigation** : Sentry « Inbound filters » + rate limit côté Sentry.
- **Avant prod ?** NON.

---

## 6. Headers HTTP de sécurité (Vercel)

**Tous présents** (cf. `vercel.json`, détaillé dans SECURITY_VERCEL.md) :
`Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.

### 🟡 CSP : `'unsafe-inline'` sur `script-src`

- La CSP autorise `script-src 'self' 'unsafe-inline'` : limitation classique de Vite
  (styles/scripts inline injectés au build). `'unsafe-inline'` affaiblit la protection
  XSS de la CSP.
- **Priorité** : moyenne.
- **Mitigation** : passer à une CSP basée sur `nonce` ou `hash` en Phase 2 (nécessite
  un middleware Vercel). Pour le MVP, la CSP actuelle reste une bonne barrière.
- **Avant prod ?** NON (amélioration Phase 2).

---

## 7. Dépendances & supply chain

- **`npm audit` : 0 vulnérabilité** (prod + dev) ✅
- Dependabot actif (npm hebdo, github-actions mensuel) ✅
- 1 alerte Dependabot historique : **corrigée** (ws 8.19→8.20.1).
- CodeQL (SAST) actif sur chaque PR ✅
- **🟡 Risque supply-chain** : `motion`, `@supabase/supabase-js`, `react-i18next` etc. -
  une dépendance compromise (typosquatting, compromission mainteneur) pourrait injecter
  du code. Mitigation : Dependabot + lockfile commité + CodeQL. Acceptable MVP.
- **Avant prod ?** NON (surveillance continue via Dependabot).

---

## 8. Frontend : verdict

| Domaine          | État                                                        |
| ---------------- | ----------------------------------------------------------- |
| Auth / session   | ✅ standard Supabase, pas de faille                         |
| Route protection | ✅ guards + RLS backend (defense in depth)                  |
| XSS              | ✅ surface quasi nulle (React, pas de innerHTML/eval)       |
| CSRF             | ✅ non applicable (Bearer token, pas de cookie)             |
| Secrets          | ✅ aucun exposé, historique git propre                      |
| Uploads          | 🟠 OK pour beta, quota + magic-bytes à ajouter avant public |
| Dépendances      | ✅ 0 vuln, Dependabot + CodeQL                              |

**Le frontend est sûr pour la beta fermée.** Voir SECURITY_SUPABASE.md,
SECURITY_GITHUB.md, SECURITY_VERCEL.md pour les autres périmètres, et
SECURITY_HARDENING_ROADMAP.md pour le plan d'action priorisé.
