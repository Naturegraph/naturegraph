#!/usr/bin/env node
// @ts-check
/**
 * CI Health Check — vérification périodique non-destructive
 * ==========================================================
 *
 * Exécute une série de checks read-only sur :
 *   - l'état du dépôt Git (uncommitted, ahead/behind, fichiers temporaires)
 *   - la connectivité Supabase (REST ping + tables clés accessibles)
 *   - la santé des serveurs déployés (staging + prod)
 *
 * Écrit un rapport JSON dans logs/ci-health-YYYYMMDD-HHmm.json et un
 * résumé lisible sur stdout. Exit code :
 *    0 → tout OK
 *    1 → warnings non bloquants (uncommitted WIP, commits ahead…)
 *    2 → erreur critique (serveur down, Supabase inaccessible)
 *
 * Utilisé par :
 *   - `npm run ci:health` (manuel, pour debug)
 *   - `.github/workflows/ci-health.yml` (cron toutes les 4h)
 *
 * IMPORTANT : ce script ne commit, ne push, ne pull, ne merge JAMAIS.
 * La règle "jamais de push direct sur main" du projet est respectée
 * par construction — toute écriture doit passer par une PR manuelle.
 */

import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// ─── Config ──────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 10_000
const LOG_DIR = 'logs'

/** URLs à pinger (HEAD) — configurable via env pour les workflows CI */
const URLS = {
  staging: process.env.STAGING_URL ?? 'https://staging.naturegraph.fr',
  prod: process.env.PROD_URL ?? 'https://naturegraph.fr',
}

/** Tables Supabase dont on vérifie qu'elles répondent — représentatives du schéma */
const SUPABASE_TABLES = ['profiles', 'posts', 'species']

