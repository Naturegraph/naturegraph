# Plan de fiabilité et de résilience Naturegraph (2026-08)

> Objectif : stabiliser la plateforme **pour de bon**, sur **toutes** les surfaces
> (desktop Chrome/Firefox/Safari, tablette, mobile Android/iOS, navigateurs in-app
> Instagram/Facebook, PWA installée). Cible : plus **aucun** abandon de publication,
> plus de « page morte » après veille/inactivité, plus de perte de session
> silencieuse, plus de fausses notifications, et une observabilité qui ne mange pas
> le quota gratuit.

Statut : plan directeur. Chaque chantier a un critère de validation mesurable.
Rédigé après revue du code (queryClient, client Supabase, resumeRecovery,
useContributePostSubmit) et d'une grappe de retours users + issues Sentry (2026-08).

---

## STATUT DE LIVRAISON (mis à jour 2026-08-10, prod V0.7.15)

**Chantier substantiellement livré.** Le parcours critique est stable et confirmé par
Nicolas (va-et-vient surtout).

**Livré en prod :**

- **C4 Phase 1** (anti-bouton-mort / va-et-vient) — V0.7.8 → V0.7.12. Cause racine
  réelle : supabase-js PEND au retour d'arrière-plan (pas un gel JS). Fix : sonde
  `getUser()` + reload invisible + panneau restauré (sessionStorage) + reload immédiat
  si un panneau de publication est ouvert. **Confirmé OK par Nicolas.**
- **Feed / commentaires / réactions instantanés** — V0.7.13. Bug de clé
  `feed` vs `feed-infinite` (helper `invalidateFeeds`). + étape 3 restaurée au reload.
- **Recherche résiliente + self-healing** — V0.7.14. `searchProfiles` borné ;
  `probeBackendAndReloadIfStalled` (reload auto si RPC bloquée, même en session).
