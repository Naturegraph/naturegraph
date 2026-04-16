/* eslint-disable no-console */
/**
 * @file scripts/seed-fr-cities.ts
 * @description Script de seed pour la table `fr_cities`.
 *
 * Télécharge les données de référence des communes françaises depuis le
 * package open-data @etalab/decoupage-administratif (licence ODbL, source IGN/INSEE),
 * les transforme au format attendu par la table, puis les insère via le
 * client Supabase avec la clé service role (bypass RLS).
 *
 * Environ 35 000 communes métropolitaines + DROM-COM.
 * L'insertion se fait par lots (BATCH_SIZE) avec upsert pour rendre le
 * script idempotent (ré-exécutable sans doublons).
 *
 * Variables d'environnement requises :
 *   SUPABASE_URL         — URL du projet Supabase (ex: https://xxxx.supabase.co)
 *   SUPABASE_SERVICE_KEY — Clé "service_role" (lecture/écriture complète, sans RLS)
 *
 * Usage :
 *   # Avec variables d'env explicites
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=... npx tsx scripts/seed-fr-cities.ts
 *
 *   # Avec un fichier .env.local (Node 20+ ou tsx --env-file)
 *   npx tsx --env-file=.env.local scripts/seed-fr-cities.ts
 *
 *   # Via le script npm
 *   npm run seed:cities
 *
 * Attribution : données IGN/INSEE distribuées par Etalab sous licence ODbL.
 * https://www.data.gouv.fr/fr/datasets/decoupage-administratif-communal-francais-issu-de-openstreetmap/
 */

import { createClient } from '@supabase/supabase-js'

// ─── Configuration ────────────────────────────────────────────────────────────

/** URL de base du package etalab sur unpkg CDN */
const ETALAB_BASE_URL = 'https://unpkg.com/@etalab/decoupage-administratif@4.0.0/data'

/**
 * Taille des lots d'insertion Supabase.
 * ~500 rows ≈ bon équilibre entre vitesse et limite payload Supabase (1 MB).
 */
const BATCH_SIZE = 500

// ─── Types source (etalab) ────────────────────────────────────────────────────

/**
 * Commune telle que retournée par communes.json (etalab).
 * Certains champs sont optionnels car absents pour les très petites communes
 * ou les entités spéciales.
 */
interface EtalabCommune {
  code: string
  nom: string
  codeDepartement: string
  codeRegion: string
  population?: number
  /** Point GeoJSON centroïde (lng, lat). Absent pour quelques communes. */
  centre?: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
}

/** Région telle que retournée par regions.json (etalab). */
interface EtalabRegion {
  code: string
  nom: string
}

/** Département tel que retourné par departements.json (etalab). */
interface EtalabDepartement {
  code: string
  nom: string
  codeRegion: string
}

// ─── Type cible (table fr_cities) ────────────────────────────────────────────

/**
 * Ligne prête à être insérée dans la table `public.fr_cities`.
 * Le centroïde est passé en WKT (Well-Known Text) — PostGIS accepte ce format
 * directement pour les colonnes GEOGRAPHY.
 */
interface FrCityRow {
  insee_code: string
  name: string
  name_normalized: string
  region_code: string
  region_name: string
  department_code: string
  department_name: string
  population: number | null
  /** Format WKT avec SRID explicite : "SRID=4326;POINT(lng lat)" */
  centroid: string
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

/**
 * Normalise un nom de commune pour la recherche floue trigram.
 * Opérations : NFC → NFD pour isoler les diacritiques → suppression des
 * marques d'accentuation → passage en minuscules.
 *
 * Exemples :
 *   "Saint-Étienne"  → "saint-etienne"
 *   "L'Île-Rousse"   → "l'ile-rousse"
 *   "Pézenas"        → "pezenas"
 *
 * @param text - Nom officiel de la commune
 * @returns Nom normalisé (minuscules, sans accents)
 */
function normalizeText(text: string): string {
  return (
    text
      // NFD décompose les caractères accentués en lettre de base + diacritique
      .normalize('NFD')
      // Supprime toutes les marques combinantes (accents, cédilles, etc.)
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  )
}

/**
 * Télécharge et parse un fichier JSON depuis une URL distante.
 * Lève une erreur explicite en cas de réponse non-OK.
 *
 * @param url - URL à télécharger
 * @returns Données parsées comme le type T
 */
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Échec du téléchargement (HTTP ${response.status}) : ${url}`)
  }
  return response.json() as Promise<T>
}

/**
 * Insère un lot de lignes dans `fr_cities` via upsert (idempotent).
 * En cas d'erreur Supabase, lève une exception avec le message détaillé.
 *
 * @param supabase - Client Supabase (service role)
 * @param rows     - Lot de lignes à insérer
 */
async function insertBatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient<any>>,
  rows: FrCityRow[],
): Promise<void> {
  const { error } = await supabase.from('fr_cities').upsert(rows, { onConflict: 'insee_code' })

  if (error) {
    throw new Error(`Erreur Supabase lors de l'insertion : ${error.message}`)
  }
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

