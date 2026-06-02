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
import { assertActiveSession, SessionExpiredError } from '@/lib/authGuard'
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

/**
 * Sleep utilitaire pour backoff exponentiel entre retries.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Catégorise une erreur d'upload pour décider si on retry et avec quel
 * message remonter au user.
 *
 *  - 'network'  : connexion qui saute, fetch failed, navigator offline.
 *                 RETRY automatique (l'erreur est probablement transitoire).
 *  - 'timeout'  : la requête a dépassé le délai côté client.
 *                 RETRY 1 fois (peut-être un coup de bourre temporaire).
 *  - 'auth'     : session expirée ou RLS qui bloque.
 *                 PAS de retry (problème de droits, faut se reconnecter).
 *  - 'server'   : 5xx Supabase.
 *                 RETRY automatique (probable instabilité serveur).
 *  - 'client'   : 4xx (sauf 401/403) ou validation locale.
 *                 PAS de retry (problème de payload).
 *  - 'unknown'  : erreur sans pattern reconnu.
 *                 RETRY 1 fois prudemment.
 */
type UploadErrorKind = 'network' | 'timeout' | 'auth' | 'server' | 'client' | 'unknown'
function classifyError(err: unknown): { kind: UploadErrorKind; message: string } {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()
  if (lower.includes('timeout') || lower.includes('aborted')) {
    return { kind: 'timeout', message }
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    !navigator.onLine
  ) {
    return { kind: 'network', message }
  }
  if (lower.includes('401') || lower.includes('403') || lower.includes('jwt')) {
    return { kind: 'auth', message }
  }
  if (/(5\d\d)/.test(lower)) {
    return { kind: 'server', message }
  }
  if (/(4\d\d)/.test(lower)) {
    return { kind: 'client', message }
  }
  return { kind: 'unknown', message }
}

