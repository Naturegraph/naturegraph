/**
 * notificationPreferencesService : Préférences par type de notification
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
  /** Canal in-app (cloche). Defaut SQL via is_notif_enabled. */
  enabled: boolean
  /** Canal email (NG-045). Defaut SQL via is_email_enabled. */
  email_enabled: boolean
  updated_at: string
}

/** Défaut UI in-app (aligné avec is_notif_enabled côté SQL). */
export function defaultEnabled(type: NotificationType): boolean {
  return type !== 'species_digest'
}

/**
 * Défaut UI email (aligné avec is_email_enabled côté SQL) : opt-in requis
 * uniquement pour species_digest ; les types sociaux (reaction/follow/post)
 * sont opt-out (defaut true).
 */
export function defaultEmailEnabled(type: NotificationType): boolean {
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

/** Upsert d'une préférence in-app (active/désactive un type). Conserve pour
 *  l'onboarding (opt-in species_digest). Ne touche pas au canal email. */
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

/**
 * Upsert des DEUX canaux (in-app + email) d'un type en une fois. Utilise par
 * les Parametres : couper un type coupe la cloche ET l'email de ce type
 * (comportement attendu par l'utilisateur, respecte par is_notif_enabled +
 * is_email_enabled cote backend NG-045).
 */
export async function setPreferenceChannels(
  userId: string,
  type: NotificationType,
  enabled: boolean,
  emailEnabled: boolean,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: userId,
      type,
      enabled,
      email_enabled: emailEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,type' },
  )
  if (error) throw new Error(error.message)
}
