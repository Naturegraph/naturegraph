/**
 * ProfileHeader : En-tête de la page profil (desktop horizontal / mobile centré)
 * ============================================================================
 *
 * Design Figma (visiteur) :
 *  - Desktop (6385:74429) : banner + AVATAR à GAUCHE chevauchant la banner,
 *    username + stats à droite alignés à gauche, boutons d'action collés à
 *    droite (Migrer / Partager / Options). Pas de tab "À propos" sur desktop.
 *  - Mobile (6385:70500)  : banner + avatar CENTRÉ chevauchant, username
 *    centré, stats centrées, boutons centrés en row. Tab "À propos" présent.
 *
 * Modes :
 *  - isOwnProfile = true  → boutons "Modifier" (Pencil, primary) + "Paramètres"
 *                            (Settings, outlined). Pas de menu options ni partage
 *                            ici : les paramètres ouvrent un panel dédié.
 *  - isOwnProfile = false → bouton "Migrer" / "Tu migres avec" + partage + options
 *
 * Figma owner : 6385:77470 (desktop) / 6385:77493 (boutons détaillés).
 *
 * Les callbacks onEditProfile, onShare, onOptions, onSettings sont gérés
 * dans Profile.tsx.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Share2, MoreHorizontal, TreeDeciduous, Settings } from 'lucide-react'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { ImagePresets } from '@/lib/supabaseImage'
import { getBadgeEmoji } from '@/utils/badgeHelpers'
import { ProfileOptionsMenu } from './ProfileOptionsMenu'
import { useIsFollowing, useToggleFollow } from '@/hooks/useFollow'
import { useToast } from '@/contexts/ToastContext'
import { safeDetail } from '@/lib/sanitizeError'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Données minimales nécessaires pour afficher l'en-tête du profil */
export interface ProfileDisplayData {
  /** UUID du profil, requis pour le block via ProfileOptionsMenu */
  id: string
  username: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  city: string | null
  region: string | null
  interests: Array<{ id: string; percent: number }>
  instagram: string | null
  /** NG-011 V1.1.3 : optionnel pour back-compat avec les composants qui
   *  construisent ProfileDisplayData sans ce champ (legacy + mocks). */
  facebook?: string | null
  website: string | null
  followers_count: number
  following_count: number
  created_at: string
  badges: string[]
  stats: { observations: number; species: number; streak: number }
  weekProgress?: { current: number; goal: number }
}

interface ProfileHeaderProps {
  profile: ProfileDisplayData
  isOwnProfile: boolean
  /** Owner only : ouvre le panel de modification du profil */
  onEditProfile?: () => void
  /** Owner only : ouvre la page / panel de paramètres compte (notifs, langue, etc.) */
  onSettings?: () => void
  /** Visiteur uniquement : ouvre le SharePopover */
  onShare?: () => void
  /** Visiteur uniquement : ouvre le menu options (block / report / copy link) */
  onOptions?: () => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ProfileHeader({
  profile,
  isOwnProfile,
  onEditProfile,
  onSettings,
  onShare,
  onOptions,
}: ProfileHeaderProps) {
  const { t } = useTranslation()
  const toast = useToast()
  // Follow state, source de verite serveur via useIsFollowing (refletant les
  // mutations toggleFollow + invalidations en cascade). Le state local
  // useState(false) precedent ne persistait rien et donnait l illusion d un
  // follow sans rien ecrire en base (Nicolas 2026-05-25, bug critique).
  const { data: isFollowing = false } = useIsFollowing(isOwnProfile ? undefined : profile.id)
  const toggleFollow = useToggleFollow()
  // Menu d'options (3 points) : ProfileOptionsMenu géré ici en local pour
  // que la position absolute soit relative au bouton (pas à Profile.tsx).
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)

