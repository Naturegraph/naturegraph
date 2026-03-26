// ============================================
// Database types — Naturegraph
// Maps to Supabase PostgreSQL schema
// Source of truth: docs/DATA_ARCHITECTURE.md
// ============================================

// ─── Enums ───────────────────────────────────

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export type Interest =
  | 'birds'
  | 'mammals'
  | 'insects'
  | 'amphibians'
  | 'reptiles'
  | 'arachnids'
  | 'mollusks'
  | 'fish'
  | 'plants'
  | 'other'

export type PostType = 'nature_encounter' | 'nature_instant'
export type PostStatus = 'draft' | 'published' | 'archived'
export type Visibility = 'public' | 'private' | 'followers'
export type IdentificationStatus = 'identified' | 'pending' | 'disputed'

export type TimeOfDay = 'morning' | 'afternoon' | 'dusk' | 'evening' | 'night'
export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'snowy'
export type HabitatType =
  | 'forest'
  | 'park_garden'
  | 'prairie_heath'
  | 'urban'
  | 'river'
  | 'lake_wetland'
  | 'mountain'
  | 'sea_coast'

export type TaxonomicGroup =
  | 'birds'
  | 'mammals'
  | 'insects'
  | 'amphibians'
  | 'reptiles'
  | 'arachnids'
  | 'mollusks'
  | 'fish'
  | 'plants'
  | 'other'

export type ReactionType = 'love' | 'fire' | 'hands' | 'trophy' | 'star'

export type MediaType = 'photo' | 'video'
export type MediaFormat = 'square' | 'portrait' | 'landscape' | 'free'
export type MediaOrientation = 'horizontal' | 'vertical' | 'square'
export type MediaStatus = 'uploading' | 'processing' | 'ready' | 'error'

export type NotebookVisibility = 'private' | 'public' | 'collaborative'

export type NotificationType =
  | 'comment'
  | 'identification'
  | 'vote'
  | 'follow'
  | 'notebook_invite'
  | 'notebook_contribution'

export type IdentificationConfidence = 'certain' | 'probable' | 'possible'

export type ConservationStatus =
  | 'extinct'
  | 'extinct_wild'
  | 'critically_endangered'
  | 'endangered'
  | 'vulnerable'
  | 'near_threatened'
  | 'least_concern'
  | 'data_deficient'
  | 'not_evaluated'

// ─── Tables ──────────────────────────────────

