# Naturegraph — Plan d'action (synthèse audit)

> **Version** : 1.1 — 2026-05-02
> **Source** : `docs/AUDIT_FLOWS.md` v1.1 + `docs/USER_STORIES.md` v1.1
> **Posture** : pensée produit · impact utilisateur réel · pas une checklist technique
> **Lecture cible** : 5 minutes avant de prioriser un sprint

> **Changelog v1.1 (2026-05-02)** — 4 décisions produit MVP tranchées par Nicolas (cf. §5) :
>
> - Q1 : description **optionnelle** → bloquant C4 supprimé
> - Q2 : multi-observation **retirée du MVP** → I6 résolu par masquage (Quick Win)
> - Q3 : boutons sociaux **retirés du MVP** → I3 résolu par masquage (Quick Win)
> - Q4 : toggle "Aide à l'identification" + filtre feed **retirés du MVP** → résolu par masquage (Quick Win)

---

## TL;DR

Le produit est **utilisable** mais **3 angles morts cassent la confiance** :

1. **Onboarding** ment à l'utilisateur (collecte des données qu'il ne sauvegarde pas)
2. **Création d'observation** rejette les iPhones sans le dire (HEIC accepté à l'UI, refusé à l'upload)
3. **Suppression de compte** se déclenche en 1 clic — accident garanti

Ces 3 points + 3 autres bloquants = **5 jours de travail** pour passer de "MVP fragile" à "MVP stable beta-ready".

Ensuite : **2-3 semaines** pour fiabiliser (A11Y WCAG AA + RGPD photos + UX e-mail change).

Le reste = amélioration continue post-beta.

> **Mise à jour v1.1** : 4 décisions produit ont **simplifié le MVP** (description optionnelle, multi-obs retirée, boutons sociaux retirés, ID help retiré). Conséquence : C4 supprimé, I3 et I6 deviennent des Quick Wins (masquage UI). On gagne ~1 jour sur Phase 1.

---

# 1. Regroupement des problèmes par nature

## 🐛 Bugs (le code ne fait pas ce qu'il prétend)

| #      | Bug                                                           | Impact utilisateur                                                                                                | Réf                                             |
| ------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| B1     | Onboarding ne persiste pas `motivations` ni `notif_frequency` | L'utilisateur remplit 2 étapes pour rien — pire : il s'attend à recevoir des notifs hebdo et ne les reçoit jamais | `onboarding/index.tsx:88-105`                   |
| B2     | HEIC accepté à l'UI, rejeté côté upload                       | Tous les utilisateurs iPhone bloqués sur la 1re photo, sans message clair                                         | `EncounterStep1.tsx:57` vs `mediaService.ts:14` |
| ~~B3~~ | ~~Description non requise alors que l'AC l'exige~~            | **Résolu par décision Q1** (description optionnelle MVP)                                                          | —                                               |
| B4     | Email change lance le flow Supabase sans écran OTP            | L'utilisateur croit son email changé, mais il ne l'est pas tant qu'il ne clique pas le mail                       | `SettingsSecurityView.tsx`                      |
| B5     | "Pour vous" filtré côté client uniquement en mode guest       | NotificationsPanel + SearchPanel ouvrables sans auth (panels supposément protégés)                                | `HomeNavbar.tsx:123-129`                        |
| B6     | Empty state "Utilisateur introuvable" rendu deux fois         | Dead code — risque de divergence au prochain refacto                                                              | `Profile.tsx:193-247`                           |
| B7     | Cast `any` sur `support_tickets` (types non régénérés)        | Pas d'auto-complétion + perte de safety au prochain changement de schéma                                          | `supportService.ts`                             |

## 🎨 UX (l'utilisateur ne sait pas où il en est)

