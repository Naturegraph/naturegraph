/**
 * Types pour les données de l'application
 * Réutilisables pour l'intégration backend
 */

export type { Species, SpeciesCategory, ConservationStatus } from '../data/mock/species'

export type { UserProfile, Gender, Interest, SocialMedia } from '../data/mock/users'

export type {
  Post,
  PostType,
  NatureEncounter,
  NatureInstant,
  TimeOfDay,
  WeatherCondition,
  HabitatType,
  TaxonomicGroup,
} from '../data/mock/posts'

export type { Media, MediaType, MediaFormat, MediaOrientation } from '../data/mock/media'

/**
 * Types utilitaires pour les réponses API
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface ApiError {
  message: string
  code: string
  details?: Record<string, unknown>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface SearchFilters {
  query?: string
  category?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  location?: {
    latitude: number
    longitude: number
    radius: number
  }
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}
