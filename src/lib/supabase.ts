import { createClient } from '@supabase/supabase-js'
// Types générés par `supabase gen types typescript` — source de vérité pour les appels Supabase
// Ne pas modifier manuellement : régénérer via MCP après chaque migration
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Singleton survivant au HMR — évite que Vite recrée plusieurs clients
// qui se battent pour le navigator lock (AbortError: Lock broken).
declare global {
  var __naturegraph_supabase__: ReturnType<typeof createClient<Database>> | undefined
}

export const supabase = isSupabaseConfigured
  ? (globalThis.__naturegraph_supabase__ ??= createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'naturegraph-auth',
        // Lock no-op : désactive le navigator lock de supabase-js
        // (source de "AbortError: Lock broken" en dev avec HMR et en
        // prod avec plusieurs onglets). La persistance reste assurée
        // par localStorage avec la storageKey ci-dessus.
        lock: (_name, _acquireTimeout, fn) => fn(),
      },
    }))
  : null
