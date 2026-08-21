# Chantier qualité code & docs — plan phasé, traçable et exhaustif

> Objectif : **améliorer l'état actuel sans casser l'existant.** Sur un code en
> prod, un refactor global à l'aveugle est dangereux. On procède par **lots petits
> et vérifiables**, du plus sûr au plus risqué, chaque lot passant par les portes
> du pipeline (`PIPELINE_DEV.md`) et ne partant en prod que groupé et validé (G9).

## Cap : une base stable qu'on baptisera V1

Ce chantier est **le focus principal des prochains jours** (décision Nicolas,
2026-08-19). Son but : repartir sur une **base saine** — zéro code mort, zéro
commentaire périmé, zéro dette évidente, docs cohérentes, composants lisibles —
pour éviter les erreurs et la dette futures. **Quand tous les registres sont
complets et la base assainie, on figera cet état comme V1** (renumérotation +
tag + release notes « V1 »). V1 n'est pas une nouvelle feature : c'est la
**consécration d'une base propre**.

## Garantie de couverture (« fichier par fichier, doc par doc, commentaire par commentaire »)

La question n'est pas « est-ce qu'on regarde tout ? » mais « comment le **prouver** ? ».
Réponse : le repo est découpé en **zones**, chaque zone a un **registre** listant ses
items, et **un lot n'est clôturé que quand chaque item de son registre a un verdict**
(OK tel quel / corrigé / archivé / ticketisé). Rien n'est « oublié » : c'est écrit.

| Zone                               | Volume           | Registre                                       | Lot         |
| ---------------------------------- | ---------------- | ---------------------------------------------- | ----------- |
| `docs/`                            | 142 fichiers     | **Registre A**                                 | Lot 1       |
| Commentaires `src/` (TODO + stale) | 49 TODO + sweeps | **Registre C**                                 | Lot 2       |
| Code mort (`knip`)                 | à mesurer        | **Registre D**                                 | Lot 3       |
| Composants > 200 lignes            | 20               | **Registre B**                                 | Lot 4+      |
| `src/` fichier par fichier         | 326              | passage lors des lots ci-dessus + revue finale | transversal |

**Comment on passe sur CHAQUE commentaire** (le point le plus fin) : trois filets
superposés — (1) revue du fichier quand il est touché par un lot ; (2) **sweeps grep
ciblés** sur les motifs connus de commentaire périmé (`TODO [BACKEND]`, `mock`,
`Phase 2`, `beta`, `pour la beta`, `provisoire`, dates passées) ; (3) revue finale
par dossier avant clôture du chantier.

## État mesuré (2026-08-19)

