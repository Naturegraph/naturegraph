/**
 * SettingsPanel — Panneau "Paramètres" (owner only)
 *
 * Pixel-perfect Figma 6385:175483 (desktop) / 6385:175242 (mobile).
 * Ouvert depuis le bouton "Paramètres" du ProfileHeader (mode owner).
 *
 * Layout :
 *   - Mobile : full-page (fixed inset-0) — comme EditProfilePanel
 *   - Desktop : panneau latéral droit 420px
 *   - Backdrop cliquable + ESC pour fermer
 *
 * Liste d'items :
 *   1. Sécurité           → sous-vue Bientôt (Phase 2)
 *   2. Notifications      → sous-vue Bientôt (Phase 2)
 *   3. Besoin d'aide ?    → sous-vue Bientôt (Phase 2)
 *   4. Partage tes idées  → lien externe (Tally form, à configurer)
 *   5. Licence et droits  → sous-vue avec attributions (TAXREF, Unsplash, Lucide…)
 *   6. Déconnexion        → useAuth().signOut() + redirect /home
 *   7. Supprimer compte   → modal confirmation (DeleteAccountModal)
 *
 * Footer : CGU + Politique de confidentialité + version app.
 *
 * TODO [BACKEND] Phase 2 — voir second-agent/03-profil-backend-notes.md §15.
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
  LogOut,
  Trash2,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DeleteAccountModal } from './DeleteAccountModal'
import { SettingsSecurityView } from './SettingsSecurityView'
import { SettingsNotificationsView } from './SettingsNotificationsView'
import { SettingsHelpView } from './SettingsHelpView'

// ─── Types ────────────────────────────────────────────────────────────────────

/** ID des sous-vues — chaque section ouvre une sous-vue interne au panel. */
type SettingsSection = 'security' | 'notifications' | 'help' | 'license'

interface SettingsPanelProps {
  /** Ferme le panel (revient au profil) */
  onClose: () => void
}

// ─── URL Discord — communauté + retours produit ──────────────────────────────
// Le bouton "Partage tes idées et retours" ouvre directement le Discord
// Naturegraph : permet aux utilisateurs de rejoindre la communauté et
// d'échanger en direct avec l'équipe sur le produit.
//
// TODO — exposer via `VITE_DISCORD_INVITE_URL` dans `.env` pour rotation
// des invites (les liens Discord peuvent expirer ou être révoqués).
const FEEDBACK_URL = 'https://discord.gg/naturegraph'

// ─── Version app ─────────────────────────────────────────────────────────────
// Lecture dynamique depuis `package.json` au build time. Vite tree-shake
// l'import JSON pour ne garder que la valeur `version` dans le bundle final
// — pas de surpoids. Mise à jour automatique à chaque release.
import { version as APP_VERSION } from '../../../package.json'

// ─── Composant principal ──────────────────────────────────────────────────────

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useAuth()

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
  // Les modals gèrent leur propre Escape interne — ce listener ne s'exécute
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

  /** Confirmation finale de suppression du compte */
  async function handleDeleteAccount() {
    // TODO [BACKEND] Phase 2 — appel `request_account_deletion()` RPC.
    // Pour l'instant : signOut + close + toast informatif (à ajouter avec
    // ToastContext quand connecté).
    setShowDeleteModal(false)
    await signOut()
    onClose()
    navigate('/home')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel — full page mobile, latéral droit 448px desktop (Figma).
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
            Titre "Paramètres" — Quicksand bold 32px (Title/H3, line-height 38px).
            Bouton X 24px à droite. Padding 24px sur le container, mobile
            ajoute safe-area-inset-top. */}
        <div className="flex items-center justify-between gap-6 px-6 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-6 shrink-0">
          {/* Bouton back si dans une sous-vue — cercle bordured (Figma). */}
          {section !== null ? (
            <button
              type="button"
              onClick={() => setSection(null)}
              aria-label={t('common.back', { defaultValue: 'Retour' })}
              className="size-10 shrink-0 inline-flex items-center justify-center rounded-full border-[0.5px] border-border bg-background hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          ) : null}
          <h2 className="font-title font-bold text-[32px] leading-[120%] text-foreground flex-1">
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
            />
          ) : (
            <SettingsSubView section={section} />
          )}
        </div>

        {/* ── Footer ── Figma Frame 4705 :
            CGU + Politique de confidentialité (Quicksand bold 16px, color
            action-default, underlined) + version app (Mulish 400 12px,
            color #424747). Hauteur 52px, centré.
            Visible uniquement sur la liste principale.

            Les liens CGU/Politique sont stylés mais inactifs pour le MVP —
            le contenu juridique sera ajouté ultérieurement (cf. Phase 3).
            On utilise des <button type="button"> pour rester accessibles
            au clavier sans déclencher de navigation. */}
        {section === null && (
          <div className="shrink-0 px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-6">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={t('settings.footer.comingLater', {
                  defaultValue: 'Disponible prochainement',
                })}
                className="font-title font-bold text-base leading-6 underline text-[var(--color-action-default)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded cursor-not-allowed disabled:opacity-90"
              >
                {t('settings.footer.terms', { defaultValue: 'CGU' })}
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={t('settings.footer.comingLater', {
                  defaultValue: 'Disponible prochainement',
                })}
                className="font-title font-bold text-base leading-6 underline text-[var(--color-action-default)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded cursor-not-allowed disabled:opacity-90"
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
          un seul usage — code minimal sans abstraction inutile). */}
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
}

