# Pipeline de développement Naturegraph — portes de validation séquentielles

> Norme officielle (2026-08-19, màj 2026-08-20 : ajout porte G3 Product Designer).
> **Chaque tâche** (feature, fix, refactor, migration) traverse ces PORTES **dans
> l'ordre**. On ne passe à la porte suivante que si la précédente est **VALIDÉE
> (GO)**. Chaque porte a un **rôle**, une **checklist** et un **verdict** consigné
> dans le **suivi** (section finale). Une porte NO-GO renvoie à la porte concernée,
> jamais en avant.

Ce pipeline s'appuie sur : `environments.md` (dev/staging/prod séparés),
`RELEASE_PROCESS.md`, `GUIDELINES.md` (éco-conception + a11y), `CLAUDE.md`.
La release elle-même (G9/G10) s'exécute via le skill **release-prod**.

Principe de base : **on développe sur `develop` (base DEV), jamais sur la prod.**
Flux : `develop → staging → main`. Prod = dernière porte uniquement.

---

## G0 · Cadrage — rôle : PM

Comprendre la demande avant d'écrire une ligne.

- [ ] Besoin reformulé en 1-2 phrases + **critères d'acceptation** écrits.
- [ ] Périmètre : front / back / DB / chemin de rendu-loader-auth ? (le dernier = vigilance mobile, cf. G8).
- [ ] Impact données : touche-t-on au schéma ? (si oui → G6 obligatoire).
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
- [ ] Éco-conception (perf) : budget JS < 300 KB gzip, page < 500 KB, LCP < 2,5 s ; images WebP/AVIF + lazy + dimensions ; CSS plutôt que JS.
- [ ] Pas de dépendance JS ajoutée sans justification.

**GO** : code propre, simple, budgets respectés.

---

## G3 · Design System & Accessibilité — rôle : Product Designer (UX/UI)

Le **garant du respect du design et de l'accessibilité**. Audit expert de la feature
rendue (sur la preview dev en marche), au-delà du simple markup. C'est la porte qui
manquait : design et a11y ne sont plus dilués dans les autres rôles, ils ont un
propriétaire.

