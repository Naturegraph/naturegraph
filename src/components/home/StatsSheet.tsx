/**
 * StatsSheet : Tiroir latéral droit qui expose la StatsSidebar
 * ====================================================================
 *
 * Nicolas 2026-05-22 : sur les écrans entre 1024 et 1279 px (lg) la
 * sidebar droite (tendances espèces, communauté) n'est pas affichée
 * en permanence pour préserver la largeur du feed photos. Pour ne pas
 * perdre l'info, on l'expose via ce sheet ouvert au clic sur le bouton
 * « Stats » de la HomeNavbar.
 *
 * Comportement :
 *   - Tiroir glissant depuis la droite (max-width 360 px desktop, full
 *     width sur mobile en fallback).
 *   - Backdrop semi-opaque qui ferme au clic.
 *   - ESC pour fermer.
 *   - Body scroll locked tant que le sheet est ouvert.
 *
 * Accessibilité :
 *   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
 *   - Bouton de fermeture clavier focusable.
 */

import { lazy, Suspense, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Lazy load : la sidebar contient des hooks Supabase et fait du fetch ;
// on ne paye le chunk que si l'utilisateur ouvre réellement le sheet.
const StatsSidebar = lazy(() => import('./StatsSidebar').then((m) => ({ default: m.StatsSidebar })))

interface StatsSheetProps {
  onClose: () => void
}

export function StatsSheet({ onClose }: StatsSheetProps) {
  const { t } = useTranslation()

  // ESC pour fermer
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Bloquer le scroll du body tant que le sheet est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <>
      {/* Backdrop : clic ferme */}
      <div
        className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Tiroir droit : w-full sur mobile fallback, contraint à 360 px sur md+ */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-sheet-title"
        className="fixed inset-y-0 right-0 z-50 w-full md:w-[360px] bg-cream-lighter flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 h-16 border-b border-border">
          <h2 id="stats-sheet-title" className="font-title font-bold text-lg text-foreground">
            {t('home.statsSheet.title', { defaultValue: 'Tendances & communauté' })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="size-9 rounded-full bg-[#f0f0f5] hover:bg-[#e5e5ea] flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Contenu scrollable : StatsSidebar lazy-loaded */}
        <div className="flex-1 overflow-y-auto p-5">
          <Suspense fallback={<div className="w-full h-96 bg-muted/20 rounded-lg animate-pulse" />}>
            {/* V1.1.5 NG-032 : clic sur une tendance applique le filtre espece
                puis ferme le tiroir (onClose) pour revenir au feed filtre. */}
            <StatsSidebar onItemSelected={onClose} />
          </Suspense>
        </div>
      </aside>
    </>
  )
}
