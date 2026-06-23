# PRIVACY_COMPLIANCE_AUDIT.md : Conformité RGPD & Loi 25 (Québec)

> Audit réalisé le 2026-05-20 · Périmètre : RGPD (UE) + Loi 25 (Québec)
> ⚠️ Document d'audit technique : ne remplace pas un avis juridique professionnel.

---

## 0. Synthèse

Naturegraph traite des **données personnelles sensibles** : identité, email,
**géolocalisation**, photos, données comportementales (observations, suivis). Avec des
testeurs au Québec, **la Loi 25 s'applique en plus du RGPD**.

Les fondations de conformité sont **en place** (suppression de compte, export, pages
légales, anonymisation cron, EXIF stripping, minimisation). Les écarts restants sont
surtout **organisationnels** (responsable de la protection des données, procédure de
notification de violation).

| Sévérité     | Nombre |
| ------------ | ------ |
| 🔴 Critique  | 0      |
| 🟠 Important | 3      |
| 🟡 Moyen     | 4      |
| ⚪ Mineur    | 2      |

---

## 1. Données personnelles traitées (cartographie)

| Donnée                                                | Table / lieu                   | Sensibilité            | Base légale                     |
| ----------------------------------------------------- | ------------------------------ | ---------------------- | ------------------------------- |
| Email                                                 | `auth.users`, `profiles.email` | Moyenne                | Contrat (compte)                |
| Nom / prénom / pseudo                                 | `profiles`                     | Moyenne                | Contrat                         |
| **Géolocalisation** (ville, rayon, centroïde)         | `profiles.location_*`          | **Élevée**             | Consentement                    |
| Photos d'observation                                  | Storage `post-media`           | Moyenne (EXIF strippé) | Contrat                         |
| Observations (espèce, lieu, date)                     | `posts`, `media`               | Moyenne-élevée         | Contrat                         |
| Données comportementales (suivis, réactions, carnets) | `follows`, `reactions`…        | Moyenne                | Intérêt légitime                |
| Logs d'inscription beta                               | `beta_signup_log`              | Moyenne                | Intérêt légitime → anonymisé    |
| Logs admin                                            | `admin_audit_logs`             | Moyenne                | Obligation légale (traçabilité) |

---

## 2. Droits des personnes

### 🟢 Droit à l'effacement

- Edge Function `delete-account` + RPC de suppression. La suppression de `auth.users`
  cascade vers `profiles` et le contenu lié (vérifié lors du reset DB).
- **🟡 À confirmer** : la suppression purge-t-elle AUSSI les **fichiers Storage**
  (avatars, banners, post-media) de l'utilisateur ? La suppression d'une ligne `media`
  ne supprime pas l'objet Storage. → Risque de **données orphelines** persistantes
  après suppression de compte = non-conformité droit à l'oubli.
- **Mitigation** : la fonction `delete-account` doit explicitement supprimer les objets
  Storage de l'utilisateur (via service_role). À auditer/compléter.
- **Effort** : 2 h. **Avant prod ?** OUI.

### 🟢 Droit à la portabilité / accès

- Edge Function `export-data` + bucket privé `exports`. ✅
- **🟡 À vérifier** : l'export couvre-t-il **toutes** les données (profil, observations,
  médias, suivis, paramètres) dans un format lisible (JSON/ZIP) ? Et l'URL d'export
  est-elle une **signed URL** à durée limitée (le bucket `exports` est privé ✅) ?
- **Effort** : 1 h (vérification). **Avant prod ?** OUI.

### 🟡 Droit de rectification

- Édition de profil disponible (EditProfilePanel). ✅ Couvert.

### 🟡 Droit d'opposition / retrait du consentement géoloc

- L'utilisateur peut-il **retirer** sa localisation après l'avoir donnée ?
  `LocationContext` expose `setLocation(..., null)` / `clear_user_location` RPC existe.
  ✅ À confirmer que l'UI Settings le permet clairement.
- **Effort** : 30 min (vérification UI). **Avant prod ?** OUI.