export interface Profile {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  gender: Gender | null
  birth_date: string | null
  bio: string | null
  interests: Interest[]
  city: string | null
  region: string | null
  country: string | null
  instagram: string | null
  twitter: string | null
  website: string | null
  is_public: boolean
  email_verified: boolean
  avatar_url: string | null
  banner_url: string | null
  posts_count: number
  followers_count: number
  following_count: number
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface Post {
  id: string
  user_id: string
  type: PostType
  status: PostStatus
  visibility: Visibility
  description: string
  tags: string[]
  // Location
  city: string | null
  region: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  location_name: string | null
  location_hidden: boolean
  // Context
  encounter_date: string
  time_of_day: TimeOfDay | null
  weather: WeatherCondition | null
  habitat: HabitatType | null
  multiple_observations: boolean
  // Identification (nature_encounter)
  species_identified: boolean | null
  species_name: string | null
  scientific_name: string | null
  taxonomic_group: TaxonomicGroup | null
  identification_status: IdentificationStatus
  taxref_id: string | null
  taxref_rank: string | null
  taxref_source: string | null
  taxref_license: string | null
  taxref_updated_at: string | null
  // Phenomenon (nature_instant)
  phenomenon: string | null
  // Counters (denormalized)
  likes_count: number
  comments_count: number
  shares_count: number
  views_count: number
  // Timestamps
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface Media {
  id: string
  post_id: string
  user_id: string
  type: MediaType
  format: MediaFormat | null
  orientation: MediaOrientation | null
  status: MediaStatus
  url: string
  thumbnail_url: string | null
  original_url: string | null
  display_order: number
  alt: string | null
  width: number | null
  height: number | null
  file_size: number | null
  mime_type: string | null
  // EXIF data
  captured_at: string | null
  camera: string | null
  lens: string | null
  focal_length: number | null
  aperture: string | null
  iso: number | null
  shutter_speed: string | null
  // GPS from EXIF
  gps_latitude: number | null
  gps_longitude: number | null
  // Timestamps
  created_at: string
  updated_at: string
}

export interface Reaction {
  id: string
  post_id: string
  user_id: string
  type: ReactionType
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface IdentificationProposal {
  id: string
  post_id: string
  author_id: string
  species_name: string
  scientific_name: string | null
  taxref_id: string | null
  confidence: IdentificationConfidence | null
  notes: string | null
  votes_up: number
  votes_down: number
  created_at: string
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface Notebook {
  id: string
  author_id: string
  title: string
  description: string | null
  visibility: NotebookVisibility
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface NotebookObservation {
  notebook_id: string
  observation_id: string
  added_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  reference_id: string | null
  reference_type: string | null
  read: boolean
  created_at: string
}

export interface TaxrefEntry {
  cd_nom: string
  cd_ref: string | null
  scientific_name: string
  common_name_fr: string | null
  common_name_en: string | null
  author: string | null
  kingdom: string | null
  phylum: string | null
  class_name: string | null
  order: string | null
  family: string | null
  genus: string | null
  rank: string | null
  group: string | null
  conservation_status: ConservationStatus | null
  taxref_version: string | null
  cached_at: string
  expires_at: string | null
}

// ─── Supabase Database type helper ───────────

type AutoTimestamps = 'created_at' | 'updated_at'
type AutoId = 'id'
type AutoCounters = 'posts_count' | 'followers_count' | 'following_count'

export interface Database {
  public: {
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, AutoTimestamps | 'last_login_at' | AutoCounters | 'email_verified'> &
          Partial<Pick<Profile, 'is_public' | 'gender' | 'birth_date' | 'bio' | 'interests'>>
        Update: Partial<Omit<Profile, AutoId | 'email' | AutoTimestamps | AutoCounters>>
        Relationships: []
      }
      posts: {
        Row: Post
        Insert: Omit<
          Post,
          | AutoId
          | AutoTimestamps
          | 'published_at'
          | 'likes_count'
          | 'comments_count'
          | 'shares_count'
          | 'views_count'
        > &
          Partial<
            Pick<
              Post,
              'status' | 'visibility' | 'tags' | 'location_hidden' | 'multiple_observations'
            >
          >
        Update: Partial<
          Omit<
            Post,
            | AutoId
            | 'user_id'
            | AutoTimestamps
            | 'likes_count'
            | 'comments_count'
            | 'shares_count'
            | 'views_count'
          >
        >
        Relationships: []
      }
      media: {
        Row: Media
        Insert: Omit<Media, AutoId | AutoTimestamps | 'status' | 'thumbnail_url' | 'original_url'>
        Update: Partial<Omit<Media, AutoId | 'post_id' | 'user_id' | AutoTimestamps>>
        Relationships: []
      }
      reactions: {
        Row: Reaction
        Insert: Omit<Reaction, AutoId | 'created_at'>
        Update: never
        Relationships: []
      }
      comments: {
        Row: Comment
        Insert: Omit<Comment, AutoId | AutoTimestamps>
        Update: Pick<Comment, 'content'>
        Relationships: []
      }
      identification_proposals: {
        Row: IdentificationProposal
        Insert: Omit<IdentificationProposal, AutoId | 'votes_up' | 'votes_down' | 'created_at'>
        Update: Partial<
          Pick<
            IdentificationProposal,
            'species_name' | 'scientific_name' | 'taxref_id' | 'confidence' | 'notes'
          >
        >
        Relationships: []
      }
      follows: {
        Row: Follow
        Insert: Omit<Follow, 'created_at'>
        Update: never
        Relationships: []
      }
      notebooks: {
        Row: Notebook
        Insert: Omit<Notebook, AutoId | AutoTimestamps>
        Update: Partial<Omit<Notebook, AutoId | 'author_id' | AutoTimestamps>>
        Relationships: []
      }
      notebook_observations: {
        Row: NotebookObservation
        Insert: Omit<NotebookObservation, 'added_at'>
        Update: never
        Relationships: []
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, AutoId | 'created_at' | 'read'>
        Update: Pick<Notification, 'read'>
        Relationships: []
      }
      taxref_cache: {
        Row: TaxrefEntry
        Insert: Omit<TaxrefEntry, 'cached_at'>
        Update: Partial<TaxrefEntry>
        Relationships: []
      }
    }
  }
}

// ─── Utility types ───────────────────────────

/** Post with joined author profile */
export interface PostWithAuthor extends Post {
  author: Pick<Profile, 'id' | 'username' | 'first_name' | 'last_name' | 'avatar_url'>
}

/** Post with all related data for feed display */
export interface PostFeedItem extends PostWithAuthor {
  media: Media[]
  user_reaction: ReactionType | null
}

/** Profile with follow status for display */
export interface ProfileWithFollowStatus extends Profile {
  is_following: boolean
  is_followed_by: boolean
}

/** Identification proposal with author info */
export interface ProposalWithAuthor extends IdentificationProposal {
  author: Pick<Profile, 'id' | 'username' | 'avatar_url'>
}
