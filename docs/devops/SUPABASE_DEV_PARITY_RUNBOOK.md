# Runbook : parite du projet dev + cloisonnement Preview (NG-007)

> Objectif : corriger le finding "Preview = base PROD". Aujourd'hui les variables Vercel
> Preview (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`) pointent sur le projet PROD
> (`hrxgduvworofnrjmgpcj`). Comme `vercel.json` deploie `develop` et `staging` en
> environnement Preview, ces branches lisent/ecrivent dans la base de PRODUCTION.
>
> Cible : Preview pointe sur le projet DEV (`nkgdgxwejqqnqmwqwegy`). OBLIGATOIRE avant lancement.
>
> **Action externe** : etapes CLI/dashboard a executer par le fondateur. Claude prepare et verifie
> (mon acces MCP Supabase est branche sur la PROD, je ne peux pas appliquer sur le dev).

## BLOCKER decouvert (2026-06-17) : versions de migration non uniques

Tentative de `supabase db reset --linked` sur le dev : echec a la 2e migration avec
`duplicate key value violates unique constraint "schema_migrations_pkey" Key (version)=(20260320)`.

Cause racine : les 80 fichiers `supabase/migrations/` n'ont que **34 versions uniques** (format
`YYYYMMDD`, non horodate). 46 migrations partagent un meme prefixe de date. La table de suivi
`supabase_migrations.schema_migrations` exige des versions uniques, donc la CLI (`db push`/`db reset`)
NE PEUT PAS gerer ces migrations. C'est pourquoi elles ont toujours ete appliquees manuellement sur
la prod, et pourquoi le dev avait un historique CLI separe (timestamps).

Impact de la tentative : la prod n'a RIEN subi (jamais ciblee). develop/staging tournent toujours sur
la prod (Preview pas encore repointe), donc rien de vivant n'est casse. Le projet dev (jetable) est
par contre a moitie vide (seul `20260320_initial_schema.sql` applique).

PRE-REQUIS avant de pouvoir cloisonner via CLI : **renommer les migrations en versions uniques**
(format `YYYYMMDDHHMMSS_nom.sql`, en preservant l'ordre d'application). Tache dediee, a faire avec soin
(verifier l'ordre intra-journee), PAS en reactif. Ensuite seulement : reset/push dev propre, seed,
repoint Preview. En attendant, Preview reste sur la prod (deviation documentee, a corriger avant lancement).

## Etat constate (sonde du 2026-06-17)

Le projet dev est ACTIF mais PAS a parite :

- `taxonomy_nodes` : 14 732 lignes (partiel ; prod ~45k)
- `profiles` : 1, `posts` : 5 (donnees de test)
- `species_master` : 0 ligne (VIDE, pas seede)
- `app_config` : table MANQUANTE (404, drift de migration)

Repointer Preview AVANT de corriger ca casserait develop/staging (app_config 404 au chargement,
recherche d'espece vide). D'ou ce runbook.

---

## Etape 1 : mettre le schema dev a parite (migrations)

```bash
# Depuis la racine du repo. (npx evite une install globale)
npx supabase login            # si pas deja connecte
npx supabase link --project-ref nkgdgxwejqqnqmwqwegy   # projet DEV
npx supabase db push          # applique toutes les migrations de supabase/migrations/ sur le dev
```

`db push` applique automatiquement les migrations manquantes (dont `app_config`). Verifier la
sortie : elle liste les migrations appliquees. En cas de conflit, NE PAS forcer ; me transmettre
le message.

## Etape 2 : seed des donnees de reference sur dev

`species_master` est vide sur dev. Lancer le seed en pointant sur le projet dev (la cle
`service_role` du dev est requise, a recuperer dans le dashboard dev : Settings, API, onglet
"Legacy" ou nouvelle secret key) :

```bash
# Variables d'env pointant sur le DEV (jamais committer la service key)
SUPABASE_URL=https://nkgdgxwejqqnqmwqwegy.supabase.co \
SUPABASE_SERVICE_KEY=<service_role_DEV> \
node scripts/seed-species-from-gbif.mjs
```

`taxonomy_nodes` a deja 14.7k lignes (suffisant pour tester). Completer plus tard si besoin via
le runbook `SEED_SPECIES_V2_RUNBOOK.md`.

## Etape 3 : repointer les variables Vercel Preview vers le dev

Dashboard Vercel, projet naturegraph, Settings, Environment Variables. Pour le scope **Preview**
uniquement (ne PAS toucher Production) :

| Variable                 | Nouvelle valeur (Preview)                                                |
| ------------------------ | ------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | `https://nkgdgxwejqqnqmwqwegy.supabase.co`                               |
| `VITE_SUPABASE_ANON_KEY` | cle anon LEGACY du projet dev (format `eyJ...`, meme format que la prod) |

La cle anon dev est publique par design. La recuperer dans le dashboard dev : Settings, API,
onglet "Legacy anon, service_role API keys", cle `anon` / `public`.

## Etape 4 : redeployer develop et valider

```bash
# Declencher un redeploiement de develop (un commit vide suffit, ou via le dashboard Vercel)
git commit --allow-empty -m "chore: redeploy develop sur base dev (cloisonnement Preview)"
git push origin develop
```

Puis ouvrir le preview Vercel de `develop` et verifier :

- l'app charge sans erreur (pas de 404 app_config),
- le feed s'affiche,
- la recherche d'espece renvoie des resultats (sinon completer le seed species_master),
- AUCUNE donnee de prod n'apparait (on doit voir les donnees de test du dev).

## Verification finale (Claude)

Apres l'etape 1-2, me prevenir : je re-sonde le REST du projet dev (avec la cle anon) pour
confirmer que `app_config` existe et que `species_master` est seede, avant le repoint Vercel.
Apres l'etape 3-4, on verifie ensemble le bundle du preview develop (il doit contenir
`nkgdgxwejqqnqmwqwegy`, pas `hrxgduvworofnrjmgpcj`).

