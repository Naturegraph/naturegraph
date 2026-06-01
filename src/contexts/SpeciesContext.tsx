/**
 * SpeciesContext — Species Context Layer
 * ========================================
 * Implementation du concept produit cle du PRD Recherche §3.4 :
 *
 *   "La recherche d une espece declenche un changement de contexte global.
 *    L application passe d un feed global a un feed contextualise."
 *
 * Quand une espece est selectionnee dans la recherche :
 *   1. Elle est stockee ici (memoire — pas de localStorage pour la session)
 *   2. FeedSection souscrit a ce contexte et filtre le feed cote backend
 *      par taxref_id
 *   3. Le bouton recherche de la HomeNavbar affiche le label + une croix X
 *      pour revenir au feed global
 *
 * Note V1.1.4 (Nicolas 2026-06-01) : la categorie taxonomique a un flow
 * distinct via le FeedFilterPanel (checkbox + badge compteur). Le click sur
 * un chip categorie d un post coche la case correspondante dans le panel,
 * il ne passe PAS par ce contexte.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { SpeciesHit } from '@/services/searchService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpeciesContextValue {
  /** Espece actuellement active (null = feed global) */
  activeSpecies: SpeciesHit | null
  /** Selectionner une espece -> active le feed contextualise */
  setActiveSpecies: (species: SpeciesHit) => void
  /** Reinitialiser -> retour au feed global */
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
 * useSpecies — accede au Species Context Layer.
 * Doit etre utilise dans un composant enfant de <SpeciesProvider>.
 */
export function useSpecies(): SpeciesContextValue {
  const ctx = useContext(SpeciesContext)
  if (!ctx) throw new Error('useSpecies must be used within a <SpeciesProvider>')
  return ctx
}
