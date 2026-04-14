/**
 * Types utilitaires pour l'application
 * Réexporte les types database pour usage simplifié
 */

// Imports pour usage local dans ce fichier (SearchFilters)
import type { PostType, TaxonomicGroup, HabitatType, PostStatus } from './database'

// Re-export all database types for convenience
export type {
  Gender,
  Interest,
  PostType,
  PostStatus,
  Visibility,
  IdentificationStatus,
  TimeOfDay,
  WeatherCondition,
  HabitatType,
  TaxonomicGroup,
  ReactionType,
  MediaType,
  MediaFormat,
  MediaOrientation,
  MediaStatus,
  NotebookVisibility,
  NotificationType,
  IdentificationConfidence,
  ConservationStatus,
  Profile,
  Post,
  Media,
  Reaction,
  Comment,
  IdentificationProposal,
  Follow,
  Notebook,
  NotebookObservation,
  Notification,
  TaxrefEntry,
  PostWithAuthor,
  PostFeedItem,
  ProfileWithFollowStatus,
  ProposalWithAuthor,
} from './database'

/**
 * API response wrappers
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

/**
 * Search & filtering
 */
export interface SearchFilters {
  query?: string
  type?: PostType
  taxonomicGroup?: TaxonomicGroup
  habitat?: HabitatType
  status?: PostStatus
  dateFrom?: string
  dateTo?: string
  location?: {
    latitude: number
    longitude: number
    radius: number // km
  }
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}
