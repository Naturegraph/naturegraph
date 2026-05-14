# Naturegraph — Stratégie Beta fermée (Closed Access)

> **Version** : 2.0 — 2026-05-13 (refondu BATCH 27 — actionnable post cycle 1)
> **Statut** : 🟢 **PRET A IMPLEMENTER** — pré-requis MVP cycle 1 valides (98/117 done)
> **Posture** : product manager + tech lead. Plan complet d'integration utilisateurs progressifs.
> **Effort total Phase 1** : ~5 jours dev (40h)
> **Pre-requis** : voir checklist § "Pre-flight check" ci-dessous

---

## 🎯 TL;DR

- **Phase 1** : 50 utilisateurs max, vagues de 10/semaine, 5 semaines.
- **Système de cles d'acces** : 1 cle = 1 inscription, 12 chars, expire 7j.
- **Quota plafonne en DB** (singleton `beta_quota_config`).
- **Edge Function** valide + claim atomique (anti race condition).
- **Dashboard admin minimal** : voir [`ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md`](ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md) Module Beta.
- **Garde-fous arret automatique** sur 9 criteres (cf. § Garde-fous).
- **Phase 2/3** progressives : 50 → 100 → ouverture publique avec rate limit.

---

## ✈️ Pre-flight check (avant lancement)

Status au 2026-05-13 — cycle 1 livre :

| Pre-requis                 | Statut         | Source                                                                                                   |
| -------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| Consolidation MVP terminée | 🟢 OK          | 98/117 taches done — [`STATUS_2026-05-13.md`](STATUS_2026-05-13.md)                                      |
| Tests E2E critical path    | 🟡 Partiel     | 5 smoke tests Playwright (T-007/T-009 ✅). Critical path signup → onboarding → upload → delete a etoffer |
| Audits sécurité Supabase   | 🟢 OK          | [`AUDIT_ADVISORS_2026-05-13.md`](AUDIT_ADVISORS_2026-05-13.md) — 0 ERROR critique                        |
| Conformité RGPD/Loi 25     | 🟢 OK          | RC-D Privacy by Design livre (BATCH precedent) + cookie banner + delete account                          |
| Aucun bug bloquant 🔴      | 🟢 OK          | Refactos composants > 200L = qualite, pas bloquant fonctionnel                                           |
| Monitoring Sentry actif    | 🔴 **A FAIRE** | `lib/monitoring.ts` existe mais Sentry pas configure                                                     |
| Runbook incident           | 🟢 OK          | [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md)                                                         |

**Action restante avant beta** : activer Sentry (1-2h dev).

---

# 🎯 Vision produit

## Philosophie

Naturegraph evolue **progressivement** avec une approche **apprentissage > croissance** :

- 🌱 Petit groupe controle d'abord
- 📊 Feedback qualitatif > quantitatif
- 🛡️ Sécurité maximale avant tout
- 🔍 Comprehension des usages reels
- 🐛 Detection rapide des problemes
- ⚡ Iteration rapide sur retours reels

**Le but n'est PAS la croissance rapide.** Le but est :

1. **Apprendre** des usages reels d'utilisateurs reels
2. **Stabiliser** sur du trafic reel (pas tests internes)
3. **Corriger** rapidement avant que ça touche trop de monde
4. **Consolider** la fondation produit avant d'ouvrir

---

## 📈 Stratégie globale en 3 phases

```
PHASE 1 — BETA FERMEE ULTRA CONTROLEE
   ↓
[5 semaines, 50 users max, vagues de 10/semaine]
   ↓
GO / NO-GO chaque vendredi
   ↓
PHASE 2 — EXTENSION CONTROLEE
   ↓
[50 → 100 users, vagues de 25, accès cles conserve]
   ↓
Stabilite prouvee + feedback consolide
   ↓
PHASE 3 — OUVERTURE PUBLIQUE
   ↓
[Ouverture progressive sans cle, rate limit serveur]
```

---

# PHASE 1 — Beta fermée ultra contrôlée

## 🎯 Objectifs

- Integrer progressivement les **premiers vrais utilisateurs**
- Limiter les risques de bugs en cascade
- Surveiller la stabilité technique + UX
- Observer les comportements reels (vs hypotheses produit)
- Corriger rapidement chaque probleme detecte

## 📅 Planning Phase 1

### Vagues hebdomadaires (5 semaines max)

