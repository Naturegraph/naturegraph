# Audit complet plateforme Naturegraph, 2026-08-04

> Audit autonome (site prod + base Supabase prod) réalisé après les releases
> V0.6.9/0.6.10/0.6.11. Prod = V0.6.11. Aucune modification appliquée : ce
> document liste les constats + recommandations, priorisés. Les changements DB
> prod attendent ta validation.

## Verdict global

**L'app est en bon état.** Sécurité des headers solide, RLS globalement saine,
bundle sous budget, runtime propre. Les points ci-dessous sont du **hardening et
du nettoyage**, aucun n'est une faille exploitable ouverte.

---

## 1. Sécurité, site (headers) — ✅ solide

| Header                    | Valeur                                                         | Verdict |
| ------------------------- | -------------------------------------------------------------- | ------- |
| Strict-Transport-Security | max-age 2 ans + includeSubDomains + preload                    | ✅      |
| Content-Security-Policy   | `default-src 'self'` + `worker-src 'self' blob:` (fix V0.6.10) | ✅      |
| X-Frame-Options           | DENY (+ `frame-ancestors 'none'`)                              | ✅      |
| X-Content-Type-Options    | nosniff                                                        | ✅      |
| Referrer-Policy           | strict-origin-when-cross-origin                                | ✅      |
| Permissions-Policy        | geolocation=(self), camera/micro=(), interest-cohort=()        | ✅      |

- **Note mineure** : `script-src` contient `'unsafe-inline'` (défaut Vite/React).
  Le durcir (nonces/hashes) est un gros chantier pour un gain modéré. Priorité basse.

## 2. Runtime, santé prod — ✅ propre

- Console page d'accueil : **aucune erreur** (juste le boot auth normal).
- Réseau : **tous les assets 200, aucun 404**.
- `_vercel/insights/script.js → 200` (Web Analytics **désormais actif**, le 404 du
  rapport Patrice est résolu).
- Worker `blob:` se charge sans être bloqué → **fix CSP `worker-src` validé en prod**.

## 3. Performance front / éco-conception — ✅ sous budget

- **Bundle JS d'entrée : 239 KB gzip** (budget CLAUDE.md : < 300 KB). ✅
  - `index` 124 KB · `supabase` 55 KB · `vendor` 35 KB · `i18n` 17 KB · `query` 13 KB.
- Piste future si besoin : le chunk `index` (124 KB) est le plus gros, candidat à
  du code-splitting supplémentaire, mais pas urgent tant qu'on est sous budget.

## 4. Accessibilité — ✅ bonne base

- ✅ Skip link (« Aller au contenu principal » → #main-content), landmarks
  (banner/nav/region), navigation labellisée, `alt` sur les images.
- ⚠️ **Micro-bug texte** : le H1 expose « donnons**vie** » collé (nom accessible
  « donnonsvie ») à cause d'un span coloré sans espace. Un lecteur d'écran lira
  « donnonsvie ». Fix trivial (espace insécable ou `aria-label` sur le H1).

## 5. Sécurité, base de données (Supabase advisors)

**Pas de faille ouverte.** Détail :

- ✅ Tables « RLS enabled, no policy » (email_blocklist, email_events,
  ghost_profiles_archive, infra_alert_state, media_backup_log,
  signup_surge_alert_state) = **deny-all intentionnel** (accès service_role/edge
  uniquement). C'est le comportement voulu.
- ⚠️ **ERROR** `spatial_ref_sys` RLS désactivée = **faux-positif PostGIS** connu
  (table système de référentiels spatiaux, données publiques non sensibles).
- ⚠️ **1 fonction sans `search_path` fixe** : `set_waitlist_marketing_consent_at`.
  Hardening facile (durcit contre l'injection de search_path).
- ⚠️ **Fonctions SECURITY DEFINER exposées en RPC** (~40, à anon et/ou
  authenticated). **À TRIER, PAS de revoke aveugle** :
  - **Intentionnelles, NE PAS toucher** : `search_taxonomy`, `search_cities`,
    `reverse_geocode_city` (recherche publique de l'app), les prédicats RLS
    (`is_admin`, `can_moderate`, `can_see_post`, `nearby_posts`...).
  - **À révoquer (candidats)** : `valider_espece_selon_type_post` (fonction de
    TRIGGER, ne devrait pas être appelable en RPC), `st_estimatedextent`
    (interne PostGIS), `is_internal_user` exposée à **anon** (fuite d'info mineure :
    savoir si un compte est interne).
- ⚠️ `extension_in_public` : postgis / unaccent / pg_trgm dans le schéma public.
  Cosmétique, setup Supabase courant. Déplacer est disruptif, priorité basse.

## 6. Performance, base de données

- ⚠️ **`auth_rls_initplan` (3 policies)** : `user_legal_consents` (x2) et
  `email_send_log` ré-évaluent `auth.<fn>()` **par ligne**. Fix : remplacer
  `auth.uid()` par `(select auth.uid())`. Migration simple, gain réel à l'échelle.
- INFO **2 FK sans index** : `comment_reactions.user_id`,
  `comments.taxonomy_node_id`. Mineur (ajouter un index si ces jointures montent).
- INFO **~28 index inutilisés** : **NE PAS supprimer maintenant**. En soft launch
  les stats d'usage ne sont pas représentatives, et plusieurs servent la
  recherche/geo (trigram, gist) pas encore exercée à fond. À réévaluer plus tard.
- INFO **6 tables à policies permissives multiples** (profiles, comments,
  notebooks...) : souvent intentionnel (owner + admin/public). Consolidation
  optionnelle, gain marginal.
- INFO 4 tables `backup.*` sans PK, et Auth à 10 connexions fixes → ignore
  (backups jetables ; connexions pertinent seulement au scale-up d'instance).

## 7. Observabilité — rappel

- Front-end : 100 % instrumenté. Edge : 4/24 fonctions à fort signal déployées.
  Les 20 autres = filet seul, déployables via CLI (cf. `EDGE_SENTRY_DEPLOY.md`).

---

## Priorités recommandées

| Prio          | Action                                                                                                       | Risque                            | Effort |
| ------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------ |
| **P1**        | Trier + `REVOKE EXECUTE` sur les SECURITY DEFINER non publics (trigger, internes, `is_internal_user` à anon) | Moyen (ne PAS toucher search\_\*) | ~1 h   |
| **P1**        | `search_path` fixe sur `set_waitlist_marketing_consent_at`                                                   | Faible                            | 5 min  |
| **P2**        | `(select auth.uid())` sur les 3 policies `auth_rls_initplan`                                                 | Faible                            | 15 min |
| **P3**        | Fix a11y « donnonsvie » (espace/aria-label)                                                                  | Nul                               | 5 min  |
| **P3**        | 2 index FK manquants                                                                                         | Faible                            | 10 min |
| **Plus tard** | staging resync (historique divergé), Dependabot (N/A/tooling), index inutilisés, `'unsafe-inline'` CSP       | —                                 | —      |

**Rien ici ne bloque les utilisateurs ni n'expose de faille ouverte.** Les items
DB prod (P1/P2) sont préparables en migration SQL, à appliquer après ta validation
(règle : pas de changement prod DB sans OK explicite).
