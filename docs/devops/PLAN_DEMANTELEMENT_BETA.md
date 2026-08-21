# Plan, nettoyage du système beta (code mort)

> **Statut : PLAN, non exécuté.** Aucune ligne de code ni prod touchée.
> Mis à jour le 2026-08-19 après vérification complète de l'état réel.

## 1. Réalité confirmée : l'app est DÉJÀ ouverte à tous

Preuve dans le code (pas une supposition) :

- `src/lib/featureFlags.ts:81` : `export const OPEN_ACCESS_ENABLED = true`
- `src/pages/AuthPage.tsx:38` : `BETA_GATE_ENABLED = !OPEN_ACCESS_ENABLED && …`
  -> vaut **toujours `false`** (même la variable d'env ne peut pas le réactiver).
- `src/components/guards/BetaAccessGuard.tsx` : **passe-plat** qui rend ses enfants
  sans condition (depuis NG-029, accès ouvert).
- `router.tsx` : `/welcome` (l'ancien écran de code) redirige déjà vers `/`.

**Conclusion : n'importe qui peut s'inscrire et se connecter librement, sans code
beta. C'est le cas depuis NG-029.** Il n'y a donc **AUCUNE décision produit à
prendre** : ouvrir l'app est déjà fait.

## 2. Ce que devient ce chantier

Puisque le gate est déjà neutralisé par un flag, tout le système beta n'est plus
que du **code mort**. Le retirer **ne change RIEN pour les utilisateurs** : c'est
du pur nettoyage (Phase 2 du chantier qualité), risque quasi nul.

**DÉCISION (Nicolas, 2026-08-19) : GARDER L'INTERRUPTEUR.**

On conserve le flag `OPEN_ACCESS_ENABLED` + toute la machinerie runtime du gate
(garde, écran de saisie, `validateBetaKey`, waitlist) pour pouvoir **re-fermer
l'accès un jour** en flippant le flag. On ne retire donc PAS le gate.

Conséquence : le nettoyage se concentre sur ce qui est **réellement inutile même
si on re-gate un jour** = **AdminBeta** (l'UI admin de génération de clés, 1671
lignes, inutilisée). Si on re-ferme l'accès plus tard, les rares clés se créent
en SQL (convenu avec Nicolas). Le reste de la machinerie beta reste en place.

## 3. Périmètre EXACT (vérifié fichier par fichier) — sous décision « garder l'interrupteur »

### À RETIRER maintenant (inutile même si on re-gate)

| Élément                                                                                     | Note                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/Admin/AdminBeta.tsx` (1671 l.)                                                       | UI admin inutilisée. Route `router.tsx` l.76 (import) + l.230 (usage)                                                                                                                  |
| `pages/Admin/AdminDashboard.tsx` ~l.358                                                     | carte lien `/admin/beta`                                                                                                                                                               |
| `services/betaService.ts` : `getBetaQuotaStatus`, `importPrelaunchEmails`, `sendBetaInvite` | fonctions **exclusivement** utilisées par AdminBeta (vérifié). Retirer aussi leurs types associés (`BetaQuotaStatus`, `PrelaunchImportResult`, `BetaInviteReason`, `BetaInviteResult`) |
| i18n : clés propres à l'écran AdminBeta (FR + EN)                                           | après coup, via `knip`/grep                                                                                                                                                            |

### À GARDER (machinerie du gate = l'interrupteur réversible)

- `lib/featureFlags.ts` : `OPEN_ACCESS_ENABLED` (le flag).
- `components/guards/BetaAccessGuard.tsx` + `BetaGatedLayout` (router).
- `components/auth/BetaKeyGate.tsx`, `hooks/useBetaAccess.ts`, les layouts beta.
- `pages/Waitlist.tsx` + route `/waitlist`, redirection `/welcome`.
- `services/betaService.ts` : `validateBetaKey`, `joinWaitlist`, `checkBetaAccessKey`
  (+ types associés) restent.
- Branches `BETA_GATE_ENABLED` dans `AuthPage.tsx` : **laissées telles quelles**
  (inertes tant que le flag est ouvert, réactivables sinon).
- `components/ui/BetaStatusCallout.tsx` : encadré **juridique** (Privacy/Legal),
  rien à voir avec l'accès. Garder.

> Note : rendre l'interrupteur _pleinement fonctionnel_ (aujourd'hui `BetaAccessGuard`
> est un passe-plat qui ne lit pas encore le flag) = une petite tâche séparée et
> optionnelle (câbler le garde sur `OPEN_ACCESS_ENABLED`). Hors périmètre de ce
> nettoyage, à décider plus tard.

## 4. Exécution (via le pipeline, ordre sûr)

Périmètre réduit = **AdminBeta uniquement**. Ne touche NI le chemin d'auth visiteur
NI le gate -> risque faible, pas de restructuration du router.

1. **G1** Retirer, dans l'ordre :
   - `router.tsx` : la route AdminBeta (import l.76 + objet route l.230).
   - `AdminDashboard.tsx` : la carte lien `/admin/beta`.
   - Supprimer le fichier `pages/Admin/AdminBeta.tsx`.
   - `betaService.ts` : retirer `getBetaQuotaStatus`, `importPrelaunchEmails`,
     `sendBetaInvite` + types associés. **Garder** `validateBetaKey`, `joinWaitlist`,
     `checkBetaAccessKey`.
   - i18n : retirer les clés propres à l'écran AdminBeta (FR + EN).
2. **G2/G3** `knip` (0 nouvel orphelin), `npm run build` + `npm test` (148/148) +
   `eslint` verts.
3. **G4** Confirmer qu'aucune autre route/admin ne dépendait d'AdminBeta ; gate +
   OTP intacts.
4. **G6** Docs : clôturer ce plan, retirer les refs à AdminBeta dans les docs admin.
5. **G7** Preview develop : l'espace admin s'ouvre sans la carte beta, le reste des
   pages admin fonctionne. (Chemin d'auth NON touché -> validation mobile non requise ;
   simple coup d'oeil admin.)
6. **G8/G9** staging -> release groupée avec le reste du chantier qualité, OK Nicolas.

## 5. Risques

- **Faible** : AdminBeta est une page admin isolée, derrière le garde admin, sans
  dépendant. On ne touche ni au gate, ni à l'auth, ni à la DB.
- Mitigation : `knip` + build + test + lint verts + preview de l'espace admin.

## 6. Ce dont j'ai besoin de toi

- Le feu vert pour exécuter ce retrait sur `develop` (prod = ton OK en G9 plus tard).
- Rien d'autre : code, tests, preview, docs sont de mon côté.
