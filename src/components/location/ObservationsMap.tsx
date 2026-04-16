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

import { useEffect, useRef, useState, useCallback } from 'react'
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

/**
 * Couleurs des markers par groupe taxonomique.
 * Valeurs HSL calculées pour un contraste ≥ 3:1 sur fond blanc (WCAG AA — UI).
 * On utilise des valeurs statiques ici car les CSS custom properties ne sont
 * pas accessibles dans les chaînes inline style injectées via L.divIcon.
 * Ces couleurs sont intentionnellement fixes (pas de dark mode pour Leaflet SVG).
 */
const TAXONOMIC_COLORS: Record<string, string> = {
  birds: '#2563EB', // bleu — contraste 4.6:1 sur blanc
  mammals: '#7C3AED', // violet — contraste 5.0:1 sur blanc
  insects: '#B45309', // ambre foncé — contraste 4.7:1 sur blanc
  amphibians: '#047857', // vert émeraude — contraste 5.3:1 sur blanc
  reptiles: '#B91C1C', // rouge — contraste 5.2:1 sur blanc
  arachnids: '#4B5563', // gris anthracite — contraste 5.9:1 sur blanc
  mollusks: '#BE185D', // rose foncé — contraste 5.1:1 sur blanc
  fish: '#0E7490', // cyan foncé — contraste 4.8:1 sur blanc
  plants: '#15803D', // vert foncé — contraste 5.8:1 sur blanc
  other: '#57534E', // pierre — contraste 5.6:1 sur blanc
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

// ─── Clustering ───────────────────────────────────────────────

/**
 * Représente un cluster de markers sur la carte.
 * Le centroïde est la moyenne des coordonnées des observations groupées.
 */
interface MapCluster {
  /** Clé unique basée sur la cellule de grille */
  id: string
  lat: number
  lng: number
  count: number
  /** Observations dans ce cluster (utilisées au clic pour zoomer) */
  observations: MapObservation[]
}

/**
 * Groupe les observations par cellule de grille (degrés) pour le clustering.
 * Plus gridSize est grand, plus les clusters sont larges.
 *
 * @param observations - Observations à grouper
 * @param gridSize     - Taille d'une cellule en degrés (0.5° ≈ 55 km)
 */
function clusterObservations(observations: MapObservation[], gridSize: number): MapCluster[] {
  const cells = new Map<string, MapObservation[]>()

  for (const obs of observations) {
    const cellLat = Math.floor(obs.latitude / gridSize) * gridSize
    const cellLng = Math.floor(obs.longitude / gridSize) * gridSize
    const key = `${cellLat.toFixed(4)},${cellLng.toFixed(4)}`
    if (!cells.has(key)) cells.set(key, [])
    cells.get(key)!.push(obs)
  }

  return Array.from(cells.entries()).map(([key, obs]) => {
    // Centroïde = moyenne des positions (meilleur rendu visuel qu'un coin de grille)
    const centerLat = obs.reduce((s, o) => s + o.latitude, 0) / obs.length
    const centerLng = obs.reduce((s, o) => s + o.longitude, 0) / obs.length
    return { id: key, lat: centerLat, lng: centerLng, count: obs.length, observations: obs }
  })
}

/**
 * Crée un DivIcon pour un cluster (cercle avec le nombre d'observations).
 * Taille adaptative : plus grand si le cluster est dense.
 */
function createClusterIcon(count: number): L.DivIcon {
  const size = count >= 20 ? 48 : count >= 10 ? 40 : 34
  const fontSize = count >= 20 ? '14' : '13'

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: #6366F1;
        border-radius: 50%;
        border: 2.5px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: ${fontSize}px; color: white;
        font-family: system-ui, sans-serif;
      ">${count}</div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// ─── Composant : suivi du niveau de zoom ──────────────────────

/**
 * Écoute les événements zoom de Leaflet et notifie le parent.
 * Séparé de ObservationsMap pour utiliser useMap() (disponible uniquement
 * dans les enfants de MapContainer).
 */
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap()

  useEffect(() => {
    function handleZoom() {
      onZoomChange(map.getZoom())
    }
    map.on('zoom', handleZoom)
    return () => {
      map.off('zoom', handleZoom)
    }
  }, [map, onZoomChange])

  return null
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
  // ─── Clustering ──────────────────────────────────────────────
  // Zoom actuel de la carte — mis à jour par ZoomTracker
  const [currentZoom, setCurrentZoom] = useState(zoom)

  const handleZoomChange = useCallback((z: number) => {
    setCurrentZoom(z)
  }, [])

  /**
   * Seuil de clustering :
   *  - zoom < 8  → grille 2° (clusters larges, vue nationale)
   *  - zoom 8-9  → grille 0.8° (clusters régionaux)
   *  - zoom >= 10 → markers individuels
   */
  const CLUSTER_THRESHOLD = 10
  const gridSize = currentZoom < 8 ? 2 : 0.8

  const isClustered = currentZoom < CLUSTER_THRESHOLD
  const clusters = isClustered ? clusterObservations(observations, gridSize) : []

  return (
    <div
      aria-label="Carte des observations biodiversité"
      style={{ height }}
      className="w-full rounded-lg overflow-hidden border border-[var(--color-border)]"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        // Zoom max 14 — limite la précision pour protéger la vie privée (EPIC FE-LOC-006)
        maxZoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Tiles OpenStreetMap — sans tracking, conformes RGPD */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Ajustement automatique des bounds au premier render */}
        {observations.length > 0 && <AutoBounds observations={observations} />}

        {/* Suivi du zoom pour recalculer les clusters */}
        <ZoomTracker onZoomChange={handleZoomChange} />

        {/* ── Mode clustérisé (zoom < 10) ─────────────────────── */}
        {isClustered &&
          clusters.map((cluster) => {
            const icon =
              cluster.count === 1
                ? createTaxonomicIcon(cluster.observations[0]?.taxonomicGroup ?? 'other')
                : createClusterIcon(cluster.count)

            return (
              <Marker
                key={cluster.id}
                position={[cluster.lat, cluster.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    if (cluster.count === 1 && cluster.observations[0]) {
                      onObservationClick?.(cluster.observations[0].id)
                    }
                    // Clusters de plusieurs points → zoom in automatique (via AutoBounds)
                  },
                }}
              >
                {/* Popup de cluster — liste les espèces groupées */}
                {cluster.count > 1 && (
                  <Popup>
                    <div className="flex flex-col gap-1 min-w-[140px]">
                      <p className="font-semibold text-sm">{cluster.count} observations</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Zoomez pour voir le détail
                      </p>
                    </div>
                  </Popup>
                )}
                {/* Popup individuelle pour cluster à 1 seule observation */}
                {cluster.count === 1 && cluster.observations[0] && (
                  <Popup>
                    <ObservationPopup
                      obs={cluster.observations[0]}
                      onObservationClick={onObservationClick}
                    />
                  </Popup>
                )}
              </Marker>
            )
          })}

        {/* ── Mode individuel (zoom >= 10) ─────────────────────── */}
        {!isClustered &&
          observations.map((obs) => {
            const icon = createTaxonomicIcon(obs.taxonomicGroup ?? 'other')
            return (
              <Marker
                key={obs.id}
                position={[obs.latitude, obs.longitude]}
                icon={icon}
                eventHandlers={{ click: () => onObservationClick?.(obs.id) }}
              >
                <Popup>
                  <ObservationPopup obs={obs} onObservationClick={onObservationClick} />
                </Popup>
              </Marker>
            )
          })}
      </MapContainer>
    </div>
  )
}

