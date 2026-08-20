/**
 * EditPrefsTab : Onglet "Préférences" du panneau d'édition de profil
 *
 * Pixel-perfect Figma 6385:75887 (desktop) / 6385:73873 (mobile).
 *   - Titre H3 "Quels sont tes centres d'intérêt ?" (font-title bold)
 *   - Sous-titre muted "Choisis jusqu'à 3 centres d'intérêts maximum…"
 *   - Grille 2 colonnes de tuiles avec emoji top + label bottom
 *   - Tuiles sélectionnées : bg-primary-light + border-primary + label primary
 *     + badge numéroté (1, 2, 3) en haut-droite (cercle primary)
 *   - Tuiles non sélectionnées : bg-background + border 0.5px
 *   - Pas de compteur "X/3" : Figma ne le montre pas
 *
 * Sauvegarde : orchestrée par le parent (Profile.tsx) via `useUpdateProfile`
 * (mutation qui met à jour le profil et invalide la query).
 */

import { forwardRef, useImperativeHandle, useState } from 'react'
import type { EditTabHandle } from './EditInfoTab'
import { useTranslation } from 'react-i18next'
import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'
import type { ProfileDisplayData } from './ProfileHeader'

// ─── Données ──────────────────────────────────────────────────────────────────
//
// Liste alignée 1:1 avec OnboardingInterests pour cohérence DS :
//   - Même ORDRE (birds → reptiles → amphibians, pas l'inverse)
//   - Même SOURCE pour les emojis : CATEGORY_EMOJIS (badgeHelpers).
//     Évite les duplications d'emojis (avec/sans variation selector U+FE0F)
//     entre INTEREST_CONFIG et CATEGORY_EMOJIS qui causaient des incohérences
//     de rendu (Nicolas 2026-05-02).
//   - Labels via i18n `onboarding.interests.categories.{id}` partagés.

const INTERESTS = [
  { id: 'birds', emoji: CATEGORY_EMOJIS.birds },
  { id: 'mammals', emoji: CATEGORY_EMOJIS.mammals },
  { id: 'insects', emoji: CATEGORY_EMOJIS.insects },
  { id: 'reptiles', emoji: CATEGORY_EMOJIS.reptiles },
  { id: 'amphibians', emoji: CATEGORY_EMOJIS.amphibians },
  { id: 'arachnids', emoji: CATEGORY_EMOJIS.arachnids },
  { id: 'mollusks', emoji: CATEGORY_EMOJIS.mollusks },
  { id: 'fish', emoji: CATEGORY_EMOJIS.fish },
  { id: 'plants', emoji: CATEGORY_EMOJIS.plants },
] as const

/** Union typée des IDs d'intérêts : dérivée du `as const` ci-dessus. */
type InterestId = (typeof INTERESTS)[number]['id']

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditPrefsTabProps {
  profile: ProfileDisplayData
  onSave: (data: Partial<ProfileDisplayData>) => void
  onClose: () => void
}

// ─── Sous-composant : tuile d'intérêt ────────────────────────────────────────

interface InterestTileProps {
  emoji: string
  label: string
  isSelected: boolean
  selectionIndex: number | null
  onClick: () => void
}

/**
 * Tuile sélectionnable : Figma Frame 4251 (6385:75904) :
 *   - h-[104px], padding 16px, gap 8px, rounded-xl (12px)
 *   - Border 1px (PAS 2px), même épaisseur sélectionné/non-sélectionné
 *   - Sélectionné : bg #E7E9F7 (action-light) + border #5F5DD8 (action-default)
 *   - Emoji : 32px Quicksand bold (Title/H3)
 *   - Label : 16px Mulish bold, color action-default si sélectionné
 *   - Badge top-right 20×20 rounded-full, bg #FFFDF8 (neutral primary cream),
 *     "N" en 12px regular foreground, letter-spacing 0.04em
 */
