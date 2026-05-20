# SECURITY_CHECKLIST_PRE_PROD.md — Checklist sécurité pré-production

> Établie le 2026-05-20 · À cocher avant chaque palier (beta → ouverture publique).
> Issue de la consolidation des audits SECURITY*\*.md / PRIVACY*\*.md / ROADMAP.

---

## Mode d'emploi

- **Colonne « Beta »** : doit être ✅ avant de donner les clés aux 5 testeurs.
- **Colonne « Public »** : doit être ✅ avant que n'importe qui puisse s'inscrire.
- État au 2026-05-20 noté dans « Actuel » : ✅ fait · ⬜ à faire · ➖ N/A.

---

## 1. Accès & comptes

| Contrôle                                                    | Beta | Public | Actuel |
| ----------------------------------------------------------- | :--: | :----: | :----: |
| 2FA activée sur le compte email du fondateur                |  ✅  |   ✅   |   ⬜   |
| 2FA activée sur GitHub (+ imposée org-wide)                 |  ✅  |   ✅   |   ⬜   |
| 2FA activée sur Supabase                                    |  ✅  |   ✅   |   ⬜   |
| 2FA activée sur Vercel                                      |  ✅  |   ✅   |   ⬜   |
| Membres équipe Vercel limités au strict nécessaire          |  ✅  |   ✅   |   ⬜   |
| Un seul super-admin, accès admin tracé (`admin_audit_logs`) |  ✅  |   ✅   |   ✅   |

## 2. Secrets

| Contrôle                                             | Beta | Public |     Actuel      |
| ---------------------------------------------------- | :--: | :----: | :-------------: |
| Aucun secret dans le code / l'historique git         |  ✅  |   ✅   |       ✅        |
| `.env*` gitignoré (sauf `.env.example`)              |  ✅  |   ✅   |       ✅        |
| Aucune clé `service_role` dans une variable `VITE_*` |  ✅  |   ✅   | ⬜ (à vérifier) |
| Secret scanning + push protection GitHub actifs      |  ✅  |   ✅   |       ✅        |
| Secrets CI = secrets d'environnement scoperés        |  ✅  |   ✅   | ⬜ (à vérifier) |

## 3. Supabase / Base de données

| Contrôle                                                  | Beta | Public |   Actuel   |
| --------------------------------------------------------- | :--: | :----: | :--------: |
| RLS activée sur toutes les tables applicatives            |  ✅  |   ✅   | ✅ (29/29) |
| Policies vérifiées (pas de `WITH CHECK (true)` non voulu) |  ✅  |   ✅   |     ✅     |
| Grants temporaires de seed révoqués                       |  ✅  |   ✅   |     ✅     |
| Leaked Password Protection activée                        |  ✅  |   ✅   |     ⬜     |
| `search_path` fixé sur les fonctions `SECURITY DEFINER`   |  ✅  |   ✅   |     ✅     |
| `REVOKE EXECUTE` sur les fonctions de trigger             |  ➖  |   ✅   |     ⬜     |
| Revue d'autorisation des 6 Edge Functions                 |  ➖  |   ✅   |     ⬜     |
| Anti-spam sur `beta_waitlist` (unicité + rate limit)      |  ➖  |   ✅   |     ⬜     |
| Sauvegardes / PITR Supabase vérifiées                     |  ✅  |   ✅   |     ⬜     |

## 4. Frontend / Application

| Contrôle                                          | Beta | Public | Actuel |
| ------------------------------------------------- | :--: | :----: | :----: |
| Aucun `dangerouslySetInnerHTML` / `eval`          |  ✅  |   ✅   |   ✅   |
| `npm audit` = 0 vulnérabilité                     |  ✅  |   ✅   |   ✅   |
| `debugLog` no-op en production                    |  ✅  |   ✅   |   ✅   |
| Gate beta + claim de clé atomique au signup       |  ✅  |   ➖   |   ✅   |
| Quota d'upload par utilisateur                    |  ➖  |   ✅   |   ⬜   |
| Route protection + RLS backend (defense in depth) |  ✅  |   ✅   |   ✅   |

## 5. Vercel / Hébergement

| Contrôle                                              | Beta | Public |   Actuel    |
| ----------------------------------------------------- | :--: | :----: | :---------: |
| Headers de sécurité (CSP, HSTS, X-Frame-Options…)     |  ✅  |   ✅   |     ✅      |
| Variables d'env cloisonnées prod / preview            |  ✅  |   ✅   |     ⬜      |
| Vercel Auth désactivée sur prod (testeurs y accèdent) |  ✅  |   ✅   |     ⬜      |
| Vercel Auth conservée sur les Preview (anti-leak)     |  ✅  |   ✅   |     ✅      |
| HTTPS forcé sur le domaine de prod                    |  ➖  |   ✅   | ⬜ (au DNS) |

