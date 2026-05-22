/**
 * LocationModal — Sélection de la localisation et du rayon de filtre
 *
 * Fonctionnalités :
 *   - Recherche textuelle de ville via Nominatim OSM (debounce 300 ms)
 *   - Géolocalisation GPS + reverse geocoding
 *   - Slider de rayon 75–250 km avec tooltip flottant
 *   - Les modifications ne sont appliquées qu'au clic sur "Appliquer"
 *
 * Responsive :
 *   - Desktop  : modale centrée avec backdrop
 *   - Mobile   : bottom sheet (slide depuis le bas)
 *
 * Sécurité : URL Nominatim construite via new URL() (pas de concaténation).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { LocateFixed, Loader2, X, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocation, type LocationCoords } from '@/contexts/LocationContext'
import { useLocationAutocomplete } from '@/hooks/useLocationAutocomplete'
import type { CityResult } from '@/types/location'

// ─── Historique des recherches (localStorage) ─────────────────────────────────

const HISTORY_KEY = 'naturegraph-location-history'
const HISTORY_MAX = 5

interface LocationHistoryItem {
  label: string
  lat: number
  lon: number
  ts: number
}

function readHistory(): LocationHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as LocationHistoryItem[]
    return Array.isArray(arr) ? arr.slice(0, HISTORY_MAX) : []
  } catch {
    return []
  }
}

function pushHistory(item: LocationHistoryItem) {
  if (typeof window === 'undefined') return
  const current = readHistory().filter((h) => h.label !== item.label)
  const next = [item, ...current].slice(0, HISTORY_MAX)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

// ─── Nominatim helpers ────────────────────────────────────────────────────────

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: Record<string, string>
}

/**
 * Construit un libellé lisible depuis une réponse Nominatim.
 * Format BATCH 92 : "Ville, Département, Région" (cohérent avec partage observation).
 *   ex : "Ploërmel, Morbihan, Bretagne"
 *   fallback : Ville, Région si pas de département
 *   fallback ultime : 1er segment de display_name
 */
function toLabel(p: NominatimResult): string {
  const addr = p.address ?? {}
  const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality
  const department = addr.county ?? addr['state_district'] ?? ''
  const region = addr.state ?? ''
  if (city) {
    const parts = [city, department, region].filter(Boolean)
    return parts.join(', ')
  }
  return p.display_name.split(',')[0].trim()
}

