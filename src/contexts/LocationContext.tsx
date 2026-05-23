/**
 * LocationContext — Localisation privacy-first
 * =============================================
 * Refonte complète avec rétrocompatibilité de l'API existante.
 *
 * Nouvelles capacités (phase FEATURE 2-3) :
 *   - userLocation    : données profil Supabase (city_name, region_name, radius, visibility)
 *   - isLocalized     : true si une localisation est définie
 *   - updateLocation  : mutation RPC Supabase (throttle 1h, validation radius serveur)
 *   - clearLocation   : effacement RGPD complet
 *
 * API conservée (rétrocompatibilité avec FeedSection, HomeNavbar, etc.) :
 *   - locationLabel   : dérivé de userLocation ou saisi dans LocationModal
 *   - locationDistance: rayon local (non encore lié à location_radius_km — TODO)
 *   - setLocation     : mise à jour locale du label
 *   - setLocationDistance : mise à jour locale du rayon
 *   - locationCoords  : coordonnées temporaires (session uniquement, non stockées)
 *
 * ⚠️  location_point (geography PostGIS) est ABSENT de ce contexte.
 *     Il est géré côté serveur via RPC SECURITY DEFINER uniquement.
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  LocationContextState,
  LocationFormData,
  UserLocationData,
  LocationRadius,
} from '@/types/location'
import { DEFAULT_RADIUS, DEFAULT_VISIBILITY, RADIUS_OPTIONS } from '@/types/location'

// ─── Types ────────────────────────────────────────────────────

/** Coordonnées GPS temporaires (session uniquement, jamais stockées) */
export interface LocationCoords {
  lat: number
  lon: number
}

/**
 * Interface complète du contexte.
 * Fusionne l'ancienne API (locationLabel, etc.) et la nouvelle (userLocation, etc.)
 */
export interface LocationContextValue extends LocationContextState {
  /** @deprecated — utiliser getVisibilityLabel() pour l'affichage public */
  locationLabel: string
  /** Rayon local (session) — sera remplacé par userLocation.locationRadiusKm */
  locationDistance: number
  /** Coordonnées temporaires (non stockées) */
  locationCoords: LocationCoords | null
  /** Met à jour le label local et les coordonnées temporaires */
  setLocation: (label: string, coords?: LocationCoords | null) => void
  /** Met à jour le rayon local */
  setLocationDistance: (distance: number) => void
}

// ─── Clés de cache ────────────────────────────────────────────

const locationQueryKey = {
  current: (userId: string) => ['location', 'user', userId] as const,
}

// ─── Helpers ──────────────────────────────────────────────────

/** Transforme un row Supabase en UserLocationData */
function rowToLocationData(row: Record<string, unknown> | null): UserLocationData | null {
  if (!row?.city_name && !row?.region_name) return null
  return {
    cityName: (row.city_name as string | null) ?? null,
    regionName: (row.region_name as string | null) ?? null,
    countryCode: (row.country_code as string) ?? 'FR',
    locationRadiusKm: ((row.location_radius_km as number) ?? DEFAULT_RADIUS) as LocationRadius,
    locationVisibility:
      (row.location_visibility as UserLocationData['locationVisibility']) ?? DEFAULT_VISIBILITY,
    locationConsentSource:
      (row.location_consent_source as UserLocationData['locationConsentSource']) ?? null,
    locationUpdatedAt: (row.location_updated_at as string | null) ?? null,
  }
}

/**
 * Dérive le label d'affichage depuis les données profil.
 * Applique la logique de visibilité.
 */
function deriveLocationLabel(data: UserLocationData | null): string | null {
  if (!data) return null
  switch (data.locationVisibility) {
    case 'private':
      return null
    case 'region':
      return data.regionName
    case 'city':
      if (data.cityName && data.regionName) return `${data.cityName} · ${data.regionName}`
      return data.cityName ?? data.regionName
    default:
      return null
  }
}

// ─── Contexte ─────────────────────────────────────────────────

