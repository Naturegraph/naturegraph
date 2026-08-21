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

## ✅ MISE A JOUR 2026-08-19 : dev a parite + 2 etapes OBLIGATOIRES post-rebuild

La separation est faite : dev (`nkgdgxwejqqnqmwqwegy`) a le MEME schema que la prod
(40 tables, 6 vues, ~848 fonctions, memes signatures). Preview -> dev, Production -> prod.

**PIEGE decouvert (2026-08-19)** : apres un rebuild du dev, deux choses manquaient et
cassaient TOUT (tout en 401/404, feed vide) :

1. **Les GRANTs des roles `anon`/`authenticated`** n'etaient pas reappliques -> "permission
   denied for view/table ...". Le rebuild recree les objets sans les grants Supabase par defaut.
2. **Le cache de schema PostgREST** n'etait pas recharge apres les grants -> les RPC en 404.

### A EXECUTER apres CHAQUE rebuild/reseed du dev (via MCP dev ou SQL editor DEV)

```sql
-- 1. Restaurer les grants standard Supabase (la RLS controle toujours les lignes)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
-- 2. Recharger le cache PostgREST (sinon les RPC restent en 404)
notify pgrst, 'reload schema';
```

### Exigence `.env.local` (dev LOCAL)

Le `npm run dev` LOCAL lit `.env.local`. Il DOIT pointer sur le **DEV** (`nkgdgxwejqqnqmwqwegy`),
avec la cle **legacy anon JWT** (pas `sb_publishable_*`, qui casse silencieusement les
DELETE/UPDATE/RPC). Si `.env.local` pointe sur `hrxg` (prod), le dev local montre les vraies
donnees users ET toute ecriture touche la prod. Verifier : la console navigateur doit ne taper
QUE `nkgd...supabase.co`.

---

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

## Reprise via le runner Node (le plus avance, deja construit 2026-06-17)

Un runner a ete construit et fonctionne (connexion dev OK, BOM gere). Etat a la coupure :
le rebuild se lance mais reste a finir (un BOM dans `20260519_species_master_seed_v2.sql` a ete
trouve et est desormais strippe automatiquement par le runner ; il restait a relancer pour aller
au bout). Le dev est donc en etat partiel (re-jouable, le script repart d'un DROP SCHEMA).

Pour reprendre (tout sur le DEV uniquement, jamais la prod) :

```bash
# 1. (si besoin) installer pg sans toucher package.json
npm i pg --no-save

# 2. regenerer le SQL de rebuild (concatenation des migrations dans l'ordre)
{ echo "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"; \
  echo "GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;"; \
  echo "GRANT ALL ON SCHEMA public TO postgres, service_role;"; \
  for f in $(ls supabase/migrations/*.sql | sort); do echo; echo "-- $(basename "$f")"; cat "$f"; echo; done; \
} > scripts/dev-rebuild.sql
```

```powershell
# 3. connection string DEV (Session pooler, IPv4), mot de passe DB dev substitue
$env:DEV_DB_URL = "postgresql://postgres.nkgdgxwejqqnqmwqwegy:<MDP_DEV>@aws-1-ca-central-1.pooler.supabase.com:5432/postgres"
node scripts/run-dev-rebuild.mjs
```

Le runner (`scripts/run-dev-rebuild.mjs`) a un garde-fou : il REFUSE de tourner si la cible n'est pas
le dev (`nkgdgxwejqqnqmwqwegy`). Si une migration echoue (ordre intra-journee, dependance), corriger
puis relancer (rejouable). Une fois `OK : rebuild applique SANS erreur` : seed `species_master`, puis
repoint Vercel Preview, puis valider develop. NB : `scripts/dev-rebuild.sql` (genere, 360 Ko) n'est PAS
committe.

## Methode de reprise ALTERNATIVE (a froid) : dump du schema prod -> dev

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

## ✅ RESOLU (2026-08-19)

Cloisonnement livre. Methode finale (la CLI ne pouvant pas rejouer les migrations
et Docker etant absent) : rebuild via un runner Node maison, INSTRUCTION PAR
INSTRUCTION en PLUSIEURS PASSES (re-essaie les echecs -> resout seul les erreurs
d'ordre fichiers-vs-prod).

- `scripts/dev-rebuild.sql` (genere localement, gitignore) : entete (DROP SCHEMA,
  extensions, wrapper immutable_unaccent) + concatenation des 142 migrations +
  reconciliation (colonnes de derive `license`/`facebook`/`short_id` ; DROP VIEW
  posts_public et DROP nearby_posts avant recreation).
- `scripts/run-dev-rebuild.mjs` : applique sur le dev (garde-fou dev-only), multi-passes.
  Resultat : 40 tables = prod. Residus cosmetiques (perf RLS, REVOKE sur fonctions
  de derive absentes) sans impact.
- `scripts/copy-refdata-prod-to-dev.mjs` : seed taxonomy_nodes (45769), species_master
  (4835), fr_cities (35457) prod->dev. Aucune donnee utilisateur.
- Dev isole : tous les crons desactives + 3 triggers appelant la prod neutralises.
- Vercel Preview (URL + ANON_KEY) repointe sur le dev ; verifie : bundle develop
  reference nkgd, zero hrxg.

Definition of Done :

- [x] Dev rebuild a parite (40 tables = prod)
- [x] `species_master` + taxonomy + cities seedes sur dev
- [x] Variables Vercel Preview repointees sur le projet dev
- [x] Preview develop valide (bundle = dev, zero donnee prod)
- [x] Finding "Preview = base PROD" : RESOLU
