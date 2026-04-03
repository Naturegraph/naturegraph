/**
 * ProfileInspirations — Onglet "Inspirations" du profil
 *
 * Grille 2 colonnes de photos nature sauvegardées par l'utilisateur.
 * Chaque photo est cliquable (future lightbox).
 * État vide : hermine + message.
 *
 * Eco-conception : lazy loading sur toutes les images,
 * dimensions explicites pour éviter le layout shift.
 */

import { useTranslation } from 'react-i18next'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileInspirationsProps {
  /** URLs des photos d'inspiration */
  photos: string[]
  /** Username pour les labels d'accessibilité */
  username: string
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Galerie 2 colonnes des photos sauvegardées.
 * Hover : zoom léger (scale-105) pour signifier l'interactivité.
 */
export function ProfileInspirations({ photos, username }: ProfileInspirationsProps) {
  const { t } = useTranslation()

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
        <img
          src={hermineEmptyState}
          alt=""
          className="w-28 h-28 opacity-60"
          loading="lazy"
          width={112}
          height={112}
        />
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {t('profile.inspirations.empty')}
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4">
      {/* Grille 2 colonnes — largeur égale, ratio adaptatif */}
      <div
        className="grid grid-cols-2 gap-2"
        role="list"
        aria-label={`Inspirations de ${username}`}
      >
        {photos.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            aria-label={`Photo inspiration ${index + 1}`}
            className="relative aspect-square overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 group"
          >
            <img
              src={url}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              width={300}
              height={300}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