- [ ] **Design system** : tokens `var(--color-*)` partout (zéro couleur en dur) ; typo Quicksand (titres) + Mulish (corps) ; espacements / rayons / ombres cohérents ; **réutilisation des composants `src/components/ui/`** (pas de re-création d'un bouton/champ existant) ; **parité Figma** (tokens synchronisés).
- [ ] **Accessibilité WCAG AA** (audit complet) : contraste ≥ 4,5:1 (texte) / ≥ 3:1 (UI + grand texte) ; **navigation clavier complète** + ordre de tabulation logique ; **focus visible** ; cibles tactiles ≥ 44px ; HTML sémantique + `aria`/roles justes (pas d'aria décoratif) ; `alt` pertinent ; labels de formulaire reliés ; `aria-live` pour le contenu dynamique (toasts, chargements) ; `prefers-reduced-motion` respecté ; `lang` + skip link présents.
- [ ] **Responsive & thèmes** : mobile ET desktop ; **light ET dark** cohérents (via tokens, jamais de couleur figée) ; aucun débordement horizontal ; safe-areas mobile (notch).
- [ ] **Éco-design** : pas d'animation superflue ; sobriété visuelle ; images dimensionnées + `loading="lazy"`.
- [ ] **États couverts** : vide, chargement (skeleton), erreur, succès (pas d'écran mort).

**GO** : conforme design system + WCAG AA, cohérent light/dark et mobile/desktop.
**NO-GO** → retour G1 (markup / styles / tokens).

---

## G4 · Qualité — rôle : QA

Tout doit être vert.

- [ ] `npm run build` : OK
- [ ] `npm test` : 100 % (aujourd'hui 184/184)
- [ ] `npx eslint .` : **0 erreur** (warnings connus tolérés)
- [ ] Typecheck (inclus dans `build` via `tsc -b`) : OK

**GO** : build + tests + lint verts. **NO-GO** → retour G1/G2.

---

## G5 · Sécurité & données — rôle : Security

Défense en profondeur, dès le départ.

- [ ] Nouvelle table → **RLS activée + policies** ; RPC `SECURITY DEFINER` volontaire et scopée (attention à `anon`, cf. advisors Supabase).
- [ ] Aucun secret dans le code / le bundle / les commits.
- [ ] `maxLength` front **et** service ; erreurs assainies (`sanitizeError`) ; anti-abus si formulaire public.
- [ ] Aucune vraie donnée utilisateur en dev/test (mock uniquement, cf. `seed-dev-testdata.sql`).
- [ ] `npm audit` : **0 vulnérabilité** (sinon corriger via overlays/overrides).

**GO** : rien de rouge côté sécurité.

---

## G6 · Base de données — rôle : DBA (si changement de schéma)

Sinon, sauter cette porte.

- [ ] Migration créée via `npm run migration:new -- "description"` (fichier **horodaté unique** `YYYYMMDDHHMMSS_nom.sql`, idempotente).
- [ ] Appliquée et **testée sur le DEV d'abord** (MCP `supabase-dev` ou runner), jamais direct prod.
- [ ] `docs/backend/database-architecture.md` + `schema.sql` mis à jour ; types Supabase régénérés si besoin.
- [ ] Compteurs dénormalisés par triggers (pas côté client) ; pagination (max 20/req).

**GO** : migration testée sur le dev, docs backend alignées. **Application prod = G10.**

---

## G7 · Docs & commentaires — rôle : Doc

Le code et la doc racontent la même chose, à la version où on est.

- [ ] Commentaires « pourquoi » à jour ; JSDoc sur fonctions/composants exportés ; en-tête de fichier pour les nouveaux fichiers.
- [ ] Docs impactées mises à jour : `PROJECT_MASTER.md`, `CLAUDE.md`, `environments.md`, PRD/runbooks concernés.
- [ ] Références de version cohérentes (numéro de version, décisions datées en absolu).

**GO** : docs cohérentes avec le code livré.

---

## G8 · Preview & validation UX — rôle : UX + Nicolas

La preview develop tourne sur la **base DEV** (données de test, zéro prod). Ici on
valide l'**expérience produit** et on obtient le **sign-off humain** (la conformité
design/a11y a déjà été auditée en G3).

- [ ] Preview develop ouverte ; **console sans erreur**.
- [ ] Parcours produit vérifié de bout en bout (le scénario réel de l'utilisateur).
- [ ] **RÈGLE PERMANENTE** : si la tâche touche le **chemin rendu / loader / splash / auth / session** → **validation de Nicolas sur son mobile réel (connecté) AVANT prod**. En cas de doute → rollback d'abord, diagnostic ensuite.

**GO** : Nicolas valide (obligatoire pour le chemin de rendu ; recommandé sinon).

---

## G9 · Intégration staging — rôle : Intégration

- [ ] PR `develop → staging` (réaligner staging sur le périmètre de release) ; la preview staging (base DEV) est stable.
- [ ] Tests en conditions réelles ; itérations UX/fixes si besoin (retour G1).

**GO** : staging stable, prêt pour la release.

---

## G10 · Release en prod — rôle : Release Manager

> **Exécuter via le skill `release-prod`** (exclusion dev-only, audit résidus, squash, rollback).

**Jamais de push prod systématique** : on groupe plusieurs changements cohérents.

- [ ] 2 release notes rédigées (technique + user-friendly, template `RELEASE_PROCESS.md`) et **soumises à Nicolas** (date, heure, tests, force-logout ?, notif ?).
- [ ] **OK explicite de Nicolas** obtenu.
- [ ] Version bumpée + note dans `docs/devops/releases/`.
- [ ] PR `staging → main` ; **CI verte** (Lint/Test/Build, CodeQL, Vercel) ; **merge SQUASH** (jamais `--admin`, jamais fast-forward).
- [ ] **Migrations appliquées sur la PROD** (celles validées en G6) ; **back-merge `main → develop`** ; tag `vX.Y.Z`.
- [ ] Notif in-app / force-logout uniquement si validés par Nicolas.

**GO** : prod déployée sur `naturegraph.ca`.

---

## G11 · Suivi post-prod — rôle : Observabilité

- [ ] `naturegraph.ca` répond 200 ; bundle prod référence bien la **base prod** (`hrxg…`, pas `nkgd…`).
- [ ] Surveillance **Sentry + erreurs runtime Vercel 30-60 min** post-deploy (pas de nouvelle issue).
- [ ] Advisors Supabase **inchangés** (aucune régression sécurité vs avant la release).
- [ ] Suivi consigné + clôture.

**GO** : prod saine → **tâche clôturée**.

---

## Modèle de SUIVI (à remplir et à me remettre)

À rendre à Nicolas en fin de tâche (ou à chaque porte importante) :

```
TÂCHE : <titre>            VERSION CIBLE : vX.Y.Z
─────────────────────────────────────────────────
G0  Cadrage        [ GO / NO-GO ]  <note>
G1  Implémentation [ GO / NO-GO ]  <note>
G2  Optim/Factor   [ GO / NO-GO ]  <note>
G3  Design/A11y    [ GO / NO-GO ]  DS : … · WCAG AA : … · light+dark : …
G4  Qualité        [ GO / NO-GO ]  build/test/lint : …
G5  Sécurité       [ GO / NO-GO ]  npm audit : … · RLS : …
G6  DB (migration) [ GO / N/A   ]  <fichier> testé dev : …
G7  Docs           [ GO / NO-GO ]  docs màj : …
G8  Preview/UX     [ GO / NO-GO ]  parcours : … · Nicolas mobile : …
G9  Staging        [ GO / NO-GO ]  <note>
G10 Release prod   [ GO / EN ATTENTE VALIDATION ]  release notes : … · CI : …
G11 Suivi prod     [ GO / NO-GO ]  Sentry/Vercel : … · advisors inchangés : … · bundle prod = hrxg : …
─────────────────────────────────────────────────
RESTE / RISQUES : <points ouverts>
```

## Rôles condensés (mémo)

| Porte | Rôle                         | Question clé                                                 |
| ----- | ---------------------------- | ------------------------------------------------------------ |
| G0    | PM                           | « Qu'est-ce qu'on livre exactement ? »                       |
| G1    | Dev                          | « Ça marche ? »                                              |
| G2    | Refactor/Perf                | « C'est propre, simple, sobre ? »                            |
| G3    | **Product Designer (UX/UI)** | « Design system respecté + WCAG AA + light/dark + mobile ? » |
| G4    | QA                           | « Tout est vert ? »                                          |
| G5    | Security                     | « Rien de rouge côté sécurité/données ? »                    |
| G6    | DBA                          | « La migration est testée sur le dev ? »                     |
| G7    | Doc                          | « Code et docs disent la même chose ? »                      |
| G8    | UX + Nicolas                 | « Parcours validé + sign-off mobile de Nicolas ? »           |
| G9    | Intégration                  | « Staging est stable ? »                                     |
| G10   | Release Manager              | « Nicolas a dit OK pour la prod ? »                          |
| G11   | Observabilité                | « La prod est saine 1 h après ? »                            |
