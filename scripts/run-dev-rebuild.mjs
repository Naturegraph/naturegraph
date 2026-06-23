/**
 * Runner one-shot NG-007 : applique scripts/dev-rebuild.sql sur le projet DEV.
 * Lit la connection string depuis l'env DEV_DB_URL (jamais en dur).
 * GARDE-FOU : refuse de tourner si la cible n'est pas le projet dev (ref nkgdgxwejqqnqmwqwegy).
 *
 * Usage (dans le terminal du fondateur) :
 *   $env:DEV_DB_URL = "postgresql://postgres.nkgdgxwejqqnqmwqwegy:<MDP>@aws-0-ca-central-1.pooler.supabase.com:5432/postgres"
 *   node scripts/run-dev-rebuild.mjs
 */
import pg from 'pg'
import { readFileSync } from 'node:fs'

const url = process.env.DEV_DB_URL
const DEV_REF = 'nkgdgxwejqqnqmwqwegy'
const PROD_REF = 'hrxgduvworofnrjmgpcj'

if (!url) {
  console.error('ERREUR : variable DEV_DB_URL non definie.')
  process.exit(1)
}
if (url.includes(PROD_REF)) {
  console.error('STOP : la connection string pointe sur la PROD (' + PROD_REF + '). Refus absolu.')
  process.exit(1)
}
if (!url.includes(DEV_REF)) {
  console.error('STOP : la connection string ne contient pas le ref du DEV (' + DEV_REF + '). Refus par securite.')
  process.exit(1)
}

// Strip BOM (U+FEFF) : certaines migrations sont sauvees avec un BOM qui casse le SQL une fois concatene.
const sql = readFileSync(new URL('./dev-rebuild.sql', import.meta.url), 'utf8').replace(/﻿/g, '')
const client = new pg.Client({ connectionString: url })

try {
  await client.connect()
  console.log('Connecte au projet DEV. Application du rebuild (' + sql.length + ' octets)...')
  await client.query(sql)
  console.log('OK : rebuild applique SANS erreur. Le schema dev est reconstruit.')
} catch (e) {
  console.error('ECHEC pendant l execution :')
  console.error('  message : ' + e.message)
  if (e.where) console.error('  contexte : ' + e.where)
  console.error('Le script repart d un DROP SCHEMA, il est donc rejouable apres correction.')
  process.exitCode = 1
} finally {
  await client.end()
}
