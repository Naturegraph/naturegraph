/**
 * EditPhotoTab — Onglet "Photo de profil" du panneau d'édition
 *
 * Pixel-perfect Figma 6385:76303 (desktop) / 6385:73995 (mobile, état "défaut").
 *
 * Comportement AUTO-SAVE (Nicolas 2026-05-02) :
 *   Pas de bouton "Sauvegarder les modifications" sur cet onglet — chaque
 *   action Changer / Supprimer est persistée immédiatement.
 *   → Pas de form HTML5 (pas de submit), pas de footer.
 *   → EditProfilePanel masque son footer quand activeTab === 'photo'.
 *
 * Structure (2 sections séparées par un bandeau cream) :
 *   1. Photo de profil : avatar circulaire 112×112 (à gauche) + boutons Changer
 *      / Supprimer stackés verticalement (à droite)
 *      → Format recommandé : 512 × 512 px (ratio 1:1)
 *   2. Bannière : preview 160×128 rounded-lg (à gauche) + boutons stackés
 *      → Format recommandé : 1200 × 400 px (ratio 3:1)
 *
 * État "défaut" (nouvel utilisateur sans avatar/banner) :
 *   - Avatar : hermine icon dans cercle border-primary + bg-primary-light
 *   - Banner : box vide bg-primary-light (lavande) sans image
 *
 * TODO [BACKEND] Phase 2 — voir second-agent/03-profil-backend-notes.md §8
 *   1. Créer 2 buckets Storage Supabase :
 *      - `avatars` (public read, owner write, max 1MB, MIME image/*)
 *      - `banners` (public read, owner write, max 2MB, MIME image/*)
 *   2. Service `storageService.uploadAvatar(file: File): Promise<string>`
 *      → renvoie URL publique après upload + compression côté client (WebP)
 *   3. Service `storageService.uploadBanner(file: File): Promise<string>`
 *   4. Validation MIME + taille côté Edge Function (sécurité vs JS bypass)
 *   5. Mutation `useUpdateProfile()` met à jour `profiles.avatar_url`/`banner_url`
 *      avec optimistic update (preview locale avant retour serveur).
 *   6. Suppression : DELETE storage object + UPDATE profiles SET avatar_url=null
 *   7. Génération de tailles multiples (thumbnail / medium / full) via Supabase
 *      Image Transformations OU pré-process Edge Function avec sharp.
 *   8. Toast feedback (succès / erreur) après chaque action auto-save.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { useToast } from '@/contexts/ToastContext'
import { uploadImage } from '@/services/storageService'
import { isSupabaseConfigured } from '@/lib/supabase'
import { sanitizeImageUrl } from '@/lib/sanitize'
import { compressPhoto } from '@/utils/compressPhoto'
import type { ProfileDisplayData } from './ProfileHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditPhotoTabProps {
  profile: ProfileDisplayData
  onSave: (data: Partial<ProfileDisplayData>) => void
  onClose: () => void
}

// ─── Sous-composants : boutons stackés ────────────────────────────────────────

interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  /** BATCH 9 / T-023 : etat upload (affiche spinner + disable). */
  uploading?: boolean
}

/**
 * Bouton "Changer" — primary, icône Pencil. Pleine largeur de la colonne.
 * Au clic, déclenche un input file caché géré par le parent.
 *
 * BATCH 9 / T-023 : prop `uploading` affiche Loader2 a la place de Pencil
 * + disable le bouton (evite double-clic). Motion-safe.
 */
function ChangeButton({ label, onClick, uploading = false }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={uploading}
      aria-busy={uploading}
      className="w-full inline-flex items-center justify-center gap-2 h-10 px-3 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {uploading ? (
        <Loader2 className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
      ) : (
        <Pencil className="size-4 shrink-0" aria-hidden="true" />
      )}
      {label}
    </button>
  )
}

/**
 * Bouton "Supprimer" — outlined, icône Trash. Disabled si pas de photo
 * custom à supprimer (pour éviter de "supprimer le défaut").
 */
