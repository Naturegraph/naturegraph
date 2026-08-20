# Rollback d'urgence — revenir à la prod stable après une release

> Pour les cas « on a releasé, ça bug pour les vrais users, il faut revenir MAINTENANT ».
> Objectif : rétablir l'état stable en **quelques minutes**, sans paniquer.

## 0. Point de retour connu-bon (AVANT la prochaine MAJ)

**Prod stable actuelle = V0.8.2** :

- **Git** : `origin/main` = `01286ac` (« Release V0.8.2 », 2026-08-12).
- **Vercel** : le déploiement Production actif correspondant (Vercel garde l'historique).
- **DB Supabase PROD** : `hrxgduvworofnrjmgpcj` (backups auto quotidiens + PITR sur le plan Pro).

### À FAIRE juste avant de merger la release (pré-release)

1. **Taguer la prod stable** (filet git) :
   ```bash
   git fetch origin
   git tag prod-stable-v0.8.2 origin/main   # 01286ac
   git push origin prod-stable-v0.8.2
   ```
2. **Noter l'ID du déploiement Vercel Production actif** (Vercel → projet → Deployments →
   le déploiement marqué « Production »). C'est la cible du rollback instantané.
3. (Optionnel, ceinture+bretelles) Vérifier dans Supabase que le **PITR** est actif et
   noter l'heure du merge (pour pouvoir restaurer la DB à « juste avant » si besoin).

## 1. Rollback CODE — le plus rapide (recommandé) : Vercel Instant Rollback

C'est le levier le plus sûr et quasi instantané. **Ne touche pas la DB.**

1. Vercel → projet Naturegraph → onglet **Deployments**.
2. Repérer le **dernier déploiement Production stable** (le V0.8.2 noté en §0.2, ou tout
   déploiement antérieur à la release fautive).
3. Menu `⋯` → **Promote to Production** (ou « Instant Rollback »).
4. En ~30 s, `naturegraph.ca` re-sert l'ancien build. Vérifier le site + Sentry.

> Pourquoi c'est sûr même avec la migration de cette release : elle est **additive**
> (ajoute des colonnes, remplace des fonctions à l'identique). L'ancien code **ignore**
> les nouvelles colonnes -> il tourne sans problème sur la DB « migrée ». Donc **pas
> besoin de toucher la DB** pour un rollback de code.

## 2. Rollback CODE via git (si on préfère repartir de main)

```bash
git fetch origin
# Option A (propre) : revert du merge de release sur main
git checkout main && git pull origin main
git revert -m 1 <SHA_du_merge_de_release>
git push origin main            # Vercel redeploie l'ancien etat
# Option B (radical, à éviter sauf nécessité) : forcer main sur la prod stable
# git reset --hard prod-stable-v0.8.2 && git push --force-with-lease origin main
```

Vercel redéploie automatiquement sur push `main`. Un peu plus lent que l'Instant Rollback
mais laisse un historique git propre (Option A).

## 3. Rollback DB — normalement PAS nécessaire pour cette release

La release Lots 0-4 est du **code** + **1 migration additive idempotente**
(`20260819100500_drift_reconciliation_parity.sql` : ajoute des colonnes + `CREATE OR REPLACE`
de fonctions). Rien de destructif, rien qui casse l'ancien code.

**Donc : un rollback de code (§1 ou §2) suffit.** On **NE défait PAS** la migration
(les colonnes ajoutées restent, inoffensives).

Si un jour une release inclut une migration **destructive** (DROP colonne/table, changement
de type, data backfill) et qu'il faut restaurer des données :

- Supabase Pro → **Point-in-Time Recovery** : restaurer la DB à un timestamp **juste avant**
  le merge (d'où l'intérêt de noter l'heure en §0.3). Procédure détaillée : `RESTAURATION_BACKUP.md`.
- ⚠️ PITR restaure TOUTE la base à cet instant : on **perd** les écritures users faites depuis
  (posts, réactions…). À ne faire qu'en dernier recours, en connaissance de cause.

## 4. Après un rollback

- [ ] Vérifier `naturegraph.ca` (200, feed, login) + **Sentry** calme.
- [ ] Communiquer si besoin (notif in-app / statut).
- [ ] `git`: remettre `develop`/`staging` cohérents avec ce qui est réellement en prod.
- [ ] Post-mortem : quel bug ? reproduire en **dev** (base DEV), corriger, re-tester, re-release.

## Règle d'or

**On garde toujours un déploiement Production stable identifié dans Vercel** (§0.2) : c'est
le rollback le plus rapide et le plus sûr. Le git tag `prod-stable-*` en est le double.
