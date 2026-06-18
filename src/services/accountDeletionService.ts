/**
 * accountDeletionService : Suppression / anonymisation de compte
 * ================================================================
 *
 * Wrapper TypeScript autour de l'Edge Function `delete-account` (RGPD).
 * Cf. `supabase/functions/delete-account/index.ts`.
 *
 * 2 modes supportés par l'Edge Function :
 *   - `'hard'`       : suppression complète (auth.users + cascade profiles + storage)
 *                      → choix par défaut, conforme RGPD "droit à l'effacement"
 *   - `'anonymize'`  : conserve les contributions (posts, commentaires) mais
 *                      anonymise l'identité (username = `deleted_xxx`, bio nulle, etc.)
 *                      → préserve les fils de discussion pour la communauté
 *
 * L'Edge Function est protégée par JWT (header Authorization). L'utilisateur
 * supprime son propre compte uniquement (pas de modération via cette API).
 *
 * Comportement MVP (décision produit Q-PROD-5)
 * ────────────────────────────────────────────
 * La suppression est **immédiate et irréversible**. La politique de
 * confidentialité (cf. fr.json:1035 et en.json:1035) reflète ce comportement.
 * Aucun délai de grâce n'est implémenté.
 *
 * Backlog Phase 3 (post-beta, selon retour utilisateur)
 * ─────────────────────────────────────────────────────
 * Ajouter un délai de grâce 30 jours (table `account_deletion_requests`
 * avec scheduled_for, cron J+30) pour permettre l'annulation.
 */

import { supabase } from '@/lib/supabase'
import { clearLocalMotivations } from '@/services/onboardingPersistence'

export type AccountDeletionMode = 'hard' | 'anonymize'

export interface DeleteAccountResult {
  ok: boolean
  mode: AccountDeletionMode
}

/**
 * Appelle l'Edge Function `delete-account` avec le JWT du user connecté.
 *
 * @param mode 'hard' (default) supprime tout, 'anonymize' conserve le contenu
 * mais anonymise l'identité.
 *
 * @throws Error si Supabase non configuré, JWT manquant, ou Edge Function fail
 *   (5xx, network error, RGPD violation).
 */
export async function deleteAccount(
  mode: AccountDeletionMode = 'hard',
): Promise<DeleteAccountResult> {
  if (!supabase) throw new Error('Supabase non configuré')

  // Récupère le JWT courant pour authentifier l'Edge Function.
  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession()
  if (sessionErr || !session) {
    throw new Error('Authentification requise pour supprimer le compte')
  }

  // Capture l'userId AVANT signOut pour le cleanup localStorage en aval.
  const userId = session.user.id

  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { mode },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (error) {
    throw new Error(error.message ?? 'Erreur de suppression du compte')
  }
  if (!data?.ok) {
    throw new Error(data?.error ?? 'Suppression refusée par le serveur')
  }

  // Cleanup données client-side associées au compte (RC-E motivations).
  // Pas critique fonctionnellement mais propre côté privacy : on n'oublie
  // pas de trace orpheline dans le navigateur après suppression compte.
  clearLocalMotivations(userId)

  // Sign out local (les cookies/storage Supabase sont aussi nettoyés par
  // l'Edge Function via auth.admin.deleteUser, mais on force ici pour être
  // sûrs côté client en cas de cache localStorage).
  await supabase.auth.signOut().catch(() => undefined)

  return { ok: true, mode: data.mode as AccountDeletionMode }
}
