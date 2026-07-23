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
 * Utilise par ReportModal (post et echange) et ProfileOptionsMenu (profil).
 *
 * NG-049 : la cible `comment` etait deja autorisee par la contrainte CHECK de
 * `moderation_reports.target_type`, mais aucun code ne l'emettait. Un trigger
 * masque automatiquement un echange des que TROIS personnes DISTINCTES l'ont
 * signale, le temps qu'un humain tranche.
 */

import { supabase } from '@/lib/supabase'
import type { ReportReason } from '@/types/database'

export interface CreateReportPayload {
  postId?: string
  profileId?: string
  /** NG-049 : signalement d'un echange (table `comments`). */
  commentId?: string
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
  // Branche explicite pour garantir un targetId typé `string`.
  // L'echange passe AVANT le post : signaler un echange se fait toujours depuis
  // une publication, les deux identifiants sont donc souvent disponibles, et
  // c'est le plus precis qui doit gagner.
  let targetType: 'post' | 'profile' | 'comment'
  let targetId: string
  if (payload.commentId) {
    targetType = 'comment'
    targetId = payload.commentId
  } else if (payload.postId) {
    targetType = 'post'
    targetId = payload.postId
  } else if (payload.profileId) {
    targetType = 'profile'
    targetId = payload.profileId
  } else {
    throw new Error('Un report doit cibler un echange, un post ou un profil')
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