---

## 3. Consentement

### 🟢 Cookies

- Bandeau cookies : **cookies essentiels uniquement** (session, préférences), aucun
  cookie publicitaire/traçage. → Pas besoin de consentement opt-in cookies (les cookies
  strictement nécessaires en sont exemptés). ✅ Conforme.

### 🟠 Consentement géolocalisation

- **Description** : la géolocalisation est une donnée sensible. Le consentement doit
  être **explicite, éclairé, granulaire et révocable**.
- **État** : `update_user_location` a un paramètre `p_consent_source` → la notion de
  consentement est tracée. `location_visibility` permet de contrôler la visibilité.
- **🟠 À garantir** :
  1. L'utilisateur consent **activement** (pas de géoloc par défaut) : Privacy by
     Default.
  2. Le consentement est **horodaté et tracé** (`location_consent_source`,
     `location_updated_at` ✅).
  3. La finalité est **expliquée** au moment de la demande (pourquoi on demande la
     localisation : filtrer le feed par rayon).
  4. Révocation simple (cf. §2).
- **Risque** : géoloc collectée sans consentement clair = violation RGPD art. 6/7 +
  Loi 25.
- **Priorité** : importante.
- **Mitigation** : revue du flux d'onboarding/Settings localisation : écran de
  consentement explicite + lien vers la politique de confidentialité.
- **Effort** : 2 h (revue + ajustement UI si besoin). **Avant prod ?** OUI.

### 🟢 CGU / politique de confidentialité

- Pages `/privacy` et `/legal` existent. **🟡 À mettre à jour** pour : (a) mentionner
  explicitement le traitement de la géolocalisation et des photos, (b) ajouter la
  **section Loi 25 / Québec** (résidents du Québec), (c) coordonnées du responsable.
- **Effort** : 2 h (rédaction). **Avant prod ?** OUI.

---

## 4. Privacy by Design / by Default

### 🟢 Minimisation

- Pas de collecte superflue. La section « Réseaux sociaux » du profil a même été
  **retirée** en Phase 1 (donnée non affichée = non collectée). ✅
- Géoloc stockée au **centroïde de ville** + rayon, pas en coordonnées GPS exactes →
  minimisation de précision. ✅ Bonne pratique.

### 🟢 EXIF stripping

- Les métadonnées EXIF des photos (dont GPS) sont supprimées à l'upload (audit
  précédent). → Pas de fuite de position via les photos. ✅

### 🟢 Anonymisation

- Cron `anonymize_beta_signup_log` anonymise les logs d'inscription après délai. ✅

### 🟡 Visibilité de la localisation

- `location_visibility` permet `public` / `approx` / `private`. **Privacy by Default** =
  la valeur par défaut doit être la **plus protectrice** (`private` ou `approx`, jamais
  `public` par défaut). → À vérifier dans le code (`DEFAULT_RADIUS` /
  default visibility).
- **Effort** : 30 min. **Avant prod ?** OUI.

---

## 5. Conservation & logs

### 🟡 Durées de conservation

- **Description** : aucune politique de rétention formalisée pour les comptes inactifs,
  les logs, les exports.
- **Mitigation** : définir et documenter : ex. logs admin conservés 12 mois, exports
  RGPD purgés du bucket après 30 j, comptes inactifs supprimés/anonymisés après X mois.
- **Effort** : 1 h (rédaction de la politique) + cron de purge des exports.
- **Avant prod ?** NON pour la beta / OUI avant ouverture publique.

### 🟢 Logs admin immuables

- `admin_audit_logs` est INSERT-only (trigger anti UPDATE/DELETE) → traçabilité des
  accès administrateurs garantie. ✅ Exigence Loi 25 (mesures de sécurité + journal).

---

## 6. Loi 25 (Québec) : spécificités

Avec des testeurs au Québec, la **Loi 25** (modernisation des dispositions sur la
protection des renseignements personnels) s'applique :

### 🟠 6.1 : Responsable de la protection des renseignements personnels

