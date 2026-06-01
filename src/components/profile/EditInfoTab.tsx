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
import { Facebook, Globe, Instagram } from 'lucide-react'
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
  // NG-011 (Nicolas 2026-05-31) : 3 liens limites au scope beta final.
  // Instagram, Facebook, site web. Twitter retire (peu d usage naturaliste).
  // iNat / YouTube etc. viendront en V1.2.0 si la beta en fait la demande.
  const [instagram, setInstagram] = useState(profile.instagram ?? '')
  const [facebook, setFacebook] = useState(profile.facebook ?? '')
  const [website, setWebsite] = useState(profile.website ?? '')
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
        // Nettoyage @ prefix sur handles (Instagram / Twitter) au cas ou l user
        // l a colle. Trim systematique.
        const cleanHandle = (s: string) => s.trim().replace(/^@+/, '')
        onSave({
          username: trimmedUsername,
          bio: bio || null,
          instagram: cleanHandle(instagram) || null,
          facebook: cleanHandle(facebook) || null,
          website: website.trim() || null,
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
      instagram,
      facebook,
      website,
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

      {/* ── NG-011 Reseaux sociaux et lien externe ──
          Scope V1.1.3 : Instagram, Twitter (X), site web. Limite intentionnelle
          a 3 reseaux les plus courants pour les naturalistes / photographes.
          On enrichira (iNaturalist, YouTube, etc.) en V1.2.0 si la beta le
          demande (Nicolas 2026-05-31). */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">
          {t('profile.edit.socialsTitle', { defaultValue: 'Reseaux sociaux et lien externe' })}
        </p>

        {/* Instagram - sans @, on le retire au save si l user le tape */}
        <div className="flex items-center gap-2">
          <Instagram className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder={t('profile.edit.instagramPlaceholder', { defaultValue: 'ton_pseudo' })}
            maxLength={30}
            aria-label="Instagram"
            className={INPUT_PILL_CLASS}
          />
        </div>

        {/* Facebook - handle apres facebook.com/ */}
        <div className="flex items-center gap-2">
          <Facebook className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder={t('profile.edit.facebookPlaceholder', { defaultValue: 'ton_pseudo' })}
            maxLength={50}
            aria-label="Facebook"
            className={INPUT_PILL_CLASS}
          />
        </div>

        {/* Site personnel - URL complete */}
        <div className="flex items-center gap-2">
          <Globe className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={t('profile.edit.websitePlaceholder', {
              defaultValue: 'https://mon-site.fr',
            })}
            maxLength={200}
            aria-label={t('profile.edit.website', { defaultValue: 'Site web' })}
            className={INPUT_PILL_CLASS}
          />
        </div>

        <p className="text-xs italic text-muted-foreground">
          {t('profile.edit.socialsHelper', {
            defaultValue: 'Optionnel. Visible publiquement sur ton profil.',
          })}
        </p>
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
