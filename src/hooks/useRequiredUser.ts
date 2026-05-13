/**
 * useRequiredUser — Hook pour les composants qui REQUIÈRENT un user authentifié
 * ==============================================================================
 *
 * AVANT (46 occurrences dispersées) :
 *
 *   const { user } = useAuth()
 *   if (!user) throw new Error('Auth required')
 *   // utilise user.id...
 *
 * APRÈS :
 *
 *   const user = useRequiredUser()
 *   // user est typé User (non-null), prêt à l'usage
 *
 * Bénéfices :
 *   - DRY : 1 implémentation centrale
 *   - Type narrowing : `user.id` accessible sans `user?.id`
 *   - Erreur cohérente partout
 *   - Encourage l'utilisation conjointe avec `AuthGuard` / `ProtectedRoute`
 *
 * Quand l'utiliser :
 *   - Composants qui s'affichent uniquement après login (Profile, Settings, etc.)
 *   - Hooks qui font des requêtes user-scoped
 *
 * Quand NE PAS l'utiliser :
 *   - Composants publics (Landing, Auth pages)
 *   - Composants conditionnels (afficher si user, sinon CTA login)
 *     → utiliser `useAuth().user` directement
 *
 * Cf. MASTER_TODO.md T-005 + QUICK_WINS.md QW-I11
 */

import type { User } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/authContextObject'

/**
 * Retourne le user authentifié (non-null garanti par le type).
 *
 * @throws Error si pas d'utilisateur authentifié (devrait être empêché par
 *   `AuthGuard` / `ProtectedRoute` en amont — sinon bug d'architecture).
 * @returns User Supabase non-null
 *
 * @example
 * ```tsx
 * function ProfileSettings() {
 *   const user = useRequiredUser()  // crash si pas authentifié (intentionnel)
 *   const { data: profile } = useProfile(user.id)
 *   return <div>{profile.username}</div>
 * }
 * ```
 */
export function useRequiredUser(): User {
  const { user } = useAuth()
  if (!user) {
    throw new Error(
      'useRequiredUser appelé sans utilisateur authentifié. Vérifie que le composant est sous AuthGuard/ProtectedRoute.',
    )
  }
  return user
}

/**
 * Variante : retourne l'ID directement (cas le plus fréquent).
 *
 * @returns ID UUID du user authentifié
 *
 * @example
 * ```ts
 * const userId = useRequiredUserId()
 * const { data } = useQuery({ queryKey: ['posts', userId], ... })
 * ```
 */
export function useRequiredUserId(): string {
  return useRequiredUser().id
}
