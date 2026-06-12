# Etat du projet - Dev vs Prod (doc de suivi)

> Derniere mise a jour : 2026-06-11 (fin de session). Document de reprise rapide :
> ou en est la prod, ou en est le dev, et comment reprendre. A actualiser a
> chaque grande etape.

---

## 1. Versions & environnements

| Env                    | Branche              | URL                  | Supabase                                    | Etat                      |
| ---------------------- | -------------------- | -------------------- | ------------------------------------------- | ------------------------- |
| **PROD** (public)      | `main`               | naturegraph.ca / www | `naturegraph-prod` (`hrxgduvworofnrjmgpcj`) | **V1.2.11**, stable       |
| **STAGING** (testeurs) | `staging`            | beta.naturegraph.ca  | `naturegraph-dev`                           | = main                    |
| **DEV / previews**     | `develop` + features | \*.vercel.app        | `naturegraph-dev` (`nkgdgxwejqqnqmwqwegy`)  | = main + travaux en cours |

- Flux : `develop -> staging -> main` (PR squash, admin), tag `vX.Y.Z`, puis sync
  staging (FF) + develop (`merge -s ours` + `read-tree --reset origin/main`).
- **main = staging = develop** en contenu (verifie 2026-06-11).
- Rollback prod : re-promote le deploiement Vercel de la version precedente.

---

## 2. Ce qui est LIVE en prod (V1.2.11)

Socle de base volontairement epure pour que les beta-testeurs approfondissent
l'existant (decision Nicolas 2026-06-11) :

- **Rencontre nature = MONO-espece** (1 espece max ; la recherche se masque apres
  la 1re espece, sans encart). **Instant nature**. Pas de carnets.
- **Carnets d'observations MASQUES** sur naturegraph.ca via feature flag
  (`src/lib/featureFlags.ts`, `NOTEBOOKS_ENABLED`, base sur le hostname). NON
  destructif : la table `observation_notebooks` + les posts-carnets existants
  restent en base (affiches en posts standards) et reapparaitraient si on
  reactive. Visibles en dev/staging/preview.
- **Securite durcie** (retours testeur naelm_photo, NG-040) : validation contenu
  (titre 160, post vide bloque), erreurs jamais techniques (`src/lib/sanitizeError.ts`),
  CSP `api-adresse.data.gouv.fr`, maxLength partout. Modules `postValidation.ts`
  - `sanitizeError.ts` + tests.
- **Sentry** actif en prod (SDK reellement bundle depuis V1.2.2). Region UE,
  sans PII. Mention sous-traitant dans la politique de confidentialite (Loi 25).
- **Deps a jour** : 0 alerte Dependabot, `npm audit` 0 vuln (V1.2.7).
- Carnet fiable apres veille mobile (token refresh, V1.2.2).

### Releases du 2026-06-11

V1.2.2 (carnet veille + Sentry) -> V1.2.3 (securite titre/vide/CSP) -> V1.2.4
(audit securite partout) -> V1.2.5 (carnet feed) -> V1.2.6 (post vide reellement
bloque) -> V1.2.7 (cleanup deps, 6 alertes react-router) -> V1.2.8/V1.2.9
(carnets masques + flag robuste) -> V1.2.10/V1.2.11 (mono-espece, retrait encart).

---

## 3. Ce qui est EN COURS en dev (mis en pause 2026-06-11)

### NG-039 - Aide a l'identification (V1.3.0, dev only)

- **Branche** : `feat/ng-039-identification` (a jour avec develop + le flag).
- **Socle DB FAIT + applique sur `naturegraph-dev`** (migration
  `20260611_ng039_identification_help`) : table `identification_votes`
  (1 vote/user, UNIQUE) + trigger `votes_up`, `posts.identification_help` +
  `identification_confidence` (1..4), `identification_proposals.is_undetermined`,
  RLS complet, vue `posts_public` MAJ, fonction trigger non exposee en RPC.
  Types officiels regeneres.
- **Service FAIT** : `identificationService` (proposeOrVote, voteProposal,
  removeVote, toggleVote, proposeUndetermined, listProposalsWithVotes).
- **Flag** : `IDENTIFICATION_HELP_ENABLED` (dev only).
- **RESTE = UI** (testable contre dev) : contribution Cas 1/2 + confiance,
  affichage distinctif feed, panneau propositions/votes. Plan detaille dans le
  ticket Notion NG-039.
- **Avant un futur passage prod** : appliquer la meme migration sur
  `naturegraph-prod` (pas urgent, feature gated dev-only).

### NG-041 - Commentaires sur les publications (V1.3.0, dev only)

- **Pas commence.** Ticket Notion cree (NG-041).
- **Table `comments` EXISTE deja** en DB (id, post_id, user_id, content,
  created_at, updated_at = commentaires PLATS) + `posts.comments_count` + type
  notif `comment`. **Aucun front** (pas de service, pas d'UI).
- A faire : verifier RLS + trigger compteur, `commentService`, UI section
  commentaires, compteur, notif auteur, moderation (reutiliser signalement),
  securite d'emblee, flag dev-only.

### Branches git ouvertes

- `feat/ng-039-identification` : socle identification (a garder, reprise future).
- `feat/ng-037-v1.2.2-cleanup` : suppression de 8 fichiers dead-code (knip), jamais
  merge. Sans risque. A merger ou supprimer quand on veut.

---

## 4. En attente cote Nicolas (non bloquant)

- **Sentry** : finir la config du compte (renommer le projet en `naturegraph`,
  creer une alerte e-mail). Pas d'acces programmatique cote agent.
- **Post-test vide** publie en prod (un ancien test) : a supprimer via le menu du
  post si souhaite.
- Decision eventuelle : suppression destructive des donnees carnet en prod (a ce
  jour seulement masquees, reversibles).

---

## 5. Conventions / rappels

- **Securite des le depart** sur toute nouvelle grosse feature (maxLength
  front+service, RLS, erreurs assainies via `sanitizeError`, CSP, tests).
- **Feature flag "labs"** (`src/lib/featureFlags.ts`) pour garder une feature en
  dev mais cachee en prod (hostname-based, reversible, non destructif).
- Types Supabase generes (`src/types/supabase.ts`) : ne pas editer a la main,
  regenerer via le connecteur dev apres migration.
- Migrations : appliquer sur le BON projet (dev = nkgd..., prod = hrxg...).
- Pas de em-dash / en-dash nulle part (regle permanente).
