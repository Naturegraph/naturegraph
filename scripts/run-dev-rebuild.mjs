/**
 * Runner NG-007 : applique scripts/dev-rebuild.sql sur le projet DEV en PLUSIEURS
 * PASSES. Passe 1 : tout tenter (instruction par instruction, autocommit). Passes
 * suivantes : re-essayer UNIQUEMENT les instructions echouees. Les erreurs dues a
 * l'ordre des fichiers (objet cree plus tard) se resolvent d'elles-memes des que
 * l'objet existe. On s'arrete quand plus aucune ne se resout. Rapport final.
 * GARDE-FOU : refuse toute cible autre que le projet dev (nkgdgxwejqqnqmwqwegy).
 *
 * Usage :
 *   $env:DEV_DB_URL = "postgresql://postgres.nkgdgxwejqqnqmwqwegy:<MDP>@...:5432/postgres"
 *   node scripts/run-dev-rebuild.mjs
 */
import pg from 'pg'
import { readFileSync } from 'node:fs'

const url = process.env.DEV_DB_URL
const DEV_REF = 'nkgdgxwejqqnqmwqwegy'
const PROD_REF = 'hrxgduvworofnrjmgpcj'

if (!url) { console.error('ERREUR : variable DEV_DB_URL non definie.'); process.exit(1) }
if (url.includes(PROD_REF)) { console.error('STOP : pointe sur la PROD. Refus absolu.'); process.exit(1) }
if (!url.includes(DEV_REF)) { console.error('STOP : ne contient pas le ref DEV. Refus.'); process.exit(1) }

const sql = readFileSync(new URL('./dev-rebuild.sql', import.meta.url), 'utf8').replace(/﻿/g, '')

function splitStatements(s) {
  const out = []
  let cur = ''
  let i = 0
  const n = s.length
  while (i < n) {
    const c = s[i]
    if (c === '-' && s[i + 1] === '-') { const nl = s.indexOf('\n', i); const e = nl === -1 ? n : nl; cur += s.slice(i, e); i = e; continue }
    if (c === '/' && s[i + 1] === '*') { const cl = s.indexOf('*/', i + 2); const e = cl === -1 ? n : cl + 2; cur += s.slice(i, e); i = e; continue }
    if (c === "'") {
      let j = i + 1
      while (j < n) { if (s[j] === "'" && s[j + 1] === "'") { j += 2; continue } if (s[j] === "'") { j++; break } j++ }
      cur += s.slice(i, j); i = j; continue
    }
    if (c === '$') {
      const m = /^\$[A-Za-z_0-9]*\$/.exec(s.slice(i))
      if (m) { const tag = m[0]; const cl = s.indexOf(tag, i + tag.length); const e = cl === -1 ? n : cl + tag.length; cur += s.slice(i, e); i = e; continue }
    }
    if (c === ';') { cur += ';'; if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue }
    cur += c; i++
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const statements = splitStatements(sql).filter((s) => {
  const t = s.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim().toUpperCase().replace(/;$/, '')
  return t !== 'BEGIN' && t !== 'COMMIT'
})

const client = new pg.Client({ connectionString: url })
await client.connect()
console.log('Connecte au projet DEV. ' + statements.length + ' instructions.')

let pending = statements.map((q, idx) => ({ idx: idx + 1, q }))
let pass = 0
while (pending.length > 0 && pass < 8) {
  pass++
  const stillFailing = []
  let ok = 0
  for (const st of pending) {
    try { await client.query(st.q); ok++ }
    catch (e) { stillFailing.push({ ...st, msg: e.message }); try { await client.query('ROLLBACK') } catch { /* ignore */ } }
  }
  console.log('Passe ' + pass + ' : ' + ok + ' OK, ' + stillFailing.length + ' en echec')
  if (stillFailing.length >= pending.length) { pending = stillFailing; break } // plus de progres
  pending = stillFailing
}

console.log('\n==================== BILAN FINAL ====================')
console.log('Instructions totales : ' + statements.length + '   |   Echecs residuels : ' + pending.length)
const MAX = 40
for (const er of pending.slice(0, MAX)) {
  console.log('\n#' + er.idx + '  ' + er.msg)
  console.log('   ' + er.q.slice(0, 240).replace(/\s+/g, ' '))
}
if (pending.length > MAX) console.log('\n... et ' + (pending.length - MAX) + ' autres.')
if (pending.length === 0) console.log('OK : AUCUNE erreur residuelle. Schema dev reconstruit a parite. 🎉')
await client.end()
