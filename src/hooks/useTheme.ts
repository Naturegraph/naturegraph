/**
 * useTheme : theme clair / sombre de l'application
 * =============================================================================
 *
 * NG-058. Le theme etait FORCE en light depuis le MVP (`toggleTheme` et
 * `setTheme` etaient des no-ops assumes), alors que la feuille de tokens
 * `_dark-theme.scss` existait deja et fonctionnait.
 *
 * DEFAUT CLAIR POUR TOUS (decision Nicolas 2026-07-29). Le mode sombre est un
 * choix OPT-IN : on NE suit PAS `prefers-color-scheme`. Tant que la personne
 * n'active pas explicitement le sombre, l'app reste claire, quel que soit le
 * reglage de son appareil. Son choix est garde dans `localStorage` et l'emporte
 * ensuite toujours.
 *
 * Le theme s'applique sur `<html>` via `data-theme`, ou les deux feuilles de
 * tokens sont branchees. Les pages qui doivent rester claires quoi qu'il arrive
 * (la landing, decision Nicolas 2026-07-23) portent leur propre
 * `data-theme="light"` : un attribut plus proche gagne, sans code conditionnel.
 */

import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const CLE_STOCKAGE = 'naturegraph:theme'

/** Choix explicite deja enregistre, ou `null` si la personne n'a jamais tranche. */
function themeEnregistre(): Theme | null {
  try {
    const v = localStorage.getItem(CLE_STOCKAGE)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    // Navigation privee ou stockage refuse : on degrade sans casser la page.
    return null
  }
}

/** Theme a appliquer au premier rendu : le choix enregistre, sinon CLAIR. */
export function themeInitial(): Theme {
  return themeEnregistre() ?? 'light'
}

function appliquer(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  // `color-scheme` fait suivre ce que le NAVIGATEUR dessine lui-meme : barres
  // de defilement, champs natifs, menus deroulants. Sans lui, on obtient des
  // ascenseurs blancs sur une page sombre.
  document.documentElement.style.colorScheme = theme
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(themeInitial)

  useEffect(() => {
    appliquer(theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(CLE_STOCKAGE, t)
    } catch {
      // Le theme s'applique quand meme pour la session en cours.
    }
    setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((actuel) => {
      const suivant: Theme = actuel === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(CLE_STOCKAGE, suivant)
      } catch {
        // Idem : le theme s'applique pour la session en cours.
      }
      return suivant
    })
  }, [])

  return { theme, toggleTheme, setTheme }
}