| Semaine | Nouveaux users | Total cumule | Action lundi               |
| ------- | -------------- | ------------ | -------------------------- |
| **S1**  | 10             | 10           | Generation + envoi 10 cles |
| **S2**  | 10             | 20           | Idem (si GO vendredi S1)   |
| **S3**  | 10             | 30           | Idem (si GO vendredi S2)   |
| **S4**  | 10             | 40           | Idem (si GO vendredi S3)   |
| **S5**  | 10             | 50           | Idem (si GO vendredi S4)   |

**Plafond strict** : **50 utilisateurs maximum** sur Phase 1.

### Profil utilisateur cible Phase 1

- Naturalistes amateurs serieux (testeurs qualite)
- Designers / developpeurs (testeurs UX critiques)
- Communaute Discord/Twitter Nicolas (early adopters engages)
- Famille proche / amis tech (testeurs feedback honnete)

**Total vise** : ~50 personnes recrutees **manuellement** avant ouverture.

## 🔄 Processus hebdomadaire

### Lundi — Ouverture vague

- Generation de 10 cles d'acces via dashboard admin
- Envoi email perso a 10 nouveaux invites avec leur cle
- Onboarding documente inclus (video 2 min ou tutoriel)

### Mardi → Jeudi — Monitoring actif

- Surveillance dashboard Supabase (errors, perf)
- Support direct via email/Discord
- Collecte feedback structure (formulaire Tally ou interview)
- Triage bugs / suggestions

### Vendredi — Analyse + decision

- Review metriques de la semaine
- Compilation feedback
- **Decision GO / NO-GO** pour la vague suivante

## ⛔ Garde-fous arrêt vague

**Arrêt IMMEDIAT des vagues** si l'un des evenements suivants :

| Categorie          | Critere arrêt                                   |
| ------------------ | ----------------------------------------------- |
| Securite           | Faille decouverte, donnees exposees             |
| Donnees            | Corruption detectee, RLS bypass                 |
| Onboarding         | Taux echec > 20% sur la semaine                 |
| Auth               | Magic link echec > 10%                          |
| Upload             | Echec > 15% des uploads                         |
| Suppression compte | Bug dans le flow RGPD                           |
| DB                 | Erreurs Postgres > 1% des requetes              |
| Infra              | Saturation Supabase ou Vercel                   |
| Feedback           | > 30% des testeurs reportent un meme bug majeur |

**Pendant un arret** : focus 100% correction, aucune nouvelle vague tant que resolu + verified.

---

# 🔐 Système de clés d'accès

## Architecture proposée

### Logique métier

```
Generation cle (admin)
    ↓
Cle unique 12 caracteres [A-Z0-9] (ex: NG-XK7M-9PQ2)
    ↓
1 cle = 1 utilisation (par defaut, configurable)
    ↓
Expiration 7 jours apres creation
    ↓
Lors du signup :
    ↓
1. User entre la cle
2. Edge Function valide :
   - cle existe ?
   - cle active ?
   - cle non utilisee ?
   - cle non expiree ?
   - quota global non atteint ?
3. Si OK : creer auth.users + marquer cle "used"
4. Sinon : message erreur clair
```

### Format clé recommandé

```
NG-XXXX-XXXX  (12 caracteres, 2 tirets pour lisibilite)
   │    │
   │    └── 4 chars random [A-Z0-9]
   └────── 4 chars random [A-Z0-9]
```

**Prefixe `NG-`** pour identification visuelle facile (Naturegraph).

**Pourquoi 12 chars ?** ~36^8 ≈ 2.8 × 10^12 combinaisons → brute force impossible.

## Structure DB

### Migration `supabase/migrations/YYYYMMDD_beta_access_system.sql`

