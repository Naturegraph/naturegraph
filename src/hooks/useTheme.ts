/**
 * useTheme : theme clair / sombre de l'application
 * =============================================================================
 *
 * NG-058. Le theme etait FORCE en light depuis le MVP (`toggleTheme` et
 * `setTheme` etaient des no-ops assumes), alors que la feuille de tokens
 * `_dark-theme.scss` existait deja et fonctionnait.
 *
 * TROIS SOURCES, dans cet ordre de priorite :
 *   1. le choix explicite de la personne, garde dans `localStorage` ;
 *   2. a defaut, la preference du systeme (`prefers-color-scheme`) ;
 *   3. a defaut, clair.
 *
 * Respecter le systeme d'emblee evite le flash blanc en pleine nuit a quelqu'un
 * dont tout l'appareil est en sombre. Mais un choix explicite l'emporte
 * TOUJOURS et n'est jamais ecrase : quelqu'un qui veut Naturegraph en clair sur
 * un telephone en sombre doit pouvoir l'obtenir, et le garder.
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

function themeSysteme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Theme a appliquer au premier rendu. */
export function themeInitial(): Theme {
  return themeEnregistre() ?? themeSysteme()
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

  // Suivre le systeme TANT QUE la personne n'a pas choisi elle-meme. Une fois
  // qu'elle a tranche, changer le reglage de l'appareil ne doit plus rien
  // imposer : ce serait revenir sur une decision explicite.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const auChangement = (e: MediaQueryListEvent) => {
      if (themeEnregistre() === null) setThemeState(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', auChangement)
    return () => mq.removeEventListener('change', auChangement)
  }, [])

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