/** True si la classification autorise un retry automatique. */
function shouldRetry(kind: UploadErrorKind): boolean {
  return kind === 'network' || kind === 'server' || kind === 'timeout' || kind === 'unknown'
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

      // Nicolas 2026-05-25 : verifie que la session est vraiment vivante cote
      // serveur avant de lancer le pipeline upload (cas Flo.d, JWT expire
      // localement alors que React state montre user authentifie). Si invalide,
      // assertActiveSession redirige vers /welcome avec un toast clair.
      try {
        await assertActiveSession()
      } catch (err) {
        if (err instanceof SessionExpiredError) {
          // La redirection a deja ete declenchee, on stoppe ici proprement
          return
        }
        // Autre erreur (reseau), on continue, le watchdog gerera
      }

      const isEditing = !!editingPostId
      setIsSubmitting(true)
      setUploadError(null)
      let createdPostId: string | null = null

      // Watchdog 60 s — Nicolas 2026-05-24 : sur réseau mobile lent (3G/4G
      // rurale Québec) avec photo 2 Mo, le watchdog 30s déclenchait avant
      // que l'upload finisse → user voyait « délai dépassé » alors qu'on
      // était à 80% de l'upload. 60s laisse de la marge pour un mobile
      // moyen tout en gardant un garde-fou contre les vrais hangs.
      const watchdog = setTimeout(() => {
        console.warn(`[${formLabel}] watchdog : submission > 60s, force release`)
        setIsSubmitting(false)
        setUploadProgress(null)
        setUploadError(
          t('contribute.media.uploadError', {
            defaultValue:
              'La soumission prend trop de temps. Vérifie ta connexion internet et réessaie.',
          }),
        )
      }, 60_000)

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

        // 2. Upload des médias (si fournis) — pipeline robuste avec retry
        //    exponentiel + tolérance aux échecs partiels.
        //    Nicolas 2026-05-24 (urgence prod) : avant un seul échec
        //    d'upload faisait tout planter. Désormais on retry 2x par
        //    photo sur erreurs transitoires (network/timeout/5xx) et on
        //    continue les photos suivantes même si une échoue.
        const failedUploads: Array<{ name: string; reason: string }> = []
        if (files.length > 0) {
          const [{ detectPhotoFormat }, { stripExif }] = await Promise.all([
            import('@/utils/detectPhotoFormat'),
            import('@/utils/stripExif'),
          ])

          for (let i = 0; i < files.length; i++) {
            setUploadProgress({ current: i + 1, total: files.length })

            const rawFile = files[i]
            const sizeMo = rawFile.size / 1024 / 1024
            console.info(
              `[${formLabel}] upload photo ${i + 1}/${files.length} — ${rawFile.name} (${sizeMo.toFixed(1)} Mo, ${rawFile.type})`,
            )

            let dims: { width: number; height: number } | null = null
            try {
              dims = await detectPhotoFormat(rawFile)
            } catch {
              /* fallback silencieux */
            }

            // Compression + strip EXIF — étape locale, peut échouer si
            // photo corrompue ou format exotique. On capture l'erreur et
            // on skip cette photo plutôt que de tout faire planter.
            let fileToUpload: File
            try {
              const compressed = await compressPhoto(rawFile)
              fileToUpload = await stripExif(compressed)
              console.info(
                `[${formLabel}] compressed → ${(fileToUpload.size / 1024).toFixed(0)} Ko (${fileToUpload.type})`,
              )
            } catch (err) {
              console.error(`[${formLabel}] compression failed for ${rawFile.name}:`, err)
              failedUploads.push({
                name: rawFile.name,
                reason: 'Format non supporté ou photo corrompue.',
              })
              continue
            }

            // En mode édition : APPEND derrière les médias existants
            // (displayOrder timestamp + isCover=false).
            const displayOrder = isEditing ? Date.now() + i : i
            const isCover = !isEditing && i === 0

            // Retry avec backoff exponentiel — 3 tentatives au total
            // (initial + 2 retries). Délai 1s, 2s entre les retries.
            const MAX_ATTEMPTS = 3
            let succeeded = false
            let lastError: { kind: UploadErrorKind; message: string } | null = null
            for (let attempt = 1; attempt <= MAX_ATTEMPTS && !succeeded; attempt++) {
              try {
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
                  45_000,
                  `upload photo ${i + 1}/${files.length} (tentative ${attempt})`,
                )
                succeeded = true
                if (attempt > 1) {
                  console.info(`[${formLabel}] photo ${i + 1} OK après ${attempt} tentatives`)
                }
              } catch (err) {
                lastError = classifyError(err)
                console.warn(
                  `[${formLabel}] photo ${i + 1} échec tentative ${attempt}/${MAX_ATTEMPTS} (${lastError.kind}):`,
                  lastError.message,
                )
                if (!shouldRetry(lastError.kind) || attempt === MAX_ATTEMPTS) {
                  break
                }
                // Backoff exponentiel : 1s, 2s
                await sleep(1000 * attempt)
              }
            }

            if (!succeeded && lastError) {
              const reason =
                lastError.kind === 'auth'
                  ? 'Session expirée, reconnecte-toi.'
                  : lastError.kind === 'network'
                    ? "Coupure réseau pendant l'upload."
                    : lastError.kind === 'timeout'
                      ? "L'upload prenait trop de temps (réseau lent)."
                      : lastError.kind === 'server'
                        ? 'Le serveur Supabase a rencontré une erreur.'
                        : friendlyError(lastError.message, 'Erreur inconnue.')
              failedUploads.push({ name: rawFile.name, reason })
            }
          }
        }

        // Si toutes les photos ont échoué ET qu'on était en mode CRÉATION,
        // on rollback le post orphelin pour ne pas laisser un post vide.
        //
        // V1.1.4 NG-024 v2 (Nicolas 2026-06-02 - bug Patrice) :
        // En mode EDITION on throw AUSSI si toutes les uploads echouent.
        // Sans ce throw, onSuccess etait appele meme sans aucune photo
        // uploadee -> l user voyait son post "sauvegarde" mais en realite
        // les anciennes photos avaient ete supprimees (via onRemoveExistingMedia
        // du Step1) et les nouvelles n etaient jamais arrivees en DB.
        // Le throw empeche la fermeture du panel + affiche un toast clair.
        // Combine avec la sauvegarde differee des suppressions cote form,
        // les anciennes photos sont preservees integralement.
        if (files.length > 0 && failedUploads.length === files.length) {
          throw new Error(
            failedUploads.length === 1
              ? failedUploads[0].reason
              : `Aucune des ${files.length} photos n'a pu être uploadée. ${failedUploads[0].reason}`,
          )
        }

        // Si SEULEMENT certaines photos ont échoué, on continue (le post
        // est créé avec les photos qui ont réussi) mais on remonte un
        // warning user-friendly au lieu d'une erreur bloquante.
        if (failedUploads.length > 0 && failedUploads.length < files.length) {
          console.warn(
            `[${formLabel}] ${failedUploads.length}/${files.length} photos n'ont pas pu être uploadées :`,
            failedUploads,
          )
          // Toast warning non-bloquant — l'user voit le post publié mais
          // sait qu'il manque des photos. Il peut les rajouter via Modifier.
          setUploadError(
            t('contribute.media.partialUploadError', {
              defaultValue: `${failedUploads.length} photo(s) sur ${files.length} n'ont pas pu être ajoutées. Tu peux les rajouter via « Modifier mon observation ».`,
            }),
          )
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