- **C6** (échecs d'action visibles) — V0.7.15. Toast d'erreur sur échec
  commentaire / réaction (+ rollback optimiste + capture Sentry déjà en place).
- **C1** (retry auth) — V0.7.15. Sur 401/JWT expiré : `refreshSession()` + 1 retry.
- **C5** (NotFoundError), **C7** (Session Replay off + `ignoreErrors` in-app) — livrés.
- **C3** : couvert par `resumeRecovery` (soft-invalidate au réveil) +
  `refetchOnWindowFocus/Reconnect`. Pas de listener d'activité continu (anti éco).
- **C10** (audit CSP) : `vercel.json` vérifié 2026-08-10 — sain, aucune correction.

**Observabilité :** capture Sentry complète (filet global mutations + `trackFailure`
échecs silencieux + `backend.stalled` + recherche + contexte route/user + Edge
Functions). Actif en prod uniquement (`VITE_SENTRY_DSN`). Alertes proactives
(Discord/email) = config dashboard, non mises (reportées par Nicolas).

**Reste (parqué, non bloquant) :**

- **C4 Phase 2** (colonne `posts.status` pending→published + GC + digest filtré).
  MIGRATION SCHÉMA PROD -> à faire dans une **fenêtre supervisée** (dev = prod).
  Urgence RÉDUITE depuis C4 P1 : le pipeline ne gèle plus en silence + nettoyage
  d'orphelin au retour -> posts fantômes déjà quasi éliminés.
- **C2** (reconnexion Realtime au réveil) : impact limité (auto-reconnect phoenix +
  reload de reprise + invalidate-on-action). À faire avec test réel (risque de boucle).
- **C9** (dédup notifications), redéploiement des 20/24 Edge Functions restantes (CLI,
  signal marginal).
- **C8** (OTP) : hors scope volontaire (on garde l'OTP).

Prochaine étape : **observer les retours réels en prod** (Sentry + users) pour valider
que c'est réglé pour de bon, puis planifier C4 P2 en fenêtre supervisée si besoin.

---

## 0. Définition de « fixé pour de bon » (Definition of Done globale)

Un utilisateur, sur n'importe quelle plateforme, peut :

1. **Publier** une Rencontre ou un Instant, avec ou sans photo, du premier coup ;
   et si le réseau/la veille interrompt, l'app **récupère seule** (ou lui dit
   clairement quoi faire), **sans jamais** qu'il ait à fermer/relancer.
2. **Revenir sur l'app** après veille OU inactivité (30 s, 5 min, 30 min) et
   retrouver une app **vivante** (données fraîches, temps réel reconnecté, session
   valide) **sans rafraîchir**.
3. **Ne jamais** générer de post fantôme ni de fausse notification.
4. Se **reconnecter** sans friction inutile.

Mesures de succès (30 jours après déploiement) :

- Taux de publications abouties / tentatives (nouvel event analytics) **> 97 %**.
- 0 issue Sentry « bouton mort » / rage-click sur bouton `disabled` sur la dernière
  release.
- 0 post `pending` de plus de 30 min en base (orphelins nettoyés).
- Consommation Session Replay Sentry = **0** (désactivé) ou strictement bornée.
- Retours users « je dois fermer l'app » = 0.

---

## 1. Diagnostic consolidé (causes racines, pas symptômes)

Les ~15 retours et 5 issues Sentry convergent vers **4 causes systémiques**.

### R1. L'app « meurt » après veille OU inactivité et ne se reconnecte pas seule

C'est la cause n°1 (publish bloqué, page vide, « plus de données », re-login).
Mécanismes cumulés :

- **Token gelé** : `autoRefreshToken` (client Supabase) repose sur un timer. En
  arrière-plan/idle, le timer est throttlé/gelé -> le JWT expire -> requêtes 401 ->
  React Query **ne retente pas les 4xx** (`retry` = 5xx uniquement) -> échec
  silencieux -> page vide. Un refresh ré-instancie le client et refait un token ->
  « ça remarche ». (Récit exact de user 5.)
- **Verrou de refresh désactivé** : `lock: (_,_,fn) => fn()` dans `src/lib/supabase.ts`
  (mis pour éviter « Lock broken »). Sans verrou, deux refresh concurrents (multi-
  onglets, retour de veille) peuvent **s'écraser** et corrompre la session stockée
  -> **pertes de session** « encore et encore ».
- **Temps réel décroché** : le socket Realtime Supabase tombe en veille et n'est pas
  reconnecté -> les mises à jour (échanges, compteurs) ne repartent pas.
- **Reprise trop étroite** : `resumeRecovery.ts` (V0.6.9) ne recharge que sur
  bfcache **> 60 s** cachée, et ne fait un refetch que sur idle **>= 15 min**. Le
  cas « onglet resté visible, 5 min sans action » (desktop surtout) et le retour
  **< 60 s** ne sont **pas** couverts -> data périmée + verrous non relâchés.
- **Watchdog de publication gelé** : dans `useContributePostSubmit`, le watchdog est
  un `setTimeout(60s)` ; en veille il est gelé -> le verrou `inFlightRef` reste
  bloqué -> **bouton Publier mort**, et **rien dans Sentry** (page gelée = aucune
  émission). Sentry ne le voit qu'indirectement (rage-click sur bouton `disabled`).

### R2. Upload photo fragile (référence fichier perdue)

`NotReadableError` **et** `NotFoundError` (DOMException) au moment de lire les octets
de la photo : référence OS périmée / permission révoquée / photo cloud non
téléchargée / fichier déplacé. Touche mobile ET desktop Safari. C'est le « pb de
droits » / « il ne prend pas mes photos ». (Prévention livrée en V0.7.2 : lecture
des octets dès la sélection ; reste à couvrir `NotFoundError` côté catch et à
généraliser.)

### R3. Fausses notifications / posts fantômes

Le pipeline crée le **post AVANT** les photos. Un submit gelé (R1) laisse un post
**orphelin** (créé, sans média) ; le rollback ne s'exécute que si le pipeline
**lève** une erreur -> un pipeline **gelé** ne lève rien -> orphelin persistant. Les
retries en créent d'autres. Le cron `check-social-digest` les compte -> « X a publié
9 nouvelles » puis 0.

### R4. Friction d'authentification (OTP)

Re-login OTP à **chaque** retour, code parfois non reçu, pas de mot de passe (users
3, 4). Amplifié par R1 (session perdue). Sujet mixte technique (persistance session)

- produit (réduire l'OTP).

### Bruits et sujets connexes

- **Session Replay Sentry** sature le forfait gratuit -> à couper (demande Nicolas).
- **Bruit navigateurs in-app** Instagram/Facebook (`sendDataToNative`,
  `postMessage: Java object is gone`, `navigation_performance_logger_android`) : ce
  ne sont **pas** nos bugs -> à filtrer dans Sentry (`ignoreErrors`).
- **Recherche qui ne se réinitialise pas** (user 7 : « effacer pour refaire ne
  marche presque jamais ») : état/cache de recherche non remis à zéro.
- **CSP / adblocker** (user 5) : un script tiers chargé depuis un autre domaine est
  bloqué (règle same-origin) + uBlock bloque certains scripts -> erreurs d'affichage.
- **Stack de notifications** : chantier connu (dédoublonnage/regroupement).
- **Chunk périmé** (`TypeError EchangesSection`) : déjà mitigé (reload
  `vite:preloadError`).

---

## 2. Architecture cible : une couche « Liveness & Resilience »

Plutôt que des rustines éparpillées, on introduit **une couche unique** qui garantit
qu'à tout « réveil » (focus, visibilité, retour en ligne, reprise bfcache, fin
d'inactivité), l'app est **re-vivifiée** dans le bon ordre, avec anti-rafales et
backoff, et **exposée** à l'UI (bandeau « reconnexion »).

```
Signaux de réveil                Contrôleur de résilience            Effets
------------------               -----------------------             ------
visibilitychange (visible)  ->                                   ->  1. verifier/rafraichir la SESSION (token)
focus                       ->   AppLivenessController (debounce) ->  2. reconnecter le TEMPS REEL (realtime)
online (reconnexion)        ->   + backoff + anti-boucle         ->  3. refetch les QUERIES actives (stale)
pageshow (persisted)        ->                                   ->  4. relacher les VERROUS d'action bloques
idle > seuil (1-2 min)      ->                                   ->  5. exposer l'etat (banniere reconnexion)
```

Principes :

- **Un seul point** (hors React, comme `resumeRecovery`, + un pont React pour l'UI et
  les hooks). Pas de logique dupliquée par écran.
- **Idempotent et debouncé** : plusieurs signaux rapprochés = une seule reprise.
- **Backoff + anti-boucle** (réutilise la garde `sessionStorage` de resumeRecovery).
- **Dégradé propre** : si la reprise échoue, bannière « Reconnexion… / Réessayer »,
  jamais d'écran mort silencieux.
- **Observable** : chaque reprise et chaque échec de reprise -> `trackAction` /
  `trackFailure` (déjà en place, on complète).

---

## 3. Chantiers (workstreams)

### C1. Résilience de session et de token (Supabase auth)

**Problème** : token gelé (401 silencieux), verrou de refresh désactivé (clobber).

**Cible / tâches** :

- Remplacer `lock: no-op` par un **vrai verrou** basé sur l'API Web Locks quand elle
  existe, avec **timeout de secours** (pour ne pas revenir au « Lock broken »).
  Empêche le clobber cross-onglets tout en évitant le blocage.
- Au réveil (C3), appeler explicitement `supabase.auth.getSession()` /
  `refreshSession()` si le token est proche de l'expiration, **avant** de refetch.
  -> plus de 401 silencieux après veille.
- **Traiter le 401/403** dans React Query : sur une query qui échoue en 401, tenter
  **un** refresh de session puis **un** retry (au lieu d'échouer en silence).
- Sonde légère « session vivante » exposée à l'UI (pour la bannière et pour le
  garde-fou publish).

**Validation** : après 10 min d'idle (desktop) puis une action, la donnée charge
sans refresh manuel ; 0 perte de session sur un scénario multi-onglets.

### C2. Reconnexion du temps réel (Realtime)

**Problème** : socket Realtime décroché après veille -> updates mortes.

**Cible / tâches** :

- Centraliser les souscriptions Realtime derrière un petit gestionnaire qui **se
  ré-abonne** au réveil (C3) et sur `SIGNED_IN`/refresh de token.
- Écouter l'état du canal (`CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`) -> reconnexion
  avec backoff.
- Fallback : si le temps réel reste KO, s'appuyer sur le refetch React Query (C3)
  pour ne pas laisser l'écran figé.

**Validation** : après veille, un nouvel échange/compteur apparaît sans refresh.

### C3. Couche données et contrôleur de reprise (React Query)

**Problème** : `resumeRecovery` trop étroit ; idle visible non couvert.

**Cible / tâches** :

- Étendre `resumeRecovery` en **AppLivenessController** :
  - Seuil d'inactivité **abaissé** (idle >= ~90 s -> refetch ciblé des queries
    montées, au lieu de 15 min).
  - Sur `visibilitychange` visible ET sur `focus` ET sur `online` : séquence C1 ->
    C2 -> refetch. (Aujourd'hui : seulement focus via React Query, et bfcache reload.)
  - Garder le **reload** bfcache (> seuil) comme filet ultime, mais tenter d'abord la
    reprise « douce » (sans reload) pour ne pas perdre une saisie en cours.
- Revisiter `staleTime` (5 min) : ok, mais coupler à la reprise pour que l'idle
  déclenche un refetch même sans changement de focus.
- Conserver `refetchOnReconnect` / `refetchOnWindowFocus` (déjà true).

**Validation** : onglet desktop laissé 5 min sans action -> première interaction ->
données à jour, aucune page vide.

### C4. Fiabilité du pipeline de publication (le coeur)

**Phase 1 (déjà codée, à finaliser)** : au retour au premier plan pendant un submit
« en vol », on **relâche le verrou** (`inFlightRef`/`isSubmitting`), on neutralise le
pipeline zombie via un **epoch**, on **nettoie l'orphelin**, on **trace** le cas
(`trackFailure publish.interrompu-arriere-plan`). -> le bouton **ne reste jamais
mort**, la saisie est gardée (brouillon), l'utilisateur re-tape et ça part.

**À ajouter Phase 1+** :

- **AbortController** de bout en bout (createPost + upload) : au réveil on `abort()`
  la requête gelée -> elle rejette -> le catch existant fait le rollback proprement.
  (Le code le prévoyait : « à couvrir plus tard via AbortController ».)
- Généraliser le pattern **epoch/watchdog auto-relâché** en un hook réutilisable
  (`useResilientMutation`) pour toute action longue (pas que publish).

**Phase 2 (schéma) : anti-orphelin / anti-fausse-notif** :

- Colonne `posts.status` (`pending` | `published`), **DEFAULT 'published'** (migration
  non-cassante : les lignes existantes restent visibles).
- Client : créer le post en `pending` -> uploader les médias -> **flip `published`**.
  Un post texte (sans photo) passe `published` immédiatement.
- **Feed + digest + notifications** ne comptent QUE `published` (vue `posts_public`
  et `check-social-digest` filtrés).
- **Cron GC** : suppression des `pending` de plus de 30 min (orphelins de submit
  gelé/tué) + de leurs médias storage éventuels.
- Effet : plus aucun post fantôme, plus aucune notif « 9 puis 0 ».

**Validation** : couper le réseau en plein upload, tuer l'app, revenir -> aucun post
fantôme, aucune notif ; re-publier fonctionne ; 0 `pending` résiduel après 30 min.

### C5. Robustesse de l'upload photo

- **Prévention** (livrée V0.7.2) : lecture des octets dès la sélection (File en
  mémoire) -> la référence OS ne se périme plus.
- **Élargir le catch** : traiter `NotFoundError` (DOMException code 8) **comme**
  `NotReadableError` (message actionnable + warning, pas une issue d'erreur).
- Garder la robustesse HEIC/orientation/compression existante ; vérifier le
  décodage HEIC sur iOS in-app (Instagram/FB WebView).

**Validation** : sélection d'une photo depuis iCloud/Google Photos non téléchargée ->
message clair, pas de crash, publication possible après re-sélection.

### C6. UX de connexion (rendre l'invisible visible)

- **Bannière « Reconnexion… »** non bloquante quand la couche C1-C3 récupère, et
  **« Connexion perdue, Réessayer »** si l'utilisateur est hors-ligne. (Aujourd'hui
  l'écran vide ne dit rien.)
- Détection `online`/`offline` globale + file d'attente légère des actions critiques
  (au minimum : bloquer proprement et informer, pas de bouton mort).
- Messages d'erreur d'action **toujours** présents (le filet mutation capture déjà,
  on s'assure d'un toast user à chaque échec d'action visible).

**Validation** : passer en avion 10 s en plein usage -> bannière claire ; retour en
ligne -> reprise auto.

### C7. Observabilité sans douleur de quota

- **Couper le Session Replay** : `replaysSessionSampleRate = 0` et
  `replaysOnErrorSampleRate = 0` (ou retirer `replayIntegration`). On garde erreurs +
  breadcrumbs + `trackFailure` (silent failures) + rage-click, qui suffisent au
  diagnostic (cf. cette session : tout a été diagnostiqué sans regarder une vidéo).
- Ajouter au `ignoreErrors` le bruit in-app browser : `postMessage: Java object is
gone`, `navigation_performance_logger`, `Java object is gone`.
- Garder le tracking « échec silencieux » (publish interrompu, watchdog, session
  expirée) : c'est ce qui rend enfin visibles les bugs sans exception.
- (Option) Dashboard Sentry « échecs silencieux » filtré par `silent_failure` +
  `release`.

**Validation** : consommation Replay = 0 ; les issues critiques restent visibles.

### C8. Réduction de la friction d'authentification (OTP)

(Produit + technique, à cadrer avec la roadmap auth existante `AUTH_ROADMAP.md`.)

- **Persistance réelle** : « Se souvenir de moi » -> session longue durée fiable
  (corrige d'abord R1/C1 qui casse la session).
- **Renvoi du code** clair + délai + message « vérifie tes spams » ; diagnostiquer la
  délivrabilité OTP (email provider).
- Étudier une **alternative au tout-OTP** : magic link persistant, ou **passkeys**
  (WebAuthn), ou mot de passe optionnel. Décision produit Nicolas.
- Clarifier le **raccourci écran d'accueil / PWA** (users 3, 4) : rester connecté.

**Validation** : un utilisateur qui a coché « se souvenir » ne re-saisit pas d'OTP
pendant N jours, PWA incluse.

### C9. Correction de la stack de notifications

- **Anti-fantôme** : résolu par C4 Phase 2 (digest ne compte que `published`).
- Poursuivre le **regroupement/dédoublonnage** (chantier en cours,
  `groupNotifications`).
- Vérifier les crons digest (fréquence, idempotence, `emailed_at`).

### C10. Résilience CSP / tiers / adblocker

- **Auditer les scripts chargés depuis un autre domaine** (point user 5) : idéalement
  tout self-host / same-origin ; sinon, autoriser explicitement dans la CSP.
- **Dégradation gracieuse** si un script tiers (Sentry, analytics) est bloqué par
  uBlock : l'app doit fonctionner **sans** (déjà le cas pour Sentry en lazy no-op ;
  vérifier les autres).
- Revue `vercel.json` (CSP `script-src`, `connect-src`, `worker-src`) pour cohérence
  avec Supabase + Sentry + images.

---

## 4. Matrice de test multi-plateforme (obligatoire avant « fixé pour de bon »)

| Scénario \ Plateforme                      | Desktop Chrome | Desktop Firefox | Desktop Safari | Android Chrome | Android in-app (IG/FB) | iOS Safari | iOS PWA installée |
| ------------------------------------------ | -------------- | --------------- | -------------- | -------------- | ---------------------- | ---------- | ----------------- |
| Publier Rencontre (3 photos)               |                |                 |                |                |                        |            |                   |
| Publier Instant (1 photo)                  |                |                 |                |                |                        |            |                   |
| Publier sans photo (texte)                 |                |                 |                |                |                        |            |                   |
| Veille 30 s pendant l'upload -> retour     |                |                 |                |                |                        |            |                   |
| Veille 2 min -> retour -> Publier          |                |                 |                |                |                        |            |                   |
| Idle 5 min (onglet visible) -> action      |                |                 |                |                |                        |            |                   |
| Idle 30 min -> retour                      |                |                 |                |                |                        |            |                   |
| Avion 10 s en plein usage -> retour        |                |                 |                |                |                        |            |                   |
| Recherche espèce -> effacer -> re-chercher |                |                 |                |                |                        |            |                   |
| Re-login après fermeture app               |                |                 |                |                |                        |            |                   |
| Photo iCloud/GPhotos non téléchargée       |                |                 |                |                |                        |            |                   |

Chaque case : PASS / FAIL + note. Aucune release « stabilité » sans cette grille
majoritairement verte sur les scénarios critiques (publish + reprise).

---

## 5. Déploiement et validation

- **Contrainte connue** : `dev = prod` (NG-007 non résolu) -> pas de vraie staging DB
  pour tester la migration C4 Phase 2. Migration conçue **non-cassante** (DEFAULT
  'published') ; appliquer hors heure de pointe, avec vérif immédiate.
- **Feature flags** (`src/lib/featureFlags.ts`) : livrer la couche résilience derrière
  un flag activable progressivement si besoin.
- **Canary** : valider sur le preview develop + 1-2 devices réels (iOS + Android)
  avant chaque merge prod, en suivant la matrice §4.
- **Monitoring post-deploy** : filtrer `release:X` dans Sentry 48 h ; surveiller le
  nouvel event « publish success/fail » ; 0 rage-click bouton `disabled`.
- **Rollback** : chaque release = 1 grappe cohérente ; garder la possibilité de
  rollback Vercel (isRollbackCandidate) + migration additive réversible.

---

## 6. Garde-fous et pérennité (pour ne jamais y revenir)

- **Hook `useResilientMutation`** réutilisable : verrou + epoch + watchdog
  auto-relâché + abort au réveil. Toute action longue future en hérite -> pas de
  nouveau « bouton mort ».
- **AppLivenessController** documenté comme LA porte d'entrée de toute reprise.
- **Tests E2E de résilience** (Playwright) : scénarios veille/idle/offline scriptés
  (émulation `visibilitychange`, offline) pour prévenir les régressions.
- **Uptime / synthétique** : un check périodique « publier un post de test » en
  environnement dédié (ou au moins un ping santé) pour détecter une régression avant
  les users.
- **Budget d'erreur** : seuil d'alerte Sentry (Discord) sur `silent_failure` et sur
  le taux d'échec de publication.

---

## 7. Séquencement recommandé (impact décroissant, risque maîtrisé)

**Lot A (immédiat, faible risque, gros soulagement)** :

1. C7 : couper le Session Replay + `ignoreErrors` in-app browser. (config, minutes)
2. C4 Phase 1 : anti-bouton-mort (déjà codé) -> finaliser + commit.
3. C5 : `NotFoundError` traité comme `NotReadableError`.

**Lot B (le coeur de la résilience)** :

4. C3 : AppLivenessController (idle + focus + online) -> refetch + relâche verrous.
5. C1 : session/token (vrai lock + refresh au réveil + retry 401 une fois).
6. C2 : reconnexion Realtime.
7. C6 : bannière reconnexion / offline.

**Lot C (anti-fantôme + qualité)** :

8. C4 Phase 2 : `posts.status` pending->published + GC + digest filtré.
9. C9 : notifications.
10. C10 : audit CSP/tiers/adblocker.

**Lot D (produit)** :

11. C8 : friction OTP (reco produit dédiée).

**Transverse** : matrice §4 à chaque lot ; guardrails §6 au fil de l'eau.

---

## 8. Risques et mitigations

| Risque                                        | Mitigation                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Régression sur le pipeline publish (critique) | Epoch + garde-fou finally ; tests ; canary device ; flag                            |
| Migration `status` casse le feed              | DEFAULT 'published' (additif) ; filtre appliqué en un point (vue) ; vérif immédiate |
| Reprise trop agressive (refetch storm)        | Debounce + anti-boucle + refetch ciblé queries montées                              |
| Vrai verrou re-cause « Lock broken »          | Web Locks + timeout de secours + fallback no-op                                     |
| Reconnexion Realtime en boucle                | Backoff exponentiel + cap                                                           |
| dev = prod (pas de staging)                   | Migrations additives réversibles + hors pointe + monitoring                         |

---

_Ce document est la source de vérité du chantier « stabilité ». À mettre à jour au
fil des lots livrés._
