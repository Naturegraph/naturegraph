/**
 * Profile — Page profil utilisateur (own + visiteur)
 *
 * Routes :
 *   /profile          → profil de l'utilisateur connecté
 *   /profile/:username → profil visiteur (autre utilisateur)
 *
 * Utilise ProfileHeader et ProfileTabs comme sous-composants.
 * Les données proviennent du contexte auth (own) ou des mockUsers (visiteur).
 *
 * TODO [BACKEND] — Remplacer les mocks par :
 *   profileService.getProfileByUsername(username)
 *   postService.getPostsByUser(userId)
 */

import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { mockUsers } from '@/data/mockUsers'
import { mockPosts } from '@/data/mockPosts'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { t } = useTranslation()
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { profile: authProfile } = useAuth()

  // Déterminer le mode : own profile vs visiteur
  const isOwnProfile = !username || authProfile?.username === username

  // Construire les données du profil affiché
  const profileData = isOwnProfile ? buildOwnProfile(authProfile) : buildVisitorProfile(username)

  // Profil introuvable (visiteur avec username invalide)
  if (!profileData) {
    return (
      <div className="min-h-screen bg-cream-lighter flex flex-col items-center justify-center gap-4 px-4">
        <img src={hermineEmptyState} alt="" className="w-32 opacity-60" width={128} height={128} />
        <h1 className="text-xl font-bold text-foreground">{t('profile.userNotFound')}</h1>
        <p className="text-sm text-muted-foreground text-center">{t('profile.userNotFoundDesc')}</p>
        <Link to="/home" className="text-sm text-primary font-medium hover:underline">
          {t('profile.backToFeed')}
        </Link>
      </div>
    )
  }

  // Filtrer les posts de cet utilisateur par nom d'auteur
  const userPosts = mockPosts.filter((p) => p.author.name === profileData.username)

  return (
    <div className="min-h-screen bg-cream-lighter flex flex-col">
      {/* Header sticky avec bouton retour */}
      <header className="sticky top-0 z-40 bg-cream-lighter border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 md:px-6 h-14">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center size-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="size-5 text-foreground" aria-hidden="true" />
          </button>
          <h2 className="font-bold text-foreground truncate">{profileData.username}</h2>
        </div>
      </header>

      {/* Contenu principal */}
      <main
        id="main-content"
        className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col gap-6"
      >
        <ProfileHeader profile={profileData} isOwnProfile={isOwnProfile} />
        <ProfileTabs userPosts={userPosts} username={profileData.username} />
      </main>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Type unifié pour ProfileHeader */
interface ProfileDisplayData {
  username: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  city: string | null
  region: string | null
  interests: string[]
  instagram: string | null
  twitter: string | null
  website: string | null
  followers_count: number
  following_count: number
  created_at: string
  badges: string[]
  stats: { observations: number; species: number; streak: number }
}

/** Construit les données profil à partir du contexte auth */
function buildOwnProfile(
  authProfile: ReturnType<typeof useAuth>['profile'],
): ProfileDisplayData | null {
  if (!authProfile) return null

  // Récupérer le mockUser correspondant pour les stats enrichies
  const mockUser = mockUsers.find((u) => u.username === authProfile.username) ?? mockUsers[0]

  return {
    username: authProfile.username,
    bio: authProfile.bio,
    avatar_url: authProfile.avatar_url,
    banner_url: authProfile.banner_url,
    city: authProfile.city,
    region: authProfile.region,
    interests: authProfile.interests ?? [],
    instagram: authProfile.instagram,
    twitter: authProfile.twitter,
    website: authProfile.website,
    followers_count: authProfile.followers_count,
    following_count: authProfile.following_count,
    created_at: authProfile.created_at,
    badges: mockUser.badges,
    stats: mockUser.stats,
  }
}

/** Construit les données profil à partir des mockUsers */
function buildVisitorProfile(username: string | undefined): ProfileDisplayData | null {
  if (!username) return null
  const user = mockUsers.find((u) => u.username === username)
  if (!user) return null

  return {
    username: user.username,
    bio: "Passionné(e) de nature et d'observation de la biodiversité locale.",
    avatar_url: user.avatar,
    banner_url: user.banner,
    city: null,
    region: user.region,
    interests: [],
    instagram: null,
    twitter: null,
    website: null,
    followers_count: Math.floor(Math.random() * 200) + 20,
    following_count: Math.floor(Math.random() * 100) + 10,
    created_at: '2025-03-15T00:00:00Z',
    badges: user.badges,
    stats: user.stats,
  }
}
