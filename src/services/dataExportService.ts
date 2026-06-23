/**
 * dataExportService : Export RGPD / Loi 25 des données utilisateur
 * =================================================================
 *
 * Wrapper TypeScript autour de l'Edge Function `export-data` (déployée v3).
 * Cf. `supabase/functions/export-data/index.ts`.
 *
 * Flux :
 *   1. UI (SettingsExportRgpd) appelle `requestDataExport()`
 *   2. Edge Function génère un JSON exhaustif (profile + settings + posts +
 *      media + comments + reactions + follows + notebooks)
 *   3. Upload dans bucket privé `exports/{userId}/export-{timestamp}.json`
 *   4. Retourne une URL signée valable 24h
 *   5. Le client lance le téléchargement automatiquement
 *
 * Conformité :
 *   - RGPD Art. 20 : droit à la portabilité (format structuré, lisible
 *     par machine = JSON)
 *   - Loi 25 Art. 27.3 : droit à la portabilité dans un format technologique
 *     structuré
 *   - RGPD Art. 15 : droit d'accès (l'utilisateur reçoit toutes ses données)
 *
 * Sécurité :
 *   - L'Edge Function est protégée par JWT (header Authorization)
 *   - Bucket `exports` est PRIVÉ (RLS owner-only)
 *   - URL signée expire en 24h
 *   - Path : `{userId}/export-{timestamp}.json` → owner only
 */

import { supabase } from '@/lib/supabase'

export interface DataExportResult {
  /** URL signée valable 24h pour télécharger le JSON */
  url: string
  /** Durée de validité en secondes (par défaut 86400 = 24h) */
  expiresInSeconds: number
}

/**
 * Déclenche la génération d'un export RGPD côté serveur et retourne l'URL
 * signée pour téléchargement.
 *
 * @throws Error si Supabase non configuré, JWT manquant, ou Edge Function fail.
 */
export async function requestDataExport(): Promise<DataExportResult> {
  if (!supabase) throw new Error('Supabase non configuré')

  // Récupère le JWT courant pour authentifier l'Edge Function.
  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession()
  if (sessionErr || !session) {
    throw new Error("Authentification requise pour l'export RGPD")
  }

  const { data, error } = await supabase.functions.invoke('export-data', {
    body: {},
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (error) {
    throw new Error(error.message ?? "Erreur lors de l'export")
  }
  if (!data?.ok || !data?.url) {
    throw new Error(data?.error ?? 'Export refusé par le serveur')
  }

  return {
    url: data.url as string,
    expiresInSeconds: (data.expires_in_seconds as number) ?? 86400,
  }
}

/**
 * Déclenche le téléchargement immédiat du fichier JSON exporté.
 *
 * On utilise un anchor invisible plutôt que `window.open()` :
 *   - Pas de risque de pop-up bloquée
 *   - L'attribut `download` force le navigateur à télécharger (pas afficher)
 *   - Le nom de fichier suggéré est lisible
 *
 * @param url URL signée retournée par `requestDataExport()`
 * @param filename Nom suggéré pour le fichier (sans extension)
 */
export function triggerDownload(url: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}.json`
  anchor.rel = 'noopener noreferrer'
  // Pas besoin d'append au DOM : .click() fonctionne sur un anchor détaché
  // dans tous les navigateurs modernes (Safari 14+, Chrome, Firefox).
  anchor.click()
}
