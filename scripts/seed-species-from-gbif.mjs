/**
 * seed-species-from-gbif.mjs — Import ~5000 espèces depuis GBIF → species_master
 * ==============================================================================
 *
 * Objectif (Nicolas 2026-05-20) : peupler `species_master` avec ~5000 espèces
 * RÉELLES pour couvrir une beta de 50-100 utilisateurs sans manquer d'espèces.
 *
 * Source : API GBIF Backbone Taxonomy (CC0, aucune authentification).
 *   - Endpoint /species/search → `vernacularNames` retournés INLINE
 *     (1 appel = jusqu'à 1000 espèces avec leurs noms FR + EN).
 *
 * Stratégie qualité :
 *   - On ne garde QUE les espèces ayant un nom vernaculaire FRANÇAIS
 *     (sinon introuvable par un francophone → bruit inutile + bon proxy de
 *     popularité). Binôme strict Genus species. Dédoublonnage par nom sci.
 *   - Insectes : on cible les ORDRES bien couverts en FR (papillons,
 *     libellules, coléoptères…) plutôt que toute la classe Insecta dont
 *     la couverture vernaculaire FR est très partielle.
 *
 * Écriture : upsert direct via l'API REST PostgREST de Supabase
 *   (POST /rest/v1/species_master avec Prefer: resolution=merge-duplicates).
 *   Nécessite que le rôle `anon` ait temporairement INSERT/UPDATE sur la
 *   table (grant accordé puis révoqué autour de l'exécution — cf. doc PRD).
 *
 * Usage : node scripts/seed-species-from-gbif.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Lecture des credentials Supabase depuis .env.local ──────────────────────

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
// Préférence service_role (bypass RLS, pas besoin de grant temporaire).
// Fallback anon key (nécessite alors un GRANT INSERT,UPDATE temporaire sur
// species_master au rôle anon — voir doc en tête de fichier).
const SUPABASE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.VITE_SUPABASE_ANON_KEY
const USING_SERVICE_ROLE = !!ENV.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '❌ VITE_SUPABASE_URL + (SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_ANON_KEY) requis dans .env.local',
  )
  process.exit(1)
}
console.log(
  USING_SERVICE_ROLE
    ? '🔑 Auth Supabase : service_role (bypass RLS)'
    : '🔑 Auth Supabase : anon (nécessite GRANT temporaire INSERT/UPDATE)',
)

// ─── Configuration des groupes taxonomiques ─────────────────────────────────
//
// `keys` = clés GBIF Backbone (vérifiées via /species/match 2026-05-20).
// `quota` = nombre cible d'espèces FR-nommées pour ce groupe.
//
// V2 (Nicolas 2026-05-24) : on RESTE sur les 5 catégories actuelles de la
// beta — pas de nouveaux groupes pour l'instant (plants/fish/arachnids/
// mollusks ne sont pas exposés dans les filtres produit). On enrichit
// uniquement ce qui est déjà filtrable + boost régional Canada pour les
// users du Québec qui ne trouvent pas leurs espèces locales.

const GROUPS = [
  // V3 (Nicolas 2026-05-24) : objectif 15k espèces, quotas poussés au max
  // de la couverture vernaculaire FR raisonnable. La qualité prime sur le
  // quota — si GBIF n a plus de noms FR, le groupe s arrête naturellement.
  //
  // Oiseaux : ~10 000 espèces mondiales, ~5000 avec nom FR. Quota porté à 4500.
  { group: 'birds', label: 'Oiseaux', keys: [212], quota: 4500 },
  // Mammifères : ~6 500 espèces mondiales, ~2500 avec nom FR (mégafaune,
  // domestiques, cétacés, rongeurs populaires).
  { group: 'mammals', label: 'Mammifères', keys: [359], quota: 2500 },
  // Insectes : ordres ciblés (papillons, libellules, coléoptères, abeilles,
  // sauterelles, punaises). Potentiel énorme et insectes très observés.
  {
    group: 'insects',
    label: 'Insectes',
    keys: [797, 789, 1470, 1457, 1458, 809],
    quota: 5500,
  },
  // Amphibiens : ~8000 espèces mondiales, couverture FR plus limitée.
  { group: 'amphibians', label: 'Amphibiens', keys: [131], quota: 1200 },
  // Reptiles : ~11000 espèces mondiales (Squamata + Testudines).
  { group: 'reptiles', label: 'Reptiles', keys: [11592253, 11418114], quota: 1500 },
]

// Boost régional, pour chaque groupe on récupère jusqu à N espèces
// additionnelles via l occurrence facet du pays. V3 : boost relevé à 1500
// par pays et par groupe pour pousser la couverture locale (Québec + France).
const REGIONAL_BOOSTS = [
  { countryCode: 'CA', label: '🇨🇦', perGroup: 1500 },
  { countryCode: 'FR', label: '🇫🇷', perGroup: 1500 },
]

const GBIF_SEARCH = 'https://api.gbif.org/v1/species/search'
const PAGE_SIZE = 1000
// Garde-fou : 50 * 1000 = 50k espèces scannées max/clé. Augmenté pour
// permettre d'atteindre les nouveaux quotas (insects 4000 notamment).
const MAX_PAGES_PER_KEY = 50

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Fetch JSON avec 4 tentatives + TIMEOUT 30s par requête.
 *
 * Le timeout est critique : `fetch()` n'a aucun timeout par défaut, donc une
 * connexion GBIF qui pend (réponse jamais reçue) bloquerait le script à
 * l'infini. AbortController coupe au bout de 30s → la tentative échoue →
 * on retente. (Bug observé 2026-05-20 : script figé 26 min sur un fetch.)
 */
