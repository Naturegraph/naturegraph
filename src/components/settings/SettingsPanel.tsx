/**
 * SettingsPanel : Panneau "Paramètres" (owner only)
 *
 * Pixel-perfect Figma 6385:175483 (desktop) / 6385:175242 (mobile).
 * Ouvert depuis le bouton "Paramètres" du ProfileHeader (mode owner).
 *
 * Layout :
 *   - Mobile : full-page (fixed inset-0) : comme EditProfilePanel
 *   - Desktop : panneau latéral droit 420px
 *   - Backdrop cliquable + ESC pour fermer
 *
 * Liste d'items :
 *   1. Sécurité           → sous-vue Bientôt (Phase 2)
 *   2. Notifications      → sous-vue Bientôt (Phase 2)
 *   3. Besoin d'aide ?    → sous-vue Bientôt (Phase 2)
 *   4. Partage tes idées  → lien externe (Tally form, à configurer)
 *   5. Licence et droits  → sous-vue avec attributions (GBIF, Wikidata, Unsplash, Lucide…)
 *   6. Déconnexion        → useAuth().signOut() + redirect /home
 *   7. Supprimer compte   → modal confirmation (DeleteAccountModal)
 *
 * Footer : CGU + Politique de confidentialité + version app.
 *
 * TODO [BACKEND] Phase 2 : voir second-agent/03-profil-backend-notes.md §15.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  X,
  ChevronRight,
  ExternalLink,
  Unlock,
  Bell,
  Mail,
  AlignLeft,
  FileText,
  Download,
  LogOut,
  Trash2,
  ArrowLeft,
  ShieldOff,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { safeDetail } from '@/lib/sanitizeError'
import { useDeleteAccount } from '@/hooks/useAccountDeletion'
import { useDataExport } from '@/hooks/useDataExport'
import { useHiddenPostIds } from '@/hooks/useHiddenPosts'
import { useBlockedUsers } from '@/hooks/useBlocks'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DeleteAccountModal } from './DeleteAccountModal'
import { SettingsSecurityView } from './SettingsSecurityView'
import { SettingsNotificationsView } from './SettingsNotificationsView'
import { SettingsHelpView } from './SettingsHelpView'

// ─── Types ────────────────────────────────────────────────────────────────────

/** ID des sous-vues : chaque section ouvre une sous-vue interne au panel. */
type SettingsSection =
  | 'security'
  | 'blocking'
  | 'notifications'
  | 'help'
  | 'license'
  | 'terms'
  | 'privacy'

interface SettingsPanelProps {
  /** Ferme le panel (revient au profil) */
  onClose: () => void
}

// ─── URL Discord : communauté + retours produit ──────────────────────────────
// Le bouton "Partage tes idées et retours" ouvre directement le Discord
// Naturegraph : permet aux utilisateurs de rejoindre la communauté et
// d'échanger en direct avec l'équipe sur le produit.
//
// TODO : exposer via `VITE_DISCORD_INVITE_URL` dans `.env` pour rotation
// des invites (les liens Discord peuvent expirer ou être révoqués).
const FEEDBACK_URL = 'https://discord.gg/naturegraph'

// ─── Version app ─────────────────────────────────────────────────────────────
// Lecture dynamique depuis `package.json` au build time. Vite tree-shake
// l'import JSON pour ne garder que la valeur `version` dans le bundle final
// : pas de surpoids. Mise à jour automatique à chaque release.
import { version as APP_VERSION } from '../../../package.json'

