/**
 * Schema zod — Rencontre Nature (contribution post)
 *
 * Refs : T-068 + T-071 (MASTER_TODO) + BATCH 23
 */

import { z } from 'zod'
import { InterestSchema } from './profile'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const WeatherSchema = z.enum(['sunny', 'cloudy', 'rainy', 'windy', 'snowy'])
export const TimeOfDaySchema = z.enum(['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night'])
export const HabitatSchema = z.enum([
  'forest',
  'meadow',
  'wetland',
  'mountain',
  'urban',
  'coast',
  'river',
  'lake',
  'other',
])
export const DisplayFormatSchema = z.enum(['portrait', 'landscape', 'square', '16:9', '3:4', '1:1'])
export const VisibilitySchema = z.enum(['public', 'followers', 'private'])

// ─── Observations (Step 2) ───────────────────────────────────────────────────

export const ObservationEntrySchema = z.object({
  taxref_id: z.string().nullable(),
  common_name: z.string().nullable(),
  scientific_name: z.string().nullable(),
  count: z.number().int().positive().nullable(),
  notes: z.string().max(500).nullable(),
})

export type ObservationEntry = z.infer<typeof ObservationEntrySchema>

// ─── Encounter form complet ──────────────────────────────────────────────────

export const EncounterFormSchema = z.object({
  // Step 1
  files: z.array(z.instanceof(File)).max(10, 'Max 10 photos'),
  displayFormat: DisplayFormatSchema,

  // Step 2
  observations: z.array(ObservationEntrySchema),

  // Step 3
  title: z.string().max(80, 'Titre trop long (max 80)').optional(),
  description: z
    .string()
    .min(10, 'Description trop courte (min 10)')
    .max(2000, 'Description trop longue (max 2000)'),
  date: z.string(), // ISO date
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      city: z.string().nullable(),
    })
    .nullable(),
  taxonomic_group: InterestSchema.nullable(),
  habitat: HabitatSchema.nullable(),
  weather: WeatherSchema.nullable(),
  time_of_day: TimeOfDaySchema.nullable(),
  visibility: VisibilitySchema,
})

export type EncounterForm = z.infer<typeof EncounterFormSchema>