| #       | UX gap                                                     | Impact                                                      | Réf                          |
| ------- | ---------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------- |
| UX1     | Pas d'indicateur de progression pendant l'onboarding       | "Combien d'étapes encore ?" → abandons                      | `onboarding/index.tsx`       |
| UX2     | Suppression compte = 1 clic "Confirmer"                    | Aucune friction = accidents quasi-garantis                  | `DeleteAccountModal.tsx`     |
| ~~UX3~~ | ~~Boutons sociaux Google/Apple/Facebook non fonctionnels~~ | **Résolu Quick Win QW2** (décision Q3 : masquer pour MVP)   | `AuthForm.tsx:216-231`       |
| UX4     | Pas de spinner pendant les uploads photo                   | L'utilisateur croit que c'est figé sur connexion lente      | `EncounterStep1.tsx`         |
| UX5     | OTP timer 2 min sans indication audio (a11y) ni resume     | Utilisateur perdu si tab fermé pendant le mail              | `VerificationForm.tsx`       |
| UX6     | Onglet Statistiques affiché sans badge "Bientôt" clair     | Frustration : "ça ne marche pas chez moi"                   | `ProfileTabs.tsx:73`         |
| ~~UX7~~ | ~~Multi-observation step 2 affichée mais désactivée~~      | **Résolu Quick Win QW6** (décision Q2 : masquer pour MVP)   | `EncounterStep2.tsx:472-486` |
| ~~UX8~~ | ~~Toggle "Aide à l'identification" caché~~                 | **Résolu Quick Win QW6** (décision Q4 : confirmer masquage) | `EncounterStep2.tsx:414-416` |

## 🔧 Backend / Data (la base ment)

| #   | Gap                                                           | Risque                                                   | Réf                       |
| --- | ------------------------------------------------------------- | -------------------------------------------------------- | ------------------------- |
| D1  | `location_hidden=true` : projection `lat/lng` côté visiteur ? | RGPD : fuite de géolocalisation potentielle              | RLS / vue `posts_public`  |
| D2  | EXIF non strippé avant upload                                 | Coordonnées GPS embarquées même si "Région masquée"      | `mediaService.ts:7-9`     |
| D3  | Colonne `motivations` n'existe peut-être pas sur `profiles`   | À créer avant fix B1                                     | DB                        |
| D4  | `security_audit_log` table créée mais jamais alimentée        | Audit RGPD inopérant                                     | Edge Function manquante   |
| D5  | Pas de transaction atomique post + media                      | Si INSERT post OK mais upload media KO → post sans photo | `postService.createPost`  |
| D6  | Username : check Supabase puis upsert plus tard               | Race condition sur 2 tabs                                | `OnboardingStep4.tsx:496` |
| D7  | Bio max 160 chars : CHECK constraint en DB ?                  | Si client bypassé → corruption                           | DB `profiles.bio`         |
| D8  | Index Postgres sur `posts(user_id, created_at DESC)` ?        | Query lente sur profil avec beaucoup de posts            | DB                        |

## ⚡ Performance / Éco-conception

| #   | Problème                                                                      | Coût                                                | Réf                    |
| --- | ----------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------- |
| P1  | Compression image client absente                                              | Upload de 10 MB au lieu de 2 MB → ×5 bande passante | `mediaService.ts`      |
| P2  | Pas de WebP conversion client                                                 | Poids ×2-3 vs WebP optimisé                         | idem                   |
| P3  | Hero mouse tracking 60 fps sans throttle                                      | Batterie mobile / desktop bas de gamme              | `Landing/Hero.tsx:180` |
| P4  | StatsSidebar dans le bundle même mobile                                       | Code inutile sur 60 % des sessions                  | `Home.tsx`             |
| P5  | `useFollowers` + `useFollowing` chargés en parallèle même si onglet pas actif | 2 requêtes inutiles à chaque visite Communauté      | `ProfileCommunity.tsx` |
| P6  | Banned-usernames en dur (~436 entrées)                                        | Bundle ×N selon imports                             | `OnboardingStep4.tsx`  |

## ♿ Accessibilité (WCAG AA non atteint)

