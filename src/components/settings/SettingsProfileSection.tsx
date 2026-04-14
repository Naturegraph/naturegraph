/**
 * SettingsProfileSection — Section "Profil" de la page Parametres
 *
 * Permet la modification de : avatar, nom, prenom, username, bio,
 * localisation, centres d'interets et reseaux sociaux.
 * Les changements restent en etat local jusqu'a validation.
 */

import { useTranslation } from 'react-i18next'
import { Camera, Instagram, Globe, AtSign } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import type { Interest } from '@/types/database'
import { INTEREST_LABELS } from '@/constants/interests'

/** Liste ordonnee des centres d'interet disponibles */
const ALL_INTERESTS: Interest[] = [
  'birds',
  'mammals',
  'insects',
  'amphibians',
  'reptiles',
  'arachnids',
  'mollusks',
  'fish',
  'plants',
  'other',
]

/** Limite de caracteres pour la bio */
const BIO_MAX_LENGTH = 160

interface SettingsProfileSectionProps {
  avatarUrl: string | null
  firstName: string
  lastName: string
  username: string
  bio: string
  city: string
  region: string
  interests: Interest[]
  instagram: string
  twitter: string
  website: string
  onFieldChange: (field: string, value: string | Interest[]) => void
  onSave: () => void
}

/**
 * Formulaire d'edition du profil utilisateur.
 * Gere l'avatar, les infos personnelles, la localisation,
 * les centres d'interet (chips multi-select) et les reseaux sociaux.
 */
export function SettingsProfileSection({
  avatarUrl,
  firstName,
  lastName,
  username,
  bio,
  city,
  region,
  interests,
  instagram,
  twitter,
  website,
  onFieldChange,
  onSave,
}: SettingsProfileSectionProps) {
  const { t } = useTranslation()

  /** Bascule un interet dans la liste de selection */
  function toggleInterest(interest: Interest) {
    const updated = interests.includes(interest)
      ? interests.filter((i) => i !== interest)
      : [...interests, interest]
    onFieldChange('interests', updated)
  }

  return (
    <section
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-card p-5 space-y-5"
      aria-labelledby="settings-profile-heading"
    >
      <h2
        id="settings-profile-heading"
        className="text-lg font-semibold text-[var(--color-text-primary)]"
      >
        {t('settings.profileSection', 'Profil')}
      </h2>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[var(--color-background-alt)] shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={t('settings.avatarAlt', 'Photo de profil')}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
              <Camera className="w-6 h-6" aria-hidden="true" />
            </div>
          )}
        </div>
        <button
          type="button"
          className="text-sm font-medium text-[var(--color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2 rounded"
          onClick={() => {
            // TODO [BACKEND] — Ouvrir le picker d'image et uploader vers Supabase Storage
          }}
        >
          {t('settings.changePhoto', 'Changer la photo')}
        </button>
      </div>

      {/* Prenom + Nom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('settings.firstName', 'Prenom')}
          value={firstName}
          onChange={(e) => onFieldChange('firstName', e.target.value)}
        />
        <Input
          label={t('settings.lastName', 'Nom')}
          value={lastName}
          onChange={(e) => onFieldChange('lastName', e.target.value)}
        />
      </div>

      {/* Username */}
      <Input
        label={t('settings.username', "Nom d'utilisateur")}
        value={username}
        onChange={(e) => onFieldChange('username', e.target.value)}
      />

      {/* Bio avec compteur */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="settings-bio"
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          {t('settings.bio', 'Bio')}
        </label>
        <textarea
          id="settings-bio"
          value={bio}
          maxLength={BIO_MAX_LENGTH}
          rows={3}
          onChange={(e) => onFieldChange('bio', e.target.value)}
          className="w-full px-3 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg transition-colors duration-200 placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
          placeholder={t('settings.bioPlaceholder', 'Parle-nous de toi...')}
        />
        <p className="text-xs text-[var(--color-text-tertiary)] text-right" aria-live="polite">
          {bio.length}/{BIO_MAX_LENGTH}
        </p>
      </div>

      {/* Localisation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('settings.city', 'Ville')}
          value={city}
          onChange={(e) => onFieldChange('city', e.target.value)}
        />
        <Input
          label={t('settings.region', 'Region')}
          value={region}
          onChange={(e) => onFieldChange('region', e.target.value)}
        />
      </div>

      {/* Centres d'interet — chips multi-select */}
      <fieldset>
        <legend className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
          {t('settings.interests', "Centres d'interets")}
        </legend>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t('settings.interests', "Centres d'interets")}
        >
          {ALL_INTERESTS.map((interest) => {
            const isSelected = interests.includes(interest)
            return (
              <button
                key={interest}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2 ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                }`}
              >
                {INTEREST_LABELS[interest] ?? interest}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Reseaux sociaux */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {t('settings.socialLinks', 'Reseaux sociaux')}
        </p>
        <div className="relative">
          <Instagram
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={instagram}
            onChange={(e) => onFieldChange('instagram', e.target.value)}
            placeholder="instagram"
            aria-label="Instagram"
            className="w-full pl-10 pr-3 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
        <div className="relative">
          <AtSign
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={twitter}
            onChange={(e) => onFieldChange('twitter', e.target.value)}
            placeholder="twitter / X"
            aria-label="Twitter / X"
            className="w-full pl-10 pr-3 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Globe
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]"
            aria-hidden="true"
          />
          <input
            type="url"
            value={website}
            onChange={(e) => onFieldChange('website', e.target.value)}
            placeholder="https://..."
            aria-label={t('settings.website', 'Site web')}
            className="w-full pl-10 pr-3 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Bouton enregistrer */}
      <button
        type="button"
        onClick={onSave}
        className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-button hover:opacity-90 transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2"
      >
        {t('common.save', 'Enregistrer')}
      </button>
    </section>
  )
}
