/**
 * notificationPreferencesService — Préférences par type de notification
 *
 * Table `notification_preferences` (PK composite: user_id + type)
 *   - enabled BOOLEAN DEFAULT TRUE
 *   - species_digest = opt-in explicite (RGPD) → DEFAULT FALSE côté helper SQL
 *
 * Les rows sont créées à la demande (upsert). L'absence de row = défaut du type :
 *   - species_digest → FALSE
 *   - tous les autres → TRUE
 * Cf. fonction SQL `is_notif_enabled(user_id, type)` utilisée par les triggers.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { NotificationType } from './notificationService'

export interface NotificationPreference {
  user_id: string
  type: NotificationType
  enabled: boolean
  updated_at: string
}

/** Défaut UI (aligné avec is_notif_enabled côté SQL). */
export function defaultEnabled(type: NotificationType): boolean {
  return type !== 'species_digest'
}

/** Liste toutes les préférences d'un user (seulement celles persistées). */
export async function listPreferences(userId: string): Promise<NotificationPreference[]> {
  if (!isSupabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (data ?? []) as NotificationPreference[]
}

/** Upsert d'une préférence (active/désactive un type). */
export async function setPreference(
  userId: string,
  type: NotificationType,
  enabled: boolean,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: userId, type, enabled, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,type' },
    )
  if (error) throw new Error(error.message)
}