function InterestTile({ emoji, label, isSelected, selectionIndex, onClick }: InterestTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={[
        // rounded-md = 12px dans le DS Naturegraph (cf. index.css --radius-md).
        // ATTENTION : rounded-xl = 32px dans ce projet, NE PAS confondre avec
        // le default Tailwind où rounded-xl = 12px.
        'relative flex flex-col gap-2 items-center justify-center p-4 rounded-md h-[104px]',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2',
        // Border 1px dans les 2 états (pas 2px sélectionné).
        isSelected
          ? 'bg-[var(--color-action-light)] border border-[var(--color-action-default)] motion-safe:hover:shadow-md motion-safe:active:scale-95'
          : 'bg-transparent border border-[var(--color-border)] motion-safe:hover:shadow-md motion-safe:active:scale-95',
      ].join(' ')}
    >
      {/* Badge numéroté : Figma : 20×20 cercle bg cream/neutral-primary,
          texte foreground regular 12px (pas blanc, pas bold). */}
      {isSelected && selectionIndex !== null && (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--color-bg-primary)] text-foreground text-xs font-normal flex items-center justify-center leading-none tracking-[0.04em]"
        >
          {selectionIndex + 1}
        </span>
      )}
      {/* Emoji : 32px Quicksand bold (Title/H3 token Figma). */}
      <span className="font-title font-bold text-[32px] leading-[120%]" aria-hidden="true">
        {emoji}
      </span>
      {/* Label : Figma Frame 4243 :
          - Sélectionné : 16px Mulish BOLD (Paragraph/Bold) + color action-default
          - Non sélectionné : 16px Mulish REGULAR (Paragraph/Base) + foreground */}
      <span
        className={[
          'font-body text-base leading-[150%]',
          isSelected
            ? 'font-bold text-[var(--color-link)]'
            : 'font-normal text-[var(--color-text-primary)]',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

/** Sélecteur de centres d'intérêt : max 3 */
export const EditPrefsTab = forwardRef<EditTabHandle, EditPrefsTabProps>(function EditPrefsTab(
  { profile, onSave, onClose },
  ref,
) {
  const { t } = useTranslation()

  const [selectedInterests, setSelectedInterests] = useState<InterestId[]>(
    profile.interests.map((i) => i.id as InterestId).slice(0, 3),
  )

  /** Bascule un intérêt (ajoute ou retire, max 3) */
  function toggleInterest(id: InterestId) {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  // Expose save() au parent via ref forwardée : même pattern que EditInfoTab.
  useImperativeHandle(
    ref,
    () => ({
      save() {
        onSave({
          interests: selectedInterests.map((id, i) => ({
            id,
            // Répartition approximative : 50% / 35% / 15%
            percent: i === 0 ? 50 : i === 1 ? 35 : 15,
          })),
        })
        onClose()
        return true
      },
    }),
    [selectedInterests, onSave, onClose],
  )

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      {/* ── Titre + sous-titre ── Figma 6385:75887.
          Titre Quicksand bold 18px (text-lg), sous-titre muted text-sm. */}
      <div className="flex flex-col gap-1.5">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('profile.edit.interestsTitle', {
            defaultValue: "Quels sont tes centres d'intérêt ?",
          })}
        </h3>
        <p className="text-sm text-muted-foreground leading-snug">
          {t('profile.edit.interestsSubtitle', {
            defaultValue:
              "Choisis jusqu'à 3 centres d'intérêts maximum que les autres pourront voir.",
          })}
        </p>
      </div>

      {/* ── Grille 2 colonnes (Nicolas 2026-05-19 : cohérence avec le reste
           du design system : onboarding et autres sélecteurs sont en 2 cols
           dès le mobile). */}
      <div
        className="grid grid-cols-2 gap-2"
        role="group"
        aria-label={t('profile.edit.interestsTitle', {
          defaultValue: "Centres d'intérêt",
        })}
      >
        {INTERESTS.map(({ id, emoji }) => {
          const selectionIndex = selectedInterests.indexOf(id)
          return (
            <InterestTile
              key={id}
              emoji={emoji}
              // Labels via la même clé i18n que l'onboarding pour cohérence.
              label={t(`onboarding.interests.categories.${id}`)}
              isSelected={selectionIndex !== -1}
              selectionIndex={selectionIndex !== -1 ? selectionIndex : null}
              onClick={() => toggleInterest(id)}
            />
          )
        })}
      </div>
      {/* Bouton Sauvegarder rendu dans le footer du panel. */}
    </div>
  )
})
