/**
 * NotebookContext, V1.2.0 Carnets d observations (NG-006 mode terrain)
 *
 * Gere le carnet actif (status draft|active) en memoire + sync Supabase.
 * Recovery au boot : si l user a un carnet draft/active cote serveur, on le
 * recharge automatiquement (NG-006 "ferme l app, revient le lendemain").
 *
 * Regle produit :
 *   - 1 seul carnet actif a la fois par user (decision Nicolas)
 *   - Si l user lance "Nouveau carnet" alors qu il en a un actif, on bascule
 *     l ancien en "draft" puis on active le nouveau (UI doit prevenir avant)
 *
 * Persistance :
 *   - Snapshot localStorage au cas ou Supabase serait indisponible (offline)
 *   - Mutations -> sync immediat Supabase + maj snapshot local
 *   - Au boot : on prefere le serveur, le localStorage est juste un fallback
 *
 * Hooks consommables :
 *   - useNotebook()        : context complet
 *   - useActiveNotebook()  : juste le carnet actif courant
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  addObservation,
  createNotebook,
  deleteNotebook,
  getActiveNotebookForUser,
  getNotebookWithObservations,
  removeObservation,
  removeObservationByTaxref,
  updateNotebook,
  updateObservation,
  type AddObservationPayload,
  type CreateNotebookPayload,
  type Notebook,
  type NotebookObservation,
  type NotebookWithObservations,
  type UpdateNotebookPayload,
} from '@/services/notebookService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotebookContextValue {
  /** Carnet actif courant (draft|active) avec ses observations. null si aucun. */
  activeNotebook: NotebookWithObservations | null
  /** true tant que la recovery initiale n est pas terminee */
  isLoading: boolean
  /** true si une mutation est en cours (start, addSpecies, etc) */
  isMutating: boolean
  error: Error | null

  /** Demarre un nouveau carnet (status='active' + started_at=now). Si un carnet etait deja actif, le bascule en draft. */
  startNotebook: (payload?: CreateNotebookPayload) => Promise<NotebookWithObservations>
  /** Bascule le carnet actif en draft (pause sortie terrain). */
  pauseNotebook: () => Promise<void>
  /** Bascule un carnet draft en active (reprise sortie terrain). */
  resumeNotebook: (notebookId: string) => Promise<NotebookWithObservations>
  /** Termine la sortie (status=finished). Le carnet est pret pour publication. */
  finishNotebook: () => Promise<NotebookWithObservations>
  /** Supprime totalement le carnet actif (brouillon abandonne). */
  discardNotebook: () => Promise<void>

  /** Maj titre / location / metadata du carnet actif. */
  patchNotebook: (patch: UpdateNotebookPayload) => Promise<void>

  /** Ajoute une espece (incremente count si deja presente). */
  addSpecies: (payload: AddObservationPayload) => Promise<void>
  /** Retire totalement une espece du carnet actif. */
  removeSpecies: (taxrefId: string) => Promise<void>
  /** Met a jour le count d individus d une espece. */
  setSpeciesCount: (observationId: string, count: number) => Promise<void>
  /** Retire une observation precise par id (utile si la liste a des doublons historiques). */
  removeObservationById: (observationId: string) => Promise<void>

  /** Recharge depuis Supabase (apres mutation externe ou Realtime). */
  refresh: () => Promise<void>
}

const NotebookContext = createContext<NotebookContextValue | null>(null)

// ─── localStorage snapshot (offline fallback) ─────────────────────────────────

const SNAPSHOT_KEY_PREFIX = 'naturegraph-notebook-snapshot:'

function snapshotKey(userId: string) {
  return `${SNAPSHOT_KEY_PREFIX}${userId}`
}

function safeLocalGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeLocalSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* private mode : on accepte de perdre la sauvegarde locale */
  }
}

function safeLocalRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* idem */
  }
}

