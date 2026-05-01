# CI Health Check

Système de vérification périodique et **non-destructif** de l'état du projet
(Git, Supabase, serveurs déployés). Exécuté automatiquement toutes les 4 heures
via GitHub Actions, et disponible en local pour le debug.

---

## Ce que le check fait

### 1. Git (read-only — jamais de commit/push/pull/merge)

- Branche courante
- Nombre de fichiers non commités (`git status --porcelain`)
- Commits ahead/behind par rapport à `origin/<branch>` (après `git fetch`)
- Fichiers indésirables : `.DS_Store`, `Thumbs.db`, `*.bak`, `*.tmp`, `*~`, `*.orig`

Un WIP (uncommitted) ou une divergence remonte en **warning** — pas en erreur.
Le script ne modifie **jamais** le dépôt.

### 2. Supabase

- Ping REST `/rest/v1/` avec la clé anon (200 attendu)
- HEAD sur chaque table représentative : `profiles`, `posts`, `species`

Skip propre si les secrets `SUPABASE_URL` / `SUPABASE_ANON_KEY` ne sont pas fournis.

### 3. Serveurs déployés

- HEAD sur `staging.naturegraph.fr` (URL stable des beta testeurs)
- HEAD sur `naturegraph.fr` (production)

Les codes 2xx et 3xx sont considérés OK (une redirection HTTPS est normale).

---

## Niveaux de statut

| Statut  | Exit code | Action GH Actions                             |
| ------- | --------- | --------------------------------------------- |
| `ok`    | 0         | job vert, rien de plus                        |
| `warn`  | 1         | job vert, logs uploadés                       |
| `error` | 2         | job rouge + **issue ouverte automatiquement** |
| crash   | 3         | job rouge + issue ouverte                     |

---

## Usage local (debug)

```bash
npm run ci:health
```

Sans variables d'env, le check Supabase sera `skipped` — c'est normal en local.
Pour tester Supabase en local :

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_ANON_KEY=ey... \
npm run ci:health
```

Le rapport JSON est écrit dans `logs/ci-health-<timestamp>.json` (ignoré par Git).

---

## Configuration GitHub Actions

### Secrets requis

Dans **Settings → Secrets and variables → Actions → Secrets**, ajouter :

| Nom                 | Valeur                                                     |
| ------------------- | ---------------------------------------------------------- |
| `SUPABASE_URL`      | URL du projet Supabase DEV (ex: `https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Clé `anon` publique du projet DEV                          |

La clé anon est safe à exposer côté client, mais la mettre en secret permet
de la pivoter sans modifier le code.

### Variables facultatives

Dans **Settings → Secrets and variables → Actions → Variables**, optionnel :

| Nom           | Défaut                           |
| ------------- | -------------------------------- |
| `STAGING_URL` | `https://staging.naturegraph.fr` |
| `PROD_URL`    | `https://naturegraph.fr`         |

---

## Cron

```yaml
schedule:
  - cron: '0 */4 * * *' # toutes les 4h UTC
```

Exécutions : 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC.

Déclenchement manuel possible via **Actions → CI Health → Run workflow**.

---

## Anti-spam — ouverture d'issue

Quand un check échoue en critique, le workflow :

1. Cherche une issue **ouverte** avec le label `ci-health`
2. Si elle existe → ajoute un **commentaire** (pas de nouvelle issue)
3. Sinon → crée une issue avec labels `ci-health` + `bug`

Une fois l'anomalie corrigée, **ferme manuellement l'issue** pour que la
prochaine anomalie rouvre un nouveau ticket propre.

---

## Pourquoi pas d'auto-commit / auto-push ?

Le spec initial demandait `git add . && git push origin main` toutes les 4h.
**On a volontairement retiré cette partie** pour plusieurs raisons :

1. **Règle projet** (`CLAUDE.md`) : `main` interdit en push direct, PR obligatoire
   depuis `staging`.
2. **Risque WIP garbage** : auto-commiter tout ce qui traîne dans le working tree
   polluerait l'historique avec du code non relu, non testé, potentiellement cassé.
3. **Risque de fuite** : un `.env.local` oublié serait poussé publiquement.
4. **Perte de traçabilité** : impossible de savoir après coup ce qu'un "chore:
   auto-sync" contient réellement.

Le check **signale** les divergences Git (uncommitted, ahead, behind) — c'est à
l'humain de décider quoi en faire via un commit + PR propres.

---

## Roadmap (non-scope actuel)

- [ ] Notification email/Slack en plus de l'issue GitHub
- [ ] Check de schema drift : comparer `src/types/supabase.ts` avec `supabase gen types`
- [ ] Tests de bout en bout (login, feed, upload) via Playwright
- [ ] Dashboard agrégé des runs récents
