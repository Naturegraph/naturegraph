/**
 * settingsService : CRUD user_settings
 * RLS owner-only. Une ligne par user, créée au premier upsert (le trigger
 * d'auth `handle_new_auth_user` crée uniquement `profiles`, pas `user_settings`).
 *
 * L'upsert avec `onConflict: 'user_id'` est idempotent : si la row n'existe
 * pas, elle est créée avec les valeurs par défaut DB ; si elle existe, seuls
 * les champs fournis dans `patch` sont mis à jour.
 *
 * Cf. RC-E (audit) : la colonne `notif_frequency` (CHECK 'realtime'/'daily'/
 * 'weekly') a été ajoutée par migration `20260502_settings_phase2_complete.sql`
 * et le code onboarding doit la persister via cette interface.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/** Fréquence des digests notifs : aligné sur le CHECK constraint DB. */
export type NotifFrequency = 'realtime' | 'daily' | 'weekly'

export interface UserSettings {
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  newsletter: boolean
  theme: 'light' | 'dark' | 'system'
  language: 'fr' | 'en'
  reduced_motion: boolean
  show_sensitive_data: boolean
  weekly_goal: number
  notif_frequency: NotifFrequency
  updated_at: string
}

export type UserSettingsUpdate = Partial<Omit<UserSettings, 'user_id' | 'updated_at'>>

export async function getSettings(userId: string): Promise<UserSettings | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as UserSettings) ?? null
}

export async function updateSettings(
  userId: string,
  patch: UserSettingsUpdate,
): Promise<UserSettings> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('updateSettings : non disponible en mode demo')
  }
  // upsert pour gerer le cas ou la ligne n'existe pas encore
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as UserSettings
}