function SettingsList({ onOpenSection, onSignOut, onDeleteAccount }: SettingsListProps) {
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
}

function SettingsItem({
  icon,
  label,
  onClick,
  external,
  href,
  noTrailing,
  danger,
}: SettingsItemProps) {
  // Figma Frame 4707 : item h-14 (56px), gap 32px entre contenu gauche
  // (icon+label) et trailing icon. Gap 16px entre icon et label. Séparateur
  // 1px #C4C4CC (Stroke/Light) sous chaque item — `border-b` sur le <li>
  // évite le dernier via `last:border-b-0`.
  //
  // Hover : pas de background — on change uniquement la couleur du texte +
  // icônes en violet (action-default). Les SVG Lucide héritent de
  // `currentColor` donc le changement de `text-*` propage à l'icône et au
  // chevron automatiquement. L'item danger reste rouge (pas de hover violet).
  const baseClasses =
    'w-full h-14 flex items-center gap-8 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded'

  const stateClasses = danger
    ? 'text-[var(--color-error,_#9E0F22)]'
    : 'text-foreground hover:text-[var(--color-action-default)]'

  const content = (
    <>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <span className="shrink-0">{icon}</span>
        {/* Label : Quicksand bold 16px line-height 24px (Title/Button token). */}
        <span className="font-title font-bold text-base leading-6 truncate">{label}</span>
      </div>
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
      <button type="button" onClick={onClick} className={`${baseClasses} ${stateClasses}`}>
        {content}
      </button>
    </li>
  )
}

// ─── Sous-composant : sous-vue Bientôt / Licence ─────────────────────────────

const SECTION_TITLES: Record<SettingsSection, (t: (k: string, o?: object) => string) => string> = {
  security: (t) => t('settings.items.security', { defaultValue: 'Sécurité' }),
  notifications: (t) => t('settings.items.notifications', { defaultValue: 'Notifications' }),
  help: (t) => t('settings.items.help', { defaultValue: "Besoin d'aide ?" }),
  license: (t) => t('settings.items.license', { defaultValue: "Licence et droits d'auteur" }),
}

interface SettingsSubViewProps {
  section: SettingsSection
}

/**
 * Sous-vues du panel.
 *   - 'security'      → form changement email (magic link, pas de mot de passe)
 *   - 'notifications' → 3 sections : méthodes / nouvelles / fréquence
 *   - 'help'          → form contact (Tu as une question ?)
 *   - 'license'       → texte légal sur droits d'auteur et sources tierces
 */
function SettingsSubView({ section }: SettingsSubViewProps) {
  if (section === 'security') {
    return <SettingsSecurityView />
  }

  if (section === 'notifications') {
    return <SettingsNotificationsView />
  }

  if (section === 'help') {
    return <SettingsHelpView />
  }

  if (section === 'license') {
    return <SettingsLicenseView />
  }

  return null
}

// ─── Sous-vue : Licence et droits d'auteur ────────────────────────────────────

/**
 * Texte légal sur les droits d'auteur et sources tierces — pixel-perfect Figma.
 *
 * 5 sections séparées par dividers (1px bg-border) :
 *   1. Utilisation des contenus (intro)
 *   2. Droits sur les photos partagées (propriété user + licence d'usage)
 *   3. Données issues de sources tierces (TAXREF + lien)
 *   4. Respect des droits d'auteur (interdictions)
 *   5. Besoin d'en savoir plus ? (lien vers CGU + contact)
 *
 * Le contenu est en clés i18n avec defaultValue (à intégrer dans fr.json/en.json).
 */
function SettingsLicenseView() {
  const { t } = useTranslation()

  // Lien officiel TAXREF (référentiel taxonomique INPN/MNHN).
  const TAXREF_URL = 'https://inpn.mnhn.fr/programme/referentiel-taxonomique-taxref'

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
              'Nous utilisons des bases de données tierces pour enrichir les informations sur les espèces.',
          })}
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.sourcesBody2', {
            defaultValue:
              'Les données intégrées respectent les licences des fournisseurs et restent attribuées à leurs sources respectives.',
          })}
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.license.sourcesBody3Prefix', {
            defaultValue: "Pour plus d'informations, consultez la documentation officielle de ",
          })}
          <a
            href={TAXREF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline text-[var(--color-action-default)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Taxref
          </a>
          .
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
          {/* Lien vers CGU — disabled pour l'instant (cf. footer du panel,
              le contenu juridique sera ajouté Phase 3). */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="font-bold underline text-[var(--color-action-default)] cursor-not-allowed disabled:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
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
