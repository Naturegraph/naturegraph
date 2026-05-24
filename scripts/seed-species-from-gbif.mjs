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
// V2 (Nicolas 2026-05-24) : étendu à ~10 000 espèces avec ajout de plants,
// fish, arachnids, mollusks pour couvrir tous les groupes du type
// `TaxonomicGroup`. Boost régional Canada via fetchRegional() qui ajoute
// jusqu'à 500 espèces additionnelles par groupe observées au Canada.

const GROUPS = [
  { group: 'birds', label: 'Oiseaux', keys: [212], quota: 2000 },
  { group: 'mammals', label: 'Mammifères', keys: [359], quota: 1200 },
  // Insectes : ordres ciblés (bien couverts en FR) au lieu de toute Insecta.
  // Lepidoptera (papillons), Odonata (libellules), Coleoptera (coléoptères),
  // Hymenoptera (abeilles/guêpes), Orthoptera (sauterelles), Hemiptera (punaises).
  {
    group: 'insects',
    label: 'Insectes',
    keys: [797, 789, 1470, 1457, 1458, 809],
    quota: 2000,
  },
  { group: 'amphibians', label: 'Amphibiens', keys: [131], quota: 500 },
  // Reptiles : Squamata (lézards + serpents) + Testudines (tortues).
  { group: 'reptiles', label: 'Reptiles', keys: [11592253, 11418114], quota: 500 },
  // ── V2 — nouveaux groupes ────────────────────────────────────────────────
  // Plantes : Plantae racine. Quota ambitieux car couverture FR très large
  // (flore métropolitaine + nord-américaine bien documentée).
  { group: 'plants', label: 'Plantes', keys: [6], quota: 2500 },
  // Poissons : Actinopterygii (poissons à nageoires rayonnées, ~99% des
  // poissons modernes). On exclut Chondrichthyes (requins) — moins
  // d'observations citoyennes terrestres.
  { group: 'fish', label: 'Poissons', keys: [204], quota: 800 },
  // Arachnides : Arachnida (araignées, scorpions, opilions, acariens).
  { group: 'arachnids', label: 'Arachnides', keys: [367], quota: 300 },
  // Mollusques : Mollusca (escargots, limaces, bivalves).
  { group: 'mollusks', label: 'Mollusques', keys: [52], quota: 300 },
]

// Boost régional — pour chaque groupe, on récupère jusqu'à N espèces
// additionnelles via l'occurrence facet du Canada. Permet d'avoir une
// meilleure couverture des espèces effectivement observées au Québec
// (Nicolas 2026-05-24 : « je ne trouve aucune espèce du territoire »).
const REGIONAL_BOOST = {
  enabled: true,
  countryCode: 'CA',
  perGroup: 500,
}

const GBIF_SEARCH = 'https://api.gbif.org/v1/species/search'
const PAGE_SIZE = 1000
const MAX_PAGES_PER_KEY = 20 // garde-fou : 20 * 1000 = 20k espèces scannées max/clé

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
 * Boost régional Canada — récupère les `speciesKey` les plus observés au
 * Canada pour un groupe via la facette `/occurrence/search`, puis fetch les
 * détails (nom FR/EN + binôme) via /species/{key}.
 *
 * Cible Nicolas 2026-05-24 : les users beta du Québec doivent retrouver les
 * espèces qu'ils observent réellement sur leur territoire. La passe globale
 * GBIF privilégie les taxons « centraux » (souvent européens) — on complète
 * ici par les espèces les plus observées localement.
 */
async function fetchRegional({ group, label, keys, _quota }) {
  if (!REGIONAL_BOOST.enabled) return []
  const collected = new Map()
  console.log(`\n   🇨🇦 Boost régional ${REGIONAL_BOOST.countryCode} pour ${label}…`)

  for (const key of keys) {
    if (collected.size >= REGIONAL_BOOST.perGroup) break
    // Facette speciesKey limitée à 1000 entrées (limite GBIF), triées par
    // décompte d'occurrences décroissant. On évite ainsi les espèces rares
    // ou les déterminations imprécises au profit des observations massives.
    const url =
      `https://api.gbif.org/v1/occurrence/search?country=${REGIONAL_BOOST.countryCode}` +
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
    // On fetch les détails de chaque speciesKey en parallèle par lots de 20.
    const counts = facets.counts ?? []
    for (let i = 0; i < counts.length && collected.size < REGIONAL_BOOST.perGroup; i += 20) {
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
        // Nom vernaculaire : fetch séparé /species/{key}/vernacularNames
        // si pas inline. Pour limiter les appels on accepte les espèces sans
        // FR (les espèces canadiennes locales n'ont pas toujours un nom FR
        // officiel — on garde le binôme scientifique).
        const fr = pickVernacular(sp.vernacularNames, 'fra')
        if (!fr) continue // qualité FR obligatoire
        collected.set(sci, { fr, en: pickVernacular(sp.vernacularNames, 'eng') })
      }
      await sleep(200)
    }
  }
  console.log(`      ✓ ${collected.size} espèces ${REGIONAL_BOOST.countryCode} additionnelles`)
  return Array.from(collected.entries()).map(([sci, names], idx) => ({
    scientific_name: sci,
    common_name_fr: names.fr,
    common_name_en: names.en,
    taxonomic_group: group,
    source: 'gbif',
    is_active: true,
    // Popularité légèrement boostée pour les espèces canadiennes (priorité
    // dans l'autocomplete pour les users du QC).
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
    all.push(...(await fetchRegional(cfg)))
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
