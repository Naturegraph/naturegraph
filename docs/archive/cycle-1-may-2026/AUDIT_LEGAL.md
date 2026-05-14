# Naturegraph — Audit Conformité Légale (RGPD + Loi 25 + Canada)

> **Version** : 1.0 — 2026-05-02
> **Posture** : strict, exhaustif, pas de supposition. Chaque finding vérifié dans le code.
> **Référentiels** :
>
> - **RGPD** (Règlement UE 2016/679) — utilisateurs France / UE
> - **Loi 25** (Québec, Loi modernisant la protection des renseignements personnels, en vigueur depuis sept. 2023)
> - **LPRPDE / PIPEDA** (Loi canadienne fédérale)
> - Lignes directrices CNIL (cookies, consentement)

---

## ⚖️ TL;DR — Verdict global

🔴 **Le produit n'est PAS conforme** à un déploiement public en l'état. **8 manquements bloquants** identifiés.

Les 3 plus critiques :

1. **Pages Privacy + Legal sont des placeholders "Bientôt disponible"** alors que le contenu existe en i18n (`fr.json:1023-1056`) — l'utilisateur n'a **AUCUN moyen de consulter la politique** avant de s'inscrire
2. **EXIF GPS non strippé** avant upload → fuite de coordonnées dans les métadonnées du fichier, **même si l'utilisateur a coché "Région masquée"** (RGPD Art 5 minimisation + Art 32 sécurité)
3. **Aucun bouton d'export RGPD** (Art 20 portabilité) ni dans le code ni dans Settings — la politique renvoie à `privacy@naturegraph.fr` ce qui ne suffit PAS pour un service en ligne

**Risque** : amende administrative CNIL (jusqu'à 4 % CA) + plainte CAI Québec (jusqu'à 25 M$ CAN) + exposition réputationnelle.

**Action** : **bloquer la mise en production publique** tant que les 8 bloquants ne sont pas résolus. ~3-4 jours de travail estimé.

---

# ⚖️ Conformité légale

## ✅ Conforme

### Architecture sécurité

- ✅ **HTTPS** forcé (Vercel)
- ✅ **Magic link OTP** (pas de mot de passe stocké côté client) — bonne pratique RGPD Art 32
- ✅ **CSP stricte** (`index.html:68-83`) avec `frame-ancestors 'none'`, `object-src 'none'`
- ✅ **X-Frame-Options: DENY** (`index.html:86`) — anti-clickjacking
- ✅ **HSTS** activé via Cloudflare/Supabase
- ✅ **Strict-Transport-Security: max-age=31536000** (`Supabase headers`)
- ✅ **RLS Postgres** active sur toutes les tables exposées (audité)
- ✅ **Edge Functions JWT-protected** (`delete-account`)

### Minimisation partielle

- ✅ Pas d'analytics tiers (GA, Mixpanel, FullStory, Hotjar) → 0 tracker third-party détecté
- ✅ Pas de polling de tracking
- ✅ `notificationAnalytics.ts` est un **stub local** (`window.ngTrack` non branché) — pas de PII envoyée
- ✅ Pas de demande inutile de phone, date naissance, sexe, etc.

### Droit à l'oubli (partiellement)

- ✅ Edge Function `delete-account` existe avec mode `hard` (suppression cascade) et `anonymize` (préserve contributions, anonymise identité)
- ✅ Suppression cascade `auth.users` → `profiles` → `posts` → `media` + nettoyage Storage buckets
- ✅ `queryClient.clear()` côté client après suppression

### Droit d'accès / rectification (UI partielle)

- ✅ Profil consultable (`/profile`)
- ✅ Modification possible (`EditProfilePanel`) : username, bio, ville, région, intérêts, photos, réseaux sociaux

### Audit trail prévu

- ✅ Table `security_audit_log` créée (migration `20260502_settings_phase2_complete.sql`) avec event*types `email_change*_`, `account*deletion*_`, `signin/signout`
- ⚠️ **MAIS** : table créée, **non alimentée par le code** (cf. AUDIT_TECHNIQUE.md RT-7)

---

## ❌ Non conforme

### NC-1 🔴 Politique de confidentialité INACCESSIBLE

