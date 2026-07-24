/**
 * LogoWordmark : le logo Naturegraph, dans la bonne variante selon le theme
 * =============================================================================
 *
 * NG-058. Le fichier `logo-wordmark-white.svg` existait depuis longtemps, mais
 * aucun code ne l'utilisait : les deux endroits qui affichent le logo
 * (`HomeNavbar` et `auth/Logo`) importaient la version couleur en dur. En mode
 * sombre, le lettrage sombre disparaissait presque dans le fond.
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
import logoWhite from '@/assets/logos/logo-wordmark-white.svg'
import { useThemeContext } from '@/contexts/ThemeContext'

interface LogoWordmarkProps {
  /** Classes de taille. Les appelants imposent leur propre hauteur. */
  className?: string
}

export function LogoWordmark({ className = 'h-8 w-auto' }: LogoWordmarkProps) {
  const { theme } = useThemeContext()
  return (
    <img src={theme === 'dark' ? logoWhite : logoColor} alt="Naturegraph" className={className} />
  )
}