| #   | Manquement                                                              | Sévérité     | Réf                                    |
| --- | ----------------------------------------------------------------------- | ------------ | -------------------------------------- |
| A1  | Onboarding multi-select sans `role="group"` + `aria-pressed`            | 🔴 WCAG fail | `OnboardingInterests.tsx`              |
| A2  | OTP form : 6 inputs sans `aria-label` ni `autocomplete="one-time-code"` | 🔴 WCAG fail | `VerificationForm.tsx`                 |
| A3  | OTP timer countdown sans `aria-live`                                    | 🔴 WCAG fail | idem                                   |
| A4  | Landing FAQ accordion : `aria-expanded` à confirmer                     | 🟠           | `FAQ.tsx:39-55`                        |
| A5  | Burger menu mobile sans `aria-label`                                    | 🟠           | `Navbar.tsx:65`                        |
| A6  | Focus trap modals à confirmer (boucle complète)                         | 🟡           | `EditProfilePanel.tsx`, `ConfirmModal` |
| A7  | Step indicator onboarding sans `aria-current="step"`                    | 🟡           | `onboarding/index.tsx`                 |

---

# 2. Priorisation par impact utilisateur

## 🔴 CRITIQUE — bloque la beta

> Si tu lances la beta avec ça, des testeurs réels vont **abandonner** ou **perdre des données**.

### C1. Onboarding silencieux (B1)

