# Naturegraph — Stratégie Beta fermée (Closed Access)

> **Version** : 1.0 — 2026-05-04
> **Statut** : 📌 **DOCUMENT STRATÉGIQUE FUTUR** — non à exécuter maintenant
> **Posture** : product manager + tech lead. Plan complet d'intégration utilisateurs progressifs.
> **Pré-requis activation** : consolidation MVP complète (voir `CONSOLIDATION_ROADMAP.md` phases 1→6)
> **Lecture cible** : 15 min pour absorber, à consulter une fois MVP consolidé.

---

# ⚠️ Pré-requis activation

> Cette stratégie ne doit **PAS** être activée tant que la consolidation MVP n'est pas terminée.

## Conditions de déclenchement

Avant d'ouvrir la beta fermée, tous les points suivants doivent être validés :

- ✅ `CONSOLIDATION_ROADMAP.md` Phase 1 — Stabilisation critique terminée
- ✅ `CONSOLIDATION_ROADMAP.md` Phase 2 — UX/UI consolidation terminée
- ✅ `CONSOLIDATION_ROADMAP.md` Phase 3 — Refacto composants critiques terminée
- ✅ `CONSOLIDATION_ROADMAP.md` Phase 4 — GitHub workflows pro terminée
- ✅ `CONSOLIDATION_ROADMAP.md` Phase 6 — A11Y + sécurité + perf terminée
- ✅ Tests E2E critical path passing (signup → onboarding → upload → delete)
- ✅ Audits sécurité Supabase 0 critique
- ✅ Conformité RGPD/Loi 25 validée
- ✅ Aucun bug bloquant en backlog `MASTER_TODO.md` priorité 🔴
- ✅ Monitoring Sentry/équivalent actif en prod
- ✅ Runbook incident documenté

**Tant que tous ces points ne sont pas cochés, RIEN ne se déploie côté beta.**

---

# 🎯 Vision produit

## Philosophie

Naturegraph évolue **progressivement** avec une approche **apprentissage > croissance** :

- 🌱 Petit groupe contrôlé d'abord
- 📊 Feedback qualitatif > quantitatif
- 🛡️ Sécurité maximale avant tout
- 🔍 Compréhension des usages réels
- 🐛 Détection rapide des problèmes
- ⚡ Itération rapide sur retours réels

**Le but n'est PAS la croissance rapide.** Le but est :

1. **Apprendre** des usages réels d'utilisateurs réels
2. **Stabiliser** sur du trafic réel (pas tests internes)
3. **Corriger** rapidement avant que ça touche trop de monde
4. **Consolider** la fondation produit avant d'ouvrir

---

# 📈 Stratégie globale en 3 phases

```
PHASE 1 — BETA FERMÉE ULTRA CONTRÔLÉE
   ↓
[5 semaines, 50 users max, vagues de 10/semaine]
   ↓
   GO / NO-GO chaque vendredi
   ↓
PHASE 2 — EXTENSION CONTRÔLÉE
   ↓
[50 → 100 users, vagues de 25, accès clés conservé]
   ↓
   Stabilité prouvée + feedback consolidé
   ↓
PHASE 3 — OUVERTURE PUBLIQUE
   ↓
[Ouverture progressive sans clé, dashboard public]
```

---

# PHASE 1 — Beta fermée ultra contrôlée

## 🎯 Objectifs

- Intégrer progressivement les **premiers vrais utilisateurs**
- Limiter les risques de bugs en cascade
- Surveiller la stabilité technique + UX
- Observer les comportements réels (vs hypothèses produit)
- Corriger rapidement chaque problème détecté

## 📅 Planning Phase 1

### Vagues hebdomadaires (5 semaines max)

| Semaine | Nouveaux users | Total cumulé | Action lundi               |
| ------- | -------------- | ------------ | -------------------------- |
| **S1**  | 10             | 10           | Génération + envoi 10 clés |
| **S2**  | 10             | 20           | Idem (si GO vendredi S1)   |
| **S3**  | 10             | 30           | Idem (si GO vendredi S2)   |
| **S4**  | 10             | 40           | Idem (si GO vendredi S3)   |
| **S5**  | 10             | 50           | Idem (si GO vendredi S4)   |

**Plafond strict** : **50 utilisateurs maximum** sur Phase 1.

### Profil utilisateur cible Phase 1

- Naturalistes amateurs sérieux (testeurs qualité)
- Designers / développeurs (testeurs UX critiques)
- Communauté Discord/Twitter Nicolas (early adopters engagés)
- Famille proche / amis tech (testeurs feedback honnête)

