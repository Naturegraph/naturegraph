/**
 * EditInfoTab — Onglet "Informations" du panneau d'édition de profil
 *
 * Champs : username, bio (présentation), objectif hebdomadaire,
 * liens sociaux (site, instagram, facebook).
 * Bouton "Sauvegarder" en bas.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Instagram, Facebook } from 'lucide-react'
import type { ProfileDisplayData } from './ProfileHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditInfoTabProps {
  profile: ProfileDisplayData
  onSave: (data: Partial<ProfileDisplayData>) => void
  onClose: () => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

/** Formulaire d'édition des informations textuelles du profil */
export function EditInfoTab({ profile, onSave, onClose }: EditInfoTabProps) {
  const { t } = useTranslation()

  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [weekGoal, setWeekGoal] = useState(profile.weekProgress?.goal ?? 5)
  const [website, setWebsite] = useState(profile.website ?? '')
  const [instagram, setInstagram] = useState(profile.instagram ?? '')
  const [facebook, setFacebook] = useState('')

  function handleSave() {
    onSave({
      username,
      bio: bio || null,
      website: website || null,
      instagram: instagram || null,
      weekProgress: { current: profile.weekProgress?.current ?? 0, goal: weekGoal },
    })
    onClose()
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Username */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-username" className="text-sm font-medium text-foreground">
          {t('profile.edit.username')}{' '}
          <span aria-hidden="true" className="text-red-500">
            *
          </span>
        </label>
        <input
          id="edit-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full h-10 px-4 rounded-full border border-border bg-cream text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Bio / Présentation */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-bio" className="text-sm font-medium text-foreground">
          {t('profile.edit.presentation')}
        </label>
        <textarea
          id="edit-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={300}
          className="w-full px-4 py-3 rounded-2xl border border-border bg-cream text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Objectif hebdomadaire */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-goal" className="text-sm font-medium text-foreground">
          {t('profile.edit.weekGoal')}
        </label>
        <input
          id="edit-goal"
          type="number"
          min={1}
          max={50}
          value={weekGoal}
          onChange={(e) => setWeekGoal(Number(e.target.value))}
          className="w-full h-10 px-4 rounded-full border border-border bg-cream text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">{t('profile.edit.weekGoalHelper')}</p>
      </div>

      {/* Réseaux sociaux */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">{t('profile.edit.socialLinks')}</p>
        {/* Site web */}
        <div className="relative">
          <Globe
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={t('profile.edit.websitePlaceholder')}
            aria-label="Site web"
            className="w-full h-10 pl-9 pr-4 rounded-full border border-border bg-cream text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {/* Instagram */}
        <div className="relative">
          <Instagram
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="url"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder={t('profile.edit.instagramPlaceholder')}
            aria-label="Instagram"
            className="w-full h-10 pl-9 pr-4 rounded-full border border-border bg-cream text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {/* Facebook */}
        <div className="relative">
          <Facebook
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="url"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder={t('profile.edit.facebookPlaceholder')}
            aria-label="Facebook"
            className="w-full h-10 pl-9 pr-4 rounded-full border border-border bg-cream text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
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
