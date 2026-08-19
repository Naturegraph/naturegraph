# Pipeline de développement Naturegraph — portes de validation séquentielles

> Norme officielle (2026-08-19). **Chaque tâche** (feature, fix, refactor, migration)
> traverse ces PORTES **dans l'ordre**. On ne passe à la porte suivante que si la
> précédente est **VALIDÉE (GO)**. Chaque porte a un **rôle**, une **checklist** et
> un **verdict** consigné dans le **suivi** (section finale). Une porte NO-GO
> renvoie à la porte concernée, jamais en avant.

Ce pipeline s'appuie sur : `environments.md` (dev/staging/prod séparés),
`RELEASE_PROCESS.md`, `GUIDELINES.md` (éco-conception + a11y), `CLAUDE.md`.

Principe de base : **on développe sur `develop` (base DEV), jamais sur la prod.**
Flux : `develop → staging → main`. Prod = dernière porte uniquement.

---

## G0 · Cadrage — rôle : PM

Comprendre la demande avant d'écrire une ligne.

- [ ] Besoin reformulé en 1-2 phrases + **critères d'acceptation** écrits.
- [ ] Périmètre : front / back / DB / chemin de rendu-loader-auth ? (le dernier = vigilance mobile, cf. G7).
- [ ] Impact données : touche-t-on au schéma ? (si oui → G5 obligatoire).
- [ ] Découpage en étapes ; ce qui est **hors périmètre** est noté.

**GO** : périmètre + critères d'acceptation clairs. **Sinon** : poser les questions à Nicolas.

---

## G1 · Implémentation — rôle : Dev

Coder la solution sur `develop`.

- [ ] Conventions : TypeScript strict (pas de `any`), composants < 200 lignes, tokens `var(--color-*)` (jamais de couleur en dur), i18n FR/EN, HTML sémantique + aria.
- [ ] Commentaires du **pourquoi** posés au fur et à mesure (pas du trivial).
- [ ] Pas de tiret cadratin/demi-cadratin (règle de style permanente).
- [ ] La feature fonctionne localement (`npm run dev`).

**GO** : le comportement attendu marche localement.

---

## G2 · Optimisation & factorisation — rôle : Refactor/Perf

Nettoyer AVANT de committer (pas après).

- [ ] DRY : factoriser les répétitions, extraire les helpers réutilisables.
- [ ] Pas de code mort / import inutilisé / console.log oublié.
- [ ] Pas d'over-engineering (la solution la plus simple qui marche).
- [ ] Éco-conception : budget JS < 300 KB gzip, page < 500 KB, LCP < 2,5 s ; images WebP/AVIF + lazy + dimensions ; CSS plutôt que JS ; `prefers-reduced-motion` respecté.
- [ ] Pas de dépendance JS ajoutée sans justification.

**GO** : code propre, simple, budgets respectés.

---

## G3 · Qualité — rôle : QA

Tout doit être vert.

