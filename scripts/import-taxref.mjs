/**
 * import-taxref.mjs — Import bulk du référentiel TAXREF dans taxref_cache
 * =========================================================================
 * Lit le fichier CSV TAXREF officiel (INPN), filtre les 5 groupes cibles
 * du MVP, puis insère par batch dans Supabase.
 *
 * Source : https://inpn.mnhn.fr/telechargement/cadreReglementaire/referentielEspece/TAXREF
 * Licence : CC-BY (mention obligatoire dans l'UI — voir TaxrefCredit.tsx)
 *
 * Usage :
 *   node scripts/import-taxref.mjs --file ./TAXREF_v18_0.csv [--dry-run] [--batch 500]
 *
 * Variables d'environnement requises (.env.local) :
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...  (service_role — jamais la clé anon)
 *
 * Groupes importés (MVP France) :
 *   Oiseaux | Mammifères | Insectes | Amphibiens | Reptiles
 *   → ~25 000–35 000 taxa selon la version TAXREF
 *
 * Format CSV TAXREF attendu (séparateur tabulation) :
 *   CD_NOM | CD_REF | RANG | LB_NOM | LB_AUTEUR | NOM_COMPLET |
 *   NOM_VALIDE | NOM_VERN | NOM_VERN_ENG | GROUP1_INPN | GROUP2_INPN |
 *   HABITAT | PHYLUM | CLASSE | ORDRE | FAMILLE | ...
 */

import { createClient } from '@supabase/supabase-js'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { resolve } from 'path'
import { parseArgs } from 'util'

// ─── Configuration ────────────────────────────────────────────────────────────

/** Groupes taxonomiques cibles pour le MVP */
const TARGET_GROUPS = new Map([
  ['Oiseaux',     'birds'],
  ['Mammifères',  'mammals'],
  ['Insectes',    'insects'],
  ['Amphibiens',  'amphibians'],
  ['Reptiles',    'reptiles'],
])

/** TTL du cache : 90 jours */
const CACHE_TTL_DAYS = 90

/** Version TAXREF importée — mettre à jour à chaque nouvel import */
const TAXREF_VERSION = 'v18'

/** Taille des batches pour les inserts (évite les timeouts Supabase) */
const DEFAULT_BATCH_SIZE = 500

// ─── Parsing des arguments CLI ────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    file:    { type: 'string',  short: 'f' },
    'dry-run': { type: 'boolean', default: false },
    batch:   { type: 'string',  default: String(DEFAULT_BATCH_SIZE) },
    group:   { type: 'string'  }, // filtrer un seul groupe (ex: --group Oiseaux)
  },
  strict: false,
})

if (!args.file) {
  console.error('❌  Usage: node scripts/import-taxref.mjs --file ./TAXREF_vXX.csv')
  process.exit(1)
}

const CSV_PATH    = resolve(args.file)
const DRY_RUN     = args['dry-run'] === true
const BATCH_SIZE  = parseInt(args.batch ?? String(DEFAULT_BATCH_SIZE), 10)
const GROUP_FILTER = args.group ?? null

// ─── Client Supabase (service_role) ──────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Variables manquantes : SUPABASE_URL et SUPABASE_SERVICE_KEY requis dans .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Calcule la date d'expiration du cache (NOW + TTL).
 */
function expiresAt() {
  const d = new Date()
  d.setDate(d.getDate() + CACHE_TTL_DAYS)
  return d.toISOString()
}

/**
 * Mappe une ligne CSV TAXREF vers une entrée taxref_cache.
 * @param {Record<string, string>} row - ligne parsée
 * @returns {object|null} entrée Supabase ou null si ligne à ignorer
 */
function mapRow(row) {
  const group2 = (row['GROUP2_INPN'] ?? '').trim()

  // Filtrage par groupe
  if (GROUP_FILTER && group2 !== GROUP_FILTER) return null
  if (!TARGET_GROUPS.has(group2)) return null

  const cdNom = (row['CD_NOM'] ?? '').trim()
  const cdRef  = (row['CD_REF']  ?? '').trim()
  if (!cdNom || !cdRef) return null

  // Nom scientifique : LB_NOM (nom valide sans auteur)
  const scientificName = (row['LB_NOM'] ?? '').trim()
  if (!scientificName) return null

  return {
    cd_nom:           cdNom,
    cd_ref:           cdRef || null,
    scientific_name:  scientificName,
    common_name_fr:   (row['NOM_VERN'] ?? '').trim()     || null,
    common_name_en:   (row['NOM_VERN_ENG'] ?? '').trim() || null,
    author:           (row['LB_AUTEUR'] ?? '').trim()    || null,
    kingdom:          (row['REGNO'] ?? '').trim()         || null,
    phylum:           (row['PHYLUM'] ?? '').trim()        || null,
    class_name:       (row['CLASSE'] ?? '').trim()        || null,
    order:            (row['ORDRE'] ?? '').trim()         || null,
    family:           (row['FAMILLE'] ?? '').trim()       || null,
    genus:            extractGenus(scientificName),
    rank:             (row['RANG'] ?? '').trim()          || null,
    group:            TARGET_GROUPS.get(group2),
    conservation_status: null, // enrichi Phase 2 via liste rouge UICN
    taxref_version:   TAXREF_VERSION,
    cached_at:        new Date().toISOString(),
    expires_at:       expiresAt(),
  }
}

