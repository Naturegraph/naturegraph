/**
 * useStats : Hooks React Query pour les stats Impact + Tendances
 *
 * Utilisé par StatsSidebar pour afficher les données réelles Supabase.
 * Cache invalidé quotidiennement (staleTime: 1 jour) : ces stats ne changent pas
 * assez souvent pour justifier des refetch fréquents.
 */

import { useQuery } from '@tanstack/react-query'
import {
  getImpactStats,
  getTrendingSpecies,
  getUserStats,
  getUserObservationStats,
  getUserStreak,
  getWeekProgress,
  type StatsPeriod,
  type ImpactStats,
  type TrendingSpecies,
  type UserStats,
  type UserObservationStats,
  type WeekProgress,
} from '@/services/statsService'

/** Durée de fraîcheur du cache : 1 heure (compromis fraîcheur / sobriété réseau) */
const STATS_STALE_TIME = 60 * 60 * 1000

/**
 * Hook pour les stats "Impact" (observations + migrateurs avec trend).
 * @param period - Période de référence ('last7Days' | 'currentMonth' | 'currentQuarter' | 'currentYear')
 */
export function useImpactStats(period: StatsPeriod = 'currentMonth') {
  return useQuery<ImpactStats, Error>({
    queryKey: ['impactStats', period],
    queryFn: () => getImpactStats(period),
    staleTime: STATS_STALE_TIME,
    // Garde les données précédentes pendant le changement de période
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook pour les "Tendances" (top 3 espèces).
 * @param period - Période de référence
 * @param region - Région pour filtrage territorial (null = global)
 */
export function useTrendingSpecies(period: StatsPeriod = 'last7Days', region?: string | null) {
  return useQuery<TrendingSpecies[], Error>({
    queryKey: ['trendingSpecies', period, region ?? 'global'],
    queryFn: () => getTrendingSpecies(period, region),
    staleTime: STATS_STALE_TIME,
    placeholderData: (previousData) => previousData,
  })
}

// ─── Stats utilisateur (ProfileSidebar) ─────────────────────────────────────

/**
 * Hook pour les stats du profil connecté (observations, espèces, followers).
 * @param userId - ID de l'utilisateur (undefined = désactivé)
 */
export function useUserStats(userId: string | undefined) {
  return useQuery<UserStats, Error>({
    queryKey: ['userStats', userId],
    queryFn: () => getUserStats(userId!),
    enabled: !!userId,
    staleTime: STATS_STALE_TIME,
  })
}

/**
 * Hook pour les stats d'observation cumulatives (carnets inclus) :
 * obs cumul, especes distinctes, repartition par groupe pour l'ADN.
 * @param userId - ID de l'utilisateur (undefined = désactivé)
 */
export function useUserObservationStats(userId: string | undefined) {
  return useQuery<UserObservationStats, Error>({
    queryKey: ['userObservationStats', userId],
    queryFn: () => getUserObservationStats(userId!),
    enabled: !!userId,
    staleTime: STATS_STALE_TIME,
  })
}

/**
 * Hook pour le streak de jours consécutifs avec un post.
 * @param userId - ID de l'utilisateur (undefined = désactivé)
 */
export function useUserStreak(userId: string | undefined) {
  return useQuery<number, Error>({
    queryKey: ['userStreak', userId],
    queryFn: () => getUserStreak(userId!),
    enabled: !!userId,
    staleTime: STATS_STALE_TIME,
  })
}

/**
 * Hook pour la progression hebdomadaire (posts cette semaine / objectif).
 * @param userId - ID de l'utilisateur (undefined = désactivé)
 */
export function useWeekProgress(userId: string | undefined) {
  return useQuery<WeekProgress, Error>({
    queryKey: ['weekProgress', userId],
    queryFn: () => getWeekProgress(userId!),
    staleTime: STATS_STALE_TIME,
  })
}
