/**
 * Schema zod — User settings
 *
 * Refs : T-068 + T-070 (MASTER_TODO) + BATCH 23
 */

import { z } from 'zod'

export const NotificationFrequencySchema = z.enum(['daily', 'weekly', 'never'])
export const LanguageSchema = z.enum(['fr', 'en'])

export const UserSettingsSchema = z.object({
  user_id: z.string().uuid(),
  language: LanguageSchema,
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  newsletter: z.boolean(),
  notif_frequency: NotificationFrequencySchema,
  reduced_motion: z.boolean(),
  weekly_goal: z.number().int().nonnegative().nullable(),
})

export type UserSettingsInput = z.infer<typeof UserSettingsSchema>
