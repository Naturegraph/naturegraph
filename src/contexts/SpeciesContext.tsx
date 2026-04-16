/**
 * SpeciesContext — Species Context Layer
 * ========================================
 * Implémentation du concept produit clé du PRD Recherche §3.4 :
 *
 *   "La recherche d'une espèce déclenche un changement de contexte global.
 *    L'application passe d'un feed global à un feed contextualisé."
 *
 * Quand une espèce est sélectionnée dans la recherche :
 *   1. Elle est stockée ici (mémoire — pas de localStorage pour la session)
 *   2. FeedSection souscrit à ce contexte et filtre le feed
 *   3. Un bandeau "Feed filtré : [espèce]" apparaît avec option de reset
 *
 * Design : Provider léger sans side-effects — les queries de feed
 * réagissent en derivant leur état depuis activeSpecies.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { SpeciesHit } from '@/services/searchService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpeciesContextValue {
  /** Espèce actuellement active (null = feed global) */
  activeSpecies: SpeciesHit | null
  /** Sélectionner une espèce → active le feed contextualisé */
  setActiveSpecies: (species: SpeciesHit) => void
  /** Réinitialiser → retour au feed global */
  clearActiveSpecies: () => void
}

// ─── Contexte ─────────────────────────────────────────────────────────────────

const SpeciesContext = createContext<SpeciesContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SpeciesProvider({ children }: { children: ReactNode }) {
  const [activeSpecies, setActiveSpeciesState] = useState<SpeciesHit | null>(null)

  const setActiveSpecies = useCallback((species: SpeciesHit) => {
    setActiveSpeciesState(species)
  }, [])

  const clearActiveSpecies = useCallback(() => {
    setActiveSpeciesState(null)
  }, [])

  return (
    <SpeciesContext.Provider value={{ activeSpecies, setActiveSpecies, clearActiveSpecies }}>
      {children}
    </SpeciesContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useSpecies — accède au Species Context Layer.
 * Doit être utilisé dans un composant enfant de <SpeciesProvider>.
 */
export function useSpecies(): SpeciesContextValue {
  const ctx = useContext(SpeciesContext)
  if (!ctx) throw new Error('useSpecies must be used within a <SpeciesProvider>')
  return ctx
}