async function fetchJson(url, options = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)
    try {
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${await res.text()}`)
      const text = await res.text()
      return text ? JSON.parse(text) : null
    } catch (err) {
      clearTimeout(timer)
      if (attempt === 4) throw err
      await sleep(1000 * attempt)
    }
  }
}

/** 1er nom vernaculaire d'une langue dans le tableau GBIF inline. */
function pickVernacular(vernacularNames, lang) {
  if (!Array.isArray(vernacularNames)) return null
  const hit = vernacularNames.find((v) => v.language === lang && v.vernacularName)
  return hit ? hit.vernacularName.trim() : null
}

/** Récupère les espèces FR-nommées d'un groupe taxonomique. */
async function fetchGroup({ group, label, keys, quota }) {
  const collected = new Map() // scientific_name → { fr, en }
  console.log(`\n── ${label} (${group}) — cible ${quota} ──`)

  for (const key of keys) {
    if (collected.size >= quota) break
    for (let page = 0; page < MAX_PAGES_PER_KEY; page++) {
      if (collected.size >= quota) break
      const url =
        `${GBIF_SEARCH}?rank=SPECIES&status=ACCEPTED&highertaxonKey=${key}` +
        `&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
      let data
      try {
        data = await fetchJson(url)
      } catch (err) {
        console.warn(`   ⚠️  clé ${key} page ${page} : ${err.message}`)
        break
      }
      const results = data.results ?? []
      if (results.length === 0) break

      for (const sp of results) {
        const sci = (sp.canonicalName || sp.scientificName || '').trim()
        if (!sci || sci.split(/\s+/).length !== 2) continue // binôme strict
        if (collected.has(sci)) continue
        const fr = pickVernacular(sp.vernacularNames, 'fra')
        if (!fr) continue // filtre qualité : FR obligatoire
        collected.set(sci, { fr, en: pickVernacular(sp.vernacularNames, 'eng') })
        if (collected.size >= quota) break
      }
      console.log(`   clé ${key} page ${page} → ${collected.size}/${quota}`)
      if (data.endOfRecords) break
      await sleep(200)
    }
  }
  console.log(`   ✅ ${label} : ${collected.size} espèces`)
  return Array.from(collected.entries()).map(([sci, names], idx) => ({
    scientific_name: sci,
    common_name_fr: names.fr,
    common_name_en: names.en,
    taxonomic_group: group,
    source: 'gbif',
    is_active: true,
    // Popularité : léger gradient décroissant (premières pages = taxons centraux).
    popularity: Math.max(20, 55 - Math.floor(idx / 60)),
  }))
}

/**
 * Boost régional — pour un pays donné, récupère les `speciesKey` les plus
 * observés via la facette `/occurrence/search`, puis fetch les détails
 * (nom FR/EN + binôme) via /species/{key}.
 *
 * Cible Nicolas 2026-05-24 : les users beta (FR + QC) doivent retrouver les
 * espèces qu'ils observent réellement sur leur territoire. La passe globale
 * GBIF privilégie les taxons « centraux » — on complète ici par les espèces
 * les plus observées localement dans chaque pays beta.
 */
