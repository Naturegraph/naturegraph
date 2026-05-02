/**
 * EditInfoTab — Onglet "Informations" du panneau d'édition de profil
 *
 * Pixel-perfect Figma 6385:75440 (desktop) / 6385:73687 (mobile).
 * Champs :
 *   - Nom d'utilisateur (requis, état "rempli" en primary-light + border primary)
 *   - Présentation (textarea, 300 caractères max, fond background)
 *   - Mon objectif d'observations par semaine (number, helper italic)
 *   - Réseaux sociaux : 3 lignes (Globe / Instagram / Facebook)
 *     · icon container détaché à gauche
 *     · input pill au centre
 *     · bouton X clear à droite (visible si valeur)
 *
 * Bouton "Sauvegarder les modifications" en bas, pleine largeur primary.
 *
 * TODO [BACKEND] — `useUpdateProfile()` mutation invalide la query du profil.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Instagram, Facebook, X as XIcon } from 'lucide-react'
import type { ProfileDisplayData } from './ProfileHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditInfoTabProps {
  profile: ProfileDisplayData
  onSave: (data: Partial<ProfileDisplayData>) => void
  onClose: () => void
}

// ─── Styles partagés ──────────────────────────────────────────────────────────

/**
 * Classe d'input pill commune — utilisée par username, weekGoal, et la base
 * des inputs réseaux sociaux (qui ajoutent leur propre padding pour l'icône
 * et le bouton X).
 *
 * État focus = bg-primary-light + border-primary + ring (Figma 6385:75440 :
 * tous les champs partagent la même apparence active).
 */
const INPUT_PILL_CLASS =
  'w-full h-10 px-4 rounded-full border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary'

/**
 * Classe textarea — même esprit que INPUT_PILL_CLASS mais avec padding
 * vertical et coins moins arrondis (rounded-2xl).
 */
const TEXTAREA_CLASS =
  'w-full px-4 py-3 rounded-2xl border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none transition-colors focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary'

// ─── Sous-composant : ligne réseau social ─────────────────────────────────────

interface SocialInputProps {
  icon: React.ReactNode
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
  /** Label i18n pour le bouton X clear (ex: "Effacer le site web"). */
  clearLabel: string
}

/**
 * Ligne d'input réseau social — Figma 6385:73715.
 *   - Icon container 40×40 rounded-lg bordured à gauche (8px radius)
 *   - Input rounded-lg au centre (8px — Figma : moins arrondi que pill)
 *   - Bouton X clear à droite (apparaît si valeur saisie)
 *   - Aspect "input field" classique avec coins légers (Nicolas 2026-05-02 :
 *     "pas 100% arrondies ici pour les items mais 8px plus conforme").
 */
function SocialInput({
  icon,
  value,
  onChange,
  placeholder,
  ariaLabel,
  clearLabel,
}: SocialInputProps) {
  const hasValue = value.length > 0
  return (
    <div className="flex items-center gap-2">
      {/* Icon container détaché — rounded-lg (8px). */}
      <span
        aria-hidden="true"
        className="size-10 shrink-0 rounded-lg border-[0.5px] border-border bg-background flex items-center justify-center text-foreground"
      >
        {icon}
      </span>

      {/* Input field — même état actif (bg-primary-light + border-primary)
          que les autres champs, coins rounded-lg (8px) — Figma 6385:73715. */}
      <div className="relative flex-1">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="w-full h-10 pl-4 pr-10 rounded-lg border-[0.5px] border-border bg-background text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:bg-primary-light focus:border-primary focus:ring-2 focus:ring-primary"
        />
        {/* Bouton X clear — visible uniquement si valeur saisie */}
        {hasValue && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={clearLabel}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-full text-foreground hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function EditInfoTab({ profile, onSave, onClose }: EditInfoTabProps) {
  const { t } = useTranslation()

  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [weekGoal, setWeekGoal] = useState(profile.weekProgress?.goal ?? 5)
  // Pour les réseaux sociaux on stocke des URLs complètes (Figma) — l'affichage
  // dans la card About fera l'extraction du handle (cf. ProfileAboutCard).
  const [website, setWebsite] = useState(
    profile.website
      ? profile.website.startsWith('http')
        ? profile.website
        : `https://${profile.website}`
      : '',
  )
  const [instagram, setInstagram] = useState(
    profile.instagram ? `https://www.instagram.com/${profile.instagram}` : '',
  )
  // TODO [BACKEND] — Ajouter `facebook TEXT` dans la table `profiles` puis
  //   intégrer ici (`profile.facebook` + propagation dans handleSave).
  //   Pour l'instant l'input est saisi mais NON persisté — le state reste local.
  const [facebook, setFacebook] = useState('')

  function handleSave() {
    onSave({
      username,
      bio: bio || null,
      website: website || null,
      // On retire le préfixe instagram.com pour stocker juste le handle —
      // ProfileAboutCard reconstruit l'URL au rendu.
      instagram:
        instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') || null,
      // facebook: TODO [BACKEND] — pas dans le schéma actuel.
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
          className={INPUT_PILL_CLASS}
        />
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

      {/* ── Réseaux sociaux ── */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">
          {t('profile.edit.socialLinks', { defaultValue: 'Réseaux sociaux' })}
        </p>

        <SocialInput
          icon={<Globe className="size-4" aria-hidden="true" />}
          value={website}
          onChange={setWebsite}
          placeholder={t('profile.edit.websitePlaceholder', {
            defaultValue: 'https://www.example.fr',
          })}
          ariaLabel={t('profile.edit.websiteAria', { defaultValue: 'Site web' })}
          clearLabel={t('profile.edit.clearWebsite', {
            defaultValue: 'Effacer le site web',
          })}
        />

        <SocialInput
          icon={<Instagram className="size-4" aria-hidden="true" />}
          value={instagram}
          onChange={setInstagram}
          placeholder={t('profile.edit.instagramPlaceholder', {
            defaultValue: 'https://www.instagram.com/...',
          })}
          ariaLabel={t('profile.edit.instagramAria', { defaultValue: 'Instagram' })}
          clearLabel={t('profile.edit.clearInstagram', {
            defaultValue: 'Effacer le lien Instagram',
          })}
        />

        <SocialInput
          icon={<Facebook className="size-4" aria-hidden="true" />}
          value={facebook}
          onChange={setFacebook}
          placeholder={t('profile.edit.facebookPlaceholder', {
            defaultValue: 'https://www.facebook.com',
          })}
          ariaLabel={t('profile.edit.facebookAria', { defaultValue: 'Facebook' })}
          clearLabel={t('profile.edit.clearFacebook', {
            defaultValue: 'Effacer le lien Facebook',
          })}
        />
      </div>

      {/* Le bouton "Sauvegarder les modifications" est rendu dans le footer
          fixe de EditProfilePanel (sticky bottom) — submit déclenché par
          l'attribut HTML `form="edit-info-form"`. */}
    </form>
  )
}
