---
name: pipeline-dev
description: >
  Pipeline de dev Naturegraph G0 -> G11 : portes de validation sequentielles, un
  ROLE par porte (PM, Dev, Refactor, Product Designer, QA, Security, DBA, Doc, UX,
  Integration, Release Manager, Observabilite). A utiliser pour CHAQUE tache
  (feature, fix, refactor, migration), du cadrage a la prod. Trigger : "nouvelle
  tache", "developper", "feature", "fix", "on avance", "process dev", "les portes",
  "design", "accessibilite", "G0/G1...". Complete docs/devops/PIPELINE_DEV.md et le
  skill release-prod (G10).
---

# Pipeline de dev Naturegraph : G0 -> G11 (une porte, un role)

Norme officielle. **Chaque tache** traverse les portes **dans l'ordre**. On ne
passe a la suivante que si la precedente est **GO**. Une porte **NO-GO** renvoie a
la porte concernee, jamais en avant. On tient le **tracker de suivi** (bas de page)
et on le remet a Nicolas.

Flux : **on developpe sur `develop` (base DEV), jamais sur la prod.**
`develop -> staging -> main`. La prod = derniere porte uniquement.

> Reference exhaustive : `docs/devops/PIPELINE_DEV.md`. Ici = version actionnable.
> La release (G9/G10) suit le skill **release-prod** (squash, audit residus, rollback).
> Checklists eco-conception/a11y detaillees : `GUIDELINES.md`.

## Comment jouer les roles

A chaque porte, adopter la **lentille du role** : on ne code pas en pensant "PM",
on ne juge pas le design en pensant "Dev". Enoncer le verdict (GO / NO-GO / N/A)
avant de continuer. Pour une reponse produit, garder la revue multi-roles
(PM -> UX -> Dev -> UI -> Lead Product Designer).

---

## G0 · Cadrage — PM · « Qu'est-ce qu'on livre exactement ? »

- Besoin reformule en 1-2 phrases + **criteres d'acceptation** ecrits.
- Perimetre : front / back / DB / chemin rendu-loader-auth (ce dernier = vigilance mobile G8).
- Touche-t-on au **schema** ? si oui -> G6 obligatoire.
- Decoupage ; **hors perimetre** note.
- **GO** : perimetre + criteres clairs. Sinon -> poser les questions a Nicolas.

## G1 · Implementation — Dev · « Ca marche ? »

- TS strict (pas de `any`), composants < 200 lignes, tokens `var(--color-*)`
  (jamais de couleur en dur), i18n FR/EN, HTML semantique + aria.
- Commentaires du **pourquoi**. Pas de tiret cadratin/demi-cadratin.
- La feature marche en local (`npm run dev`).
- **GO** : le comportement attendu marche localement.

## G2 · Optimisation & factorisation — Refactor/Perf · « Propre, simple, sobre ? »

- DRY, helpers extraits ; zero code mort / import inutilise / console.log oublie.
- Pas d'over-engineering.
- Eco-conception (perf) : JS < 300 KB gzip, page < 500 KB, LCP < 2,5 s ; images WebP/AVIF + lazy + dimensions ; CSS plutot que JS.
- Pas de dependance JS ajoutee sans justification.
- **GO** : code propre, budgets respectes.

## G3 · Design System & Accessibilite — Product Designer (UX/UI) · « Design respecte + WCAG AA ? »

Le **garant du design et de l'accessibilite**. Audit expert de la feature rendue
(preview dev en marche), au-dela du markup.

- **Design system** : tokens `var(--color-*)` partout (zero couleur en dur) ; typo
  Quicksand (titres) + Mulish (corps) ; espacements/rayons coherents ; **reutilisation
  des composants `src/components/ui/`** (pas de re-creation) ; parite Figma.
- **WCAG AA** : contraste >= 4,5:1 (texte) / >= 3:1 (UI+grand texte) ; **clavier complet**
  - ordre logique ; **focus visible** ; cibles >= 44px ; semantique + aria/roles justes ;
    `alt` ; labels de formulaire ; `aria-live` (toasts/chargements) ; `prefers-reduced-motion` ;
    `lang` + skip link.
- **Responsive & themes** : mobile ET desktop ; **light ET dark** coherents (tokens) ;
  zero debordement horizontal ; safe-areas mobile.
- **Eco-design** : pas d'animation superflue ; sobriete ; images dimensionnees + lazy.
- **Etats** : vide, chargement (skeleton), erreur, succes couverts.
- **GO** : conforme DS + WCAG AA, coherent light/dark et mobile/desktop. **NO-GO** -> retour G1.

## G4 · Qualite — QA · « Tout est vert ? »

- `npm run build` OK · `npm test` 100 % · `npx eslint .` 0 erreur · typecheck OK.
- **GO** : build + tests + lint verts. **NO-GO** -> retour G1/G2.

## G5 · Securite & donnees — Security · « Rien de rouge ? »

- Nouvelle table -> **RLS + policies** ; RPC `SECURITY DEFINER` volontaire et scopee (gaffe a `anon`).
- Aucun secret dans le code / bundle / commits.
- `maxLength` front **et** service ; erreurs assainies (`sanitizeError`) ; anti-abus si formulaire public.
- Aucune vraie donnee utilisateur en dev/test (mock only).
- `npm audit` : **0 vulnerabilite**.
- **GO** : rien de rouge cote securite.

