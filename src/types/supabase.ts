/**
 * supabase.ts — Types TypeScript générés depuis le schéma Supabase
 * =================================================================
 * ⚠️  NE PAS ÉDITER MANUELLEMENT
 *
 * Généré via : npx supabase gen types typescript --project-id <id>
 * Ou via MCP tool : mcp__supabase__generate_typescript_types
 *
 * Dernière mise à jour : 2026-04-16
 * Tables couvertes : blocks, comments, community_photos, follows, fr_cities,
 *   identification_proposals, media, notebook_observations, notebooks,
 *   notifications, posts, profiles, reactions, reports, spatial_ref_sys,
 *   species_master, taxref_cache, user_settings
 * Vues : geography_columns, geometry_columns, profiles_public, species_full
 * Fonctions : nearby_posts, search_cities, update_user_location,
 *   clear_user_location, reverse_geocode_city, immutable_unaccent, + PostGIS
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey'
            columns: ['blocked_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blocks_blocked_id_fkey'
            columns: ['blocked_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey'
            columns: ['blocker_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey'
            columns: ['blocker_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      community_photos: {
        Row: {
          alt: string
          consent_verified: boolean
          created_at: string
          id: string
          instagram_url: string | null
          is_active: boolean
          photographer_name: string | null
          src: string
          tagline: string
        }
        Insert: {
          alt: string
          consent_verified?: boolean
          created_at?: string
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          photographer_name?: string | null
          src: string
          tagline?: string
        }
        Update: {
          alt?: string
          consent_verified?: boolean
          created_at?: string
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          photographer_name?: string | null
          src?: string
          tagline?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey'
            columns: ['follower_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'follows_follower_id_fkey'
            columns: ['follower_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'follows_following_id_fkey'
            columns: ['following_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'follows_following_id_fkey'
            columns: ['following_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      fr_cities: {
        Row: {
          centroid: unknown
          department_code: string
          department_name: string
          insee_code: string
          name: string
          name_normalized: string
          population: number | null
          region_code: string
          region_name: string
        }
        Insert: {
          centroid: unknown
          department_code: string
          department_name: string
          insee_code: string
          name: string
          name_normalized: string
          population?: number | null
          region_code: string
          region_name: string
        }
        Update: {
          centroid?: unknown
          department_code?: string
          department_name?: string
          insee_code?: string
          name?: string
          name_normalized?: string
          population?: number | null
          region_code?: string
          region_name?: string
        }
        Relationships: []
      }
      identification_proposals: {
        Row: {
          author_id: string
          confidence: string | null
          created_at: string | null
          id: string
          notes: string | null
          post_id: string
          scientific_name: string | null
          species_name: string
          taxref_id: string | null
          votes_down: number | null
          votes_up: number | null
        }
        Insert: {
          author_id: string
          confidence?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          post_id: string
          scientific_name?: string | null
          species_name: string
          taxref_id?: string | null
          votes_down?: number | null
          votes_up?: number | null
        }
        Update: {
          author_id?: string
          confidence?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          post_id?: string
          scientific_name?: string | null
          species_name?: string
          taxref_id?: string | null
          votes_down?: number | null
          votes_up?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'identification_proposals_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'identification_proposals_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'identification_proposals_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
        ]
      }
      media: {
        Row: {
          alt: string | null
          aperture: string | null
          camera: string | null
          captured_at: string | null
          copyright_notice: string | null
          created_at: string | null
          display_order: number
          file_size: number | null
          focal_length: number | null
          format: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_point: unknown
          height: number | null
          id: string
          iso: number | null
          lens: string | null
          license: string | null
          mime_type: string | null
          orientation: string | null
          original_url: string | null
          post_id: string
          shutter_speed: string | null
          status: string | null
          thumbnail_url: string | null
          type: string
          updated_at: string | null
          url: string
          user_id: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          aperture?: string | null
          camera?: string | null
          captured_at?: string | null
          copyright_notice?: string | null
          created_at?: string | null
          display_order: number
          file_size?: number | null
          focal_length?: number | null
          format?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_point?: unknown
          height?: number | null
          id?: string
          iso?: number | null
          lens?: string | null
          license?: string | null
          mime_type?: string | null
          orientation?: string | null
          original_url?: string | null
          post_id: string
          shutter_speed?: string | null
          status?: string | null
          thumbnail_url?: string | null
          type: string
          updated_at?: string | null
          url: string
          user_id: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          aperture?: string | null
          camera?: string | null
          captured_at?: string | null
          copyright_notice?: string | null
          created_at?: string | null
          display_order?: number
          file_size?: number | null
          focal_length?: number | null
          format?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_point?: unknown
          height?: number | null
          id?: string
          iso?: number | null
          lens?: string | null
          license?: string | null
          mime_type?: string | null
          orientation?: string | null
          original_url?: string | null
          post_id?: string
          shutter_speed?: string | null
          status?: string | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string | null
          url?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'media_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'media_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'media_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      notebook_observations: {
        Row: {
          added_at: string | null
          notebook_id: string
          observation_id: string
        }
        Insert: {
          added_at?: string | null
          notebook_id: string
          observation_id: string
        }
        Update: {
          added_at?: string | null
          notebook_id?: string
          observation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notebook_observations_notebook_id_fkey'
            columns: ['notebook_id']
            isOneToOne: false
            referencedRelation: 'notebooks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebook_observations_observation_id_fkey'
            columns: ['observation_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
        ]
      }
      notebooks: {
        Row: {
          author_id: string
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          author_id: string
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          author_id?: string
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notebooks_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebooks_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          read: boolean | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      posts: {
        Row: {
          city: string | null
          comments_count: number | null
          country: string | null
          created_at: string | null
          description: string
          encounter_date: string
          habitat: string | null
          id: string
          identification_status: string | null
          latitude: number | null
          likes_count: number | null
          location_hidden: boolean | null
          location_name: string | null
          location_point: unknown
          longitude: number | null
          multiple_observations: boolean | null
          phenomenon: string | null
          published_at: string | null
          region: string | null
          scientific_name: string | null
          shares_count: number | null
          species_id: string | null
          species_identified: boolean | null
          species_name: string | null
          status: string | null
          tags: string[] | null
          taxonomic_group: string | null
          taxref_id: string | null
          taxref_license: string | null
          taxref_rank: string | null
          taxref_source: string | null
          taxref_updated_at: string | null
          time_of_day: string | null
          type: string
          updated_at: string | null
          user_id: string
          views_count: number | null
          visibility: string | null
          weather: string | null
        }
        Insert: {
          city?: string | null
          comments_count?: number | null
          country?: string | null
          created_at?: string | null
          description: string
          encounter_date: string
          habitat?: string | null
          id?: string
          identification_status?: string | null
          latitude?: number | null
          likes_count?: number | null
          location_hidden?: boolean | null
          location_name?: string | null
          location_point?: unknown
          longitude?: number | null
          multiple_observations?: boolean | null
          phenomenon?: string | null
          published_at?: string | null
          region?: string | null
          scientific_name?: string | null
          shares_count?: number | null
          species_id?: string | null
          species_identified?: boolean | null
          species_name?: string | null
          status?: string | null
          tags?: string[] | null
          taxonomic_group?: string | null
          taxref_id?: string | null
          taxref_license?: string | null
          taxref_rank?: string | null
          taxref_source?: string | null
          taxref_updated_at?: string | null
          time_of_day?: string | null
          type: string
          updated_at?: string | null
          user_id: string
          views_count?: number | null
          visibility?: string | null
          weather?: string | null
        }
        Update: {
          city?: string | null
          comments_count?: number | null
          country?: string | null
          created_at?: string | null
          description?: string
          encounter_date?: string
          habitat?: string | null
          id?: string
          identification_status?: string | null
          latitude?: number | null
          likes_count?: number | null
          location_hidden?: boolean | null
          location_name?: string | null
          location_point?: unknown
          longitude?: number | null
          multiple_observations?: boolean | null
          phenomenon?: string | null
          published_at?: string | null
          region?: string | null
          scientific_name?: string | null
          shares_count?: number | null
          species_id?: string | null
          species_identified?: boolean | null
          species_name?: string | null
          status?: string | null
          tags?: string[] | null
          taxonomic_group?: string | null
          taxref_id?: string | null
          taxref_license?: string | null
          taxref_rank?: string | null
          taxref_source?: string | null
          taxref_updated_at?: string | null
          time_of_day?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
          visibility?: string | null
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'posts_species_id_fkey'
            columns: ['species_id']
            isOneToOne: false
            referencedRelation: 'species_full'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'posts_species_id_fkey'
            columns: ['species_id']
            isOneToOne: false
            referencedRelation: 'species_master'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          city_name: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          first_name: string
          followers_count: number | null
          following_count: number | null
          gender: string | null
          id: string
          instagram: string | null
          interests: string[] | null
          is_public: boolean | null
          last_login_at: string | null
          last_name: string
          location_consent_source: string | null
          location_point: unknown
          location_radius_km: number | null
          location_updated_at: string | null
          location_visibility: string | null
          posts_count: number | null
          region: string | null
          region_name: string | null
          twitter: string | null
          updated_at: string | null
          username: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          city_name?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          first_name: string
          followers_count?: number | null
          following_count?: number | null
          gender?: string | null
          id: string
          instagram?: string | null
          interests?: string[] | null
          is_public?: boolean | null
          last_login_at?: string | null
          last_name: string
          location_consent_source?: string | null
          location_point?: unknown
          location_radius_km?: number | null
          location_updated_at?: string | null
          location_visibility?: string | null
          posts_count?: number | null
          region?: string | null
          region_name?: string | null
          twitter?: string | null
          updated_at?: string | null
          username: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          city_name?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          first_name?: string
          followers_count?: number | null
          following_count?: number | null
          gender?: string | null
          id?: string
          instagram?: string | null
          interests?: string[] | null
          is_public?: boolean | null
          last_login_at?: string | null
          last_name?: string
          location_consent_source?: string | null
          location_point?: unknown
          location_radius_km?: number | null
          location_updated_at?: string | null
          location_visibility?: string | null
          posts_count?: number | null
          region?: string | null
          region_name?: string | null
          twitter?: string | null
          updated_at?: string | null
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reactions_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          post_id: string | null
          profile_id: string | null
          reason: string
          reporter_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          post_id?: string | null
          profile_id?: string | null
          reason: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          post_id?: string | null
          profile_id?: string | null
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reports_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      species_master: {
        Row: {
          common_name_en: string | null
          common_name_fr: string
          created_at: string | null
          gbif_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          popularity: number | null
          scientific_name: string
          source: string | null
          synonyms: string[] | null
          taxonomic_group: string
          taxref_id: string | null
          updated_at: string | null
        }
        Insert: {
          common_name_en?: string | null
          common_name_fr: string
          created_at?: string | null
          gbif_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          popularity?: number | null
          scientific_name: string
          source?: string | null
          synonyms?: string[] | null
          taxonomic_group: string
          taxref_id?: string | null
          updated_at?: string | null
        }
        Update: {
          common_name_en?: string | null
          common_name_fr?: string
          created_at?: string | null
          gbif_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          popularity?: number | null
          scientific_name?: string
          source?: string | null
          synonyms?: string[] | null
          taxonomic_group?: string
          taxref_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'species_master_taxref_id_fkey'
            columns: ['taxref_id']
            isOneToOne: false
            referencedRelation: 'taxref_cache'
            referencedColumns: ['cd_nom']
          },
        ]
      }
      taxref_cache: {
        Row: {
          author: string | null
          cached_at: string | null
          cd_nom: string
          cd_ref: string | null
          class_name: string | null
          common_name_en: string | null
          common_name_fr: string | null
          conservation_status: string | null
          expires_at: string | null
          family: string | null
          genus: string | null
          group: string | null
          kingdom: string | null
          normalized_common_name: string | null
          normalized_scientific_name: string | null
          order: string | null
          phylum: string | null
          rank: string | null
          scientific_name: string
          search_vector: unknown
          synonyms: string[] | null
          taxref_version: string | null
        }
        Insert: {
          author?: string | null
          cached_at?: string | null
          cd_nom: string
          cd_ref?: string | null
          class_name?: string | null
          common_name_en?: string | null
          common_name_fr?: string | null
          conservation_status?: string | null
          expires_at?: string | null
          family?: string | null
          genus?: string | null
          group?: string | null
          kingdom?: string | null
          normalized_common_name?: string | null
          normalized_scientific_name?: string | null
          order?: string | null
          phylum?: string | null
          rank?: string | null
          scientific_name: string
          search_vector?: unknown
          synonyms?: string[] | null
          taxref_version?: string | null
        }
        Update: {
          author?: string | null
          cached_at?: string | null
          cd_nom?: string
          cd_ref?: string | null
          class_name?: string | null
          common_name_en?: string | null
          common_name_fr?: string | null
          conservation_status?: string | null
          expires_at?: string | null
          family?: string | null
          genus?: string | null
          group?: string | null
          kingdom?: string | null
          normalized_common_name?: string | null
          normalized_scientific_name?: string | null
          order?: string | null
          phylum?: string | null
          rank?: string | null
          scientific_name?: string
          search_vector?: unknown
          synonyms?: string[] | null
          taxref_version?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          email_notifications: boolean
          language: string
          newsletter: boolean
          push_notifications: boolean
          reduced_motion: boolean
          show_sensitive_data: boolean
          theme: string
          updated_at: string
          user_id: string
          weekly_goal: number
        }
        Insert: {
          email_notifications?: boolean
          language?: string
          newsletter?: boolean
          push_notifications?: boolean
          reduced_motion?: boolean
          show_sensitive_data?: boolean
          theme?: string
          updated_at?: string
          user_id: string
          weekly_goal?: number
        }
        Update: {
          email_notifications?: boolean
          language?: string
          newsletter?: boolean
          push_notifications?: boolean
          reduced_motion?: boolean
          show_sensitive_data?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
          weekly_goal?: number
        }
        Relationships: [
          {
            foreignKeyName: 'user_settings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_settings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string | null
          first_name: string | null
          followers_count: number | null
          following_count: number | null
          id: string | null
          interests: string[] | null
          is_public: boolean | null
          last_name: string | null
          location_label: string | null
          location_radius_km: number | null
          location_visibility: string | null
          posts_count: number | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          country_code?: never
          created_at?: string | null
          first_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string | null
          interests?: string[] | null
          is_public?: boolean | null
          last_name?: string | null
          location_label?: never
          location_radius_km?: never
          location_visibility?: string | null
          posts_count?: number | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          country_code?: never
          created_at?: string | null
          first_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string | null
          interests?: string[] | null
          is_public?: boolean | null
          last_name?: string | null
          location_label?: never
          location_radius_km?: never
          location_visibility?: string | null
          posts_count?: number | null
          username?: string | null
        }
        Relationships: []
      }
      species_full: {
        Row: {
          common_name_en: string | null
          common_name_fr: string | null
          conservation_status: string | null
          id: string | null
          image_url: string | null
          popularity: number | null
          scientific_name: string | null
          source: string | null
          synonyms: string[] | null
          taxonomic_group: string | null
          taxref_author: string | null
          taxref_common_name_en: string | null
          taxref_family: string | null
          taxref_genus: string | null
          taxref_id: string | null
          taxref_order: string | null
          taxref_version: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'species_master_taxref_id_fkey'
            columns: ['taxref_id']
            isOneToOne: false
            referencedRelation: 'taxref_cache'
            referencedColumns: ['cd_nom']
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ''?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { '': string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      can_see_notebook: { Args: { p_notebook_id: string }; Returns: boolean }
      can_see_post: { Args: { p_post_id: string }; Returns: boolean }
      clear_user_location: { Args: { p_user_id: string }; Returns: undefined }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { '': string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { '': string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      immutable_unaccent: { Args: { '': string }; Returns: string }
      longtransactionsenabled: { Args: never; Returns: boolean }
      nearby_posts: {
        Args: {
          requesting_user_id: string
          result_limit?: number
          result_offset?: number
        }
        Returns: {
          distance_km: number
          is_nearby: boolean
          post_id: string
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      reverse_geocode_city: {
        Args: { lat: number; lng: number; max_distance_km?: number }
        Returns: {
          department_code: string
          department_name: string
          distance_km: number
          insee_code: string
          name: string
          region_name: string
        }[]
      }
      search_cities: {
        Args: { max_results?: number; query: string }
        Returns: {
          centroid_lat: number
          centroid_lng: number
          department_code: string
          department_name: string
          insee_code: string
          name: string
          population: number
          region_name: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { '': string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { '': string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
      st_astext: { Args: { '': string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { '': string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { '': string }; Returns: unknown }
      st_geographyfromtext: { Args: { '': string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { '': string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { '': string }; Returns: unknown }
      st_geomfromewkt: { Args: { '': string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': string }; Returns: unknown }
      st_geomfromgml: { Args: { '': string }; Returns: unknown }
      st_geomfromkml: { Args: { '': string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { '': string }; Returns: unknown }
      st_gmltosql: { Args: { '': string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database['public']['CompositeTypes']['valid_detail']
        SetofOptions: {
          from: '*'
          to: 'valid_detail'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { '': string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { '': string }; Returns: unknown }
      st_mpointfromtext: { Args: { '': string }; Returns: unknown }
      st_mpolyfromtext: { Args: { '': string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { '': string }; Returns: unknown }
      st_multipointfromtext: { Args: { '': string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { '': string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { '': string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { '': string }; Returns: unknown }
      st_polygonfromtext: { Args: { '': string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { '': string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unaccent: { Args: { '': string }; Returns: string }
      unlockrows: { Args: { '': string }; Returns: number }
      update_user_location: {
        Args: {
          p_centroid_lat: number
          p_centroid_lng: number
          p_city_name: string
          p_consent_source: string
          p_country_code: string
          p_radius_km: number
          p_region_name: string
          p_user_id: string
          p_visibility: string
        }
        Returns: Json
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
