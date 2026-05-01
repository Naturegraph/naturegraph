/**
 * reportService — Signalements de contenu
 *
 * Table `reports` (migration 20260420) — RLS : un user crée ses propres reports,
 * voit ses propres reports, les admins voient tout (Phase 2).
 *
 * Utilisé par ReportModal (second-agent/15).
 */

import { supabase } from '@/lib/supabase'
import type { ReportReason } from '@/types/database'

export interface CreateReportPayload {
  postId?: string
  profileId?: string
  reason: ReportReason
  details?: string
}

/**
 * Crée un signalement. L'auteur (`reporter_id`) est l'utilisateur connecté
 * (vérifié par RLS côté DB).
 *
 * Au moins un de `postId` ou `profileId` doit être fourni — sinon le report
 * n'a pas de cible et est rejeté côté DB.
 */
export async function createReport(payload: CreateReportPayload): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  if (!payload.postId && !payload.profileId) {
    throw new Error('Un report doit cibler un post ou un profil')
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    post_id: payload.postId ?? null,
    profile_id: payload.profileId ?? null,
    reason: payload.reason,
    details: payload.details ?? null,
  })

  if (error) throw new Error(error.message)
}