**Total visé** : ~50 personnes recrutées **manuellement** avant ouverture.

## 🔄 Processus hebdomadaire

### Lundi — Ouverture vague

- Génération de 10 clés d'accès via dashboard admin
- Envoi email perso à 10 nouveaux invités avec leur clé
- Onboarding documenté inclus (vidéo 2 min ou tutoriel)

### Mardi → Jeudi — Monitoring actif

- Surveillance dashboard Supabase (errors, perf)
- Support direct via email/Discord
- Collecte feedback structuré (formulaire ou interview)
- Triage bugs / suggestions

### Vendredi — Analyse + décision

- Review métriques de la semaine
- Compilation feedback
- **Décision GO / NO-GO** pour la vague suivante

## ⛔ Garde-fous arrêt vague

**Arrêt IMMÉDIAT des vagues** si l'un des événements suivants :

| Catégorie          | Critère arrêt                                   |
| ------------------ | ----------------------------------------------- |
| Sécurité           | Faille découverte, données exposées             |
| Données            | Corruption détectée, RLS bypass                 |
| Onboarding         | Taux échec > 20% sur la semaine                 |
| Auth               | Magic link échec > 10%                          |
| Upload             | Échec > 15% des uploads                         |
| Suppression compte | Bug dans le flow RGPD                           |
| DB                 | Erreurs Postgres > 1% des requêtes              |
| Infra              | Saturation Supabase ou Vercel                   |
| Feedback           | > 30% des testeurs reportent un même bug majeur |

**Pendant un arrêt** : focus 100% correction, aucune nouvelle vague tant que résolu + verified.

---

# 🔐 Système de clés d'accès

## Architecture proposée

### Logique métier

```
Génération clé (admin)
    ↓
Clé unique 12 caractères [A-Z0-9] (ex: NG-XK7M-9PQ2)
    ↓
1 clé = 1 utilisation (par défaut, configurable)
    ↓
Expiration 7 jours après création
    ↓
Lors du signup :
    ↓
1. User entre la clé
2. Edge Function valide :
   - clé existe ?
   - clé active ?
   - clé non utilisée ?
   - clé non expirée ?
   - quota global non atteint ?
3. Si OK : créer auth.users + marquer clé "used"
4. Sinon : message erreur clair
```

### Format clé recommandé

```
NG-XXXX-XXXX  (12 caractères, 2 tirets pour lisibilité)
   │    │
   │    └── 4 chars random [A-Z0-9]
   └────── 4 chars random [A-Z0-9]
```

**Préfixe `NG-`** pour identification visuelle facile (Naturegraph).

**Pourquoi 12 chars ?** ~36^8 ≈ 2.8 × 10^12 combinaisons → brute force impossible.

## Structure DB proposée

### Table `beta_access_keys`

```sql
CREATE TABLE public.beta_access_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(15) UNIQUE NOT NULL,        -- "NG-XK7M-9PQ2"
  batch_number INT NOT NULL,                -- 1 = vague 1, 2 = vague 2, etc.
  max_uses INT NOT NULL DEFAULT 1,          -- Usage unique par défaut
  current_uses INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID REFERENCES auth.users(id), -- Admin créateur
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,                       -- Timestamp première utilisation
  used_by_user_id UUID REFERENCES auth.users(id),  -- Premier utilisateur
  notes TEXT,                                -- Métadonnées admin (ex: "Famille Nicolas")
  CONSTRAINT positive_uses CHECK (current_uses >= 0 AND current_uses <= max_uses)
);

-- Index pour validation rapide
CREATE INDEX idx_beta_access_keys_code ON public.beta_access_keys(code) WHERE is_active = TRUE;
CREATE INDEX idx_beta_access_keys_batch ON public.beta_access_keys(batch_number);
```

### Table `beta_quota_config` (singleton)

```sql
CREATE TABLE public.beta_quota_config (
  id INT PRIMARY KEY DEFAULT 1,
  current_phase INT NOT NULL DEFAULT 1,           -- 1 = Phase 1, 2 = Phase 2, 3 = Public
  max_users_total INT NOT NULL DEFAULT 50,        -- Plafond Phase 1
  current_user_count INT NOT NULL DEFAULT 0,
  accepting_new_signups BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT singleton_row CHECK (id = 1)
);

INSERT INTO public.beta_quota_config (id) VALUES (1);
```

### Table `beta_signup_log` (audit trail)

