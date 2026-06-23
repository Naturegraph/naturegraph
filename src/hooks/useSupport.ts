/**
 * useSupport : React Query hooks pour les tickets de support
 *
 * Fournit `useSubmitHelpRequest` qui :
 *   - Wrappe `supportService.submitHelpRequest()`
 *   - Gère le state loading/error de la mutation
 *   - Invalide automatiquement la liste `my-tickets` au succès
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  submitHelpRequest,
  type SubmitHelpRequestPayload,
  type SupportTicket,
} from '@/services/supportService'

export const supportQueryKeys = {
  myTickets: ['support', 'my-tickets'] as const,
}

/**
 * Mutation pour soumettre un ticket de support depuis SettingsHelpView.
 *
 * Usage :
 * ```ts
 * const { mutateAsync, isPending } = useSubmitHelpRequest()
 * await mutateAsync({ subject: 'help', message: '...' })
 * ```
 */
export function useSubmitHelpRequest() {
  const queryClient = useQueryClient()

  return useMutation<SupportTicket, Error, SubmitHelpRequestPayload>({
    mutationFn: submitHelpRequest,
    onSuccess: () => {
      // Invalide la liste "Mes demandes" si elle est cachée quelque part.
      queryClient.invalidateQueries({ queryKey: supportQueryKeys.myTickets })
    },
  })
}