## 6. GitHub / Dépôt

| Contrôle                                                | Beta | Public |    Actuel    |
| ------------------------------------------------------- | :--: | :----: | :----------: |
| Branch protection `main` (status checks, no force-push) |  ✅  |   ✅   |      ✅      |
| Dependabot + CodeQL actifs                              |  ✅  |   ✅   |      ✅      |
| Décision visibilité dépôt (public/privé) actée          |  ✅  |   ✅   |      ⬜      |
| `SECURITY.md` avec canal de signalement                 |  ➖  |   ✅   |      ⬜      |
| Private Vulnerability Reporting activé                  |  ➖  |   ✅   |      ⬜      |
| Workflows : permissions minimales + SHA pinning         |  ➖  |   ➖   | ⬜ (Phase 2) |

## 7. Conformité RGPD / Loi 25

| Contrôle                                                          | Beta | Public |     Actuel      |
| ----------------------------------------------------------------- | :--: | :----: | :-------------: |
| Suppression de compte fonctionnelle                               |  ✅  |   ✅   |       ✅        |
| Suppression purge aussi les fichiers Storage                      |  ✅  |   ✅   | ⬜ (à vérifier) |
| Export de données fonctionnel + complet                           |  ✅  |   ✅   | ⬜ (à vérifier) |
| Consentement géoloc explicite + révocable                         |  ✅  |   ✅   | ⬜ (à vérifier) |
| `location_visibility` par défaut = le plus protecteur             |  ✅  |   ✅   | ⬜ (à vérifier) |
| EXIF strippé sur les photos                                       |  ✅  |   ✅   |       ✅        |
| Cookies essentiels uniquement                                     |  ✅  |   ✅   |       ✅        |
| Anonymisation des logs (cron)                                     |  ✅  |   ✅   |       ✅        |
| Pages `/privacy` `/legal` à jour (géoloc, Loi 25, sous-traitants) |  ➖  |   ✅   |       ⬜        |
| Responsable de la protection des RP désigné + publié              |  ➖  |   ✅   |       ⬜        |
| Procédure d'incident prête (INCIDENT_RESPONSE_PLAN)               |  ✅  |   ✅   |       ✅        |
| Registre des incidents de confidentialité ouvert                  |  ✅  |   ✅   |       ✅        |

## 8. Réponse à incident

| Contrôle                                   | Beta | Public |      Actuel      |
| ------------------------------------------ | :--: | :----: | :--------------: |
| INCIDENT_RESPONSE_PLAN.md lu et accessible |  ✅  |   ✅   |        ✅        |
| Monitoring d'erreurs (Sentry) opérationnel |  ➖  |   ✅   | ⬜ (à confirmer) |
| Alertes Supabase configurées               |  ➖  |   ✅   |        ⬜        |

---

## Verdict de passage

### ➡️ Feu vert BETA

Conditionné aux ⬜ de la colonne « Beta » — essentiellement la **Vague 0 de la roadmap**
(2FA, leaked-password, cloisonnement env Vercel, Vercel Auth prod, décision dépôt,
vérif purge Storage / export / consentement géoloc, sauvegardes). **≈ 1 journée** de
travail, surtout des réglages et vérifications.

> Tant que ces points « Beta » ne sont pas ✅, ne pas distribuer les clés.

### ➡️ Feu vert OUVERTURE PUBLIQUE

Conditionné à TOUTES les colonnes « Public » ✅ — soit la **Vague 0 + Vague 1** de la
roadmap (revue Edge Functions, REVOKE EXECUTE, anti-spam waitlist, quotas, rate
limiting, pages légales, responsable PRP). **≈ 2-3 jours** de sprint hardening.

---

## Récapitulatif — ce qui est DÉJÀ solide ✅

- RLS sur 29/29 tables · policies vérifiées · grants de seed révoqués
- 0 dépendance vulnérable · secret scanning · Dependabot · CodeQL
- Aucun secret dans le code/git · headers HTTP complets
- Pas de XSS (React, pas de innerHTML/eval) · pas de CSRF (Bearer token)
- Branch protection `main` · audit trail admin immuable
- EXIF strip · anonymisation cron · suppression compte · export · cookies essentiels
- Plan de réponse à incident + registre prêts

**Naturegraph part d'une base saine.** La sécurité restante est surtout du
**durcissement et de la vérification**, pas de la correction de failles.
