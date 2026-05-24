/**
 * Geocoding — Wrapper API Adresse (data.gouv.fr)
 * ================================================
 * Service public officiel, RGPD-compliant, sans clé API.
 * Données IGN/BAN (Base Adresse Nationale).
 *
 * Endpoints :
 *   - /search → autocomplete ville depuis texte
 *   - /reverse → ville depuis coordonnées GPS
 *
 * Fallback : si l'API est indisponible, on passe par la RPC
 * Supabase search_cities (données fr_cities en DB).
 *
 * Eco-conception :
 *   - Debounce géré dans le hook useLocationAutocomplete
 *   - Cache React Query (staleTime 24h) pour éviter les appels répétés
 *   - Max 5 résultats par requête
 */

import type { AdresseFeature, AdresseSearchResponse, CityResult } from '@/types/location'

// ─── Configuration ────────────────────────────────────────────

const API_BASE = 'https://api-adresse.data.gouv.fr'
const DEFAULT_LIMIT = 5
const FETCH_TIMEOUT_MS = 8000

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Extrait le code département et le nom de région depuis le contexte.
 * Le champ "context" de l'API Adresse a le format :
 *   "38, Isère, Auvergne-Rhône-Alpes"
 */
function parseContext(context: string): {
  departmentCode: string
  departmentName: string
  regionName: string
} {
  const parts = context.split(', ')
  return {
    departmentCode: parts[0] ?? '',
    departmentName: parts[1] ?? '',
    regionName: parts[2] ?? parts[1] ?? '',
  }
}

/**
 * Transforme une feature GeoJSON API Adresse en CityResult normalisé.
 */
function featureToCityResult(feature: AdresseFeature): CityResult {
  const [lng, lat] = feature.geometry.coordinates
  const { departmentCode, departmentName, regionName } = parseContext(feature.properties.context)

  return {
    inseeCode: feature.properties.id,
    name: feature.properties.name,
    regionName,
    departmentName,
    departmentCode,
    population: feature.properties.population ?? null,
    centroidLat: lat,
    centroidLng: lng,
    // API Adresse data.gouv.fr → communes françaises uniquement.
    country: 'France',
  }
}

/**
 * Wrapper fetch avec timeout pour éviter les requêtes pendantes.
 */
async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

// ─── API publique ─────────────────────────────────────────────

/**
 * Recherche des villes françaises depuis un texte saisi.
 *
 * @param query   - Texte de recherche (ex: "Grenoble", "St Etienne")
 * @param limit   - Nombre max de résultats (défaut: 5)
 * @returns       - Liste de CityResult triée par pertinence
 *
 * @example
 * const cities = await searchCities('Grenob')
 * // → [{ name: 'Grenoble', regionName: 'Auvergne-Rhône-Alpes', ... }]
 */
export async function searchCities(query: string, limit = DEFAULT_LIMIT): Promise<CityResult[]> {
  if (!query.trim() || query.trim().length < 2) return []

  const url = new URL(`${API_BASE}/search/`)
  url.searchParams.set('q', query.trim())
  url.searchParams.set('type', 'municipality')
  url.searchParams.set('limit', String(limit))

  try {
    const response = await fetchWithTimeout(url.toString())
    if (!response.ok) throw new Error(`API Adresse HTTP ${response.status}`)

    const data: AdresseSearchResponse = await response.json()
    return data.features.map(featureToCityResult)
  } catch (error) {
    // Timeout ou erreur réseau — on retourne un tableau vide
    // Le hook gère le fallback via Supabase RPC search_cities
    console.warn('[geocoding] API Adresse unavailable:', error)
    return []
  }
}

/**
 * Reverse geocoding : trouve la ville la plus proche d'un point GPS.
 * Utilisé quand l'utilisateur accepte la géolocalisation navigateur.
 *
 * @param lat - Latitude (ex: 45.1885)
 * @param lng - Longitude (ex: 5.7245)
 * @returns   - CityResult ou null si aucune ville trouvée
 */
export async function reverseGeocode(lat: number, lng: number): Promise<CityResult | null> {
  const url = new URL(`${API_BASE}/reverse/`)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('type', 'municipality')

  try {
    const response = await fetchWithTimeout(url.toString())
    if (!response.ok) throw new Error(`API Adresse /reverse HTTP ${response.status}`)

    const data: AdresseSearchResponse = await response.json()
    const first = data.features[0]
    return first ? featureToCityResult(first) : null
  } catch (error) {
    console.warn('[geocoding] Reverse geocode failed:', error)
    return null
  }
}

/**
 * Demande la position au navigateur et la reverse-géocode.
 * Retourne null si l'utilisateur refuse ou si le navigateur ne supporte pas.
 *
 * @param onPermissionDenied - Callback appelé si l'utilisateur refuse
 */
export async function requestBrowserLocation(
  onPermissionDenied?: () => void,
): Promise<CityResult | null> {
  if (!navigator.geolocation) return null

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const city = await reverseGeocode(latitude, longitude)
        resolve(city)
      },
      (error) => {
        if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
          onPermissionDenied?.()
        }
        resolve(null)
      },
      {
        // Timeout 10s — ne pas bloquer l'UX si le GPS est lent
        timeout: 10000,
        maximumAge: 300000, // Cache 5 min (même position si requête rapide)
        enableHighAccuracy: false, // Pas besoin de haute précision pour une ville
      },
    )
  })
}
