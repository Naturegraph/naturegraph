/**
 * settingsService — CRUD user_settings
 * RLS owner-only. Une ligne par user, cree au signup par trigger ou backfill.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface UserSettings {
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  newsletter: boolean
  theme: 'light' | 'dark' | 'system'
  language: 'fr' | 'en'
  reduced_motion: boolean
  show_sensitive_data: boolean
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