function DeleteButton({ label, onClick, disabled }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-2 h-10 px-3 rounded-full bg-background border-[0.5px] border-border text-foreground text-sm font-bold hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-foreground"
    >
      <Trash2 className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

// `onClose` est dans le type pour rester homogène avec les autres tabs, mais
// l'auto-save ne ferme jamais le panel après un changement de photo.
export function EditPhotoTab({ profile, onSave }: EditPhotoTabProps) {
  const { t } = useTranslation()
  const toast = useToast()
  // `isUploading` — desormais consomme visuellement (BATCH 9 / T-023) :
  // les boutons "Changer" affichent un Loader2 motion-safe pendant l'upload,
  // sont disabled pour empecher le double-clic, et exposent aria-busy.
  const [isUploading, setIsUploading] = useState<'avatar' | 'banner' | null>(null)

  // État local des previews — synchronisé avec le profil entrant. Quand
  // l'utilisateur change/supprime, on update ce state ET on call onSave
  // immédiatement (auto-save). Le parent persiste via React Query.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [bannerUrl, setBannerUrl] = useState<string | null>(profile.banner_url)

  // Refs vers les inputs file cachés (un par section).
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Refs miroir des URLs — synchronisés via un effect (et non pendant le render
  // pour respecter React 19 strict mode). Permet au cleanup unmount d'accéder
  // à la valeur la plus récente sans relancer l'effect à chaque changement
  // (ce qui révoquerait l'URL active).
  const avatarUrlRef = useRef<string | null>(profile.avatar_url)
  const bannerUrlRef = useRef<string | null>(profile.banner_url)

  useEffect(() => {
    avatarUrlRef.current = avatarUrl
    bannerUrlRef.current = bannerUrl
  })

  // Cleanup des Blob URLs au démontage uniquement. Le cleanup intra-session
  // (changement / suppression) est déjà géré inline dans handleFileChange
  // / handleDelete via URL.revokeObjectURL.
  useEffect(() => {
    return () => {
      const a = avatarUrlRef.current
      const b = bannerUrlRef.current
      if (a?.startsWith('blob:')) URL.revokeObjectURL(a)
      if (b?.startsWith('blob:')) URL.revokeObjectURL(b)
    }
  }, [])

  /**
   * Handler générique upload d'un fichier image.
   *
   * Comportement :
   *   1. Validation MIME + taille côté client (feedback immédiat via toast).
   *   2. Preview locale via Blob URL (UI réactive avant upload réseau).
   *   3. Si Supabase configuré : upload réel vers `avatars` / `banners` puis
   *      persistance de l'URL publique via `onSave({ avatar_url | banner_url })`.
   *   4. Si Supabase non configuré (mode démo / dev) : on garde la Blob URL.
   *
   * Le bucket et les RLS Storage sont définis par la migration
   * `20260502_settings_phase2_complete.sql` + l'existant `avatars`.
   */
  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'avatar' | 'banner',
  ) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation côté client (MIME + taille).
    if (!file.type.startsWith('image/')) {
      toast.error(
        t('profile.edit.errorImageType', {
          defaultValue: 'Fichier non supporté — image attendue.',
        }),
      )
      return
    }
    const maxBytes = kind === 'avatar' ? 1_048_576 : 2_097_152 // 1 / 2 MB
    if (file.size > maxBytes) {
      toast.error(
        t('profile.edit.errorImageSize', {
          defaultValue: `Fichier trop volumineux (max ${maxBytes / 1e6} MB).`,
          maxMb: maxBytes / 1e6,
        }),
      )
      return
    }

    // Preview locale immédiate via Blob URL — UX réactive.
    const localUrl = URL.createObjectURL(file)
    if (kind === 'avatar') {
      if (avatarUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarUrl)
      setAvatarUrl(localUrl)
    } else {
      if (bannerUrl?.startsWith('blob:')) URL.revokeObjectURL(bannerUrl)
      setBannerUrl(localUrl)
    }

    // Upload réel vers Supabase Storage si configuré, sinon on garde la
    // Blob URL (mode dev / démo).
    if (!isSupabaseConfigured) {
      const fakeUrl = localUrl
      onSave(kind === 'avatar' ? { avatar_url: fakeUrl } : { banner_url: fakeUrl })
      return
    }

    setIsUploading(kind)
    try {
      const bucket = kind === 'avatar' ? 'avatars' : 'banners'
      // BATCH 16 / T-075 : compression client avant upload (eco-conception).
      // Avatars : 1024px max ; banners : 2560px max (TIER_FREE default).
      // Reduit storage 50-80% et accelere l'upload sur connexions mobiles.
      const compressed = await compressPhoto(file, {
        maxDimension: kind === 'avatar' ? 1024 : 2560,
      })
      const { publicUrl } = await uploadImage(bucket, compressed)
      // Remplace la Blob URL par l'URL Supabase persistée.
      if (kind === 'avatar') {
        if (avatarUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarUrl)
        setAvatarUrl(publicUrl)
        onSave({ avatar_url: publicUrl })
      } else {
        if (bannerUrl?.startsWith('blob:')) URL.revokeObjectURL(bannerUrl)
        setBannerUrl(publicUrl)
        onSave({ banner_url: publicUrl })
      }
    } catch (err) {
      console.error('[EditPhotoTab] upload failed', err)
      toast.error(
        t('profile.edit.uploadError', {
          defaultValue: "Impossible d'envoyer l'image pour l'instant.",
        }),
        err instanceof Error ? err.message : undefined,
      )
    } finally {
      setIsUploading(null)
    }

    // Reset input pour permettre de re-sélectionner le même fichier juste après.
    e.target.value = ''
  }

  /** Suppression : reset state + propage `null` au parent. */
  function handleDelete(kind: 'avatar' | 'banner') {
    if (kind === 'avatar') {
      if (avatarUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarUrl)
      setAvatarUrl(null)
      onSave({ avatar_url: null })
    } else {
      if (bannerUrl?.startsWith('blob:')) URL.revokeObjectURL(bannerUrl)
      setBannerUrl(null)
      onSave({ banner_url: null })
    }
  }

  const hasCustomAvatar = !!avatarUrl
  const hasCustomBanner = !!bannerUrl

  return (
    // Pas de form ici — l'onglet auto-save chaque action sans validation
    // explicite (pas de bouton Sauvegarder dans le footer pour ce tab).
    <div className="flex flex-col gap-6 px-5 py-5">
      {/* Inputs file cachés — déclenchés par les boutons Changer. */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'avatar')}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'banner')}
      />

      {/* ── Section Photo de profil ── */}
      <section className="flex flex-col gap-3">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('profile.edit.photoAvatar', { defaultValue: 'Photo de profil' })}
        </h3>

        <div className="flex items-center justify-between gap-4">
          {/* Avatar 112×112 — l'image (hermine par défaut ou photo custom) remplit
              entièrement le cercle (size-full object-cover) pour un rendu cohérent
              avec ProfileHeader et plus visuel (Nicolas 2026-05-19 : pas de padding
              autour de la hermine dans l'éditeur, cela rendait l'aperçu petit). */}
          <div
            className={`size-28 rounded-full overflow-hidden shrink-0 ${
              hasCustomAvatar
                ? 'bg-cream-lighter border-[0.5px] border-border'
                : 'bg-primary-light border-2 border-primary'
            }`}
          >
            <img
              src={sanitizeImageUrl(avatarUrl) ?? hermineIcon}
              alt={t('profile.edit.avatarAlt', { defaultValue: 'Photo de profil actuelle' })}
              className="size-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="flex flex-col gap-2 w-40 shrink-0">
            <ChangeButton
              label={t('profile.edit.change', { defaultValue: 'Changer' })}
              onClick={() => avatarInputRef.current?.click()}
              uploading={isUploading === 'avatar'}
            />
            <DeleteButton
              label={t('profile.edit.delete', { defaultValue: 'Supprimer' })}
              onClick={() => handleDelete('avatar')}
              disabled={!hasCustomAvatar || isUploading === 'avatar'}
            />
          </div>
        </div>

        <p className="text-xs italic text-muted-foreground">
          {t('profile.edit.photoAvatarHint', {
            defaultValue: 'Format recommandé : 512 × 512 px (ratio 1:1)',
          })}
        </p>
      </section>

      {/* Séparateur de section — 4px solid border edge-to-edge.
          Reproduit exactement le séparateur entre 2 FeedPost sur mobile
          (cf. FeedPost.tsx ligne 293 : `border-b-4 border-border`). */}
      <div className="-mx-5 h-1 bg-border" aria-hidden="true" />

      {/* ── Section Bannière ── */}
      <section className="flex flex-col gap-3">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('profile.edit.photoBanner', { defaultValue: 'Bannière' })}
        </h3>

        <div className="flex items-center justify-between gap-4">
          <div
            className={`w-40 h-32 rounded-lg overflow-hidden shrink-0 ${
              hasCustomBanner
                ? 'border-[0.5px] border-border'
                : 'bg-primary-light border-[0.5px] border-border'
            }`}
          >
            {sanitizeImageUrl(bannerUrl) && (
              <img
                src={sanitizeImageUrl(bannerUrl)!}
                alt={t('profile.edit.bannerAlt', { defaultValue: 'Bannière actuelle' })}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </div>

          <div className="flex flex-col gap-2 w-40 shrink-0">
            <ChangeButton
              label={t('profile.edit.change', { defaultValue: 'Changer' })}
              onClick={() => bannerInputRef.current?.click()}
              uploading={isUploading === 'banner'}
            />
            <DeleteButton
              label={t('profile.edit.delete', { defaultValue: 'Supprimer' })}
              onClick={() => handleDelete('banner')}
              disabled={!hasCustomBanner || isUploading === 'banner'}
            />
          </div>
        </div>

        <p className="text-xs italic text-muted-foreground">
          {t('profile.edit.photoBannerHint', {
            defaultValue: 'Format recommandé : 1200 × 400 px (ratio 3:1)',
          })}
        </p>
      </section>
    </div>
  )
}
