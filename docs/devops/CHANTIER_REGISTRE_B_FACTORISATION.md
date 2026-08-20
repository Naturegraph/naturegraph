# Registre B — Factorisation des composants > 200 lignes (Lot 4)

> Un composant par PR, **zéro changement de comportement** (tests verts avant/après,
> preview mobile/desktop). On découpe seulement si ça améliore vraiment la lisibilité.
> Mis à jour 2026-08-19.

## Cibles (composants > 200 lignes, ordre valeur/risque)

| #   | Composant                                          | LOC initial | État                             |
| --- | -------------------------------------------------- | ----------- | -------------------------------- |
| 1   | `components/home/FeedPost.tsx`                     | 1232        | **EN COURS** (pas 1 fait)        |
| 2   | `components/contribute/EncounterStep2.tsx`         | 1025        | à faire                          |
| 3   | `components/home/FeedSection.tsx`                  | 863         | à faire                          |
| 4   | `components/settings/SettingsPanel.tsx`            | 913         | à faire                          |
| 5   | `pages/Admin/AdminModeration.tsx`                  | 1453        | à faire (en dernier, peu exposé) |
| 6   | `components/contribute/ContributeInstantPanel.tsx` | 1252        | à faire                          |
| …   | (autres > 200 l.)                                  |             | à faire                          |

> AdminBeta (1671, était le plus gros) a été **supprimé** au Lot 0 (mort), pas factorisé.

## FeedPost.tsx — décomposition (en cours)

Approche : sortir d'abord les données pures (risque nul), puis les blocs JSX
présentationnels un par un (avec preview).

- [x] **Pas 1 — Config extraite** (`feedPostConfig.ts`) : REACTION_CONFIG, emojis
      météo/habitat/phénomène, POST_TYPE_ICON, classes de chips. Import de `NotifItem`
      repointé. Import lucide `Bird`/`MountainSnow` orphelins retirés. **1232 → 1131 l.**
      Build + lint + tests (148/148) verts. Zéro changement de comportement.
- [ ] **Pas 2 — Chips espèce** (les 3 cas catégorie/espèce) -> `FeedPostSpeciesChips.tsx`.
      Nécessite preview (rendu visuel des chips + filtres).
- [ ] **Pas 3 — Barre d'actions** (réagir / échanges / sauvegarder / partager) ->
      `FeedPostActions.tsx`.
- [ ] **Pas 4 — Bloc média / galerie** -> sous-composant dédié.
- [ ] Résoudre le `TODO` de refactor l.56 (accepter `PostFeedItem` directement) si pertinent.

Note : certains blocs partagent beaucoup d'état (échanges, expand, reactions, saved).
On extrait par **props explicites**, sans changer la logique. Chaque pas = build + tests

- preview avant de committer.

## Principe (rappel)

Ne pas éclater pour éclater : un composant légitimement gros (dashboard admin,
formulaire multi-étapes) peut le rester si le découpage n'améliore pas la lisibilité.
Le but est la **clarté**, pas un chiffre sous 200.