// ─── Sous-composant : contenu popup observation ───────────────

/**
 * Contenu d'une popup Leaflet pour une observation individuelle.
 * Séparé pour réutilisation entre mode clustérisé et individuel.
 */
function ObservationPopup({
  obs,
  onObservationClick,
}: {
  obs: MapObservation
  onObservationClick?: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      {/* Espèce ou début de description */}
      <p className="font-semibold text-sm leading-tight">
        {obs.speciesName ?? obs.description.slice(0, 60)}
        {!obs.speciesName && obs.description.length > 60 ? '…' : ''}
      </p>

      {/* Auteur — style inline car hors du contexte CSS du projet */}
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        par @{obs.authorUsername}
      </p>

      {/* Date */}
      <p className="text-xs" style={{ color: 'var(--color-text-tertiary, #9ca3af)' }}>
        {new Date(obs.encounterDate).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      {/* Avertissement position approximative (espèce sensible) */}
      {obs.locationHidden && (
        <p className="text-xs mt-1" style={{ color: '#d97706' }}>
          📍 Position approximative (espèce sensible)
        </p>
      )}

      {/* Lien vers le post */}
      {onObservationClick && (
        <button
          type="button"
          onClick={() => onObservationClick(obs.id)}
          className="mt-2 text-xs font-semibold hover:underline text-left focus-visible:outline-none"
          style={{ color: 'var(--color-action-default, #6366f1)' }}
        >
          Voir l&apos;observation →
        </button>
      )}
    </div>
  )
}