  async function handleToggleFollow() {
    try {
      await toggleFollow.mutateAsync({
        targetUserId: profile.id,
        currentlyFollowing: isFollowing,
      })
      toast.success(
        isFollowing
          ? t('profile.unfollowSuccess', {
              username: profile.username,
              defaultValue: `Tu ne migres plus avec @${profile.username}.`,
            })
          : t('profile.followSuccess', {
              username: profile.username,
              defaultValue: `Tu migres maintenant avec @${profile.username}.`,
            }),
      )
    } catch (err) {
      toast.error(
        t('profile.followError', {
          defaultValue: 'Action impossible pour le moment, reessaie.',
        }),
        safeDetail(err),
      )
    }
  }

  const badgeEmoji = profile.badges.length > 0 ? getBadgeEmoji(profile.badges[0]) : null

  return (
    // Container : pas de padding latéral mobile pour que la bannière
    // s'étende edge-to-edge (Nicolas 2026-05-19 : le padding créait un
    // espace nul). Desktop garde le padding 24px + rounded-md.
    <div className="w-full max-w-[1440px] mx-auto md:px-6 md:pt-6">
      {/* ── Bannière ──
          Figma 6385:74435 : Rectangle 1465 = 1392×224 rounded.
          Hauteur fixe 224px sur desktop, plus courte sur mobile (h-44 = 176).
          Mobile : full-bleed (pas de coins arrondis), Desktop : rounded-md. */}
      <div className="h-44 md:h-56 relative overflow-hidden md:rounded-md bg-[var(--color-action-light)]">
        {profile.banner_url && (
          // Above-the-fold → loading="eager" + fetchpriority="high".
          // C'est le LCP de la page profil → on le charge en priorité.
          // Supabase Pro : preset banner servit en ~1200px (au lieu de la full res).
          <img
            src={ImagePresets.banner(profile.banner_url)}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        )}
      </div>

      {/* ── Contenu sous la bannière ──
          Desktop : avatar à x=48 (px-12), overlap 56px sur banner.
          Info+actions row commence 24px (md:mt-6) sous la bannière, donc
          PAS aligné au bas de l'avatar (Figma : info y=248 vs avatar y=168
          → info commence 80px après le top de l'avatar).
          Mobile : avatar centré, overlap ~48px sur banner.
          Le padding mobile (px-4) est sur ce wrapper et plus sur le parent
          pour que seule la bannière soit edge-to-edge. */}
      <div className="relative px-4 md:px-0">
        <div className="relative flex flex-col md:flex-row md:items-start md:gap-6 md:px-12">
          {/* Avatar : chevauche la bannière (margin top négative)
              Desktop : aligné à gauche px-12 (48px), taille 128px, overlap 56px
              Mobile  : centré, taille 96px, overlap 48px */}
          <div className="-mt-12 md:-mt-14 self-center md:self-start shrink-0">
            <div className="relative">
              <div className="size-24 md:size-32 rounded-full border-4 border-cream-lighter overflow-hidden bg-primary-light shadow-sm">
                {/* Above-the-fold : eager + fetchpriority high pour LCP.
                    Supabase Pro : preset avatarLarge (192px) pour le 128px DOM (retina x2).
                    V1.1.4 : onError fallback hermine si URL invalide / fichier supprime
                    (cas Patosz remonte par Nicolas 2026-06-01). */}
                <img
                  src={
                    profile.avatar_url ? ImagePresets.avatarLarge(profile.avatar_url) : hermineIcon
                  }
                  alt={t('home.profile.avatarAlt', { name: profile.username })}
                  className="size-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                  onError={(e) => {
                    const img = e.currentTarget
                    if (img.src !== hermineIcon) img.src = hermineIcon
                  }}
                />
              </div>
              {/* Badge : Figma 6385:74513 : Container 32×32 à x=144 y=96 (relatif
                  à Frame 8). L'avatar étant à x=48, le badge est positionné
                  flush bottom-right de l'avatar (96+32 = 128 = avatar size). */}
              {badgeEmoji && (
                <div
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 bg-cream-lighter rounded-full size-7 md:size-8 flex items-center justify-center shadow-sm border border-border"
                >
                  <span className="text-base leading-none">{badgeEmoji}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bloc infos (username + stats) + bloc actions
              Desktop : flex-row entre infos (gauche) et actions (droite),
                        alignés au TOP (Figma 6385:74452 : Frame 4738 à y=0
                        donc collé en haut du info-block).
              Mobile  : tout centré en colonne
              md:mt-6 = 24px d'espace sous la bannière (Figma 6385:74440 :
              info content commence à y=248, banner se termine à y=224 → +24px). */}
          <div className="flex-1 flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4 mt-3 md:mt-6">
            {/* Infos textuelles */}
            <div className="flex flex-col items-center md:items-start gap-1.5">
              {/* Title/H3 = 32px Quicksand Bold STRICT (Figma var Titles/Subtitle/Size = 32).
                  Tailwind text-3xl = 30px → on utilise une valeur arbitraire pour
                  respecter la spec exacte du DS. */}
              <h1 className="font-title font-bold text-2xl md:text-[2rem] text-foreground leading-tight">
                {profile.username}
              </h1>
              {/* Stats : séparateur vertical (Figma 6385:74448 = ligne 1×28px) */}
              <div className="flex items-center gap-3 text-sm text-foreground">
                <span>
                  <strong className="font-bold">{profile.followers_count}</strong>{' '}
                  <span className="text-muted-foreground">{t('profile.migrateurs')}</span>
                </span>
                <span aria-hidden="true" className="h-5 w-px bg-border" />
                <span>
                  <strong className="font-bold">{profile.following_count}</strong>{' '}
                  <span className="text-muted-foreground">{t('profile.migrations')}</span>
                </span>
              </div>
            </div>

            {/* Boutons d'action : alignés en haut sur desktop (self-start) */}
            <div className="flex items-center gap-2 self-center md:self-start">
              {isOwnProfile ? (
                /* ── Owner : [Modifier] (primary) + [Paramètres] (outlined) ──
                   Figma 6385:77493 : boutons texte+icône, pas de menu 3-pts.
                   Les actions block/report/copy-link n'ont pas de sens sur son
                   propre profil → on les retire complètement. */
                <>
                  <button
                    type="button"
                    onClick={onEditProfile}
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    {t('profile.editProfile', { defaultValue: 'Modifier' })}
                  </button>
                  <button
                    type="button"
                    onClick={onSettings}
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-background border-[0.5px] border-border text-foreground text-sm font-bold hover:border-primary hover:text-[var(--color-link)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Settings className="size-4" aria-hidden="true" />
                    {t('profile.settings', { defaultValue: 'Paramètres' })}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={toggleFollow.isPending}
                    aria-pressed={isFollowing}
                    aria-busy={toggleFollow.isPending}
                    className={`flex items-center gap-2 h-10 px-5 rounded-full text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      isFollowing
                        ? 'bg-cream-lighter border border-border text-foreground hover:bg-cream'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    }`}
                  >
                    <TreeDeciduous className="size-4" aria-hidden="true" />
                    {isFollowing ? t('profile.migrating') : t('profile.migrer')}
                  </button>
                  <button
                    type="button"
                    onClick={onShare}
                    aria-label={t('profile.share')}
                    className="size-10 flex items-center justify-center rounded-full border border-border hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Share2 className="size-4 text-foreground" aria-hidden="true" />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu((v) => !v)
                        onOptions?.()
                      }}
                      aria-label={t('profile.options')}
                      aria-expanded={showOptionsMenu}
                      aria-haspopup="menu"
                      className="size-10 flex items-center justify-center rounded-full border border-border hover:bg-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <MoreHorizontal className="size-4 text-foreground" aria-hidden="true" />
                    </button>
                    {showOptionsMenu && (
                      <ProfileOptionsMenu
                        userId={profile.id}
                        username={profile.username}
                        isOwnProfile={false}
                        onClose={() => setShowOptionsMenu(false)}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