/**
 * Nicolas 2026-05-22 : la recherche est désormais déléguée au hook
 * `useLocationAutocomplete` (API Adresse data.gouv + Supabase RPC fr_cities
 * pour le Québec) — même source que le picker du formulaire de partage
 * observation. Cela garantit que l'utilisateur voit EXACTEMENT les mêmes
 * villes proposées partout dans l'app.
 *
 * Le format d'affichage est aligné sur le composant `CityAutocomplete` :
 *   « Lévis » + en sous-ligne « QC · Québec ».
 */

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

  // Rayon minimum/maximum — au-delà de 250 km, autant afficher tout le contenu
  const MIN_DISTANCE = 75
  const MAX_DISTANCE = 250

  // État local (brouillon — appliqué seulement sur "Appliquer")
  const [query, setQuery] = useState(locationLabel)
  // S'assurer que la valeur initiale respecte le minimum de 75 km
  const [distance, setDistLocal] = useState(Math.max(MIN_DISTANCE, locationDistance))
  // Recherche centralisée via le même hook que le picker observation
  // (cohérence demandée par Nicolas 2026-05-22). Debounce + cache 24h gérés
  // dans `useLocationAutocomplete`.
  const { suggestions, isLoading: isSearching } = useLocationAutocomplete(query)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isGps, setIsGps] = useState(false)
  const [tempCoords, setTempCoords] = useState<LocationCoords | null>(null)
  // BATCH 92 : historique des recherches précédentes (max 5, persistance localStorage)
  const [history, setHistory] = useState<LocationHistoryItem[]>(() => readHistory())
  /**
   * État de confirmation GPS :
   * - 'idle'    → bouton cible visible normalement
   * - 'confirm' → mini-bannière de confirmation avant d'appeler l'API native
   * - 'denied'  → l'utilisateur a refusé (message d'erreur affiché)
   *
   * Ce step intermédiaire permet d'informer l'utilisateur AVANT que le navigateur
   * affiche sa propre popup de permission, améliorant le taux d'acceptation.
   */
  const [gpsState, setGpsState] = useState<'idle' | 'confirm' | 'denied'>('idle')

  const inputRef = useRef<HTMLInputElement>(null)
  /**
   * Ref partagée entre les deux blocs de rendu (mobile / desktop).
   * Utilisée pour le click-outside sur desktop (le backdrop gère mobile).
   */
  const panelRef = useRef<HTMLDivElement>(null)

  // Nicolas 2026-05-22 : on n'auto-focus PLUS l'input à l'ouverture — quand
  // l'utilisateur ré-ouvre la modal il veut souvent juste revalider le rayon
  // sans déclencher le clavier mobile. L'input reste accessible au tap.

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Click-outside — desktop dropdown (le backdrop s'en charge sur mobile)
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', fn)
    }
  }, [onClose])

  function handleQueryChange(val: string) {
    setQuery(val)
    setTempCoords(null)
    // Le hook `useLocationAutocomplete` gère le debounce + cache + état
    // suggestions/isLoading. Ici on contrôle simplement la visibilité du
    // dropdown : visible dès qu'on a 2+ caractères, masqué sinon.
    setShowSuggestions(val.trim().length >= 2)
  }

  /** Étape 1 : montrer la bannière de confirmation avant la popup navigateur */
  const handleGpsClick = useCallback(() => {
    if (!navigator.geolocation || isGps) return
    setGpsState('confirm')
  }, [isGps])

  /** Étape 2 : l'utilisateur confirme → déclencher la géolocalisation native */
  const handleGpsConfirm = useCallback(async () => {
    if (!navigator.geolocation || isGps) return
    setGpsState('idle')
    setIsGps(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const label = await reverseGeocode(coords.latitude, coords.longitude)
        setQuery(label)
        setTempCoords({ lat: coords.latitude, lon: coords.longitude })
        setIsGps(false)
      },
      (err) => {
        setIsGps(false)
        // Code 1 = PERMISSION_DENIED — informer l'utilisateur
        if (err.code === 1) setGpsState('denied')
      },
      { timeout: 10000 },
    )
  }, [isGps])

  /** Annuler la confirmation GPS */
  const handleGpsCancel = useCallback(() => setGpsState('idle'), [])

  /**
   * Sélection d'une suggestion CityResult (API Adresse + Supabase RPC).
   * Format label aligné avec EncounterStep3 : « Ville, Département, Région ».
   */
  const selectSuggestion = useCallback((city: CityResult) => {
    const parts = [city.name, city.departmentName, city.regionName].filter(Boolean)
    const label = parts.join(', ')
    const lat = city.centroidLat
    const lon = city.centroidLng
    setQuery(label)
    setTempCoords({ lat, lon })
    setShowSuggestions(false)
    pushHistory({ label, lat, lon, ts: Date.now() })
    setHistory(readHistory())
  }, [])

  /** Selectionne directement un item de l'historique (BATCH 92) */
  const selectHistoryItem = useCallback((item: LocationHistoryItem) => {
    setQuery(item.label)
    setTempCoords({ lat: item.lat, lon: item.lon })
    setSuggestions([])
    setShowSuggestions(false)
  }, [])

  const handleApply = useCallback(() => {
    setLocation(query || locationLabel, tempCoords)
    setLocationDistance(distance)
    if (tempCoords && query) {
      pushHistory({ label: query, lat: tempCoords.lat, lon: tempCoords.lon, ts: Date.now() })
    }
    onClose()
  }, [query, locationLabel, tempCoords, distance, setLocation, setLocationDistance, onClose])

  // Position tooltip : centre du thumb en fonction du % de la valeur dans la plage [75, 500]
  const fillPct = ((distance - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE)) * 100
  const tooltipLeft = `calc(${fillPct}% + ${9 * (1 - fillPct / 50)}px)`

  // ── Contenu partagé mobile / desktop ─────────────────────────────────────

  const modalContent = (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-title font-bold text-base text-foreground">Localisation</p>
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
            'flex items-center gap-3 h-11 px-4 rounded-full border transition-colors',
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
            onClick={handleGpsClick}
            disabled={isGps || gpsState === 'confirm'}
            aria-label="Utiliser ma position GPS"
            className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full p-0.5"
          >
            {isGps || isSearching ? (
              <Loader2 className="size-5 text-primary animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed
                className={[
                  'size-5',
                  gpsState === 'confirm' ? 'text-primary/50' : 'text-primary',
                ].join(' ')}
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {/* Confirmation avant demande de permission GPS */}
        {gpsState === 'confirm' && (
          <div
            role="alert"
            className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-primary-light/60 border border-primary/20 px-4 py-3"
          >
            <p className="text-xs text-foreground flex-1">
              Autoriser l'accès à votre position pour trouver votre ville automatiquement ?
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGpsCancel}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1"
              >
                Non
              </button>
              <button
                type="button"
                onClick={handleGpsConfirm}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1"
              >
                Oui
              </button>
            </div>
          </div>
        )}

        {/* Permission GPS refusée */}
        {gpsState === 'denied' && (
          <p role="alert" className="mt-2 text-xs text-muted-foreground px-1">
            Accès à la position refusé. Vérifiez les permissions de votre navigateur.
          </p>
        )}

        {/* Suggestions CityResult — même format que le picker observation
            (Nicolas 2026-05-22) : ville en gras + dept code · région en
            sous-ligne. Cohérence visuelle garantie partout dans l'app. */}
        {showSuggestions && (suggestions.length > 0 || isSearching) && (
          <ul
            id="location-suggestions"
            role="listbox"
            aria-label="Suggestions de localisation"
            className="absolute top-[calc(100%+4px)] left-0 right-0 bg-cream-lighter border border-border rounded-lg shadow-lg z-10 overflow-hidden"
          >
            {suggestions.map((city) => (
              <li key={`${city.inseeCode}-${city.name}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => selectSuggestion(city)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary-light/40 transition-colors"
                >
                  <MapPin className="size-4 text-primary shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{city.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[city.departmentCode, city.regionName].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/*
          Historique des recherches (BATCH 92) — affiche quand :
          - L'utilisateur ne tape rien (query vide ou len < 2)
          - Pas de suggestions en cours d'affichage
          - On a des items en historique
        */}
        {!showSuggestions && !isSearching && query.trim().length < 2 && history.length > 0 && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-cream-lighter border border-border rounded-lg shadow-lg z-10 overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Recherches récentes
            </p>
            <ul role="listbox" aria-label="Recherches récentes">
              {history.map((item) => (
                <li key={`${item.label}-${item.ts}`} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => selectHistoryItem(item)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-primary-light/40 transition-colors"
                  >
                    <Clock className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                    <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="h-px bg-border" aria-hidden="true" />

      {/* Slider distance */}
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-foreground">Distance en km</p>
        <div className="relative pt-8">
          {/* Tooltip flottant */}
          <div
            className="absolute top-0 flex flex-col items-center pointer-events-none"
            style={{ left: tooltipLeft, transform: 'translateX(-50%)' }}
            aria-hidden="true"
          >
            <div className="bg-foreground text-cream-lighter text-xs font-medium px-2 py-1 rounded-lg whitespace-nowrap">
              {distance} km
            </div>
            <div
              className="w-0 h-0"
              style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid var(--color-foreground)',
              }}
            />
          </div>

          <input
            type="range"
            min={MIN_DISTANCE}
            max={MAX_DISTANCE}
            step={25}
            value={distance}
            onChange={(e) =>
              setDistLocal(Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, Number(e.target.value))))
            }
            className="location-slider w-full"
            style={{
              background: `linear-gradient(to right, var(--color-primary) ${fillPct}%, var(--color-primary-light) ${fillPct}%)`,
            }}
            aria-label="Distance en km"
            aria-valuenow={distance}
            aria-valuemin={MIN_DISTANCE}
            aria-valuemax={MAX_DISTANCE}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>75 km</span>
            <span>250 km</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-border" aria-hidden="true" />

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button type="button" size="md" className="flex-1" onClick={handleApply}>
          Appliquer
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Backdrop — mobile uniquement (desktop : click-outside via panelRef) ── */}
      <div
        className="md:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/*
       * ── Panel unique — position responsif via Tailwind ────────────────────
       *   Mobile  : fixed bottom sheet (inset-x-0 bottom-0, rounded-t-2xl)
       *   Desktop : absolute dropdown depuis le parent div.relative du header
       *
       * Un seul div = un seul role="dialog", un seul panelRef, un seul inputRef.
       */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Changer de localisation"
        className={[
          // Mobile : bottom sheet fixe
          'fixed inset-x-0 bottom-0 z-50 rounded-t-xl',
          // Desktop : dropdown absolue ancrée au bouton localisation
          'md:absolute md:inset-auto md:bottom-auto',
          'md:top-[calc(100%+8px)] md:left-0 md:w-[400px] md:rounded-lg',
          // Style commun
          'bg-cream-lighter border border-border shadow-xl',
        ].join(' ')}
      >
        {/* Handle bar — mobile uniquement */}
        <div className="md:hidden flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        {modalContent}
      </div>
    </>
  )
}