```sql
CREATE TABLE public.beta_signup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_code VARCHAR(15),
  outcome VARCHAR(50) NOT NULL,        -- 'success', 'invalid_code', 'expired', 'quota_full', 'already_used'
  ip_address INET,                      -- Anonymisée J+30 (RGPD)
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_beta_signup_log_outcome ON public.beta_signup_log(outcome, created_at DESC);
```

## RLS Policies

```sql
-- access_keys : seul admin lit/écrit
ALTER TABLE public.beta_access_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_access_keys" ON public.beta_access_keys
  FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

-- quota_config : lecture publique (pour afficher état beta sur landing)
ALTER TABLE public.beta_quota_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_quota" ON public.beta_quota_config
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "admin_write_quota" ON public.beta_quota_config
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

-- signup_log : insertion via Edge Function uniquement (SECURITY DEFINER)
-- lecture admin uniquement
ALTER TABLE public.beta_signup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_signup_log" ON public.beta_signup_log
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));
```

## Edge Function `validate-beta-key`

```typescript
// supabase/functions/validate-beta-key/index.ts
//
// Flow :
// 1. Validate signature JWT (anon ou non-auth pour signup)
// 2. Rate limit (Upstash Redis ou Supabase Rate Limit)
// 3. Vérifier clé existe, active, non expirée, usage < max_uses
// 4. Vérifier quota global non atteint
// 5. Si tout OK :
//    - Marquer clé "used" (atomic UPDATE)
//    - Incrémenter current_user_count
//    - Logger dans beta_signup_log
//    - Retourner { valid: true }
// 6. Sinon : logger échec + retourner { valid: false, reason }

export async function handleRequest(req: Request) {
  const { code } = await req.json()

  // Rate limit : 5 tentatives / IP / 10 min
  const rateLimitOk = await checkRateLimit(req.headers.get('x-forwarded-for'))
  if (!rateLimitOk) {
    return new Response(JSON.stringify({ error: 'Trop de tentatives' }), { status: 429 })
  }

  // Atomic CTE pour éviter race condition
  const { data, error } = await supabase.rpc('claim_beta_access_key', { p_code: code })
  // RPC fait : UPDATE beta_access_keys SET current_uses = current_uses + 1
  // WHERE code = p_code AND is_active AND current_uses < max_uses AND expires_at > NOW()
  // RETURNING id (NULL si invalide)

  // Log outcome
  await logSignupAttempt({ code, outcome: data ? 'success' : 'invalid' })

  if (!data) {
    return new Response(JSON.stringify({ valid: false, reason: 'invalid_or_used' }))
  }

  // Vérifier quota global
  const { data: quota } = await supabase.from('beta_quota_config').select('*').single()
  if (quota.current_user_count >= quota.max_users_total) {
    // Rollback : décrémenter la clé
    await supabase.from('beta_access_keys').update({ current_uses: 0 }).eq('id', data.id)
    return new Response(JSON.stringify({ valid: false, reason: 'quota_full' }))
  }

  return new Response(JSON.stringify({ valid: true }))
}
```

---

# 🎨 Flows utilisateurs

## Flow inscription avec clé

```
Landing /auth/signup
    ↓
Champ "Clé d'accès beta" (obligatoire)
    ↓
User saisit "NG-XK7M-9PQ2"
    ↓
[CTA : "Vérifier ma clé"]
    ↓
Edge Function validate-beta-key
    ↓
SI valide :
    → Champ "Email" apparaît (magic link)
    → Reste du signup standard
SI invalide :
    → Toast erreur explicite :
       - "Clé invalide ou inutilisée" → ressayer
       - "Clé expirée" → contacter pour renouveler
       - "Beta complète" → page waitlist
```

## Flow waitlist (quota atteint)

```
Landing
    ↓
SI quota atteint (vérifié via SELECT max_users_total > current_user_count) :
    → Banner top : "Beta complète, inscrivez-vous à la waitlist"
    → CTA signup remplacé par :
       [CTA : "Rejoindre la waitlist"]
    ↓
Form simple : email + optionnel motivation
    ↓
Stockage dans table `waitlist` (séparée)
    ↓
Email automatique : "Inscrit en waitlist, position #XX, vous serez notifié(e)"
```

## Flow admin (dashboard simple)

