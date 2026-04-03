/**
 * LocationContext — État de localisation partagé entre les composants
 *
 * Centralise :
 *   - locationLabel    : libellé affiché (ex. "Ploërmel, Bretagne")
 *   - locationDistance : rayon de filtre en km (0–500, défaut 250)
 *   - locationCoords   : coordonnées GPS brutes (pour ST_DWithin Supabase)
 *
 * Utilisé par : HomeNavbar, LocationModal, GuestSidebar, FeedSection
 * TODO [BACKEND] — Initialiser depuis profile.city + profile.region si connecté.
 * TODO [BACKEND] — locationCoords → filtre ST_DWithin dans la requête feed.
 */

import { createContext, useContext, useState } from 'react'

export interface LocationCoords {
  lat: number
  lon: number
}

interface LocationContextValue {
  locationLabel: string
  locationDistance: number
  locationCoords: LocationCoords | null
  /** Met à jour le libellé et optionnellement les coordonnées GPS */
  setLocation: (label: string, coords?: LocationCoords | null) => void
  /** Met à jour le rayon de filtre (clamp 0–500) */
  setLocationDistance: (distance: number) => void
}

const LocationContext = createContext<LocationContextValue | null>(null)

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used inside <LocationProvider>')
  return ctx
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  // Valeur initiale mock — voir TODO BACKEND ci-dessus
  const [locationLabel, setLabel] = useState('Ploërmel, Bretagne')
  const [locationDistance, setDist] = useState(250)
  const [locationCoords, setCoords] = useState<LocationCoords | null>(null)

  function setLocation(label: string, coords?: LocationCoords | null) {
    setLabel(label)
    if (coords !== undefined) setCoords(coords ?? null)
  }

  function setLocationDistance(d: number) {
    setDist(Math.max(0, Math.min(500, d)))
  }

  return (
    <LocationContext.Provider
      value={{ locationLabel, locationDistance, locationCoords, setLocation, setLocationDistance }}
    >
      {children}
    </LocationContext.Provider>
  )
}
