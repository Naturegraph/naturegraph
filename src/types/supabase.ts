export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: string
          created_at: string
          duration_days: number | null
          id: string
          is_reversible: boolean
          metadata: Json | null
          performed_by: string
          reason: string
          related_report_id: string | null
          reverted_at: string | null
          reverted_by: string | null
          target_content_id: string | null
          target_content_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          duration_days?: number | null
          id?: string
          is_reversible?: boolean
          metadata?: Json | null
          performed_by: string
          reason: string
          related_report_id?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          target_content_id?: string | null
          target_content_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          duration_days?: number | null
          id?: string
          is_reversible?: boolean
          metadata?: Json | null
          performed_by?: string
          reason?: string
          related_report_id?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          target_content_id?: string | null
          target_content_type?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'admin_actions_performed_by_fkey'
            columns: ['performed_by']
            isOneToOne: false
            referencedRelation: 'admin_users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'admin_actions_related_report_id_fkey'
            columns: ['related_report_id']
            isOneToOne: false
            referencedRelation: 'moderation_reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'admin_actions_reverted_by_fkey'
            columns: ['reverted_by']
            isOneToOne: false
            referencedRelation: 'admin_users'
            referencedColumns: ['id']
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'admin_audit_logs_admin_user_id_fkey'
            columns: ['admin_user_id']
            isOneToOne: false
            referencedRelation: 'admin_users'
            referencedColumns: ['id']
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_access_keys: {
        Row: {
          batch_number: number
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number
          notes: string | null
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          batch_number: number
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          expires_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number
          notes?: string | null
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          batch_number?: number
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          expires_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number
          notes?: string | null
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      beta_quota_config: {
        Row: {
          accepting_new_signups: boolean
          current_phase: number
          current_user_count: number
          id: number
          max_users_total: number
          updated_at: string
        }
        Insert: {
          accepting_new_signups?: boolean
          current_phase?: number
          current_user_count?: number
          id?: number
          max_users_total?: number
          updated_at?: string
        }
        Update: {
          accepting_new_signups?: boolean
          current_phase?: number
          current_user_count?: number
          id?: number
          max_users_total?: number
          updated_at?: string
        }
        Relationships: []
      }
      beta_signup_log: {
        Row: {
          attempted_code: string | null
          created_at: string
          id: string
          ip_address: unknown
          outcome: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempted_code?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          outcome: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempted_code?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          outcome?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beta_waitlist: {
        Row: {
          created_at: string
          email: string
          email_error: string | null
          email_status: string | null
          id: string
          invite_count: number
          invited_at: string | null
          invited_with_key_id: string | null
          motivation: string | null
          notes: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_error?: string | null
          email_status?: string | null
          id?: string
          invite_count?: number
          invited_at?: string | null
          invited_with_key_id?: string | null
          motivation?: string | null
          notes?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_error?: string | null
          email_status?: string | null
          id?: string
          invite_count?: number
          invited_at?: string | null
          invited_with_key_id?: string | null
          motivation?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'beta_waitlist_invited_with_key_id_fkey'
            columns: ['invited_with_key_id']
            isOneToOne: false
            referencedRelation: 'beta_access_keys'
            referencedColumns: ['id']
          },
        ]
      }
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
            foreignKeyName: 'comments_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts_public'
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
      hidden_posts: {
        Row: {
          hidden_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          hidden_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hidden_posts_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hidden_posts_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hidden_posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hidden_posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      identification_proposals: {
        Row: {
          author_id: string
          confidence: string | null
          created_at: string | null
          id: string
          is_undetermined: boolean
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
          is_undetermined?: boolean
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
          is_undetermined?: boolean
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
          {
            foreignKeyName: 'identification_proposals_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts_public'
            referencedColumns: ['id']
          },
        ]
      }
      identification_votes: {
        Row: {
          created_at: string
          id: string
          proposal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proposal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'identification_votes_proposal_id_fkey'
            columns: ['proposal_id']
            isOneToOne: false
            referencedRelation: 'identification_proposals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'identification_votes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      media: {
        Row: {
          allow_hd_download: boolean
          alt: string | null
          aperture: string | null
          camera: string | null
          captured_at: string | null
          copyright_notice: string | null
          created_at: string | null
          display_order: number
          exif: Json | null
          file_size: number | null
          focal_length: number | null
          format: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_point: unknown
          height: number | null
          id: string
          is_cover: boolean
          iso: number | null
          lens: string | null
          license: string | null
          mime_type: string | null
          orientation: string | null
          original_url: string | null
          post_id: string
          ratio: number | null
          role: string
          series_group_id: string | null
          shutter_speed: string | null
          species_id: string | null
          status: string | null
          thumbnail_url: string | null
          type: string
          updated_at: string | null
          url: string
          user_id: string
          watermark_enabled: boolean
          watermark_url: string | null
          width: number | null
        }
        Insert: {
          allow_hd_download?: boolean
          alt?: string | null
          aperture?: string | null
          camera?: string | null
          captured_at?: string | null
          copyright_notice?: string | null
          created_at?: string | null
          display_order: number
          exif?: Json | null
          file_size?: number | null
          focal_length?: number | null
          format?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_point?: unknown
          height?: number | null
          id?: string
          is_cover?: boolean
          iso?: number | null
          lens?: string | null
          license?: string | null
          mime_type?: string | null
          orientation?: string | null
          original_url?: string | null
          post_id: string
          ratio?: number | null
          role?: string
          series_group_id?: string | null
          shutter_speed?: string | null
          species_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          type: string
          updated_at?: string | null
          url: string
          user_id: string
          watermark_enabled?: boolean
          watermark_url?: string | null
          width?: number | null
        }
        Update: {
          allow_hd_download?: boolean
          alt?: string | null
          aperture?: string | null
          camera?: string | null
          captured_at?: string | null
          copyright_notice?: string | null
          created_at?: string | null
          display_order?: number
          exif?: Json | null
          file_size?: number | null
          focal_length?: number | null
          format?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_point?: unknown
          height?: number | null
          id?: string
          is_cover?: boolean
          iso?: number | null
          lens?: string | null
          license?: string | null
          mime_type?: string | null
          orientation?: string | null
          original_url?: string | null
          post_id?: string
          ratio?: number | null
          role?: string
          series_group_id?: string | null
          shutter_speed?: string | null
          species_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string | null
          url?: string
          user_id?: string
          watermark_enabled?: boolean
          watermark_url?: string | null
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
            foreignKeyName: 'media_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'media_species_id_fkey'
            columns: ['species_id']
            isOneToOne: false
            referencedRelation: 'species_master'
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
      moderation_reports: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          reason: string
          reporter_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          reason: string
          reporter_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          reason?: string
          reporter_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'moderation_reports_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'admin_users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'moderation_reports_resolved_by_fkey'
            columns: ['resolved_by']
            isOneToOne: false
            referencedRelation: 'admin_users'
            referencedColumns: ['id']
          },
        ]
      }
      notebook_observations: {
        Row: {
          created_at: string
          id: string
          individuals_count: number
          notebook_id: string
          notes: string | null
          observed_at: string
          rank: number
          scientific_name: string | null
          species_name: string
          taxref_id: string
          vernacular_class: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          individuals_count?: number
          notebook_id: string
          notes?: string | null
          observed_at?: string
          rank?: number
          scientific_name?: string | null
          species_name: string
          taxref_id: string
          vernacular_class?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          individuals_count?: number
          notebook_id?: string
          notes?: string | null
          observed_at?: string
          rank?: number
          scientific_name?: string | null
          species_name?: string
          taxref_id?: string
          vernacular_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notebook_observations_notebook_id_fkey'
            columns: ['notebook_id']
            isOneToOne: false
            referencedRelation: 'notebooks'
            referencedColumns: ['id']
          },
        ]
      }
      notebooks: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          finished_at: string | null
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          metadata: Json
          observations_count: number
          post_id: string | null
          region: string | null
          species_count: number
          started_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          finished_at?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          metadata?: Json
          observations_count?: number
          post_id?: string | null
          region?: string | null
          species_count?: number
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          finished_at?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          metadata?: Json
          observations_count?: number
          post_id?: string | null
          region?: string | null
          species_count?: number
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notebooks_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebooks_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebooks_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebooks_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      notification_preferences: {
        Row: {
          enabled: boolean
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notification_preferences_user_id_fkey'
            columns: ['user_id']
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
          display_format: string
          encounter_date: string
          habitat: string | null
          id: string
          identification_status: string | null
          identification_help: boolean | null
          identification_confidence: number | null
          individuals_count: number | null
          latitude: number | null
          likes_count: number | null
          location_hidden: boolean | null
          location_name: string | null
          location_point: unknown
          longitude: number | null
          multiple_observations: boolean | null
          notebook_id: string | null
          phenomenon: string | null
          published_at: string | null
          region: string | null
          scientific_name: string | null
          shares_count: number | null
          short_id: string | null
          species_id: string | null
          species_identified: boolean | null
          species_name: string | null
          status: string | null
          tags: string[] | null
          taxonomic_group: string | null
          taxonomy_node_id: string | null
          taxref_id: string | null
          taxref_license: string | null
          taxref_rank: string | null
          taxref_source: string | null
          taxref_updated_at: string | null
          time_of_day: string | null
          title: string | null
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
          display_format?: string
          encounter_date: string
          habitat?: string | null
          id?: string
          identification_status?: string | null
          identification_help?: boolean | null
          identification_confidence?: number | null
          individuals_count?: number | null
          latitude?: number | null
          likes_count?: number | null
          location_hidden?: boolean | null
          location_name?: string | null
          location_point?: unknown
          longitude?: number | null
          multiple_observations?: boolean | null
          notebook_id?: string | null
          phenomenon?: string | null
          published_at?: string | null
          region?: string | null
          scientific_name?: string | null
          shares_count?: number | null
          short_id?: string | null
          species_id?: string | null
          species_identified?: boolean | null
          species_name?: string | null
          status?: string | null
          tags?: string[] | null
          taxonomic_group?: string | null
          taxonomy_node_id?: string | null
          taxref_id?: string | null
          taxref_license?: string | null
          taxref_rank?: string | null
          taxref_source?: string | null
          taxref_updated_at?: string | null
          time_of_day?: string | null
          title?: string | null
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
          display_format?: string
          encounter_date?: string
          habitat?: string | null
          id?: string
          identification_status?: string | null
          identification_help?: boolean | null
          identification_confidence?: number | null
          individuals_count?: number | null
          latitude?: number | null
          likes_count?: number | null
          location_hidden?: boolean | null
          location_name?: string | null
          location_point?: unknown
          longitude?: number | null
          multiple_observations?: boolean | null
          notebook_id?: string | null
          phenomenon?: string | null
          published_at?: string | null
          region?: string | null
          scientific_name?: string | null
          shares_count?: number | null
          short_id?: string | null
          species_id?: string | null
          species_identified?: boolean | null
          species_name?: string | null
          status?: string | null
          tags?: string[] | null
          taxonomic_group?: string | null
          taxonomy_node_id?: string | null
          taxref_id?: string | null
          taxref_license?: string | null
          taxref_rank?: string | null
          taxref_source?: string | null
          taxref_updated_at?: string | null
          time_of_day?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
          visibility?: string | null
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'posts_notebook_id_fkey'
            columns: ['notebook_id']
            isOneToOne: false
            referencedRelation: 'notebooks'
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
            foreignKeyName: 'posts_taxonomy_node_id_fkey'
            columns: ['taxonomy_node_id']
            isOneToOne: false
            referencedRelation: 'taxonomy_nodes'
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
          facebook: string | null
          first_name: string
          followers_count: number | null
          following_count: number | null
          gender: string | null
          id: string
          instagram: string | null
          interests: string[] | null
          is_internal: boolean
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
          subscription_expires_at: string | null
          subscription_tier: string
          twitter: string | null
          updated_at: string | null
          username: string
          website: string | null
          week_goal: number | null
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
          facebook?: string | null
          first_name: string
          followers_count?: number | null
          following_count?: number | null
          gender?: string | null
          id: string
          instagram?: string | null
          interests?: string[] | null
          is_internal?: boolean
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
          subscription_expires_at?: string | null
          subscription_tier?: string
          twitter?: string | null
          updated_at?: string | null
          username: string
          website?: string | null
          week_goal?: number | null
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
          facebook?: string | null
          first_name?: string
          followers_count?: number | null
          following_count?: number | null
          gender?: string | null
          id?: string
          instagram?: string | null
          interests?: string[] | null
          is_internal?: boolean
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
          subscription_expires_at?: string | null
          subscription_tier?: string
          twitter?: string | null
          updated_at?: string | null
          username?: string
          website?: string | null
          week_goal?: number | null
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
            foreignKeyName: 'reactions_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts_public'
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
            foreignKeyName: 'reports_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts_public'
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
      saved_posts: {
        Row: {
          post_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          post_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          post_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'saved_posts_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'saved_posts_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'saved_posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'saved_posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'security_audit_log_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'security_audit_log_user_id_fkey'
            columns: ['user_id']
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
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email_sent: boolean
          id: string
          ip_address: unknown
          message: string
          resolved_at: string | null
          status: string
          subject: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          id?: string
          ip_address?: unknown
          message: string
          resolved_at?: string | null
          status?: string
          subject: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          id?: string
          ip_address?: unknown
          message?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'support_tickets_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'support_tickets_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles_public'
            referencedColumns: ['id']
          },
        ]
      }
      taxonomy_nodes: {
        Row: {
          available_in_ca: boolean | null
          available_in_fr: boolean | null
          class: string | null
          common_name_en: string | null
          common_name_fr: string | null
          created_at: string | null
          data_source: string | null
          data_version: string | null
          description_en: string | null
          description_fr: string | null
          family: string | null
          gbif_taxon_key: number | null
          genus: string | null
          id: string
          inaturalist_id: number | null
          inpn_taxref_id: string | null
          is_active: boolean | null
          kingdom: string | null
          metadata: Json | null
          order: string | null
          parent_id: string | null
          photo_url: string | null
          phylum: string | null
          popularity: number | null
          rank: string
          scientific_name: string
          synonyms: string[] | null
          updated_at: string | null
        }
        Insert: {
          available_in_ca?: boolean | null
          available_in_fr?: boolean | null
          class?: string | null
          common_name_en?: string | null
          common_name_fr?: string | null
          created_at?: string | null
          data_source?: string | null
          data_version?: string | null
          description_en?: string | null
          description_fr?: string | null
          family?: string | null
          gbif_taxon_key?: number | null
          genus?: string | null
          id?: string
          inaturalist_id?: number | null
          inpn_taxref_id?: string | null
          is_active?: boolean | null
          kingdom?: string | null
          metadata?: Json | null
          order?: string | null
          parent_id?: string | null
          photo_url?: string | null
          phylum?: string | null
          popularity?: number | null
          rank: string
          scientific_name: string
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Update: {
          available_in_ca?: boolean | null
          available_in_fr?: boolean | null
          class?: string | null
          common_name_en?: string | null
          common_name_fr?: string | null
          created_at?: string | null
          data_source?: string | null
          data_version?: string | null
          description_en?: string | null
          description_fr?: string | null
          family?: string | null
          gbif_taxon_key?: number | null
          genus?: string | null
          id?: string
          inaturalist_id?: number | null
          inpn_taxref_id?: string | null
          is_active?: boolean | null
          kingdom?: string | null
          metadata?: Json | null
          order?: string | null
          parent_id?: string | null
          photo_url?: string | null
          phylum?: string | null
          popularity?: number | null
          rank?: string
          scientific_name?: string
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'taxonomy_nodes_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'taxonomy_nodes'
            referencedColumns: ['id']
          },
        ]
      }
      user_settings: {
        Row: {
          email_notifications: boolean
          language: string
          newsletter: boolean
          notif_frequency: string
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
          notif_frequency?: string
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
          notif_frequency?: string
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
      notifications_with_actor: {
        Row: {
          actor_avatar_url: string | null
          actor_id: string | null
          actor_username: string | null
          body: string | null
          created_at: string | null
          id: string | null
          read: boolean | null
          reference_id: string | null
          reference_type: string | null
          title: string | null
          type: string | null
          user_id: string | null
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
      posts_public: {
        Row: {
          city: string | null
          comments_count: number | null
          country: string | null
          created_at: string | null
          description: string | null
          display_format: string | null
          encounter_date: string | null
          habitat: string | null
          id: string | null
          identification_status: string | null
          identification_help: boolean | null
          identification_confidence: number | null
          individuals_count: number | null
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
          short_id: string | null
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
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          views_count: number | null
          visibility: string | null
          weather: string | null
        }
        Insert: {
          city?: never
          comments_count?: number | null
          country?: never
          created_at?: string | null
          description?: string | null
          display_format?: string | null
          encounter_date?: string | null
          habitat?: string | null
          id?: string | null
          identification_status?: string | null
          identification_help?: boolean | null
          identification_confidence?: number | null
          individuals_count?: number | null
          latitude?: never
          likes_count?: number | null
          location_hidden?: boolean | null
          location_name?: never
          location_point?: never
          longitude?: never
          multiple_observations?: boolean | null
          phenomenon?: string | null
          published_at?: string | null
          region?: never
          scientific_name?: string | null
          shares_count?: number | null
          short_id?: string | null
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
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
          visibility?: string | null
          weather?: string | null
        }
        Update: {
          city?: never
          comments_count?: number | null
          country?: never
          created_at?: string | null
          description?: string | null
          display_format?: string | null
          encounter_date?: string | null
          habitat?: string | null
          id?: string | null
          identification_status?: string | null
          identification_help?: boolean | null
          identification_confidence?: number | null
          individuals_count?: number | null
          latitude?: never
          likes_count?: number | null
          location_hidden?: boolean | null
          location_name?: never
          location_point?: never
          longitude?: never
          multiple_observations?: boolean | null
          phenomenon?: string | null
          published_at?: string | null
          region?: never
          scientific_name?: string | null
          shares_count?: number | null
          short_id?: string | null
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
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
          visibility?: string | null
          weather?: string | null
        }
        Relationships: [
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
      anonymize_beta_signup_log: { Args: never; Returns: number }
      anonymize_orphan_audit_logs: { Args: never; Returns: number }
      can_see_notebook: { Args: { p_notebook_id: string }; Returns: boolean }
      can_see_post: { Args: { p_post_id: string }; Returns: boolean }
      check_beta_access_key_validity: {
        Args: { p_code: string }
        Returns: {
          reason: string
          valid: boolean
        }[]
      }
      claim_beta_access_key: {
        Args: { p_code: string; p_user_id?: string }
        Returns: string
      }
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
      generate_beta_keys: {
        Args: {
          p_batch_number: number
          p_count?: number
          p_expires_days?: number
          p_max_uses?: number
          p_notes?: string
        }
        Returns: {
          batch_number: number
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number
          notes: string | null
          used_at: string | null
          used_by_user_id: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'beta_access_keys'
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
      increment_beta_user_count: { Args: never; Returns: undefined }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_internal_user: { Args: { p_user_id: string }; Returns: boolean }
      is_notif_enabled: {
        Args: { p_type: string; p_user_id: string }
        Returns: boolean
      }
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
      release_beta_access_key: {
        Args: { p_key_id: string }
        Returns: undefined
      }
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
      search_taxonomy: {
        Args: {
          p_class_filter?: string
          p_max_results?: number
          p_query: string
          p_ranks?: string[]
          p_territory?: string
        }
        Returns: {
          available_in_ca: boolean
          available_in_fr: boolean
          class: string
          common_name_en: string
          common_name_fr: string
          family: string
          id: string
          inaturalist_id: number
          match_score: number
          order: string
          photo_url: string
          popularity: number
          rank: string
          scientific_name: string
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