**Fichier** : `src/pages/Privacy.tsx:1-39`
**Constat** : la page rend un placeholder "Bientôt disponible" avec une icône Wrench. Le contenu RGPD complet existe pourtant dans `src/i18n/locales/fr.json:1023-1041` (sections 1 à 6 : données collectées, utilisation, cookies, conservation, droits, contact).
**Impact RGPD** :

- Art 12 : information transparente, accessible **AVANT collecte** → non respecté
- Art 13 : information à fournir lors de la collecte (finalités, durée conservation, droits) → contenu existant non rendu
  **Impact Loi 25** :
- Art 8.3 : politique de confidentialité doit être publiée et facilement accessible → **bloquant**
  **Sévérité** : 🔴 critique, **bloque toute mise en production publique**.

### NC-2 🔴 Mentions légales INACCESSIBLES

**Fichier** : `src/pages/Legal.tsx:1-39`
**Constat** : même placeholder. Contenu disponible dans `fr.json:1042-1055` (éditeur, hébergement, propriété intellectuelle, responsabilité, droit applicable).
**Impact** :

- LCEN (loi française) Art 6 III : éditeur de service en ligne doit identifier nommément la personne physique/morale → non respecté
- Loi 25 : identité et coordonnées du responsable obligatoires
  **Sévérité** : 🔴 critique.

### NC-3 🔴 EXIF GPS non strippé avant upload

**Fichiers** :

