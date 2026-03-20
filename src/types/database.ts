// ============================================
// Database types — Naturegraph
// Maps to Supabase PostgreSQL schema
// ============================================

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Observation {
  id: string;
  author_id: string;
  type: "instant_nature" | "rencontre_nature";
  title: string | null;
  description: string | null;
  species_name: string | null;
  species_taxref_id: string | null;
  identification_status: "identified" | "pending" | "disputed";
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  location_hidden: boolean;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  observation_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface IdentificationProposal {
  id: string;
  observation_id: string;
  author_id: string;
  species_name: string;
  species_taxref_id: string | null;
  votes_up: number;
  votes_down: number;
  created_at: string;
}

export interface Notebook {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  visibility: "private" | "public" | "collaborative";
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotebookObservation {
  notebook_id: string;
  observation_id: string;
  added_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "comment" | "identification" | "vote" | "notebook_contribution" | "collaboration_invite";
  title: string;
  body: string | null;
  reference_id: string | null;
  read: boolean;
  created_at: string;
}

// Supabase Database type helper
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at" | "updated_at">; Update: Partial<Profile> };
      observations: { Row: Observation; Insert: Omit<Observation, "id" | "created_at" | "updated_at">; Update: Partial<Observation> };
      comments: { Row: Comment; Insert: Omit<Comment, "id" | "created_at">; Update: Partial<Comment> };
      identification_proposals: { Row: IdentificationProposal; Insert: Omit<IdentificationProposal, "id" | "votes_up" | "votes_down" | "created_at">; Update: Partial<IdentificationProposal> };
      notebooks: { Row: Notebook; Insert: Omit<Notebook, "id" | "created_at" | "updated_at">; Update: Partial<Notebook> };
      notebook_observations: { Row: NotebookObservation; Insert: NotebookObservation; Update: never };
      notifications: { Row: Notification; Insert: Omit<Notification, "id" | "created_at">; Update: Partial<Notification> };
    };
  };
}
