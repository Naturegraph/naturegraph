/**
 * SharePopover : Modal de partage d'un post (second-agent/14)
 *
 * Design Figma 6385:99713 (desktop) / 6385:100360 (mobile) :
 *   - Modal centrée (desktop) ou bottom sheet (mobile)
 *   - Titre "Partager l'observation" + bouton X
 *   - Rangée de 4 services : WhatsApp, Instagram, Messenger, Gmail
 *   - Section "Copier le lien :" avec URL + bouton copy
 *
 * Note : Instagram n'a pas d'API publique de partage de lien : l'icône
 * redirige vers le profil utilisateur Instagram.com (à configurer plus tard).
 *
 * Accessibilité : role="dialog", aria-modal, focus initial sur X, Escape ferme.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Copy, Check } from 'lucide-react'

/*
 * Logos officiels des réseaux : Nicolas dépose les fichiers ici :
 *   src/assets/images/social/{whatsapp,instagram,messenger,gmail}.png
 * Format : PNG transparent 512×512 minimum recommandé.
 */
import whatsappLogo from '@/assets/images/social/whatsapp.png'
import instagramLogo from '@/assets/images/social/instagram.png'
import messengerLogo from '@/assets/images/social/messenger.png'
import gmailLogo from '@/assets/images/social/gmail.png'
import { buildPostPath } from '@/lib/postSlug'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SharePopoverProps {
  /** ID du post : si fourni (et que `shareUrl` ne l'est pas), construit
   *  l'URL canonique `/post/{slug}-{postId}`. Optionnel si `shareUrl` est fourni. */
  postId?: string
  /** URL custom à partager. Override `postId`. Utilisé pour partager
   *  d'autres entités (profil utilisateur, etc.). */
  shareUrl?: string
  /** Titre/objet : utilisé dans subject email & body de partage,
   *  ET comme base du slug URL si `species` est absent. */
  title: string
  /** Nom de l'espèce : fallback pour construire le slug URL si pas de titre. */
  species?: string | null
  /** Callback de fermeture */
  onClose: () => void
}

interface SocialIconProps {
  label: string
  href: string
  iconNode: React.ReactNode
}

// ─── Icônes : logos officiels via assets PNG (Figma 6385:100127) ────────────
// Les 4 logos sont en `src/assets/images/social/` (PNG transparents 512px).
// Source : logos officiels de marque importés par Nicolas (2026-05-01).

function SocialLogo({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="size-6 object-contain" loading="lazy" />
}

// ─── Sous-composant icône sociale ─────────────────────────────────────────────

function SocialIcon({ label, href, iconNode }: SocialIconProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-2 group focus-visible:outline-none"
    >
      {/*
        Pas de background coloré, mais une border neutre autour de l'icône
        (Figma 6385:100127). L'icône utilise sa couleur de marque.
      */}
      <span
        className={[
          'size-12 flex items-center justify-center rounded-full transition-all',
          'border border-border',
          'group-hover:scale-110 group-hover:border-primary/40',
          'group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2',
        ].join(' ')}
        aria-hidden="true"
      >
        {iconNode}
      </span>
      <span className="text-xs text-foreground">{label}</span>
    </a>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SharePopover({ postId, shareUrl, title, species, onClose }: SharePopoverProps) {
  const { t } = useTranslation()
  const [linkCopied, setLinkCopied] = useState(false)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Priorité : shareUrl explicite > URL canonique post avec slug > origin.
  // buildPostPath() préfixe l'UUID d'un slug humain pour les URLs partagées
  // (cf. src/lib/postSlug.ts) : rétro-compatible (l'UUID reste à la fin).
  const url =
    shareUrl ??
    (postId
      ? `${window.location.origin}${buildPostPath(postId, { title, species })}`
      : window.location.origin)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  // Focus initial + scroll lock
  useEffect(() => {
    closeBtnRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Escape ferme
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  function handleCopy() {
    navigator.clipboard.writeText(url).catch(() => {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 1800)
  }

  // ─── Configuration des services ──────────────────────────────────────────────

  const socials: SocialIconProps[] = [
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      iconNode: <SocialLogo src={whatsappLogo} alt="" />,
    },
    {
      label: 'Instagram',
      // Instagram n'a pas d'API publique de partage : ouvre le profil
      // (placeholder ; à remplacer par un deeplink mobile si app installée)
      href: 'https://www.instagram.com/',
      iconNode: <SocialLogo src={instagramLogo} alt="" />,
    },
    {
      label: 'Messenger',
      href: `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=0&redirect_uri=${encodedUrl}`,
      iconNode: <SocialLogo src={messengerLogo} alt="" />,
    },
    {
      label: 'Gmail',
      href: `https://mail.google.com/mail/?view=cm&fs=1&su=${encodedTitle}&body=${encodedUrl}`,
      iconNode: <SocialLogo src={gmailLogo} alt="" />,
    },
  ]

  // ─── Contenu partagé desktop / mobile ────────────────────────────────────────

  const content = (
    <>
      {/* Header : titre + close */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-foreground">
          {t('home.share.title', { defaultValue: "Partager l'observation" })}
        </h2>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-5 text-foreground" aria-hidden="true" />
        </button>
      </div>

      {/* Rangée des 4 réseaux */}
      <div className="flex items-start justify-around gap-2 mb-5">
        {socials.map((s) => (
          <SocialIcon key={s.label} {...s} />
        ))}
      </div>

      {/* Séparateur fin entre les icônes et la section copy (Figma 6385:100127) */}
      <hr className="border-border mb-5" />

      {/* Section copier le lien : label bold + URL inline + icône copy à droite */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-foreground">
          {t('home.share.copyLinkLabel', { defaultValue: 'Copier le lien :' })}
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="flex-1 text-xs text-muted-foreground truncate" title={url}>
            {url}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={
              linkCopied
                ? t('home.share.copied', { defaultValue: 'Lien copié !' })
                : t('home.share.copyLink', { defaultValue: 'Copier le lien' })
            }
            className="size-8 flex items-center justify-center rounded-md text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            {linkCopied ? (
              <Check className="size-4 text-green-600" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Desktop : modal centrée */}
      <div className="hidden md:flex fixed inset-0 z-[80] items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('home.share.title', { defaultValue: "Partager l'observation" })}
          className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6"
        >
          {content}
        </div>
      </div>

      {/* Mobile : bottom sheet positionné au-dessus de la MobileBottomNav
          (h-14 + safe-area) pour que toutes les actions restent tactiles. */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-[80] pb-[env(safe-area-inset-bottom)]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('home.share.title', { defaultValue: "Partager l'observation" })}
          className="bg-background rounded-t-2xl shadow-2xl px-5 pt-4 pb-5"
        >
          <div className="flex justify-center mb-3" aria-hidden="true">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          {content}
        </div>
      </div>
    </>
  )
}
