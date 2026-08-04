# Plan Observabilité & Stabilité, Naturegraph (A → Z)

> Objectif : ne plus JAMAIS corriger à l'aveugle. Savoir en moins de 5 minutes
> **quoi** a cassé, **où** (fichier + ligne), **dans quelle version**, **pour
> quel geste utilisateur**, et **combien de personnes** sont touchées, et être
> **alerté automatiquement** quand ça arrive.
>
> Rédigé le 2026-07-30. Repart de zéro (vision complète du MVP), en s'appuyant
> sur ce qui existe déjà (cf. §7).

---

## ÉTAT D'AVANCEMENT (mis à jour 2026-08-04)

**FAIT et en prod (V0.6.1 → V0.6.9) :**

- ✅ **Reprise au retour d'arrière-plan (V0.6.9)** : correction de LE bug le plus
  frustrant, le « bouton Partage ta rencontre mort au retour dans l'app, et rien
  dans Sentry ». Diagnostic : l'OS **gèle tout le contexte JS** (Sentry inclus)
  quand la PWA est en arrière-plan ; aucune instrumentation in-page ne peut alors
  remonter quoi que ce soit. Fix `src/lib/resumeRecovery.ts` (installé hors React
  pour survivre à un arbre figé) : `pageshow`+`persisted` (bfcache) après ≥ 60 s
  cachée → **reload** (app ressuscitée) ; retour visible après longue absence →
  **refetch** des requêtes actives (sobre, pas de reload). + `SectionErrorBoundary`
  autour du panneau de contribution : un chunk de formulaire qui échoue à charger
  devient un encart « Réessayer » + un événement Sentry, au lieu d'un vide muet.
  - remontée Sentry du reload sur chunk périmé (`vite:preloadError`).

**FAIT et en prod (V0.6.1 → V0.6.8) :**

- ✅ **Phase 0 complète** : source maps uploadées + `release` taggée (V0.6.1),
  environnements, intégrations explicites (browserTracing + Session Replay),
  contexte **route** + **utilisateur** (V0.6.7). Piège Vercel résolu :
  `SENTRY_AUTH_TOKEN` au niveau **Projet** (pas Shared équipe).
