/**
 * useAccountDeletion — React Query mutation pour suppression compte
 *
 * Wrappe `accountDeletionService.deleteAccount()` qui invoque l'Edge
 * Function `delete-account`.
 *
 * Le succès est suivi d'un cleanup React Query global (`queryClient.clear()`)
 * pour éviter que des données stale du compte supprimé persistent en cache.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteAccount,
  type AccountDeletionMode,
  type DeleteAccountResult,
} from '@/services/accountDeletionService'

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation<DeleteAccountResult, Error, AccountDeletionMode | undefined>({
    mutationFn: (mode = 'hard') => deleteAccount(mode),
    onSuccess: () => {
      // Vide tout le cache React Query — le user n'existe plus.
      queryClient.clear()
    },
  })
}
