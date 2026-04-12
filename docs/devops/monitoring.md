# Monitoring & observabilité

## Pile

| Outil | Couvre | Plan |
|---|---|---|
| **Sentry** | Erreurs JS frontend, releases, source maps | Free MVP → Team V1 |
| **Supabase Logs** | Postgres queries lentes, Auth, Edge Functions | inclus |
| **Supabase Advisors** | Sécurité (RLS, search_path), perf (index manquants) | inclus, à check par sprint |
| **Vercel Analytics** | Web vitals, traffic | Free |
| **Plausible** ou **Umami** | Analytics éthique sans cookies | self-host MVP |
| **UptimeRobot** | Health check `/` toutes les 5 min | Free |

> Pas de Google Analytics. Pas de cookie tracking. RGPD by default.

## Métriques clés à surveiller

### Frontend (Vercel + Sentry)

| Métrique | Seuil | Action |
|---|---|---|
| LCP (p75) | < 2.5s | si > 3s : audit perf, alerte Slack |
| INP (p75) | < 200ms | si > 300ms : audit composants lourds |
| CLS (p75) | < 0.1 | si > 0.15 : audit images sans dimensions |
| JS bundle gzip | < 300KB | check dans CI, fail build si dépasse |
| Erreurs JS | < 1% sessions | Sentry alerte > 5%/h |

### Backend (Supabase)

| Métrique | Seuil | Action |
|---|---|---|
| Connexions DB simultanées | < 60% pool | si > 80% : passer en Pro / pgBouncer |
| Query duration p95 | < 200ms | si > 500ms : EXPLAIN ANALYZE, index manquant |
| Auth signups/h | baseline + 3σ | spike inexpliqué → bot, activer hCaptcha |
| Storage egress | < quota | si > 80% : audit hot images, CDN |
| Realtime channels | < 200 (Free) / 500 (Pro) | dimensionner |

## Alerting

| Source | Canal | Critère |
|---|---|---|
| Sentry | email + Slack `#alerts` | nouvelle issue, regression, error rate spike |
| UptimeRobot | email + Slack | downtime > 2 min |
| Supabase Advisors | check hebdo manuel | toute warning sécurité bloque le sprint suivant |
| GitHub Actions | email | build failed sur `main` ou `staging` |

## Logs structurés

Frontend :
```ts
import * as Sentry from '@sentry/react'
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.0,    // pas de replay session sans consentement
  replaysOnErrorSampleRate: 1.0,    // replay seulement sur erreur (RGPD ok)
  beforeSend(event) {
    // Strip PII (email, IP)
    if (event.user) { event.user.email = undefined; event.user.ip_address = undefined }
    return event
  },
})
```

Backend (Edge Functions) :
```ts
console.log(JSON.stringify({ event: 'delete_account', user_id, ts: new Date().toISOString() }))
```

→ Supabase logs explorer permet de filtrer en SQL.

## Dashboards à créer

1. **« Health »** — uptime, error rate, build status
2. **« Perf »** — web vitals 7 jours
3. **« DB »** — connexions, query latence p50/p95
4. **« Modération »** — `reports` pending count, par jour

## Audit régulier

| Fréquence | Action |
|---|---|
| Quotidien | check Sentry inbox |
| Hebdo | Supabase Advisors (sécurité + perf) |
| Mensuel | Lighthouse complet sur 5 pages clés |
| Trimestriel | revue index Postgres, vacuum analyze, rotation secrets |
| Annuel | pen test externe (avant V1 publique) |
