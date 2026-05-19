/**
 * MobileNavDrawer — Drawer déclenché par l'icône burger de la MobileBottomNav.
 *
 * Objectif (Nicolas 2026-05-19) : exposer sur mobile UNIQUEMENT le contenu des
 * sidebars desktop (left = GuestSidebar / ProfileSidebar, right = StatsSidebar).
 * La navigation (Accueil, Recherche, Notifications, Profil) est déjà couverte
 * par la MobileBottomNav — pas de duplication ici.
 *
 * Structure (bottom sheet ≤ 95vh) :
 *   1. Header titre + X (pas de handle bar — cohérence avec FilterPanel)
 *   2. Sidebar gauche : ProfileSidebar (connecté) OU GuestSidebar (invité)
 *   3. Sidebar droite : StatsSidebar (uniquement connecté — composant auth-only)
 *
 * Positionnement : sheet collé au bas qui recouvre la MobileBottomNav.
 * z-[60] passe au-dessus de la navbar (z-50), pb-[calc(...)] interne pour que
 * le contenu reste tactile au-dessus de la zone occupée par la navbar.
 *
 * Aucune nouvelle dépendance. Réutilise 100 % du Design System existant.
 */

import { useEffect, useRef, Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { GuestSidebar } from './GuestSidebar'
import { ProfileSidebar } from './ProfileSidebar'

// StatsSidebar = chunk séparé (chargé seulement quand l'utilisateur ouvre le drawer
// en mode authentifié). Cohérent avec le lazy-loading dans Home.tsx.
const StatsSidebar = lazy(() => import('./StatsSidebar').then((m) => ({ default: m.StatsSidebar })))

interface MobileNavDrawerProps {
  /** Callback fermeture du drawer (mis à jour par le parent). */
  onClose: () => void
}

export function MobileNavDrawer({ onClose }: MobileNavDrawerProps) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Focus initial sur le bouton fermer (a11y modal).
  useEffect(() => {
    closeBtnRef.current?.focus()
  }, [])

  // Escape ferme le drawer.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <>
      {/* Backdrop — clique pour fermer */}
      <div
        className="md:hidden fixed inset-0 bg-foreground/30 backdrop-blur-sm z-[55]"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Bottom sheet — recouvre la MobileBottomNav (z-[60]) avec padding-bottom
          interne pour que le scroll/contenu reste tactile au-dessus de la zone
          navbar. Pas de handle bar (cohérence avec FilterPanel). */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menu', { defaultValue: 'Menu' })}
        className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-cream-lighter border-t border-border rounded-t-2xl shadow-xl flex flex-col max-h-[95vh] pb-[env(safe-area-inset-bottom)]"
      >
        {/* Handle bar — cohérence avec les autres bottom sheets (9/10 en ont
            un, on harmonise partout pour rester sur le même pattern visuel). */}
        <div className="flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header — Titre + close */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
          <h2 className="font-heading text-lg font-bold text-foreground">
            {t('nav.menu', { defaultValue: 'Menu' })}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Fermer' })}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5 text-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* Contenu scrollable — uniquement sidebars (left + right).
            On garde un gap pour aérer entre les deux blocs de cards. */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 flex flex-col gap-4">
          {/* Sidebar gauche : profil/guest (cards stats, intérêts, suggestions…) */}
          {isAuthenticated ? <ProfileSidebar /> : <GuestSidebar />}

          {/* Sidebar droite : stats & tendances — seulement en mode authentifié
              (le composant ne montre rien d'utile pour un visiteur déconnecté). */}
          {isAuthenticated && (
            <Suspense fallback={<div className="h-32 rounded-card bg-muted/20" />}>
              <StatsSidebar />
            </Suspense>
          )}
        </div>
      </aside>
    </>
  )
}