```sql
-- ============================================================================
-- Beta closed access system (Phase 1)
-- ============================================================================

-- 1. Cles d'acces
CREATE TABLE public.beta_access_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(15) UNIQUE NOT NULL,        -- "NG-XK7M-9PQ2"
  batch_number INT NOT NULL,                -- 1 = vague 1, 2 = vague 2, etc.
  max_uses INT NOT NULL DEFAULT 1,
  current_uses INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  CONSTRAINT positive_uses CHECK (current_uses >= 0 AND current_uses <= max_uses)
);

CREATE INDEX idx_beta_access_keys_code_active ON public.beta_access_keys(code) WHERE is_active = TRUE;
CREATE INDEX idx_beta_access_keys_batch ON public.beta_access_keys(batch_number);

-- 2. Config quota (singleton)
CREATE TABLE public.beta_quota_config (
  id INT PRIMARY KEY DEFAULT 1,
  current_phase INT NOT NULL DEFAULT 1,
  max_users_total INT NOT NULL DEFAULT 50,
  current_user_count INT NOT NULL DEFAULT 0,
  accepting_new_signups BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT singleton_row CHECK (id = 1)
);

INSERT INTO public.beta_quota_config (id) VALUES (1);

-- 3. Audit trail signups (IP anonymisee J+30 par cron T-067 existant)
CREATE TABLE public.beta_signup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_code VARCHAR(15),
  outcome VARCHAR(50) NOT NULL,            -- 'success', 'invalid_code', 'expired', 'quota_full', 'already_used'
  ip_address INET,
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_beta_signup_log_outcome ON public.beta_signup_log(outcome, created_at DESC);

-- 4. Waitlist (quota plein)
CREATE TABLE public.beta_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  motivation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_at TIMESTAMPTZ,
  invited_with_key_id UUID REFERENCES public.beta_access_keys(id),
  notes TEXT
);

CREATE INDEX idx_beta_waitlist_pending ON public.beta_waitlist(created_at) WHERE invited_at IS NULL;
```

### RLS Policies — pattern (SELECT auth.uid()) (BATCH 22)

```sql
-- access_keys : admin only
ALTER TABLE public.beta_access_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_access_keys" ON public.beta_access_keys
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.admin_users WHERE is_active = TRUE
  ));

-- quota_config : lecture publique (afficher etat beta sur landing), admin write
ALTER TABLE public.beta_quota_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_quota" ON public.beta_quota_config
  FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "admin_write_quota" ON public.beta_quota_config
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.admin_users WHERE is_active = TRUE
  ));

-- signup_log : insert via Edge Function (SECURITY DEFINER), read admin
ALTER TABLE public.beta_signup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_signup_log" ON public.beta_signup_log
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.admin_users WHERE is_active = TRUE
  ));

-- waitlist : insert public (signup waitlist), read admin
ALTER TABLE public.beta_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_waitlist" ON public.beta_waitlist
  FOR INSERT TO anon, authenticated WITH CHECK (TRUE);

CREATE POLICY "admin_read_waitlist" ON public.beta_waitlist
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.admin_users WHERE is_active = TRUE
  ));
```

## Edge Function `validate-beta-key`

```typescript
// supabase/functions/validate-beta-key/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

export default async (req: Request) => {
  const { code } = await req.json()

  // 1. Rate limit : 5 tentatives / IP / 10 min
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!(await checkRateLimit(ip))) {
    return Response.json({ error: 'Trop de tentatives' }, { status: 429 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 2. Atomic claim via RPC (evite race condition)
  const { data: keyId } = await supabase.rpc('claim_beta_access_key', { p_code: code })

  // 3. Log outcome
  await supabase.from('beta_signup_log').insert({
    attempted_code: code,
    outcome: keyId ? 'success' : 'invalid_or_used',
    ip_address: ip,
    user_agent: req.headers.get('user-agent'),
  })

  if (!keyId) {
    return Response.json({ valid: false, reason: 'invalid_or_used' })
  }

  // 4. Verifier quota global
  const { data: quota } = await supabase.from('beta_quota_config').select('*').single()
  if (!quota?.accepting_new_signups || quota.current_user_count >= quota.max_users_total) {
    // Rollback : decrementer la cle (transactionnel)
    await supabase.rpc('release_beta_access_key', { p_key_id: keyId })
    return Response.json({ valid: false, reason: 'quota_full' })
  }

  return Response.json({ valid: true, key_id: keyId })
}
```

### RPC functions accompagnantes

```sql
-- Claim atomique
CREATE OR REPLACE FUNCTION public.claim_beta_access_key(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_id UUID;
BEGIN
  UPDATE public.beta_access_keys
  SET current_uses = current_uses + 1,
      used_at = COALESCE(used_at, NOW())
  WHERE code = p_code
    AND is_active = TRUE
    AND current_uses < max_uses
    AND expires_at > NOW()
  RETURNING id INTO v_key_id;

  RETURN v_key_id;
END;
$$;

-- Rollback (si quota plein apres claim)
CREATE OR REPLACE FUNCTION public.release_beta_access_key(p_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.beta_access_keys
  SET current_uses = GREATEST(current_uses - 1, 0),
      used_at = NULL
  WHERE id = p_key_id AND current_uses > 0;
END;
$$;
```

---

# 🎨 Flows utilisateurs

## Flow inscription avec clé

