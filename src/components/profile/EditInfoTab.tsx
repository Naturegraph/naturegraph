/**
 * EditInfoTab — Onglet "Informations" du panneau d'édition de profil
 *
 * Pixel-perfect Figma 6385:75440 (desktop) / 6385:73687 (mobile).
 * Champs Phase 1 :
 *   - Nom d'utilisateur (requis, état "rempli" en primary-light + border primary)
 *   - Présentation (textarea, 300 caractères max, fond background)
 *   - Mon objectif d'observations par semaine (number, helper italic)
 *
 * Phase 1 (Nicolas 2026-05-19) : la section "Réseaux sociaux" (Globe / Instagram /
 * Facebook) est temporairement retirée — les champs ne sont affichés nulle part
 * dans le produit pour le moment. Elle reviendra en Phase 2 quand la card About
 * du profil exposera les liens.
 *
 * Bouton "Sauvegarder les modifications" en bas, pleine largeur primary.
 *
 * TODO [BACKEND] — `useUpdateProfile()` mutation invalide la query du profil.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProfileDisplayData } from './ProfileHeader'
import {
  validateUsernameFormat,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from '@/lib/usernameValidation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditInfoTabProps {
  profile: ProfileDisplayData
  onSave: (data: Partial<ProfileDisplayData>) => void
  onClose: () => void
}

// ─── Styles partagés ──────────────────────────────────────────────────────────

/**
 * Classe d'input pill commune — utilisée par username + weekGoal.
 * État focus = bg-primary-light + border-primary + ring (Figma 6385:75440).
 */
const INPUT_PILL_CLASS =
  'w-full h-10 px-4 rounded-full border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary'

/**
 * Classe textarea — même esprit que INPUT_PILL_CLASS mais avec padding
 * vertical et coins moins arrondis (rounded-2xl).
 */
const TEXTAREA_CLASS =
  'w-full px-4 py-3 rounded-2xl border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none transition-colors focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary'

// ─── Composant principal ──────────────────────────────────────────────────────

export function EditInfoTab({ profile, onSave, onClose }: EditInfoTabProps) {
  const { t } = useTranslation()

  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [weekGoal, setWeekGoal] = useState(profile.weekProgress?.goal ?? 5)

  // Validation format du pseudo — mêmes règles qu'à l'onboarding via
  // lib/usernameValidation. Affiché en aria-live + bloque le submit.
  const trimmedUsername = username.trim()
  const formatError = trimmedUsername ? validateUsernameFormat(trimmedUsername) : null
  const isUsernameValid = !formatError && trimmedUsername.length >= USERNAME_MIN_LENGTH

  function handleSave() {
    if (!isUsernameValid) return
    onSave({
      username: trimmedUsername,
      bio: bio || null,
      weekProgress: { current: profile.weekProgress?.current ?? 0, goal: weekGoal },
    })
    onClose()
  }

  return (
    // Form HTML5 — l'attribut `id` permet au bouton "Sauvegarder" du footer
    // (rendu dans EditProfilePanel) d'être lié via `form="edit-info-form"`.
    // Pattern standard, propre, sans context ni ref.
    <form
      id="edit-info-form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
      className="flex flex-col gap-5 px-5 py-5"
    >
      {/* ── Username (requis) ──
          Style normal aligné avec les autres champs — l'état actif coloré
          (primary-light + border-primary) du Figma 6385:75440 était purement
          illustratif (pas un état permanent à appliquer par défaut). */}
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-username" className="text-sm font-medium text-foreground">
          {t('profile.edit.username', { defaultValue: "Nom d'utilisateur" })}
          <span aria-hidden="true" className="text-[var(--color-error)] ml-0.5">
            *
          </span>
        </label>
        <input
          id="edit-username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={USERNAME_MIN_LENGTH}
          maxLength={USERNAME_MAX_LENGTH}
          aria-invalid={formatError !== null}
          aria-describedby={formatError ? 'edit-username-error' : undefined}
          className={INPUT_PILL_CLASS}
        />
        {/* Helper règles + erreur de format — même langage que l'onboarding */}
        {formatError ? (
          <p id="edit-username-error" role="alert" className="text-xs text-[var(--color-error)]">
            {formatError === 'tooShort'
              ? t('profile.edit.usernameTooShort', {
                  defaultValue: 'Pseudo trop court (min {{min}} caractères)',
                  min: USERNAME_MIN_LENGTH,
                })
              : formatError === 'tooLong'
                ? t('profile.edit.usernameTooLong', {
                    defaultValue: 'Pseudo trop long (max {{max}} caractères)',
                    max: USERNAME_MAX_LENGTH,
                  })
                : t('profile.edit.usernameInvalid', {
                    defaultValue:
                      'Lettres, chiffres, « . » ou « _ » uniquement. Pas de doublons « .. » ou « __ ».',
                  })}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            {t('profile.edit.usernameHelper', {
              defaultValue: 'Lettres, chiffres, « . » et « _ » autorisés.',
            })}
          </p>
        )}
      </div>

      {/* ── Bio / Présentation ── */}
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-bio" className="text-sm font-medium text-foreground">
          {t('profile.edit.presentation', { defaultValue: 'Présentation' })}
        </label>
        <textarea
          id="edit-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={300}
          className={TEXTAREA_CLASS}
        />
      </div>

      {/* ── Objectif hebdomadaire ── */}
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-goal" className="text-sm font-medium text-foreground">
          {t('profile.edit.weekGoal', {
            defaultValue: "Mon objectif d'observations par semaine",
          })}
        </label>
        <input
          id="edit-goal"
          type="number"
          min={1}
          max={50}
          value={weekGoal}
          onChange={(e) => setWeekGoal(Number(e.target.value))}
          className={INPUT_PILL_CLASS}
        />
        {/* Helper italic — Figma : "Tu peux modifier cet objectif à tout moment." */}
        <p className="text-xs italic text-muted-foreground">
          {t('profile.edit.weekGoalHelper', {
            defaultValue: 'Tu peux modifier cet objectif à tout moment.',
          })}
        </p>
      </div>

      {/* Phase 1 : section "Réseaux sociaux" retirée temporairement —
          revient en Phase 2 quand ProfileAboutCard exposera les liens. */}

      {/* Le bouton "Sauvegarder les modifications" est rendu dans le footer
          fixe de EditProfilePanel (sticky bottom) — submit déclenché par
          l'attribut HTML `form="edit-info-form"`. */}
    </form>
  )
}
