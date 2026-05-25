# Supabase Pro, plan d optimisation Naturegraph

Date : 2026-05-24
Contexte : Nicolas a upgrade Supabase Free vers Pro ($25/mo). Cette roadmap recense tout ce qu on peut maintenant exploiter pour solidifier la structure beta + scaler vers 100, 1000 users.

---

## Vue d ensemble par phase

| Phase | Quand                     | Risque DB                      | Effort total |
| ----- | ------------------------- | ------------------------------ | ------------ |
| A     | MAINTENANT (pendant seed) | Zero, code only + storage conf | 2-3h         |
| B     | Apres fin du seed species | Faible, DDL controle           | 3-4h         |
| C     | Sprint suivant            | Moyen, change deployment       | 1-2 jours    |
| D     | Quand traffic le justifie | Eleve, modifs archi            | 1 semaine+   |

---

## PHASE A, Wins immediats sans toucher la DB (pendant seed)

### A1, Helper image transformations Supabase

Pro plan inclut les **Image Transformations** Supabase Storage (deja actif cote storage). On peut transformer toute image stockee a la volee :

```
/storage/v1/object/public/posts/abc.jpg
+ ?width=400&height=400&resize=cover&quality=80
+ ?format=origin  // ou webp si supporte navigateur
```

Gain : avatars 50 KB au lieu de 2 MB, post photos 200 KB sur feed mobile au lieu de 5 MB. **Reduction egress 80-95%**.

A faire :

- `src/lib/supabaseImage.ts`, helper `transformImageUrl(url, opts)`
- `<OptimizedImage>` component avec srcset + lazy + fallback
- Migrer progressivement : avatars (Header, ProfileMenu, post cards), banners profil, photos posts en feed

### A2, Storage config

- Bump `fileSizeLimit` 50 MB to 100 MB pour les photographes pro qui shootent en RAW + JPEG haute qualite
- Verifier S3 protocol active (deja OK) pour upload direct depuis CLI Nicolas

### A3, Documentation operationnelle

- Ce document `SUPABASE_PRO_ROADMAP.md`
- Documenter les nouveaux backups PITR 7j dans `docs/devops/`

---

## PHASE B, Cleanup DB + extensions (apres fin du seed)

### B1, Cleanup unused indexes

40 indexes flaggues `unused_index` par l advisor. Consomment :

- Espace disque
- Ralentissent les INSERT/UPDATE (chaque write maintient tous les indexes)
- Inutiles pour les requetes actuelles

Tables concernees : `media`, `profiles`, `posts`, `fr_cities`, `species_master`, `moderation_reports`, `admin_actions`, `beta_access_keys`, `beta_signup_log`, `support_tickets`, `security_audit_log`, `hidden_posts`, `admin_audit_logs`, etc.

Action : analyser un par un, garder ceux qui correspondent a un usage prevu (foreign keys, queries futures), DROP les autres.

### B2, Installer extensions Pro utiles

| Extension    | Use case Naturegraph                                   | Priorite |
| ------------ | ------------------------------------------------------ | -------- |
| `pgaudit`    | Audit logs PostgreSQL natifs, conformite RGPD Quebec   | Haute    |
| `pgmq`       | Queue retry pour beta-invite mails, jobs background    | Haute    |
| `hypopg`     | Tester un index AVANT de le creer (eviter erreur B1)   | Moyenne  |
| `pg_partman` | Partitioning auto `security_audit_log` quand 100k rows | Basse    |
| `vector`     | Search semantique especes (similaires, suggestions)    | Phase D  |
| `pg_repack`  | Defragmenter tables apres gros DELETE sans LOCK        | Moyenne  |

### B3, Auth DB connections percentage-based

Auth advisor signale `Auth DB Connection Strategy is not Percentage`. Actuellement `10 connections absolues`, ne scalent pas avec l instance. Switch en mode `%` via Dashboard, Auth, Sessions.

### B4, VACUUM ANALYZE post-seed

Apres 10-15k INSERTs sur species_master, lancer un VACUUM ANALYZE pour rebuilder les stats. Performance des queries futures ameliorees.

### B5, Setup pg_cron jobs

Pro plan inclut pg_cron natif. Jobs utiles :

- **Cleanup beta_signup_log** : DELETE WHERE created_at < NOW() , INTERVAL 90 days (nuit)
- **Refresh stats denormalisees** : `posts_count`, `followers_count`, etc. pour rattraper d eventuelles desyncs (hebdo)
- **Cleanup hidden_posts orphelins** : pareil
- **Backup verif** : log si dernier backup > 26h

### B6, Verifier PITR

Pro plan donne **Point In Time Recovery 7 jours**. Verifier dans Dashboard, Database, Backups. Tester un restore sur branche prefigure (B7).

### B7, Activer Database Branching

Pro plan donne **branches DB ephemeres**. Workflow ideal :

```
git checkout -b feat/xxx
supabase branches create feat/xxx  # snapshot prod, branche eph
# tests migrations + code en isolation
supabase branches merge feat/xxx   # pousse les migrations valides
```

Eviter de tester des migrations directement sur prod ou dev.

