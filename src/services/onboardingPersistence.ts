/**
 * onboardingPersistence : Persistance des données d'onboarding
 * ==============================================================
 *
 * Concentre la logique de persistance des 3 inputs onboarding :
 *
 *   1. `interests`        → `profiles.interests` (text[])                    : DB
 *   2. `notif_frequency`  → `user_settings.notif_frequency` (text)           : DB
 *      + `week_goal`      → `profiles.week_goal` (int, NG-045)               : DB
 *   3. `motivations`      → localStorage (Phase MVP)                        : client
 *
 * Piège évité (NG-045) : `user_settings.weekly_goal` existe aussi en DB mais
 * n'est JAMAIS lue nulle part (cf. commentaire statsService.ts, 2026-05-24,
 * même piège déjà rencontré par Nicolas). La vraie source de vérité pour
 * l'objectif hebdo affiché/édité sur le profil est `profiles.week_goal`.
 * On écrit uniquement là, `user_settings.weekly_goal` reste une colonne morte.
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
import { updateProfile } from './profileService'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Valeurs UI de l'onboarding step 2 (4 options). */
export type FrequencyOption = 'daily' | 'weekly' | 'monthly' | 'occasionally'

// ─── Mapping fréquence UI → DB ────────────────────────────────────────────────

/**
 * Mappe les 4 options UI vers les 3 valeurs autorisées par la CHECK
 * constraint DB (`'realtime' | 'daily' | 'weekly'`).
 *
 * Correspondance officielle (brief NG-045, table de correspondance
 * onboarding -> notifications) :
 *   - 'daily'        (Tous les jours)          -> 'realtime'
 *   - 'weekly'       (Quelques fois/semaine)   -> 'daily'
 *   - 'monthly'      (Quelques fois/mois)      -> 'weekly'
 *   - 'occasionally' (Occasionnellement)       -> 'realtime'
 *
 * Remplace l'ancien mapping (daily->daily, weekly->weekly, monthly/
 * occasionally->weekly) qui datait d'une contrainte MVP différente
 * (RC-E : pas de vrai objectif hebdo à l'époque). Le mapping "occasionally
 * -> realtime" n'est pas intuitif au premier regard : la logique métier est
 * qu'un utilisateur occasionnel ne recevra de toute façon quasiment aucun
 * signal (objectif hebdo = 1), donc autant le prévenir tout de suite plutôt
 * que d'attendre un digest hebdomadaire qui n'aura souvent rien à montrer.
 */
export function mapFrequencyOptionToNotifFrequency(option: FrequencyOption): NotifFrequency {
  if (option === 'daily') return 'realtime'
  if (option === 'weekly') return 'daily'
  if (option === 'monthly') return 'weekly'
  return 'realtime' // 'occasionally'
}

/**
 * Mappe les 4 options UI vers l'objectif hebdomadaire par défaut
 * (`profiles.week_goal`, saisi/modifiable ensuite via EditInfoTab sur le
 * profil, cf. profileService.ts).
 *
 * Correspondance officielle (brief NG-045) :
 *   - 'daily'        -> 7 publications/semaine
 *   - 'weekly'       -> 3 publications/semaine
 *   - 'monthly'      -> 1 publication/semaine
 *   - 'occasionally' -> 1 publication/semaine
 */
export function mapFrequencyOptionToWeeklyGoal(option: FrequencyOption): number {
  if (option === 'daily') return 7
  if (option === 'weekly') return 3
  return 1 // 'monthly' et 'occasionally'
}

// ─── Persistance notif_frequency (user_settings) + week_goal (profiles) ───────

/**
 * Persiste la fréquence de notification et l'objectif hebdomadaire choisis
 * à l'onboarding step 2 (NG-045 : la fréquence détermine le paramétrage
 * par défaut des notifications ET l'objectif hebdo).
 *
 * Comportement :
 *   - `notif_frequency` : upsert `user_settings` (crée la row si absente)
 *   - `week_goal` : update `profiles` (la row existe déjà à ce stade de
 *     l'onboarding, créée par le trigger `handle_new_auth_user`)
 *   - Idempotent : peut être rappelé sans risque
 *   - Modifiable ensuite à tout moment (fréquence dans Settings >
 *     Notifications, objectif hebdo dans l'édition du profil)
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
  const weekGoal = mapFrequencyOptionToWeeklyGoal(option)
  // Logs RC-E : permettent de valider en console que la persistance
  // se déclenche correctement à la fin de l'onboarding (dev uniquement).
  debugLog('onboarding-persistence', 'persistNotifFrequency', {
    userId,
    uiOption: option,
    dbValue,
    weekGoal,
  })
  await Promise.all([
    updateSettings(userId, { notif_frequency: dbValue }),
    updateProfile(userId, { week_goal: weekGoal }),
  ])
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
