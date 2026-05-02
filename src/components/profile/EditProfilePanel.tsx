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

      {/* ── Panneau ──
          Mobile : full-page (inset-0) — pas de bottom sheet, pas de handle
          → cohérence avec les autres panneaux pleine page (cf. ContributeModal,
          SearchPanel) sur petits écrans.
          Desktop (md+) : panneau latéral droit 420px, pleine hauteur. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.edit.title')}
        tabIndex={-1}
        className="fixed inset-0 z-50 bg-cream-lighter flex flex-col shadow-2xl focus-visible:outline-none md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[420px] md:rounded-l-2xl"
      >
        {/* ── Header ── Figma 6385:75440 :
            Titre "Modifier le profil" en Quicksand bold large (text-2xl).
            Bouton close à droite, taille 32px, pas de border bottom (la
            border vient du tablist en dessous).
            Mobile : padding-top inclut safe-area-inset-top (notch iPhone). */}
        <div className="flex items-center justify-between px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-6 shrink-0">
          <h2 className="font-title font-bold text-2xl text-foreground leading-tight">
            {t('profile.edit.title', { defaultValue: 'Modifier le profil' })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Fermer' })}
            className="size-8 flex items-center justify-center rounded-full hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5 text-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* ── Navigation onglets ── Figma 6385:75440 :
            Tabs underline alignés à gauche (start-aligned, pas equal-flex).
            Active = primary + border-bottom 2px violet, inactive = foreground
            standard sans muted (Nicolas DS — labels noirs).
            `whitespace-nowrap` + `text-sm` + `gap-5` pour que les 3 labels
            tiennent sur 1 ligne même en mobile 375px (Nicolas 2026-05-02 :
            "essayer d'avoir l'ensemble des labels sur une ligne pas 2"). */}
        <div className="flex border-b border-border shrink-0 px-5 gap-5" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative py-3 text-sm md:text-base font-medium whitespace-nowrap transition-colors -mb-px border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-foreground hover:text-primary'
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

        {/* ── Footer sticky : bouton Sauvegarder ──
            Présent UNIQUEMENT pour les onglets Informations et Préférences.
            L'onglet "Photo de profil" a un comportement auto-save (chaque
            Changer/Supprimer persiste immédiatement) → pas de footer ni de
            bouton de validation explicite (Nicolas 2026-05-02). */}
        {activeTab !== 'photo' && (
          <div className="shrink-0 border-t border-border px-5 py-4 bg-cream-lighter pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4">
            <button
              type="submit"
              form={`edit-${activeTab}-form`}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t('profile.edit.save', { defaultValue: 'Sauvegarder les modifications' })}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
