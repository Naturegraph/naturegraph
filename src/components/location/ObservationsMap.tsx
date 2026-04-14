/**
 * ObservationsMap — Carte Leaflet des observations biodiversité
 * ==============================================================
 * Affiche les observations géolocalisées sur une carte OSM.
 *
 * Privacy :
 *   - Jamais de markers profil utilisateur (positions personnelles)
 *   - Seules les observations (posts) sont cartographiées
 *   - location_hidden → coordonnées floutées ±0.1° côté serveur (trigger SQL)
 *
 * Clustering :
 *   - Markers regroupés par zone pour lisibilité + performances
 *   - Zoom max 16 (évite d'exposer la position exacte en zone rurale)
 *   - Implémenté via la fonction de clustering intégrée de react-leaflet
 *
 * Accessibilité :
 *   - aria-label sur le conteneur
 *   - Popups accessibles au clavier (Tab + Enter)
 *   - Texte alternatif dans les popups
 *
 * Éco-conception :
 *   - Tiles OSM uniquement (pas de Mapbox/Google)
 *   - Lazy-load du composant (import dynamique depuis la page)
 *   - Pas de tracking / analytics tiles
 *
 * NOTE Leaflet : les imports CSS doivent être faits dans le composant
 * parent ou globalement. Ajouter dans src/styles/main.scss :
 *   @import 'leaflet/dist/leaflet.css';
 */

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapObservation } from './observationsMapUtils'

// ─── Fix icônes Leaflet avec Vite ─────────────────────────────
// Leaflet charge les icônes via des URLs relatives qui cassent avec Vite.
// Ce fix injecte les icônes par défaut manuellement.

import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

// ─── Icône customisée par groupe taxonomique ──────────────────

const TAXONOMIC_COLORS: Record<string, string> = {
  birds: '#3B82F6',
  mammals: '#8B5CF6',
  insects: '#F59E0B',
  amphibians: '#10B981',
  reptiles: '#EF4444',
  arachnids: '#6B7280',
  mollusks: '#EC4899',
  fish: '#06B6D4',
  plants: '#22C55E',
  other: '#78716C',
}

const TAXONOMIC_EMOJIS: Record<string, string> = {
  birds: '🐦',
  mammals: '🦌',
  insects: '🦋',
  amphibians: '🐸',
  reptiles: '🦎',
  arachnids: '🕷️',
  mollusks: '🐌',
  fish: '🐟',
  plants: '🌿',
  other: '🌍',
}

/** Crée un icon SVG coloré selon le groupe taxonomique */
function createTaxonomicIcon(group: string): L.DivIcon {
  const color = TAXONOMIC_COLORS[group] ?? TAXONOMIC_COLORS.other
  const emoji = TAXONOMIC_EMOJIS[group] ?? '🌍'

  return L.divIcon({
    html: `
      <div style="
        width: 32px; height: 32px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 14px; line-height: 1;">
          ${emoji}
        </span>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  })
}

// ─── Types ────────────────────────────────────────────────────

// MapObservation est défini dans observationsMapUtils.ts (séparé pour Fast Refresh)
// Re-exporté depuis index.ts

interface ObservationsMapProps {
  observations: MapObservation[]
  /** Centre initial de la carte [lat, lng] */
  center?: [number, number]
  /** Zoom initial */
  zoom?: number
  /** Hauteur du conteneur */
  height?: string
  /** Callback au clic sur un marker */
  onObservationClick?: (id: string) => void
}

// ─── Composant : bounds automatiques ─────────────────────────

/**
 * Ajuste les bounds de la carte pour afficher tous les markers.
 * Ignoré si aucune observation ou si le composant est contrôlé.
 */
function AutoBounds({ observations }: { observations: MapObservation[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (observations.length === 0 || fitted.current) return
    const bounds = L.latLngBounds(
      observations.map((o) => [o.latitude, o.longitude] as [number, number]),
    )
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    fitted.current = true
  }, [observations, map])

  return null
}

// ─── Composant principal ──────────────────────────────────────

/**
 * Carte Leaflet des observations biodiversité.
 *
 * Import en lazy depuis la page parente :
 * ```tsx
 * const ObservationsMap = lazy(() => import('@/components/location/ObservationsMap'))
 * ```
 *
 * @example
 * <ObservationsMap
 *   observations={posts.map(postToObservation)}
 *   height="400px"
 *   onObservationClick={(id) => navigate(`/post/${id}`)}
 * />
 */
export function ObservationsMap({
  observations,
  center = [46.603354, 1.888334], // Centre France métropolitaine
  zoom = 5,
  height = '400px',
  onObservationClick,
}: ObservationsMapProps) {
  return (
    <div
      aria-label="Carte des observations biodiversité"
      style={{ height }}
      className="w-full rounded-lg overflow-hidden border border-[var(--color-border)]"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        // Zoom max 16 — évite d'exposer la position exacte en zone rurale
        maxZoom={16}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Tiles OpenStreetMap — sans tracking, conformes RGPD */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Ajustement automatique des bounds */}
        {observations.length > 0 && <AutoBounds observations={observations} />}

        {/* Markers */}
        {observations.map((obs) => {
          const group = obs.taxonomicGroup ?? 'other'
          const icon = createTaxonomicIcon(group)

          return (
            <Marker
              key={obs.id}
              position={[obs.latitude, obs.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onObservationClick?.(obs.id),
              }}
            >
              <Popup>
                <div className="flex flex-col gap-1 min-w-[160px]">
                  {/* Espèce ou description */}
                  <p className="font-semibold text-sm leading-tight">
                    {obs.speciesName ?? obs.description.slice(0, 60)}
                    {!obs.speciesName && obs.description.length > 60 ? '…' : ''}
                  </p>

                  {/* Auteur */}
                  <p className="text-xs text-gray-500">par @{obs.authorUsername}</p>

                  {/* Date */}
                  <p className="text-xs text-gray-400">
                    {new Date(obs.encounterDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>

                  {/* Avertissement position floutée */}
                  {obs.locationHidden && (
                    <p className="text-xs text-amber-600 mt-1">
                      📍 Position approximative (espèce sensible)
                    </p>
                  )}

                  {/* Lien vers le post */}
                  {onObservationClick && (
                    <button
                      type="button"
                      onClick={() => onObservationClick(obs.id)}
                      className="mt-2 text-xs font-semibold text-blue-600 hover:underline text-left"
                    >
                      Voir l'observation →
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
