/**
 * useContributePostSubmit : Pipeline de publication partagé Encounter + Instant
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
 *      - stripExif (RGPD : retire GPS / device info)
 *      - uploadPostMedia avec timeout 20 s
 *   4. invalidateQueries(['feed']) → le post apparaît immédiatement
 *   5. Rollback : delete du post orphelin si l'upload média échoue
 *
 * Le hook expose `submit()` + les états réactifs `isSubmitting`,
 * `uploadProgress`, `uploadError` : à câbler dans l'UI du caller.
 */

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useCreatePost, useUpdatePost } from '@/hooks/usePost'
import { uploadPostMedia } from '@/services/mediaService'
import { supabase } from '@/lib/supabase'
import { assertActiveSession, SessionExpiredError } from '@/lib/authGuard'
import type { CreatePostPayload } from '@/services/postService'
import { processMediaForUpload, isProcessMediaError } from '@/utils/processMediaForUpload'
import { PostValidationError, validatePostContent } from '@/lib/postValidation'
import { isTechnicalMessage } from '@/lib/sanitizeError'
import { trackAction, trackFailure, captureException } from '@/lib/monitoring'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wrap une Promise avec un timeout : rejette explicitement avec un label
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

/**
 * Filtre les messages d'erreur techniques (SQL / PostgREST / stack) pour ne
 * jamais les afficher tels quels. Retourne le message d'origine UNIQUEMENT s'il
 * est « propre » (un de nos libelles FR), sinon le `fallback` generique.
 * Delegue la detection « technique » au module partage sanitizeError.
 */