```
/admin/beta (page protégée role='admin')
    ↓
3 sections :

1. STATS GLOBALES
   - Phase actuelle : 1
   - Utilisateurs : 23 / 50 (46%)
   - Clés émises : 30, utilisées : 23, expirées : 0, désactivées : 0
   - Inscriptions échouées (24h) : 12 (avec breakdown raisons)

2. GÉNÉRATION CLÉS
   - [Bouton] "Générer 10 nouvelles clés (vague 3)"
   - Configuration : max_uses=1, expires_in=7j, batch_number=auto-incrémenté
   - Export CSV pour envoi mails personnalisés

3. LISTE CLÉS
   - Tableau : code, batch, used_by, status, created_at, expires_at, actions
   - Actions : désactiver, réactiver, étendre expiration
```

---

# 🛡️ Sécurité

## Anti brute-force

1. **Rate limit Edge Function** : 5 tentatives / IP / 10 minutes (Upstash Redis ou natif Supabase)
2. **Captcha optionnel** après 3 échecs (hCaptcha gratuit, RGPD-friendly)
3. **Codes longs** (12 chars alphanumériques) → 36^8 = 2.8 × 10^12 combinaisons
4. **Logs centralisés** : tous les échecs dans `beta_signup_log` pour audit

## Anti partage abusif

1. **1 clé = 1 utilisation** (par défaut, configurable au cas par cas)
2. **Email signup distinct** de l'email où la clé a été envoyée (recommandé mais pas obligatoire)
3. **IP tracking** sur usage de la clé (audit, pas blocage)
4. **Détection patterns** : 1 même IP qui essaie plusieurs clés différentes = flag admin

## Anti corruption données

1. **RLS strict** sur tables beta (admin only sauf lecture quota)
2. **Atomic UPDATE** pour claim de clé (évite race condition double-utilisation)
3. **Transaction PostgreSQL** pour signup complet (auth.users INSERT + key.used)
4. **Trigger validation** : empêche INSERT auth.users si quota plein (sécurité défensive)

## Monitoring anomalies

1. **Alerte si** :
   - Taux échec signup > 30% sur 1h
   - 1 IP fait > 10 tentatives en 5 min
   - Quota saturé avant fin de semaine (vague trop rapide)
   - Clés "leaked" (multiple IP différentes essaient la même clé)

2. **Outils** :
   - Supabase Dashboard logs
   - Sentry pour erreurs front
   - Email/Discord notification admin (via Edge Function cron)

---

# 📊 Suivi beta — KPIs obligatoires

## Métriques techniques par vague

| KPI                         | Cible          | Source                                      |
| --------------------------- | -------------- | ------------------------------------------- |
| Taux succès signup          | > 95%          | `beta_signup_log` outcome='success' / total |
| Taux complétion onboarding  | > 80%          | `profiles.username IS NOT NULL` / signups   |
| Taux upload réussi          | > 90%          | `media` inserts / tentatives                |
| Errors front (Sentry)       | < 5 / semaine  | Sentry dashboard                            |
| Errors back (Postgres logs) | < 10 / semaine | Supabase logs                               |
| LCP médian mobile           | < 3s           | Lighthouse / RUM                            |
| Suppression compte sans bug | 100%           | Tests E2E + monitoring                      |

## Métriques engagement par vague

| KPI                                     | Cible | Source                  |
| --------------------------------------- | ----- | ----------------------- |
| % users qui créent au moins 1 post      | > 50% | `posts` count per user  |
| % users qui interagissent (like/follow) | > 60% | `reactions` + `follows` |
| Posts moyens / user actif               | > 2   | aggregate `posts`       |
| Retour à J+7                            | > 40% | `auth.sessions`         |
| Retour à J+30                           | > 20% | idem                    |

## Feedback qualitatif

À chaque fin de vague, collecte structurée :

| Question                          | Format            |
| --------------------------------- | ----------------- |
| "Note de l'expérience"            | 1-10              |
| "Bug rencontrés"                  | Texte libre       |
| "Feature manquante critique"      | Texte libre       |
| "Recommanderais-tu Naturegraph ?" | Oui/Non/Peut-être |
| "Suggestions priorité 1"          | Texte libre       |

**Outil recommandé** : Tally.so (gratuit, RGPD-friendly, intégration email)

---

# PHASE 2 — Extension contrôlée (50 → 100 users)

## ⚠️ Pré-requis activation Phase 2

- ✅ Phase 1 terminée (50 users intégrés)
- ✅ 0 bug critique non résolu
- ✅ Feedback qualitatif globalement positif (> 7/10 moyenne)
- ✅ Stabilité technique prouvée (KPIs ci-dessus tous verts)
- ✅ Monitoring mature (alertes automatiques actives)

## Planning Phase 2

