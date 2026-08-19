/**
 * Seed dev : copie les DONNEES DE REFERENCE (publiques, non-utilisateur) de la
 * PROD vers le DEV : taxonomy_nodes, species_master, fr_cities. Aucune donnee
 * utilisateur (profiles/posts/etc.) n'est copiee.
 *
 * Lit PROD_DB_URL (lecture seule) et DEV_DB_URL (ecriture). GARDE-FOUS stricts :
 *  - PROD_DB_URL doit etre le projet prod (lecture uniquement, jamais d'ecriture).
 *  - DEV_DB_URL doit etre le projet dev (sinon refus). On n'ecrit QUE sur le dev.
 *
 * Usage (PowerShell) :
 *   $env:PROD_DB_URL = "postgresql://postgres.hrxgduvworofnrjmgpcj:<MDP_PROD>@...:5432/postgres"
 *   $env:DEV_DB_URL  = "postgresql://postgres.nkgdgxwejqqnqmwqwegy:<MDP_DEV>@...:5432/postgres"
 *   node scripts/copy-refdata-prod-to-dev.mjs
 */
import pg from 'pg'

const PROD = process.env.PROD_DB_URL
const DEV = process.env.DEV_DB_URL
const PROD_REF = 'hrxgduvworofnrjmgpcj'
const DEV_REF = 'nkgdgxwejqqnqmwqwegy'

if (!PROD || !DEV) { console.error('ERREUR : definis PROD_DB_URL ET DEV_DB_URL.'); process.exit(1) }
if (!PROD.includes(PROD_REF)) { console.error('STOP : PROD_DB_URL ne pointe pas sur la prod.'); process.exit(1) }
if (!DEV.includes(DEV_REF) || DEV.includes(PROD_REF)) { console.error('STOP : DEV_DB_URL doit pointer sur le dev.'); process.exit(1) }

// Tables de reference a copier, dans l'ordre (taxonomy_nodes se self-reference,
// on desactive les FK pendant le chargement via session_replication_role).
const TABLES = ['fr_cities', 'taxonomy_nodes', 'species_master']
const BATCH = 500

const prod = new pg.Client({ connectionString: PROD })
const dev = new pg.Client({ connectionString: DEV })

function quoteIdent(id) { return '"' + id.replace(/"/g, '""') + '"' }

async function copyTable(table) {
  // colonnes reelles de la table cote dev (source de verite du schema)
  const cols = (await dev.query(
    `select column_name from information_schema.columns
     where table_schema='public' and table_name=$1
       and is_generated='NEVER' and column_default is distinct from 'GENERATED'
     order by ordinal_position`, [table]
  )).rows.map((r) => r.column_name)
  // exclut les colonnes generees (calculees) : on ne les insere pas
  const genCols = (await dev.query(
    `select column_name from information_schema.columns
     where table_schema='public' and table_name=$1 and is_generated='ALWAYS'`, [table]
  )).rows.map((r) => r.column_name)
  const insertable = cols.filter((c) => !genCols.includes(c))
  const colList = insertable.map(quoteIdent).join(', ')

  const total = (await prod.query(`select count(*)::int as n from public.${quoteIdent(table)}`)).rows[0].n
  process.stdout.write(`\n${table} : ${total} lignes a copier`)

  await dev.query(`truncate table public.${quoteIdent(table)} cascade`)

  let copied = 0
  for (let offset = 0; offset < total; offset += BATCH) {
    const rows = (await prod.query(
      `select ${colList} from public.${quoteIdent(table)} order by 1 limit ${BATCH} offset ${offset}`
    )).rows
    if (rows.length === 0) break
    // construit un INSERT multi-lignes parametre
    const params = []
    const tuples = rows.map((row) => {
      const ph = insertable.map((c) => { params.push(row[c]); return '$' + params.length })
      return '(' + ph.join(',') + ')'
    })
    await dev.query(
      `insert into public.${quoteIdent(table)} (${colList}) values ${tuples.join(',')} on conflict do nothing`,
      params
    )
    copied += rows.length
    process.stdout.write(`\r${table} : ${copied}/${total} copiees   `)
  }
  console.log(`\r${table} : ${copied}/${total} copiees. OK`)
}

try {
  await prod.connect()
  await dev.connect()
  console.log('Connecte PROD (lecture) + DEV (ecriture).')
  // desactive FK/triggers cote dev pendant le bulk-load (ordre + self-ref)
  await dev.query(`set session_replication_role = replica`)
  for (const t of TABLES) await copyTable(t)
  await dev.query(`set session_replication_role = default`)
  console.log('\n🎉 Seed des donnees de reference termine.')
} catch (e) {
  console.error('\nECHEC : ' + e.message)
  process.exitCode = 1
} finally {
  await prod.end().catch(() => {})
  await dev.end().catch(() => {})
}
