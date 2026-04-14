/**
 * EditPhotoTab — Onglet "Photo de profil" du panneau d'édition de profil
 *
 * Deux sections :
 *  1. Avatar : prévisualisation circulaire + boutons Changer / Supprimer
 *  2. Bannière : prévisualisation rectangulaire + boutons Changer / Supprimer
 *
 * Les upload sont des stubs — TODO [BACKEND] storageService.uploadAvatar()
 */

import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'
import type { ProfileDisplayData } from './ProfileHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditPhotoTabProps {
  profile: ProfileDisplayData
  onSave: (data: Partial<ProfileDisplayData>) => void
  onClose: () => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

/** Gestion de l'avatar et de la bannière du profil */
export function EditPhotoTab({ profile }: EditPhotoTabProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* ── Section Avatar ── */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">{t('profile.edit.photoAvatar')}</p>

        <div className="flex items-center gap-4">
          {/* Prévisualisation avatar */}
          <div className="size-20 rounded-full overflow-hidden bg-primary-light border-2 border-border shrink-0">
            <img
              src={profile.avatar_url ?? hermineIcon}
              alt="Profil actuel"
              className="size-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              {t('profile.edit.change')}
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {t('profile.edit.delete')}
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{t('profile.edit.photoAvatarHint')}</p>
      </div>

      {/* Séparateur */}
      <div className="h-px bg-border" aria-hidden="true" />

      {/* ── Section Bannière ── */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">{t('profile.edit.photoBanner')}</p>

        {/* Prévisualisation bannière */}
        <div className="h-24 rounded-xl overflow-hidden bg-[var(--color-action-light)] border border-border">
          {profile.banner_url && (
            <img
              src={profile.banner_url}
              alt="Bannière actuelle"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            {t('profile.edit.change')}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            {t('profile.edit.delete')}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">{t('profile.edit.photoBannerHint')}</p>
      </div>
    </div>
  )
}