- ✅ **Phase 2.1 (filets d'erreur)** : `SectionErrorBoundary` sur feed / échanges
  / détail post, **+ filet au niveau PAGE dans `LazyPage`** (V0.6.8) → les 28
  routes protégées d'un coup. Aucun écran ne fait plus tomber toute l'app.
- ✅ **Phase 2.2 (gestes critiques)** : publier, upload photo, recherche espèce,
  auth (OTP envoi/vérif) instrumentés (`trackAction`/`trackFailure`, capture des
  échecs silencieux + garde-fous composant, V0.6.3-0.6.8).
- ✅ **Filet GLOBAL mutations** (`MutationCache.onError`, V0.6.6) : toute action
  utilisateur ratée capturée en un point, 12 actions labellisées. **Filet
  queries** en fil d'Ariane (V0.6.8).
- ✅ **Session Replay** actif (vidéo sur erreur ET sur échec silencieux via flush).
- ✅ **Phase 2.3** : Web Vitals via browserTracing + Vercel Analytics.

**RESTE (par ordre de valeur) :**

1. **Phase 3, backend/edge** : capturer les erreurs des Edge Functions Deno
   (les 10 fonctions email/crons NG-045) vers Sentry — aujourd'hui un crash edge
   (ex : E2 coupé à 23/42) reste invisible tant que personne ne lit les logs.
2. **Perf ciblée** : mesurer la durée des flux clés (publier/upload/recherche) et
   flaguer les lents.
3. **Phase 1, alertes Discord + uptime** (reporté par Nicolas : pas prioritaire).

---

## 1. Constat, pourquoi on est dans le brouillard aujourd'hui

Sentry EST installé et **actif en prod** (il reçoit des erreurs). Mais il lui
manque les deux réglages qui rendent une erreur EXPLOITABLE :

| Manque                           | Conséquence concrète                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Pas de source maps uploadées** | Les stacks sont minifiées : `?<anonymous>`, noms illisibles. Le crash `reading 'user'` était impossible à localiser POUR CETTE RAISON. |
| **Pas de `release` taggée**      | Sentry ne sait pas de quelle version vient l'erreur. Impossible de dire « régression depuis V0.5.0 », ni « résolu dans V0.6.1 ».       |
| **Pas d'alertes**                | Un crash apparaît en silence, on l'apprend quand un user râle.                                                                         |
| **Pas de contexte de geste**     | On ne sait pas ce que l'user faisait (publier ? uploader ? naviguer ?).                                                                |

**80 % du problème « on avance à l'aveugle » se règle avec les source maps + les
releases (Phase 0). ~2-3 h de travail.** Le reste est de la consolidation.

---

## 2. Objectifs mesurables (definition of done)

- **Crash-free sessions > 99,5 %** (indicateur nº1 de stabilité).
- **Time-to-diagnosis < 5 min** : une erreur = fichier, ligne, version, user-flow, nombre d'users.
- **Alerte < 2 min** après un nouveau crash ou un spike (Discord + email).
- **Web Vitals** dans le budget `GUIDELINES.md` (LCP < 2,5 s, INP < 200 ms, CLS < 0,1).
- **0 erreur silencieuse** sur les 4 gestes critiques : auth, publier, upload photo, recherche d'espèce.

---

## 3. Architecture cible de l'observabilité

```
  NAVIGATEUR (React/Vite)                 BACKEND (Supabase)            PLATEFORME
  ─────────────────────                   ──────────────────            ──────────
  Sentry SDK                              Postgres logs                 Vercel
   ├─ Errors + source maps                Edge Functions logs           ├─ Deploys
   ├─ Releases (version+SHA)              Auth logs                      ├─ Web Analytics
   ├─ Performance (traces, Web Vitals)   Realtime logs                  └─ Cron/uptime
   ├─ Session Replay (on error)          get_advisors (secu/perf)
   └─ Breadcrumbs (auth, nav, actions)         │
        │                                       │
        └──────────────► corrélation via request-id ◄────────┘
                                  │
                          ALERTES (Discord + email)
                                  │
                        TRIAGE quotidien + priorisation
```

---

## 4. Le phasage (du plus critique au confort)

### PHASE 0, Fondations Sentry (PRIORITÉ ABSOLUE, ~2-3 h)

**0.1 Source maps lisibles** (le game-changer)

- Ajouter `@sentry/vite-plugin` dans `vite.config.ts`.
- Config : `org`, `project`, `authToken` (via `SENTRY_AUTH_TOKEN`, secret Vercel, PAS dans le repo).
- Le plugin upload les source maps au build ET les supprime du bundle public (pas de fuite de code source côté client).
- Résultat : chaque erreur pointe le vrai fichier + ligne + fonction.

```ts
// vite.config.ts (extrait)
import { sentryVitePlugin } from '@sentry/vite-plugin'
// ...
plugins: [
  // ...plugins existants
  process.env.SENTRY_AUTH_TOKEN &&
    sentryVitePlugin({
      org: 'naturegraph',
      project: 'javascript-react',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.VITE_APP_VERSION }, // = version package.json
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
],
build: { sourcemap: true }, // genere les maps, le plugin les upload puis nettoie
```

**0.2 Releases taggées** (version + commit)

- Passer `release` à `Sentry.init` = `VITE_APP_VERSION` (injecté au build depuis `package.json`) + le git SHA.
- Bénéfices : « première apparition en V0.5.0 », suspect commits, bouton « Resolve in next release », régressions détectées auto.

```ts
// monitoring.ts, dans Sentry.init
release: import.meta.env.VITE_APP_VERSION,        // ex "0.6.0"
environment: import.meta.env.VITE_APP_ENV,        // development | staging | production
```

- Injecter la version au build : `define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version) }` dans vite.config.

**0.3 Environnements séparés**

- `VITE_APP_ENV` = `production` (main), `staging` (staging), `development` (preview). Déjà en place côté flags, à câbler dans Sentry pour filtrer prod vs test.

**0.4 Intégrations SDK explicites**

- `browserTracingIntegration` (perf + Web Vitals), `replayIntegration` (déjà on-error via `replaysOnErrorSampleRate: 1.0`), `reactErrorBoundary`. Vérifier qu'elles sont bien chargées (l'init dynamique `any` actuel ne les déclare pas explicitement).

**0.5 Contexte & tags utiles** (sans PII, RGPD)