// ─── Composant principal ──────────────────────────────────────────────────────

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const toast = useToast()
  const deleteAccountMutation = useDeleteAccount()
  const dataExportMutation = useDataExport()

  /** Sous-vue actuellement ouverte (null = liste principale) */
  const [section, setSection] = useState<SettingsSection | null>(null)
  /** Modal de confirmation de suppression du compte */
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  /** Modal de confirmation de déconnexion */
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // ── Lock scroll body pendant l'ouverture ──────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // ── Fermer avec Escape ───────────────────────────────────────────────────
  // Ordre de priorité : modal logout/delete > sous-vue > fermeture panel.
  // Les modals gèrent leur propre Escape interne : ce listener ne s'exécute
  // que si aucun handler enfant ne stoppe la propagation (ce qui est le cas).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (showLogoutModal) {
        setShowLogoutModal(false)
        return
      }
      if (showDeleteModal) {
        setShowDeleteModal(false)
        return
      }
      if (section !== null) {
        setSection(null)
        return
      }
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [section, showDeleteModal, showLogoutModal, onClose])

  // ── Focus initial sur le panel pour a11y ─────────────────────────────────
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  /** Déconnexion : signOut + redirect vers /home (appelé après confirmation modal) */
  async function handleSignOutConfirmed() {
    setShowLogoutModal(false)
    await signOut()
    onClose()
    navigate('/home')
  }

  /**
   * Export RGPD : déclenche la génération + téléchargement automatique du JSON.
   * RGPD Art. 20 (portabilité) + Loi 25 Art. 27.3.
   * L'Edge Function `export-data` génère un export complet (profile, settings,
   * posts, media, comments, reactions, follows, notebooks) puis retourne une
   * URL signée 24h. Le hook lance le download via un anchor invisible.
   */
  async function handleDataExport() {
    try {
      await dataExportMutation.mutateAsync({
        filenamePrefix: t('rgpd.export.filenamePrefix', {
          defaultValue: 'naturegraph-export',
        }),
      })
      toast.success(t('rgpd.export.success', { defaultValue: 'Export téléchargé' }))
    } catch (err) {
      console.error('[Settings] data export failed', err)
      toast.error(
        t('rgpd.export.error', {
          defaultValue: "Échec de l'export. Réessaie plus tard.",
        }),
        safeDetail(err),
      )
    }
  }

  /**
   * Confirmation finale de suppression du compte.
   * Appelle l'Edge Function `delete-account` (mode 'hard' par défaut) qui :
   *   1. Supprime les fichiers Storage (avatars / banners / post-media / exports)
   *   2. Supprime auth.users (cascade vers profiles + posts via FK)
   *   3. Le hook `useDeleteAccount` vide le cache React Query au succès
   */
  async function handleDeleteAccount() {
    try {
      await deleteAccountMutation.mutateAsync('hard')
      setShowDeleteModal(false)
      onClose()
      toast.success(
        t('settings.delete.successTitle', {
          defaultValue: 'Compte supprimé',
        }),
        t('settings.delete.successDesc', {
          defaultValue: 'Toutes tes données ont été effacées.',
        }),
      )
      navigate('/home')
    } catch (err) {
      console.error('[Settings] account deletion failed', err)
      toast.error(
        t('settings.delete.error', {
          defaultValue: 'Impossible de supprimer le compte pour l’instant.',
        }),
        safeDetail(err),
      )
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel : full page mobile, latéral droit 448px desktop (Figma).
          bg #FFFDF8 (Background/Neutral/Primary), shadow 0 6px 16px -4px rgba(0,0,0,0.1).
          Padding 24px (md:p-6) hors mobile (qui respecte safe-area). */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.title', { defaultValue: 'Paramètres' })}
        tabIndex={-1}
        className="fixed inset-0 z-50 bg-[var(--color-bg-primary)] flex flex-col focus-visible:outline-none shadow-[0_6px_16px_-4px_rgba(0,0,0,0.1)] md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[448px] md:rounded-l-2xl"
      >
        {/* ── Header ── Figma Frame 625795 :
            Titre "Paramètres" : Quicksand bold 32px (Title/H3, line-height 38px).
            Bouton X 24px à droite. Padding 24px sur le container, mobile
            ajoute safe-area-inset-top. */}
        <div className="flex items-center justify-between gap-6 px-6 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-6 shrink-0">
          {/* Bouton back si dans une sous-vue : cercle bordured (Figma). */}
          {section !== null ? (
            <button
              type="button"
              onClick={() => setSection(null)}
              aria-label={t('common.back', { defaultValue: 'Retour' })}
              className="size-10 shrink-0 inline-flex items-center justify-center rounded-full border-[0.5px] border-border bg-background hover:border-primary hover:text-[var(--color-link)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          ) : null}
          <h2 className="font-title font-bold text-xl md:text-[32px] leading-[120%] text-foreground flex-1 text-balance">
            {section === null
              ? t('settings.title', { defaultValue: 'Paramètres' })
              : SECTION_TITLES[section](t)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Fermer' })}
            className="size-6 flex items-center justify-center rounded-full hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-6 text-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* ── Contenu scrollable ── */}
        <div className="flex-1 overflow-y-auto">
          {section === null ? (
            <SettingsList
              onOpenSection={setSection}
              onSignOut={() => setShowLogoutModal(true)}
              onDeleteAccount={() => setShowDeleteModal(true)}
              onExportData={handleDataExport}
              isExporting={dataExportMutation.isPending}
            />
          ) : (
            <SettingsSubView section={section} onSectionChange={setSection} />
          )}
        </div>

        {/* ── Footer ── Figma Frame 4705 :
            CGU + Politique de confidentialité (Quicksand bold 16px, color
            action-default, underlined) + version app (Mulish 400 12px,
            color #424747). Hauteur 52px, centré.
            Visible uniquement sur la liste principale.

            Les liens CGU/Politique sont stylés mais inactifs pour le MVP -
            le contenu juridique sera ajouté ultérieurement (cf. Phase 3).
            On utilise des <button type="button"> pour rester accessibles
            au clavier sans déclencher de navigation. */}
        {section === null && (
          <div className="shrink-0 px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-6">
              {/*
                BATCH 97 : liens CGU + Politique de confidentialite actives.
                Ils ouvrent une sous-vue interne au panel (pas de navigation),
                le bouton retour ramene sur la liste principale Parametres.
              */}
              <button
                type="button"
                onClick={() => setSection('terms')}
                className="font-title font-bold text-base leading-6 underline text-[var(--color-link)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                {t('settings.footer.terms', { defaultValue: 'CGU' })}
              </button>
              <button
                type="button"
                onClick={() => setSection('privacy')}
                className="font-title font-bold text-base leading-6 underline text-[var(--color-link)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                {t('settings.footer.privacy', {
                  defaultValue: 'Politique de confidentialité',
                })}
              </button>
            </div>
            <p className="font-body text-xs leading-5 text-[#424747] text-center">
              {t('settings.footer.version', {
                defaultValue: `App version ${APP_VERSION}`,
                version: APP_VERSION,
              })}
            </p>
          </div>
        )}
      </div>

      {/* Modal de confirmation suppression compte (variant danger) */}
      {showDeleteModal && (
        <DeleteAccountModal
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}

      {/* Modal de confirmation déconnexion (variant default).
          Réutilise <ConfirmModal /> directement (pas de wrapper dédié car
          un seul usage : code minimal sans abstraction inutile). */}
      {showLogoutModal && (
        <ConfirmModal
          title={t('settings.logout.title', {
            defaultValue: 'Es-tu sûr·e de vouloir te déconnecter ?',
          })}
          description={t('settings.logout.description', {
            defaultValue:
              'Tu seras déconnecté·e de Naturegraph. Tu pourras te reconnecter à tout moment avec ton email.',
          })}
          confirmLabel={t('settings.logout.confirm', {
            defaultValue: 'Se déconnecter',
          })}
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={handleSignOutConfirmed}
        />
      )}
    </>
  )
}

// ─── Sous-composant : Liste principale ────────────────────────────────────────

interface SettingsListProps {
  onOpenSection: (s: SettingsSection) => void
  onSignOut: () => void
  onDeleteAccount: () => void
  /** Déclenche l'export RGPD (Art. 20 portabilité). */
  onExportData: () => void
  /** True pendant la génération de l'export (disable + label loading). */
  isExporting: boolean
}

function SettingsList({
  onOpenSection,
  onSignOut,
  onDeleteAccount,
  onExportData,
  isExporting,
}: SettingsListProps) {
  const { t } = useTranslation()

  // Figma Frame 4701 : items remplissent la largeur du contenu (400px).
  // Séparateur 1px #C4C4CC (Stroke/Light) entre chaque item via `border-b`
  // sur chaque <li> sauf le dernier (`last:border-b-0`).
  return (
    <ul className="flex flex-col px-6">
      <SettingsItem
        icon={<Unlock className="size-5" aria-hidden="true" />}
        label={t('settings.items.security', { defaultValue: 'Sécurité' })}
        onClick={() => onOpenSection('security')}
      />
      {/*
        Nicolas 2026-05-24 : Blocages placee juste sous Securite, au-dessus
        de Notifications. Action de controle prioritaire. Permet de gerer
        masquages (publications) + blocages (comptes) sans passer par l admin.
      */}
      <SettingsItem
        icon={<ShieldOff className="size-5" aria-hidden="true" />}
        label={t('settings.items.blocking', { defaultValue: 'Blocages' })}
        onClick={() => onOpenSection('blocking')}
      />
      <SettingsItem
        icon={<Bell className="size-5" aria-hidden="true" />}
        label={t('settings.items.notifications', { defaultValue: 'Notifications' })}
        onClick={() => onOpenSection('notifications')}
      />
      <SettingsItem
        icon={<Mail className="size-5" aria-hidden="true" />}
        label={t('settings.items.help', { defaultValue: "Besoin d'aide ?" })}
        onClick={() => onOpenSection('help')}
      />
      <SettingsItem
        icon={<AlignLeft className="size-5" aria-hidden="true" />}
        label={t('settings.items.feedback', {
          defaultValue: 'Partage tes idées et retours',
        })}
        external
        href={FEEDBACK_URL}
      />
      <SettingsItem
        icon={<FileText className="size-5" aria-hidden="true" />}
        label={t('settings.items.license', {
          defaultValue: "Licence et droits d'auteur",
        })}
        onClick={() => onOpenSection('license')}
      />
      {/* Export RGPD : droit à la portabilité (Art. 20 / Loi 25 Art. 27.3).
          Téléchargement d'un JSON complet de toutes les données de l'utilisateur
          via l'Edge Function `export-data`. URL signée 24h, bucket privé. */}
      <SettingsItem
        icon={<Download className="size-5" aria-hidden="true" />}
        label={
          isExporting
            ? t('rgpd.export.downloading', { defaultValue: 'Préparation de l’export…' })
            : t('rgpd.export.title', { defaultValue: 'Exporter mes données' })
        }
        onClick={onExportData}
        disabled={isExporting}
        noTrailing
      />
      <SettingsItem
        icon={<LogOut className="size-5" aria-hidden="true" />}
        label={t('settings.items.signOut', { defaultValue: 'Déconnexion' })}
        onClick={onSignOut}
        noTrailing
      />
      <SettingsItem
        icon={<Trash2 className="size-5" aria-hidden="true" />}
        label={t('settings.items.deleteAccount', {
          defaultValue: 'Supprimer mon compte',
        })}
        onClick={onDeleteAccount}
        noTrailing
        danger
      />
    </ul>
  )
}

// ─── Sous-composant : ligne d'item ────────────────────────────────────────────

interface SettingsItemProps {
  icon: React.ReactNode
  label: string
  /** Action standard interne (ouvre une sous-vue ou déclenche un handler). */
  onClick?: () => void
  /** Si true, lien externe avec icône ExternalLink à droite. */
  external?: boolean
  /** URL externe (requis si `external`). */
  href?: string
  /** Si true, pas de chevron à droite (Déconnexion / Suppression). */
  noTrailing?: boolean
  /** Si true, label + icône en rouge (Suppression compte). */
  danger?: boolean
  /** Si true, item désactivé (en cours d'opération asynchrone : ex: export RGPD). */
  disabled?: boolean
  /**
   * Compteur affiche en pill avant le chevron (Confidentialite).
   * 0 ou undefined : masque. Affiche bg-primary-light + text-[var(--color-link)].
   */
  badge?: number
}

function SettingsItem({
  icon,
  label,
  onClick,
  external,
  href,
  noTrailing,
  danger,
  disabled,
  badge,
}: SettingsItemProps) {
  // Figma Frame 4707 : item h-14 (56px), gap 32px entre contenu gauche
  // (icon+label) et trailing icon. Gap 16px entre icon et label. Séparateur
  // 1px #C4C4CC (Stroke/Light) sous chaque item : `border-b` sur le <li>
  // évite le dernier via `last:border-b-0`.
  //
  // Hover : pas de background : on change uniquement la couleur du texte +
  // icônes en violet (action-default). Les SVG Lucide héritent de
  // `currentColor` donc le changement de `text-*` propage à l'icône et au
  // chevron automatiquement. L'item danger reste rouge (pas de hover violet).
  const baseClasses =
    'w-full h-14 flex items-center gap-8 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded'

  const stateClasses = danger
    ? 'text-[var(--color-error,_#9E0F22)]'
    : 'text-foreground hover:text-[var(--color-link)]'

  const content = (
    <>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <span className="shrink-0">{icon}</span>
        {/* Label : Quicksand bold 16px line-height 24px (Title/Button token). */}
        <span className="font-title font-bold text-base leading-6 truncate">{label}</span>
      </div>
      {/* Badge compteur, optionnel, affiche avant le chevron quand > 0 */}
      {badge !== undefined && badge > 0 && (
        <span
          aria-label={`${badge}`}
          className="shrink-0 text-xs font-bold tabular-nums bg-primary-light text-[var(--color-link)] px-2 py-0.5 rounded-full"
        >
          {badge}
        </span>
      )}
      {!noTrailing && (
        // Pas de classe text- ici : on hérite de currentColor du parent
        // pour que le hover violet propage au chevron / external-link.
        <span aria-hidden="true" className="shrink-0">
          {external ? <ExternalLink className="size-6" /> : <ChevronRight className="size-6" />}
        </span>
      )}
    </>
  )

  // Séparateur 1px #C4C4CC entre items (sauf le dernier).
  const liClasses = 'border-b border-[#C4C4CC] last:border-b-0'

  if (external && href) {
    return (
      <li className={liClasses}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClasses} ${stateClasses}`}
        >
          {content}
        </a>
      </li>
    )
  }

  return (
    <li className={liClasses}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${stateClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-busy={disabled || undefined}
      >
        {content}
      </button>
    </li>
  )
}

// ─── Sous-composant : sous-vue Bientôt / Licence ─────────────────────────────

// Type minimal pour la signature de `t` qu'on passe ici : on n'utilise que la
// forme `(key, { defaultValue }) => string`. Évite le typing complet TFunction
// qui casserait sur l'inférence des namespaces i18next v25.
type SimpleT = (key: string, options: { defaultValue: string }) => string

const SECTION_TITLES: Record<SettingsSection, (t: SimpleT) => string> = {
  security: (t) => t('settings.items.security', { defaultValue: 'Sécurité' }),
  blocking: (t) => t('settings.items.blocking', { defaultValue: 'Blocages' }),
  notifications: (t) => t('settings.items.notifications', { defaultValue: 'Notifications' }),
  help: (t) => t('settings.items.help', { defaultValue: "Besoin d'aide ?" }),
  license: (t) => t('settings.items.license', { defaultValue: "Licence et droits d'auteur" }),
  terms: (t) => t('legal.terms.title', { defaultValue: 'Mentions légales' }),
  privacy: (t) => t('legal.privacy.title', { defaultValue: 'Politique de confidentialité' }),
}

interface SettingsSubViewProps {
  section: SettingsSection
  onSectionChange?: (s: SettingsSection) => void
}

/**
 * Sous-vues du panel.
 *   - 'security'      → form changement email (magic link, pas de mot de passe)
 *   - 'notifications' → 3 sections : méthodes / nouvelles / fréquence
 *   - 'help'          → form contact (Tu as une question ?)
 *   - 'license'       → texte légal sur droits d'auteur et sources tierces
 */
function SettingsSubView({ section, onSectionChange }: SettingsSubViewProps) {
  if (section === 'security') {
    return <SettingsSecurityView />
  }

  if (section === 'blocking') {
    return <SettingsBlockingView />
  }

  if (section === 'notifications') {
    return <SettingsNotificationsView />
  }

  if (section === 'help') {
    return <SettingsHelpView />
  }

  if (section === 'license') {
    return <SettingsLicenseView onOpenTerms={() => onSectionChange?.('terms')} />
  }

  // BATCH 97 : sous-vues CGU + Politique de confidentialité : réutilisent le
  // même contenu i18n que les pages publiques /legal et /privacy. Le retour
  // remet le SettingsPanel en mode liste principale (pas de navigation
  // externe) : pas de conflit avec l'état ouvert du panel.
  if (section === 'terms') {
    return <SettingsLegalDocView kind="terms" />
  }
  if (section === 'privacy') {
    return <SettingsLegalDocView kind="privacy" />
  }

  return null
}

// ─── Sous-vues : CGU + Politique de confidentialité (BATCH 97) ───────────────

/**
 * Sous-vue legale partagee : affiche le contenu de legal.terms.* ou legal.privacy.*
 * exactement comme sur les pages /legal et /privacy publiques, mais integre dans
 * le SettingsPanel pour eviter de quitter le panel et perdre l'etat ouvert.
 *
 * Highlight des marqueurs [À COMPLÉTER ...] desactive ici (panel deja contextuel,
 * pas besoin de visibilite supplementaire pour Nicolas en preview).
 */
function SettingsLegalDocView({ kind }: { kind: 'terms' | 'privacy' }) {
  const { t } = useTranslation()
  // V1.0.5 : ajout section 7 (CGU "Sources de donnees") + section 12 (Privacy
  // "Sources tierces et sous-traitants") pour aligner avec les pages /legal
  // et /privacy publiques. Cohenrence entre app et landing.
  const sectionCount = kind === 'terms' ? 7 : 12
  const i18nNamespace = kind === 'terms' ? 'legal.terms' : 'legal.privacy'
  const sections = Array.from({ length: sectionCount }, (_, i) => ({
    titleKey: `${i18nNamespace}.section${i + 1}Title`,
    contentKey: `${i18nNamespace}.section${i + 1}Content`,
  }))

  return (
    <article className="px-6 pb-6">
      <header className="mb-6">
        <p className="text-xs text-muted-foreground">
          {t(`${i18nNamespace}.lastUpdated`, {
            defaultValue: 'Dernière mise à jour : 02 mai 2026',
          })}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {sections.map((section, index) => (
          <section key={section.titleKey}>
            <h3 className="text-base font-semibold text-foreground mb-2">
              {index + 1}. {t(section.titleKey, { defaultValue: '' })}
            </h3>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {t(section.contentKey, { defaultValue: '' })}
            </p>
          </section>
        ))}
      </div>
    </article>
  )
}

// ─── Sous-vue : Blocages ─────────────────────────────────────────────────────

/**
 * Sous-vue Blocages, Nicolas 2026-05-24.
 *
 * Liste 2 nav rows vers les pages dediees :
 *   - Publications masquees, action inverse de Masquer cette publication
 *   - Comptes bloques, action inverse de Bloquer cet utilisateur
 *
 * Badge count temps reel via useHiddenPostIds + useBlockedUsers.
 *
 * On utilise navigate vers /settings/hidden et /settings/blocked (pages
 * dediees plein ecran) plutot que des sous-vues internes au panel. La
 * raison : les listes peuvent etre longues et meritent un layout pleine
 * largeur. Le panel sera ferme par la navigation et l user reviendra
 * dans le panel via le back du navigateur ou en re-cliquant Parametres.
 */
function SettingsBlockingView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: hiddenIds } = useHiddenPostIds()
  const { data: blockedUsers } = useBlockedUsers()

  return (
    <ul className="flex flex-col px-6">
      <SettingsItem
        icon={<EyeOff className="size-5" aria-hidden="true" />}
        label={t('settings.hidden.title', { defaultValue: 'Publications masquées' })}
        onClick={() => navigate('/settings/hidden')}
        badge={hiddenIds?.length ?? 0}
      />
      <SettingsItem
        icon={<ShieldOff className="size-5" aria-hidden="true" />}
        label={t('settings.blocked.title', { defaultValue: 'Comptes bloqués' })}
        onClick={() => navigate('/settings/blocked')}
        badge={blockedUsers?.length ?? 0}
      />
    </ul>
  )
}

// ─── Sous-vue : Licence et droits d'auteur ────────────────────────────────────

/**
 * Texte légal sur les droits d'auteur et sources tierces : pixel-perfect Figma.
 *
 * 5 sections séparées par dividers (1px bg-border) :
 *   1. Utilisation des contenus (intro)
 *   2. Droits sur les photos partagées (propriété user + licence d'usage)
 *   3. Données issues de sources tierces (GBIF + Wikidata, Phase 1)
 *   4. Respect des droits d'auteur (interdictions)
 *   5. Besoin d'en savoir plus ? (lien vers CGU + contact)
 *
 * V1.1.0 (Nicolas 2026-05-26) : pivot vers iNaturalist comme source principale
 * de taxonomie (API API CC-BY + donnees actives FR + CA). GBIF + Wikidata restent
 * mentionnes comme sources secondaires CC0.
 *
 * Le contenu est en clés i18n avec defaultValue (à intégrer dans fr.json/en.json).
 */
function SettingsLicenseView({ onOpenTerms }: { onOpenTerms?: () => void }) {
  const { t } = useTranslation()

  // Sources de données ouvertes utilisées.
  const INATURALIST_URL = 'https://www.inaturalist.org'
  const GBIF_URL = 'https://www.gbif.org'
  const WIKIDATA_URL = 'https://www.wikidata.org'

  return (
    <div className="flex flex-col">
      {/* ── Section 1 : Utilisation des contenus ─────────────────────── */}
      <section className="flex flex-col gap-3 px-6 pt-2 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.license.usageTitle', {
            defaultValue: 'Utilisation des contenus',
          })}
        </h3>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.usageBody', {
            defaultValue:
              "Chez Naturegraph, nous attachons une grande importance au respect des droits d'auteur et à l'utilisation responsable des contenus partagés. Retrouvez ici les informations essentielles sur les licences appliquées aux photos et aux données.",
          })}
        </p>
      </section>

      <div className="h-1 bg-border" aria-hidden="true" />

      {/* ── Section 2 : Droits sur les photos partagées ──────────────── */}
      <section className="flex flex-col gap-3 px-6 pt-6 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.license.photosTitle', {
            defaultValue: 'Droits sur les photos partagées',
          })}
        </h3>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.photosOwnership', {
            defaultValue:
              'En publiant une photo sur Naturegraph, vous conservez la propriété de votre contenu.',
          })}
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.photosUsage', {
            defaultValue:
              "Vous acceptez que votre photo puisse être affichée sur la plateforme et utilisée dans un cadre collaboratif pour l'identification et l'enrichissement des données.",
          })}
        </p>
      </section>

      <div className="h-1 bg-border" aria-hidden="true" />

      {/* ── Section 3 : Données issues de sources tierces ────────────── */}
      <section className="flex flex-col gap-3 px-6 pt-6 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.license.sourcesTitle', {
            defaultValue: 'Données issues de sources tierces',
          })}
        </h3>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.sourcesBody1', {
            defaultValue:
              'Pour enrichir les informations sur les espèces (noms vernaculaires, taxonomie, photos de référence), nous utilisons des bases de données ouvertes et collaboratives.',
          })}
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.sourcesBody2', {
            defaultValue:
              "Naturegraph s'appuie principalement sur trois sources de référence distribuées sous licences ouvertes :",
          })}
        </p>
        <ul className="text-sm text-foreground leading-relaxed list-disc pl-6 space-y-1">
          <li>
            <a
              href={INATURALIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline text-[var(--color-link)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              iNaturalist
            </a>
            {' : '}
            {t('settings.license.inaturalistDesc', {
              defaultValue:
                "plateforme participative mondiale d'observation de la biodiversité (CC-BY). Source principale des noms d'espèces, hiérarchies taxonomiques et statuts de présence territoriale (France + Canada).",
            })}
          </li>
          <li>
            <a
              href={GBIF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline text-[var(--color-link)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              GBIF
            </a>
            {' : '}
            {t('settings.license.gbifDesc', {
              defaultValue:
                'référentiel taxonomique international (Global Biodiversity Information Facility) : CC0 domaine public.',
            })}
          </li>
          <li>
            <a
              href={WIKIDATA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline text-[var(--color-link)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Wikidata
            </a>
            {' : '}
            {t('settings.license.wikidataDesc', {
              defaultValue: 'noms vernaculaires en français et en québécois : CC0 domaine public.',
            })}
          </li>
        </ul>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.sourcesBody3', {
            defaultValue:
              'Les utilisateurs restent libres de proposer des corrections et identifications via la fonction "Demander une identification".',
          })}
        </p>
      </section>

      <div className="h-1 bg-border" aria-hidden="true" />

      {/* ── Section 4 : Respect des droits d'auteur ─────────────────── */}
      <section className="flex flex-col gap-3 px-6 pt-6 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.license.respectTitle', {
            defaultValue: "Respect des droits d'auteur",
          })}
        </h3>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.respectBody1', {
            defaultValue:
              "Ne partagez que des photos dont vous êtes l'auteur ou pour lesquelles vous avez une autorisation.",
          })}
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.respectBody2', {
            defaultValue:
              'Les contributions ne doivent pas contenir de contenus protégés sans accord explicite.',
          })}
        </p>
      </section>

      <div className="h-1 bg-border" aria-hidden="true" />

      {/* ── Section 5 : Besoin d'en savoir plus ? ────────────────────── */}
      <section className="flex flex-col gap-3 px-6 pt-6 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.license.moreTitle', {
            defaultValue: "Besoin d'en savoir plus ?",
          })}
        </h3>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.morePrefix', {
            defaultValue:
              "Un doute sur l'utilisation de vos photos ou des données ? Consultez nos ",
          })}
          {/* Lien actif vers la sous-vue CGU du SettingsPanel : ouvre la
              section 'terms' avec le contenu i18n partagé avec /legal
              (Nicolas 2026-05-22). */}
          <button
            type="button"
            onClick={() => onOpenTerms?.()}
            className="font-bold underline text-[var(--color-link)] hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            {t('settings.license.moreCguLink', {
              defaultValue: "Conditions générales d'utilisation",
            })}
          </button>
          {t('settings.license.moreSuffix', {
            defaultValue: ' ou contactez-nous directement.',
          })}
        </p>
      </section>
    </div>
  )
}