function loadSnapshot(userId: string): NotebookWithObservations | null {
  const raw = safeLocalGet(snapshotKey(userId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as NotebookWithObservations
  } catch {
    return null
  }
}

function saveSnapshot(userId: string, notebook: NotebookWithObservations | null): void {
  if (!notebook) {
    safeLocalRemove(snapshotKey(userId))
    return
  }
  safeLocalSet(snapshotKey(userId), JSON.stringify(notebook))
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotebookProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [activeNotebook, setActiveNotebook] = useState<NotebookWithObservations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Snapshot localStorage a chaque mutation (defense offline)
  useEffect(() => {
    if (!userId) return
    saveSnapshot(userId, activeNotebook)
  }, [userId, activeNotebook])

  // Helper : reload depuis Supabase
  const refresh = useCallback(async () => {
    if (!userId) {
      setActiveNotebook(null)
      setIsLoading(false)
      return
    }
    try {
      const head = await getActiveNotebookForUser(userId)
      if (!head) {
        setActiveNotebook(null)
        return
      }
      const full = await getNotebookWithObservations(head.id)
      setActiveNotebook(full)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    }
  }, [userId])

  // Boot : recovery NG-006
  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setActiveNotebook(null)
      setIsLoading(false)
      return
    }

    // 1. Hydrate immediat depuis localStorage (UX rapide, evite flash)
    const snap = loadSnapshot(userId)
    if (snap) setActiveNotebook(snap)

    // 2. Fetch authoritatif Supabase en arriere-plan
    setIsLoading(true)
    setError(null)
    ;(async () => {
      try {
        const head = await getActiveNotebookForUser(userId)
        if (cancelled) return
        if (!head) {
          setActiveNotebook(null)
          return
        }
        const full = await getNotebookWithObservations(head.id)
        if (cancelled) return
        setActiveNotebook(full)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e : new Error(String(e)))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const withMutation = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setIsMutating(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      setError(err)
      throw err
    } finally {
      setIsMutating(false)
    }
  }, [])

  // Garde une reference stable pour eviter les races dans les callbacks
  const activeNotebookRef = useRef(activeNotebook)
  useEffect(() => {
    activeNotebookRef.current = activeNotebook
  }, [activeNotebook])

  const startNotebook = useCallback(
    async (payload: CreateNotebookPayload = {}) => {
      if (!userId) throw new Error('Aucun user connecte')
      return withMutation(async () => {
        // Si carnet actif existe -> on le passe en draft d abord
        const current = activeNotebookRef.current
        if (current && current.status === 'active') {
          await updateNotebook(current.id, { status: 'draft' })
        }
        const created = await createNotebook(userId, {
          ...payload,
          status: 'active',
          started_at: payload.started_at ?? new Date().toISOString(),
        })
        const full: NotebookWithObservations = { ...created, observations: [] }
        setActiveNotebook(full)
        return full
      })
    },
    [userId, withMutation],
  )

  const pauseNotebook = useCallback(async () => {
    const current = activeNotebookRef.current
    if (!current) return
    await withMutation(async () => {
      const updated = await updateNotebook(current.id, { status: 'draft' })
      setActiveNotebook({ ...current, ...updated })
    })
  }, [withMutation])

  const resumeNotebook = useCallback(
    async (notebookId: string) => {
      return withMutation(async () => {
        // Pause l actif si different
        const current = activeNotebookRef.current
        if (current && current.id !== notebookId && current.status === 'active') {
          await updateNotebook(current.id, { status: 'draft' })
        }
        const updated = await updateNotebook(notebookId, {
          status: 'active',
          started_at: new Date().toISOString(),
        })
        const full = await getNotebookWithObservations(notebookId)
        const result = full ?? { ...updated, observations: [] }
        setActiveNotebook(result)
        return result
      })
    },
    [withMutation],
  )

  const finishNotebook = useCallback(async () => {
    const current = activeNotebookRef.current
    if (!current) throw new Error('Aucun carnet actif')
    return withMutation(async () => {
      const updated = await updateNotebook(current.id, {
        status: 'finished',
        finished_at: new Date().toISOString(),
      })
      const next: NotebookWithObservations = { ...current, ...updated }
      // Le carnet n est plus "actif" donc on retire du context
      setActiveNotebook(null)
      return next
    })
  }, [withMutation])

  const discardNotebook = useCallback(async () => {
    const current = activeNotebookRef.current
    if (!current) return
    await withMutation(async () => {
      await deleteNotebook(current.id)
      setActiveNotebook(null)
    })
  }, [withMutation])

  const patchNotebook = useCallback(
    async (patch: UpdateNotebookPayload) => {
      const current = activeNotebookRef.current
      if (!current) return
      await withMutation(async () => {
        const updated = await updateNotebook(current.id, patch)
        setActiveNotebook({ ...current, ...updated })
      })
    },
    [withMutation],
  )

  const addSpecies = useCallback(
    async (payload: AddObservationPayload) => {
      const current = activeNotebookRef.current
      if (!current) throw new Error('Aucun carnet actif pour ajouter une espece')
      await withMutation(async () => {
        const obs = await addObservation(current.id, payload)
        // Si l espece existait deja (incremente count), on remplace; sinon append
        const exists = current.observations.find((o) => o.taxref_id === obs.taxref_id)
        const next = exists
          ? current.observations.map((o) => (o.taxref_id === obs.taxref_id ? obs : o))
          : [...current.observations, obs]
        const totalCount = next.reduce((s, o) => s + (o.individuals_count ?? 1), 0)
        setActiveNotebook({
          ...current,
          observations: next,
          species_count: next.length,
          observations_count: totalCount,
        })
      })
    },
    [withMutation],
  )

  const removeSpecies = useCallback(
    async (taxrefId: string) => {
      const current = activeNotebookRef.current
      if (!current) return
      await withMutation(async () => {
        await removeObservationByTaxref(current.id, taxrefId)
        const next = current.observations.filter((o) => o.taxref_id !== taxrefId)
        const totalCount = next.reduce((s, o) => s + (o.individuals_count ?? 1), 0)
        setActiveNotebook({
          ...current,
          observations: next,
          species_count: next.length,
          observations_count: totalCount,
        })
      })
    },
    [withMutation],
  )

  const setSpeciesCount = useCallback(
    async (observationId: string, count: number) => {
      const current = activeNotebookRef.current
      if (!current) return
      const safeCount = Math.max(1, Math.floor(count))
      await withMutation(async () => {
        const updated = await updateObservation(observationId, { individuals_count: safeCount })
        const next = current.observations.map((o) => (o.id === observationId ? updated : o))
        const totalCount = next.reduce((s, o) => s + (o.individuals_count ?? 1), 0)
        setActiveNotebook({
          ...current,
          observations: next,
          observations_count: totalCount,
        })
      })
    },
    [withMutation],
  )

  const removeObservationById = useCallback(
    async (observationId: string) => {
      const current = activeNotebookRef.current
      if (!current) return
      await withMutation(async () => {
        await removeObservation(observationId)
        const next = current.observations.filter((o) => o.id !== observationId)
        const totalCount = next.reduce((s, o) => s + (o.individuals_count ?? 1), 0)
        setActiveNotebook({
          ...current,
          observations: next,
          species_count: next.length,
          observations_count: totalCount,
        })
      })
    },
    [withMutation],
  )

  // Snapshot purge a la deconnexion (defensive : evite leak d un user a l autre sur meme browser)
  useEffect(() => {
    if (!userId) {
      // Cherche tous les snapshots existants et les laisse en place
      // (on ne touche pas car on ne sait pas a quel user ils appartiennent)
      // Au prochain login le bon snapshot sera reconstruit.
    }
  }, [userId])

  const value = useMemo<NotebookContextValue>(
    () => ({
      activeNotebook,
      isLoading,
      isMutating,
      error,
      startNotebook,
      pauseNotebook,
      resumeNotebook,
      finishNotebook,
      discardNotebook,
      patchNotebook,
      addSpecies,
      removeSpecies,
      setSpeciesCount,
      removeObservationById,
      refresh,
    }),
    [
      activeNotebook,
      isLoading,
      isMutating,
      error,
      startNotebook,
      pauseNotebook,
      resumeNotebook,
      finishNotebook,
      discardNotebook,
      patchNotebook,
      addSpecies,
      removeSpecies,
      setSpeciesCount,
      removeObservationById,
      refresh,
    ],
  )

  return <NotebookContext.Provider value={value}>{children}</NotebookContext.Provider>
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Hook complet : toutes les actions sur le carnet actif. */
export function useNotebook(): NotebookContextValue {
  const ctx = useContext(NotebookContext)
  if (!ctx) throw new Error('useNotebook() doit etre utilise dans <NotebookProvider>')
  return ctx
}

/** Selecteur leger : juste le carnet actif (utile pour le banner). */
export function useActiveNotebook(): NotebookWithObservations | null {
  const { activeNotebook } = useNotebook()
  return activeNotebook
}

// Re-exports types pour les composants consommateurs
export type {
  Notebook,
  NotebookObservation,
  NotebookWithObservations,
  AddObservationPayload,
  CreateNotebookPayload,
  UpdateNotebookPayload,
}
