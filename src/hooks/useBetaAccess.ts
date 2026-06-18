/**
 * useBetaAccess : Gestion de l'acces beta cote client
 *
 * Refs : strategie revisee BETA GATE TOTAL (Nicolas BATCH 45)
 *
 * Stocke localement la cle beta validee pour permettre au user de naviguer
 * sur le site (landing, signup, login) sans re-saisir le code a chaque visite.
 *
 * Storage : localStorage avec TTL 7 jours (aligne sur la duree de vie de la cle).
 *
 * Flow :
 *   1. User entre code sur /welcome
 *   2. checkBetaAccessKey(code) -> RPC readonly
 *   3. Si valide : grantAccess(code) -> localStorage
 *   4. Tout le site est debloque (BetaAccessGuard verifie via hasAccess)
 *   5. Au signup : claim de la cle via validateBetaKey() (consommation reelle)
 */

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'naturegraph-beta-access'
// BATCH 59 (2026-05-15) : TTL etendu a 30 jours pour la phase de test beta.
// Permet aux beta testeurs de rester "loggue" sur le welcome plus longtemps
// sans avoir a re-saisir leur code. A aligner avec l'expiration des cles en DB
// (beta_access_keys.expires_at) si on veut une coherence parfaite.
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours

interface BetaAccessState {
  /** Le code valide (NG-XXXX-XXXX). Persiste en localStorage. */
  code: string
  /** Timestamp ISO de validation initiale. */
  validatedAt: string
  /** Timestamp ISO d'expiration (validatedAt + 7j). */
  expiresAt: string
}

/**
 * Lit le state actuel depuis localStorage.
 * Renvoie null si absent, expire, ou mal forme.
 */
function readStoredAccess(): BetaAccessState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const state = JSON.parse(raw) as BetaAccessState
    if (!state.code || !state.expiresAt) return null

    // TTL expiration
    if (new Date(state.expiresAt) < new Date()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return state
  } catch {
    // JSON malforme -> cleanup
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export interface UseBetaAccessReturn {
  /** Indique si le user a un acces beta valide. */
  hasAccess: boolean
  /** Le code valide (si present). */
  code: string | null
  /** Indique si le hook a fini de lire le localStorage (hydratation). */
  isReady: boolean
  /** Stocke un nouveau code valide (apres check_beta_access_key_validity OK). */
  grantAccess: (code: string) => void
  /** Efface l'acces (logout, code expire, etc.). */
  revokeAccess: () => void
}

export function useBetaAccess(): UseBetaAccessReturn {
  // Initialisation eager : on lit le localStorage des le premier render.
  // typeof window check pour SSR-safety (no-op cote serveur).
  // Cette approche evite l'avertissement ESLint "setState in effect" qui
  // peut declencher des re-renders en cascade.
  const [state, setState] = useState<BetaAccessState | null>(() =>
    typeof window !== 'undefined' ? readStoredAccess() : null,
  )
  // isReady=true immediatement cote client. Reste false cote SSR (irrelevant pour SPA).
  const isReady = typeof window !== 'undefined'

  // Sync au cas ou le localStorage est modifie par un autre onglet (multi-tab UX).
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'naturegraph-beta-access') {
        setState(readStoredAccess())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const grantAccess = useCallback((code: string) => {
    const now = new Date()
    const expires = new Date(now.getTime() + TTL_MS)
    const newState: BetaAccessState = {
      code: code.trim().toUpperCase(),
      validatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
    setState(newState)
  }, [])

  const revokeAccess = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(null)
  }, [])

  return {
    hasAccess: state !== null,
    code: state?.code ?? null,
    isReady,
    grantAccess,
    revokeAccess,
  }
}
