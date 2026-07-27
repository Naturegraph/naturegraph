# Cahier des charges, E2 "Cette semaine sur Naturegraph"

> Redige le 2026-07-27 (session pilotage) apres arbitrages Nicolas.
> Destine a la session develop pour implementation. Contexte produit :
> `docs/backend`, `supabase/functions/check-missed-feed`, `send-notification-email`.

## 1. Objectif

Transformer l email E2, aujourd hui une relance ciblee "ce que tu as manque"
(qui ne partait qu a ~7 users sur 50), en un **rendez-vous hebdomadaire du
dimanche** envoye au plus grand nombre : "Cette semaine sur Naturegraph". Il
montre la vie reelle de la plateforme (vraies observations de la semaine) et
invite a revenir sur le fil. Cible mesuree : ~45 destinataires.

Cause racine de l ancien volume : la selection dependait de `last_active_at`
(absence >= 5j), or 22 comptes sur 50 ont `last_active_at` NULL, plus un filtre
">= 3 obs manquees". La nouvelle regle s affranchit du heartbeat.

## 2. Regle de selection des destinataires (nouvelle)

Un compte recoit E2 le dimanche si TOUTES ces conditions sont vraies :

1. **Onboarde** : `first_name` non vide OU `interests` non vide (garde-fou deja
   present dans `send-notification-email`, le conserver).
2. **`is_internal = false`**.
3. **<= 2 publications sur les 7 derniers jours** (`posts` `status='published'`,
   `created_at >= now() - interval '7 days'`). 0, 1 ou 2 -> recoit. > 2 -> exclu
   (gros contributeur, "les plus actifs").
4. **Pas d opt-out** : `is_email_enabled(user, 'weekly_digest')` = true
   (couvre coupure globale `user_settings.email_notifications` + preference type
   `weekly_digest`). NON NEGOCIABLE (CASL / Loi 25).

`last_active_at` n intervient PLUS dans la selection. NULL = eligible.

"Forcer l envoi" (demande Nicolas) = forcer le declencheur d activite, PAS le
desabonnement. La condition 4 reste toujours appliquee.

## 3. Plancher "semaine creuse"

Avant de construire/envoyer : compter les obs publiques de la semaine
(`status='published'`, `visibility='public'`, `created_at >= now() - 7j`).
Si **< 3**, ne rien envoyer cette semaine (email vide contre-productif). Sinon,
envoyer.

## 4. Contenu de l email

100% texte, **aucun apercu image** (poids, delivrabilite, eco-conception).
Coquille : `buildEmailShell` (inchangee). Personnalisation du prenom conservee.

### 4.1 Socle commun (identique pour tous)

- Titre hero : "Cette semaine sur Naturegraph".
- Accroche chiffree : "**N nouvelles observations** ont ete partagees cette
  semaine par les migrateurs de la communaute." (N = compte obs publiques 7j).
- Ligne especes REELLES : piocher **jusqu a 5 especes identifiees** de la
  semaine (`species_name` non vide), en **variant les groupes taxo**
  (`taxonomic_group`) pour montrer la diversite. Ex : "Parmi elles, un Fou de
  bassan, un Chevreuil europeen, un Hibou moyen-duc, un Lezard des murailles et
  un Heron cendre."
  - Si < 5 especes identifiees : citer ce qu on a.
  - Si 0 espece identifiee : retirer l enumeration, garder N + CTA.
- Hameçon identification (si applicable) : si des obs de la semaine sont non
  identifiees, ajouter "X observations attendent encore d etre identifiees."
  (pousse vers l identification collaborative). Omis si 0.
- Cloture : "Elles t attendent sur le fil, avec les personnes qui les ont
  photographiees."
- CTA principal : "Decouvrir le fil" -> `${APP_URL}/home`.

### 4.2 Bloc personnalise (optionnel, par destinataire)

Si le destinataire **suit au moins un compte ayant publie une obs publique
cette semaine** :

- Afficher une ligne mise en avant (fond leger violet) : "Tu suis
  **<username>** : ses dernieres observations viennent d arriver sur le fil."
- Choix du compte cite : parmi les comptes suivis (`follows.follower_id =
destinataire`) ayant publie du public sur 7j, prendre **le plus recemment
  actif**. Si plusieurs, possibilite d ecrire "<username> et K autres que tu
  suis ont publie cette semaine".
- Lien du bloc (defaut retenu) : profil du compte suivi (le CTA principal reste
  vers le fil). Modifiable si Nicolas prefere tout vers le fil.

