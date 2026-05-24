/**
 * useContributePostSubmit — Pipeline de publication partagé Encounter + Instant
 * ===========================================================================
 *
 * Factorise toute la logique de création + upload média + watchdog +
 * rollback entre `ContributeEncounterForm` et `ContributeInstantPanel`.
 * Source unique de vérité : modifier ici garantit que les deux flows
 * restent strictement alignés (Nicolas 2026-05-23 audit final).
 *
 * Pipeline :
 *   1. Watchdog 30s (force release du spinner si hang complet)
 *   2. createPost : timeout 10s (INSERT SQL léger)
 *   3. Pour chaque photo :
 *      - detectPhotoFormat (dims)
 *      - compressPhoto (WebP q=82, max 2560 px)
 *      - stripExif (RGPD — retire GPS / device info)
 *      - uploadPostMedia avec timeout 20 s
 *   4. invalidateQueries(['feed']) → le post apparaît immédiatement
 *   5. Rollback : delete du post orphelin si l'upload média échoue
 *
 * Le hook expose `submit()` + les états réactifs `isSubmitting`,
 * `uploadProgress`, `uploadError` — à câbler dans l'UI du caller.
 */

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useCreatePost, useUpdatePost } from '@/hooks/usePost'
import { compressPhoto } from '@/utils/compressPhoto'
import { uploadPostMedia } from '@/services/mediaService'
import { supabase } from '@/lib/supabase'
import type { CreatePostPayload } from '@/services/postService'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wrap une Promise avec un timeout — rejette explicitement avec un label
 * lisible si la promesse n'a pas résolu dans le délai imparti.
 */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${label} après ${ms / 1000}s`)), ms),
    ),
  ])
}

/** Filtre les messages d'erreur SQL Postgres brut pour éviter de les afficher. */
function friendlyError(rawMessage: string, fallback: string): string {
  if (!rawMessage) return fallback
  if (/violates|constraint|relation|null value|duplicate key/i.test(rawMessage)) return fallback
  return rawMessage
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContributeSubmitParams {
  /** Payload du post (type, description, location, etc.). */
  payload: CreatePostPayload
  /** Fichiers photos à uploader (peut être vide — post texte uniquement). */
  files: File[]
  /**
   * Si défini, MODE ÉDITION : appelle updatePost(editingPostId, payload)
   * au lieu de createPost(). Les nouveaux fichiers (s'il y en a) sont
   * ajoutés au post existant — on n'efface PAS les photos existantes
   * (l'user peut le faire à part via le menu PostOptionsMenu).
   */
  editingPostId?: string
  /**
   * Callback succès — reçoit le post créé/mis à jour pour permettre des
   * actions dépendantes. Appelé APRÈS l'invalidation du cache feed.
   */
  onSuccess: (post: { id: string }) => void | Promise<void>
}

export interface UseContributePostSubmitResult {
  /** Lance le pipeline. À appeler depuis l'event handler du bouton Publier. */
  submit: (params: ContributeSubmitParams) => Promise<void>
  /** true pendant tout le pipeline (createPost + upload). */
  isSubmitting: boolean
  /** Progression upload `1/N`, null hors-upload. */
  uploadProgress: { current: number; total: number } | null
  /** Message d'erreur user-friendly, null si OK. */
  uploadError: string | null
  /** Reset manuel du message d'erreur (croix sur le toast). */
  clearError: () => void
}

// ─── Hook principal ──────────────────────────────────────────────────────────

/**
 * Hook factorisé pour la publication d'un post (Encounter ou Instant).
 * Le label `formLabel` n'est utilisé QUE pour les logs / warnings — il aide
 * à distinguer la source dans la console quand on debug en prod.
 */
export function useContributePostSubmit(formLabel: string): UseContributePostSubmitResult {
  const { t } = useTranslation()
  const { user } = useAuth()
  const createPost = useCreatePost(user?.id ?? '')
  const updatePost = useUpdatePost()
  const queryClient = useQueryClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null,
  )
  const [uploadError, setUploadError] = useState<string | null>(null)

  const clearError = useCallback(() => setUploadError(null), [])

  const submit = useCallback(
    async ({ payload, files, editingPostId, onSuccess }: ContributeSubmitParams) => {
      if (!user?.id) {
        setUploadError(
          t('contribute.errors.notAuthenticated', { defaultValue: 'Connecte-toi pour publier' }),
        )
        return
      }

      const isEditing = !!editingPostId
      setIsSubmitting(true)
      setUploadError(null)
      let createdPostId: string | null = null

      // Watchdog 30 s — filet de sécurité ultime si tout hang silencieusement.
      const watchdog = setTimeout(() => {
        console.warn(`[${formLabel}] watchdog : submission > 30s, force release`)
        setIsSubmitting(false)
        setUploadProgress(null)
        setUploadError(
          t('contribute.media.uploadError', {
            defaultValue:
              'La soumission prend trop de temps. Vérifie ta connexion internet et réessaie.',
          }),
        )
      }, 30_000)

      try {
        // 1. Création OU mise à jour du post (timeout 10 s — opération SQL légère).
        //    En mode édition on appelle updatePost(id, payload) ; aucune
        //    nouvelle row n'est créée donc pas de rollback nécessaire.
        const post = isEditing
          ? await withTimeout(
              updatePost.mutateAsync({ postId: editingPostId!, payload }),
              10_000,
              'mise à jour du post',
            )
          : await withTimeout(createPost.mutateAsync(payload), 10_000, 'création du post')
        // createdPostId reste null en mode édition → pas de rollback sur erreur
        // d'upload (on garde le post existant tel quel).
        if (!isEditing) createdPostId = post.id

        // 2. Upload des médias (si fournis) — pipeline compression + strip EXIF.
        if (files.length > 0) {
          const [{ detectPhotoFormat }, { stripExif }] = await Promise.all([
            import('@/utils/detectPhotoFormat'),
            import('@/utils/stripExif'),
          ])

          for (let i = 0; i < files.length; i++) {
            setUploadProgress({ current: i + 1, total: files.length })

            const rawFile = files[i]
            console.info(
              `[${formLabel}] upload photo ${i + 1}/${files.length} — ${rawFile.name} (${(rawFile.size / 1024 / 1024).toFixed(1)} Mo, ${rawFile.type})`,
            )

            let dims: { width: number; height: number } | null = null
            try {
              dims = await detectPhotoFormat(rawFile)
            } catch {
              /* fallback silencieux */
            }

            const compressed = await compressPhoto(rawFile)
            const fileToUpload = await stripExif(compressed)
            console.info(
              `[${formLabel}] compressed → ${(fileToUpload.size / 1024).toFixed(0)} Ko (${fileToUpload.type})`,
            )

            // En mode édition : on APPEND les nouvelles photos derrière
            // les médias existants (displayOrder offset par timestamp pour
            // éviter les collisions ; isCover = false pour ne pas écraser
            // la cover déjà choisie).
            const displayOrder = isEditing ? Date.now() + i : i
            const isCover = !isEditing && i === 0
            await withTimeout(
              uploadPostMedia({
                file: fileToUpload,
                postId: post.id,
                userId: user.id,
                copyrightNotice: '',
                displayOrder,
                isCover,
                width: dims?.width,
                height: dims?.height,
              }),
              20_000,
              `upload photo ${i + 1}/${files.length}`,
            )
          }
        }

        // 3. Invalide TOUTES les variantes du feed (peu importe le contexte
        //    actif — tabs, filtres, page, currentUserId). Le post apparaît
        //    immédiatement dans la liste. On invalide aussi les posts du
        //    profil pour que l'ADN d'observateur + journal nature se
        //    rafraîchissent dès la première observation (Nicolas 2026-05-24).
        queryClient.invalidateQueries({ queryKey: ['feed'] })
        queryClient.invalidateQueries({ queryKey: ['posts', 'by-user'] })

        await onSuccess(post)
      } catch (err) {
        // Rollback best-effort — supprime le post orphelin si l'upload média
        // a planté APRÈS la création. On ignore les erreurs de rollback
        // (problème secondaire — l'utilisateur verra juste le toast).
        if (createdPostId && supabase) {
          try {
            await supabase.from('posts').delete().eq('id', createdPostId)
          } catch {
            /* swallow */
          }
        }
        const raw = err instanceof Error ? err.message : ''
        setUploadError(
          friendlyError(
            raw,
            t('contribute.media.uploadError', {
              defaultValue:
                'Vérifie ta connexion ou réessaye un peu plus tard pour importer tes photos.',
            }),
          ),
        )
        console.error(`[${formLabel}] submit failed:`, err)
      } finally {
        clearTimeout(watchdog)
        setIsSubmitting(false)
        setUploadProgress(null)
      }
    },
    [user?.id, createPost, queryClient, t, formLabel],
  )

  return { submit, isSubmitting, uploadProgress, uploadError, clearError }
}
