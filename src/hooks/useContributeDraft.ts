/**
 * useContributeDraft - Brouillon court-terme pour les formulaires de partage
 *
 * NG-004 (Nicolas 2026-05-31) : un user qui prend du temps a remplir une
 * rencontre nature ou un instant nature, puis qui voit une erreur de submit
 * ou ferme la page par erreur, devait tout reprendre depuis zero. Frustration
 * massive en beta (plusieurs reports : "j abandonne, ca casse a chaque fois").
 *
 * Ce hook sauvegarde le state du formulaire en localStorage avec un TTL
 * tres court (30 minutes par defaut). Au prochain open du panel, si un
 * brouillon valide est dispo pour le formLabel, on le restaure automatiquement.
 *
 * Limitations :
 * - Les File objects (photos) ne sont PAS persistes (trop volumineux, non
 *   serialisables). Seul le state metier (titre, description, dates, especes,
 *   localisation, etc.) est sauvegarde. Si l user refresh, les photos doivent
 *   etre re-uploadees mais le reste est intact.
 * - TTL court (30 min) volontaire (Nicolas : "pas 7 jours, quelques minutes").
 *   Au-dela on considere que le user a abandonne et on purge.
 */

import { useEffect, useRef } from 'react'

const STORAGE_PREFIX = 'naturegraph-draft-'
const DEFAULT_TTL_MS = 30 * 60 * 1000

interface DraftEnvelope<T> {
  /** Timestamp ms de la derniere ecriture, pour TTL */
  savedAt: number
  /** Payload metier du form (sans les Files) */
  payload: T
}

function storageKey(label: string): string {
  return `${STORAGE_PREFIX}${label}`
}

/** Lit le brouillon depuis localStorage si valide (TTL respecte). */
export function readDraft<T>(label: string, ttlMs = DEFAULT_TTL_MS): T | null {
  try {
    const raw = window.localStorage.getItem(storageKey(label))
    if (!raw) return null
    const env = JSON.parse(raw) as DraftEnvelope<T>
    if (!env.savedAt || typeof env.savedAt !== 'number') return null
    const age = Date.now() - env.savedAt
    if (age > ttlMs) {
      // Expire, purge silencieux
      window.localStorage.removeItem(storageKey(label))
      return null
    }
    return env.payload
  } catch {
    return null
  }
}

/** Ecrit le brouillon en localStorage (no-op si erreur quota). */
export function writeDraft<T>(label: string, payload: T): void {
  try {
    const env: DraftEnvelope<T> = { savedAt: Date.now(), payload }
    window.localStorage.setItem(storageKey(label), JSON.stringify(env))
  } catch {
    /* private mode ou quota, on accepte la perte silencieusement */
  }
}

/** Supprime le brouillon (apres submit reussi ou abandon explicite). */
export function clearDraft(label: string): void {
  try {
    window.localStorage.removeItem(storageKey(label))
  } catch {
    /* swallow */
  }
}

/**
 * Hook React : sauvegarde automatique du payload courant a chaque changement.
 * Debounce 1s pour eviter d ecraser localStorage a chaque keystroke.
 *
 * Usage :
 *   useDraftAutoSave('encounter', formStateWithoutFiles)
 *
 * Pour restaurer au mount, utiliser readDraft() directement dans le
 * useState lazy init du form.
 */
export function useDraftAutoSave<T>(label: string, payload: T, enabled = true): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      writeDraft(label, payload)
    }, 1000)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [label, payload, enabled])
}
