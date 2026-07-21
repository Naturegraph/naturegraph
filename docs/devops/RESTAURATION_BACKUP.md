# Restauration d'une sauvegarde Supabase, NG-037

> Que sauvegarde-t-on, que ne sauvegarde-t-on pas, et comment restaurer sans
> aggraver la situation. Constaté sur le dashboard le 2026-07-22.

## Ce dont on dispose

| Élément   | État                                                                 |
| --------- | -------------------------------------------------------------------- |
| Fréquence | Quotidienne, autour de minuit (région du projet)                     |
| Rétention | Environ 7 jours (8 sauvegardes visibles)                             |
| Type      | `PHYSICAL`                                                           |
| Méthodes  | Restauration planifiée, Point in time, Restore to new project (BETA) |

## ⚠️ Ce qui n'est PAS sauvegardé : les photos

Supabase l'indique explicitement sur la page Backups :

> Database backups do not include objects stored via the Storage API.

La sauvegarde contient les **lignes** de `media` (URL, auteur, licence) mais **pas
les fichiers images**. Restaurer la base après une perte du storage rendrait donc
des publications pointant vers des images inexistantes.

C'est la donnée la plus irremplaçable du projet : un utilisateur ne peut pas
re-photographier une rencontre passée. Traité séparément, cf. la sauvegarde des
fichiers storage.

## Méthode 1 : Restore to new project (à privilégier)

Non destructive. La prod continue de tourner pendant l'opération. C'est la seule
méthode acceptable pour **tester**, et la plus sûre pour récupérer quelques
données sans tout écraser.

1. Dashboard > Database > Backups > onglet **Restore to new project**.
2. Choisir la sauvegarde voulue, lancer la restauration.
3. Un **nouveau projet Supabase** est créé avec les données de cette date.
   Attention : un projet supplémentaire est susceptible d'être **facturé** sur
   l'organisation.
4. Se connecter à ce nouveau projet pour extraire ce dont on a besoin (requêtes
   SQL, export de tables).
5. Réinjecter dans la prod uniquement ce qui est nécessaire.
6. **Supprimer le projet temporaire** une fois terminé, pour ne pas payer un
   projet dormant.

## Méthode 2 : restauration en place (urgence uniquement)

Dashboard > Database > Backups > bouton **Restore** sur une sauvegarde.

**Destructif** : la base est remplacée par celle de la date choisie. Tout ce qui
a été créé depuis est définitivement perdu (publications, comptes, réactions).

À n'utiliser que si la base courante est irrécupérable, jamais pour aller
chercher une donnée ponctuelle. Dans ce cas, préférer la méthode 1.

Avant de lancer : couper les inscriptions (cf. `ROLLBACK_OPEN_ACCESS.md`) pour
éviter que de nouveaux comptes se créent pendant l'opération et soient perdus.

## Méthode 3 : Point in time

Permet de revenir à un instant précis plutôt qu'à une sauvegarde quotidienne.
Également **destructif** sur le projet courant. Mêmes précautions que la méthode 2.

## Après une restauration, à vérifier

1. Nombre de comptes et de publications cohérent avec la date restaurée.
2. Les **fichiers storage** ne sont pas revenus en arrière : des lignes `media`
   restaurées peuvent pointer vers des fichiers supprimés depuis, et
   inversement des fichiers peuvent exister sans ligne correspondante.
3. Les crons `pg_cron` et les triggers sont bien présents (`SELECT * FROM cron.job`).
4. Les secrets Vault (`cron_secret`) et les Edge Functions ne sont pas concernés
   par la sauvegarde de base : ils vivent hors du dump, donc rien à restaurer.
5. Envoyer un email de test pour vérifier que la chaîne de notification répond.

## Durées

Non mesurées : aucune restauration réelle n'a été exécutée, pour ne pas créer un
projet facturé inutilement. À chronométrer lors de la première restauration
réelle et à noter ici. Ordre de grandeur attendu pour une base de ~110 Mo :
quelques minutes.

## Décision

Le 2026-07-22, il a été décidé de **documenter** cette procédure sans l'exécuter,
et de consacrer l'effort à la sauvegarde des fichiers storage, qui est le trou
réel et non couvert.