```
Landing /auth/signup
    ↓
Champ "Cle d'acces beta" (obligatoire)
    ↓
User saisit "NG-XK7M-9PQ2"
    ↓
[CTA : "Verifier ma cle"]
    ↓
Edge Function validate-beta-key
    ↓
SI valide :
    → Champ "Email" apparait (magic link)
    → Reste du signup standard
SI invalide :
    → Toast erreur explicite :
       - "Cle invalide ou inutilisee" → ressayer
       - "Cle expiree" → contacter pour renouveler
       - "Beta complete" → page waitlist
```

## Flow waitlist (quota atteint)

```
Landing
    ↓
SI quota atteint :
    → Banner top : "Beta complete, inscrivez-vous a la waitlist"
    → CTA signup remplace par :
       [CTA : "Rejoindre la waitlist"]
    ↓
Form simple : email + optionnel motivation
    ↓
Stockage dans table `beta_waitlist`
    ↓
Email automatique : "Inscrit en waitlist, vous serez notifie(e)"
```

---

# 🛡️ Sécurité

## Anti brute-force

1. **Rate limit Edge Function** : 5 tentatives / IP / 10 minutes
2. **Captcha optionnel** apres 3 echecs (hCaptcha gratuit, RGPD-friendly)
3. **Codes longs** : 36^8 = 2.8 × 10^12 combinaisons
4. **Logs centralises** : tous les echecs dans `beta_signup_log` pour audit

## Anti partage abusif

1. **1 cle = 1 utilisation** par defaut, configurable au cas par cas
2. **IP tracking** sur usage de la cle (audit, pas blocage)
3. **Detection patterns** : 1 meme IP qui essaie plusieurs cles differentes = flag admin

## Anti corruption données

1. **RLS strict** sur tables beta (admin only sauf lecture quota)
2. **Atomic UPDATE** pour claim de cle (RPC `claim_beta_access_key`)
3. **Rollback transactionnel** si quota plein apres claim
4. **Audit trail** complet dans `beta_signup_log`

---

# 📊 Suivi beta — KPIs obligatoires

## Métriques techniques par vague

| KPI                         | Cible          | Source                                      |
| --------------------------- | -------------- | ------------------------------------------- |
| Taux succes signup          | > 95%          | `beta_signup_log` outcome='success' / total |
| Taux completion onboarding  | > 80%          | `profiles.username IS NOT NULL` / signups   |
| Taux upload reussi          | > 90%          | `media` inserts / tentatives                |
| Errors front (Sentry)       | < 5 / semaine  | Sentry dashboard                            |
| Errors back (Postgres logs) | < 10 / semaine | Supabase logs                               |
| LCP median mobile           | < 3s           | Lighthouse / RUM                            |
| Suppression compte sans bug | 100%           | Tests E2E + monitoring                      |

## Métriques engagement par vague

| KPI                                     | Cible | Source                  |
| --------------------------------------- | ----- | ----------------------- |
| % users qui creent au moins 1 post      | > 50% | `posts` count per user  |
| % users qui interagissent (like/follow) | > 60% | `reactions` + `follows` |
| Posts moyens / user actif               | > 2   | aggregate `posts`       |
| Retour a J+7                            | > 40% | `auth.sessions`         |
| Retour a J+30                           | > 20% | idem                    |

## Feedback qualitatif

A chaque fin de vague, collecte structuree via **Tally.so** (gratuit, RGPD-friendly) :

| Question                          | Format            |
| --------------------------------- | ----------------- |
| "Note de l'experience"            | 1-10              |
| "Bug rencontres"                  | Texte libre       |
| "Feature manquante critique"      | Texte libre       |
| "Recommanderais-tu Naturegraph ?" | Oui/Non/Peut-etre |
| "Suggestions priorite 1"          | Texte libre       |

---

# PHASE 2 — Extension contrôlée (50 → 100 users)

## Pre-requis activation Phase 2

- ✅ Phase 1 terminee (50 users integres)
- ✅ 0 bug critique non resolu
- ✅ Feedback qualitatif globalement positif (> 7/10 moyenne)
- ✅ Stabilite technique prouvee (KPIs ci-dessus tous verts)
- ✅ Monitoring mature (alertes automatiques actives)

## Planning Phase 2

| Vague | Nouveaux users | Total | Duree      |
| ----- | -------------- | ----- | ---------- |
| 6     | 25             | 75    | 2 semaines |
| 7     | 25             | 100   | 2 semaines |

