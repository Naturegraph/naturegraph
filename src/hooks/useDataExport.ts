/**
 * useDataExport : Hook React Query pour déclencher l'export RGPD
 *
 * Wrapper autour de `dataExportService.requestDataExport` + déclenchement
 * automatique du téléchargement.
 *
 * Pas d'`onSuccess` invalidation : l'export est read-only sur les données,
 * donc aucun cache à invalider.
 */

import { useMutation } from '@tanstack/react-query'
import { requestDataExport, triggerDownload } from '@/services/dataExportService'

export interface DataExportOptions {
  /** Préfixe du nom de fichier (ex: 'naturegraph-export') */
  filenamePrefix: string
}

/**
 * Mutation pour exporter les données utilisateur.
 *
 * Au succès, lance automatiquement le téléchargement via un anchor.
 * Le filename généré est `{prefix}-{YYYY-MM-DD}.json`.
 */
export function useDataExport() {
  return useMutation({
    mutationFn: async (options: DataExportOptions) => {
      const result = await requestDataExport()
      // Date ISO sans heure → suffixe lisible et stable
      const today = new Date().toISOString().split('T')[0]
      triggerDownload(result.url, `${options.filenamePrefix}-${today}`)
      return result
    },
  })
}
