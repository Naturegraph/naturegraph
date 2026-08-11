/**
 * AppLoader, loader officiel Naturegraph (NG-013)
 *
 * Loader generique pour les chargements EN COURS d'app : Suspense de route
 * (router), gardes d'auth (ProtectedRoute / PublicRoute), fetch critique.
 * Rend un spinner CSS discret pose sur le fond thematise.
 *
 * NOTE (Nicolas 2026-08-10) : la video de marque (app-loading.webm) ne sert
 * QU'AU lancement mobile / PWA (BootSplash, cf. App.tsx). Ici on n'affiche
 * PLUS JAMAIS la video : elle "polluait" visuellement a chaque refresh /
 * chargement de route (un carton creme qui s'ajoutait, ~1 s, entre le fond et
 * le squelette). Un simple spinner suffit et rend la transition propre.
 *
 * Usage :
 *   <AppLoader />           // plein ecran centre
 *   <AppLoader size="sm" /> // version compacte
 *   <AppLoader inline />    // sans wrapper plein ecran
 */

import { useTranslation } from 'react-i18next'
import { Spinner } from './Spinner'

type AppLoaderSize = 'sm' | 'md' | 'lg'

interface AppLoaderProps {
  /** Taille du spinner. md par defaut. */
  size?: AppLoaderSize
  /** Si true, pas de wrapper centre plein ecran (usage inline). */
  inline?: boolean
  /** Label accessible (sr-only). */
  label?: string
  /** Conserve pour compat des appels existants : force un spinner large. */
  fullSize?: boolean
}

export function AppLoader({
  size = 'md',
  inline = false,
  label,
  fullSize = false,
}: AppLoaderProps) {
  const { t } = useTranslation()
  const accessibleLabel = label ?? t('common.loading', { defaultValue: 'Chargement' })

  // Toujours un spinner (jamais la video de marque, reservee au BootSplash mobile).
  const content = <Spinner size={fullSize || size === 'lg' ? 'lg' : size} label={accessibleLabel} />

  if (inline) {
    return (
      <span
        className="inline-flex items-center justify-center"
        role="status"
        aria-label={accessibleLabel}
      >
        {content}
        <span className="sr-only">{accessibleLabel}</span>
      </span>
    )
  }

  return (
    <div
      className="flex items-center justify-center w-full min-h-[40vh]"
      role="status"
      aria-label={accessibleLabel}
    >
      {content}
      <span className="sr-only">{accessibleLabel}</span>
    </div>
  )
}
