/**
 * Zod schemas — Source de verite pour validation runtime
 * ============================================================================
 *
 * Refs : T-068 (MASTER_TODO) + BATCH 23
 *
 * Pourquoi zod ?
 *   - Validation runtime des formulaires (Onboarding, Encounter, Settings)
 *   - Schema -> type TS (DRY)
 *   - Integration native avec react-hook-form (resolver) — voir T-069/070/071
 *   - Validation des reponses API Supabase (remplace `as unknown as`)
 *
 * Convention :
 *   - 1 schema par "domaine" (profile, post, settings, etc.)
 *   - Export du schema + du type derive `z.infer<typeof XSchema>`
 *   - Re-export depuis ce barrel pour usage centralise
 */

export * from './profile'
export * from './encounter'
export * from './settings'