- La Loi 25 exige la **désignation d'un responsable** (par défaut, la personne ayant la
  plus haute autorité : Nicolas). Son titre et ses coordonnées doivent être **publiés**
  (site web).
- **Mitigation** : ajouter sur `/privacy` une mention « Responsable de la protection
  des renseignements personnels : [Nom], [email] ».
- **Effort** : 15 min. **Avant prod ?** OUI.

### 🟠 6.2 : Procédure d'incident de confidentialité

- La Loi 25 impose, en cas d'**incident de confidentialité** présentant un risque de
  préjudice sérieux : notification à la **Commission d'accès à l'information du Québec
  (CAI)** ET aux personnes concernées, + tenue d'un **registre des incidents**.
- **Mitigation** : cf. INCIDENT_RESPONSE_PLAN.md (registre + procédure de notification).
- **Effort** : couvert par l'INCIDENT_RESPONSE_PLAN. **Avant prod ?** OUI (procédure
  prête, même si jamais déclenchée).

### 🟡 6.3 : Évaluation des facteurs relatifs à la vie privée (ÉFVP)

- Pour un projet traitant de la géolocalisation, une ÉFVP allégée est recommandée
  (Loi 25). Le présent document + la cartographie §1 en constituent une base.
- **Effort** : formalisation 1-2 h. **Avant prod ?** NON pour beta fermée / OUI public.

### 🟡 6.4 : Consentement (Loi 25 ≈ RGPD)

- Consentement « manifeste, libre, éclairé, donné à des fins spécifiques ». Le flux
  géoloc (§3) doit le respecter : exigence commune RGPD + Loi 25.

### ⚪ 6.5 : Transfert hors Québec

- Les données sont hébergées sur Supabase / Vercel (hors Québec). La Loi 25 demande une
  évaluation que la juridiction d'hébergement offre une protection équivalente. À
  mentionner dans la politique de confidentialité (lieu d'hébergement + sous-traitants).
- **Effort** : inclus dans la mise à jour `/privacy`. **Avant prod ?** OUI.

---

## 7. Sous-traitants (data processors)

| Sous-traitant                     | Rôle                                   | Donnée                                       |
| --------------------------------- | -------------------------------------- | -------------------------------------------- |
| Supabase                          | Base de données, auth, storage         | Toutes                                       |
| Vercel                            | Hébergement frontend                   | Logs, IP                                     |
| Sentry (si activé)                | Monitoring d'erreurs                   | Contexte d'erreur                            |
| GBIF / OpenDataSoft / API Adresse | Données de référence (espèces, villes) | **Aucune donnée perso** (sortant uniquement) |

- 🟡 La politique de confidentialité doit **lister les sous-traitants** et leur rôle
  (RGPD art. 28 + Loi 25). Vérifier que Sentry, s'il est activé, ne capture pas de
  données personnelles (scrubbing du contexte).
- **Avant prod ?** OUI (liste dans `/privacy`).

---

## 8. Verdict conformité

| Exigence                          | État                                              |
| --------------------------------- | ------------------------------------------------- |
| Droit à l'effacement              | 🟠 vérifier purge Storage                         |
| Droit d'accès / portabilité       | 🟡 vérifier complétude export                     |
| Consentement cookies              | ✅ essentiels only                                |
| Consentement géoloc               | 🟠 garantir flux explicite + révocable            |
| Minimisation / Privacy by Default | ✅ centroïde, EXIF strip, no superflu             |
| Anonymisation                     | ✅ cron logs                                      |
| Loi 25 : responsable PRP          | 🟠 à désigner + publier                           |
| Loi 25 : procédure incident       | 🟠 cf. INCIDENT_RESPONSE_PLAN                     |
| Pages légales                     | 🟡 mettre à jour (géoloc, Loi 25, sous-traitants) |

**Conformité raisonnable atteignable rapidement.** Les écarts sont surtout
documentaires/organisationnels. Aucune collecte abusive identifiée. Actions prioritaires
regroupées dans SECURITY_HARDENING_ROADMAP.md.
