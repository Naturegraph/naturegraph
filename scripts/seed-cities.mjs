/**
 * seed-cities.mjs — Seed `fr_cities` : communes FR + municipalités QC
 * ====================================================================
 *
 * Objectif (Nicolas 2026-05-20) : blinder le socle de localisation pour
 * la beta FR + Québec. La table `fr_cities` est le FALLBACK offline de
 * la recherche de ville (la source primaire = API Adresse data.gouv.fr,
 * cf. src/lib/location/geocoding.ts).
 *
 * Deux sources, toutes deux open-data et sans authentification :
 *
 *   FRANCE  — @etalab/decoupage-administratif (ODbL, IGN/INSEE)
 *             ~35 000 communes métropole + DROM-COM, avec centroïde.
 *
 *   QUÉBEC  — dataset GeoNames hébergé par OpenDataSoft (CC-BY)
 *             municipalités du Québec (admin1_code = 10) pop > 1000,
 *             ~488 villes avec coordonnées.
 *             → indispensable : l'API Adresse data.gouv.fr est FR-only,
 *               un testeur québécois ne trouve pas sa ville sans ça.
 *
 * Écriture : upsert via l'API REST PostgREST de Supabase (le rôle `anon`
 * doit avoir temporairement INSERT/UPDATE sur `fr_cities` — grant accordé
 * puis révoqué autour de l'exécution).
 *
 * Idempotent : ON CONFLICT (insee_code) — relançable sans doublon.
 *
 * Usage : node scripts/seed-cities.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Credentials Supabase (.env.local) ───────────────────────────────────────

function loadEnv() {
  const raw = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const ENV = loadEnv()
const SUPABASE_URL = ENV.VITE_SUPABASE_URL
const SUPABASE_KEY = ENV.VITE_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants dans .env.local')
  process.exit(1)
}

// ─── Sources ─────────────────────────────────────────────────────────────────

const ETALAB = 'https://unpkg.com/@etalab/decoupage-administratif@4.0.0/data'
const ODS_GEONAMES =
  'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/' +
  'geonames-all-cities-with-a-population-1000/records'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Normalise un nom pour la recherche trigram (minuscules, sans accents). */
function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Fetch JSON avec timeout 30s + 4 tentatives (réseau capricieux). */
async function fetchJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)
    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      clearTimeout(timer)
      if (attempt === 4) throw err
      await sleep(1000 * attempt)
    }
  }
}

// ─── Construction des lignes FRANCE ──────────────────────────────────────────
//
// Nicolas 2026-05-21 : on passe de GeoNames (pop > 1000 — ~9 000 villes FR
// seulement) à `geo.api.gouv.fr/communes` qui expose les ~35 000 communes
// officielles INSEE avec centroïde (`centre`), code département, code région
// et population. Source primaire IGN/INSEE, licence ODbL.

async function buildFranceRows() {
  console.log('🇫🇷 Téléchargement noms région/département + 35 000 communes (geo.api.gouv.fr)…')

  // Noms région / département depuis Etalab (codes INSEE = ceux de geo.api.gouv.fr).
  const [regions, departements] = await Promise.all([
    fetchJson(`${ETALAB}/regions.json`),
    fetchJson(`${ETALAB}/departements.json`),
  ])
  const regionName = new Map(regions.map((r) => [r.code, r.nom]))
  const deptName = new Map(departements.map((d) => [d.code, d.nom]))

  // geo.api.gouv.fr ne paginate pas — un seul appel renvoie l'ensemble (~9 Mo JSON).
  // `centre` = GeoJSON Point [lon, lat]. Inclut métropole + DROM-COM (codes 97*).
  const url =
    'https://geo.api.gouv.fr/communes?fields=nom,code,codeDepartement,codeRegion,population,centre&format=json&geometry=centre'
  const data = await fetchJson(url)

  const rows = []
  for (const c of data) {
    if (!c.centre?.coordinates || !c.nom || !c.code) continue
    const [lon, lat] = c.centre.coordinates
    rows.push({
      // Code INSEE officiel (5 caractères, ex: '38185' = Grenoble).
      insee_code: c.code,
      name: c.nom,
      name_normalized: normalize(c.nom),
      region_code: c.codeRegion ?? 'FR',
      region_name: regionName.get(c.codeRegion) ?? '',
      department_code: c.codeDepartement ?? 'FR',
      department_name: deptName.get(c.codeDepartement) ?? '',
      population: c.population ?? null,
      centroid: `SRID=4326;POINT(${lon} ${lat})`,
    })
  }
  console.log(`   ✓ ${rows.length} communes FR (INSEE officiel)`)
  return rows
}

// ─── Construction des lignes QUÉBEC ──────────────────────────────────────────

async function buildQuebecRows() {
  console.log('🍁 Téléchargement GeoNames Québec (OpenDataSoft)…')
  const rows = []
  const limit = 100
  for (let offset = 0; offset < 2000; offset += limit) {
    // admin1_code = 10 → province de Québec ; pop > 1000 (filtre du dataset).
    const url =
      `${ODS_GEONAMES}?where=country_code%3D%22CA%22%20AND%20admin1_code%3D%2210%22` +
      `&limit=${limit}&offset=${offset}&order_by=population%20DESC`
    const data = await fetchJson(url)
    const results = data.results ?? []
    if (results.length === 0) break

    results.forEach((r, i) => {
      const coord = r.coordinates
      if (!coord || !r.name) return
      const idx = offset + i + 1
      rows.push({
        // Code synthétique Q + index (ordre population stable → idempotent).
        insee_code: `Q${String(idx).padStart(4, '0')}`,
        name: r.name,
        name_normalized: normalize(r.name),
        region_code: 'QC',
        region_name: 'Québec',
        department_code: 'QC',
        department_name: 'Québec',
        population: r.population ?? null,
        centroid: `SRID=4326;POINT(${coord.lon} ${coord.lat})`,
      })
    })
    if (results.length < limit) break
    await sleep(200)
  }
  console.log(`   ✓ ${rows.length} municipalités QC`)
  return rows
}

// ─── Upsert PostgREST ────────────────────────────────────────────────────────

async function upsertBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/fr_cities?on_conflict=insee_code`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    throw new Error(`Upsert HTTP ${res.status} — ${await res.text()}`)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📍 Seed fr_cities — communes FR + municipalités QC\n')

  const [franceRows, quebecRows] = await Promise.all([buildFranceRows(), buildQuebecRows()])
  const all = [...franceRows, ...quebecRows]

  // Dédoublonnage par insee_code (sécurité — ne devrait pas arriver).
  const seen = new Set()
  const unique = all.filter((r) => !seen.has(r.insee_code) && seen.add(r.insee_code))

  console.log(`\n══════════════════════════════════════════`)
  console.log(`TOTAL : ${unique.length} villes (${franceRows.length} FR + ${quebecRows.length} QC)`)

  const BATCH = 500
  let done = 0
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH)
    try {
      await upsertBatch(batch)
      done += batch.length
      if (done % 5000 === 0 || done === unique.length) {
        console.log(`   ${done}/${unique.length} upserted`)
      }
    } catch (err) {
      console.error(`   ❌ batch ${i}-${i + batch.length} : ${err.message}`)
      throw err
    }
  }
  console.log(`\n✅ ${done} villes upsertées dans fr_cities`)
}

main().catch((err) => {
  console.error('❌ Échec seed :', err)
  process.exit(1)
})
