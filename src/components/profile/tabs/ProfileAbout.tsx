/**
 * ProfileAbout — Onglet "À propos" du profil
 *
 * Deux cartes :
 *  1. "À propos" : bio, date d'inscription, liens sociaux (globe, instagram)
 *  2. "ADN de l'observateur" : barres de progression par centre d'intérêt,
 *     triées par pourcentage décroissant
 *
 * Utilise INTEREST_CONFIG pour les labels et emojis.
 */

import { useTranslation } from 'react-i18next'
import { UserRound, Globe, Instagram, Dna } from 'lucide-react'
import type { ProfileDisplayData } from '../ProfileHeader'
import { INTEREST_CONFIG } from '@/data/mockUsers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileAboutProps {
  /** Données complètes du profil */
  profile: ProfileDisplayData
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Affiche les informations "À propos" et l'"ADN de l'observateur"
 * sous forme de deux cartes empilées.
 */
export function ProfileAbout({ profile }: ProfileAboutProps) {
  const { t } = useTranslation()

  /** Date d'inscription formatée en "mois année" */
  const memberSinceDate = new Date(profile.created_at).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  /** Domaine extrait de l'URL du site (affichage court) */
  const websiteDomain = profile.website
    ? profile.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
    : null

  /** Handle Instagram extrait de l'URL ou texte brut */
  const instagramHandle = profile.instagram
    ? profile.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, '').replace(/\/$/, '')
    : null

  /** Intérêts triés par pourcentage décroissant */
  const sortedInterests = [...profile.interests].sort((a, b) => b.percent - a.percent)

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {/* ── Carte À propos ── */}
      <div className="bg-cream-lighter border border-border rounded-card p-4 flex flex-col gap-3">
        {/* En-tête de carte */}
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">{t('profile.about.title')}</h2>
        </div>

        {/* Bio */}
        {profile.bio && <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>}

        {/* Date d'inscription */}
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden="true">🦅</span>
          {t('profile.about.memberSince', { date: memberSinceDate })}
        </p>

        {/* Liens sociaux */}
        {(profile.website || profile.instagram) && (
          <div className="flex flex-col gap-1.5">
            {profile.website && websiteDomain && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Globe className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{websiteDomain}</span>
              </a>
            )}
            {instagramHandle && (
              <a
                href={`https://instagram.com/${instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">@{instagramHandle}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Carte ADN de l'observateur ── */}
      {sortedInterests.length > 0 && (
        <div className="bg-cream-lighter border border-border rounded-card p-4 flex flex-col gap-3">
          {/* En-tête de carte */}
          <div className="flex items-center gap-2">
            <Dna className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">{t('profile.about.dna')}</h2>
          </div>

          {/* Barres de progression par intérêt */}
          <div className="flex flex-col gap-3" role="list" aria-label={t('profile.about.dna')}>
            {sortedInterests.map((interest) => {
              const config = INTEREST_CONFIG[interest.id]
              if (!config) return null

              return (
                <div key={interest.id} role="listitem" className="flex flex-col gap-1">
                  {/* Label + pourcentage */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <span aria-hidden="true">{config.emoji}</span>
                      {config.label}
                    </span>
                    <span className="text-muted-foreground font-medium">{interest.percent}%</span>
                  </div>

                  {/* Barre de progression */}
                  <div
                    className="h-1.5 rounded-full bg-border overflow-hidden"
                    role="progressbar"
                    aria-valuenow={interest.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${config.label} : ${interest.percent}%`}
                  >
                    <div
                      className="h-full rounded-full bg-teal-dark transition-all duration-500"
                      style={{ width: `${interest.percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
