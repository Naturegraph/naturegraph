/**
 * useLocationCTA : Toast + modale localisation 1x par session
 * ============================================================
 * Déclenche automatiquement la modale d'invitation à la localisation
 * pour les utilisateurs connectés qui ne sont pas encore localisés.
 *
 * Règles UX :
 *   - Affiché au maximum 1 fois par session (sessionStorage)
 *   - Délai de 3s après montage (ne pas interrompre le chargement)
 *   - Jamais bloquant : la modale peut être ignorée
 *   - Réactivable manuellement via openModal()
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'

// ─── Constante ────────────────────────────────────────────────

/** Clé sessionStorage pour éviter d'afficher deux fois par session */
const SESSION_SHOWN_KEY = 'loc_cta_shown'

/** Délai avant affichage (ms) : laisse le temps à la page de charger */
const DISPLAY_DELAY_MS = 3000

// ─── Hook ─────────────────────────────────────────────────────

interface UseLocationCTAReturn {
  /** true quand la modale doit être affichée */
  showModal: boolean
  /** Ferme la modale */
  dismissModal: () => void
  /** Ouvre la modale manuellement (ex: bouton "Activer ma zone") */
  openModal: () => void
}

/**
 * Gère l'affichage automatique de la modale de localisation.
 * Déclenché une seule fois par session pour les utilisateurs non-localisés.
 *
 * @example
 * const { showModal, dismissModal, openModal } = useLocationCTA()
 * // → showModal devient true après 3s si !isLocalized
 */
export function useLocationCTA(): UseLocationCTAReturn {
  const { user } = useAuth()
  const { isLocalized, isLoading } = useLocation()

  // _showModal = intention d'affichage. La valeur finale showModal est dérivée :
  // si l'utilisateur devient localisé entre-temps, la modale ne s'affiche pas.
  const [_showModal, setShowModal] = useState(false)

  // Dérivé : jamais true si l'utilisateur est déjà localisé
  const showModal = _showModal && !isLocalized

  useEffect(() => {
    // Attendre que la localisation soit chargée depuis Supabase
    if (isLoading) return

    // Ne rien faire si l'utilisateur est déjà localisé ou non connecté
    if (!user?.id || isLocalized) return

    // Ne pas afficher si déjà montré dans cette session
    if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return

    // Afficher après le délai défini
    const timer = setTimeout(() => {
      sessionStorage.setItem(SESSION_SHOWN_KEY, '1')
      setShowModal(true)
    }, DISPLAY_DELAY_MS)

    return () => clearTimeout(timer)
  }, [user?.id, isLocalized, isLoading])

  const dismissModal = useCallback(() => {
    setShowModal(false)
  }, [])

  const openModal = useCallback(() => {
    setShowModal(true)
  }, [])

  return { showModal, dismissModal, openModal }
}