const LocationContext = createContext<LocationContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // ─── État local (rétrocompatibilité) ─────────────────────────
  // Fallback quand l'utilisateur n'est pas connecté ou en mode démo.
  //
  // Nicolas 2026-05-22 : persistance localStorage des coords + label pour
  // que le filtre rayon du feed survive au reload de page. Avant ce fix,
  // l'utilisateur devait ré-ouvrir la modal et ré-appliquer à chaque
  // chargement pour que le rayon Haversine s'applique.
  const COORDS_KEY = 'naturegraph-location-coords'
  const LABEL_KEY = 'naturegraph-location-label'

  function readPersistedCoords(): LocationCoords | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(COORDS_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as LocationCoords
      if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') return parsed
      return null
    } catch {
      return null
    }
  }

  function readPersistedLabel(): string {
    if (typeof window === 'undefined') return ''
    try {
      return localStorage.getItem(LABEL_KEY) ?? ''
    } catch {
      return ''
    }
  }

  const [localLabel, setLocalLabel] = useState(() => readPersistedLabel())
  const [locationDistance, setDistLocal] = useState<number>(DEFAULT_RADIUS)
  const [locationCoords, setCoords] = useState<LocationCoords | null>(() => readPersistedCoords())

  // ─── Lecture depuis Supabase ──────────────────────────────────

  const { data: userLocation, isLoading } = useQuery<UserLocationData | null, Error>({
    queryKey: locationQueryKey.current(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id || !supabase) return null
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'city_name, region_name, country_code, location_radius_km, location_visibility, location_consent_source, location_updated_at',
        )
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      return rowToLocationData(data as Record<string, unknown> | null)
    },
    enabled: !!user?.id && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  })

  // ─── Mutation : update localisation ──────────────────────────

  const updateMutation = useMutation({
    mutationFn: async (data: LocationFormData): Promise<{ error: string | null }> => {
      if (!user?.id || !supabase) return { error: null }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any).rpc('update_user_location', {
        p_user_id: user.id,
        p_city_name: data.city.name,
        p_region_name: data.city.regionName,
        p_country_code: 'FR',
        p_centroid_lat: data.city.centroidLat,
        p_centroid_lng: data.city.centroidLng,
        p_radius_km: data.radiusKm,
        p_visibility: data.visibility,
        p_consent_source: data.consentSource,
      })

      if (result.error) return { error: result.error.message }
      const rpcResult = result.data as { error?: string } | null
      if (rpcResult?.error) return { error: rpcResult.error }
      return { error: null }
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: locationQueryKey.current(user.id) })
        queryClient.invalidateQueries({ queryKey: ['profile'] })
      }
    },
  })

  // ─── Mutation : clear localisation ───────────────────────────

  const clearMutation = useMutation({
    mutationFn: async (): Promise<{ error: string | null }> => {
      if (!user?.id || !supabase) return { error: null }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('clear_user_location', { p_user_id: user.id })
      return { error: error?.message ?? null }
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: locationQueryKey.current(user.id) })
        queryClient.invalidateQueries({ queryKey: ['profile'] })
        setLocalLabel('') // Reset le label local après effacement
      }
    },
  })

  // ─── Callbacks stables ───────────────────────────────────────

  const updateLocation = useCallback(
    (data: LocationFormData) => updateMutation.mutateAsync(data),
    [updateMutation],
  )

  const clearLocation = useCallback(() => clearMutation.mutateAsync(), [clearMutation])

  /** Label affiché selon la logique de visibilité (null si private) */
  const getVisibilityLabel = useCallback((): string | null => {
    return deriveLocationLabel(userLocation ?? null)
  }, [userLocation])

  /** Label du rayon (ex: "75 km") */
  const getRadiusLabel = useCallback((): string => {
    if (!userLocation) return `${DEFAULT_RADIUS} km`
    const opt = RADIUS_OPTIONS.find((o) => o.value === userLocation.locationRadiusKm)
    return opt?.label ?? `${userLocation.locationRadiusKm} km`
  }, [userLocation])

  // ─── API legacy (rétrocompatibilité) ─────────────────────────

  const setLocation = useCallback((label: string, coords?: LocationCoords | null) => {
    setLocalLabel(label)
    if (coords !== undefined) setCoords(coords ?? null)
    // Persistance localStorage — pour que le filtre rayon survive au
    // reload de page (sinon locationCoords retombe à null et le feed
    // affiche tous les posts au lieu du rayon).
    try {
      if (typeof window !== 'undefined') {
        if (label) {
          localStorage.setItem(LABEL_KEY, label)
        } else {
          localStorage.removeItem(LABEL_KEY)
        }
        if (coords) {
          localStorage.setItem(COORDS_KEY, JSON.stringify(coords))
        } else if (coords === null) {
          localStorage.removeItem(COORDS_KEY)
        }
      }
    } catch {
      /* private mode / quota — ignorer silencieusement */
    }
  }, [])

  const setLocationDistance = useCallback((d: number) => {
    setDistLocal(Math.max(75, Math.min(250, d)))
  }, [])

  // ─── Valeur du contexte ──────────────────────────────────────

  const contextValue = useMemo<LocationContextValue>(() => {
    // Dérive le label depuis Supabase (applique la logique de visibilité).
    // Fallback sur le label local (legacy API) si aucune donnée Supabase.
    const derivedLabel = deriveLocationLabel(userLocation ?? null)
    return {
      // Nouvelles propriétés Supabase
      userLocation: userLocation ?? null,
      isLocalized: !!(userLocation?.cityName || userLocation?.regionName),
      isLoading,
      updateLocation,
      clearLocation,
      getVisibilityLabel,
      getRadiusLabel,
      // Propriétés legacy (rétrocompatibilité)
      locationLabel: derivedLabel ?? localLabel,
      locationDistance,
      locationCoords,
      setLocation,
      setLocationDistance,
    }
  }, [
    userLocation,
    isLoading,
    updateLocation,
    clearLocation,
    getVisibilityLabel,
    getRadiusLabel,
    localLabel,
    locationDistance,
    locationCoords,
    setLocation,
    setLocationDistance,
  ])

  return <LocationContext.Provider value={contextValue}>{children}</LocationContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * Hook pour accéder au contexte de localisation.
 * Compatible avec l'ancienne API (locationLabel, setLocation, etc.)
 * et la nouvelle (userLocation, updateLocation, clearLocation, etc.).
 *
 * @throws Error si utilisé hors de LocationProvider
 */
export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used inside <LocationProvider>')
  return ctx
}
