/**
 * useTheme : Gestion du thème applicatif
 *
 * MVP : thème forcé en light. Le dark mode sera implémenté post-MVP.
 * La structure (context, hook, provider) est conservée pour faciliter
 * la réactivation future : il suffira de décommenter la logique dynamique.
 */

import { useCallback } from 'react'

type Theme = 'light' | 'dark'

/**
 * Hook thème : forcé en light pour le MVP.
 * toggleTheme() et setTheme() sont des no-ops intentionnels.
 */
export function useTheme() {
  const theme: Theme = 'light'

  // No-ops : conservés pour l'interface ThemeContextValue
  const toggleTheme = useCallback(() => {
    // TODO [POST-MVP] : réactiver le switch light/dark
  }, [])

  const setTheme = useCallback((_t: Theme) => {
    // TODO [POST-MVP] : réactiver le switch light/dark
  }, [])

  return { theme, toggleTheme, setTheme }
}
