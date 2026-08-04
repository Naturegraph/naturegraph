# Déploiement de l'observabilité Edge (Sentry) — état + marche à suivre

> Mise à jour : 2026-08-04. Contexte : `docs/devops/OBSERVABILITE_STABILITE_PLAN.md`.

## Ce qui est fait

- **Code** : les 24 Edge Functions sont enveloppées par `serveWithSentry()`
  (`supabase/functions/_shared/sentry.ts`). Mergé en prod (V0.6.9).
- **Secret** : `SENTRY_EDGE_DSN` posé sur le projet Supabase prod (2026-08-04).
- **Déployées via MCP + vérifiées (runtime 403 OK, `verify_jwt` préservé)** :
  | Fonction | Pourquoi en priorité | verify_jwt |
  | --- | --- | --- |
  | `check-missed-feed` | E2 : captures explicites (destinataire raté, envoi partiel X/Y, crash run) | false |
  | `notify-new-report` | Modération : capture explicite d'un échec Resend | false |
  | `alert-infra-health` | Alerte quotas/délivrabilité | false |
  | `send-notification-email` | Dispatcher central (tous les emails E1-E8 passent par lui) | false |

## Ce qui reste (20 fonctions)

Elles n'ont que le filet `serveWithSentry` (aucune capture explicite ajoutée), et
elles ont déjà leur propre try/catch interne : le gain est réel mais marginal
(rattraper une exception qui s'échapperait). À redéployer quand pratique, sans
urgence. Aucune ne bloque quoi que ce soit en attendant.

Liste : admin-delete-user, alert-signup-surge, backup-media, check-activation-emails,
check-followed-digest, check-goal-reminder, check-social-digest,
check-species-milestones, check-streak-risk, check-weekly-summary, delete-account,
email-unsubscribe, export-data, resend-webhook, send-beta-invite,
send-invite-reminder, send-notification-email, send-waitlist-confirmation,
validate-beta-key, validate-media, weekly-species-digest.

## Comment finir les 20 restantes

`config.toml` (à la racine `supabase/`) fige désormais le `verify_jwt` de chaque
fonction : un déploiement en bloc ne cassera donc plus les crons/webhooks.

Option A (recommandée, une commande) : installer le CLI et déployer tout.

```bash
npx supabase login
npx supabase functions deploy --project-ref hrxgduvworofnrjmgpcj
```

Option B : redéploiement via MCP, fonction par fonction (ce qui a été fait pour
les 3 ci-dessus). Plus lent, mais aucun setup local requis.

## Vérifier que ça remonte

Dans Sentry, filtrer les événements par le tag `edge_function` (ou
`runtime:deno-edge`). Un crash ou un échec géré d'une fonction déployée doit y
apparaître, avec `server_name` = le nom de la fonction.
