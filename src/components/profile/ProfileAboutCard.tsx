/**
 * ProfileAboutCard — Carte "À propos" du profil
 * ===============================================
 *
 * Design Figma 6385:74429 (desktop) / 6385:71694 (mobile, dans le tab) :
 *  - Icône silhouette teal + titre "À propos"
 *  - Bio multi-lignes
 *  - Date d'inscription (icône calendrier)
 *  - Liens externes (site web, Instagram) avec icônes
 *
 * Modes :
 *  - Desktop : rendu hors tab, à côté de ProfileDNACard en grid 2 cols
 *  - Mobile  : rendu dans le tab "À propos" (premier tab, prend toute la largeur)
 */

import { useTranslation } from 'react-i18next'
import { Calendar, Facebook, Globe, Instagram, UserRound } from 'lucide-react'
import type { ProfileDisplayData } from './ProfileHeader'
import { safeExternalUrl } from '@/lib/url'

interface ProfileAboutCardProps {
  profile: ProfileDisplayData
  /** Si true, padding réduit (utilisé dans le tab mobile) */
  compact?: boolean
}

/**
 * Formate "Migrateur depuis janvier 2026" à partir d'un ISO date.
 * Locale FR — à passer via i18n quand on aura plus de langues.
 */
/**
 * Garantit un href cliquable. Les liens sont stockes en URL complete depuis
 * V1.1.6, mais on reste tolerant si une ancienne valeur sans schema traine.
 */
function ensureHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

/** Libelle propre pour un site web : hostname sans "www.". */
function hostLabel(url: string): string {
  try {
    return new URL(ensureHttp(url)).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Libelle propre pour un reseau social : "@pseudo" derive du 1er segment de
 * path (ex: https://instagram.com/naturegraph -> @naturegraph). Fallback sur
 * le hostname si pas de segment exploitable.
 */
function handleLabel(url: string): string {
  try {
    const u = new URL(ensureHttp(url))
    const seg = u.pathname.split('/').filter(Boolean)[0]
    return seg ? `@${seg}` : u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function formatMemberSince(isoDate: string): string {
  const d = new Date(isoDate)
  const months = [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ]
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

export function ProfileAboutCard({ profile, compact = false }: ProfileAboutCardProps) {
  const { t } = useTranslation()
  const memberSince = formatMemberSince(profile.created_at)

  // NG-004 : garde-fou XSS/redirect. On ne rend un lien que si la valeur stockee
  // est une URL http(s) sure (les schemas dangereux comme javascript: -> null).
  const websiteHref = safeExternalUrl(profile.website)
  const instagramHref = safeExternalUrl(profile.instagram)
  const facebookHref = safeExternalUrl(profile.facebook)

  return (
    <section
      aria-labelledby="profile-about-heading"
      // Tokens Figma : rounded-md = Radius/M (12px), border-[0.5px] = Stroke/XS,
      // p = Grid/sp-16 ou sp-20, gap = Grid/sp-12.
      className={`bg-background rounded-md border-[0.5px] border-border ${
        compact ? 'p-4' : 'p-5'
      } flex flex-col gap-3`}
    >
      {/* Header card — Paragraph/Base 16px Bold (Figma 6385:74466 ; var
          Body/Bold/Size = 16). */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-8 rounded-full bg-[var(--color-highlight-primary)] text-[var(--color-text-inverse)] flex items-center justify-center shrink-0"
        >
          <UserRound className="size-5" />
        </span>
        <h2
          id="profile-about-heading"
          className="font-body font-bold text-base text-foreground leading-tight"
        >
          {t('profile.about.title', { defaultValue: 'À propos' })}
        </h2>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{profile.bio}</p>
      )}

      {/* Métadonnées — UNE SEULE ROW (Figma 6385:74468 = Frame w=514 h=23) :
          date d'inscription + lien site + lien Instagram, séparés par gap-x-6.
          Wrap autorisé sur petits écrans / cards étroites. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {/* Date d'inscription — texte muted (pas un lien) */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-[18px] shrink-0" aria-hidden="true" />
          <span>
            {t('profile.about.memberSince', {
              date: memberSince,
              defaultValue: 'Migrateur depuis {{date}}',
            })}
          </span>
        </div>

        {/* Lien site web — group entièrement en primary violet (icône + texte). */}
        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            <Globe className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="font-bold underline underline-offset-2">{hostLabel(websiteHref)}</span>
          </a>
        )}

        {/* Lien Instagram — group entièrement en primary violet (icône + texte). */}
        {instagramHref && (
          <a
            href={instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            <Instagram className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="font-bold underline underline-offset-2">
              {handleLabel(instagramHref)}
            </span>
          </a>
        )}

        {/* NG-011 (2026-05-31) : lien Facebook (Twitter retire, peu d usage naturaliste). */}
        {facebookHref && (
          <a
            href={facebookHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            <Facebook className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="font-bold underline underline-offset-2">
              {handleLabel(facebookHref)}
            </span>
          </a>
        )}
      </div>
    </section>
  )
}
