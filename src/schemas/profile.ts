/**
 * Schema zod — Profil utilisateur (Onboarding + Settings)
 *
 * Source : `src/types/database.ts > Profile` (manuel) +
 *          `src/types/supabase.ts > profiles.Row` (auto-genere).
 *
 * Refs : T-068 (MASTER_TODO) + BATCH 23
 */

import { z } from 'zod'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const GenderSchema = z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say'])

export const InterestSchema = z.enum([
  'birds',
  'mammals',
  'insects',
  'amphibians',
  'reptiles',
  'arachnids',
  'mollusks',
  'fish',
  'plants',
  'other',
])

export const LocationVisibilitySchema = z.enum(['private', 'region', 'city'])

export const LocationConsentSourceSchema = z.enum(['browser', 'manual', 'onboarding', 'settings'])

// ─── Onboarding form ──────────────────────────────────────────────────────────

/** Etape 1-2 : informations basiques + centres d'interet */
export const OnboardingBasicsSchema = z.object({
  first_name: z.string().min(1, 'Prenom requis').max(50),
  last_name: z.string().min(1, 'Nom requis').max(50),
  gender: GenderSchema.nullable(),
  birth_date: z.string().nullable(), // ISO date YYYY-MM-DD
  interests: z.array(InterestSchema).min(1, 'Au moins 1 centre d interet').max(10),
})

/** Etape 4 : username + bio */
export const OnboardingFinalizeSchema = z.object({
  username: z
    .string()
    .min(3, 'Username trop court (min 3)')
    .max(30, 'Username trop long (max 30)')
    .regex(/^[a-z0-9_]+$/i, 'Lettres, chiffres et _ uniquement'),
  bio: z.string().max(160, 'Bio trop longue (max 160)').optional(),
})

export type OnboardingBasics = z.infer<typeof OnboardingBasicsSchema>
export type OnboardingFinalize = z.infer<typeof OnboardingFinalizeSchema>

// ─── Settings (profile update) ───────────────────────────────────────────────

export const SettingsProfileSchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  bio: z.string().max(160).nullable(),
  interests: z.array(InterestSchema),
  // Site web optionnel (URL valide ou string vide)
  website: z.union([z.string().url(), z.literal('')]).nullable(),
  is_public: z.boolean(),
})

export type SettingsProfile = z.infer<typeof SettingsProfileSchema>
