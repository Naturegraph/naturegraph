/**
 * SpeciesContext — Species + Category Context Layer (Feed contextualise)
 * ========================================================================
 * Implementation des concepts produit cles du PRD Recherche §3.4 et §6.1 :
 *
 *   "La recherche d une espece declenche un changement de contexte global.
 *    L application passe d un feed global a un feed contextualise."
 *
 * Etendu V1.1.4 NG-023 (Nicolas 2026-06-01) : meme principe pour la categorie
 * taxonomique (groupe d especes, ex : Oiseaux, Mammiferes). Cliquer sur la
 * catégorie d un post filtre le feed sur tous les posts de cette catégorie.
 *
 * Quand une espece OU une categorie est selectionnee :
 *   1. Elle est stockee ici (memoire — pas de localStorage pour la session)
 *   2. FeedSection souscrit a ce contexte et filtre le feed cote backend
 *   3. Un bandeau "Feed filtre : [espece/categorie]" apparait avec reset
 *
 * Convention exclusive : une seule des deux peut etre active a la fois.
 * Selectionner une espece reset la categorie active (et inversement) pour
 * eviter les filtres conflictuels qui produisent un feed vide non-intuitif.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { SpeciesHit } from '@/services/searchService'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Contexte categorie : la valeur correspond a posts.taxonomic_group */
export interface ActiveCategory {
  /** Cle taxonomique stockee en DB (ex: "birds", "mammals", "insects") */
  group: string
  /** Label affichable (ex: "Oiseaux") — passe par le caller, peut etre i18n */
  label: string
  /** Emoji associe (ex: "🦅") — pour l affichage dans le bandeau */
  emoji: string
}

interface SpeciesContextValue {
  /** Espece actuellement active (null = pas de filtre espece) */
  activeSpecies: SpeciesHit | null
  /** Categorie taxonomique actuellement active (null = pas de filtre cat) */
  activeCategory: ActiveCategory | null
  /** Selectionner une espece -> active le feed contextualise (reset categorie) */
  setActiveSpecies: (species: SpeciesHit) => void
  /** Selectionner une categorie -> active le filtre groupe (reset espece) */
  setActiveCategory: (category: ActiveCategory) => void
  /** Reinitialiser -> retour au feed global (clear espece + categorie) */
  clearActiveSpecies: () => void
  /** Clear seulement la categorie (utile depuis le bandeau categorie) */
  clearActiveCategory: () => void
}

// ─── Contexte ─────────────────────────────────────────────────────────────────

const SpeciesContext = createContext<SpeciesContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SpeciesProvider({ children }: { children: ReactNode }) {
  const [activeSpecies, setActiveSpeciesState] = useState<SpeciesHit | null>(null)
  const [activeCategory, setActiveCategoryState] = useState<ActiveCategory | null>(null)

  const setActiveSpecies = useCallback((species: SpeciesHit) => {
    setActiveSpeciesState(species)
    // Exclusivite : selectionner une espece desactive la categorie
    setActiveCategoryState(null)
  }, [])

  const setActiveCategory = useCallback((category: ActiveCategory) => {
    setActiveCategoryState(category)
    // Exclusivite : selectionner une categorie desactive l espece
    setActiveSpeciesState(null)
  }, [])

  const clearActiveSpecies = useCallback(() => {
    setActiveSpeciesState(null)
    setActiveCategoryState(null)
  }, [])

  const clearActiveCategory = useCallback(() => {
    setActiveCategoryState(null)
  }, [])

  return (
    <SpeciesContext.Provider
      value={{
        activeSpecies,
        activeCategory,
        setActiveSpecies,
        setActiveCategory,
        clearActiveSpecies,
        clearActiveCategory,
      }}
    >
      {children}
    </SpeciesContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useSpecies — accede au Species + Category Context Layer.
 * Doit etre utilise dans un composant enfant de <SpeciesProvider>.
 */
export function useSpecies(): SpeciesContextValue {
  const ctx = useContext(SpeciesContext)
  if (!ctx) throw new Error('useSpecies must be used within a <SpeciesProvider>')
  return ctx
}
