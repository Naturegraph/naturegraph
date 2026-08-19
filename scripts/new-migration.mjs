#!/usr/bin/env node
/**
 * Cree un fichier de migration correctement HORODATE et UNIQUE :
 *   supabase/migrations/YYYYMMDDHHMMSS_nom.sql
 *
 * La cause racine des galeres de cloisonnement dev (NG-007) etait que les 142
 * migrations historiques n'ont que ~75 versions uniques (format YYYYMMDD non
 * horodate), rendant la CLI supabase (db push/reset) inutilisable. Cet outil
 * garantit que TOUTE nouvelle migration est unique -> la CLI redevient fiable
 * au fil du temps.
 *
 * Usage :
 *   npm run migration:new -- "ajout colonne X sur posts"
 *   (ou : node scripts/new-migration.mjs "ajout colonne X sur posts")
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const raw = process.argv.slice(2).join(' ').trim()
if (!raw) {
  console.error('Usage : npm run migration:new -- "description courte de la migration"')
  process.exit(1)
}

// slug : minuscules, accents retires, espaces -> _, caracteres non alphanum retires
const slug = raw
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 60)

const d = new Date()
const p = (n, l = 2) => String(n).padStart(l, '0')
const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`

const dir = join(process.cwd(), 'supabase', 'migrations')
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
const file = join(dir, `${stamp}_${slug}.sql`)

const header = `-- ${stamp}_${slug}.sql
-- ${raw}
-- =============================================================================
-- Cree via 'npm run migration:new'. Version horodatee UNIQUE (YYYYMMDDHHMMSS).
--
-- WORKFLOW (voir docs/devops/environments.md) :
--   1. Ecrire la migration ci-dessous.
--   2. L'appliquer et la TESTER sur le DEV d'abord (MCP supabase-dev / dashboard dev).
--   3. Merge develop -> staging -> main.
--   4. L'appliquer sur la PROD au moment du merge vers main.
--
-- Idempotence recommandee (IF EXISTS / IF NOT EXISTS / CREATE OR REPLACE) pour
-- que la migration soit rejouable sans casser un rebuild dev.
-- =============================================================================

`

if (existsSync(file)) {
  console.error('Un fichier existe deja avec cet horodatage. Reessaie dans 1 seconde.')
  process.exit(1)
}
writeFileSync(file, header, 'utf8')
console.log('Migration creee : supabase/migrations/' + `${stamp}_${slug}.sql`)
