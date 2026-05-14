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

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Globe, LogOut, Trash2, Bell, Check } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { INTEREST_LABELS } from '@/constants/interests'
import { useUpdateProfile } from '@/hooks/useProfile'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import type { NotificationType } from '@/services/notificationService'
import { trackNotifEvent } from '@/utils/notificationAnalytics'
import { LocationPickerSection } from '@/components/location/LocationPickerSection'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import type { Interest } from '@/types/database'
import type { LocationFormData } from '@/types/location'

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

  // BATCH 10 / QW-UX1 : titre dynamique pour onglet navigateur
  usePageTitle(t('nav.settings'))
  const { userLocation, updateLocation, clearLocation } = useLocation()
  const { success: notifySuccess, error: notifyError } = useToast()
  const updateProfile = useUpdateProfile(profile?.id ?? '')
  const queryClient = useQueryClient()
  const { data: userSettings } = useSettings(profile?.id)
  const updateSettings = useUpdateSettings(profile?.id)
  const notifPrefs = useNotificationPreferences(profile?.id)

  // Types exposés dans l'UI (ordre d'affichage)
  const NOTIF_TYPES: NotificationType[] = [
    'reaction',
    'follow',
    'comment',
    'mention',
    'post',
    'species_digest',
    'identification',
    'system',
  ]

  // ─── Localisation ─────────────────────────────────────────────
  const [pendingLocationData, setPendingLocationData] = useState<LocationFormData | null>(null)

  const handleSaveLocation = useCallback(async () => {
    if (!pendingLocationData) return
    const result = await updateLocation(pendingLocationData)
    if (!result.error) {
      notifySuccess(t('location.settings.saveSuccess'))
    }
  }, [pendingLocationData, updateLocation, notifySuccess, t])

  const handleClearLocation = useCallback(async () => {
    const confirmed = window.confirm(t('location.settings.clearConfirm'))
    if (!confirmed) return
    const result = await clearLocation()
    if (!result?.error) {
      notifySuccess(t('location.settings.clearSuccess'))
    }
  }, [clearLocation, notifySuccess, t])

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
    if (!profile?.id) return
    updateProfile.mutate({
      first_name: form.firstName,
      last_name: form.lastName,
      username: form.username,
      bio: form.bio,
      city: form.city,
      region: form.region,
      interests: form.interests,
      instagram: form.instagram,
      twitter: form.twitter,
      website: form.website,
      is_public: form.isPublic,
    })
  }

  function handleLogout() {
    signOut()
    // BATCH 10 / QW-UX3 : feedback visuel a la deconnexion (toast).
    // Le toast vit au-dela du navigate (ToastProvider est haut dans l'arbre).
    notifySuccess(t('settings.logoutSuccess', 'Tu es deconnecte. A bientot !'))
    navigate('/')
  }

  /** Supprime le compte via Edge Function. Demande confirmation. */
  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      t(
        'settings.deleteAccountConfirm',
        'Cette action est irréversible. Toutes tes données seront supprimées. Continuer ?',
      ),
    )
    if (!confirmed) return
    try {
      const { error } = await supabase!.functions.invoke('delete-account', {
        body: { mode: 'hard' },
      })
      if (error) throw error
      await signOut()
      navigate('/')
    } catch (err) {
      // BATCH 23 / T-026 : toast errors uniformisé (vs window.alert bloquant)
      notifyError(
        t('settings.deleteAccountError', 'Impossible de supprimer le compte'),
        err instanceof Error ? err.message : String(err),
      )
    }
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
              <img
                src={profile?.avatar_url ?? hermineIcon}
                alt=""
                className="size-full object-cover"
              />
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

        {/* ── Section Localisation ────────────────────────────────────────── */}
        <SettingsCard title={t('location.settings.title')}>
          <p className="text-sm text-muted-foreground -mt-2">
            {t('location.settings.description')}
          </p>

          {/*
           * LocationPickerSection en mode always-open pour les Settings.
           * Pré-remplit avec les données actuelles de l'utilisateur si disponibles.
           */}
          <LocationPickerSection
            mode="always-open"
            onChange={setPendingLocationData}
            consentSource="settings"
            initialCity={
              userLocation?.cityName
                ? {
                    inseeCode: '',
                    name: userLocation.cityName,
                    regionName: userLocation.regionName ?? '',
                    departmentName: '',
                    departmentCode: '',
                    population: null,
                    centroidLat: 0,
                    centroidLng: 0,
                  }
                : undefined
            }
            initialRadius={userLocation?.locationRadiusKm ?? 75}
            initialVisibility={userLocation?.locationVisibility ?? 'region'}
          />

          {/* Bouton sauvegarder localisation */}
          <button
            type="button"
            onClick={handleSaveLocation}
            disabled={!pendingLocationData}
            className="w-full h-11 rounded-button font-semibold text-sm transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={{
              backgroundColor: 'var(--color-action-default)',
              color: 'var(--color-bg-primary)',
            }}
          >
            {t('common.save')}
          </button>

          {/* Bouton effacer (RGPD) — visible uniquement si localisé */}
          {userLocation && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="w-full h-10 rounded-button text-sm border border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
            >
              {t('location.settings.clearButton')}
            </button>
          )}

          {/* Date de dernière mise à jour */}
          {userLocation?.locationUpdatedAt && (
            <p className="text-xs text-muted-foreground text-center">
              {t('location.settings.lastUpdated', {
                date: new Date(userLocation.locationUpdatedAt).toLocaleDateString('fr-FR'),
              })}
            </p>
          )}
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

          {/* Objectif hebdomadaire */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {t('settings.weeklyGoal', 'Objectif hebdomadaire')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('settings.weeklyGoalDesc', 'Nombre de partages visés par semaine')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const current = userSettings?.weekly_goal ?? 5
                  if (current > 1)
                    updateSettings.mutate(
                      { weekly_goal: current - 1 },
                      {
                        onSuccess: () =>
                          queryClient.invalidateQueries({ queryKey: ['weekProgress'] }),
                      },
                    )
                }}
                disabled={(userSettings?.weekly_goal ?? 5) <= 1}
                className="size-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={t('settings.weeklyGoalDecrease', "Diminuer l'objectif")}
              >
                −
              </button>
              <span className="text-sm font-bold text-foreground w-6 text-center">
                {userSettings?.weekly_goal ?? 5}
              </span>
              <button
                type="button"
                onClick={() => {
                  const current = userSettings?.weekly_goal ?? 5
                  if (current < 20)
                    updateSettings.mutate(
                      { weekly_goal: current + 1 },
                      {
                        onSuccess: () =>
                          queryClient.invalidateQueries({ queryKey: ['weekProgress'] }),
                      },
                    )
                }}
                disabled={(userSettings?.weekly_goal ?? 5) >= 20}
                className="size-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={t('settings.weeklyGoalIncrease', "Augmenter l'objectif")}
              >
                +
              </button>
            </div>
          </div>
        </SettingsCard>

        {/* ── Section Notifications ───────────────────────────────────────── */}
        <SettingsCard title={t('settings.notificationsSection')}>
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Bell className="size-4" aria-hidden="true" />
            <span className="text-xs">
              {t('settings.notificationsHint', 'Reçois des alertes sur tes activités')}
            </span>
          </div>
          <ToggleRow
            label={t('settings.emailNotifications', 'Notifications email')}
            value={userSettings?.email_notifications ?? true}
            onChange={(v) => updateSettings.mutate({ email_notifications: v })}
          />
          <ToggleRow
            label={t('settings.pushNotifications', 'Notifications push')}
            value={userSettings?.push_notifications ?? true}
            onChange={(v) => updateSettings.mutate({ push_notifications: v })}
          />
          <ToggleRow
            label={t('settings.newsletter', 'Newsletter mensuelle')}
            value={userSettings?.newsletter ?? false}
            onChange={(v) => updateSettings.mutate({ newsletter: v })}
          />
          <ToggleRow
            label={t('settings.reducedMotion', 'Réduire les animations')}
            value={userSettings?.reduced_motion ?? false}
            onChange={(v) => updateSettings.mutate({ reduced_motion: v })}
          />

          {/* ── Préférences par type de notification ─────────────────── */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-bold text-foreground mb-1">
              {t('settings.notifByType.title', 'Par type de notification')}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {t(
                'settings.notifByType.hint',
                'Coupe les types qui ne t’intéressent pas. Le digest espèces est opt-in (RGPD).',
              )}
            </p>
            {NOTIF_TYPES.map((type) => (
              <ToggleRow
                key={type}
                label={t(
                  `home.notifications.type${type
                    .split('_')
                    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                    .join('')}`,
                )}
                value={notifPrefs.isEnabled(type)}
                onChange={(v) => {
                  trackNotifEvent('preference_toggled', { notif_type: type, enabled: v })
                  notifPrefs.set({ type, enabled: v })
                }}
              />
            ))}
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
            onClick={handleDeleteAccount}
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

/** Toggle réutilisable label + switch (pour user_settings) */
function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          value ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform shadow-sm ${
            value ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

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