- [ ] `npm run build` : OK
- [ ] `npm test` : 100 % (aujourd'hui 148/148)
- [ ] `npx eslint .` : **0 erreur** (warnings connus tolérés)
- [ ] Typecheck (inclus dans `build` via `tsc -b`) : OK

**GO** : build + tests + lint verts. **NO-GO** → retour G1/G2.

---

## G4 · Sécurité & données — rôle : Security

Défense en profondeur, dès le départ.

- [ ] Nouvelle table → **RLS activée + policies** ; RPC `SECURITY DEFINER` volontaire et scopée.
- [ ] Aucun secret dans le code / le bundle / les commits.
- [ ] `maxLength` front **et** service ; erreurs assainies (`sanitizeError`) ; anti-abus si formulaire public.
- [ ] Aucune vraie donnée utilisateur en dev/test (mock uniquement, cf. `seed-dev-testdata.sql`).
- [ ] `npm audit` : **0 vulnérabilité** (sinon corriger via overlays/overrides).

**GO** : rien de rouge côté sécurité.

---

## G5 · Base de données — rôle : DBA (si changement de schéma)

Sinon, sauter cette porte.

- [ ] Migration créée via `npm run migration:new -- "description"` (fichier **horodaté unique** `YYYYMMDDHHMMSS_nom.sql`, idempotente).
- [ ] Appliquée et **testée sur le DEV d'abord** (MCP `supabase-dev` ou runner), jamais direct prod.
- [ ] `docs/backend/database-architecture.md` + `schema.sql` mis à jour ; types Supabase régénérés si besoin.
- [ ] Compteurs dénormalisés par triggers (pas côté client) ; pagination (max 20/req).

**GO** : migration testée sur le dev, docs backend alignées. **Application prod = G9.**

---

## G6 · Docs & commentaires — rôle : Doc

Le code et la doc racontent la même chose, à la version où on est.

- [ ] Commentaires « pourquoi » à jour ; JSDoc sur fonctions/composants exportés ; en-tête de fichier pour les nouveaux fichiers.
- [ ] Docs impactées mises à jour : `PROJECT_MASTER.md`, `CLAUDE.md`, `environments.md`, PRD/runbooks concernés.
- [ ] Références de version cohérentes (numéro de version, décisions datées en absolu).

**GO** : docs cohérentes avec le code livré.

---

## G7 · Preview & validation UX — rôle : UX + Nicolas

La preview develop tourne sur la **base DEV** (données de test, zéro prod).

- [ ] Preview develop ouverte ; **console sans erreur**.
- [ ] Vérifié en **mobile ET desktop** (viewport), dark mode inclus si pertinent.
- [ ] **RÈGLE PERMANENTE** : si la tâche touche le **chemin rendu / loader / splash / auth / session** → **validation de Nicolas sur son mobile réel (connecté) AVANT prod**. En cas de doute → rollback d'abord, diagnostic ensuite.
- [ ] A11y : contraste ≥ 4,5:1, navigation clavier, focus visible, skip link, alt text.

**GO** : Nicolas valide (obligatoire pour le chemin de rendu ; recommandé sinon).

---

## G8 · Intégration staging — rôle : Intégration

- [ ] PR `develop → staging` ; la preview staging (base DEV) est stable.
- [ ] Tests en conditions réelles ; itérations UX/fixes si besoin (retour G1).

**GO** : staging stable, prêt pour la release.

---

## G9 · Release en prod — rôle : Release Manager

**Jamais de push prod systématique** : on groupe plusieurs changements cohérents.

- [ ] 2 release notes rédigées (technique + user-friendly, template `RELEASE_PROCESS.md`) et **soumises à Nicolas** (date, heure, tests, force-logout ?, notif ?).
- [ ] **OK explicite de Nicolas** obtenu.
- [ ] Version bumpée (`npm run release:*`) + note dans `docs/devops/releases/`.
- [ ] PR `staging → main` ; **CI verte** (Lint/Test/Build, CodeQL, Vercel).
- [ ] Merge squash ; **migrations appliquées sur la PROD** (celles validées en G5) ; back-merge `main → develop` ; tag `vX.Y.Z`.
- [ ] Notif in-app / force-logout uniquement si validés par Nicolas.

**GO** : prod déployée sur `naturegraph.ca`.

---

## G10 · Suivi post-prod — rôle : Observabilité

- [ ] `naturegraph.ca` répond 200 ; bundle prod référence bien la **base prod** (`hrxg…`, pas `nkgd…`).
- [ ] Surveillance **Sentry 30-60 min** post-deploy (pas de nouvelle issue).
- [ ] Advisors Supabase inchangés (aucune régression sécurité).
- [ ] Suivi consigné + clôture.

**GO** : prod saine → **tâche clôturée**.

---

## Modèle de SUIVI (à remplir et à me remettre)

À rendre à Nicolas en fin de tâche (ou à chaque porte importante) :

```
TÂCHE : <titre>            VERSION CIBLE : vX.Y.Z
─────────────────────────────────────────────────
G0 Cadrage        [ GO / NO-GO ]  <note>
G1 Implémentation [ GO / NO-GO ]  <note>
G2 Optim/Factor   [ GO / NO-GO ]  <note>
G3 Qualité        [ GO / NO-GO ]  build/test/lint : …
G4 Sécurité       [ GO / NO-GO ]  npm audit : … · RLS : …
G5 DB (migration) [ GO / N/A   ]  <fichier> testé dev : …
G6 Docs           [ GO / NO-GO ]  docs màj : …
G7 Preview/UX     [ GO / NO-GO ]  mobile+desktop : … · Nicolas : …
G8 Staging        [ GO / NO-GO ]  <note>
G9 Release prod   [ GO / EN ATTENTE VALIDATION ]  release notes : … · CI : …
G10 Suivi prod    [ GO / NO-GO ]  Sentry : … · bundle prod = hrxg : …
─────────────────────────────────────────────────
RESTE / RISQUES : <points ouverts>
```

## Rôles condensés (mémo)

| Porte | Rôle | Question clé |
|---|---|---|
| G0 | PM | « Qu'est-ce qu'on livre exactement ? » |
| G1 | Dev | « Ça marche ? » |
| G2 | Refactor/Perf | « C'est propre, simple, sobre ? » |
| G3 | QA | « Tout est vert ? » |
| G4 | Security | « Rien de rouge côté sécurité/données ? » |
| G5 | DBA | « La migration est testée sur le dev ? » |
| G6 | Doc | « Code et docs disent la même chose ? » |
| G7 | UX + Nicolas | « Validé mobile + desktop ? » |
| G8 | Intégration | « Staging est stable ? » |
| G9 | Release Manager | « Nicolas a dit OK pour la prod ? » |
| G10 | Observabilité | « La prod est saine 1 h après ? » |