/**
 * Fonction principale du script de seed.
 *
 * Étapes :
 *  1. Validation des variables d'environnement
 *  2. Téléchargement parallèle des 3 fichiers JSON etalab
 *  3. Construction des maps de noms région/département
 *  4. Transformation des communes → FrCityRow (skip si centroïde absent)
 *  5. Insertion par lots avec barre de progression
 */
async function main(): Promise<void> {
  // ── 1. Variables d'environnement ────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "❌  Variables d'environnement manquantes.\n" +
        '    Requis : SUPABASE_URL et SUPABASE_SERVICE_KEY\n\n' +
        '    Exemple :\n' +
        '      npx tsx --env-file=.env.local scripts/seed-fr-cities.ts',
    )
    process.exit(1)
  }

  // Client Supabase avec clé service role — contourne le RLS pour l'écriture
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // ── 2. Téléchargement des données etalab ────────────────────────────────
  console.log('📥  Téléchargement des données etalab...')

  const [communes, regions, departements] = await Promise.all([
    fetchJson<EtalabCommune[]>(`${ETALAB_BASE_URL}/communes.json`),
    fetchJson<EtalabRegion[]>(`${ETALAB_BASE_URL}/regions.json`),
    fetchJson<EtalabDepartement[]>(`${ETALAB_BASE_URL}/departements.json`),
  ])

  console.log(
    `    ✓ ${communes.length} communes, ${regions.length} régions, ${departements.length} départements`,
  )

  // ── 3. Maps de noms pour lookup O(1) ────────────────────────────────────

  /** code région → nom officiel de la région */
  const regionNameByCode = new Map<string, string>(regions.map((r) => [r.code, r.nom]))

  /** code département → nom officiel du département */
  const deptNameByCode = new Map<string, string>(departements.map((d) => [d.code, d.nom]))

  // ── 4. Transformation des communes ──────────────────────────────────────
  console.log('🔄  Transformation en cours...')

  let skippedCount = 0
  const rows: FrCityRow[] = []

  for (const commune of communes) {
    // On ignore les communes sans centroïde (très rares, ~quelques dizaines)
    // car la colonne `centroid` est NOT NULL dans la table.
    if (!commune.centre) {
      skippedCount++
      continue
    }

    // Les coordonnées GeoJSON sont [longitude, latitude] (convention RFC 7946)
    const [lng, lat] = commune.centre.coordinates

    // Noms de région et département (chaîne vide si code inconnu — ne devrait pas arriver)
    const regionName = regionNameByCode.get(commune.codeRegion) ?? ''
    const deptName = deptNameByCode.get(commune.codeDepartement) ?? ''

    // Sécurité : tronquer aux longueurs CHAR définies dans le schéma SQL
    // (region_code CHAR(2), department_code CHAR(3))
    const regionCode = commune.codeRegion.slice(0, 2)
    const deptCode = commune.codeDepartement.slice(0, 3)

    rows.push({
      insee_code: commune.code,
      name: commune.nom,
      name_normalized: normalizeText(commune.nom),
      region_code: regionCode,
      region_name: regionName,
      department_code: deptCode,
      department_name: deptName,
      population: commune.population ?? null,
      // WKT avec SRID explicite — format accepté par PostGIS pour GEOGRAPHY(POINT, 4326)
      centroid: `SRID=4326;POINT(${lng} ${lat})`,
    })
  }

  if (skippedCount > 0) {
    console.warn(`⚠️   ${skippedCount} commune(s) ignorée(s) (centroïde manquant)`)
  }

  console.log(`    ✓ ${rows.length} communes prêtes à l'insertion`)

  // ── 5. Insertion par lots ────────────────────────────────────────────────
  const batchCount = Math.ceil(rows.length / BATCH_SIZE)
  console.log(
    `\n🚀  Insertion de ${rows.length} lignes en ${batchCount} lots (taille : ${BATCH_SIZE})...`,
  )

  let insertedCount = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1

    await insertBatch(supabase, batch)
    insertedCount += batch.length

    // Barre de progression inline (écrasée à chaque itération)
    const pct = Math.round((insertedCount / rows.length) * 100)
    process.stdout.write(
      `\r    Lot ${batchIndex}/${batchCount} — ${insertedCount}/${rows.length} lignes (${pct}%)   `,
    )
  }

  // Saut de ligne après la progression
  process.stdout.write('\n')

  console.log(`\n✅  Seed terminé avec succès : ${insertedCount} communes insérées dans fr_cities`)

  if (skippedCount > 0) {
    console.log(
      `    (${skippedCount} commune(s) sans centroïde non insérée(s) — voir logs ci-dessus)`,
    )
  }
}

// Lancement avec gestion d'erreur globale
main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('\n❌  Erreur fatale :', message)
  process.exit(1)
})
