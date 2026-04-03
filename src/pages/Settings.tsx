/**
 * Settings — Page de paramètres utilisateur
 *
 * Sections :
 *   1. Profil : avatar, nom, bio, localisation, intérêts, réseaux
 *   2. Compte : email, visibilité, langue, thème
 *   3. Notifications (placeholder)
 *   4. Zone de danger : déconnexion, suppression
 *
 * TODO [BACKEND] — profileService.updateProfile(userId, data)
 *   Brancher les sauvegardes vers l'API Supabase.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Camera, Globe, LogOut, Trash2, Bell, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { INTEREST_LABELS } from '@/data/mockUsers'
import type { Interest } from '@/types/database'

// ─── Constants ───────────────────────────────────────────────────────────────

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
const BIO_MAX = 160

// ─── Composant ───────────────────────────────────────────────────────────────

export default function Settings() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  // État local du formulaire — initialisé depuis le profil auth
  const [form, setForm] = useState({
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    username: profile?.username ?? '',
    bio: profile?.bio ?? '',
    city: profile?.city ?? '',
    region: profile?.region ?? '',
    interests: (profile?.interests ?? []) as Interest[],
    instagram: profile?.instagram ?? '',
    twitter: profile?.twitter ?? '',
    website: profile?.website ?? '',
    isPublic: profile?.is_public ?? true,
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleInterest(interest: Interest) {
    set(
      'interests',
      form.interests.includes(interest)
        ? form.interests.filter((i) => i !== interest)
        : [...form.interests, interest],
    )
  }

  function handleSave() {
    // TODO [BACKEND] — profileService.updateProfile(profile.id, form)
  }

  function handleLogout() {
    signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-cream-lighter flex flex-col">
      {/* Header sticky */}
      <header className="sticky top-0 z-40 bg-cream-lighter border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 md:px-6 h-14">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('common.back')}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="size-5 text-foreground" aria-hidden="true" />
          </button>
          <h1 className="font-bold text-foreground">{t('settings.title')}</h1>
        </div>
      </header>

      <main
        id="main-content"
        className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col gap-6 pb-24 md:pb-6"
      >
        {/* ── Section Profil ──────────────────────────────────────────────── */}
        <SettingsCard title={t('settings.profileSection')}>
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-primary-light overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="size-full flex items-center justify-center">
                  <Camera className="size-6 text-primary" aria-hidden="true" />
                </div>
              )}
            </div>
            <button type="button" className="text-sm text-primary font-medium hover:underline">
              {t('settings.changeAvatar')}
            </button>
          </div>

          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label={t('settings.firstName')}
              value={form.firstName}
              onChange={(v) => set('firstName', v)}
            />
            <FieldInput
              label={t('settings.lastName')}
              value={form.lastName}
              onChange={(v) => set('lastName', v)}
            />
          </div>

          {/* Username */}
          <FieldInput
            label={t('settings.username')}
            value={form.username}
            onChange={(v) => set('username', v)}
          />

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">{t('settings.bio')}</label>
              <span
                className={`text-xs tabular-nums ${form.bio.length > BIO_MAX ? 'text-[var(--color-error)]' : 'text-muted-foreground'}`}
              >
                {form.bio.length}/{BIO_MAX}
              </span>
            </div>
            <textarea
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              rows={3}
              placeholder={t('settings.bioPlaceholder')}
              className="w-full px-4 py-3 rounded-xl border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Localisation */}
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label={t('settings.city')}
              value={form.city}
              onChange={(v) => set('city', v)}
            />
            <FieldInput
              label={t('settings.region')}
              value={form.region}
              onChange={(v) => set('region', v)}
            />
          </div>

          {/* Centres d'intérêts */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">{t('settings.interests')}</span>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  aria-pressed={form.interests.includes(interest)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    form.interests.includes(interest)
                      ? 'border-primary bg-primary-light text-primary font-medium'
                      : 'border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  {INTEREST_LABELS[interest] ?? interest}
                </button>
              ))}
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-foreground">{t('settings.socialLinks')}</span>
            <FieldInput
              label={t('settings.instagram')}
              value={form.instagram}
              onChange={(v) => set('instagram', v)}
              placeholder="@username"
            />
            <FieldInput
              label={t('settings.twitter')}
              value={form.twitter}
              onChange={(v) => set('twitter', v)}
              placeholder="@username"
            />
            <FieldInput
              label={t('settings.website')}
              value={form.website}
              onChange={(v) => set('website', v)}
              placeholder="https://"
            />
          </div>

          {/* Bouton sauvegarder */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full h-11 rounded-button bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('settings.saveChanges')}
          </button>
        </SettingsCard>

        {/* ── Section Compte ──────────────────────────────────────────────── */}
        <SettingsCard title={t('settings.accountSection')}>
          {/* Email */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('settings.email')}</p>
              <p className="text-sm text-muted-foreground">{profile?.email ?? '—'}</p>
            </div>
            <span className="flex items-center gap-1 text-xs text-teal-dark bg-teal-dark/10 px-2 py-0.5 rounded-full">
              <Check className="size-3" aria-hidden="true" />
              {t('settings.verified')}
            </span>
          </div>

          {/* Profil public/privé */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t('settings.publicProfile')}</p>
              <p className="text-xs text-muted-foreground">
                {form.isPublic ? t('settings.publicProfileDesc') : t('settings.privateProfileDesc')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isPublic}
              onClick={() => set('isPublic', !form.isPublic)}
              className={`relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                form.isPublic ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform shadow-sm ${
                  form.isPublic ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Langue */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">{t('settings.language')}</span>
            </div>
            <div className="flex gap-1">
              {(['fr', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => i18n.changeLanguage(lang)}
                  aria-pressed={i18n.language === lang}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    i18n.language === lang
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-cream text-foreground hover:bg-muted'
                  }`}
                >
                  {lang === 'fr' ? 'FR' : 'EN'}
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* ── Section Notifications ───────────────────────────────────────── */}
        <SettingsCard title={t('settings.notificationsSection')}>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Bell className="size-5" aria-hidden="true" />
            <p className="text-sm">{t('settings.notificationsComingSoon')}</p>
          </div>
        </SettingsCard>

        {/* ── Zone de danger ──────────────────────────────────────────────── */}
        <SettingsCard title={t('settings.dangerZone')}>
          {/* Déconnexion */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <div className="text-left">
              <p className="text-sm font-medium">{t('settings.logout')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.logoutDesc')}</p>
            </div>
          </button>

          {/* Suppression du compte */}
          <button
            type="button"
            onClick={() => {
              // TODO [BACKEND] — modale de confirmation + profileService.deleteAccount()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            <div className="text-left">
              <p className="text-sm font-medium">{t('settings.deleteAccount')}</p>
              <p className="text-xs text-red-400">{t('settings.deleteAccountDesc')}</p>
            </div>
          </button>
        </SettingsCard>
      </main>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

/** Carte de section des paramètres */
function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-cream-lighter border-[0.5px] border-border rounded-card p-6 flex flex-col gap-5">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

/** Champ texte simple réutilisable */
function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-border bg-cream-lighter text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  )
}