function friendlyError(rawMessage: string, fallback: string): string {
  if (!rawMessage) return fallback
  if (isTechnicalMessage(rawMessage)) return fallback
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
  /** Fichiers photos à uploader (peut être vide : post texte uniquement). */
  files: File[]
  /**
   * Si défini, MODE ÉDITION : appelle updatePost(editingPostId, payload)
   * au lieu de createPost(). Les nouveaux fichiers (s'il y en a) sont
   * ajoutés au post existant : on n'efface PAS les photos existantes
   * (l'user peut le faire à part via le menu PostOptionsMenu).
   */
  editingPostId?: string
  /**
   * Callback succès : reçoit le post créé/mis à jour pour permettre des
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
 * Le label `formLabel` n'est utilisé QUE pour les logs / warnings : il aide
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

  // Verrou "soumission en cours" INDEPENDANT de isSubmitting (NG-012 #1).
  // Le watchdog peut remettre isSubmitting a false (pour debloquer le spinner)
  // AVANT que le pipeline reel soit termine : sans ce verrou, le bouton Publier
  // redevient cliquable et un 2e clic creerait un DOUBLON de post. Le ref n'est
  // libere que quand le pipeline finit vraiment (finally) ou que le watchdog
  // declare un blocage. Un ref (et pas un state) car on veut une valeur lue
  // synchroniquement, sans re-render.
  const inFlightRef = useRef(false)

  const clearError = useCallback(() => setUploadError(null), [])

  const submit = useCallback(
    async ({ payload, files, editingPostId, onSuccess }: ContributeSubmitParams) => {
      // Fil d'Ariane : on sait desormais que l'utilisateur a bien DECLENCHE une
      // publication (le clic est arrive au handler). Si "rien ne se passe"
      // ensuite, la suite des breadcrumbs + les trackFailure ci-dessous disent
      // OU ca a coince (retour Nicolas 2026-07-30).
      trackAction(`${formLabel}.submit`, {
        editing: !!editingPostId,
        files: files.length,
        hasSpecies: !!payload.species_name,
      })

      // Anti-doublon (NG-012 #1) : si un pipeline est deja en cours, on bloque
      // toute nouvelle soumission. Cas typique : le watchdog a reactive le
      // bouton Publier alors que l'upload tourne encore en arriere-plan.
      if (inFlightRef.current) {
        trackFailure(formLabel, 'deja-en-cours')
        setUploadError(
          t('contribute.errors.alreadySubmitting', {
            defaultValue: 'Publication deja en cours, patiente un instant.',
          }),
        )
        return
      }

      if (!user?.id) {
        // "Bouton mort" typique au retour d'arriere-plan : le state React montre
        // encore un user mais l'id est vide -> on le VOIT maintenant dans Sentry.
        trackFailure(formLabel, 'non-authentifie')
        setUploadError(
          t('contribute.errors.notAuthenticated', { defaultValue: 'Connecte-toi pour publier' }),
        )
        return
      }

      // Garde-fou "post vide" INFRANCHISSABLE (BUGFIX 2026-06-11 : Nicolas a pu
      // publier une Rencontre sans rien en prod, le check du formulaire etant
      // contourne par l'observation "Je ne sais pas"). Ici on a le payload FINAL
      // + les fichiers : on valide via la source de verite unitairement testee.
      // hasSpecies derive de species_name (rempli uniquement par une espece
      // IDENTIFIEE, pas par une obs inconnue). En creation seulement (l'edition
      // d'un post existant peut legitimement ne porter que des champs partiels).
      if (!editingPostId) {
        try {
          validatePostContent({
            title: payload.title,
            description: payload.description,
            hasSpecies: !!payload.species_name,
            hasMedia: files.length > 0,
            enforceNonEmpty: true,
          })
        } catch (err) {
          if (err instanceof PostValidationError) {
            setUploadError(err.message)
            return
          }
          throw err
        }
      }

      // Nicolas 2026-05-25 : verifie que la session est vraiment vivante cote
      // serveur avant de lancer le pipeline upload (cas Flo.d, JWT expire
      // localement alors que React state montre user authentifie). Si invalide,
      // assertActiveSession redirige vers /welcome avec un toast clair.
      try {
        await assertActiveSession()
      } catch (err) {
        if (err instanceof SessionExpiredError) {
          // La redirection a deja ete declenchee, on stoppe ici proprement.
          // On le TRACE : c'est LA cause probable du "j'ai quitte l'app, je
          // reviens, publier ne marche plus" (session morte au retour de veille).
          trackFailure(formLabel, 'session-expiree-au-submit')
          return
        }
        // Autre erreur (reseau), on continue, le watchdog gerera
      }

      const isEditing = !!editingPostId
      inFlightRef.current = true
      setIsSubmitting(true)
      setUploadError(null)
      let createdPostId: string | null = null

      // Watchdog "sans progression" (NG-012 #1). AVANT : timeout fixe de 60 s sur
      // la duree TOTALE. Probleme : sur reseau mobile lent (3G/4G rurale) avec
      // retries, le pipeline depasse 60 s legitimement (jusqu'a >2 min pour une
      // photo qui retry 3x) -> fausse erreur "trop long" + reactivation du bouton
      // -> doublon de post si l'user reclique. MAINTENANT : on re-arme le watchdog
      // a CHAQUE etape qui progresse (createPost, chaque photo, chaque tentative
      // bornee a 45 s). Il ne se declenche donc que sur un VRAI blocage : aucune
      // progression pendant 60 s.
      const WATCHDOG_MS = 60_000
      let watchdogId: ReturnType<typeof setTimeout> | undefined
      // NG-012 #3 : marque que le watchdog a "abandonne" (vrai blocage). Sert a
      // ne PAS declencher onSuccess (navigation) si le pipeline finit APRES que
      // l'utilisateur a deja vu l'erreur "trop long".
      let watchdogReleased = false
      const armWatchdog = () => {
        if (watchdogId) clearTimeout(watchdogId)
        watchdogId = setTimeout(() => {
          console.warn(`[${formLabel}] watchdog : aucune progression depuis 60s, force release`)
          // Blocage reel (aucune progression 60s) : visible dans Sentry avec le
          // replay de la session -> on voit enfin OU ca fige.
          trackFailure(formLabel, 'watchdog-60s-sans-progression', {
            createdPost: !!createdPostId,
          })
          // Vrai blocage : on libere le verrou pour que l'utilisateur puisse
          // reessayer. Reste un cas rare (upload tres lent qui se debloque juste
          // apres) a couvrir plus tard via AbortController (NG-012 suite).
          watchdogReleased = true
          inFlightRef.current = false
          setIsSubmitting(false)
          setUploadProgress(null)
          setUploadError(
            t('contribute.media.uploadError', {
              defaultValue:
                'La soumission prend trop de temps. Vérifie ta connexion internet et réessaie.',
            }),
          )
        }, WATCHDOG_MS)
      }
      armWatchdog()

      try {
        // 1. Création OU mise à jour du post. NG-012 #2 : timeout 20 s (et non 10).
        //    Sur 3G/4G rurale l'INSERT peut legitimement depasser 10 s ; un timeout
        //    trop court rejetait alors que l'INSERT reussissait cote serveur ->
        //    fausse erreur + post cree sans rollback (createdPostId reste null).
        //    En mode édition, aucune nouvelle row n'est créée donc pas de rollback.
        const post = isEditing
          ? await withTimeout(
              updatePost.mutateAsync({ postId: editingPostId!, payload }),
              20_000,
              'mise à jour du post',
            )
          : await withTimeout(createPost.mutateAsync(payload), 20_000, 'création du post')
        // createdPostId reste null en mode édition → pas de rollback sur erreur
        // d'upload (on garde le post existant tel quel).
        if (!isEditing) createdPostId = post.id
        armWatchdog() // post cree : etape franchie, on re-arme le garde-fou

        // 2. Upload des médias (si fournis) : pipeline robuste avec retry
        //    exponentiel + tolérance aux échecs partiels.
        //    Nicolas 2026-05-24 (urgence prod) : avant un seul échec
        //    d'upload faisait tout planter. Désormais on retry 2x par
        //    photo sur erreurs transitoires (network/timeout/5xx) et on
        //    continue les photos suivantes même si une échoue.
        const failedUploads: Array<{ name: string; reason: string }> = []
        if (files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            setUploadProgress({ current: i + 1, total: files.length })
            armWatchdog() // nouvelle photo : progression

            const rawFile = files[i]
            const sizeMo = rawFile.size / 1024 / 1024
            console.info(
              `[${formLabel}] upload photo ${i + 1}/${files.length} : ${rawFile.name} (${sizeMo.toFixed(1)} Mo, ${rawFile.type})`,
            )

            // V1.1.4 NG-025 (Nicolas 2026-06-03) : pipeline unifie.
            // processMediaForUpload remplace compressPhoto + stripExif +
            // stripImageExif. Single-pass canvas, orientation EXIF appliquee,
            // HEIC decode lazy via heic2any, cap 40 Mo, output JPEG/WebP,
            // erreurs structurees user-friendly.
            const result = await processMediaForUpload(rawFile)
            if (isProcessMediaError(result)) {
              console.error(
                `[${formLabel}] process failed for ${rawFile.name}: ${result.code}`,
                result.details,
              )
              // Traitement image echoue AVANT l'envoi (decode HEIC iPhone,
              // format, taille...). C'est le "il ne prend pas mes photos / pb de
              // droits" (Hebus13) : on voit enfin le CODE d'erreur exact + le
              // type/taille du fichier, cote appareil, dans Sentry.
              trackFailure(`${formLabel}.upload.process`, result.code, {
                fileType: rawFile.type,
                sizeMo: Math.round(sizeMo * 10) / 10,
              })
              failedUploads.push({ name: rawFile.name, reason: result.message })
              continue
            }
            const fileToUpload = result.file
            const dims = result.finalDimensions
            console.info(
              `[${formLabel}] processed → ${(fileToUpload.size / 1024).toFixed(0)} Ko (${fileToUpload.type})`,
            )

            // En mode édition : APPEND derrière les médias existants
            // (displayOrder timestamp + isCover=false).
            const displayOrder = isEditing ? Date.now() + i : i
            const isCover = !isEditing && i === 0

            // Retry avec backoff exponentiel : 3 tentatives au total
            // (initial + 2 retries). Délai 1s, 2s entre les retries.
            const MAX_ATTEMPTS = 3
            let succeeded = false
            let lastError: { kind: UploadErrorKind; message: string } | null = null
            for (let attempt = 1; attempt <= MAX_ATTEMPTS && !succeeded; attempt++) {
              armWatchdog() // chaque tentative bornee (45s) re-arme le garde-fou
              try {
                await withTimeout(
                  uploadPostMedia({
                    file: fileToUpload,
                    postId: post.id,
                    userId: user.id,
                    copyrightNotice: '',
                    displayOrder,
                    isCover,
                    width: dims.width,
                    height: dims.height,
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
              // Upload storage definitivement echoue apres retries : on trace la
              // CATEGORIE (auth / reseau / timeout / serveur) -> on saura si le
              // "pb de droits" vient d'une session morte, d'un reseau mobile, ou
              // du serveur, au lieu de deviner.
              trackFailure(`${formLabel}.upload.storage`, lastError.kind, {
                attempts: MAX_ATTEMPTS,
              })
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
        // En édition on garde le post existant (les anciennes photos sont
        // toujours là).
        if (!isEditing && files.length > 0 && failedUploads.length === files.length) {
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
          // Toast warning non-bloquant : l'user voit le post publié mais
          // sait qu'il manque des photos. Il peut les rajouter via Modifier.
          setUploadError(
            t('contribute.media.partialUploadError', {
              failed: failedUploads.length,
              total: files.length,
              defaultValue:
                "{{failed}} photo(s) sur {{total}} n'ont pas pu être ajoutées. Tu peux les rajouter via « Modifier mon observation ».",
            }),
          )
        }

        // 3. Invalide TOUTES les variantes du feed (peu importe le contexte
        //    actif : tabs, filtres, page, currentUserId). Le post apparaît
        //    immédiatement dans la liste. On invalide aussi les posts du
        //    profil pour que l'ADN d'observateur + journal nature se
        //    rafraîchissent dès la première observation (Nicolas 2026-05-24).
        queryClient.invalidateQueries({ queryKey: ['feed'] })
        queryClient.invalidateQueries({ queryKey: ['posts', 'by-user'] })

        // NG-012 #3 : si le watchdog a deja abandonne (l'user a vu l'erreur "trop
        // long"), on NE declenche PAS onSuccess (navigation/fermeture du form) ->
        // evite une navigation tardive deroutante. Le post est quand meme cree et
        // le feed invalide ci-dessus, donc l'observation apparaitra au prochain
        // affichage.
        if (!watchdogReleased) await onSuccess(post)
      } catch (err) {
        // Rollback best-effort : supprime le post orphelin si l'upload média
        // a planté APRÈS la création. On ignore les erreurs de rollback
        // (problème secondaire : l'utilisateur verra juste le toast).
        if (createdPostId && supabase) {
          try {
            await supabase.from('posts').delete().eq('id', createdPostId)
          } catch {
            /* swallow */
          }
        }
        // Erreur de validation metier (titre trop long, post vide...) : son
        // message est ECRIT PAR NOUS, donc sur et utile -> on l'affiche tel quel
        // sans passer par le filtre technique.
        if (err instanceof PostValidationError) {
          setUploadError(err.message)
          console.warn(`[${formLabel}] validation refusee:`, err.code)
        } else {
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
          // Vraie erreur de publication : jusqu'ici elle ne partait PAS a Sentry
          // (juste un toast). On la capture avec le contexte du geste -> une
          // publication qui echoue devient visible et diagnosticable.
          captureException(err, {
            flow: formLabel,
            files: files.length,
            editing: !!editingPostId,
          })
        }
      } finally {
        if (watchdogId) clearTimeout(watchdogId)
        // Pipeline reellement termine (succes ou echec) : on libere le verrou.
        inFlightRef.current = false
        setIsSubmitting(false)
        setUploadProgress(null)
      }
    },
    [user?.id, createPost, queryClient, t, formLabel],
  )

  return { submit, isSubmitting, uploadProgress, uploadError, clearError }
}
