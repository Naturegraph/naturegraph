/**
 * EditPrefsTab — Onglet "Préférences" du panneau d'édition de profil
 *
 * Grille 2 colonnes de tuiles d'intérêt sélectionnables (max 3).
 * Badge numéroté (1, 2, 3) sur les tuiles sélectionnées.
 * Fond teal/violet selon l'état sélectionné.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProfileDisplayData } from './ProfileHeader'
import { INTEREST_CONFIG } from '@/constants/interests'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditPrefsTabProps {
  profile: ProfileDisplayData
  onSave: (data: Partial<ProfileDisplayData>) => void
  onClose: () => void
}

// ─── Sous-composant : tuile d'intérêt ────────────────────────────────────────

interface InterestTileProps {
  id: string
  emoji: string
  label: string
  isSelected: boolean
  selectionIndex: number | null
  onClick: () => void
}

/** Tuile sélectionnable pour les centres d'intérêt */
function InterestTile({
  id,
  emoji,
  label,
  isSelected,
  selectionIndex,
  onClick,
}: InterestTileProps) {
  return (
    <button
      key={id}
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        isSelected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-cream-lighter text-foreground hover:border-primary/40'
      }`}
    >
      {/* Badge numéroté (1, 2, 3) quand sélectionné */}
      {isSelected && selectionIndex !== null && (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 size-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold"
        >
          {selectionIndex + 1}
        </span>
      )}
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
    </button>
  )
}

// ─── Composant ────────────────────────────────────────────────────────────────

/** Sélecteur de centres d'intérêt — max 3 */
export function EditPrefsTab({ profile, onSave, onClose }: EditPrefsTabProps) {
  const { t } = useTranslation()

  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    profile.interests.map((i) => i.id).slice(0, 3),
  )

  /** Bascule un intérêt (ajoute ou retire, max 3) */
  function toggleInterest(id: string) {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  function handleSave() {
    onSave({
      interests: selectedInterests.map((id, i) => ({
        id,
        // Répartition approximative : 50% / 35% / 15%
        percent: i === 0 ? 50 : i === 1 ? 35 : 15,
      })),
    })
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Titre + sous-titre */}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">
          {t('profile.edit.interestsTitle')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('profile.edit.interestsSubtitle')}</p>
      </div>

      {/* Compteur */}
      <p className="text-xs text-muted-foreground">{selectedInterests.length} / 3 sélectionnés</p>

      {/* Grille 2 colonnes */}
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Centres d'intérêt">
        {Object.entries(INTEREST_CONFIG).map(([id, { label, emoji }]) => {
          const selectionIndex = selectedInterests.indexOf(id)
          return (
            <InterestTile
              key={id}
              id={id}
              emoji={emoji}
              label={label}
              isSelected={selectionIndex !== -1}
              selectionIndex={selectionIndex !== -1 ? selectionIndex : null}
              onClick={() => toggleInterest(id)}
            />
          )
        })}
      </div>

      {/* Sauvegarder */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full h-12 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {t('profile.edit.save')}
      </button>
    </div>
  )
}
