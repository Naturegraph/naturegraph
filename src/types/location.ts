/**
 * Types de localisation : Naturegraph
 * =====================================
 * Modèle privacy-first : on distingue explicitement
 * ce que l'utilisateur déclare, ce qu'on stocke en DB,
 * et ce qu'on expose aux autres utilisateurs.
 *
 * ⚠️  location_point (geography PostGIS) n'existe PAS dans
 *     ces types clients : il est géré côté serveur uniquement.
 */

// ─── Enums ──────────────────────────────────────────────────

/**
 * Granularité de localisation visible par les autres utilisateurs.
 * 'private'  → rien n'est affiché
 * 'region'   → région seulement (défaut)
 * 'city'     → ville + région
 */
export type LocationVisibility = 'private' | 'region' | 'city'

/**
 * Source du consentement RGPD pour l'audit.
 */
export type LocationConsentSource = 'browser' | 'manual' | 'onboarding' | 'settings'

/**
 * Valeurs de rayon disponibles (km).
 * Min 75 km : garantit qu'une ville ≠ un individu en zone rurale.
 */
export type LocationRadius = 75 | 100 | 150 | 250

// ─── Données ville ───────────────────────────────────────────

/**
 * Résultat de l'autocomplete : données publiques d'une commune.
 * Retourné par la RPC search_cities ou l'API Adresse.
 */
export interface CityResult {
  /** Code INSEE (5 chiffres). Ex: "38185" = Grenoble */
  inseeCode: string
  /** Nom officiel. Ex: "Grenoble" */
  name: string
  /** Région. Ex: "Auvergne-Rhône-Alpes" */
  regionName: string
  /** Département. Ex: "Isère" */
  departmentName: string
  /** Code département (utile pour lever les ambiguïtés). Ex: "38" */
  departmentCode: string
  /** Population (pour tri des suggestions grandes villes en premier) */
  population: number | null
  /** Centroïde : envoyé au serveur pour update_user_location, jamais affiché */
  centroidLat: number
  centroidLng: number
  /**
   * Pays (déduit de la source autocomplete) : « France » pour API Adresse
   * data.gouv.fr, « Canada » pour les villes québécoises remontées par
   * search_cities. Persisté avec le post pour qu'on puisse afficher « France »
   * ou « Canada » en fallback quand la localisation est privée
   * (Nicolas 2026-05-23 : un user qui cache la ville doit quand même voir
   * d'où vient l'observation au pays près).
   */
  country: string
}

/**
 * Localisation stockée dans le profil (champs lisibles côté client).
 * Ne contient PAS location_point.
 */
export interface UserLocationData {
  cityName: string | null
  regionName: string | null
  countryCode: string
  locationRadiusKm: LocationRadius
  locationVisibility: LocationVisibility
  locationConsentSource: LocationConsentSource | null
  locationUpdatedAt: string | null
}

/**
 * Ce que voient les AUTRES utilisateurs via profiles_public.
 * Champ location_label = déjà formaté par la vue SQL.
 */
export interface PublicLocationLabel {
  /** "Grenoble · Auvergne-Rhône-Alpes" ou "Auvergne-Rhône-Alpes" ou null */
  locationLabel: string | null
  /** Code pays ISO (ex: "FR") : null si visibility=private */
  countryCode: string | null
  /** Rayon déclaré : null si visibility=private */
  locationRadiusKm: LocationRadius | null
  locationVisibility: LocationVisibility
}

// ─── Formulaire ──────────────────────────────────────────────

/**
 * Données du formulaire de localisation (picker + slider + toggle).
 * Envoyées à update_user_location() via Supabase RPC.
 */
export interface LocationFormData {
  city: CityResult
  radiusKm: LocationRadius
  visibility: LocationVisibility
  consentSource: LocationConsentSource
}

// ─── Résultats API Adresse ───────────────────────────────────

/**
 * Feature GeoJSON retournée par api-adresse.data.gouv.fr
 * (type=municipality, limit=5)
 */
export interface AdresseFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  }
  properties: {
    id: string // code INSEE
    name: string // nom commune
    city: string // même que name pour municipality
    context: string // "38, Isère, Auvergne-Rhône-Alpes"
    score: number // score de pertinence 0-1
    population: number
    type: 'municipality'
    label: string // "Grenoble (38000)"
  }
}

export interface AdresseSearchResponse {
  type: 'FeatureCollection'
  features: AdresseFeature[]
}

// ─── État du contexte ────────────────────────────────────────

/**
 * État complet du LocationContext.
 */
export interface LocationContextState {
  /** Données de localisation de l'utilisateur courant */
  userLocation: UserLocationData | null
  /** true si une localisation est définie (city ou region non null) */
  isLocalized: boolean
  /** true pendant le chargement initial */
  isLoading: boolean
  /** Met à jour la localisation via RPC update_user_location */
  updateLocation: (data: LocationFormData) => Promise<{ error: string | null }>
  /** Efface la localisation via RPC clear_user_location */
  clearLocation: () => Promise<{ error: string | null }>
  /** Label public formaté pour l'affichage dans l'UI */
  getVisibilityLabel: () => string | null
  /** Label du rayon (ex: "75 km") */
  getRadiusLabel: () => string
}

// ─── Constantes ──────────────────────────────────────────────

/** Valeurs de rayon disponibles avec labels */
export const RADIUS_OPTIONS: { value: LocationRadius; label: string }[] = [
  { value: 75, label: '75 km' },
  { value: 100, label: '100 km' },
  { value: 150, label: '150 km' },
  { value: 250, label: '250 km' },
]

/** Rayon par défaut (minimum privacy-safe) */
export const DEFAULT_RADIUS: LocationRadius = 75

/** Visibilité par défaut (région seulement) */
export const DEFAULT_VISIBILITY: LocationVisibility = 'region'