---

## PHASE C, Features applicatives unlockees par Pro

### C1, Real-time sur posts et notifications

Pro plan donne **500 connexions concurrentes Realtime** (vs 200 Free). Permet :

- Feed live : nouveaux posts apparaissent sans refresh
- Notifications live : badge mis a jour en temps reel
- Likes, comments compteurs synchronises entre onglets

Activer via Dashboard, Database, Replication, table `posts` + `notifications` en ON.

Cote code : `supabase.channel('posts').on('postgres_changes', ...)` dans `useFeed`.

### C2, S3 Protocol pour uploads massifs

Photographes pro peuvent uploader leurs RAW via :

```bash
aws s3 cp ./photos/ s3://naturegraph/photographer-xxx/ --endpoint-url=https://hrxgduvworofnrjmgpcj.supabase.co/storage/v1/s3
```

Plus rapide que upload HTTP, parallelisable, resume on failure. Necessite credentials S3-compatible.

### C3, Edge Functions limits

Pro plan : **500k invocations + 200 GB-hours/mois** (vs 500k + 100 GB-hours Free). On a deja `send-beta-invite`, peut ajouter :

- `generate-post-og` : OG image preview pour partage (tache backlog #35, #40)
- `weekly-digest` : email recap hebdo
- `species-search-fallback` : si recherche locale rate, fallback GBIF

### C4, Custom SMTP higher limits

Pro plan : Supabase native SMTP a **3600 emails/h** (vs 2/h Free). Tu peux retirer le Gmail App Password + ses limites 500/jour et basculer sur Resend / Postmark / Mailgun officiel via Dashboard, Project Settings, Auth, SMTP Settings.

### C5, Log retention 7j

Pro plan garde **7 jours de logs** vs 1 jour Free. Debug retro facilite. Setup `mcp__supabase__get_logs` dans nos outils pour acceder rapide aux erreurs prod.

---

## PHASE D, Scaling (quand traffic le justifie)

### D1, Read replicas

Pro plan permet ajout de **read replicas** ($5/mo chacune). Une fois > 200 users actifs, ajouter 1 replica pour decharger les SELECT du feed.

Cote code : `createClient` avec un second client en read-only sur l URL replica pour les requetes lourdes (carte, recherche, stats).

### D2, Vector search especes

Extension `vector` + embeddings OpenAI sur `species_master.common_name_fr`. Permet :

- Recherche fuzzy "petit oiseau noir tete blanche" to match Mesange charbonniere
- Suggestions "especes similaires" sur fiche espece

Cout indicatif : 1 embedding par espece, 0.0001$/embedding * 15k especes = ~1.5$ one-shot.

### D3, PGroonga fulltext

Alternative a pg_trgm pour search FR/EN ultra-rapide multi-langues. A evaluer si pg_trgm devient lent > 50k especes.

### D4, Partitioning posts

Quand `posts` depassera 100k rows, partitionner par `created_at` (mensuel). Extension `pg_partman` deja prevue en B2.

### D5, Database branching CI/CD

Integrer `supabase branches` dans le CI Vercel : chaque PR cree une branche DB ephemere, applique les migrations, lance les tests, detruit a la fin.

---

## Resume actionnable, ordre d execution

1. **MAINTENANT (Phase A)** : helper image + OptimizedImage + bump storage limit
2. **Quand seed termine** : VACUUM ANALYZE species_master, cleanup unused indexes (B1, B4)
3. **Sprint suivant (B + C partiel)** :
   - Installer pgaudit + pgmq + hypopg
   - Auth connections en %
   - pg_cron jobs cleanup
   - Real-time posts + notifications
   - Custom SMTP via provider pro
4. **Apres 100 users actifs (C2-C5)** : S3 protocol photographes, weekly-digest, log monitoring
5. **Apres 500 users (D)** : read replicas, vector search, partitioning

---

## Estimation cout / valeur

| Item                      | Cout                | Gain user                       |
| ------------------------- | ------------------- | ------------------------------- |
| Image transformations     | 0 (deja inclus Pro) | LCP mobile divise par 5-10      |
| PITR backups              | 0 (deja inclus Pro) | Securite donnees, recovery 7j   |
| Real-time posts           | 0 (deja inclus Pro) | UX live, retention +15%         |
| Custom SMTP pro           | ~10$/mo Mailgun     | Pas de limites Gmail, deliverab |
| Read replica              | +5$/mo              | Scale 1000+ users sans lag      |
| Vector embeddings species | ~2$ one-shot        | Recherche semantique avancee    |

**Total Pro stack solide** : 25$ (Pro) + 10$ (SMTP) + 5$ (replica) = **40$/mo pour 1000+ users**. Tres rentable vs un backend custom.

---

## References

- Supabase Pro features, https://supabase.com/pricing
- Image transformations, https://supabase.com/docs/guides/storage/serving/image-transformations
- Database branching, https://supabase.com/docs/guides/platform/branching
- pg_cron, https://supabase.com/docs/guides/database/extensions/pg_cron
- Realtime, https://supabase.com/docs/guides/realtime
