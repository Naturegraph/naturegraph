# INCIDENT_RESPONSE_PLAN.md : Plan de réponse aux incidents de sécurité

> Établi le 2026-05-20 · Naturegraph · Adapté au contexte MVP / beta fermée.
> Objectif : savoir QUOI faire, DANS QUEL ORDRE, en cas d'incident : sans paniquer.

---

## 0. Principes

1. **Contenir d'abord, comprendre ensuite.** Stopper l'hémorragie avant d'enquêter.
2. **Documenter en continu** (heure, action, constat) : utile pour le post-mortem ET
   l'obligation légale (Loi 25 : registre des incidents).
3. **Ne pas détruire les preuves** (logs, traces) pendant la réponse.
4. Responsable incident : **Nicolas** (fondateur). Pas de bus factor en MVP : d'où
   l'importance de ce document écrit.

---

## 1. Niveaux de gravité

| Niveau            | Définition                                                                     | Exemple                                               | Délai de réaction   |
| ----------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------- |
| **P1 : Critique** | Fuite de données perso confirmée, accès non autorisé en cours, prod compromise | RLS contournée, dump de `profiles`, compte admin volé | Immédiat            |
| **P2 : Élevé**    | Faille exploitable identifiée, pas de fuite confirmée                          | Clé exposée, Edge Function vulnérable                 | < 24 h              |
| **P3 : Modéré**   | Abus sans fuite                                                                | Spam waitlist, abus d'upload, bot                     | < 72 h              |
| **P4 : Faible**   | Anomalie à surveiller                                                          | Pic d'erreurs auth, dépendance vulnérable             | Prochaine itération |

---

## 2. Procédure générale (6 étapes)

### Étape 1 : Détecter & qualifier

- Source : alerte Supabase, Sentry, Dependabot, GitHub secret scanning, signalement
  externe (`SECURITY.md`), comportement anormal observé.
- Qualifier le niveau (P1-P4). En cas de doute → traiter au niveau supérieur.
- **Ouvrir le registre d'incident** (cf. §6) : date/heure, description, niveau.

### Étape 2 : Contenir

Actions de confinement selon le type (cf. §3 runbooks).

### Étape 3 : Éradiquer

