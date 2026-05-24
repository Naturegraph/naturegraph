/**
 * useLocationAutocomplete — Autocomplete ville privacy-first
 * ===========================================================
 * Recherche de communes françaises via l'API Adresse (data.gouv.fr)
 * avec fallback sur la RPC Supabase search_cities (fr_cities en DB).
 *
 * Éco-conception :
 *   - Debounce 300ms pour limiter les requêtes pendant la frappe
 *   - Cache React Query staleTime 24h (les villes ne changent pas)
 *   - Max 5 résultats retournés
 *   - Requête désactivée si < 2 caractères
 */

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchCities } from '@/lib/location/geocoding'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { CityResult } from '@/types/location'

// ─── Constantes ──────────────────────────────────────────────

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2
const CACHE_STALE_TIME = 24 * 60 * 60 * 1000 // 24 heures

// ─── Fallback Supabase ───────────────────────────────────────

/**
 * Recherche via la RPC search_cities (fr_cities en DB).
 * Utilisé quand l'API Adresse est indisponible.
 */
async function searchCitiesSupabase(query: string): Promise<CityResult[]> {
  if (!supabase || !isSupabaseConfigured) return []

  // RPC non encore dans supabase.ts généré — cast any jusqu'à régénération
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('search_cities', {
    query,
    max_results: 5,
  })

  if (error || !data) return []

  type SearchCitiesRow = {
    insee_code: string
    name: string
    region_name: string
    department_name: string
    department_code: string
    population: number | null
    centroid_lat: number
    centroid_lng: number
  }

  return (data as SearchCitiesRow[]).map((row) => ({
    inseeCode: row.insee_code,
    name: row.name,
    regionName: row.region_name,
    departmentName: row.department_name,
    departmentCode: row.department_code,
    population: row.population,
    centroidLat: row.centroid_lat,
    centroidLng: row.centroid_lng,
    // fr_cities contient FR + QC. On distingue par le département_code :
    // les communes québécoises ont un code département non-numérique préfixé
    // « QC » (ex: QC-24) tandis que les FR ont 2-3 chiffres.
    country: /^QC/i.test(row.department_code) ? 'Canada' : 'France',
  }))
}

/**
 * Recherche de ville FR + QC — fusion de deux sources.
 *
 * 1. API Adresse (data.gouv.fr) — communes FRANÇAISES officielles, fraîches,
 *    RGPD, sans clé. Mais FR-only : ne connaît pas le Québec.
 * 2. Supabase RPC search_cities (table fr_cities) — contient les villes FR
 *    ET les municipalités du QUÉBEC.
 *
 * Les deux sont interrogées en parallèle puis fusionnées. C'est indispensable
 * pour le Québec : une recherche "Montréal" via l'API Adresse seule renvoie
 * les villages français homonymes et ne montrerait JAMAIS Montréal (QC).
 *
 * Dédoublonnage par nom + département (l'API Adresse et fr_cities partagent
 * les villes françaises). Les résultats API passent en premier (source FR de
 * référence), les entrées DB uniques (= Québec + communes absentes de l'API)
 * sont ajoutées ensuite. Cap à 8 suggestions.
 */
async function searchWithFallback(query: string): Promise<CityResult[]> {
  const [apiResults, dbResults] = await Promise.all([
    searchCities(query).catch(() => [] as CityResult[]),
    searchCitiesSupabase(query).catch(() => [] as CityResult[]),
  ])

  const dedupeKey = (c: CityResult) =>
    `${c.name.toLowerCase()}|${(c.departmentName ?? '').toLowerCase()}`

  const seen = new Set(apiResults.map(dedupeKey))
  const merged = [...apiResults]
  for (const city of dbResults) {
    if (!seen.has(dedupeKey(city))) {
      seen.add(dedupeKey(city))
      merged.push(city)
    }
  }
  return merged.slice(0, 8)
}

// ─── Hook principal ──────────────────────────────────────────

interface UseLocationAutocompleteReturn {
  /** Résultats de la recherche */
  suggestions: CityResult[]
  /** true pendant la requête */
  isLoading: boolean
  /** Erreur éventuelle */
  error: Error | null
  /** Valeur actuelle de la query (après debounce) */
  debouncedQuery: string
  /** Nombre de résultats */
  count: number
}

/**
 * Hook d'autocomplete pour la recherche de villes françaises.
 *
 * @param query - Texte saisi par l'utilisateur (avant debounce)
 *
 * @example
 * const { suggestions, isLoading } = useLocationAutocomplete(inputValue)
 * // → [{ name: 'Grenoble', regionName: 'Auvergne-Rhône-Alpes', ... }]
 */
export function useLocationAutocomplete(query: string): UseLocationAutocompleteReturn {
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce — met à jour debouncedQuery 300ms après la dernière frappe
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const enabled = debouncedQuery.trim().length >= MIN_QUERY_LENGTH

  const { data, isLoading, error } = useQuery<CityResult[], Error>({
    // Clé incluant la query debouncée — le cache est partagé entre appels identiques
    queryKey: ['location', 'autocomplete', debouncedQuery.trim().toLowerCase()],
    queryFn: () => searchWithFallback(debouncedQuery.trim()),
    enabled,
    // 24h : les noms de communes changent rarement
    staleTime: CACHE_STALE_TIME,
    // Ne pas retry si erreur réseau (API Adresse down — le fallback a déjà été tenté)
    retry: false,
    // Garde les données précédentes pendant la nouvelle requête (évite le flash vide)
    placeholderData: (prev) => prev,
  })

  return {
    suggestions: data ?? [],
    isLoading: enabled ? isLoading : false,
    error: error ?? null,
    debouncedQuery,
    count: data?.length ?? 0,
  }
}
