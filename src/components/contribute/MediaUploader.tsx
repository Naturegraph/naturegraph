/**
 * MediaUploader — Sélection et prévisualisation de photos pour les contributions
 *
 * Fonctionnement :
 *   - Drag & drop ou sélection via bouton "parcourir"
 *   - Prévisualisation locale (URL.createObjectURL — nettoyée automatiquement)
 *   - Limite configurable (défaut : 4 photos)
 *   - Aucun upload réel — les File[] sont renvoyés au parent via onChange
 *
 * TODO [BACKEND] — Upload vers Supabase Storage :
 *   bucket 'post-media', policy RLS : authentifié seulement
 *   Utiliser supabase.storage.from('post-media').upload(path, file)
 *   Stocker l'URL publique dans media.url après upload réussi.
 */

import { useCallback, useRef, useState, useMemo, useEffect } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ─── Contraintes de sécurité sur les uploads ──────────────────────────────────
//
// Nicolas 2026-05-21 : on lève la contrainte stricte 10 Mo côté UI. Le pipeline
// `stripImageExif()` resize + ré-encode chaque photo pour viser ≤ 2 Mo en sortie,
// donc l'utilisateur peut envoyer un original lourd (boîtier reflex, RAW exporté)
// sans avoir à compresser lui-même. On garde un garde-fou très haut (50 Mo) pour
// bloquer les fichiers manifestement invalides (vidéo accidentelle, image 8K
// non-photographique) et protéger la mémoire navigateur lors du décodage canvas.

/** Garde-fou taille max par fichier : 50 Mo (protection mémoire + erreurs UX). */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

/**
 * Types MIME autorisés.
 * Note : la vérification `f.type.startsWith('image/')` était insuffisante car
 * un attaquant peut changer le MIME type côté client. On cible les formats
 * spécifiques attendus pour les observations nature (JPEG, PNG, WebP).
 *
 * HEIC/HEIF retiré le 2026-05-03 : l'EXIF stripping (stripImageExif) utilise
 * Canvas API qui ne supporte pas HEIC nativement → upload échouait sur iOS
 * (~50% des testeurs). iOS génère du JPEG quand l'app cible le refuse.
 */
// Nicolas 2026-05-22 : ajout HEIC / HEIF (iPhone par défaut). Sans ça, la 2ᵉ
// photo iOS arrivait parfois en HEIC et était rejetée silencieusement.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
])

/**
 * Valide un fichier avant ajout à la liste.
 * Retourne un message d'erreur localisé, ou null si le fichier est valide.
 * TODO [BACKEND] — Ajouter une vérification du "magic number" (en-têtes binaires)
 * côté serveur — le MIME type client peut être falsifié.
 */
function validateFile(file: File): string | null {
  // MIME vide tolérée (Android Chrome ancienne version) — on tente l'upload.
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return `Format non supporté : ${file.type}. Utilise JPEG, PNG, HEIC ou WebP.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `Fichier trop lourd : ${mb} Mo (max 50 Mo — Naturegraph compresse automatiquement, mais ce fichier dépasse notre limite navigateur).`
  }
  return null
}

interface MediaUploaderProps {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
  error?: string
}

/**
 * Génère des URLs de prévisualisation locales, nettoyées à chaque changement de fichiers.
 * Utilise useMemo (pas useEffect+setState) pour éviter un cycle de rendu inutile.
 * L'effet ne fait que le nettoyage des URLs révoquées quand les fichiers changent.
 */
function usePreviewUrls(files: File[]) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])

  // Nettoyage : révoquer les URLs blob quand la liste de fichiers change ou au démontage
  useEffect(() => {
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [urls])

  return urls
}

export function MediaUploader({ files, onChange, maxFiles = 4, error }: MediaUploaderProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const previewUrls = usePreviewUrls(files)

  const canAddMore = files.length < maxFiles

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return

    const errors: string[] = []
    const accepted: File[] = []
    const remaining = maxFiles - files.length

    Array.from(incoming).forEach((file) => {
      if (accepted.length >= remaining) return // Respecter la limite

      const validationError = validateFile(file)
      if (validationError) {
        errors.push(`${file.name} : ${validationError}`)
      } else {
        accepted.push(file)
      }
    })

    setValidationErrors(errors)
    if (accepted.length > 0) onChange([...files, ...accepted])
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, maxFiles],
  )

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-foreground">
        {t('contribute.media.label')}{' '}
        <span className="text-muted-foreground font-normal">
          ({t('contribute.media.maxFiles', { count: maxFiles })})
        </span>
      </span>

      {/* Zone de dépôt — masquée quand le max est atteint */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          aria-label={t('contribute.media.addPhotos')}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={[
            'flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            isDragging
              ? 'border-primary bg-primary-light/30'
              : 'border-border hover:border-primary/60 hover:bg-muted/30',
          ].join(' ')}
        >
          <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground text-center px-4">
            {t('contribute.media.dragDrop')}{' '}
            <span className="text-primary font-medium underline">
              {t('contribute.media.browse')}
            </span>
          </p>
        </div>
      )}

      {/* Input fichier caché — déclenché par le bouton visible */}
      {/* Nicolas 2026-05-22 : `accept="image/*"` pour laisser iOS Safari
          convertir HEIC en JPEG automatiquement (sinon 2ᵉ photo iPhone
          parfois bloquée silencieusement). */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Grille de prévisualisation */}
      {previewUrls.length > 0 && (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(previewUrls.length, 4)}, 1fr)` }}
        >
          {previewUrls.map((url, i) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden">
              <img src={url} alt="" className="size-full object-cover" width={120} height={120} />
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={t('contribute.media.remove', { index: i + 1 })}
                className="absolute top-1 right-1 size-6 rounded-full bg-foreground/70 text-cream-lighter flex items-center justify-center hover:bg-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Erreurs de validation fichier (format/taille) */}
      {validationErrors.length > 0 && (
        <ul role="alert" aria-live="polite" className="flex flex-col gap-1">
          {validationErrors.map((e, i) => (
            <li key={i} className="text-xs text-[var(--color-error)]">
              {e}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  )
}
