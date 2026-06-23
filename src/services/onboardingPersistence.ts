/**
 * onboardingPersistence : Persistance des données d'onboarding
 * ==============================================================
 *
 * Concentre la logique de persistance des 3 inputs onboarding :
 *
 *   1. `interests`        → `profiles.interests` (text[])           : DB
 *   2. `notif_frequency`  → `user_settings.notif_frequency` (text)  : DB
 *   3. `motivations`      → localStorage (Phase MVP)                : client
 *
 * Pourquoi `motivations` côté client ?
 * ────────────────────────────────────
 * La colonne `profiles.motivations` n'existe pas en DB et la contrainte
 * MVP RC-E interdit toute modification schema Supabase. On stocke donc
 * temporairement dans `localStorage` sous une clé propre à l'utilisateur
 * pour ne pas perdre l'information collectée à l'onboarding (utile pour
 * les analytics ou un futur déplacement vers la DB).
 *
 *   Backlog Phase 3 :
 *     - Ajouter colonne `profiles.motivations text[]`
 *     - Migration backfill localStorage → DB côté client (si présent)
 *     - Retirer `localStorage` (cf. `clearLocalMotivations`)
 *
 * Logs debug
 * ──────────
 * Les fonctions exportées loggent `[onboarding-persistence]` pour permettre
 * la validation manuelle du flow signup → onboarding → reload (RC-E test).
 * Activé par défaut en dev ; supprimable plus tard.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { debugLog } from '@/lib/debugLog'
import { updateSettings, type NotifFrequency } from './settingsService'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Valeurs UI de l'onboarding step 2 (4 options). */
export type FrequencyOption = 'daily' | 'weekly' | 'monthly' | 'occasionally'

// ─── Mapping fréquence UI → DB ────────────────────────────────────────────────

/**
 * Mappe les 4 options UI vers les 3 valeurs autorisées par la CHECK
 * constraint DB (`'realtime' | 'daily' | 'weekly'`).
 *
 * Choix de mapping :
 *   - 'daily'        → 'daily'   (1:1)
 *   - 'weekly'       → 'weekly'  (1:1)
 *   - 'monthly'      → 'weekly'  (rounding down : l'utilisateur préfère peu
 *                                  de notifs, on garde le minimum non-zéro)
 *   - 'occasionally' → 'weekly'  (idem : pas d'option moins fréquente que
 *                                  weekly côté DB)
 *
 * À terme, la DB pourrait gagner les valeurs `'monthly'` / `'never'` mais
 * c'est hors scope MVP (contrainte RC-E : pas de schema change).
 */
export function mapFrequencyOptionToNotifFrequency(option: FrequencyOption): NotifFrequency {
  if (option === 'daily') return 'daily'
  if (option === 'weekly') return 'weekly'
  // 'monthly' et 'occasionally' tombent sur le minimum DB ('weekly').
  // L'utilisateur peut affiner ensuite dans Settings > Notifications.
  return 'weekly'
}

// ─── Persistance user_settings (notif_frequency) ──────────────────────────────

/**
 * Persiste la fréquence de notification choisie à l'onboarding step 2.
 *
 * Comportement :
 *   - Crée la row `user_settings` si elle n'existe pas (upsert)
 *   - Met à jour seulement `notif_frequency` (les autres défauts DB
 *     sont conservés)
 *   - Idempotent : peut être rappelé sans risque
 *
 * @param userId  UUID de l'user authentifié
 * @param option  Fréquence UI ('daily' | 'weekly' | 'monthly' | 'occasionally')
 * @throws Error si Supabase non configuré ou erreur réseau
 */
export async function persistNotifFrequency(
  userId: string,
  option: FrequencyOption,
): Promise<NotifFrequency> {
  const dbValue = mapFrequencyOptionToNotifFrequency(option)
  // Logs RC-E : permettent de valider en console que la persistance
  // se déclenche correctement à la fin de l'onboarding (dev uniquement).
  debugLog('onboarding-persistence', 'persistNotifFrequency', {
    userId,
    uiOption: option,
    dbValue,
  })
  await updateSettings(userId, { notif_frequency: dbValue })
  return dbValue
}

// ─── Persistance motivations (localStorage MVP) ───────────────────────────────

/** Clé localStorage pour les motivations de l'user (préfixée par userId). */
function motivationsStorageKey(userId: string): string {
  return `naturegraph-onboarding-motivations-${userId}`
}

/**
 * Stocke les motivations de l'user dans le localStorage navigateur.
 *
 * Sera migré vers `profiles.motivations` (text[]) en Phase 3 : voir
 * commentaire d'en-tête.
 *
 * Try/catch silencieux : si localStorage est désactivé (Safari mode privé,
 * etc.), on ne bloque pas l'onboarding pour ça. Les motivations sont une
 * donnée d'analytics secondaire, pas critique pour le service.
 */
export function persistMotivationsLocal(userId: string, motivations: string[]): void {
  if (typeof window === 'undefined') return
  try {
    const payload = JSON.stringify({ motivations, savedAt: new Date().toISOString() })
    window.localStorage.setItem(motivationsStorageKey(userId), payload)
    debugLog('onboarding-persistence', 'persistMotivationsLocal', {
      userId,
      count: motivations.length,
    })
  } catch (err) {
    // localStorage désactivé ou quota dépassé : pas bloquant.
    console.warn('[onboarding-persistence] persistMotivationsLocal failed', err)
  }
}

/**
 * Lit les motivations depuis le localStorage. Retourne `null` si absent
 * ou si le JSON est corrompu.
 */
export function readLocalMotivations(userId: string): string[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(motivationsStorageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { motivations?: unknown }
    return Array.isArray(parsed.motivations)
      ? parsed.motivations.filter((m): m is string => typeof m === 'string')
      : null
  } catch {
    return null
  }
}

/**
 * Supprime les motivations du localStorage.
 *
 * À appeler :
 *   - après une migration future vers la DB (Phase 3)
 *   - lors de la suppression du compte (cleanup côté client)
 */
export function clearLocalMotivations(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(motivationsStorageKey(userId))
  } catch {
    /* silent : localStorage indisponible */
  }
}

// ─── Vérification idempotence profile (RC-E garde) ────────────────────────────

/**
 * Vérifie si le profil de l'user a déjà été complété (= a déjà passé
 * l'onboarding au moins une fois).
 *
 * Cette fonction sert de **garde anti-écrasement** : si l'onboarding est
 * relancé par erreur (back navigation, lien direct, etc.), on évite de
 * réécraser des données existantes (interests modifié dans Settings,
 * username changé, etc.).
 *
 * Critères de "profil complet" :
 *   - `interests` non vide OU
 *   - `first_name` non vide (≠ valeur par défaut '')
 *
 * @returns `true` si profil déjà complété (onboarding fait), `false` sinon
 */
export async function isProfileAlreadyOnboarded(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false
  const { data, error } = await supabase
    .from('profiles')
    .select('interests, first_name')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return false

  const profile = data as { interests: string[] | null; first_name: string | null }
  const hasInterests = Array.isArray(profile.interests) && profile.interests.length > 0
  const hasFirstName = (profile.first_name ?? '').trim().length > 0
  const onboarded = hasInterests || hasFirstName
  debugLog('onboarding-persistence', 'isProfileAlreadyOnboarded', {
    userId,
    hasInterests,
    hasFirstName,
    onboarded,
  })
  return onboarded
}