| Métrique                      | Valeur                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Fichiers TS/TSX (`src/`)      | 326 (~67 500 LOC)                                                                             |
| Composants/pages > 200 lignes | **20** (max AdminBeta 1671, AdminModeration 1453, ContributeInstantPanel 1252, FeedPost 1233) |
| TODO / FIXME / HACK           | 49 (dont **beaucoup d'obsolètes** ère mock-data)                                              |
| Docs `.md`                    | 142 (dont 71 release notes, 12 PRD)                                                           |

## Règles du chantier (non négociables)

1. **Un lot = une PR sur `develop`**, buildé + testé (G3) + validé, avant le lot suivant.
2. **On ne change JAMAIS le comportement** lors d'un refactor : tests verts avant/après.
3. **Petits diffs** : 10 PR de 200 lignes valent mieux qu'1 PR de 2000.
4. Prod uniquement en fin de grappe cohérente (G9), avec release notes + OK Nicolas.
5. Chaque lot **remplit son registre** (verdict par item) : c'est la preuve de couverture.

---

## Lot 0 — Nettoyage beta (AdminBeta) — FAIT sur `develop`

Détail complet : `PLAN_DEMANTELEMENT_BETA.md`. Retrait d'AdminBeta (1671 l., inutilisé)
et de 3 fonctions `betaService` orphelines. Gate + flag `OPEN_ACCESS_ENABLED`
**conservés** (interrupteur réversible, décision Nicolas). Risque faible, zéro impact
utilisateur. Build/lint/test (148/148)/knip verts. À grouper dans la prochaine release (G9).

---

## Lot 1 — Docs (RISQUE NUL) — Registre A

- [ ] **Corriger les docs qui décrivent un état FAUX** (priorité) : ex. `environments.md`
      dont le corps décrit encore l'ancien modèle « dev = base prod » sous un bandeau
      qui dit l'inverse -> rendre le doc cohérent de bout en bout.
- [ ] **Archiver l'historique** : release notes V0.0.x -> V0.7.x et V1.0.x -> V1.2.x
      dans `docs/devops/releases/archive/`. Garder V0.8.x visibles.
- [ ] **Archiver la planification terminée** : `PRELANCEMENT_KICKOFF.md`,
      `PRELANCEMENT_HANDOFF_OUVERTURE.md`, `email-templates/*-prelaunch-*` -> `docs/_archive/`.
- [ ] **Mettre à jour** `docs/README.md` (index) + `PROJECT_MASTER.md` (version V0.8.2,
      pointer PIPELINE + environnements).
- [ ] **Registre A** : les 142 docs avec un verdict chacun (garder / corriger / archiver).

**Livrable** : arborescence docs claire, zéro doc trompeuse, index à jour, registre rempli.

---

## Lot 2 — Commentaires (RISQUE FAIBLE) — Registre C

Les commentaires doivent décrire le code ACTUEL. Constat : beaucoup de `TODO [BACKEND]`
datent de l'ère mock-data et sont **faits** aujourd'hui (post créé, upload Storage,
DELETE post, follows, stats… tournent en prod). Catégorisation des 49 :

- **(a) Obsolètes « backend déjà branché »** -> à SUPPRIMER (ex. `ContributeInstantForm`,
  `MediaUploader`, `DeleteConfirmModal`, `PostOptionsMenu` delete, `ProfileFeed`,
  `profileService.follows`, `FeedPost:56/1147`). Vérifier chaque fois que la fonctionnalité
  existe bien avant de retirer le TODO.
- **(b) Réels / encore valides** -> à GARDER ou ticketiser (ex. OAuth non branché dans
  `AuthContext` l.829/840, `banned_usernames` table, sync `profiles.preferences`).
- **(c) Refs historiques** (`T-0xx MASTER_TODO`, `BATCH nn`, `second-agent/…`) ->
  décider : garder comme trace ou nettoyer (ces docs existent-ils encore ?).
- [ ] Sweeps grep : `mock`, `provisoire`, `pour la beta`, `Phase 2/3`, dates passées.
- [ ] En-têtes de fichiers + JSDoc des exports vérifiés dossier par dossier.
- [ ] **Registre C** : 49 TODO + trouvailles des sweeps, verdict chacun.

**Livrable** : commentaires fiables, TODO obsolètes supprimés, vrais TODO tracés.

---

## Lot 3 — Code mort & optimisation (RISQUE FAIBLE) — Registre D

- [ ] `npm run check:dead-code` (knip) : exports/fichiers inutilisés -> registre D,
      suppression **après vérif** (pas d'import dynamique / de test qui l'utilise).
- [ ] Types legacy de `src/types/database.ts` remplacés par `supabase.ts` : trier.
- [ ] Aucun `console.log` de debug oublié (`src/`).
- [ ] Micro-optim éco-conception constatées au passage (budgets JS/LCP, images) sans
      sur-ingénierie.

**Livrable** : 0 code mort avéré, budgets tenus, registre D rempli.

---

## Lot 4+ — Factorisation ciblée (RISQUE MOYEN) — Registre B — un composant par PR

Les 20 composants > 200 lignes. **PAS de sweep global.** Un par un, chacun via le
pipeline complet (build + tests + preview mobile/desktop). On découpe **seulement si
ça améliore vraiment** la lisibilité (un dashboard admin ou un formulaire multi-étapes
peut rester gros légitimement). Ordre proposé (valeur haute, risque maîtrisé d'abord) :

1. `components/home/FeedPost.tsx` (1233) — cœur du feed -> extraire chips espèce, barre
   d'actions, bloc média ; au passage résoudre ses 3 TODO (dont le refactor l.56).
2. `components/contribute/EncounterStep2.tsx` (1025).
3. `components/home/FeedSection.tsx` (863) / `settings/SettingsPanel.tsx` (913).
4. Écrans Admin (AdminModeration 1453, AdminUsers, AdminAnalytics) — **en dernier**
   (gros mais peu exposés, risque/valeur faible). AdminBeta déjà retiré au Lot 0.

- [ ] **Registre B** : 20 composants, verdict chacun (découpé / laissé tel quel + raison).

**Livrable** : composants clés sous le seuil quand pertinent, **zéro régression**.

---

## Lot 5 — Migrations (RISQUE MOYEN, optionnel) — chantier dédié

Renommer les 143 migrations en `YYYYMMDDHHMMSS` + réparer l'historique prod (cause NG-007).
Le runner de rebuild couvre déjà le besoin quotidien -> **non urgent**.

---

## Séquencement recommandé

Lot 0 (en cours) -> Lot 1 -> Lot 2 -> Lot 3 (sûrs, grosse valeur de clarté), groupés
en 1-2 releases. Puis Lot 4 **étalé** (un composant par PR, au rythme des features).
Lot 5 seulement si on réactive la CLI Supabase.

À chaque lot : **registre rempli** + suivi remis à Nicolas (modèle `PIPELINE_DEV.md`).
La clôture du chantier = tous les registres A/B/C/D complets.

---

## Definition of Done (condition pour figer V1)

Le chantier est « terminé » et la base éligible au tag V1 quand **tout** est vrai :

- [ ] Registres A (docs), B (composants), C (commentaires), D (code mort) **complets**
      (chaque item a un verdict).
- [ ] `npm run build` + `npm test` + `eslint` + `knip` **verts**, `npm audit` = 0.
- [ ] Aucun `TODO [BACKEND]` obsolète ; les vrais TODO restants sont **ticketisés** (Notion).
- [ ] Docs cohérentes avec le code livré ; index (`docs/README.md`) + `PROJECT_MASTER.md`
      à jour ; historique archivé.
- [ ] Aucun composant > 200 lignes **sans justification écrite** (registre B).
- [ ] Preview develop + staging stables, prod saine (Sentry calme).
- [ ] Décision Nicolas de figer -> release « V1 » (renumérotation + tag + release notes).

## Reprise / état d'avancement (à tenir à jour à chaque session)

> Ce chantier s'étale sur plusieurs jours. **On reprend ici** au début de chaque session.

| Lot                                 | État                                   | Note                                                                                                                                             |
| ----------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lot 0 — Beta (AdminBeta)            | **FAIT** `07116fd`/`88a3678`           | AdminBeta retiré (~1900 l.), gate + flag conservés.                                                                                              |
| Lot 1 — Docs (Registre A)           | **FAIT** `084cc55`                     | 70 docs archivées ; environments/PROJECT_MASTER/CLAUDE/index corrigés.                                                                           |
| Lot 2 — Commentaires (Registre C)   | **FAIT** `c7dee9e`/`cbbb032`/`64dd5e1` | 16 TODO/specs obsolètes retirés (prouvés) ; vrais TODO gardés.                                                                                   |
| Lot 3 — Code mort (Registre D)      | **FAIT** `57408d8`                     | 7 fichiers morts supprimés (cluster location) ; design system gardé.                                                                             |
| Lot 4+ — Factorisation (Registre B) | **SUBSTANTIELLEMENT FAIT**             | FeedPost 1232→913, FeedSection 861→640, EncounterStep2 1025→260 (+ SpeciesSearchBar sorti). +36 tests. Gros restants documentés comme légitimes. |
| Lot 5 — Migrations                  | optionnel                              | non urgent.                                                                                                                                      |

**Bilan : Lots 0-3 FAITS + Lot 4 substantiellement fait. ~21 commits sur `develop`,
PAS en prod.** Vérif de clôture verte : build · tests **184** · eslint 0 err · knip 0 mort ·
npm audit 0 vuln · arbre propre.

**Conformité dev corrigée (2026-08-19)** : le dev local pointait par erreur sur la prod
(`.env.local`), et le dev manquait les GRANTs + reload PostgREST après rebuild. Corrigé +
durci dans `SUPABASE_DEV_PARITY_RUNBOOK.md`. Schéma dev = prod (40 tables, 6 vues, ~848 fn).

**Prochaine action** : validation visuelle en dev par Nicolas, puis **préparer la release
groupée des Lots 0-4 vers la prod** (2 release notes + OK Nicolas, G9). Restes optionnels
(non requis V1) : barre d'actions FeedPost, découpage interne éventuel de gros composants.
