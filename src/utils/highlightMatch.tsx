/**
 * highlightMatch : Mise en gras de la portion d'un texte qui matche une requête
 * ==============================================================================
 *
 * Utilisé partout où l'utilisateur cherche une espèce : recherche globale
 * (SearchPanel) et carnet d'observation (EncounterStep2). Aide l'utilisateur
 * à comprendre pourquoi un résultat remonte.
 *
 * Exemple : highlightMatch('Mésange charbonnière', 'mésa')
 *   → [<strong>Mésa</strong>, <span>nge charbonnière</span>]
 */

import type { ReactNode } from 'react'

/** Échappe les caractères spéciaux regex pour un usage sûr dans RegExp. */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Découpe `text` autour de chaque occurrence de `query` (case-insensitive,
 * multi-occurrence) et met les portions correspondantes en gras.
 *
 * @param text   Texte à afficher (nom commun ou scientifique de l'espèce)
 * @param query  Terme saisi par l'utilisateur
 * @returns      Tableau de nœuds React (<strong> pour les matchs, <span> sinon)
 */
export function highlightMatch(text: string, query: string): ReactNode[] {
  const q = query.trim()
  if (!q) return [text]
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <strong key={i} className="font-bold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
