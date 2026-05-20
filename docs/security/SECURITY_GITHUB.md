# SECURITY_GITHUB.md — Audit sécurité du dépôt GitHub

> Audit réalisé le 2026-05-20 · Dépôt `Naturegraph/naturegraph`

---

## 0. Synthèse

Le dépôt est **bien outillé** : secret scanning + push protection, Dependabot, CodeQL,
branch protection sur `main`, CODEOWNERS, SECURITY.md. **Aucun secret dans
l'historique git.** Le point structurant : le dépôt est **public**.

| Sévérité     | Nombre |
| ------------ | ------ |
| 🔴 Critique  | 0      |
| 🟠 Important | 2      |
| 🟡 Moyen     | 3      |
| ⚪ Mineur    | 2      |

---

## 1. Visibilité du dépôt

### 🟠 Dépôt PUBLIC

- **Description** : `Naturegraph/naturegraph` est en visibilité **public**. Tout le
  code, l'historique, les workflows, le schéma SQL (`supabase/migrations/`), la logique
  RLS et le code des Edge Functions sont visibles de tous.
- **Risque réel** : un attaquant connaît **exactement** la surface : noms de tables, de
  fonctions RPC, logique des policies RLS, structure des Edge Functions. Le « security
  through obscurity » est nul → **toute la sécurité repose sur la robustesse réelle**
  (RLS, autorisations), pas sur le secret du code.
- **Impact** : indirect — pas une faille en soi, mais ça relève le niveau d'exigence :
  aucune erreur RLS n'est « cachée ».
- **Scénario** : reconnaissance — l'attaquant lit `supabase/migrations/` pour cartographier
  la DB et cibler les RPC.
- **Difficulté** : nulle (lecture publique).
- **Priorité** : importante — **décision à prendre consciemment**.
- **Mitigation** : deux options légitimes —
  1. **Garder public** (open-source, transparence — cohérent avec une plateforme
     citoyenne) : alors RLS et autorisations doivent être **irréprochables** (c'est le
     cas aujourd'hui) + ne JAMAIS commiter de secret.
  2. **Passer en privé** jusqu'à maturité : réduit la reconnaissance, recommandé si on
     n'est pas certain de la robustesse RLS.
     → Recommandation : **acceptable de rester public** vu la qualité RLS actuelle, MAIS
     décision explicite à acter par Nicolas. Si public : désactiver le **forking** non
     nécessaire.
- **Effort** : 0 (décision) / 1 clic (forking, visibilité).
- **Avant prod ?** OUI — trancher consciemment public vs privé.

### 🟡 `allow_forking: true`

- Le fork est autorisé. Sur un repo public, n'importe qui peut forker. Pas un risque de
  sécurité direct (le code est déjà public) mais inutile.
- **Mitigation** : désactiver le forking si on garde le repo public (Settings → General).
- **Effort** : 1 clic. **Avant prod ?** NON (cosmétique).

---

## 2. Branch protection

### État actuel

| Branche   | enforce_admins | linear history | force push | conv. resolution | status checks | reviews requises |
| --------- | :------------: | :------------: | :--------: | :--------------: | :-----------: | :--------------: |
| `main`    |       ✅       |       ✅       | ❌ bloqué  |        ✅        |  CI + CodeQL  |      **0**       |
| `staging` |       ❌       |       —        | ❌ bloqué  |        ✅        |  CI + CodeQL  |        0         |
| `develop` |       ❌       |       —        | ❌ bloqué  |        ✅        |  CI + CodeQL  |        0         |

### 🟡 0 review requise sur `main`

- **Description** : aucune approbation de PR n'est obligatoire pour merger sur `main`.
- **Risque réel** : un compte GitHub compromis (ou une erreur) peut merger n'importe
  quoi en production sans 4-yeux.
- **Impact** : modéré — mais le projet est mono-mainteneur (Nicolas), donc « 1 review
  requise » serait auto-bloquant. Les status checks (CI + CodeQL) compensent
  partiellement (le code doit passer lint/test/build/SAST).
- **Scénario** : compromission du compte GitHub de Nicolas → push direct impossible
  (`main` protégée) mais merge de PR malveillante possible.
- **Difficulté** : nécessite de compromettre le compte fondateur.
- **Priorité** : moyenne — la vraie mitigation est la **2FA GitHub** (cf. §3).
- **Mitigation** : garder 0 review tant que mono-mainteneur (sinon blocage). Dès qu'un
  2ᵉ contributeur arrive → passer à 1 review obligatoire. **2FA GitHub obligatoire**
  entre-temps.
- **Effort** : 0 maintenant / 1 clic quand l'équipe grandit.
- **Avant prod ?** NON (mais 2FA OUI).

### 🟡 `staging` / `develop` sans `enforce_admins`

- Les admins peuvent contourner la protection sur staging/develop. Acceptable (ce ne
  sont pas la prod), c'est même nécessaire pour les merges de cascade. Documenté.
- **Avant prod ?** NON.

---

## 3. Comptes, accès, 2FA, commits signés

### 🟠 2FA & commits signés — à confirmer

- **Description** : `web_commit_signoff_required: false`, et la signature GPG des
  commits n'est pas imposée. Le statut 2FA du compte Nicolas n'est pas vérifiable par
  l'audit code.
- **Risque réel** : sans 2FA, le compte fondateur (= accès total : repo, secrets,
  déploiements) est vulnérable au phishing / réutilisation de mot de passe.
- **Impact** : **élevé** — un compte compromis = contrôle du code de production.
- **Scénario** : phishing du compte GitHub → merge de code malveillant → déployé par
  Vercel.
- **Difficulté** : dépend de l'hygiène du compte.
- **Priorité** : importante.
- **Mitigation** :
  1. **Activer la 2FA** sur le compte GitHub de Nicolas (idéalement TOTP/clé physique,
     pas SMS).
  2. Activer **« Require 2FA »** au niveau de l'organisation `Naturegraph` (Settings →
     Authentication security).
  3. Optionnel : signature des commits (gpg/ssh) — confort, non bloquant MVP.