/** Patterns de fichiers indésirables qu'on signale s'ils traînent dans le repo */
const STALE_FILE_PATTERNS = [
  /\.DS_Store$/,
  /Thumbs\.db$/,
  /\.bak$/,
  /\.tmp$/,
  /~$/,
  /\.orig$/,
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Exécute une commande git, renvoie stdout trimé. Throw si exit code != 0. */
function git(args) {
  return execSync(`git ${args}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

/** Exécute une commande git en mode "soft" — renvoie null si erreur */
function gitSoft(args) {
  try {
    return git(args)
  } catch {
    return null
  }
}

/** Format ISO court pour les noms de fichiers log : YYYYMMDD-HHmm */
function timestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`
  )
}

// ─── Checks ──────────────────────────────────────────────────────────────────

/**
 * Check Git — état du dépôt local vs remote.
 * Non-destructif : `git fetch` est autorisé (ne modifie pas le working tree),
 * mais aucun pull/commit/push.
 */
async function checkGit() {
  const result = { status: 'ok', branch: null, uncommitted: 0, ahead: 0, behind: 0, staleFiles: [] }

  try {
    result.branch = git('rev-parse --abbrev-ref HEAD')

    // Fetch en silencieux pour que ahead/behind soient à jour
    gitSoft('fetch --quiet origin')

    const porcelain = git('status --porcelain')
    const uncommittedFiles = porcelain ? porcelain.split('\n').filter(Boolean) : []
    result.uncommitted = uncommittedFiles.length

    // Commits ahead/behind vs origin/<branch>
    const remoteRef = `origin/${result.branch}`
    const hasRemote = gitSoft(`rev-parse --verify ${remoteRef}`) !== null
    if (hasRemote) {
      const counts = gitSoft(`rev-list --left-right --count HEAD...${remoteRef}`)
      if (counts) {
        const [ahead, behind] = counts.split(/\s+/).map((n) => parseInt(n, 10) || 0)
        result.ahead = ahead
        result.behind = behind
      }
    }

    // Fichiers indésirables traqués ou untracked
    const tracked = git('ls-files').split('\n').filter(Boolean)
    const untracked = porcelain
      ? porcelain
          .split('\n')
          .filter((l) => l.startsWith('??'))
          .map((l) => l.slice(3))
      : []
    const allFiles = [...tracked, ...untracked]
    result.staleFiles = allFiles.filter((f) => STALE_FILE_PATTERNS.some((p) => p.test(f)))

    // Warning (non-critique) si WIP, divergence ou fichiers temporaires
    if (
      result.uncommitted > 0 ||
      result.ahead > 0 ||
      result.behind > 0 ||
      result.staleFiles.length > 0
    ) {
      result.status = 'warn'
    }
  } catch (err) {
    result.status = 'error'
    result.error = err instanceof Error ? err.message : String(err)
  }

  return result
}

/**
 * Check Supabase — REST endpoint + tables représentatives.
 * Utilise les secrets via env. Skip propre si non fournis.
 */
async function checkSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  const result = { status: 'ok', tables: {} }

  if (!url || !key) {
    return { status: 'skipped', reason: 'SUPABASE_URL ou SUPABASE_ANON_KEY non défini' }
  }

  // Ping base REST
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    result.rest = { httpStatus: r.status, ok: r.ok }
    if (!r.ok) result.status = 'error'
  } catch (err) {
    result.status = 'error'
    result.rest = { error: err instanceof Error ? err.message : String(err) }
    return result
  }

  // Check chaque table clé — HEAD + limite 0 évite de télécharger des données
  for (const table of SUPABASE_TABLES) {
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}?select=id&limit=1`, {
        method: 'HEAD',
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          prefer: 'count=exact',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      result.tables[table] = { httpStatus: r.status, ok: r.ok || r.status === 206 }
      if (!result.tables[table].ok) result.status = 'error'
    } catch (err) {
      result.tables[table] = { error: err instanceof Error ? err.message : String(err) }
      result.status = 'error'
    }
  }

  return result
}

/**
 * Check serveur — HEAD request sur chaque URL connue.
 * 301/302 sont considérés OK (redirection HTTPS par exemple).
 */
async function checkServer(name, url) {
  if (!url) return { name, status: 'skipped', reason: 'URL non définie' }

  try {
    const r = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const acceptable = r.ok || (r.status >= 300 && r.status < 400)
    return {
      name,
      url,
      status: acceptable ? 'ok' : 'error',
      httpStatus: r.status,
    }
  } catch (err) {
    return {
      name,
      url,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Runner ──────────────────────────────────────────────────────────────────

/** Petit helper pour colorer la sortie si le terminal le supporte */
const color =
  process.stdout.isTTY && !process.env.NO_COLOR
    ? {
        ok: (s) => `\x1b[32m${s}\x1b[0m`,
        warn: (s) => `\x1b[33m${s}\x1b[0m`,
        err: (s) => `\x1b[31m${s}\x1b[0m`,
        dim: (s) => `\x1b[2m${s}\x1b[0m`,
      }
    : { ok: (s) => s, warn: (s) => s, err: (s) => s, dim: (s) => s }

function statusBadge(status) {
  if (status === 'ok') return color.ok('OK     ')
  if (status === 'warn') return color.warn('WARN   ')
  if (status === 'error') return color.err('ERROR  ')
  if (status === 'skipped') return color.dim('SKIP   ')
  return status
}

async function main() {
  const startedAt = new Date().toISOString()
  console.log(color.dim(`ci-health — ${startedAt}`))

  const [gitRes, supaRes, stagingRes, prodRes] = await Promise.all([
    checkGit(),
    checkSupabase(),
    checkServer('staging', URLS.staging),
    checkServer('prod', URLS.prod),
  ])

  // ── Résumé lisible ────────────────────────────────────────────────────────
  console.log('')
  console.log(`${statusBadge(gitRes.status)} git`)
  if (gitRes.branch) {
    console.log(
      color.dim(
        `        branch=${gitRes.branch} uncommitted=${gitRes.uncommitted} ` +
          `ahead=${gitRes.ahead} behind=${gitRes.behind} stale=${gitRes.staleFiles.length}`,
      ),
    )
  }
  if (gitRes.staleFiles.length > 0) {
    console.log(color.warn(`        stale: ${gitRes.staleFiles.slice(0, 5).join(', ')}`))
  }

  console.log(`${statusBadge(supaRes.status)} supabase`)
  if (supaRes.rest) {
    console.log(color.dim(`        rest=${JSON.stringify(supaRes.rest)}`))
  }
  if (supaRes.tables) {
    for (const [t, v] of Object.entries(supaRes.tables)) {
      console.log(color.dim(`        ${t}=${v.ok ? 'ok' : 'err'} (${v.httpStatus ?? v.error})`))
    }
  }

  console.log(`${statusBadge(stagingRes.status)} staging (${stagingRes.url ?? 'n/a'})`)
  if (stagingRes.httpStatus) console.log(color.dim(`        http=${stagingRes.httpStatus}`))
  if (stagingRes.error) console.log(color.err(`        ${stagingRes.error}`))

  console.log(`${statusBadge(prodRes.status)} prod (${prodRes.url ?? 'n/a'})`)
  if (prodRes.httpStatus) console.log(color.dim(`        http=${prodRes.httpStatus}`))
  if (prodRes.error) console.log(color.err(`        ${prodRes.error}`))

  // ── Rapport JSON ──────────────────────────────────────────────────────────
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    git: gitRes,
    supabase: supaRes,
    servers: { staging: stagingRes, prod: prodRes },
  }

  // Exit code global = pire des statuts
  const statuses = [gitRes.status, supaRes.status, stagingRes.status, prodRes.status]
  const hasError = statuses.includes('error')
  const hasWarn = statuses.includes('warn')
  report.overall = hasError ? 'error' : hasWarn ? 'warn' : 'ok'

  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
  const logPath = join(LOG_DIR, `ci-health-${timestamp()}.json`)
  writeFileSync(logPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
  console.log('')
  console.log(color.dim(`report → ${logPath}`))

  // Exit code — 0 ok, 1 warn, 2 error
  process.exit(hasError ? 2 : hasWarn ? 1 : 0)
}

main().catch((err) => {
  console.error(color.err('ci-health crashed:'), err)
  process.exit(3)
})
