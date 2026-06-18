/**
 * AccessibilityContext : Préférences d'accessibilité globales
 * ============================================================
 * Gère deux paramètres persistés en localStorage et appliqués
 * immédiatement sur l'élément <html> via des attributs data-* :
 *
 *   data-text-size="small|medium|large"
 *     → contrôle la taille de base du texte dans toute l'app
 *     → _accessibility.scss lit cet attribut et ajuste --font-size-base
 *
 *   data-high-contrast="true|false"
 *     → active le mode haut contraste
 *     → _accessibility.scss renforce les couleurs et les bordures
 *
 * Stratégie localStorage :
 *   - Clé : "ng_text_size"     valeur : "small" | "medium" | "large"
 *   - Clé : "ng_high_contrast" valeur : "true" | "false"
 *   - En cas de valeur corrompue → fallback silencieux sur les défauts
 *
 * TODO [BACKEND] : synchroniser ces préférences avec profiles.preferences (Supabase)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TextSize = 'small' | 'medium' | 'large'

export interface AccessibilityContextValue {
  textSize: TextSize
  setTextSize: (size: TextSize) => void
  highContrast: boolean
  setHighContrast: (enabled: boolean) => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const LS_TEXT_SIZE = 'ng_text_size'
const LS_HIGH_CONTRAST = 'ng_high_contrast'
const VALID_SIZES: TextSize[] = ['small', 'medium', 'large']

/** Lit une valeur de localStorage avec un fallback en cas d'erreur ou valeur invalide */
function readLS<T extends string>(key: string, fallback: T, valid: T[]): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored && valid.includes(stored as T)) return stored as T
  } catch {
    /* localStorage indisponible (mode privé strict, etc.) */
  }
  return fallback
}

function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* silencieux : la préférence ne sera pas persistée */
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>(() =>
    readLS<TextSize>(LS_TEXT_SIZE, 'medium', VALID_SIZES),
  )

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    const stored = readLS(LS_HIGH_CONTRAST, 'false', ['true', 'false'])
    return stored === 'true'
  })

  // ── Appliquer textSize sur <html> ──────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize)
  }, [textSize])

  // ── Appliquer highContrast sur <html> ─────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-high-contrast', String(highContrast))
  }, [highContrast])

  // ── Setters avec persistance ───────────────────────────────────────────────
  const setTextSize = useCallback((size: TextSize) => {
    setTextSizeState(size)
    writeLS(LS_TEXT_SIZE, size)
  }, [])

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled)
    writeLS(LS_HIGH_CONTRAST, String(enabled))
  }, [])

  const value = useMemo(
    () => ({ textSize, setTextSize, highContrast, setHighContrast }),
    [textSize, setTextSize, highContrast, setHighContrast],
  )

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return ctx
}
