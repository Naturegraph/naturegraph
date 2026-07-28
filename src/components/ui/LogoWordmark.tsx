/**
 * LogoWordmark : le logo Naturegraph, dans la bonne variante selon le theme
 * =============================================================================
 *
 * NG-058. Les deux endroits qui affichent le logo (`HomeNavbar` et `auth/Logo`)
 * importaient la version couleur en dur ; en mode sombre le lettrage violet
 * disparaissait presque dans le fond.
 *
 * VARIANTE SOMBRE (2026-07-28). L'ancien `logo-wordmark-white.svg` (lettrage
 * tout blanc a plat, sans l'accent) a ete retire : il perdait l'identite de la
 * marque. `logo-wordmark-dark.svg` reprend le wordmark couleur avec les lettres
 * en creme (#FFFDF8) et le « g » en menthe (#99FFCC, `$color-menthe`, choix
 * Nicolas), pour rester lisible ET fidele a la marque.
 *
 * SOURCE UNIQUE. Le choix de la variante vit ici et nulle part ailleurs : c'est
 * precisement parce qu'il etait duplique que le mode sombre a ete oublie des
 * deux cotes.
 *
 * Aucun clignotement au chargement : le script inline de `index.html` pose
 * `data-theme` avant le premier rendu, donc `useThemeContext` connait deja le
 * bon theme quand ce composant s'affiche pour la premiere fois.
 */

import logoColor from '@/assets/logos/logo-wordmark-color.svg'
import logoDark from '@/assets/logos/logo-wordmark-dark.svg'
import { useThemeContext } from '@/contexts/ThemeContext'

interface LogoWordmarkProps {
  /** Classes de taille. Les appelants imposent leur propre hauteur. */
  className?: string
  /**
   * Force une variante independamment du theme global de l'app. Indispensable
   * sur les pages d'accueil (landing, login, signup, onboarding) qui sont
   * TOUJOURS claires via `data-theme="light"` sur leur conteneur : ce forcage
   * est CSS/DOM et n'atteint pas `useThemeContext` (etat JS). Sans ce prop, le
   * logo suivrait le theme JS (sombre) et afficherait le lettrage creme, donc
   * invisible sur la carte claire. Cf. decision Nicolas 2026-07-28.
   */
  forceVariant?: 'light' | 'dark'
}

export function LogoWordmark({ className = 'h-8 w-auto', forceVariant }: LogoWordmarkProps) {
  const { theme } = useThemeContext()
  const variant = forceVariant ?? theme
  return (
    <img src={variant === 'dark' ? logoDark : logoColor} alt="Naturegraph" className={className} />
  )
}