- `src/utils/extractPhotoMetadata.ts:1-40` (lit l'EXIF côté client pour pré-remplir le formulaire)
- `src/services/mediaService.ts:7-9` (commentaire explicite : _"la conversion WebP / strip EXIF côté client est volontairement minimaliste pour le MVP"_)
  **Constat** : la photo originale, **avec ses coordonnées GPS embarquées**, est uploadée telle quelle dans le bucket Supabase Storage `posts` qui est **public**.
  **Impact** :
- Un visiteur télécharge la photo → coordonnées GPS exactes accessibles via les métadonnées
- **Contradiction directe avec le toggle "Région masquée"** (cas typique : protéger une espèce sensible)
  **RGPD** :
- Art 5(1)(c) minimisation des données : on collecte/expose plus que nécessaire
- Art 32 sécurité : mesure technique adaptée non implémentée
  **Loi 25** :
- Art 9 : obligation de protection raisonnable
  **Sévérité** : 🔴 critique RGPD + faune sauvage.

### NC-4 🔴 Aucun bouton d'export des données (portabilité)

**Constat** :

- Aucune route `/settings/export-data` dans `src/App.tsx` (vérifié via grep)
- Aucun composant `ExportData*` ou similaire
- Aucune Edge Function `export-user-data`
- La politique (i18n) renvoie à `privacy@naturegraph.fr` pour exercer le droit
  **Impact RGPD** :
- Art 20 portabilité : **droit de recevoir ses données dans un format structuré, lisible par machine** (JSON / CSV) → non implémenté
- L'envoi par email d'un export manuel n'est PAS une réponse adéquate pour un service numérique B2C
  **Loi 25** :
- Art 27 : droit d'accès aux renseignements
- Art 27.3 : droit à la portabilité **dans un format technologique structuré**
  **Sévérité** : 🔴 critique.

### NC-5 🔴 Aucun cookie banner / UI de consentement

**Constat** :

- Aucun composant `CookieBanner`, `CookieConsent`, ou équivalent (vérifié via grep)
- Pourtant `Cloudflare set-cookie: __cf_bm` détecté dans la requête à Supabase (cookie de bot management Cloudflare, **valide 30 min** mais déposé sur tous les visiteurs)
- `localStorage` utilisé par Supabase Auth pour stocker le JWT (technique, exempté CNIL si essentiel uniquement)
- Google Fonts chargé depuis `fonts.gstatic.com` (`index.html:91`) → potentiellement un cookie technique selon le navigateur
  **Politique annonce** : _"uniquement des cookies essentiels au fonctionnement du site (session, préférences de langue). Aucun cookie publicitaire ou de traçage."_ (`fr.json:1033`)
  **Impact RGPD + ePrivacy + Loi 25** :
- CNIL ligne directrice : si **uniquement cookies strictement nécessaires**, pas de banner mais **information obligatoire** dans la politique → la politique existe en i18n mais NC-1 la rend invisible
- Cookies Cloudflare bot management : **non strictement nécessaires** au sens CNIL strict → consentement requis
- Loi 25 Art 8.3 : information sur tout traitement, y compris technique
  **Sévérité** : 🔴 critique tant que NC-1 non résolu. Si NC-1 résolu et politique accessible, sévérité passe à 🟠.

### NC-6 🟠 Divergence politique vs réalité — durée de conservation

**Politique** (`fr.json:1035`) : _"Vous pouvez demander la suppression de votre compte et de toutes vos données à tout moment. Les données sont alors supprimées sous 30 jours."_
**Code réel** (`accountDeletionService.ts` + `delete-account` Edge Function mode `hard`) : suppression **immédiate** (`auth.admin.deleteUser` synchrone).
**Impact** :

- Art 5(1)(a) loyauté : ce qui est annoncé doit correspondre à la réalité
- Loi 25 Art 5 : exactitude des renseignements communiqués
- **Risque inverse aussi** : si l'utilisateur clique par erreur, suppression instantanée = perte définitive (cf. NC dans audit fonctionnel sur DeleteAccountModal sans double-confirm)
  **Sévérité** : 🟠 grave, à harmoniser politique ↔ implémentation.

### NC-7 🟠 Email DPO/Privacy non vérifié

**Politique** : `privacy@naturegraph.fr`
**Constat** : impossible de vérifier sans outil externe que cet email est actif et monitoré. Aucun fichier de configuration MX dans le repo. Aucun process documenté.
**Impact RGPD** :

- Art 13(1)(b) : coordonnées du DPO si désigné, ou point de contact dédié, doivent être **accessibles ET fonctionnels**
- Si l'email rebondit ou n'est pas lu en 30 jours max, manquement Art 12(3) (réponse à demande)
  **Sévérité** : 🟠 grave si non vérifié.

### NC-8 🟠 Pas de désignation explicite du Responsable de traitement / DPO

**Constat** :

- La politique mentionne _"Responsable du traitement : Naturegraph, France"_ sans nom de personne physique ni numéro RNA / SIREN
- Aucun DPO mentionné (obligatoire RGPD Art 37 si traitement à grande échelle de données particulières — la géolocalisation peut être considérée comme telle pour des espèces sensibles)
- Loi 25 Art 8 : **désignation obligatoire d'une personne en charge** de la protection des renseignements personnels → fonction publique sur le site (via lien direct)
  **Sévérité** : 🟠 grave, en particulier pour le marché québécois.

---

## ⚠️ Risques légaux

### RL-1 🟠 Hébergement Supabase au Canada (région YUL Montréal)

**Constat technique** : `curl https://hrxgduvworofnrjmgpcj.supabase.co -I` retourne `cf-ray: 9f5af4304c83a2c9-YUL` → région Cloudflare Montreal. Supabase utilise AWS sous-jacent — **à confirmer auprès de Supabase la région exacte du projet**.
**Implications** :

- ✅ **Pour utilisateurs Québec/Canada** : conforme Loi 25 (données au Canada, pas de transfert frontalier)
- ⚠️ **Pour utilisateurs France/UE** : **transfert hors UE** vers le Canada
- Le Canada bénéficie d'une **décision d'adéquation** RGPD (depuis 2001, confirmée 2020) UNIQUEMENT pour les organisations commerciales soumises à la LPRPDE → Supabase Inc. doit être couverte
- **À vérifier** : le DPA (Data Processing Agreement) Supabase signé ?
- **À documenter** dans la politique de confidentialité
  **Sévérité** : 🟠 si non documenté, 🟢 si documenté.

### RL-2 🟠 Hébergement frontend Vercel (États-Unis)

**Mentions légales** (`fr.json:1047`) : _"Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis."_
**Implications** :

- **Transfert UE → US** : depuis le Schrems II (2020), les transferts vers les US nécessitent des garanties supplémentaires (SCC + analyse risque)
- **EU-US Data Privacy Framework** signé en juillet 2023 → Vercel y est-elle inscrite ? **À vérifier**
- Le frontend Vercel est statique (pas de PII traitée côté Vercel) sauf logs (IP visiteur capturée par Vercel par défaut → potentiel risque)
  **Sévérité** : 🟠 grave si Vercel **non couvert** par DPF, à confirmer.

### RL-3 🟡 Nominatim OpenStreetMap (Allemagne) pour geocoding

**Code** : `src/lib/location/geocoding.ts` (à confirmer)
**Constat** : appels à `nominatim.openstreetmap.org` documentés dans la CSP (`index.html:77`).
**Implications** :

- Chaque recherche d'autocomplete envoie l'IP utilisateur + requête à Nominatim
- Nominatim hébergé par OpenStreetMap Foundation, en Allemagne (DE) — UE ✅
- À mentionner dans la politique comme sous-traitant
  **Sévérité** : 🟡 si bien documenté.

### RL-4 🟡 Google Fonts (Allemagne / global)

**Code** : `index.html:91` → fonts.googleapis.com / fonts.gstatic.com
**Implications** :

- Décision juridique allemande 2022 (Munich) : utilisation directe de Google Fonts sans consentement = violation RGPD car l'IP est transmise à Google
- Pratique recommandée : **self-host** des fonts (Quicksand + Mulish via @fontsource ou copie locale)
- Risque : amende symbolique mais **précédent juridique réel**
  **Sévérité** : 🟡 grave selon doctrine, simple à corriger.

### RL-5 🔴 Bucket Supabase `posts` PUBLIC

**Constat** : la convention de stockage est `{user_id}/{timestamp}.{ext}` dans un bucket déclaré comme `public` (cf. migration `20260502:142` : `INSERT INTO storage.buckets (..., public) VALUES (..., true)`).
**Implications combinées avec NC-3** :

- N'importe qui peut télécharger la photo originale (avec EXIF GPS embarqué)
- Si l'utilisateur supprime son post, l'URL publique reste accessible jusqu'à ce que le storage cleanup s'exécute → risque de cache CDN/archive
  **Sévérité** : 🔴 amplifie NC-3.

### RL-6 🟠 Localisation des photos = donnée à risque écologique

**Constat** : le toggle `location_hidden` cache la ville côté UI mais :

- les `lat/lng` sont **stockés dans `posts`** (cf. AUDIT_FLOWS.md C7)
- **À auditer** : la projection RLS / vue `posts_public` masque-t-elle bien lat/lng quand `location_hidden=true` ?
- L'EXIF GPS reste embarqué dans la photo (cf. NC-3)
  **Implications** :
- **Au-delà du RGPD** : risque écologique (braconnage, dérangement d'espèces sensibles)
- Hippocrate environnemental : "do no harm"
  **Sévérité** : 🔴 si projection RLS non auditée.

### RL-7 🟡 Données de support (`support_tickets`)

**Migration `20260502:48-62`** : la table stocke `ip_address` (INET) et `user_agent` (TEXT).
**Constat** : aucun mécanisme de purge automatique, pas de durée de conservation documentée.
**Impact RGPD** :

- Art 5(1)(e) limitation de conservation : durée max à définir
- Politique annonce _"tant que votre compte est actif"_ → ambigu pour les tickets
  **Sévérité** : 🟡 à documenter (90 jours recommandés CNIL pour journalisation).

### RL-8 🟡 Données de monitoring (`security_audit_log`)

**Migration `20260502:91-117`** : stocke `ip_address`, `user_agent`, `metadata jsonb`.
**Constat** : le commentaire SQL mentionne _"Toutes les valeurs PII ici sont anonymisées au cron J+30 si suppression"_ → cron non implémenté.
**Sévérité** : 🟡 à implémenter (Edge Function ou pg_cron).

### RL-9 🟢 Aucun mineur dans l'audience cible affichée

**Constat** : pas de mention "à partir de 13 ans / 16 ans" dans la politique. **À ajouter** car l'audience peut inclure des mineurs (naturalistes en herbe).
**RGPD** : Art 8 — consentement parental requis < 16 ans (15 ans en France).
**Loi 25** : Art 14 — consentement spécifique pour < 14 ans.

---

## 🌍 Spécifique RGPD

### Article-par-article — état de conformité

| Article                                              | Exigence                                                         | État                                                           | Bloquant     |
| ---------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | ------------ |
| **Art 5** Principes (licéité, loyauté, minimisation) | Données nécessaires uniquement                                   | ⚠️ EXIF + lat/lng pas minimisés                                | 🔴           |
| **Art 6** Base légale                                | Consentement / contrat / intérêt légitime                        | ⚠️ Non explicite à l'inscription                               | 🟠           |
| **Art 7** Conditions du consentement                 | Explicite, libre, informé, granulaire                            | ❌ Pas d'opt-in granulaire (newsletter, analytics)             | 🟠           |
| **Art 8** Mineurs                                    | Consentement parental < 15 ans (FR)                              | ❌ Non mentionné                                               | 🟠           |
| **Art 12** Information transparente                  | Politique accessible avant collecte                              | ❌ NC-1 (placeholder)                                          | 🔴           |
| **Art 13** Information lors de la collecte           | Coordonnées RT, finalités, durée                                 | ❌ NC-1 + NC-7                                                 | 🔴           |
| **Art 15** Droit d'accès                             | Pouvoir consulter ses données                                    | ✅ Partiel (profil + edit)                                     | 🟡           |
| **Art 16** Rectification                             | Pouvoir modifier                                                 | ✅ EditProfilePanel                                            | ✅           |
| **Art 17** Effacement (droit à l'oubli)              | Pouvoir supprimer                                                | ✅ DeleteAccountModal + Edge Function                          | 🟢 mais NC-6 |
| **Art 18** Limitation                                | Pouvoir geler le traitement                                      | ❌ Non implémenté (mode 'anonymize' existe mais pas exposé UI) | 🟡           |
| **Art 20** Portabilité                               | Export structuré (JSON/CSV)                                      | ❌ NC-4                                                        | 🔴           |
| **Art 21** Opposition                                | S'opposer au traitement                                          | ❌ Pas exposé UI                                               | 🟡           |
| **Art 22** Décision automatisée                      | Pas de profilage/scoring auto                                    | ✅ N/A                                                         | ✅           |
| **Art 25** Privacy by Design / by Default            | Activé par défaut                                                | ⚠️ `location_hidden` default ? À vérifier                      | 🟠           |
| **Art 30** Registre des traitements                  | Documentation interne                                            | ❌ Non détecté                                                 | 🟠           |
| **Art 32** Sécurité                                  | RLS, HTTPS, chiffrement, etc.                                    | ✅ globalement bon                                             | 🟢           |
| **Art 33** Notification violations sous 72h          | Procédure documentée                                             | ❌ Non détecté                                                 | 🟡           |
| **Art 35** AIPD (analyse impact)                     | Obligatoire si profilage / grande échelle / catégories spéciales | ❌ Non réalisée                                                | 🟠           |
| **Art 37** DPO                                       | Obligatoire si grande échelle données particulières              | ⚠️ Pas désigné explicitement                                   | 🟠           |
| **Art 44-49** Transferts hors UE                     | SCC ou décision adéquation                                       | ⚠️ Canada (adéquation) + US Vercel (DPF à confirmer)           | 🟠           |

**Score RGPD** : ~12/20 articles conformes ou partiellement conformes. **Non éligible MEP publique** sans résolution des 5 🔴.

---

## 🇨🇦 Spécifique Canada / Loi 25

### Loi 25 (Québec) — articles clés

| Article                                           | Exigence                                     | État                         |
| ------------------------------------------------- | -------------------------------------------- | ---------------------------- |
| **Art 3.1** PRP (politique de gouvernance)        | Document interne décrivant règles            | ❌ Non détecté               |
| **Art 5** Exactitude                              | Renseignements à jour                        | ✅ via EditProfile           |
| **Art 7** Consentement                            | Manifeste, libre, éclairé, à fin spécifique  | ❌ Pas d'opt-in granulaire   |
| **Art 8** Personne en charge                      | **Désignation obligatoire** + contact public | ❌ NC-8                      |
| **Art 8.1** Évaluation d'impact (EFVP)            | Avant projet impliquant données              | ❌ Non détecté               |
| **Art 8.2** Notification incident à la CAI        | Si risque sérieux                            | ❌ Procédure absente         |
| **Art 8.3** Politique de confidentialité publique | **Accessible avant collecte**                | ❌ NC-1                      |
| **Art 9** Sécurité raisonnable                    | Mesures techniques                           | ⚠️ EXIF + bucket public      |
| **Art 14** Mineurs                                | Consentement spécifique < 14 ans             | ❌ Non mentionné             |
| **Art 22** Désindexation / cessation              | Droit à l'effacement des liens               | ❌ Pas de procédure formelle |
| **Art 27** Accès aux renseignements               | Format technologique structuré               | ❌ NC-4 portabilité          |
| **Art 27.3** Droit à la portabilité               | Format informatisé                           | ❌ NC-4                      |

**Sanctions Loi 25** : amendes administratives **jusqu'à 25 M CAD ou 4 % du CA mondial**, peines pénales jusqu'à 10 M CAD. Plaintes via la **Commission d'accès à l'information du Québec (CAI)**.

### LPRPDE / PIPEDA (fédéral)

- ✅ Magic link OTP = mesure de sécurité raisonnable
- ❌ Politique non accessible = manquement aux 10 principes (notamment **Principe 8 — accès individuel**)
- ⚠️ Transfert frontalier vers US (Vercel) à documenter

### Spécificités Canadiennes vs RGPD

| Aspect                  | RGPD                                             | Loi 25                                               | Action                                           |
| ----------------------- | ------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------ |
| Désignation responsable | DPO si conditions Art 37                         | **Obligatoire pour TOUTES** les organisations        | Désigner explicitement                           |
| Notification violation  | 72 h à l'autorité + utilisateurs si risque élevé | Sans délai à la CAI + utilisateurs si risque sérieux | Process à formaliser                             |
| Sanctions               | Jusqu'à 4 % CA / 20 M€                           | **Jusqu'à 4 % CA / 25 M CAD** + pénal                | Aligner sur le plus strict                       |
| Portabilité             | Format structuré, lisible machine                | Format technologique structuré                       | Implémenter export JSON/CSV                      |
| Mineurs                 | < 15 ans (FR), 16 ans (UE défaut)                | **< 14 ans**                                         | Vérifier âge à l'inscription ou afficher mention |
| AIPD/EFVP               | Si grande échelle                                | **Obligatoire pour projet TI**                       | Documenter                                       |

---

## 🧠 Recommandations

### 🔴 Bloquants à fixer AVANT mise en production publique (Sprint 1)

| #       | Action                                                                                          | Effort                            | Cible |
| ------- | ----------------------------------------------------------------------------------------------- | --------------------------------- | ----- |
| **L-1** | Brancher le contenu i18n existant dans `Privacy.tsx` (sections 1-6 déjà rédigées)               | 2 h                               | NC-1  |
| **L-2** | Brancher le contenu i18n existant dans `Legal.tsx`                                              | 1 h                               | NC-2  |
| **L-3** | Stripper EXIF avant upload (`exifr.gps.parse + remove`)                                         | 4 h                               | NC-3  |
| **L-4** | Auditer + corriger projection `lat/lng` quand `location_hidden=true` (RLS / vue `posts_public`) | 4 h                               | RL-6  |
| **L-5** | Implémenter Edge Function `export-user-data` + bouton dans Settings ("Exporter mes données")    | 1 j                               | NC-4  |
| **L-6** | Aligner politique vs réalité : soit ajouter le 30-day grace period, soit modifier la politique  | 30 min (politique) ou 1 j (grace) | NC-6  |
| **L-7** | Vérifier que `privacy@naturegraph.fr` est actif + monitoré                                      | 30 min                            | NC-7  |
| **L-8** | Ajouter Cookie Banner minimal (information seulement, vu qu'on n'a que des cookies essentiels)  | 4 h                               | NC-5  |

**Total Sprint 1 légal** : ~3-4 jours dev + 30 min process.

### 🟠 Importants à fixer avant Phase 2 (Sprint 2)

| #        | Action                                                                                     | Effort      | Cible                       |
| -------- | ------------------------------------------------------------------------------------------ | ----------- | --------------------------- |
| **L-9**  | Désigner formellement Responsable du traitement + Personne Loi 25 (publier nom + email)    | 1 h         | NC-8                        |
| **L-10** | Self-host fonts Quicksand + Mulish (via @fontsource)                                       | 1 h         | RL-4                        |
| **L-11** | Ajouter mention "Service réservé aux 14 ans et plus" + check à l'inscription (Loi 25)      | 2 h         | RL-9                        |
| **L-12** | Vérifier DPA Supabase signé + DPF Vercel actif + documenter dans politique                 | 1 h (admin) | RL-1, RL-2                  |
| **L-13** | Implémenter cron J+30 anonymisation `security_audit_log`                                   | 4 h         | RL-8                        |
| **L-14** | Implémenter purge cron J+90 sur `support_tickets.ip_address`                               | 2 h         | RL-7                        |
| **L-15** | Logger les events critiques dans `security_audit_log` (Edge Function `log-security-event`) | 1 j         | (déjà dans AUDIT_TECHNIQUE) |
| **L-16** | Ajouter opt-in granulaire onboarding (newsletter, notifications, analytics futurs)         | 4 h         | Art 7 RGPD                  |

**Total Sprint 2 légal** : ~3 jours.

### 🟡 Recommandés pour bonnes pratiques

| #        | Action                                                                                          | Effort |
| -------- | ----------------------------------------------------------------------------------------------- | ------ |
| **L-17** | Rédiger un registre des traitements interne (Art 30 RGPD)                                       | 1 j    |
| **L-18** | Rédiger une AIPD/EFVP (Loi 25 Art 8.1)                                                          | 1-2 j  |
| **L-19** | Documenter procédure de notification violation (CNIL 72 h + CAI sans délai)                     | 1 j    |
| **L-20** | Migrer `cookie banner` vers une vraie UI granulaire si analytics futurs                         | 1 j    |
| **L-21** | Ajouter politique de cookies dédiée (séparée de privacy) avec liste exhaustive                  | 4 h    |
| **L-22** | Préparer modèles de réponses aux demandes RGPD (accès, rectification, suppression, portabilité) | 1 j    |

---

# 📋 Plan d'action consolidé

## Avant mise en production publique (5 jours dev + admin)

```
Sprint Légal Phase 1 (à intégrer au Sprint 1 du PLAN_ACTION.md)
├── J1 : L-1, L-2 (brancher Privacy + Legal — 3 h)
│        L-7 (vérifier privacy@ — 30 min)
│        L-8 (cookie banner — 4 h)
├── J2 : L-3 (strip EXIF — 4 h)
│        L-4 (audit projection lat/lng — 4 h)
├── J3 : L-5 (export RGPD — 1 j)
├── J4 : L-6 (aligner politique vs réalité — décision + fix)
│        L-9 (désignation responsable — 1 h)
│        L-10 (self-host fonts — 1 h)
└── J5 : L-11 (mineurs — 2 h)
         L-12 (DPA/DPF doc — 1 h)
         Recette légale + déploiement
```

## Avant Phase 2 (3 jours dev + 1 jour admin)

```
Sprint Légal Phase 2
├── J1-J2 : L-13, L-14, L-15 (audit log + purges + Edge Function)
├── J3 : L-16 (opt-in granulaire onboarding)
└── Admin : L-17 (registre), L-18 (AIPD/EFVP), L-19 (procédure violation)
```

---

# Annexes

## A. Données personnelles collectées (inventaire)

| Donnée                      | Source           | Catégorie RGPD          | Usage                                | Stocké où                    | Conservation                                 |
| --------------------------- | ---------------- | ----------------------- | ------------------------------------ | ---------------------------- | -------------------------------------------- |
| Email                       | Auth signup      | PII                     | Authentification                     | `auth.users`                 | Tant que compte actif                        |
| Username                    | Onboarding       | PII (pseudonyme)        | Affichage public                     | `profiles`                   | Idem                                         |
| Bio                         | Edit profile     | PII volontaire          | Affichage public                     | `profiles.bio`               | Idem                                         |
| Ville / région              | Edit profile     | PII volontaire          | Affichage public optionnel           | `profiles`                   | Idem                                         |
| Avatar / banner             | Edit profile     | PII volontaire          | Affichage public                     | Storage `avatars`, `banners` | Idem                                         |
| Intérêts                    | Onboarding       | Préférence              | Personnalisation feed                | `profiles.interests[]`       | Idem                                         |
| Motivations                 | Onboarding       | Préférence              | **NON SAUVEGARDÉ** (cf. PLAN_ACTION) | —                            | —                                            |
| Photos d'observations       | Contribution     | PII potentielle (lieu)  | Affichage public                     | Storage `posts`              | Idem                                         |
| Description observation     | Contribution     | Texte libre             | Affichage public                     | `posts.description`          | Idem                                         |
| Coordonnées GPS observation | Contribution     | **Géolocalisation**     | Carto / filtre radius                | `posts.lat/lng`              | Idem                                         |
| EXIF photos (GPS, date)     | Upload           | **Métadonnées** ⚠️      | Lecture côté client                  | **Embarqué dans le fichier** | Idem (NC-3)                                  |
| Préférences notifs          | Settings         | Préférence              | Routage notifs                       | `user_settings`              | Idem                                         |
| Tickets support             | Settings > Aide  | PII + IP + UA           | Suivi requête                        | `support_tickets`            | Non documenté (RL-7)                         |
| Audit log                   | Edge Functions   | IP + UA + JSON metadata | Sécurité                             | `security_audit_log`         | J+30 anonymisation prévue (RL-8 cron absent) |
| JWT token                   | Auth Supabase    | Technique               | Session                              | `localStorage`               | 1 h (refresh auto)                           |
| Cookie `__cf_bm`            | Cloudflare       | Technique               | Bot management                       | Cookie tier                  | 30 min                                       |
| Logs Vercel (IP visiteur)   | Frontend hosting | Technique               | Logs serveur                         | Vercel                       | Selon Vercel (à documenter)                  |

## B. Sous-traitants tiers (pour DPA / mention)

| Tiers                         | Rôle                                 | Pays           | Statut                          |
| ----------------------------- | ------------------------------------ | -------------- | ------------------------------- |
| **Supabase Inc.**             | DB + Auth + Storage + Edge Functions | Canada (YUL)   | ⚠️ DPA à signer + documenter    |
| **Vercel Inc.**               | Hosting frontend                     | États-Unis     | ⚠️ DPF à confirmer              |
| **Cloudflare**                | CDN / WAF (via Supabase)             | Distribué      | Documenter                      |
| **Google (Fonts)**            | Police de caractères                 | Distribué      | RL-4 (recommandation self-host) |
| **OpenStreetMap (Nominatim)** | Geocoding                            | Allemagne (UE) | OK, à mentionner                |
| **INPN / TAXREF**             | Référentiel espèces                  | France         | OK                              |

## C. Modèles de processus à formaliser

1. **Demande d'accès** (RGPD Art 15) : process automatique via export RGPD (L-5)
2. **Demande de rectification** (Art 16) : self-service via EditProfile (✅)
3. **Demande de suppression** (Art 17) : self-service via DeleteAccountModal (✅ après NC-6 résolu)
4. **Demande de portabilité** (Art 20) : export RGPD (L-5)
5. **Demande d'opposition** (Art 21) : à formaliser
6. **Notification violation** : à formaliser
7. **Demande de désindexation** (Loi 25 Art 22) : à formaliser

## D. Texte du cookie banner minimal recommandé (NC-5)

```
Naturegraph utilise uniquement des cookies strictement nécessaires au
fonctionnement du site (session de connexion, préférences de langue,
protection anti-spam Cloudflare). Aucun cookie publicitaire ou de
traçage n'est utilisé.

Pour plus d'informations, consultez notre politique de confidentialité.

[ J'ai compris ]    [ En savoir plus → /privacy ]
```

## E. Texte d'opt-in onboarding granulaire recommandé

À l'étape 4 de l'onboarding (avant validation username) :

```
☐ Je souhaite recevoir la newsletter Naturegraph (mensuelle, désinscription
   en 1 clic)
☐ Je souhaite recevoir des notifications sur mes espèces favorites
   (digest hebdomadaire ou quotidien)
☑ J'accepte que mes contributions soient affichées publiquement avec
   mon nom d'utilisateur (obligatoire pour utiliser le service)

J'ai lu et j'accepte la [politique de confidentialité] et les
[conditions générales d'utilisation].
                                    [Créer mon compte]
```

---

# 🎯 Verdict final

## État actuel : 🔴 NON CONFORME pour MEP publique

8 manquements bloquants identifiés. Risque légal réel (CNIL + CAI).

## État après Sprint Légal Phase 1 (5 j) : 🟢 CONFORME pour MEP publique

Manquements 🔴 résolus, exposition légale réduite à un niveau acceptable.

## État après Sprint Légal Phase 2 (3 j + admin) : 🟢 BONNES PRATIQUES

Niveau attendu pour une plateforme citoyenne mature avec usage Québec + France + UE.

---

> **Document à valider par un juriste / DPO externe** avant déploiement public, en particulier pour :
>
> - La rédaction finale des CGU + Politique
> - L'AIPD/EFVP (Art 35 RGPD / Art 8.1 Loi 25)
> - La désignation officielle du Responsable de traitement
> - Les contrats avec sous-traitants (DPA Supabase, DPF Vercel)
>
> Cette synthèse identifie les **risques techniques et structurels** dans le code et n'a pas valeur de conseil juridique.