Si la personne ne suit personne, ou qu aucun compte suivi n a publie cette
semaine : le bloc n apparait pas (repli sur le socle seul).

Cout : une petite requete par destinataire (obs recentes des comptes suivis).
A ~45 envois/semaine, negligeable. Le socle reste partage.

## 5. Anti-spam et priorite (A DECIDER a l implementation)

E2 doit partir a coup sur le dimanche. Or le cap `weekly_marketing` = 2 emails /
168h est **partage avec E3/E4** (rappel objectif, serie), qui peuvent l avoir
consomme en semaine. Deux options :

- **(Reco)** E2 obtient sa **propre dedup** (max 1 `e2_missed` / 7j), hors du cap
  partage. On garde `category = weekly_marketing` pour l opt-out et le
  desabonnement, mais l anti-spam d E2 ne compte que les envois `e2_missed`. Ceci
  garantit le rendez-vous du dimanche. Effet de bord : jusqu a 3 marketing/semaine
  dans de rares cas (E3 + E4 + E2).
- (Alt) Garder le cap 2 partage et accepter que E2 saute pour les users tres
  sollicites en semaine. Non recommande (contredit "priorite max E2").

Trancher avec Nicolas avant de coder.

## 6. Planification (crons pg_cron)

- **E2** (`check-missed-feed`) : passer de `0 12 * * *` (quotidien 12h UTC) a
  **`0 16 * * 0`** (dimanche 16h UTC = 12h Quebec EDT / 18h France CEST).
- **E1** (`weekly_summary` / `check-weekly-summary`) : **desactiver** le dimanche
  (E2 le remplace). `cron.alter_job(... active => false)` ou unschedule.
- IMPORTANT : verifier le **planning LIVE** dans `cron.job` (les migrations
  d origine creent les jobs INACTIFS ; l etat reel en prod peut differer). Ne pas
  se fier aux seuls fichiers de migration.
- Migration SQL au format `YYYYMMDD_description.sql`, a appliquer manuellement
  sur le bon projet Supabase (rappel : dev et prod partagent la meme base
  `hrxgduvworofnrjmgpcj`, prudence).

## 7. Modifs de code attendues

1. **`supabase/functions/check-missed-feed/index.ts`** : reecriture de la
   selection (section 2) + du contenu (section 4). Renommer les libelles
   utilisateur ("Cette semaine sur Naturegraph"). Conserver `email_type =
'e2_missed'` en interne (continuite de `email_send_log` et de l historique) ;
   ne changer que le copywriting. Ajouter le plancher (section 3) et le bloc
   perso (4.2). En-tete de fichier a mettre a jour (doc du nouveau comportement).
2. **`supabase/functions/send-notification-email/index.ts`** : si option reco
   section 5 retenue, ajuster la logique anti-spam pour donner a E2 sa dedup
   propre. Sinon inchange.
3. **Migration cron** (section 6).
4. Envisager de **renommer la fonction/les jobs** plus tard (`check-missed-feed`
   -> `check-weekly-digest`) : cosmetique, non bloquant, a ne faire que si
   propre (risque de casser les references cron/Vault). Par defaut : garder le
   nom, changer le comportement.

## 8. Conformite, eco-conception, accessibilite

- **Desabonnement** : lien `List-Unsubscribe` + footer conserves (obligatoire).
- **CASL / Loi 25** : opt-out toujours respecte ; ne jamais bypasser (Nicolas
  seul tranche toute exception reglementaire).
- **Eco** : aucune image, requetes bornees (pas de N+1 cote socle ; 1 petite
  requete perso par destinataire, acceptable a ce volume). Pagination/limits sur
  les requetes de contenu.
- **A11y email** : structure semantique, contrastes AA (deja dans la coquille),
  texte alternatif inutile ici (pas d image de contenu).

## 9. Tests avant activation

- Mode test `body { user_id }` : verifier selection, socle, bloc perso (user
  suivant un compte actif vs user sans follow), plancher (< 3 obs -> rien).
- Verifier le volume reel (~45) via un dry-run/log avant d activer le cron.
- Verifier l heure d envoi (16h UTC dimanche) et la desactivation d E1.
- Verifier qu un user opte-out ne recoit rien.
- Delivrabilite : controler bounces/plaintes sur `email_events` apres le premier
  envoi groupe.

## 10. Hors scope (a auditer separement)

- `last_active_at` NULL sur 44% des comptes : casse E3/E4 (rappels objectif /
  serie) qui en dependent. Sujet distinct, a traiter apres.
- Renommage technique de la fonction/jobs (cosmetique).
