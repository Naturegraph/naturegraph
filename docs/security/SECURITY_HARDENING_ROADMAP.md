# SECURITY_HARDENING_ROADMAP.md — Feuille de route durcissement sécurité

> Établie le 2026-05-20 · Consolidation priorisée des audits SECURITY*\*.md + PRIVACY*\*.md
> Principe : traiter les **vrais risques** d'abord, sans sur-ingénierie MVP.

---

## Lecture rapide

- **Vague 0 — AVANT beta** (testeurs accèdent à l'app) : actions bloquantes pour la beta.
- **Vague 1 — AVANT ouverture publique** : à faire avant que n'importe qui puisse créer
  un compte / accéder à la waitlist publique.
- **Vague 2 — Durcissement continu** : amélioration, Phase 2, non bloquant.

Aucune faille 🔴 critique → aucune action d'urgence absolue. La beta fermée (clés
`max_uses=1`) limite déjà fortement la surface.

---

## 🟢 VAGUE 0 — Avant la beta (effort total ≈ 1 h 30, surtout des clics)

| #   | Action                                                                                                                                                                                       | Effort | Réf                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------- |
| 0.1 | **Activer la 2FA** : compte email Nicolas + GitHub + Supabase + Vercel. Imposer 2FA au niveau de l'org GitHub.                                                                               | 30 min | GITHUB §3, GLOBAL §2 |
| 0.2 | **Activer la protection « mots de passe compromis »** Supabase (Auth → Settings → Leaked Password Protection) + longueur min 10.                                                             | 5 min  | SUPABASE §3          |
| 0.3 | **Vérifier le cloisonnement des variables d'env Vercel** : Production → projet Supabase prod, Preview/Dev → projet dev. Confirmer qu'aucun secret `service_role` n'est en variable `VITE_*`. | 30 min | VERCEL §2            |
| 0.4 | **Désactiver Vercel Authentication sur la production uniquement** (pour que les testeurs accèdent) — garder l'Auth sur les Preview. La gate beta interne reste le contrôle d'accès.          | 10 min | VERCEL §3            |
| 0.5 | **Décision consciente** : dépôt GitHub public ou privé pour la beta. Si public → désactiver le forking.                                                                                      | 10 min | GITHUB §1            |

> ✅ Après la Vague 0, la beta fermée peut démarrer sereinement.

---

## 🟠 VAGUE 1 — Avant ouverture publique (effort total ≈ 1,5–2 jours)

### A. Réduction de surface Supabase

| #   | Action                                                                                                                                                                                                                                                                                   | Effort | Réf         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| A1  | **Revue d'autorisation des 6 Edge Functions** (`admin-delete-user`, `delete-account`, `export-data`, `send-waitlist-confirmation`, `validate-beta-key`, `weekly-species-digest`) : vérifier JWT + droits + pas de log de données sensibles.                                              | 2 h    | SUPABASE §4 |
| A2  | **`REVOKE EXECUTE` sur les fonctions de trigger** depuis `anon`/`authenticated` (migration SQL). Garder l'EXECUTE uniquement sur les RPC métier réellement appelées (`claim_beta_access_key`, `check_beta_access_key_validity`, `search_cities`, `nearby_posts`, `generate_beta_keys`…). | 3 h    | SUPABASE §2 |
| A3  | **Purge Storage à la suppression de compte** : `delete-account` doit supprimer les objets `avatars`/`banners`/`post-media` de l'utilisateur (droit à l'oubli).                                                                                                                           | 2 h    | PRIVACY §2  |

### B. Anti-abus / quotas

| #   | Action                                                                                                                                 | Effort | Réf         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| B1  | **Anti-spam waitlist** : contrainte d'unicité sur `beta_waitlist.email` + rate limiting + honeypot/Turnstile sur le formulaire public. | 3 h    | SUPABASE §1 |
| B2  | **Quota d'upload par utilisateur** (ex. 100 médias / 200 MB) — trigger ou comptage applicatif.                                         | 3 h    | GLOBAL §3   |
| B3  | **Rate limiting** sur les endpoints sensibles (signup, waitlist, recherche) — via Edge Function ou Vercel.                             | 3 h    | INFRA       |

### C. Conformité

| #   | Action                                                                                                                                                    | Effort | Réf            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| C1  | **Mettre à jour `/privacy` et `/legal`** : géolocalisation, photos, **section Loi 25**, liste des sous-traitants, lieu d'hébergement, responsable PRP.    | 2 h    | PRIVACY §3,6,7 |
| C2  | **Désigner + publier le responsable** de la protection des renseignements personnels (Loi 25).                                                            | 15 min | PRIVACY §6.1   |
| C3  | **Vérifier le flux de consentement géoloc** : opt-in explicite, finalité expliquée, révocation simple, défaut le plus protecteur (`location_visibility`). | 2 h    | PRIVACY §3,4   |
| C4  | **Vérifier la complétude de l'export de données** (`export-data`) + signed URL.                                                                           | 1 h    | PRIVACY §2     |
| C5  | **Activer Private Vulnerability Reporting** GitHub + compléter `SECURITY.md` (canal de signalement).                                                      | 30 min | GITHUB §6      |

---

## 🟡 VAGUE 2 — Durcissement continu (Phase 2, non bloquant)

| #   | Action                                                                                                                           | Effort | Réf          |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------ |
| 2.1 | CSP basée sur `nonce` (supprimer `'unsafe-inline'`) via middleware Vercel.                                                       | 4 h    | VERCEL §1.1  |
| 2.2 | Pinning SHA des actions GitHub tierces + `permissions:` minimal dans les workflows.                                              | 1 h    | GITHUB §5    |
| 2.3 | Migration `nearby_posts` (PostGIS ST_DWithin côté serveur) à la place du filtre Haversine client — perf + cohérence à l'échelle. | 3 h    | (perf)       |
| 2.4 | Déplacer les extensions (`postgis`, `pg_trgm`, `unaccent`) dans un schéma `extensions`.                                          | 2 h    | SUPABASE §7  |
| 2.5 | Validation des **magic bytes** des uploads (Edge Function de traitement image).                                                  | 2 h    | GLOBAL §3    |
| 2.6 | Politique de **rétention des données** formalisée + cron de purge des exports.                                                   | 2 h    | PRIVACY §5   |
| 2.7 | Activer `secret_scanning_non_provider_patterns` + `validity_checks` GitHub.                                                      | 5 min  | GITHUB §4    |
| 2.8 | ÉFVP (Loi 25) formalisée pour la géolocalisation.                                                                                | 2 h    | PRIVACY §6.3 |
| 2.9 | Monitoring : alertes Supabase (pics de requêtes, erreurs auth), revue régulière des `admin_audit_logs`.                          | 2 h    | INCIDENT     |

---

## Synthèse effort

| Vague   | Effort                   | Bloquant                           |
| ------- | ------------------------ | ---------------------------------- |
| Vague 0 | ~1 h 30 (clics + vérifs) | **Oui — avant beta**               |
| Vague 1 | ~1,5–2 jours             | **Oui — avant ouverture publique** |
| Vague 2 | ~3 jours étalés          | Non — Phase 2                      |

**Recommandation** : exécuter la **Vague 0 immédiatement** (rapide, surtout des
réglages). La beta fermée à 5 testeurs peut démarrer juste après. La Vague 1 est à
planifier comme un sprint « hardening » avant toute ouverture publique.