## Methode de reprise RECOMMANDEE (a froid) : dump du schema prod -> dev

Vu le blocker (versions de migration dupliquees), NE PAS reessayer `db push`/`db reset`. Approche
fiable qui contourne le probleme : repartir du schema PROD (connu-bon, complet) via un dump, et
l'appliquer sur le dev. Ne touche JAMAIS la prod en ecriture (uniquement une lecture/dump).

1. Relier la CLI a la PROD (pour le dump uniquement) :
   `npx supabase link --project-ref hrxgduvworofnrjmgpcj` (mot de passe DB prod via `$env:SUPABASE_DB_PASSWORD`).
   ⚠️ TANT QU'ON EST LIE A LA PROD : NE JAMAIS lancer `db reset`/`db push`. UNIQUEMENT `db dump`.
2. Dumper le schema prod (lecture seule, schema SEUL, pas de donnees prod) :
   `npx supabase db dump --schema public -f prod_schema.sql`
3. Relier au DEV : `npx supabase link --project-ref nkgdgxwejqqnqmwqwegy` (mot de passe DB dev).
4. Repartir d'un `public` propre sur le DEV (SQL editor du projet dev) :
   `drop schema public cascade; create schema public;`
   `grant usage on schema public to postgres, anon, authenticated, service_role;`
   `grant all on schema public to postgres, service_role;`
5. Appliquer `prod_schema.sql` sur le DEV (SQL editor du dev, ou psql avec la connection string dev).
6. Seed `species_master` (+ taxonomy si besoin) sur le dev.
7. Repointer les variables Vercel Preview -> dev, redeploy develop, valider.

A faire posement, verif a chaque etape. Alternative long terme (pour CI/CLI) : renommer les migrations
en versions uniques `YYYYMMDDHHMMSS`, mais le dump prod->dev suffit pour cloisonner sans ce chantier.

## Definition of Done

- [ ] Dev rebuild a partir du schema prod (ou migrations renommees) : `app_config` presente
- [ ] `species_master` seede sur dev
- [ ] Variables Vercel Preview repointees sur le projet dev
- [ ] Preview develop valide (app OK, donnees de test dev, zero donnee prod)
- [ ] SECURITY_VERCEL.md addendum : passer le finding de 🔴 a resolu
