/**
 * EditInfoTab — Onglet "Informations" du panneau d'édition de profil
 *
 * Pixel-perfect Figma 6385:75440 (desktop) / 6385:73687 (mobile).
 * Champs Phase 1 :
 *   - Nom d'utilisateur (requis, état "rempli" en primary-light + border primary)
 *   - Présentation (textarea, 300 caractères max, fond background)
 *   - Mon objectif d'observations par semaine (number, helper italic)
 *
 * Nicolas 2026-05-22 — Refacto save :
 *   La sauvegarde s'effectue désormais via `useImperativeHandle` exposé sur
 *   une ref forwardée par le composant. Le footer "Sauvegarder" de
 *   `EditProfilePanel` appelle directement `ref.current.save()` au lieu de
 *   passer par l'attribut HTML5 `form="..."` qui était instable en prod
 *   (Safari iOS notamment).
 */

import { forwardRef, useImperativeHandle, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProfileDisplayData } from './ProfileHeader'
import {
  validateUsernameFormat,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from '@/lib/usernameValidation'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditTabHandle {
  /** Appelé par le footer "Sauvegarder" du panel. Retourne true si la
   *  sauvegarde a été déclenchée, false en cas de validation échouée. */
  save: () => boolean
}

interface EditInfoTabProps {
  profile: ProfileDisplayData
  onSave: (data: Partial<ProfileDisplayData>) => void
  onClose: () => void
}

// ─── Styles partagés ──────────────────────────────────────────────────────────

const INPUT_PILL_CLASS =
  'w-full h-10 px-4 rounded-full border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary'

const TEXTAREA_CLASS =
  'w-full px-4 py-3 rounded-2xl border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none transition-colors focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary'

// ─── Composant principal ──────────────────────────────────────────────────────

export const EditInfoTab = forwardRef<EditTabHandle, EditInfoTabProps>(function EditInfoTab(
  { profile, onSave, onClose },
  ref,
) {
  const { t } = useTranslation()

  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [weekGoal, setWeekGoal] = useState<number>(profile.weekProgress?.goal ?? 5)
  // `weekGoalInput` permet à l'utilisateur de vider l'input pour taper
  // un nombre — sans ça type="number" + Number('') = NaN bloquait la saisie.
  const [weekGoalInput, setWeekGoalInput] = useState<string>(
    String(profile.weekProgress?.goal ?? 5),
  )

  const trimmedUsername = username.trim()
  const formatError = trimmedUsername ? validateUsernameFormat(trimmedUsername) : null
  const isUsernameValid = !formatError && trimmedUsername.length >= USERNAME_MIN_LENGTH

  // Expose `save()` au parent via la ref forwardée.
  useImperativeHandle(
    ref,
    () => ({
      save() {
        if (!isUsernameValid) return false
        onSave({
          username: trimmedUsername,
          bio: bio || null,
          weekProgress: {
            current: profile.weekProgress?.current ?? 0,
            goal: weekGoal,
          },
        })
        onClose()
        return true
      },
    }),
    [
      isUsernameValid,
      trimmedUsername,
      bio,
      weekGoal,
      profile.weekProgress?.current,
      onSave,
      onClose,
    ],
  )

  function handleWeekGoalChange(raw: string) {
    setWeekGoalInput(raw)
    if (raw === '') return // user vide pour retaper
    const n = Number(raw)
    if (!Number.isNaN(n) && n >= 1 && n <= 50) setWeekGoal(n)
  }

  return (
    <div className="flex flex-col gap-5 px-5 py-5">
      {/* ── Username (requis) ── */}
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

      {/* ── Objectif hebdomadaire — saisie libre 1-50 ── */}
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-goal" className="text-sm font-medium text-foreground">
          {t('profile.edit.weekGoal', {
            defaultValue: "Mon objectif d'observations par semaine",
          })}
        </label>
        <input
          id="edit-goal"
          // type=number garde le clavier numérique mobile, inputMode='numeric'
          // évite les caractères non-chiffres. Saisie libre via weekGoalInput.
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          value={weekGoalInput}
          onChange={(e) => handleWeekGoalChange(e.target.value)}
          onBlur={() => {
            // Au blur, si l'input est vide, on retombe sur le dernier
            // weekGoal valide pour garder un état cohérent.
            if (weekGoalInput === '') setWeekGoalInput(String(weekGoal))
          }}
          className={INPUT_PILL_CLASS}
        />
        <p className="text-xs italic text-muted-foreground">
          {t('profile.edit.weekGoalHelper', {
            defaultValue: 'Tu peux modifier cet objectif à tout moment.',
          })}
        </p>
      </div>
    </div>
  )
})
