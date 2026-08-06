# Historique des notifications system in-app

> Journal manuel des communications officielles (`type = 'system'`) envoyees aux
> users. Process complet : `docs/devops/NOTIFICATIONS_SYSTEM.md`.

| Date       | Version | Type             | Titre                                   | Cible                                               | Resultat  |
| ---------- | ------- | ---------------- | --------------------------------------- | --------------------------------------------------- | --------- |
| 2026-05-25 | V1.0.0  | Info             | Merci de tester Naturegraph             | 7 users beta                                        | Envoye OK |
| 2026-08-05 | V0.7.0  | Nouvelle feature | De nouveaux choix pour tes publications | 60 users (hors 2 internes + 4 onboarding incomplet) | Envoye OK |

## Detail 2026-08-05, V0.7.0 (NG-055)

- **Titre** : De nouveaux choix pour tes publications (sans emoji, demande Nicolas).
- **Corps** (4 lignes) :
  > Dans Rencontre Nature : des habitats plus precis (lac, zone humide, zone rurale, centre de soins).
  > Dans Instant Nature : de nouveaux phenomenes comme le coucher de soleil et la pleine lune.
  > Meteo brumeux ajoutee dans les deux.
  > Clique sur « Afficher plus » pour voir tous les choix !
- **Cible** : `profiles WHERE username NOT LIKE 'user_%' AND is_internal = false` = 60 lignes.
- **Envoi** : 2026-08-05 15:06 UTC, in-app uniquement (pas d'email).
- **Rollback si besoin** (cf NOTIFICATIONS_SYSTEM.md) :
  - Marquer lues : `UPDATE notifications SET read = true WHERE type='system' AND title='De nouveaux choix pour tes publications';`
  - Supprimer : `DELETE FROM notifications WHERE type='system' AND title='De nouveaux choix pour tes publications';`
