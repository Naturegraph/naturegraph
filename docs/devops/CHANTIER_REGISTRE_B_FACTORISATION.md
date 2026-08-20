# Registre B — Factorisation des composants > 200 lignes (Lot 4)

> Un composant par PR, **zéro changement de comportement** (tests verts avant/après,
> preview mobile/desktop). On découpe seulement si ça améliore vraiment la lisibilité.
> Mis à jour 2026-08-19.

## Cibles (composants > 200 lignes, ordre valeur/risque)

| #   | Composant                                          | LOC initial | État                                            |
| --- | -------------------------------------------------- | ----------- | ----------------------------------------------- |
| 1   | `components/home/FeedPost.tsx`                     | 1232        | **EN COURS** (config+chips+méta, → 913 l.)      |
| 2   | `components/contribute/EncounterStep2.tsx`         | 1025        | **FAIT** (logique + SpeciesSearchBar, → 260 l.) |
| 3   | `components/home/FeedSection.tsx`                  | 863         | **EN COURS** (mapper extrait, → 640 l.)         |
| 4   | `components/settings/SettingsPanel.tsx`            | 913         | à faire                                         |
| 5   | `pages/Admin/AdminModeration.tsx`                  | 1453        | à faire (en dernier, peu exposé)                |
| 6   | `components/contribute/ContributeInstantPanel.tsx` | 1252        | à faire                                         |
| …   | (autres > 200 l.)                                  |             | à faire                                         |

> AdminBeta (1671, était le plus gros) a été **supprimé** au Lot 0 (mort), pas factorisé.

## FeedPost.tsx — décomposition (en cours)

Approche : sortir d'abord les données pures (risque nul), puis les blocs JSX
présentationnels un par un (avec preview).

- [x] **Pas 1 — Config extraite** (`feedPostConfig.ts`) : REACTION_CONFIG, emojis
      météo/habitat/phénomène, POST_TYPE_ICON, classes de chips. Import de `NotifItem`
      repointé. Import lucide `Bird`/`MountainSnow` orphelins retirés. **1232 → 1131 l.**
      Build + lint + tests (148/148) verts. Zéro changement de comportement.
- [x] **Pas 2 — Chips espèce** (les 3 cas catégorie/espèce). **1131 → 1007 l.**
      Logique de décision extraite en **fonction pure** `feedPostSpeciesChipsLogic.ts` + **9 tests** (`.test.ts`) qui verrouillent les 3 cas + la cliquabilité. Composant
      fin `FeedPostSpeciesChips.tsx` (JSX déplacé **verbatim**, a11y préservée). Build +
      tests (157) + lint verts.
- [x] **Pas 3 — Rangée méta** (habitat / météo / moment / nuages / phénomène). **1007 → 913 l.**
      Logique (ordre + présence + emoji + clé i18n) en fonction pure `feedPostMetaLogic.ts` + **9 tests**. Composant fin `FeedPostMeta.tsx` (JSX verbatim). Build + tests (166) + lint verts.
      _Pivot depuis « barre d'actions » : la méta colle au pattern (logique isolable), la barre est
      du câblage lourd peu testable -> reportée ci-dessous._
- [ ] **Barre d'actions** (réagir / échanges / sauvegarder / partager) : **reportée**. Câblage
      lourd (state picker/share, ~15 props), peu de logique pure à tester. À faire soit en
      déplaçant l'état picker/share DANS le sous-composant (verbatim, filet = build+types), soit
      après avoir écrit des tests d'interaction. Moins prioritaire que les blocs à logique isolable.
- [ ] **Bloc média / galerie**.
- [ ] Résoudre le `TODO` de refactor l.56 (accepter `PostFeedItem` directement) si pertinent.

### ✅ Pattern de sécurité trouvé (résout le blocage vérification)

FeedPost n'a pas de tests de rendu et son feed est derrière l'auth (post détail
« n'existe plus » en anon). Plutôt que refactorer du JSX à l'aveugle, on procède ainsi
pour **chaque** bloc :

1. **Extraire la logique de décision en fonction pure** (`*Logic.ts`) et la **tester**
   (style helpers NotifItem, sans providers). C'est la partie risquée -> filet permanent.
2. **Composant fin** qui rend le descripteur avec le **JSX déplacé verbatim** (pas de
   réécriture -> markup identique par construction ; TypeScript garantit les props).
3. Build + tests verts. La vérif **visuelle** finale reste à la charge de Nicolas en dev
   (nice-to-have), mais le risque est faible : logique testée + JSX non réécrit.

> ⚠️ Piège rencontré : sur Windows, `FeedPostSpeciesChips.tsx` et `feedPostSpeciesChips.ts`
> = même nom (casse) -> collision TS. Nommer la logique `*Logic.ts` pour éviter ça.

## FeedSection.tsx — décomposition (en cours)

- [x] **Adaptateur `postFeedItemToMockPost`** extrait vers `feedPostMapper.ts` (avec ses
      helpers purs getTaxonomicEmoji / derivePostFormat / getAuthorPreferenceEmoji /
      formatPostDate). **861 → 640 l.** Importeurs repointés (Profile, PostDetail).
      **11 tests** (`feedPostMapper.test.ts`) verrouillent une transformation critique
      (titre, confidentialité du lieu, phénomène, réactions, date d'obs) jusqu'ici NON testée.
      Build + tests (177) + lint verts.
- [ ] Suite FeedSection (tabs, filtres, scroll infini) : à évaluer (surtout du câblage +
      hooks ; découper seulement si un bloc à logique isolable ressort).

## EncounterStep2.tsx — décomposition (en cours)

- [x] **Logique du carnet d'espèces** extraite vers `encounterSpeciesLogic.ts` :
      `groupConfig`, `groupObservations` (groupement par groupe taxonomique + ordre),
      `TAXONOMIC_FILTERS`. **1025 → 971 l.** + **7 tests** (`encounterSpeciesLogic.test.ts`).
      Build + tests (184) + lint verts.
- [x] **`SpeciesSearchBar`** extrait dans `SpeciesSearchBar.tsx` (715 l., avec ses helpers
      exclusifs SpeciesCategoryIcon + CLASS*TO_GROUP). **Déplacement VERBATIM** vérifié par
      TypeScript (compile parfaitement), imports orphelins nettoyés dans EncounterStep2.
      **971 → 260 l.** (1025 → 260 depuis le début). Build + tests (184) + lint verts.
      \_SpeciesSearchBar reste gros (715 l.) mais c'est un composant de recherche
      légitimement complexe ; il vit désormais dans son propre fichier au lieu de gonfler
      l'étape 2. Découpage interne possible plus tard si un bloc à logique isolable ressort.*
- [ ] `ObservationRow` (sous-composant, ~70 l.) : petit, peut rester dans EncounterStep2.

## Principe (rappel)

Ne pas éclater pour éclater : un composant légitimement gros (dashboard admin,
formulaire multi-étapes) peut le rester si le découpage n'améliore pas la lisibilité.
Le but est la **clarté**, pas un chiffre sous 200.