/**
 * Extrait le genre depuis le nom scientifique (premier mot).
 */
function extractGenus(scientificName) {
  const parts = scientificName.trim().split(' ')
  return parts.length > 0 ? parts[0] : null
}

/**
 * Parse une ligne TSV avec gestion des guillemets.
 */
function parseTsvLine(line, headers) {
  const values = line.split('\t')
  const row = {}
  headers.forEach((h, i) => {
    row[h] = (values[i] ?? '').replace(/^"|"$/g, '').trim()
  })
  return row
}

/**
 * Insère un batch dans Supabase avec upsert (cd_nom = clé primaire).
 */
async function insertBatch(batch, batchIndex) {
  if (DRY_RUN) {
    console.log(`  [dry-run] batch ${batchIndex} — ${batch.length} lignes (non insérées)`)
    return { error: null }
  }

  const { error } = await supabase
    .from('taxref_cache')
    .upsert(batch, { onConflict: 'cd_nom', ignoreDuplicates: false })

  return { error }
}

// ─── Script principal ─────────────────────────────────────────────────────────

async function main() {
  console.log('🌿  Import TAXREF → taxref_cache')
  console.log(`    Fichier  : ${CSV_PATH}`)
  console.log(`    Groupes  : ${GROUP_FILTER ?? [...TARGET_GROUPS.keys()].join(', ')}`)
  console.log(`    Batch    : ${BATCH_SIZE}`)
  console.log(`    Dry-run  : ${DRY_RUN}`)
  console.log()

  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  })

  let headers        = null
  let batch          = []
  let totalRead      = 0
  let totalInserted  = 0
  let totalSkipped   = 0
  let totalErrors    = 0
  let batchIndex     = 0

  for await (const line of rl) {
    // Première ligne = en-têtes
    if (!headers) {
      headers = line.split('\t').map(h => h.replace(/^"|"$/g, '').trim())
      console.log(`📋  Colonnes détectées : ${headers.slice(0, 8).join(' | ')} ...`)
      continue
    }

    if (!line.trim()) continue

    totalRead++
    const row  = parseTsvLine(line, headers)
    const entry = mapRow(row)

    if (!entry) {
      totalSkipped++
      continue
    }

    batch.push(entry)

    // Flush du batch
    if (batch.length >= BATCH_SIZE) {
      batchIndex++
      process.stdout.write(`  Batch ${batchIndex} (${batch.length} entrées)... `)
      const { error } = await insertBatch(batch, batchIndex)

      if (error) {
        console.error(`❌  erreur: ${error.message}`)
        totalErrors += batch.length
      } else {
        console.log('✅')
        totalInserted += batch.length
      }

      batch = []
    }
  }

  // Dernier batch (reste)
  if (batch.length > 0) {
    batchIndex++
    process.stdout.write(`  Batch ${batchIndex} (${batch.length} entrées, dernier)... `)
    const { error } = await insertBatch(batch, batchIndex)

    if (error) {
      console.error(`❌  erreur: ${error.message}`)
      totalErrors += batch.length
    } else {
      console.log('✅')
      totalInserted += batch.length
    }
  }

  // Résumé
  console.log()
  console.log('─────────────────────────────────────')
  console.log(`🌿  Import terminé`)
  console.log(`    Lignes lues     : ${totalRead.toLocaleString()}`)
  console.log(`    Insérées        : ${totalInserted.toLocaleString()}`)
  console.log(`    Ignorées        : ${totalSkipped.toLocaleString()}`)
  console.log(`    Erreurs         : ${totalErrors.toLocaleString()}`)
  console.log()

  if (!DRY_RUN && totalInserted > 0) {
    console.log('💡  Maintenant, exécuter dans Supabase SQL Editor :')
    console.log('    UPDATE public.taxref_cache SET search_vector = (')
    console.log("      setweight(to_tsvector('french', coalesce(common_name_fr, '')), 'A') ||")
    console.log("      setweight(to_tsvector('simple',  coalesce(scientific_name, '')), 'B')")
    console.log('    );')
    console.log('    → Peuple le search_vector sur toutes les lignes importées.')
  }
}

main().catch(err => {
  console.error('❌  Erreur fatale:', err)
  process.exit(1)
})
