# Suivi du volume email (refonte 2026-08, Lot 4)

> Lot 4 de la refonte « moins d'emails / plus de pertinence ». Ce document tient
> les requetes de MESURE et un instantane de reference. A re-lancer chaque semaine
> pour verifier que la cadence tient (cible : <= 1 email recurrent / user / semaine).

## Contexte

La refonte cadence (Lot 1) a pris effet le **2026-08-22** :

- **E7** (digest social) passe de quotidien a **hebdomadaire** (cron dimanche 18h) ,
  c'est le seul email d'activite recurrent conserve.
- **E2** (missed feed), **E3** (rappel objectif), **E4** (streak), **E6** (jalon espece),
  **E8** (digest suivis) : **desactives** (crons `active := false`).
- **E1** (resume hebdo) : deja inactif.
- **E5** (activation) : one-shot a l'onboarding, conserve.

Le temps reel reste **in-app** (cloche + fil « nouveaux moments »), pas par email.

## Instantane de reference (2026-08-24, juste avant plein effet)

| Mesure                                             | Valeur avant refonte       |
| -------------------------------------------------- | -------------------------- |
| Emails / user / semaine (moyenne)                  | ~2,1                       |
| Pire cas (max recu par 1 personne / 7j)            | **8**                      |
| Part des types desactives (E2/E3/E4/E6/E8) sur 30j | ~76 % du volume            |
| Types actifs restants                              | E7 (hebdo) + E5 (one-shot) |

Regime cible attendu apres plein effet : **<= 1 email / user / semaine**, pire cas 1
(sauf semaine avec activation E5). A confirmer sur les semaines suivant le 2026-08-24.

## Requetes de mesure (a relancer)

### 1. Volume par semaine (8 dernieres semaines)

```sql
with par_semaine as (
  select date_trunc('week', sent_at)::date as semaine,
         count(*) as envois,
         count(distinct user_id) as users_touches,
         round(count(*)::numeric / nullif(count(distinct user_id), 0), 2) as envois_par_user
  from email_send_log
  where sent_at >= now() - interval '8 weeks'
  group by 1
)
select semaine, envois, users_touches, envois_par_user
from par_semaine
order by semaine desc;
```

Lecture : `envois_par_user` doit tendre vers 1 sur les semaines apres le 2026-08-22.

### 2. Repartition par type (30j) + pire cas (7j)

```sql
select 'par_type_30j' as bloc, email_type, count(*) as envois,
       count(distinct user_id) as users
from email_send_log
where sent_at >= now() - interval '30 days'
group by email_type
union all
select 'pire_cas_7j', null, max(c), null
from (
  select user_id, count(*) c
  from email_send_log
  where sent_at >= now() - interval '7 days'
  group by user_id
) t
order by bloc, envois desc nulls last;
```

Lecture : sur 30j glissants, les types desactives doivent disparaitre au fil du
temps ; `pire_cas_7j` doit retomber a 1 (ou 2 les semaines d'activation).

### 3. Engagement (ouvertures / clics) via email_events

```sql
select e.email_type,
       count(*) filter (where ev.event_type = 'delivered') as delivres,
       count(*) filter (where ev.event_type = 'opened')    as ouverts,
       count(*) filter (where ev.event_type = 'clicked')   as cliques
from email_events ev
join email_send_log e on e.id = ev.send_log_id
where ev.created_at >= now() - interval '30 days'
group by e.email_type
order by delivres desc;
```

> NB : adapter les noms de colonnes de `email_events` si le schema differe
> (source de verite : `docs/backend/database-architecture.md`).

## Verdict de cloture

Objectif de la refonte atteint des que la mesure 1 montre `envois_par_user` ~1 et
la mesure 2 `pire_cas_7j` <= 2 sur 2 semaines consecutives apres le 2026-08-22.
