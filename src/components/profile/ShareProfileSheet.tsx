/**
 * ShareProfileSheet — Feuille de partage du profil
 *
 * Bottom sheet avec :
 *  - 4 apps de partage : WhatsApp, Instagram, Messenger, Gmail
 *  - URL du profil + bouton copier (avec feedback "Lien copié !")
 *  - ESC pour fermer, clic backdrop pour fermer
 *
 * Eco-conception : pas de dépendance d'icône externe, emojis natifs.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Copy, Check } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareProfileSheetProps {
  /** Username du profil à partager */
  username: string
  /** Ferme la feuille de partage */
  onClose: () => void
}

// ─── Configuration des apps ───────────────────────────────────────────────────

/** Application de partage avec emoji et label */
interface ShareApp {
  id: string
  emoji: string
  label: string
  /** Génère l'URL de partage */
  getUrl: (profileUrl: string) => string
}

const SHARE_APPS: ShareApp[] = [
  {
    id: 'whatsapp',
    emoji: '💬',
    label: 'WhatsApp',
    getUrl: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
  },
  {
    id: 'instagram',
    emoji: '📸',
    label: 'Instagram',
    // Instagram ne supporte pas de partage URL natif — ouvre l'app
    getUrl: () => 'https://www.instagram.com/',
  },
  {
    id: 'messenger',
    emoji: '💙',
    label: 'Messenger',
    getUrl: (url) => `fb-messenger://share/?link=${encodeURIComponent(url)}`,
  },
  {
    id: 'gmail',
    emoji: '📧',
    label: 'Gmail',
    getUrl: (url) =>
      `https://mail.google.com/mail/?view=cm&su=Profil+Naturegraph&body=${encodeURIComponent(url)}`,
  },
]

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Feuille de partage positionnée en bas de l'écran.
 * Handle visible en haut pour signifier le swipe potentiel (UX mobile).
 */
export function ShareProfileSheet({ username, onClose }: ShareProfileSheetProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  /** URL publique du profil */
  const profileUrl = `https://naturegraph.fr/profile/${username}`

  // Bloquer le scroll body
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

  // Focus le sheet à l'ouverture
  useEffect(() => {
    sheetRef.current?.focus()
  }, [])

  /** Copie l'URL dans le presse-papier avec feedback visuel de 2s */
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback : sélectionner le texte
    }
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Feuille ── */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.shareSheet.title')}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 bg-cream-lighter rounded-t-2xl shadow-2xl focus-visible:outline-none"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {t('profile.shareSheet.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="size-8 flex items-center justify-center rounded-full hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4 text-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* Apps de partage */}
        <div className="px-4 py-5">
          <div className="flex items-center justify-around">
            {SHARE_APPS.map((app) => (
              <a
                key={app.id}
                href={app.getUrl(profileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Partager sur ${app.label}`}
                className="flex flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-lg"
              >
                {/* Icône emoji dans cercle */}
                <div className="size-14 rounded-full bg-cream border border-border flex items-center justify-center text-2xl hover:bg-cream-lighter transition-colors">
                  <span aria-hidden="true">{app.emoji}</span>
                </div>
                <span className="text-xs text-muted-foreground">{app.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Copier le lien */}
        <div className="px-4 pb-6 flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t('profile.shareSheet.copyLink')}</p>
          <div className="flex items-center gap-2 p-3 bg-cream border border-border rounded-xl">
            <p className="flex-1 text-sm text-foreground truncate">{profileUrl}</p>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? t('profile.shareSheet.copied') : 'Copier le lien'}
              className="shrink-0 size-8 flex items-center justify-center rounded-lg hover:bg-cream-lighter transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {copied ? (
                <Check className="size-4 text-teal-dark" aria-hidden="true" />
              ) : (
                <Copy className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Feedback copie */}
          {copied && (
            <p
              className="text-xs text-teal-dark text-center font-medium"
              role="status"
              aria-live="polite"
            >
              {t('profile.shareSheet.copied')}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
