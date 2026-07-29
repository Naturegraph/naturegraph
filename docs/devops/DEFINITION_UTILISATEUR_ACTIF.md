# Definition officielle de l'utilisateur actif

> Decision Nicolas 2026-07-21, dans le cadre de NG-035.
> Source de verite unique. Toute mesure d'utilisateurs actifs, ou qu'elle soit,
> doit appliquer cette definition.

## La regle

Un utilisateur est **actif** s'il remplit **au moins une** de ces deux
conditions :

1. **Session recente** : `profiles.last_active_at` de moins de 7 jours.
2. **Publication recente** : au moins une observation publiee de moins de 30 jours.

Les **comptes internes** (`is_internal = true`) sont toujours exclus.

## Pourquoi ce OU, et ces fenetres

- La condition de session capture les gens qui **reviennent consulter sans
  publier**. Sur une plateforme naturaliste, beaucoup observent le fil sans
  poster chaque semaine : les ignorer sous-estimerait l'engagement reel.
- La condition de publication, plus large (30 jours), rattrape un contributeur
  regulier qui n'a pas ouvert l'app cette semaine precise mais reste engage.
- `last_active_at` (heartbeat, mis a jour pendant l'usage) est le bon signal de
  session, pas `last_login_at` : les sessions OTP persistent, une personne peut
  utiliser l'app des jours sans nouvelle connexion.

## Reperes chiffres (2026-07-21)

Sur 122 comptes non internes en production :

- **22 actifs** selon cette definition.
- 21 via session 7j, 11 via publication 30j.
- **11** actifs uniquement par la session, invisibles pour l'ancienne mesure
  "publieurs 7j". C'est exactement la population que cette definition rattrape.

## Ou elle est appliquee

- **Panneau admin** : `AdminAnalytics.tsx`, carte "Utilisateurs", champ
  `activeUsersOfficial`. La logique y est calculee cote client a partir de
  `last_active_at` et des publieurs 30j.
- **Plausible (NG-020)** : a appliquer quand l'analytics sera integre (pas
  encore fait a ce jour).
- **Metriques Notion** : a reporter par le fondateur dans la page Metriques du QG.

## A ne pas confondre

L'ancien indicateur "publieurs 7j" (`uniquePostersLast7d`) reste calcule et sert
au ratio "observations moyennes par actif". Ce n'est PAS la definition de
l'utilisateur actif : c'est une mesure de production, volontairement plus etroite.