**Pourquoi critique** : un utilisateur passe 4 étapes en pensant configurer ses préférences. Rien n'est sauvegardé pour `motivations` et `notif_frequency`. Il ne reçoit jamais le digest qu'il a demandé. **Trahison de la promesse produit.**
**Fix** : 1 h (étendre l'upsert + colonne `motivations` en DB).

### C2. iPhones bloqués (B2)

**Pourquoi critique** : ~50 % des smartphones US/EU sont des iPhones. Photos par défaut = HEIC. L'utilisateur sélectionne sa photo, voit la preview, clique "Publier" → erreur opaque. Il ré-essaie 2 fois puis quitte l'app.
**Fix** : 30 min (décision + alignement MIME).

### C3. Suppression compte trop facile (UX2)

**Pourquoi critique** : un utilisateur qui clique "Supprimer mon compte" par erreur (ou fatigué) perd toutes ses observations sans pouvoir revenir en arrière. Précédent : Twitter/Instagram demandent **systématiquement** la saisie du username.
**Fix** : 2 h (champ "Tape ton username" + validation client).

### ~~C4. Description requise ou pas ?~~ — RÉSOLU PAR DÉCISION Q1

**Décision tranchée** : description **optionnelle** en MVP (posture data-driven).
**Conséquence** : le code actuel est conforme, aucune action requise. À mesurer en analytics : taux de complétion description sur 1 mois.

### C5. Email change sans confirmation visible (B4)

**Pourquoi critique** : l'utilisateur croit avoir changé son email, ne reçoit plus les notifs sur le nouveau, et son ancien reste actif. Toute récupération de mot de passe (futurs flows) sera cassée.
**Fix** : 4 h (UI intermédiaire + handler OTP).

### C6. Fuite GPS via EXIF (D2)

**Pourquoi critique** : RGPD. L'utilisateur coche "Région masquée" pour protéger une espèce sensible. La photo embarque les coordonnées GPS dans ses métadonnées EXIF. Un visiteur télécharge la photo → coordonnées exactes accessibles. **Risque légal réel.**
**Fix** : 0.5 j (lib `exifr` strip avant upload).

### C7. Audit projection `lat/lng` côté visiteur (D1)

**Pourquoi critique** : même cas que C6 mais côté API. Il faut vérifier que la RLS / projection masque bien `lat`, `lng` et `city` quand `location_hidden=true`.
**Fix** : 2 h (audit + vue `posts_public` si nécessaire).

---

## 🟠 IMPORTANT — bloque la WCAG AA + dégrade la confiance

### I1. A11Y bloquants WCAG AA (A1, A2, A3)

**Pourquoi important** : naturalistes amateurs incluent des seniors et des malvoyants. Sans WCAG AA, c'est exclusion + risque légal (Loi Handicap).
**Fix** : 1 j (ajout ARIA + tests NVDA/VoiceOver).

### I2. Compression image absente (P1, P2)

**Pourquoi important** : upload 10 MB sur 4G rurale = 30 secondes. C'est tuer l'UX du contributeur sur le terrain.
**Fix** : 1 j (canvas resize + WebP encoder).

### ~~I3. Boutons sociaux non fonctionnels~~ — RÉSOLU PAR DÉCISION Q3

**Décision tranchée** : retirés du MVP. Quick Win QW2 (10 min) — masquer le bloc + séparateur "ou".
**Backlog Phase 3** : Google OAuth uniquement si demande utilisateur post-beta.

### I4. Indicateur progression onboarding (UX1)

**Pourquoi important** : les abandons en onboarding sont la 1re cause de churn nouveau-user.
**Fix** : 2 h (progress bar 1/4 → 4/4 + `aria-current`).

### I5. Spinner upload photos (UX4)

**Pourquoi important** : sur 4G, l'utilisateur croit que l'app freeze sans feedback.
**Fix** : 2 h (state per-image + ImageUploadingOverlay).

### ~~I6. Multi-observation + ID help toggle~~ — RÉSOLU PAR DÉCISIONS Q2 + Q4

**Décisions tranchées** : multi-observation et toggle "Aide à l'identification" + filtre feed associé **retirés du MVP**. Quick Win QW6 (20 min) — masquer les sections + le filtre feed.
**Backlog Phase 3** : ré-activer le couple toggle + filtre quand la communauté experte sera là.

### I7. Audit log RGPD non alimenté (D4)

**Pourquoi important** : RGPD impose la traçabilité des accès aux données. La table existe, l'UI ne logue rien.
**Fix** : 1 j (Edge Function `log-security-event` + appels depuis l'UI).

### I8. Race condition username (D6)

**Pourquoi important** : 2 users peuvent prendre le même username en parallèle si le timing est précis. Cas rare mais corruption DB possible.
**Fix** : 1 h (gérer l'erreur 23505 sur l'upsert).

### I9. Transaction atomique post + media (D5)

**Pourquoi important** : posts orphelins (sans photo) en DB si l'upload media partiel échoue.
**Fix** : 0.5 j (RPC `create_post_with_media`).

---

## 🟢 AMÉLIORATION — après la beta

### G1. Conversion HEIC client (lib `heic2any`)

Permet à tout iPhone d'uploader sans changer ses réglages. Effort : 0.5 j. Reporter post-beta.

### G2. Externaliser banned-usernames en DB

Maintenance + i18n. Effort : 0.5 j.

### G3. Account deletion 30-day grace period (D5)

Phase 2 documentée dans `DeleteAccountModal.tsx`. Edge Function + cron + emails de rappel.

### G4. Digest_daily / digest_weekly Edge Functions

Cron lié à `notif_frequency`. Effort : 1-2 j par digest.

### G5. statsService MVP (badges, species, streak)

Sprint 4 prévu. Effort : 2-3 j.

### G6. Variantes images (thumbnail / medium / full)

Edge Function ou trigger storage. Économie bande passante notable.

### G7. Cron RGPD nettoyage notifs > 90 j

Effort : 0.5 j.

### G8. StatsSidebar lazy-load (P4)

Bundle splitting. Effort : 1 h.

### G9. ProfileCommunity tabs lazy fetch (P5)

Optimisation bande passante. Effort : 30 min.

### G10. Hero mouse tracking RAF throttle (P3)

Batterie. Effort : 15 min.

### G11. Empty state Profile dédupliqué (B6)

Dead code à retirer. Effort : 15 min.

### G12. Régénérer types Supabase + retirer cast `any` (B7)

Hygiène code. Effort : 30 min après application migration.

### G13. CHECK constraint bio ≤ 160 + URL regex

Robustesse DB. Effort : 1 h.

---

# 3. Roadmap par phases

## Phase 1 — Stabilisation (5 jours ouvrés) — v1.1 post-décisions

> **Objectif** : produit utilisable sans piège pour l'utilisateur. Beta privée OK.
> **Bloquants traités** : 6/7 critiques (C1, C3, C5, C6, C7 + C2 résolu par QW1 dans Quick Wins). C4 supprimé (décision Q1).

| Jour                   | Action                                                                                 | Tickets |
| ---------------------- | -------------------------------------------------------------------------------------- | ------- |
| **J1 matin** (~1 h 15) | Quick wins (cf. §4) — 6 fixes en 1 commit                                              | QW1-QW6 |
| **J1 après-midi → J2** | Fix onboarding persistence (motivations + frequency) — colonne DB + upsert + tests E2E | C1, D3  |
| **J3**                 | Suppression compte avec username matching + audit log                                  | C3, I7  |
| **J4 matin**           | Email change UX complet (écran OTP de confirmation)                                    | C5      |
| **J4 après-midi**      | Audit projection `lat/lng` + vue `posts_public` si nécessaire                          | C7      |
| **J5**                 | Strip EXIF avant upload + tests RGPD                                                   | C6      |
| **J5 fin**             | Recette manuelle des 6 critiques + déploiement staging                                 | —       |

**Livrable Phase 1** : tous les bloquants 🔴 résolus. Beta interne possible.

> **Gain v1.1** : la décision produit J1 matin a déjà été tranchée → on commence direct par les Quick Wins. ~0.5 jour gagné sur le calendrier original.

---

## Phase 2 — Fiabilisation (10 jours ouvrés)

> **Objectif** : WCAG AA + UX professionnelle. Beta publique restreinte OK.

| Jour        | Action                                                                                            | Tickets   |
| ----------- | ------------------------------------------------------------------------------------------------- | --------- |
| **S2-J1-2** | A11Y onboarding + OTP + Landing (FAQ, burger)                                                     | I1, A1-A7 |
| **S2-J3-4** | Compression client + WebP encoder                                                                 | I2        |
| **S2-J5**   | Indicateur progression onboarding + step `aria-current`                                           | I4        |
| **S2-J6**   | Spinner upload photos + retry partiel                                                             | I5        |
| **S2-J7**   | Race condition username + erreur 23505                                                            | I8        |
| **S2-J8**   | Transaction RPC create_post_with_media                                                            | I9        |
| **S2-J9**   | Tests E2E Playwright sur les 5 flows critiques (auth, onboarding, contribution, profil, settings) | —         |
| **S2-J10**  | Recette globale + Lighthouse a11y / perf                                                          | —         |

**Livrable Phase 2** : produit conforme WCAG AA, RGPD safe, UX fluide. Beta publique OK.

---

## Phase 3 — Amélioration (post-beta, par priorité utilisateur)

> **Objectif** : finir les "Sprint 4" prévus + qualité de vie.

**Sprint 3.1 (1 semaine)**

- statsService MVP (badges, species count, streak)
- Conversion HEIC client (heic2any)
- Externaliser banned-usernames

**Sprint 3.2 (1 semaine)**

- Account deletion 30-day grace
- Digest_daily / digest_weekly Edge Functions
- Variantes images thumbnail/medium/full

**Sprint 3.3 (continuous)**

- Cron RGPD notifs > 90 j
- Lazy-load StatsSidebar / ProfileCommunity
- CHECK constraints DB
- Régénération types Supabase quand migrations prêtes

---

# 4. Quick wins (< 1 h 15 cumulé) — à faire EN PREMIER

> **Règle** : ces 6 fixes prennent en cumul **~1 h 15 min** et débloquent la Phase 1. À grouper en 1 PR `chore: quick wins post-audit`.

| #       | Quick win                                                                                            | Fichier                                     | Effort | Impact                               |
| ------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------ | ------------------------------------ |
| **QW1** | **Retirer HEIC/HEIF du form** (force conversion JPEG côté iOS) — tranché Q3                          | `EncounterStep1.tsx:57-58, 435`             | 5 min  | Stoppe les crashs iOS, message clair |
| **QW2** | **Masquer boutons sociaux Google/Apple/Facebook** + séparateur "ou" — tranché Q3                     | `AuthForm.tsx:216-231`                      | 10 min | Élimine UX cassée                    |
| **QW3** | **Throttle mouse tracking Hero** avec `requestAnimationFrame`                                        | `Landing/Hero.tsx:180`                      | 15 min | Batterie / CPU                       |
| **QW4** | **`aria-label` burger menu** + **`aria-expanded` FAQ**                                               | `Navbar.tsx:65`, `FAQ.tsx:39-55`            | 15 min | A11Y baseline                        |
| **QW5** | **Supprimer empty state Profile dupliqué**                                                           | `Profile.tsx:193-247`                       | 10 min | Dead code éliminé                    |
| **QW6** | **Masquer multi-observation + ID help + filtre "Aide à l'identification" du feed** — tranché Q2 + Q4 | `EncounterStep2.tsx`, `FeedFilterPanel.tsx` | 20 min | Vapourware éliminé, feed cohérent    |

**Total** : ~1 h 15 min — à grouper en un seul commit `chore: quick wins post-audit`.

> **Important** : QW1, QW2, QW6 résolvent des écarts identifiés dans l'audit grâce aux décisions produit (Q1-Q4). Sans ces décisions, ces quick wins n'auraient pas été possibles.

---

# 5. Décisions produit — TRANCHÉES (2026-05-02)

> Les 4 questions ont été tranchées par Nicolas. Posture cohérente : **MVP léger**, focus sur le cœur (publier une photo + une espèce + un lieu), report des features collaboratives après stabilisation.

### ✅ Q-PROD-1 — Description optionnelle (MVP)

**Décision** : **Option B** — la description est optionnelle, posture data-driven. Tracker le taux de complétion sur 1 mois pour décider Phase 3.
**Conséquence code** : aucune (déjà conforme).
**Conséquence US** : US-CONTRIB-03 alignée v1.1.

### ✅ Q-PROD-2 — Multi-observation retirée du MVP

**Décision** : **Option B** — une seule espèce par post. Multi-observation reportée Phase 3.
**Conséquence code** : Quick Win QW6 — masquer la section "Bientôt" dans `EncounterStep2.tsx`.
**Conséquence US** : US-CONTRIB-02 alignée v1.1.

### ✅ Q-PROD-3 — Boutons sociaux retirés du MVP

**Décision** : **Option B** — magic link uniquement. Google OAuth probablement aussi reporté post-MVP.
**Conséquence code** : Quick Win QW2 — masquer le bloc de boutons sociaux + séparateur "ou".
**Conséquence US** : US-AUTH alignée v1.1 (magic link unique mode).

### ✅ Q-PROD-4 — Toggle "Aide à l'identification" retiré du MVP

**Décision** : **Option B** — toggle masqué + filtre feed associé masqué. À ré-activer une fois le socle de base solide.
**Conséquence code** : Quick Win QW6 — confirmer masquage UI dans `EncounterStep2.tsx` + masquer le filtre dans `FeedFilterPanel.tsx`.
**Conséquence US** : US-CONTRIB-02 + US-FEED alignées v1.1.

---

> **Posture cohérente** : Nicolas a choisi systématiquement la simplification du MVP. Stratégie claire : **stabiliser d'abord, enrichir ensuite**. Toutes les features "collaboratives" (multi-obs, ID help, social auth) sont reportées Phase 3.

---

# 6. Métriques de succès

Pour valider chaque phase, mesurer côté analytics :

**Phase 1**

- Taux de complétion onboarding ≥ 80 %
- Taux de succès upload photo ≥ 95 % (incluant iPhones)
- Aucune suppression de compte accidentelle reportée

**Phase 2**

- Score Lighthouse Accessibility ≥ 95
- Temps moyen upload photo ≤ 5 s sur 4G
- 0 plainte RGPD

**Phase 3**

- Engagement /profil/stats > 30 % des connectés
- Délivrabilité digest_weekly > 95 %

---

# 7. Risques résiduels

| Risque                                                | Probabilité | Impact | Mitigation                                         |
| ----------------------------------------------------- | ----------- | ------ | -------------------------------------------------- |
| Migration DB `motivations` casse en prod              | Moyenne     | Moyen  | Tester sur dev → staging → main avec rollback prêt |
| Strip EXIF casse certaines photos (formats exotiques) | Faible      | Faible | Try/catch + fallback sans strip                    |
| Compression client trop agressive (perte qualité)     | Moyenne     | Moyen  | Cible 1600 px côté long + qualité 85 %             |
| Email change OTP : Supabase rate-limit déclenché      | Faible      | Faible | Compteur côté UI 1 changement / 24 h               |
| Username unique race condition                        | Faible      | Moyen  | Gestion erreur 23505 + UX claire                   |

---

# 8. Communication avec les testeurs

Si la beta démarre avant Phase 1 complète :

> "**Connu** : iPhone HEIC non supporté pour l'instant — convertissez en JPEG dans la pellicule."
> "**Connu** : suppression de compte se déclenche en 1 clic, soyez prudent."

Mais idéalement : **finir Phase 1 avant tout testeur externe**. C'est 5 jours.

---

# Annexes

## A. Mapping problèmes → flow (post-décisions v1.1)

| Flow                | Critiques                 | Importants                        | Améliorations |
| ------------------- | ------------------------- | --------------------------------- | ------------- |
| Landing             | —                         | A4, A5                            | QW3           |
| Onboarding          | C1                        | I4, I8, A1, A7                    | G2            |
| Auth                | C5                        | A2, A3 (~~I3 résolu QW2~~)        | —             |
| Home                | —                         | UX5                               | G8            |
| Feed                | C7                        | — (~~filtre ID help retiré QW6~~) | —             |
| Contribution        | C2, C6 (~~C4 résolu Q1~~) | I2, I5, I9 (~~I6 résolu QW6~~)    | G1, G6        |
| Upload              | C2, C6                    | I2                                | G6            |
| Profil              | —                         | —                                 | QW5, G5       |
| Modification profil | —                         | —                                 | G13           |
| Paramètres          | C3, C5                    | I7                                | G3, G12       |
| Notifications       | —                         | —                                 | G4, G7        |

**Résolu par décisions produit** :

- ~~C4~~ (description) → décision Q1
- ~~I3~~ (boutons sociaux) → décision Q3 + Quick Win QW2
- ~~I6~~ (multi-obs + ID help) → décisions Q2/Q4 + Quick Win QW6

## B. Effort total estimé (post-décisions v1.1)

| Phase                 | Jours-homme                                    | Calendrier (1 dev) |
| --------------------- | ---------------------------------------------- | ------------------ |
| Quick wins            | ~0.2 j                                         | ~1 h 15            |
| Phase 1 stabilisation | ~4.5 j (au lieu de 5)                          | < 1 semaine        |
| Phase 2 fiabilisation | 10 j                                           | 2 semaines         |
| Phase 3 amélioration  | 17-22 j (multi-obs + ID help + social ajoutés) | 4-5 semaines       |
| **TOTAL**             | **32-37 j**                                    | **6-8 semaines**   |

> **Gain v1.1** : Phase 1 raccourcie de 0.5 j (décisions produit déjà tranchées). Phase 3 alourdie de ~2-3 j (features reportées post-beta).

## C. Ressources externes nécessaires

- **Designer** : valider les écrans manquants (progress bar onboarding, écran OTP email change, modal suppression v2 avec input username)
- **Naturaliste expert** : trancher Q-PROD-1 (description requise) et Q-PROD-4 (ID help MVP)
- **Juriste / DPO** : valider la conformité RGPD avant beta publique (notamment EXIF + location_hidden)
- **Bêta-testeurs** : 5-10 utilisateurs réels pour Phase 2 fin

---

> **Plan vivant**. À mettre à jour après chaque sprint pour refléter l'avancement et les nouvelles découvertes terrain.
> **Prochaine revue** : à la fin de Phase 1 (J+5).