- Tags : `route`, `release`, `feature_flag` actifs, `user.id` (déjà hashé côté Supabase, jamais l'email, le `beforeSend` scrubbe déjà).
- Ces tags rendent le triage instantané (« ce crash touche 12 users, tous sur /post, en V0.6.0 »).

### PHASE 1, Détection & alerte (~1-2 h)

**1.1 Alertes Sentry → Discord + email**

- Règle « nouvelle issue » (jamais vue) → notif immédiate.
- Règle « spike » (fréquence × N en Y min) → notif.
- Règle « régression » (issue resolved qui réapparaît) → notif.
- Webhook Discord dédié (channel #alertes-tech privé).

**1.2 Uptime / synthetic monitoring**

- Un check externe (Better Uptime / Checkly / cron Vercel) qui ping `naturegraph.ca` + un endpoint santé toutes les 1-5 min → alerte si le site tombe. Aujourd'hui on ne le SAIT PAS si l'app est down.

**1.3 Dashboard stabilité**

- Vue Sentry : crash-free sessions %, top issues par impact, Web Vitals p75.

### PHASE 2, Couverture front complète (~1 jour)

**2.1 Filets d'erreur granulaires PARTOUT**

- `SectionErrorBoundary` existe et est posé sur feed / échanges / détail de post. Généraliser à : **contribution** (Rencontre + Instant), **profil**, **réglages**, **admin**, **recherche**. Objectif : aucun crash ne fait tomber toute l'app.

**2.2 Instrumenter les 4 gestes critiques**

- `auth`, `publier`, `upload photo`, `recherche d'espèce` : breadcrumbs à chaque étape + `captureException` explicite sur échec (avec contexte).
- Impact direct : l'upload « pb de droits » (Hebus13) deviendra ENFIN visible avec sa vraie cause (permission ? HEIC ? RLS ?).

**2.3 Web Vitals & perf**

- `browserTracingIntegration` remonte LCP/INP/CLS. Croiser avec Vercel Analytics (déjà là). Alerter sur régression de perf.

### PHASE 3, Backend & bout-en-bout (~1 jour)

**3.1 Observabilité Supabase**

- Revue régulière (ou export) des logs Edge Functions + Postgres + `get_advisors` (sécu/perf). Alerte sur erreurs Edge (les 10 fonctions email/crons NG-045).
- `pg_cron` : vérifier l'exécution des crons (digests, nettoyages).

**3.2 Corrélation front ↔ back**

- Propager un `request-id` du front (Sentry trace) vers les appels Supabase/Edge → relier un crash user à la trace serveur.

**3.3 Sécurité en continu**

- `get_advisors(security)` en check périodique (aujourd'hui manuel). Dependabot déjà actif (reste 1 alerte RSC, sans objet).

### PHASE 4, Process & discipline (continu)

**4.1 Triage quotidien**

- 10 min/jour : revue des nouvelles issues Sentry, priorisation par **impact = nb users × fréquence**, assignation, résolution taggée à une version.

**4.2 Budgets & garde-fous**

- Stabilité : crash-free > 99,5 %. Perf : budget `GUIDELINES.md`. Bloquer une release si régression majeure.

**4.3 CI/CD durci**

- Déjà : lint + tests (148) + build + CodeQL + Vercel + Dependabot. À ajouter : upload source maps au build (Phase 0), e2e Playwright (déjà présent) sur les 4 parcours critiques, `knip` dead-code en garde-fou.

**4.4 Discipline de release**

- Chaque release = un tag Sentry + release notes (déjà le cas) → chaque déploiement est traçable et réversible.

---

## 5. Ordre d'exécution recommandé

1. **Phase 0** (source maps + releases + env + contexte) → **le brouillard se lève ici**.
2. **Phase 1** (alertes + uptime) → on est prévenu au lieu d'attendre les plaintes.
3. **Phase 2.2** (instrumenter auth/publier/upload/recherche) → les bugs actuels deviennent diagnosticables.
4. **Phase 2.1** (filets partout) + **Phase 3** (backend) + **Phase 4** (process).

Le trio **0 + 1 + 2.2** (~1,5 jour) transforme déjà radicalement la situation.

---

## 6. Ce dont j'ai besoin de toi (secrets / accès)

- `SENTRY_AUTH_TOKEN` (Sentry → Settings → Auth Tokens, scope `project:releases` + `org:read`) à mettre en **secret Vercel** (jamais dans le repo).
- Confirmer l'`org` et le `project` Sentry (vu : `javascript-react`).
- Un webhook Discord pour le channel d'alertes.
- Le choix de l'outil uptime (Better Uptime gratuit suffit au début).

---

## 7. Ce qui existe déjà (bon socle, à ne pas refaire)

- **Sentry** : init lazy (`monitoring.ts`), actif en prod, PII scrubbée (`beforeSend`), bruit in-app ignoré (`ignoreErrors`), `replaysOnErrorSampleRate: 1.0` (replay sur erreur), `tracesSampleRate: 0.1`.
- **Error boundaries** : `AppErrorBoundary` (global) + `SectionErrorBoundary` (local, re-essayable, `captureException` + label de section) sur feed / échanges / détail post.
- **Breadcrumbs auth** (`authBreadcrumb`) sur les transitions de session.
- **Résilience** : React Query `refetchOnWindowFocus`/`refetchOnReconnect` + retry 5xx, session self-heal (`assertActiveSession` rafraîchit au lieu de détruire), brouillon 24 h, Realtime échanges.
- **Plateforme** : Vercel Analytics, CI (lint/test/build/CodeQL/Vercel), Dependabot, e2e Playwright.

---

## 8. Ce que ça change, concrètement

Aujourd'hui : « l'app a planté quelque part, `?<anonymous>`, on ne sait pas ».
Après Phase 0+1 : « Sentry m'a pingé sur Discord : `TypeError: reading 'user'`
dans `FeedPost.tsx:214`, apparu en **V0.6.0**, **8 users** touchés, tous en
naviguant vers un profil ; voici le **replay vidéo** de la session ». → on
corrige en connaissance de cause, on tag « resolved in V0.6.1 », et Sentry nous
prévient si ça réapparaît.