## G6 · Base de donnees — DBA · « Migration testee sur le dev ? » (si schema)

- Migration via `npm run migration:new -- "desc"` (horodatee unique, idempotente).
- Appliquee et **testee sur le DEV d'abord** (MCP `supabase-dev` / runner), jamais direct prod.
- `docs/backend/database-architecture.md` + `schema.sql` a jour ; types Supabase regeneres si besoin.
- **GO** : migration testee dev, docs alignees. **Application prod = G10.** Sinon **N/A**.

## G7 · Docs & commentaires — Doc · « Code et docs disent la meme chose ? »

- Commentaires « pourquoi » a jour ; JSDoc sur exports ; en-tete des nouveaux fichiers.
- Docs impactees a jour : `PROJECT_MASTER.md`, `CLAUDE.md`, `environments.md`, PRD/runbooks.
- Versions/decisions coherentes (dates en absolu).
- **GO** : docs coherentes avec le code livre.

## G8 · Preview & validation UX — UX + Nicolas · « Parcours valide + sign-off mobile ? »

La conformite design/a11y est deja auditee (G3) ; ici = **experience produit** + **sign-off humain**.

- Preview develop (base DEV) ouverte ; **console sans erreur**.
- Parcours produit de bout en bout (le scenario reel de l'utilisateur).
- **REGLE PERMANENTE** : si la tache touche **rendu / loader / splash / auth / session**
  -> **validation de Nicolas sur son mobile reel AVANT prod**. Doute -> rollback d'abord.
- **GO** : Nicolas valide (obligatoire pour le chemin de rendu ; recommande sinon).

## G9 · Integration staging — Integration · « Staging stable ? »

- Realigner `staging` sur le perimetre de release ; preview staging (base DEV) stable.
- Tests en conditions reelles ; iterations UX/fixes si besoin (retour G1).
- **GO** : staging stable, pret pour la release.

## G10 · Release en prod — Release Manager · « Nicolas a dit OK ? »

> **Executer via le skill `release-prod`** (exclusion dev-only, audit residus, squash, rollback).

- **Jamais de push prod systematique** : grouper plusieurs changements coherents.
- 2 release notes **soumises a Nicolas** (date, heure, force-logout ?, notif ?).
- **OK explicite de Nicolas** obtenu.
- Version bumpee + note dans `docs/devops/releases/`.
- PR `staging -> main` ; **CI verte** (Lint/Test/Build, CodeQL, Vercel) ; **merge SQUASH** (jamais `--admin`, jamais fast-forward).
- **Migrations appliquees sur la PROD** (validees en G6) ; **back-merge `main -> develop`** ; tag `vX.Y.Z`.
- Notif in-app / force-logout uniquement si valides par Nicolas.
- **GO** : prod deployee sur `naturegraph.ca`.

## G11 · Suivi post-prod — Observabilite · « Prod saine 1 h apres ? »

- `naturegraph.ca` repond 200 ; bundle prod = base **prod** (`hrxg…`, jamais `nkgd…`).
- Surveillance **Sentry + erreurs runtime Vercel 30-60 min** (aucune nouvelle issue).
- Advisors Supabase **inchanges** (pas de regression vs avant release).
- Suivi consigne + **cloture**.
- **GO** : prod saine -> tache close.

---

## Tracker de SUIVI (a remplir et remettre a Nicolas)

```
TACHE : <titre>            VERSION CIBLE : vX.Y.Z
─────────────────────────────────────────────────
G0  Cadrage        [ GO / NO-GO ]  <note>
G1  Implementation [ GO / NO-GO ]  <note>
G2  Optim/Factor   [ GO / NO-GO ]  <note>
G3  Design/A11y    [ GO / NO-GO ]  DS : … · WCAG AA : … · light+dark : …
G4  Qualite        [ GO / NO-GO ]  build/test/lint : …
G5  Securite       [ GO / NO-GO ]  npm audit : … · RLS : …
G6  DB (migration) [ GO / N/A   ]  <fichier> teste dev : …
G7  Docs           [ GO / NO-GO ]  docs maj : …
G8  Preview/UX     [ GO / NO-GO ]  parcours : … · Nicolas mobile : …
G9  Staging        [ GO / NO-GO ]  <note>
G10 Release prod   [ GO / EN ATTENTE VALIDATION ]  release notes : … · CI : …
G11 Suivi prod     [ GO / NO-GO ]  Sentry/Vercel : … · advisors inchanges : … · bundle = hrxg : …
─────────────────────────────────────────────────
RESTE / RISQUES : <points ouverts>
```

## Regles d'or (rappel)

- On developpe sur **develop/base DEV**, jamais sur la prod.
- Une porte **NO-GO** ne se contourne pas : on revient a la porte concernee.
- **G3 (Product Designer)** est le proprietaire du design + accessibilite : ni le Dev
  ni la QA ne "passent vite" dessus.
- **G10 ne demarre jamais sans le OK explicite de Nicolas.**
- Chemin rendu/loader/auth = **validation mobile reelle de Nicolas** obligatoire (G8).
