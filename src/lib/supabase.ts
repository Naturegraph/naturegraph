import { createClient } from "@supabase/supabase-js";
// Types générés par `supabase gen types typescript` — source de vérité pour les appels Supabase
// Ne pas modifier manuellement : régénérer via MCP après chaque migration
import type { Database } from "@/types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;
