# Consignes de style : Claude Code et Claude (phase de lancement)

> Ticket NG-026. Objectif : que les contenus produits (code, docs, Notion, légal,
> communication) ne portent aucun marqueur typique de génération par IA.
> Lu par Claude Code au démarrage de chaque session.

## Règle absolue : pas de tiret cadratin

INTERDIT : le tiret cadratin (caractère em dash) et le tiret demi-cadratin (en dash),
partout : code, commentaires, JSDoc, chaînes UI, messages d'erreur, messages de commit,
docs, titres Notion, réponses dans le chat.

Le tiret cadratin est un marqueur fort de contenu généré par IA, immédiatement
reconnaissable par les outils de détection et par tout lecteur averti.

### Remplacement selon le contexte

| Usage                           | Remplacer par            |
| ------------------------------- | ------------------------ |
| Précision (Titre, sous-titre)   | deux-points `:`          |
| Liste de deux ou trois éléments | virgule `,` ou `et`      |
| Renvoi ou référence superflue   | rien (supprimer)         |
| Incise dans une phrase          | virgules, ou parenthèses |

Exemples de conversion : un séparateur entre un titre et son sous-titre devient
`Titre : Sous-titre` ; une énumération devient `X, Y et Z` ; un renvoi superflu
disparaît et donne `Voir NG-003`.

Si on trouve un tiret cadratin existant dans le code ou la doc, le corriger au passage.

## Autres marqueurs IA à éviter

- Gras utilisé à outrance dans les titres et le corps de texte.
- Listes à puces imbriquées sur trois niveaux ou plus.
- Phrases d'amorce vides : "Il convient de noter que", "Il est important de".
- Transitions formelles plaquées : "Dans ce contexte", "Par ailleurs".
- Répétition systématique du nom du projet en début de phrase.
- Majuscule à chaque mot dans les titres (style anglophone).

## Ton attendu

Direct, humain, simple. On écrit comme un développeur qui parle à un autre humain,
pas comme un rapport. Phrases courtes quand c'est possible. On commente le pourquoi,
pas le quoi.

## Voir aussi

- `CLAUDE.md` : règle permanente sur le tiret cadratin (origine de cette consigne).
- `docs/devops/VERSIONING.md` : convention de messages de commit (Conventional Commits).
