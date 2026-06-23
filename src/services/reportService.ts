/**
 * reportService : Signalements de contenu
 *
 * NG-033 (Nicolas 2026-06-06) : CORRECTIF backend signalement :
 * Les signalements utilisateurs etaient inseres dans la table `reports`, alors
 * que le dashboard admin (AdminModeration) lit/ecrit EXCLUSIVEMENT la table
 * `moderation_reports`. Resultat : aucun signalement ne remontait cote admin
 * (table orpheline). On redirige donc l'insertion vers `moderation_reports`,
 * la seule table reellement exploitee par la moderation.
 *
 * RLS : la policy `moderation_reports_insert` autorise tout user authentifie a
 * inserer un report tant que `reporter_id = auth.uid()`.
 *
 * Utilise par ReportModal (post) et ProfileOptionsMenu (profil).
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
 * Mappe les motifs UI (ReportReason) vers les valeurs autorisees par la
 * contrainte CHECK de `moderation_reports.reason`
 * (spam | offensive | harassment | wrong_info | protected_species_gps |
 *  illegal_content | other).
 *
 * Les libelles UI restent inchanges cote front ; seul le code persiste est
 * normalise pour respecter le schema de moderation.
 */
const REASON_MAP: Record<ReportReason, string> = {
  inappropriate_content: 'offensive',
  harassment: 'harassment',
  misinformation: 'wrong_info',
  spam: 'spam',
  other: 'other',
}

/**
 * Crée un signalement dans `moderation_reports`. L'auteur (`reporter_id`) est
 * l'utilisateur connecté (vérifié par RLS côté DB).
 *
 * Au moins un de `postId` ou `profileId` doit être fourni : sinon le report
 * n'a pas de cible.
 */
export async function createReport(payload: CreateReportPayload): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // moderation_reports impose un couple (target_type, target_id) NOT NULL.
  // Branche explicite pour garantir un targetId typé `string` (post prioritaire).
  let targetType: 'post' | 'profile'
  let targetId: string
  if (payload.postId) {
    targetType = 'post'
    targetId = payload.postId
  } else if (payload.profileId) {
    targetType = 'profile'
    targetId = payload.profileId
  } else {
    throw new Error('Un report doit cibler un post ou un profil')
  }

  const { error } = await supabase.from('moderation_reports').insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: REASON_MAP[payload.reason] ?? 'other',
    description: payload.details ?? null,
    // status ('new') et priority ('medium') prennent leurs defaults DB.
  })

  if (error) throw new Error(error.message)
}
