#!/usr/bin/env node
/**
 * check-supabase-types-drift.mjs : CI gate drift detection (T-003)
 * ============================================================================
 *
 * Compare `src/types/supabase.ts` au schema actuel de la DB Supabase distante.
 * Fail si desynchro detectee (types obsoletes apres migration non regenere).
 *
 * Usage :
 *   - Local : `node scripts/check-supabase-types-drift.mjs`
 *   - CI    : ajoute comme step dans .github/workflows/ci.yml
 *
 * Variables d'env requises :
 *   SUPABASE_PROJECT_ID = 'hrxgduvworofnrjmgpcj' (default)
 *
 * Codes de sortie :
 *   0 = types a jour (no drift)
 *   1 = types desynchros (fail CI)
 *   2 = outil non disponible (skip, warning only)
 *
 * Refs : T-003 (MASTER_TODO) + BATCH 13
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const TYPES_FILE = resolve(REPO_ROOT, 'src/types/supabase.ts')
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'hrxgduvworofnrjmgpcj'

// ─── ANSI couleurs ──────────────────────────────────────────────────────────
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

function log(msg) {
  console.log(`[types-drift] ${msg}`)
}

function fail(msg) {
  console.error(`${RED}[types-drift] FAIL${RESET} ${msg}`)
  process.exit(1)
}

function skip(msg) {
  console.warn(`${YELLOW}[types-drift] SKIP${RESET} ${msg}`)
  process.exit(2)
}

function pass(msg) {
  console.log(`${GREEN}[types-drift] PASS${RESET} ${msg}`)
  process.exit(0)
}

// ─── Verifications prealables ──────────────────────────────────────────────
if (!existsSync(TYPES_FILE)) {
  fail(`Fichier introuvable : ${TYPES_FILE}`)
}

// Verifier que `supabase` CLI est dispo
const versionCheck = spawnSync('npx', ['supabase', '--version'], {
  stdio: 'pipe',
  shell: true,
  encoding: 'utf-8',
})
if (versionCheck.status !== 0) {
  skip("Supabase CLI non disponible localement (npx). Drift check skip.")
}

// ─── Generation des types courants ─────────────────────────────────────────
log(`Regeneration des types depuis project_id=${PROJECT_ID}...`)
const gen = spawnSync(
  'npx',
  ['supabase', 'gen', 'types', 'typescript', '--project-id', PROJECT_ID],
  { stdio: 'pipe', shell: true, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
)

if (gen.status !== 0) {
  // En CI le login Supabase peut manquer : on skip plutot que fail
  // (le check est best-effort, pas un blocker absolu).
  skip(`Generation echec (exit ${gen.status}). Probablement pas authentifie en CI. stderr: ${gen.stderr?.slice(0, 200)}`)
}

const generated = gen.stdout
if (!generated || generated.length < 1000) {
  skip(`Output trop court (${generated?.length ?? 0} chars). Probablement pas authentifie.`)
}

// ─── Lecture du fichier checked-in ─────────────────────────────────────────
const checkedIn = readFileSync(TYPES_FILE, 'utf-8')

// ─── Normalisation pour comparaison ────────────────────────────────────────
// Le header explicatif ajoute manuellement dans le fichier ne doit pas
// faire echouer la comparaison. On strip le bloc avant `export type Json`.
function normalize(src) {
  const idx = src.indexOf('export type Json')
  return idx > 0 ? src.slice(idx).trim() : src.trim()
}

const normGen = normalize(generated)
const normCheckedIn = normalize(checkedIn)

if (normGen === normCheckedIn) {
  pass(`Types a jour avec la DB (${normGen.length} chars).`)
}

// ─── Drift detected ────────────────────────────────────────────────────────
const lenDiff = normGen.length - normCheckedIn.length
log(`Generated: ${normGen.length} chars`)
log(`Checked-in: ${normCheckedIn.length} chars`)
log(`Diff: ${lenDiff > 0 ? '+' : ''}${lenDiff} chars`)

// Premiere ligne de diff (heuristique)
const genLines = normGen.split('\n')
const checkLines = normCheckedIn.split('\n')
const maxLen = Math.min(genLines.length, checkLines.length)
let firstDiffLine = -1
for (let i = 0; i < maxLen; i++) {
  if (genLines[i] !== checkLines[i]) {
    firstDiffLine = i
    break
  }
}
if (firstDiffLine >= 0) {
  log(`Premiere ligne differente (#${firstDiffLine + 1}) :`)
  log(`  generated: ${genLines[firstDiffLine].slice(0, 120)}`)
  log(`  checked-in: ${checkLines[firstDiffLine].slice(0, 120)}`)
}

fail(`Types desynchros. Regenerer : 'npx supabase gen types typescript --project-id ${PROJECT_ID} > src/types/supabase.ts' puis re-add le header.`)
