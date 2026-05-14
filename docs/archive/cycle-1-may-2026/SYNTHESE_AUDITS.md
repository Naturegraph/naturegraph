# Naturegraph — Synthèse des audits & causes racines

> **Version** : 1.0 — 2026-05-02
> **Source** : convergences entre `USER_STORIES.md`, `AUDIT_FLOWS.md`, `AUDIT_TECHNIQUE.md`, `AUDIT_PERFORMANCE.md`, `AUDIT_LEGAL.md`, `AUDIT_SUPABASE.md`
> **Posture** : analyse causale (root causes), pas symptomatique. Priorité absolue à la conformité légale.
> **Objectif** : vue claire AVANT cleanup / refactor / optimisation.

---

# Méthodologie

Pour chaque problème détecté dans 2+ audits, je remonte la **cause racine** et regroupe les symptômes. Cela évite de fixer 22 fois le même problème de surface.

**Hiérarchie d'analyse** :

1. **Symptôme** (ce qui apparaît dans 1 audit)
2. **Convergence** (le même symptôme dans plusieurs audits)
3. **Cause racine** (l'origine commune qui produit plusieurs symptômes)

---

# Confirmation des convergences détectées

## Convergence 1 — EXIF GPS

| Audit       | Référence   | Diagnostic                                                                    |
| ----------- | ----------- | ----------------------------------------------------------------------------- |
| Légal       | NC-3 + RL-5 | Fuite GPS via métadonnées EXIF, contradiction "Région masquée"                |
| Performance | P-DATA-2    | TODO explicite, pas de strip avant upload                                     |
| Supabase    | P-3 + RS-1  | Bucket `post-media` PUBLIC, EXIF non strippé, GPS en clair dans `media.gps_*` |
| Flows       | (C6)        | Bloquant Phase 1                                                              |

**Convergence confirmée**. C'est UN problème vu sous 3 angles. **Cause racine** identifiée plus bas (RC-G).

## Convergence 2 — Vue `posts_public` manquante

| Audit    | Référence  | Diagnostic                                                         |
| -------- | ---------- | ------------------------------------------------------------------ |
| Flows    | C7         | Audit projection lat/lng quand `location_hidden=true` à faire      |
| Légal    | RL-6       | Risque RGPD + écologique                                           |
| Supabase | P-2 + RS-2 | La vue est mentionnée dans la doc mais aucune migration ne la crée |

**Convergence confirmée**. C'est UN problème : RLS Postgres = row-level uniquement, aucun masquage de colonnes côté DB.

## Convergence 3 — Cron J+30 anonymisation

| Audit    | Référence | Diagnostic                                   |
| -------- | --------- | -------------------------------------------- |
| Légal    | RL-8      | RGPD Art 5(1)(e) — limitation conservation   |
| Supabase | P-5       | Cron annoncé en commentaire SQL, jamais créé |

**Convergence confirmée**. Cf. RC-C.

## Convergence 4 — `saved_posts` hors-migration

| Audit     | Référence  | Diagnostic                                        |
| --------- | ---------- | ------------------------------------------------- |
| Supabase  | P-1 + RS-6 | Tables créées via dashboard, aucune migration Git |
| Technique | RT-4       | Drift DB ↔ types TypeScript                       |

**Convergence confirmée**. Cf. RC-A.

## Autres convergences détectées (non listées par toi mais identifiées)

### Convergence 5 — `select('*')` sur `profiles`

| Audit       | Référence                          | Diagnostic                                 |
| ----------- | ---------------------------------- | ------------------------------------------ |
| Performance | P-BACK-3                           | Remonte `email` (RGPD) + colonnes inutiles |
| Légal       | (implicite)                        | RGPD Art 5(1)(c) minimisation              |
| Technique   | (implicite via 22 `as unknown as`) | Adapter pattern manquant                   |

### Convergence 6 — Onboarding silencieux

| Audit       | Référence       | Diagnostic                                      |
| ----------- | --------------- | ----------------------------------------------- |
| Flows       | C1              | `motivations` + `notif_frequency` jamais sauvés |
| Légal       | (implicite)     | Contradiction RGPD : on collecte sans utiliser  |
| Plan_action | C1 (priorité 1) | Bloquant Phase 1                                |

### Convergence 7 — `DeleteAccountModal` 1-clic + politique 30j

| Audit | Référence | Diagnostic                                                  |
| ----- | --------- | ----------------------------------------------------------- |
| Flows | C3        | Pas de double confirmation par username                     |
| Légal | NC-6      | Politique annonce 30 jours, code fait suppression immédiate |

### Convergence 8 — `database.ts` ↔ `supabase.ts` drift

| Audit       | Référence                     | Diagnostic                                            |
| ----------- | ----------------------------- | ----------------------------------------------------- |
| Technique   | RT-4                          | Cast `any` sur `support_tickets`, types non régénérés |
| Supabase    | P-15 + P-4 (`reactions.type`) | Enum drift `'disappointed'`                           |
| Plan_action | I1 (Vague 1)                  | Pre-commit hook absent                                |

### Convergence 9 — RLS row-level vs column-level

| Audit       | Référence                                                                | Diagnostic                                       |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------ |
| Supabase    | P-6 (RLS Media/Reactions trop permissive) + P-2 (posts_public manquante) | RLS ne masque pas de colonnes                    |
| Légal       | NC-3 + RL-5 + RL-6                                                       | Conséquences RGPD (lat/lng + cross-user privacy) |
| Performance | P-BACK-3 (`select *` profiles email)                                     | Conséquence perf + RGPD                          |

**MÉGA-CONVERGENCE** — c'est la cause racine la plus impactante. Cf. RC-G.

---

# Identification des 7 causes racines

> Ces 7 RC produisent **23 symptômes différents** identifiés dans les audits.

## RC-A — Discipline migration SQL inexistante

**Origine** : pas de pre-commit hook qui regénère `supabase.ts`, possibilité de créer des tables/colonnes via le dashboard Supabase sans migration Git.

**Symptômes générés** :

- `saved_posts`, `hidden_posts` hors-migration (P-1 Supabase)
- Cast `any` sur `support_tickets` (P-15 Supabase, RT-4 Technique)
- Enum `reaction_type 'disappointed'` drift (P-4 Supabase)
- Colonnes legacy `profiles.city/region/country` non droppées (P-14 Supabase)
- 22 casts `as unknown as` (RR-7 Technique)

**Niveau** : 🔴 critique — **systémique**, fait fuiter du dette à chaque sprint.

## RC-B — Sécurité column-level inexistante

**Origine** : RLS Postgres native = row-level uniquement. Aucun mécanisme de masquage de colonnes (vues, projections, RPC) systématique.

**Symptômes générés** :

- Vue `posts_public` manquante → fuite `lat/lng` malgré `location_hidden=true` (P-2)
- RLS Media/Reactions/Comments trop permissive — pas de check `posts.visibility` (P-6)
- `select('*')` sur `profiles` qui remonte `email` (P-BACK-3 Perf)
- Bucket `post-media` public + EXIF GPS non strippé = exposition directe des coordonnées (P-3, NC-3)

**Niveau** : 🔴 critique — **chaîne RGPD bloquante**.

## RC-C — Cycle de vie des données RGPD non implémenté

**Origine** : la politique de confidentialité (texte i18n) annonce des engagements (30 j de grace, anonymisation J+30) que le code n'implémente PAS.

**Symptômes générés** :

- Cron J+30 anonymisation `security_audit_log` annoncé mais inexistant (RL-8, P-5)
- `support_tickets.ip_address`/`user_agent` sans purge (RL-7, P-12)
- DeleteAccountModal annonce 30 j, code fait suppression immédiate (NC-6, C3)
- Aucun audit log INSERT côté UI (security_audit_log table vide)

**Niveau** : 🔴 critique — **violation directe RGPD Art 5(1)(e)**.

## RC-D — Privacy by Design absent côté UI

**Origine** : pas de revue privacy systématique sur les flows sensibles (auth, settings, suppression).

**Symptômes générés** :

- Pages `/privacy` et `/legal` rendent un placeholder "Bientôt disponible" alors que le contenu existe en i18n (NC-1, NC-2)
- Aucun cookie banner (NC-5)
- Aucun bouton d'export RGPD / portabilité (NC-4, Art 20)
- Email change sans écran OTP de confirmation (C5, B4)
- Suppression compte 1-clic sans saisie username (C3)
- Opt-in non granulaire à l'onboarding (Art 7 RGPD)

**Niveau** : 🔴 critique — **violation transparence + droits utilisateurs**.

## RC-E — Contrat de données utilisateur incomplet à l'onboarding

**Origine** : l'`upsert profile` final de l'onboarding (`onboarding/index.tsx:88-105`) ne propage pas tous les champs collectés. TODO explicite ligne 89-92.

**Symptômes générés** :

- `motivations` jamais sauvegardé (C1)
- `notif_frequency` jamais sauvegardé (C1) — alors que la colonne existe (`user_settings.notif_frequency` migration 20260502)
- Probablement colonne `motivations` même pas créée en DB

**Niveau** : 🔴 critique — **trahison de la promesse produit + RGPD loyauté**.

## RC-F — Composants UI obèses + duplication services

**Origine** : pas de discipline de découpage. La règle CLAUDE.md "< 200 lignes par composant" n'est pas appliquée. Pas de helper centralisé pour Supabase.

**Symptômes générés** :

- 14 composants > 200 lignes (max FeedPost à 756)
- 26 occurrences `if (!supabase) throw` dispersées
- 22 casts `as unknown as`
- 12 appels `auth.getUser()` directs
- Pas de `React.memo` sur FeedPost → re-renders cascade

**Niveau** : 🟠 important — **dette technique**, freine tous les fix futurs mais pas bloquant.

## RC-G — Performance des flows critiques sous-optimisée

**Origine** : pas de mesure ni d'optimisation systématique. Patterns choisis "first-shot" sans benchmark.

**Symptômes générés** :

- Pas de compression image client (upload 10 MB au lieu de 2 MB)
- Pas de variantes d'images (avatars 1600×1600 pour affichage 40 px)
- Chunks anormaux `MobileBottomNav` 39 KB gzip + `cta-kingfisher` 42 KB gzip
- `hydrateCommunityProfiles` 3 requêtes série
- `getFeed for_you` 2 requêtes série
- Indexes composites manquants
- Race condition compteurs

**Niveau** : 🟠 important — pas bloquant pour le MVP mais frein UX et coût Supabase.

---

# Évaluation d'impact par cause racine

| RC                              | Impact utilisateur               | Impact perf  | Impact sécurité            | Impact légal                     | Score global |
| ------------------------------- | -------------------------------- | ------------ | -------------------------- | -------------------------------- | ------------ |
| **RC-A** Migration drift        | Faible                           | Faible       | Moyen (drift RLS possible) | Moyen (audit difficile)          | 🟠           |
| **RC-B** Column-level absente   | **Faible** (invisible)           | Faible       | **🔴 ÉLEVÉ**               | **🔴 ÉLEVÉ** (RGPD/Loi 25)       | 🔴           |
| **RC-C** Cycle vie RGPD         | Moyen (suppression accidentelle) | Faible       | Moyen                      | **🔴 ÉLEVÉ** (Art 5(1)(e))       | 🔴           |
| **RC-D** Privacy by Design UI   | **🔴 ÉLEVÉ** (confiance)         | Faible       | Moyen                      | **🔴 ÉLEVÉ** (Art 12-13, Art 20) | 🔴           |
| **RC-E** Onboarding silencieux  | **🔴 ÉLEVÉ** (trahison promesse) | Faible       | Faible                     | Moyen (loyauté)                  | 🔴           |
| **RC-F** UI obèse + duplication | Moyen (perf perçue)              | **🟠 MOYEN** | Faible                     | Faible                           | 🟠           |
| **RC-G** Perf non optimisée     | **🟠 MOYEN** (4G)                | **🟠 MOYEN** | Faible                     | Faible                           | 🟠           |

**5 causes racines en rouge → tu ne peux pas mettre en production publique sans les résoudre.**

---

# 🔴 Critique — à corriger AVANT toute autre action

> Ces 5 RC contiennent **17 symptômes** qui sont les bloquants RGPD/Loi 25/qualité. Sans ces fixes, **mise en production publique impossible**.

## C1 — RC-D : Privacy by Design absent côté UI

### Problème

Pages `/privacy` et `/legal` ne rendent qu'un placeholder "Bientôt disponible" alors que **le contenu RGPD complet existe en i18n** (`fr.json:1023-1056`). Pas de cookie banner. Pas de bouton export. Suppression compte en 1-clic. Email change sans OTP UI.

### Cause racine

Aucune méthodologie "privacy by design" appliquée. Les flows sensibles (auth, settings, deletion) ont été codés sans revue privacy systématique.

### Impact

- 🔴 **Légal** : NC-1, NC-2, NC-4, NC-5, NC-6 — RGPD Art 12, 13, 20 violés ; Loi 25 Art 8.3 violé
- 🔴 **Utilisateur** : confiance brisée, suppression accidentelle possible
- 🟢 Performance : aucun

### Solution

Sprint Privacy 5 jours :

1. Brancher l'i18n existant dans `Privacy.tsx` + `Legal.tsx` (3 h)
2. Cookie banner minimal informatif (4 h)
3. DeleteAccountModal avec saisie username obligatoire (2 h)
4. Email change avec écran OTP intermédiaire (4 h)
5. Edge Function `export-user-data` + bouton Settings (1 j)
6. Désignation Responsable de traitement publique (1 h)
7. Self-host fonts Google → @fontsource (1 h)
8. Mention âge minimum + check inscription (2 h)

### Risque

🟢 Faible — surtout du contenu UI à brancher, pas de refacto profond. Tests E2E sur les flows touchés.

### Complexité

Faible à moyenne. Pas de dépendance backend hormis l'Edge Function export.

### Dépendances

- Validation politique de confidentialité par juriste/DPO externe (avant publication)
- Confirmation que `privacy@naturegraph.fr` est actif

---

## C2 — RC-B : Sécurité column-level inexistante

### Problème

RLS Postgres = row-level uniquement. Aucun masquage de colonnes pour :

- `lat/lng` exposés malgré `location_hidden=true` (vue `posts_public` n'existe pas)
- Médias / Réactions / Commentaires d'un post privé visibles cross-user
- Photos avec EXIF GPS embarqué + bucket `post-media` public
- `email` remonté par `select('*')` sur `profiles`

### Cause racine

La sécurité repose entièrement sur la RLS row-level Postgres, sans vues SQL ni projections explicites pour masquer les colonnes sensibles.

### Impact

- 🔴 **Légal** : NC-3 RGPD Art 5(1)(c) minimisation + Art 32 sécurité ; Loi 25 Art 9
- 🔴 **Sécurité** : confidentialité posts privés cassée + dox géolocalisation
- 🔴 **Écologique** : risque pour espèces sensibles (braconnage)
- 🟢 Performance : positif (`select` ciblés)

### Solution

1. Créer vue `posts_public` qui NULL `lat/lng/city_name` quand `location_hidden=true` (4 h)
2. Renforcer RLS Media/Reactions/Comments avec check `can_see_post(post_id)` (4 h)
3. Strip EXIF côté client avant upload (lib `exifr` 4 h) + trigger DB qui REJETTE si `media.gps_latitude IS NOT NULL` (2 h)
4. Constante `PROFILE_SAFE_SELECT` partout sauf upsert/update owner (1 h)
5. **Optionnel** : passer bucket `post-media` privé + signed URLs (gros refacto, à débattre)

### Risque

🟠 Moyen — change le contrat de lecture côté client. Refacto coordonné UI ↔ services. Tests RLS cross-user obligatoires AVANT déploiement.

### Complexité

Moyenne. Touche client + RLS + Storage. Mais bien découpé en étapes indépendantes.

### Dépendances

- F-2 (vue posts_public) → débloquer F-4 (RLS renforcée)
- Strip EXIF client peut se faire en parallèle
- Aucune dépendance produit

---

## C3 — RC-C : Cycle de vie des données RGPD non implémenté

### Problème

- Cron J+30 anonymisation `security_audit_log` annoncé en commentaire SQL, jamais créé
- `support_tickets.ip_address` / `user_agent` sans politique de purge
- Politique annonce 30 j de grace pour suppression compte, code fait suppression immédiate
- `security_audit_log` table vide (UI n'INSERT jamais)

### Cause racine

Promesses politique non backées par le code. Le cycle de vie des données (création → utilisation → expiration → anonymisation/suppression) n'a pas été décrit ni implémenté.

### Impact

- 🔴 **Légal** : RGPD Art 5(1)(e) limitation de conservation
- 🟠 **Sécurité** : audit log inopérant si suppression
- 🟢 Utilisateur : transparent (sauf pour la divergence 30 j)

### Solution

1. **Décision produit** : adopter la politique 30 j de grace OU modifier la politique pour annoncer suppression immédiate (Q-PROD-5 à trancher)
2. Edge Function `purge-audit-pii` schedulée (pg_cron ou Supabase scheduled) (4 h)
3. Edge Function `purge-support-tickets-pii` schedulée à 90 j (2 h)
4. Edge Function `log-security-event` appelée par UI sur events critiques (1 j)
5. Si décision = 30 j grace : table `account_deletion_requests` + cron J+30 + emails de rappel (2 j)

### Risque

🟢 Faible — additions, pas de modifications.

### Complexité

Moyenne. Des Edge Functions à créer + scheduling Supabase.

### Dépendances

- Décision produit Q-PROD-5 (suppression immédiate vs 30 j)
- Email transactionnel configuré (Resend ou Supabase Auth template) si grace period

---

## C4 — RC-E : Onboarding silencieux

### Problème

L'utilisateur remplit 4 étapes d'onboarding. Seuls les `interests` et le username sont sauvegardés. Les `motivations` et `notif_frequency` sont **collectés mais jetés**.

### Cause racine

L'`upsert profile` final (`onboarding/index.tsx:94-105`) est incomplet. TODO explicite à la ligne 89-92. Probablement la colonne `motivations` n'existe pas en DB.

### Impact

- 🔴 **Utilisateur** : trahison de la promesse produit. L'utilisateur attend des notifs hebdo selon sa fréquence choisie → ne les reçoit jamais.
- 🟠 **Légal** : RGPD Art 5(1)(a) loyauté — collecte sans utilisation
- 🟢 Performance : aucun

### Solution

1. Migration : ajouter colonne `motivations text[]` sur `profiles` si absente (15 min)
2. Étendre l'`upsert` pour inclure `motivations` (15 min)
3. Étendre la même action pour upsert `user_settings.notif_frequency` (15 min)
4. Tests E2E onboarding complet → vérification DB (15 min)

### Risque

🟢 Faible — additions ciblées.

### Complexité

Très faible. ~1 h totale.

### Dépendances

Aucune.

---

## C5 — RC-A : Discipline migration SQL inexistante

### Problème

Tables `saved_posts` et `hidden_posts` créées via le dashboard Supabase sans migration Git versionnée. Drift régulier `database.ts` ↔ `supabase.ts` (cast `any` apparaissent à chaque nouvelle migration). Enum `reaction_type 'disappointed'` obsolète mais toujours autorisé en DB.

### Cause racine

Pas de pre-commit hook qui regénère `supabase.ts` après modification de `migrations/`. Possibilité de modifier la DB hors-migration. Pas de règle CI qui bloque le drift.

### Impact

- 🟠 **Légal** : difficile de prouver la conformité si le schéma n'est pas auditable Git
- 🟠 **Sécurité** : drift RLS possible entre dev/staging/prod si tables hors-migration
- 🟠 **Technique** : refacto risqués (casts `any` partout)
- 🟢 Performance : aucun direct

### Solution

1. **Backfill migrations** pour `saved_posts` + `hidden_posts` via `pg_dump --schema-only` (2 h)
2. **Pre-commit hook** dans `.husky/pre-commit` :
   ```bash
   if git diff --cached --name-only | grep -q "supabase/migrations/"; then
     npx supabase gen types typescript > src/types/supabase.ts
     git add src/types/supabase.ts
   fi
   ```
   (1 h)
3. **CI check** : workflow GitHub qui exécute `supabase db diff` et fail si drift entre migrations et DB de dev (2 h)
4. Migration retrait `'disappointed'` de l'enum reaction_type (1 h)
5. Documenter dans CLAUDE.md la procédure : _"toute modification DB DOIT passer par une migration SQL versionnée"_

### Risque

🟢 Faible — discipline + tooling, pas de modification fonctionnelle.

### Complexité

Faible.

### Dépendances

Aucune.

---

# 🟠 Important — à corriger AVANT la beta publique (Phase 2)

## I1 — RC-G : Quick wins performance

### Problème(s)

HEIC mismatch form/service (5 min) · Investigation chunks anormaux MobileBottomNav + cta-kingfisher (-40 KB gzip) · Compression image client absente · Indexes composites manquants · Race condition compteurs · Fan-out notifs > 10k silent skip · Throttle mouse Hero RAF.

### Cause racine

Pas de mesure ni d'optimisation systématique pendant le développement.

### Impact

- 🟠 **Utilisateur** : sur 4G rurale, upload 30 s vs 5 s avec compression
- 🟠 **Performance** : feed saccadé sur mobile bas-de-gamme
- 🟢 Sécurité / légal : neutre

### Solution

- Quick Wins QW1-QW6 (1 h 15 cumulé) → déjà documentés dans PLAN_ACTION.md
- Compression image client + WebP (1 j)
- 6 indexes composites Postgres (1 h, `CONCURRENTLY`)
- Fan-out queue ou audit log (4 h ou 1 j selon scope)
- Race condition fix par `UPDATE ... = (SELECT COUNT *)` atomique (1 h)
- Investigation chunks via `vite-bundle-visualizer` (30 min)

### Risque

🟢 Faible à moyen — QW6 et HEIC ne touchent que de la copy.

### Complexité

Faible globalement.

### Dépendances

- Décisions produit Q1-Q4 déjà tranchées ✅
- Tests E2E pour les quick wins UI critiques

---

## I2 — RC-F : Refacto composants critiques + helpers Supabase

### Problème(s)

14 composants > 200 lignes · 26 répétitions `if (!supabase) throw` · 22 casts `as unknown as` · FeedPost sans React.memo.

### Cause racine

Pas d'application de la règle CLAUDE.md "< 200 lignes". Pas de helper centralisé pour la garde Supabase.

### Impact

- 🟠 **Performance** : feed peut saccader à cause des re-renders FeedPost
- 🟠 **Maintenance** : refacto futurs lents et risqués
- 🟢 Sécurité / légal : neutre

### Solution

- Sprint Hygiène (1 sem) post-Phase 1 :
  - `lib/supabaseGuard.ts` (RR-1) — 1.5 j
  - Centralisation query keys React Query (RR-2) — 2 j
  - Coerce functions remplaçant `as unknown as` (RR-7) — 0.5 j
- Sprint Découpage (2-3 sem) post-Phase 2 :
  - Tests E2E préalables (AS-9) — 2 j
  - FeedPost split (RR-3) — 2-3 j
  - FeedSection + bug sync-render (RR-4) — 1-2 j

### Risque

🟠 Moyen-élevé sur le découpage FeedPost — c'est le composant le plus utilisé. Tests visuels obligatoires.

### Complexité

Moyenne à élevée.

### Dépendances

- Tests E2E avant tout découpage de FeedPost
- React.memo callbacks parents stables

---

## I3 — RC-G : Optimisations backend critiques

### Problème(s)

`hydrateCommunityProfiles` 3 requêtes série (~200 ms) · `getFeed for_you` 2 requêtes série · Helper RLS `can_see_post()` appelée 60+ fois par feed.

### Cause racine

Architecture choisie sans benchmarking initial.

### Impact

- 🟠 **Utilisateur** : onglet Communauté à 200-300 ms d'ouverture, feed for_you ralenti
- 🟠 **Coût Supabase** : 3× plus de requêtes RTT que nécessaire

### Solution

- RPC Postgres `get_community_with_follow_status(target_user_id)` qui fait le join en 1 RTT (4 h)
- RPC `get_for_you_feed(user_id, page, limit)` qui matérialise la jointure follows (1 j)
- Auditer le cache Supabase pour `can_see_post()` ; si non cachée → matérialiser une vue `posts_with_access`

### Risque

🟢 Faible — additions Postgres, fallback sur l'existant.

### Complexité

Moyenne.

### Dépendances

Aucune.

---

# 🟢 Secondaire — Phase 3 / amélioration continue

## S1 — RC-G : Variantes images + Service Worker PWA

### Problème

Avatars 1600×1600 chargés pour affichage 40 px (×40 trop de pixels). Pas de mode offline.

### Cause racine

Pas de pipeline de génération d'assets variantes.

### Solution

- Edge Function `generate-image-variants` triggered par insert media (2 j)
- PWA + Service Worker (1 j)

### Risque

🟢 Faible (additions).

### Dépendances

- Phase 1 + Phase 2 doivent être terminées

---

## S2 — RC-A : Hygiène DB long terme

### Problème

- Soft delete profil + 30 j grace period
- Drop colonnes legacy `profiles.city/region/country`
- CHECK constraint `bio ≤ 160`
- Régex URL pour social links
- Documentation `COMMENT ON FUNCTION` partout

### Cause racine

Dette accumulée que les Phase 1+2 vont déjà partiellement résoudre.

### Solution

Sprint hygiène DB (1 sem) post-beta.

### Risque

🟢 Faible.

---

## S3 — RC-F : Standardisation modales + AuthContext split

### Problème

11 modales avec 2 patterns différents · `AuthContext.tsx` à 484 lignes mélange real et demo provider.

### Solution

- Convergence vers `<Modal>` ou `<ConfirmModal>` (1 j)
- Split `AuthContext` en `RealAuthProvider.tsx` (0.5 j)

### Risque

🟠 Moyen sur les modales (touche tous les flows).

---

## S4 — RC-A : Tests E2E Playwright

### Problème

Aucun test E2E aujourd'hui. Tout refacto = risque de régression visuelle.

### Solution

- 5 flows critiques en Playwright : signup→onboarding→post, login+like, edit profile, contribution 3 étapes, suppression compte (2 j)

### Risque

🟢 Faible.

### Dépendances

- Sandbox Supabase de test isolé

---

# Plan d'action consolidé final

> Synthèse exécutive : que faire dans quel ordre ?

## 🔴 Sprint #0 — Décisions produit (1-2 h)

Avant tout code, trancher :

- **Q-PROD-5** : suppression compte = immédiate ou 30 j de grace ?
  - Si **immédiate** : modifier la politique de confidentialité (`fr.json:1035`) — 5 min
  - Si **30 j grace** : implémenter table `account_deletion_requests` + cron + emails — 2 j

## 🔴 Sprint #1 — Quick Wins (1 h 15)

QW1-QW6 du `PLAN_ACTION.md` (déjà confirmés).

## 🔴 Sprint #2 — Phase 1 stabilisation + privacy (5-6 jours)

| Jour        | Cause racine ciblée | Actions                                                                  |
| ----------- | ------------------- | ------------------------------------------------------------------------ |
| **J1**      | RC-E + Quick Wins   | Onboarding fix (motivations + freq) + QW1-QW6                            |
| **J2-J3**   | RC-D                | Privacy/Legal i18n + Cookie banner + DeleteModal username + Email OTP UI |
| **J4**      | RC-B (1ère partie)  | Vue `posts_public` + RLS Media/Reactions/Comments + Strip EXIF client    |
| **J5**      | RC-D + RC-A         | Export RGPD Edge Function + bouton Settings + désignation responsable    |
| **J6**      | RC-A + RC-C         | Backfill migrations saved/hidden + pre-commit hook + cron J+30 audit     |
| **Recette** | —                   | Tests E2E manuels sur les 5 flows critiques                              |

## 🟠 Sprint #3 — Fiabilisation (10 jours)

- I1 perf + ECO Phase 2 (compression image, indexes, race condition, fan-out)
- I3 optimisations backend (RPC communauté + for_you)
- A11Y WCAG AA bloquants (Onboarding multi-select, OTP form, Landing FAQ)
- Tests E2E Playwright (S4)

## 🟢 Sprint #4 — Hygiène & amélioration (post-beta)

- I2 refacto composants (FeedPost split + helpers Supabase)
- S1 variantes images + PWA
- S2 hygiène DB long terme
- S3 standardisation modales

---

# Métriques de succès consolidées

| Métrique                   | Actuel              | Sprint #2 (Phase 1)    | Sprint #3 (Phase 2) |
| -------------------------- | ------------------- | ---------------------- | ------------------- |
| Bloquants RGPD/Loi 25      | 8                   | **0**                  | 0                   |
| Causes racines 🔴 résolues | 0/5                 | **5/5**                | 5/5                 |
| Causes racines 🟠 résolues | 0/2                 | 0/2                    | **2/2**             |
| Tables hors-migration      | 2                   | **0**                  | 0                   |
| Vues sécurité              | 1 (profiles_public) | **2** (+ posts_public) | 3                   |
| EXIF GPS strippés          | 0 %                 | **100 %**              | 100 %               |
| `as unknown as`            | 22                  | < 15                   | < 5                 |
| Composants > 200 lignes    | 14                  | 14                     | < 8                 |
| Score Lighthouse Perf      | ?                   | > 80                   | **> 90**            |
| Score Lighthouse A11Y      | ?                   | > 90                   | **> 95**            |
| Bundle JS gzip /home       | 242 KB              | < 230 KB               | **< 210 KB**        |

---

# Risques résiduels après Sprint #2 (Phase 1)

| Risque                                                         | Probabilité | Impact       | Mitigation                                    |
| -------------------------------------------------------------- | ----------- | ------------ | --------------------------------------------- |
| Migration DB casse en prod (`motivations`, vue `posts_public`) | Moyenne     | Moyen        | Tester sur dev → staging → main avec rollback |
| Strip EXIF casse certaines photos exotiques                    | Faible      | Faible       | Try/catch + fallback sans strip               |
| Email change OTP : Supabase rate-limit déclenché               | Faible      | Faible       | Compteur côté UI 1 changement / 24 h          |
| Username unique race condition (déjà identifié)                | Faible      | Moyen        | Gestion erreur 23505 + UX claire              |
| Tests RLS cross-user pas exhaustifs                            | Moyenne     | **🔴 Élevé** | Tests E2E Playwright dédiés (S4 priorité)     |

---

# Lecture express pour chaque audit individuel

| Si tu veux savoir...         | Lis...                 |
| ---------------------------- | ---------------------- |
| Le contrat produit attendu   | `USER_STORIES.md` v1.1 |
| Les écarts produit vs code   | `AUDIT_FLOWS.md` v1.1  |
| L'état de la dette technique | `AUDIT_TECHNIQUE.md`   |
| Les optimisations perf+éco   | `AUDIT_PERFORMANCE.md` |
| Les manquements légaux       | `AUDIT_LEGAL.md`       |
| L'état Supabase / DB         | `AUDIT_SUPABASE.md`    |
| Le plan tactique             | `PLAN_ACTION.md` v1.1  |
| **La synthèse stratégique**  | **ce document**        |

---

# Conclusion

**Le produit a une qualité technique correcte mais 5 causes racines critiques le bloquent en production publique :**

1. 🔴 **RC-D** Privacy by Design absent UI (placeholder Privacy/Legal, pas de cookie banner, suppression 1-clic, pas d'export, email change sans OTP)
2. 🔴 **RC-B** Sécurité column-level inexistante (EXIF GPS, posts_public manquante, RLS faible cross-user)
3. 🔴 **RC-C** Cycle de vie RGPD non implémenté (cron J+30, divergence politique vs code)
4. 🔴 **RC-E** Onboarding silencieux (motivations + frequency perdus)
5. 🔴 **RC-A** Discipline migration SQL inexistante (saved_posts hors-migration, drift TS-DB)

**Toutes ces RC sont résolvables en ~6 jours de travail concentrés**.

**Après cela, le produit est légalement déployable** (pour utilisateurs France + Québec) et **structurellement assaini** pour les phases d'amélioration suivantes.

Les 2 RC orange (RC-F dette UI, RC-G perf) sont importantes mais **n'empêchent pas le déploiement**. Elles seront traitées en Phase 2 et 3 selon priorités produit.

---

> **Document à valider avec Nicolas avant lancement Sprint #2.**
> **Prochaine action recommandée** : trancher Q-PROD-5 (suppression immédiate vs 30 j grace) puis attaquer les Quick Wins (Sprint #1) immédiatement.