**Total Phase 2** : ~4 semaines, plafond 100 users.

## Différences Phase 1 → Phase 2

| Aspect       | Phase 1        | Phase 2                               |
| ------------ | -------------- | ------------------------------------- |
| Taille vague | 10/sem         | 25/2 sem                              |
| Plafond      | 50             | 100                                   |
| Profil users | Cercle proche  | Recrutement ouvert mais filtre        |
| Onboarding   | Manuel email   | Email automatise                      |
| Support      | Direct Nicolas | + 1 community manager (si necessaire) |
| Systeme cles | Manuel         | Self-service (waitlist → cle auto)    |

## Activation Phase 2 (SQL)

```sql
UPDATE public.beta_quota_config
SET current_phase = 2,
    max_users_total = 100,
    updated_at = NOW()
WHERE id = 1;
```

---

# PHASE 3 — Ouverture publique progressive

## Pre-requis activation Phase 3

- ✅ Phase 2 terminee (100 users integres)
- ✅ Stabilite prouvee sur 100 users actifs
- ✅ Monitoring mature et automatise
- ✅ Securite validee (audits annuels)
- ✅ Performances validees (LCP < 2.5s a 100 users)
- ✅ Design System stabilise (Storybook complet — T-045-T-052)
- ✅ Workflows equipe stabilises (CI/CD + releases)

## Strategie recommandée : Ouverture progressive avec rate limit

```
Semaine 1 Phase 3 : ouverture sans cle MAIS rate limit signup (50/jour)
Semaine 2 : 100/jour
Semaine 3 : 200/jour
Semaine 4 : Illimite

Tableau de bord public :
- "Inscrits aujourd'hui : 47 / 100"
- "Slots restants aujourd'hui : 53"
```

Permet de :

- Desactiver le systeme de cles (simplification UX)
- Garder un controle progressif (rate limit serveur)
- Lever progressivement les limites selon stabilite

---

# 🧰 Plan d'implémentation Phase 1

## Effort développement détaillé

| Tache                                                                    | Effort | Pre-requis                                |
| ------------------------------------------------------------------------ | ------ | ----------------------------------------- |
| **T-200** Migration SQL `beta_*` tables                                  | 2h     | Aucun                                     |
| **T-201** RPC `claim_beta_access_key` + `release_beta_access_key` atomic | 2h     | T-200                                     |
| **T-202** Edge Function `validate-beta-key` (Deno)                       | 4h     | T-201                                     |
| **T-203** RLS policies                                                   | 2h     | T-200                                     |
| **T-204** Modif page signup (`AuthForm`) avec champ cle                  | 4h     | T-202                                     |
| **T-205** Page admin `/admin/beta` (dashboard simple)                    | 1j     | Auth admin role en place (Module 5 admin) |
| **T-206** Systeme d'envoi email mass (generer + envoyer 10 cles)         | 4h     | Templates email                           |
| **T-207** Page waitlist (formulaire + table `beta_waitlist`)             | 4h     | T-200                                     |
| **T-208** Tests E2E Phase 1 flow complet                                 | 4h     | T-204 + T-205 + T-207                     |
| **T-209** Monitoring alertes anomalies (cron Edge Function)              | 4h     | Aucun                                     |
| **T-210** Documentation utilisateur (FAQ + tuto video)                   | 1j     | Phase 1 fini                              |
| **T-211** Activer Sentry production                                      | 2h     | Aucun (preflight)                         |

**Total Phase 1 implementation** : ~5 jours dev (~40h)

## Sequence recommandée (ordre des batches)

1. **BATCH 28 — DB setup** : T-200 + T-201 + T-203 (~6h)
2. **BATCH 29 — Edge Function** : T-202 (~4h)
3. **BATCH 30 — Front signup** : T-204 + T-207 (~8h)
4. **BATCH 31 — Admin minimal** : T-205 (depend Module 5 admin, voir ADMIN_STRATEGY)
5. **BATCH 32 — Tooling** : T-206 + T-209 + T-211 (~10h)
6. **BATCH 33 — Tests + docs** : T-208 + T-210 (~12h)

## Effort Phase 2 et 3 (synthese)

| Phase   | Taches principales                                                                   | Effort |
| ------- | ------------------------------------------------------------------------------------ | ------ |
| Phase 2 | Self-service waitlist → cle auto, dashboard admin enrichi, email templates auto      | ~2.5j  |
| Phase 3 | Desactivation systeme cles (feature flag), rate limit signup, dashboard public stats | ~2j    |