| Vague | Nouveaux users | Total | Durée      |
| ----- | -------------- | ----- | ---------- |
| 6     | 25             | 75    | 2 semaines |
| 7     | 25             | 100   | 2 semaines |

**Total Phase 2** : ~4 semaines, plafond 100 users.

## Différences Phase 1 → Phase 2

| Aspect       | Phase 1        | Phase 2                               |
| ------------ | -------------- | ------------------------------------- |
| Taille vague | 10/sem         | 25/2 sem                              |
| Plafond      | 50             | 100                                   |
| Profil users | Cercle proche  | Recrutement ouvert mais filtré        |
| Onboarding   | Manuel email   | Email automatisé                      |
| Support      | Direct Nicolas | + 1 community manager (si nécessaire) |
| Système clés | Manuel         | Self-service (waitlist → clé auto)    |

## Configuration DB Phase 2

```sql
UPDATE public.beta_quota_config
SET current_phase = 2,
    max_users_total = 100,
    updated_at = NOW()
WHERE id = 1;
```

---

# PHASE 3 — Ouverture publique progressive

## ⚠️ Pré-requis activation Phase 3

- ✅ Phase 2 terminée (100 users intégrés)
- ✅ Stabilité prouvée sur 100 users actifs
- ✅ Monitoring mature et automatisé
- ✅ Sécurité validée (audits annuels)
- ✅ Performances validées (LCP < 2.5s à 100 users)
- ✅ Design System stabilisé (Storybook complet)
- ✅ Workflows équipe stabilisés (CI/CD + releases)
- ✅ Dette critique traitée (toutes tâches `MASTER_TODO` 🔴 done)
- ✅ Conformité RGPD/Loi 25 + revue juridique formelle

## Stratégie Phase 3

### Option A — Ouverture totale immédiate (déconseillée)

Risque : afflux non contrôlé, support saturé.

### Option B — Ouverture progressive sans clé (recommandée)

```
Semaine 1 Phase 3 : ouverture sans clé MAIS rate limit signup (50/jour)
Semaine 2 : 100/jour
Semaine 3 : 200/jour
Semaine 4 : Illimité

Tableau de bord public :
- "Inscrits aujourd'hui : 47 / 100"
- "Slots restants aujourd'hui : 53"
```

Permet de :

- Désactiver le système de clés (simplification UX)
- Garder un contrôle progressif (rate limit serveur)
- Lever progressivement les limites selon stabilité

### Option C — Hybride : Clé optionnelle + ouverture libre

Garder le système de clés pour les **early adopters VIP** (skip rate limit) et ouvrir le public en rate limit.

---

# 🧰 Implémentation technique — estimation

## Effort développement Phase 1 (clés + dashboard)

| Tâche                                                                      | Effort | Pré-requis               |
| -------------------------------------------------------------------------- | ------ | ------------------------ |
| Migration SQL `beta_access_keys` + `beta_quota_config` + `beta_signup_log` | 2h     | MVP consolidé            |
| RPC `claim_beta_access_key` atomic                                         | 2h     | Migration faite          |
| Edge Function `validate-beta-key` (Deno)                                   | 4h     | RPC faite                |
| RLS policies                                                               | 2h     | Tables créées            |
| Modif page signup (`AuthForm`) avec champ clé                              | 4h     | Edge Function OK         |
| Page admin `/admin/beta` (dashboard simple)                                | 1j     | Auth admin role en place |
| Système d'envoi email mass (générer + envoyer 10 clés)                     | 4h     | Templates email          |
| Page waitlist (formulaire + table `waitlist`)                              | 4h     | —                        |
| Tests E2E Phase 1 flow complet                                             | 4h     | Phase 1 fini             |
| Monitoring : alertes anomalies (cron Edge Function)                        | 4h     | —                        |
| Documentation utilisateur (FAQ + tuto vidéo)                               | 1j     | —                        |

**Total Phase 1 implémentation** : ~5 jours dev (~40h)

**Quand ?** Après Phase 5 (Storybook + DS stabilisé) de `CONSOLIDATION_ROADMAP.md`, avant ouverture beta.

## Effort Phase 2

| Tâche                                            | Effort |
| ------------------------------------------------ | ------ |
| Self-service waitlist → clé auto (Edge Function) | 1j     |
| Dashboard admin enrichi (graphs, exports)        | 1j     |
| Email templates automatisés (vague hebdo)        | 4h     |

**Total Phase 2 implémentation** : ~2.5 jours dev.

## Effort Phase 3

