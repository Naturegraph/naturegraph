/**
 * EditProfilePanel — Panneau de modification du profil
 *
 * Bottom sheet sur mobile, panneau latéral fixe sur desktop.
 * Sous-composants par onglet dans ce même fichier (scope restreint — pas d'export).
 * 3 onglets : Informations | Préférences | Photo de profil
 *
 * Comportement :
 *  - ESC pour fermer
 *  - Clic sur le backdrop pour fermer
 *  - body overflow:hidden pendant l'ouverture
 *  - Max 3 centres d'intérêt sélectionnables
 */

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { ProfileDisplayData } from './ProfileHeader'
import { EditInfoTab } from './EditInfoTab'
import { EditPrefsTab } from './EditPrefsTab'
import { EditPhotoTab } from './EditPhotoTab'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditProfilePanelProps {
  /** Données actuelles du profil */
  profile: ProfileDisplayData
  /** Ferme le panneau sans sauvegarder */
  onClose: () => void
  /** Appelé avec les données modifiées lors de la sauvegarde */
  onSave: (data: Partial<ProfileDisplayData>) => void
}

type EditTab = 'info' | 'prefs' | 'photo'

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Panneau d'édition du profil en 3 onglets.
 * Bloque le scroll body à l'ouverture, libère à la fermeture.
 */
export function EditProfilePanel({ profile, onClose, onSave }: EditProfilePanelProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<EditTab>('info')
  const panelRef = useRef<HTMLDivElement>(null)

  // Bloquer le scroll body pendant l'ouverture
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Fermer avec ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus le panneau à l'ouverture
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  // ─── Onglets de navigation ──────────────────────────────────────────────────
  const tabs: { id: EditTab; label: string }[] = [
    { id: 'info', label: t('profile.edit.tabInfos') },
    { id: 'prefs', label: t('profile.edit.tabPrefs') },
    { id: 'photo', label: t('profile.edit.tabPhoto') },
  ]

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Panneau ── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.edit.title')}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 bg-cream-lighter rounded-t-2xl max-h-[90dvh] flex flex-col shadow-2xl focus-visible:outline-none md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[420px] md:rounded-none md:rounded-l-2xl md:max-h-none"
      >
        {/* Handle mobile */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border md:hidden"
          aria-hidden="true"
        />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-6 pb-3 border-b border-border shrink-0 md:pt-4">
          <h2 className="text-base font-semibold text-foreground">{t('profile.edit.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="size-8 flex items-center justify-center rounded-full hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4 text-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* ── Navigation onglets ── */}
        <div className="flex border-b border-border shrink-0" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenu scrollable ── */}
        <div
          role="tabpanel"
          aria-label={tabs.find((t) => t.id === activeTab)?.label}
          className="flex-1 overflow-y-auto"
        >
          {activeTab === 'info' && (
            <EditInfoTab profile={profile} onSave={onSave} onClose={onClose} />
          )}
          {activeTab === 'prefs' && (
            <EditPrefsTab profile={profile} onSave={onSave} onClose={onClose} />
          )}
          {activeTab === 'photo' && (
            <EditPhotoTab profile={profile} onSave={onSave} onClose={onClose} />
          )}
        </div>
      </div>
    </>
  )
}
