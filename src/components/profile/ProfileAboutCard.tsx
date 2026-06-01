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
import { Calendar, Globe, Instagram, Twitter, UserRound } from 'lucide-react'
import type { ProfileDisplayData } from './ProfileHeader'

interface ProfileAboutCardProps {
  profile: ProfileDisplayData
  /** Si true, padding réduit (utilisé dans le tab mobile) */
  compact?: boolean
}

/**
 * Formate "Migrateur depuis janvier 2026" à partir d'un ISO date.
 * Locale FR — à passer via i18n quand on aura plus de langues.
 */
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
        {profile.website && (
          <a
            href={
              profile.website.startsWith('http') ? profile.website : `https://${profile.website}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            <Globe className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="font-bold underline underline-offset-2">{profile.website}</span>
          </a>
        )}

        {/* Lien Instagram — group entièrement en primary violet (icône + texte). */}
        {profile.instagram && (
          <a
            href={`https://instagram.com/${profile.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            <Instagram className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="font-bold underline underline-offset-2">@{profile.instagram}</span>
          </a>
        )}

        {/* NG-011 (2026-05-31) : lien X / Twitter, meme pattern. */}
        {profile.twitter && (
          <a
            href={`https://x.com/${profile.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            <Twitter className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="font-bold underline underline-offset-2">@{profile.twitter}</span>
          </a>
        )}
      </div>
    </section>
  )
}