| Tâche                                        | Effort |
| -------------------------------------------- | ------ |
| Désactivation système clés (feature flag DB) | 4h     |
| Rate limit signup par jour (Edge Function)   | 1j     |
| Dashboard public "stats inscriptions"        | 4h     |

**Total Phase 3 implémentation** : ~2 jours dev.

---

# 📋 Checklist pré-lancement Phase 1

À cocher AVANT d'activer la beta fermée :

## Technique

- [ ] Migration SQL `beta_*` tables appliquée
- [ ] Edge Function `validate-beta-key` déployée
- [ ] Page signup avec champ clé fonctionnelle
- [ ] Dashboard admin accessible
- [ ] Rate limit fonctionnel (test brute force OK)
- [ ] Tests E2E flow complet signup avec clé passing
- [ ] Monitoring alertes actives (email + Discord/Slack)
- [ ] Logs `beta_signup_log` vérifiés (anonymisation IP J+30)

## Conformité

- [ ] Pages Privacy/Legal à jour
- [ ] Cookie banner actif
- [ ] Export RGPD fonctionnel sur testeur
- [ ] Suppression compte testée (RGPD)
- [ ] Conditions d'utilisation beta acceptées au signup

## Produit

- [ ] Email templates rédigés (clé + onboarding)
- [ ] Tuto vidéo / FAQ écrite
- [ ] Formulaire feedback hebdo prêt (Tally ou autre)
- [ ] Liste 10 invités vague 1 préparée

## Communication

- [ ] Discord/Slack canal beta créé
- [ ] Charte beta testeur écrite (NDA, attendus, etc.)
- [ ] Process feedback documenté
- [ ] Process incident documenté (qui alerter, comment réagir)

---

# 🎯 Critères de succès Phase 1

À la fin des 5 semaines (50 users) :

| Critère                               | Cible          | Verdict |
| ------------------------------------- | -------------- | ------- |
| 50 users intégrés sans bug bloquant   | 100%           | ⬜      |
| Taux satisfaction (questionnaire fin) | > 7/10 moyenne | ⬜      |
| 0 incident sécurité                   | 0              | ⬜      |
| 0 corruption de données               | 0              | ⬜      |
| Posts créés total                     | > 50           | ⬜      |
| Réactions/follows total               | > 200          | ⬜      |
| % users qui reviennent J+7            | > 40%          | ⬜      |
| Sentry errors hebdo                   | < 5 critiques  | ⬜      |
| Feedback bugs identifiés et priorisés | 100%           | ⬜      |

**Si TOUS verts** → GO Phase 2.
**Si UN rouge** → analyse + correction + repartir.

---

# 🚨 Plan de réaction incident

## Bug critique découvert pendant vague

```
1. Stop immédiat des nouvelles inscriptions (toggle `accepting_new_signups = false`)
2. Communication transparente aux beta testeurs (email + Discord)
3. Investigation root cause
4. Fix + déploiement
5. Tests en staging
6. Vérification incident résolu sur prod
7. Réouverture inscriptions
8. Documentation incident dans RELEASE_READINESS.md
```

## Saturation Supabase

```
1. Vérifier plan Supabase actuel (Free / Pro / Team)
2. Surveiller métriques :
   - Database CPU > 80%
   - Storage > 80% du quota
   - Bandwidth > 80%
3. Si proche limite : upgrade plan AVANT incident
4. Si déjà saturé : stop signups + scale plan + reprise
```

---

# 📎 Références croisées

- `docs/CONSOLIDATION_ROADMAP.md` — Pré-requis activation
- `docs/MASTER_TODO.md` — Tâches techniques avant beta (cf. Phase 1+2+6)
- `docs/AUDIT_LEGAL.md` — RGPD/Loi 25 conformité
- `docs/AUDIT_SUPABASE.md` — Architecture DB
- `docs/DEPLOYMENT_RUNBOOK.md` — Procédures déploiement
- `docs/RELEASE_READINESS.md` — Critères release
- `CLAUDE.md` — Instructions IA + culture projet

---

# ⚠️ Rappel statut

**Ce document est STRATÉGIQUE pour la suite.**

**Il NE doit PAS être exécuté tant que** :

1. La consolidation MVP n'est pas terminée
2. Toutes les phases 1-6 de `CONSOLIDATION_ROADMAP.md` sont validées
3. Aucun bug critique en backlog

**Quand activer ?** Probablement dans **2-3 mois** après finalisation consolidation.

---

**📌 Document de référence pour la stratégie beta fermée. À enrichir progressivement, ne pas exécuter prématurément.**