- Corriger la cause racine (révoquer la clé, patcher la faille, supprimer l'accès).

### Étape 4 : Rétablir

- Restaurer le service, vérifier que l'accès malveillant est coupé, surveiller.

### Étape 5 : Notifier (si P1/P2 avec données perso)

- Cf. §5 : obligations légales RGPD + Loi 25.

### Étape 6 : Post-mortem

- Sous 7 jours : que s'est-il passé, pourquoi, qu'est-ce qui a marché/raté, quelles
  actions préventives. Mettre à jour ce plan.

---

## 3. Runbooks par scénario

### 🔑 Runbook A : Clé / secret exposé

_(clé `anon` n'est pas un secret ; vise `service_role`, token GitHub, DB password,
DSN avec write…)_

1. **Révoquer / régénérer immédiatement** la clé concernée :
   - Clé Supabase `service_role` → Supabase Dashboard → Settings → API → régénérer.
   - Token GitHub → Settings → révoquer.
   - Mot de passe DB → Supabase → régénérer.
2. Mettre à jour la nouvelle valeur dans Vercel / GitHub Secrets / `.env.local`.
3. Vérifier les **logs** Supabase/Vercel : la clé a-t-elle été utilisée par un tiers ?
4. Si la `service_role` a fui → considérer **toutes** les données comme potentiellement
   accédées → escalader en **P1**.
5. Si exposée dans un commit → le secret reste dans l'historique git : la révocation
   est la vraie protection (réécrire l'historique est secondaire).

### 🛡️ Runbook B : Compte admin / GitHub compromis

1. **GitHub** : révoquer toutes les sessions (Settings → Sessions), changer le mot de
   passe, vérifier/activer la 2FA, révoquer les tokens et OAuth apps suspects.
2. **Supabase** : révoquer les sessions du compte admin, changer le mot de passe.
3. **Vercel** : vérifier les membres de l'équipe, retirer tout accès inconnu.
4. Examiner `admin_audit_logs` : quelles actions admin ont été faites pendant la
   fenêtre de compromission ? (table immuable → fiable).
5. Annuler les actions malveillantes (clés beta générées, modérations, suppressions).
6. Si du code a été mergé → revue git, revert, redéploiement propre.

### 🗄️ Runbook C : Fuite / accès non autorisé aux données (RLS contournée)

1. **P1.** Identifier la table/donnée touchée et l'ampleur (combien de lignes ?).
2. **Contenir** : si la faille est une policy RLS défaillante → corriger/durcir la
   policy immédiatement (migration SQL), ou désactiver temporairement l'accès `anon`
   à la table (`REVOKE`).
3. Vérifier via les logs PostgREST l'étendue réelle de l'accès.
4. Patcher la cause (policy, fonction, grant).
5. **Notifier** (cf. §5) si données personnelles fuites.

### 📤 Runbook D : Abus (spam, scraping, upload, faux comptes)

1. **P3** en général. Identifier la source (compte, IP, pattern).
2. **Contenir** : désactiver le(s) compte(s) (`is_active=false`), désactiver les clés
   beta concernées, supprimer le contenu spam.
3. Si scraping de masse → activer/renforcer le rate limiting (Vague 1 roadmap).
4. Si abus d'upload → purger les fichiers, appliquer un quota.
5. Surveiller la récidive.

### 🐛 Runbook E : Dépendance vulnérable (Dependabot / CodeQL)

1. **P2 à P4** selon la sévérité et l'exploitabilité réelle.
2. Si correctif dispo → merger la PR Dependabot, vérifier CI, déployer.
3. Si pas de correctif → évaluer si la vulnérabilité est atteignable dans notre usage ;
   sinon documenter et surveiller.

### 🔥 Runbook F : Indisponibilité / DDoS léger

1. **P2.** Vérifier les dashboards Supabase (quotas) et Vercel (trafic).
2. Vercel absorbe le edge ; Supabase a des quotas : surveiller le plan.
3. Si abus ciblé → rate limiting, blocage d'IP au niveau Vercel.
4. Communiquer aux testeurs si le service est dégradé.

---

## 4. Contacts & ressources

| Ressource            | Où                                               |
| -------------------- | ------------------------------------------------ |
| Supabase Dashboard   | supabase.com/dashboard : projet Naturegraph      |
| Vercel Dashboard     | vercel.com : équipe `naturegraph-9868s-projects` |
| GitHub Security      | github.com/Naturegraph/naturegraph/security      |
| Support Supabase     | support@supabase.io / dashboard                  |
| Support Vercel       | vercel.com/help                                  |
| **CAI (Québec)**     | cai.gouv.qc.ca : déclaration d'incident Loi 25   |
| **CNIL (UE/France)** | cnil.fr : notification de violation RGPD         |

---

## 5. Obligations de notification (P1/P2 avec données personnelles)

### RGPD (UE/France)

- **Violation de données à caractère personnel** présentant un risque pour les droits
  et libertés → notification à la **CNIL sous 72 h** après en avoir pris connaissance.
- Si risque **élevé** → informer aussi **les personnes concernées** sans délai injustifié.
- Tenir une trace de toutes les violations (même non notifiées).

### Loi 25 (Québec)

- **Incident de confidentialité** présentant un **risque de préjudice sérieux** →
  notifier **la CAI** ET **les personnes concernées** avec diligence.
- Tenir un **registre des incidents de confidentialité** (obligatoire : cf. §6).
- Critères de « préjudice sérieux » : sensibilité de la donnée, anticipation d'un usage
  malveillant, probabilité d'un tel usage.

> ⚠️ La géolocalisation est une donnée sensible → un incident la touchant tend vers
> « risque/préjudice sérieux ». En cas de doute : notifier.

### Modèle de notification (à préparer le moment venu)

- Nature de l'incident, date, données concernées, nombre de personnes, conséquences
  probables, mesures prises et recommandées, coordonnées du responsable.

---

## 6. Registre des incidents (obligation Loi 25)

Tenir un tableau (ce fichier ou un doc dédié) : **une ligne par incident** :

| Date                                | Niveau | Description | Données touchées | Nb personnes | Confinement | Notifié (CAI/CNIL/users) | Statut | Post-mortem |
| ----------------------------------- | ------ | ----------- | ---------------- | ------------ | ----------- | ------------------------ | ------ | ----------- |
| _(vide : aucun incident à ce jour)_ |        |             |                  |              |             |                          |        |             |

---

## 7. Préparation (à faire AVANT tout incident)

- [ ] 2FA activée partout (cf. roadmap Vague 0.1)
- [ ] `SECURITY.md` avec canal de signalement + Private Vulnerability Reporting activé
- [ ] Accès aux dashboards (Supabase/Vercel/GitHub) testés et fonctionnels
- [ ] Sauvegardes Supabase vérifiées (Point-in-Time Recovery selon le plan)
- [ ] Ce plan lu et compris : savoir où il est le jour J
- [ ] Monitoring en place (Sentry, alertes Supabase) pour **détecter** vite

> Un incident bien géré = détecté tôt, contenu vite, documenté, notifié si requis.
> Ce plan évite d'improviser sous stress.