---

# 📋 Checklist activation Phase 1

## Technique

- [ ] **T-211** Sentry production configure
- [ ] **T-200/T-201/T-203** Migrations DB appliquees PROD
- [ ] **T-202** Edge Function `validate-beta-key` deployee
- [ ] **T-204** Page signup avec champ cle fonctionnelle
- [ ] **T-205** Dashboard admin accessible
- [ ] Rate limit fonctionnel (test brute force OK)
- [ ] **T-208** Tests E2E flow complet signup avec cle passing
- [ ] **T-209** Monitoring alertes actives (email + Discord/Slack)
- [ ] Logs `beta_signup_log` verifies (anonymisation IP J+30)

## Conformité

- [ ] Pages Privacy/Legal a jour (deja OK BATCH precedent)
- [ ] Cookie banner actif (deja OK)
- [ ] Export RGPD fonctionnel sur testeur
- [ ] Suppression compte testee (RGPD)
- [ ] Conditions d'utilisation beta acceptees au signup

## Produit

- [ ] Email templates rediges (cle + onboarding)
- [ ] Tuto video / FAQ ecrite
- [ ] Formulaire feedback hebdo pret (Tally ou autre)
- [ ] Liste 10 invites vague 1 preparee

## Communication

- [ ] Discord/Slack canal beta cree
- [ ] Charte beta testeur ecrite (NDA, attendus, etc.)
- [ ] Process feedback documente
- [ ] Process incident documente (qui alerter, comment reagir)

---

# 🎯 Critères de succès Phase 1

A la fin des 5 semaines (50 users) :

| Critere                               | Cible          | Verdict |
| ------------------------------------- | -------------- | ------- |
| 50 users integres sans bug bloquant   | 100%           | ⬜      |
| Taux satisfaction (questionnaire fin) | > 7/10 moyenne | ⬜      |
| 0 incident securite                   | 0              | ⬜      |
| 0 corruption de donnees               | 0              | ⬜      |
| Posts crees total                     | > 50           | ⬜      |
| Reactions/follows total               | > 200          | ⬜      |
| % users qui reviennent J+7            | > 40%          | ⬜      |
| Sentry errors hebdo                   | < 5 critiques  | ⬜      |
| Feedback bugs identifies et priorises | 100%           | ⬜      |

**Si TOUS verts** → GO Phase 2.
**Si UN rouge** → analyse + correction + repartir.

---

# 🚨 Plan de réaction incident

## Bug critique découvert pendant vague

```
1. Stop immediat des nouvelles inscriptions :
   UPDATE beta_quota_config SET accepting_new_signups = FALSE WHERE id = 1;
2. Communication transparente aux beta testeurs (email + Discord)
3. Investigation root cause
4. Fix + deploiement
5. Tests en staging
6. Verification incident resolu sur prod
7. Reouverture inscriptions :
   UPDATE beta_quota_config SET accepting_new_signups = TRUE WHERE id = 1;
8. Documentation incident dans CHANGELOG.md + retrospective
```

## Saturation Supabase

```
1. Verifier plan Supabase actuel (Free / Pro / Team)
2. Surveiller metriques :
   - Database CPU > 80%
   - Storage > 80% du quota
   - Bandwidth > 80%
3. Si proche limite : upgrade plan AVANT incident
4. Si deja sature : stop signups + scale plan + reprise
```

---

# 📎 Références croisées

- [`STATUS_2026-05-13.md`](STATUS_2026-05-13.md) — etat technique cycle 1 (pre-requis OK)
- [`MASTER_TODO.md`](MASTER_TODO.md) — taches restantes (refactos, Phase 2 features)
- [`ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md`](ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md) — Module Beta du dashboard admin
- [`AUDIT_ADVISORS_2026-05-13.md`](AUDIT_ADVISORS_2026-05-13.md) — securite DB live
- [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md) — procedures deploiement

---

# 📜 Historique versions

- **v2.0** (2026-05-13) — Refondu post cycle 1. Pre-requis MVP valides. Plan actionnable avec 12 taches T-200 a T-211. Pattern RLS `(SELECT auth.uid())` integre (BATCH 22).
- **v1.0** (2026-05-04) — Premiere version strategique (futur, non actionnable). Pre-requis "MVP non consolide".

---

**📌 Document operationnel pret pour activation. Phase 1 implementable en ~5 jours dev des que Sentry configure + decision Q-ADM-3 (admin route /admin vs sous-domaine).**
