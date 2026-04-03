/**
 * LocationModal — Sélection de la localisation et du rayon de filtre
 *
 * Fonctionnalités :
 *   - Recherche textuelle de ville via Nominatim OSM (debounce 300 ms)
 *   - Géolocalisation GPS + reverse geocoding
 *   - Slider de rayon 0–500 km avec tooltip flottant
 *   - Les modifications ne sont appliquées qu'au clic sur "Appliquer"
 *
 * Responsive :
 *   - Desktop  : modale centrée avec backdrop
 *   - Mobile   : bottom sheet (slide depuis le bas)
 *
 * Sécurité : URL Nominatim construite via new URL() (pas de concaténation).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { LocateFixed, Loader2, X, Search } from 'lucide-react'
import { useLocation, type LocationCoords } from '@/contexts/LocationContext'

// ─── Nominatim helpers ────────────────────────────────────────────────────────

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: Record<string, string>
}

/** Construit un libellé lisible depuis une réponse Nominatim */
function toLabel(p: NominatimResult): string {
  const addr = p.address ?? {}
  const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality
  const region = addr.state ?? ''
  if (city) return region ? `${city}, ${region}` : city
  return p.display_name.split(',')[0].trim()
}

/** Recherche de lieux via Nominatim search (min 2 caractères) */
async function searchPlaces(query: string): Promise<NominatimResult[]> {
  if (query.trim().length < 2) return []
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query.trim())
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '5')
  url.searchParams.set('accept-language', 'fr')
  url.searchParams.set('addressdetails', '1')
  try {
    const res = await fetch(url.toString(), { headers: { 'Accept-Language': 'fr' } })
    if (!res.ok) return []
    return (await res.json()) as NominatimResult[]
  } catch {
    return []
  }
}

/** Reverse geocoding : coordonnées → libellé ville/région */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', lat.toString())
  url.searchParams.set('lon', lon.toString())
  url.searchParams.set('format', 'json')
  url.searchParams.set('accept-language', 'fr')
  try {
    const res = await fetch(url.toString(), { headers: { 'Accept-Language': 'fr' } })
    if (!res.ok) return 'Ma position'
    return toLabel((await res.json()) as NominatimResult)
  } catch {
    return 'Ma position'
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface LocationModalProps {
  onClose: () => void
}

export function LocationModal({ onClose }: LocationModalProps) {
  const { locationLabel, locationDistance, setLocation, setLocationDistance } = useLocation()

  // État local (brouillon — appliqué seulement sur "Appliquer")
  const [query, setQuery] = useState(locationLabel)
  const [distance, setDistLocal] = useState(locationDistance)
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isGps, setIsGps] = useState(false)
  const [tempCoords, setTempCoords] = useState<LocationCoords | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  function handleQueryChange(val: string) {
    setQuery(val)
    setSuggestions([])
    setShowSuggestions(false)
    setTempCoords(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (val.trim().length >= 2) {
      setIsSearching(true)
      searchTimeout.current = setTimeout(async () => {
        const results = await searchPlaces(val)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setIsSearching(false)
      }, 300)
    } else {
      setIsSearching(false)
    }
  }

  const handleGps = useCallback(async () => {
    if (!navigator.geolocation || isGps) return
    setIsGps(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const label = await reverseGeocode(coords.latitude, coords.longitude)
        setQuery(label)
        setTempCoords({ lat: coords.latitude, lon: coords.longitude })
        setIsGps(false)
      },
      () => setIsGps(false),
      { timeout: 10000 },
    )
  }, [isGps])

  function selectSuggestion(place: NominatimResult) {
    setQuery(toLabel(place))
    setTempCoords({ lat: parseFloat(place.lat), lon: parseFloat(place.lon) })
    setSuggestions([])
    setShowSuggestions(false)
  }

  function handleApply() {
    setLocation(query || locationLabel, tempCoords)
    setLocationDistance(distance)
    onClose()
  }

  // Position tooltip : centre du thumb en fonction du % de la valeur
  const fillPct = (distance / 500) * 100
  const tooltipLeft = `calc(${fillPct}% + ${9 * (1 - fillPct / 50)}px)`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Changer de localisation"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Card — bottom sheet mobile / modale centrée desktop */}
      <div className="relative z-10 w-full md:max-w-[480px] md:mx-4 bg-cream-lighter border border-border rounded-t-2xl md:rounded-xl shadow-xl flex flex-col gap-6 p-6">
        {/* Handle bar mobile */}
        <div
          className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-title font-bold text-lg text-foreground">Localisation</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5 text-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <div
            className={[
              'flex items-center gap-3 h-12 px-4 rounded-full border transition-colors',
              showSuggestions
                ? 'bg-primary-light border-primary'
                : 'bg-primary-light/50 border-transparent focus-within:border-primary focus-within:bg-primary-light',
            ].join(' ')}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Ville, région, lieu..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              role="combobox"
              aria-label="Rechercher une localisation"
              aria-haspopup="listbox"
              aria-controls="location-suggestions"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
            />
            <button
              type="button"
              onClick={handleGps}
              disabled={isGps}
              aria-label="Utiliser ma position GPS"
              className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full p-0.5"
            >
              {isGps || isSearching ? (
                <Loader2 className="size-5 text-primary animate-spin" aria-hidden="true" />
              ) : (
                <LocateFixed className="size-5 text-primary" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <ul
              id="location-suggestions"
              role="listbox"
              aria-label="Suggestions de localisation"
              className="absolute top-[calc(100%+4px)] left-0 right-0 bg-cream-lighter border border-border rounded-xl shadow-lg z-10 overflow-hidden"
            >
              {suggestions.map((p) => (
                <li key={p.place_id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(p)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-primary-light/40 transition-colors"
                  >
                    <Search
                      className="size-3.5 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-foreground">{toLabel(p)}</span>
                    {p.address?.country && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {p.address.country}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="h-px bg-border" aria-hidden="true" />

        {/* Distance slider */}
        <div className="flex flex-col gap-4">
          <p className="text-base text-muted-foreground">Distance en km</p>
          <div className="relative pt-8">
            {/* Tooltip au-dessus du thumb */}
            <div
              className="absolute top-0 flex flex-col items-center pointer-events-none"
              style={{ left: tooltipLeft, transform: 'translateX(-50%)' }}
              aria-hidden="true"
            >
              <div className="bg-foreground text-cream-lighter text-xs font-medium px-2 py-1 rounded-lg whitespace-nowrap">
                {distance}km
              </div>
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: `5px solid var(--color-foreground)`,
                }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={distance}
              onChange={(e) => setDistLocal(Number(e.target.value))}
              className="location-slider w-full"
              style={{
                background: `linear-gradient(to right, var(--color-primary) ${fillPct}%, var(--color-primary-light) ${fillPct}%)`,
              }}
              aria-label="Distance en km"
              aria-valuenow={distance}
              aria-valuemin={0}
              aria-valuemax={500}
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>0</span>
              <span>500</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" aria-hidden="true" />

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-full border border-border text-foreground font-bold text-base hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  )
}