- **Effort** : 30 min.
- **Avant prod ?** OUI (action organisationnelle).

### 🟢 CODEOWNERS

- `.github/CODEOWNERS` présent : `* @nicolas-douaron` + `/docs/` + `*.md`. Cohérent
  pour un mono-mainteneur. ✅

---

## 4. Secrets & scanning

### 🟢 Outils de protection actifs

- **Secret scanning** : activé ✅
- **Secret scanning push protection** : activé ✅ (bloque un push contenant un secret)
- **Dependabot security updates** : activé ✅
- `secret_scanning_non_provider_patterns` : désactivé — 🟡 mineur, à activer pour
  détecter aussi les patterns de secrets génériques (clés custom). 1 clic.
- `secret_scanning_validity_checks` : désactivé — 🟡 mineur, à activer (vérifie si un
  secret détecté est encore actif). 1 clic.

### 🟢 Historique git propre

- **Aucun fichier `.env` / `.env.local` / `.env.production` dans l'historique** complet.
- `.gitignore` couvre `.env` et `.env.*` (sauf `.env.example`).
- Aucune occurrence de `service_role`, `sk_live`, `secret_key` dans `src/`.

### 🟡 Secrets de dépôt / Actions

- `gh secret list` n'a rien renvoyé — soit aucun secret de dépôt, soit secrets au
  niveau organisation/environnement. Les workflows CI (ci.yml) qui touchent Supabase
  utilisent probablement des secrets d'environnement GitHub.
- **Mitigation** : vérifier que les secrets CI (clés Supabase de test, tokens) sont
  bien des **secrets d'environnement** scoperés, jamais en clair dans les YAML, et
  rotés si jamais exposés. Principe du moindre privilège : un token CI ne doit avoir
  que les droits nécessaires.
- **Effort** : 30 min (revue). **Avant prod ?** OUI (vérification).

---

## 5. Workflows GitHub Actions

3 workflows : `ci.yml` (lint/test/build), `ci-health.yml`, `codeql.yml` (SAST).

### 🟡 Durcissement des workflows

- **Description** : les workflows Actions sont une surface supply-chain (une action
  tierce compromise peut exfiltrer des secrets).
- **Mitigation recommandée** :
  1. Épingler les actions tierces à un **SHA de commit** (pas juste `@v4`) pour les
     actions non-officielles.
  2. `permissions:` minimal explicite en tête de chaque workflow (`contents: read` par
     défaut, élargi seulement si besoin).
  3. Pas de `pull_request_target` avec checkout de code non fiable.
- **Priorité** : moyenne.
- **Effort** : 1 h.
- **Avant prod ?** NON (durcissement, à faire en Phase 2).

---

## 6. SECURITY.md

### 🟢 Présent

- `.github/SECURITY.md` existe (politique de sécurité + versions supportées).
- **🟡 À compléter** : ajouter un canal de **divulgation responsable** clair (email
  dédié type `security@naturegraph.fr` ou usage des _Private Vulnerability Reporting_
  GitHub) + délai d'engagement de réponse. Activer **Private Vulnerability Reporting**
  dans Settings → Security.
- **Effort** : 30 min. **Avant prod ?** OUI (avant exposition publique).

---

## 7. Verdict GitHub

| Domaine                           | État                                      |
| --------------------------------- | ----------------------------------------- |
| Secret scanning / push protection | ✅ actif                                  |
| Dependabot + CodeQL               | ✅ actif                                  |
| Historique git                    | ✅ aucun secret                           |
| Branch protection `main`          | ✅ solide (0 review = OK mono-mainteneur) |
| Visibilité publique               | 🟠 décision consciente à acter            |
| 2FA compte fondateur              | 🟠 à activer + imposer org-wide           |
| SECURITY.md / disclosure          | 🟡 compléter le canal de signalement      |
| Workflows hardening               | 🟡 Phase 2 (SHA pinning, permissions)     |

**Le dépôt est bien protégé.** Actions avant prod : 2FA (30 min), décision
public/privé, compléter SECURITY.md, vérifier les secrets CI.