async function fetchRegional({ group, label, keys }, { countryCode, label: flag, perGroup }) {
  const collected = new Map()
  console.log(`\n   ${flag} Boost régional ${countryCode} pour ${label}…`)

  for (const key of keys) {
    if (collected.size >= perGroup) break
    // Facette speciesKey limitée à 1000 entrées (limite GBIF), triées par
    // décompte d'occurrences décroissant. On évite ainsi les espèces rares
    // ou les déterminations imprécises au profit des observations massives.
    const url =
      `https://api.gbif.org/v1/occurrence/search?country=${countryCode}` +
      `&taxonKey=${key}&facet=speciesKey&facetLimit=1000&limit=0`
    let data
    try {
      data = await fetchJson(url)
    } catch (err) {
      console.warn(`      ⚠️  clé ${key} : ${err.message}`)
      continue
    }
    const facets = (data.facets || []).find((f) => f.field === 'SPECIES_KEY')
    if (!facets) continue
    const counts = facets.counts ?? []
    for (let i = 0; i < counts.length && collected.size < perGroup; i += 20) {
      const batch = counts.slice(i, i + 20)
      const details = await Promise.all(
        batch.map((c) =>
          fetchJson(`https://api.gbif.org/v1/species/${c.name}`).catch(() => null),
        ),
      )
      for (const sp of details) {
        if (!sp) continue
        const sci = (sp.canonicalName || sp.scientificName || '').trim()
        if (!sci || sci.split(/\s+/).length !== 2) continue
        if (collected.has(sci)) continue
        const fr = pickVernacular(sp.vernacularNames, 'fra')
        if (!fr) continue // qualité FR obligatoire
        collected.set(sci, { fr, en: pickVernacular(sp.vernacularNames, 'eng') })
      }
      await sleep(200)
    }
  }
  console.log(`      ✓ ${collected.size} espèces ${countryCode} additionnelles`)
  return Array.from(collected.entries()).map(([sci, names], idx) => ({
    scientific_name: sci,
    common_name_fr: names.fr,
    common_name_en: names.en,
    taxonomic_group: group,
    source: 'gbif',
    is_active: true,
    // Popularité légèrement boostée pour les espèces régionales (priorité
    // dans l'autocomplete pour les users locaux).
    popularity: Math.max(30, 60 - Math.floor(idx / 50)),
  }))
}

/** Upsert un batch dans species_master via PostgREST (merge sur scientific_name). */
async function upsertBatch(rows) {
  await fetchJson(`${SUPABASE_URL}/rest/v1/species_master?on_conflict=scientific_name`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌿 Import GBIF → species_master (v2 — étendu + boost CA)\n')
  const all = []
  for (const cfg of GROUPS) {
    all.push(...(await fetchGroup(cfg)))
    for (const boost of REGIONAL_BOOSTS) {
      all.push(...(await fetchRegional(cfg, boost)))
    }
  }

  // Dédoublonnage global (une espèce peut matcher 2 clés OU être présente
  // dans la passe principale ET dans le boost régional).
  const seen = new Set()
  const unique = all.filter((s) => !seen.has(s.scientific_name) && seen.add(s.scientific_name))

  console.log(`\n══════════════════════════════════════════`)
  console.log(`TOTAL fetché : ${unique.length} espèces uniques FR-nommées`)
  const byGroup = {}
  for (const s of unique) byGroup[s.taxonomic_group] = (byGroup[s.taxonomic_group] ?? 0) + 1
  for (const [g, c] of Object.entries(byGroup).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${g.padEnd(12)} ${c}`)
  }

  // Upsert vers Supabase par batchs de 500.
  console.log(`\n── Upsert vers Supabase (batchs de 500) ──`)
  const BATCH = 500
  let done = 0
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH)
    try {
      await upsertBatch(batch)
      done += batch.length
      console.log(`   ${done}/${unique.length} upserted`)
    } catch (err) {
      console.error(`   ❌ batch ${i}-${i + batch.length} : ${err.message}`)
      throw err
    }
  }
  console.log(`\n✅ ${done} espèces upsertées dans species_master`)
}

main().catch((err) => {
  console.error('❌ Échec import :', err)
  process.exit(1)
})
