/**
 * Profile — Page profil utilisateur
 *
 * Accessible via :
 *   /profile           → propre profil (connecté)
 *   /profile/:username → profil visiteur (autre utilisateur)
 *
 * Layout : même structure que Home (HomeNavbar + MobileBottomNav).
 * La bannière et le header vont de bord à bord sur mobile.
 * Le contenu (onglets) est contraint à max-w-2xl sur desktop.
 *
 * Vocabulaire Figma : Migrateurs = followers, Migrations = following, Migrer = follow.
 *
 * TODO [BACKEND] — Remplacer les mocks par :
 *   profileService.getProfileByUsername(username)
 *   postService.getPostsByUser(userId)
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { mockUsers } from '@/data/mock/mockUsers'
import { mockPosts } from '@/data/mock/mockPosts'
import { HomeNavbar } from '@/components/home/HomeNavbar'
import { MobileBottomNav } from '@/components/home/MobileBottomNav'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import type { ProfileDisplayData } from '@/components/profile/ProfileHeader'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import { EditProfilePanel } from '@/components/profile/EditProfilePanel'
import { ShareProfileSheet } from '@/components/profile/ShareProfileSheet'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { t } = useTranslation()
  const { username } = useParams<{ username: string }>()
  const { profile: authProfile } = useAuth()

  // Panneaux superposés
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)

  // Données du profil (own vs visiteur)
  const isOwnProfile = !username || authProfile?.username === username
  const [profileData, setProfileData] = useState<ProfileDisplayData | null>(
    isOwnProfile ? buildOwnProfile(authProfile) : buildVisitorProfile(username),
  )

  // Profil introuvable (visiteur avec username invalide)
  if (!profileData) {
    return (
      <div className="min-h-screen bg-cream-lighter flex flex-col">
        <HomeNavbar />
        <main
          id="main-content"
          className="flex-1 flex flex-col items-center justify-center gap-4 px-4"
        >
          <img
            src={hermineEmptyState}
            alt=""
            className="w-32 opacity-60"
            width={128}
            height={128}
          />
          <h1 className="text-xl font-bold text-foreground">{t('profile.userNotFound')}</h1>
          <p className="text-sm text-muted-foreground text-center">
            {t('profile.userNotFoundDesc')}
          </p>
          <Link to="/home" className="text-sm text-primary font-medium hover:underline">
            {t('profile.backToFeed')}
          </Link>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  // Posts de cet utilisateur (filtre par nom d'auteur sur les mocks)
  const userPosts = mockPosts.filter((p) => p.author.name === profileData.username)

  // Photos d'inspiration : depuis mockUsers si disponible
  const mockUser = mockUsers.find((u) => u.username === profileData.username)
  const inspirationPhotos = mockUser?.inspiration_photos ?? []

  /** Appelé par EditProfilePanel lors de la sauvegarde */
  function handleSave(data: Partial<ProfileDisplayData>) {
    setProfileData((prev) => (prev ? { ...prev, ...data } : prev))
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream-lighter">
      {/* ── Navbar ── */}
      <HomeNavbar />

      {/* ── Contenu principal ── */}
      <main id="main-content" className="flex-1 w-full pb-20 md:pb-6">
        {/* ProfileHeader : pleine largeur sur mobile pour la bannière */}
        <div className="w-full">
          <ProfileHeader
            profile={profileData}
            isOwnProfile={isOwnProfile}
            onEditProfile={() => setShowEditPanel(true)}
            onShare={() => setShowShareSheet(true)}
            onOptions={() => {
              /* TODO: menu options */
            }}
          />
        </div>

        {/* Onglets : contraints à max-w-2xl sur desktop */}
        <div className="w-full max-w-2xl mx-auto mt-2">
          <ProfileTabs
            profile={profileData}
            userPosts={userPosts}
            inspirationPhotos={inspirationPhotos}
          />
        </div>
      </main>

      {/* ── Navigation mobile ── */}
      <MobileBottomNav />

      {/* ── Panneaux superposés ── */}
      {showEditPanel && (
        <EditProfilePanel
          profile={profileData}
          onClose={() => setShowEditPanel(false)}
          onSave={handleSave}
        />
      )}

      {showShareSheet && (
        <ShareProfileSheet
          username={profileData.username}
          onClose={() => setShowShareSheet(false)}
        />
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Construit les données profil depuis le contexte auth (propre profil) */
function buildOwnProfile(
  authProfile: ReturnType<typeof useAuth>['profile'],
): ProfileDisplayData | null {
  if (!authProfile) return null

  // Enrichit avec les données mock correspondantes si disponible
  const mockUser = mockUsers.find((u) => u.username === authProfile.username) ?? mockUsers[0]

  return {
    username: authProfile.username,
    bio: authProfile.bio,
    avatar_url: authProfile.avatar_url,
    banner_url: authProfile.banner_url,
    city: authProfile.city,
    region: authProfile.region,
    interests: mockUser.interests,
    instagram: authProfile.instagram,
    website: authProfile.website,
    followers_count: authProfile.followers_count || mockUser.followers_count,
    following_count: authProfile.following_count || mockUser.following_count,
    created_at: authProfile.created_at,
    badges: mockUser.badges,
    stats: mockUser.stats,
    weekProgress: mockUser.weekProgress,
  }
}

/** Construit les données profil depuis les mockUsers (profil visiteur) */
function buildVisitorProfile(username: string | undefined): ProfileDisplayData | null {
  if (!username) return null
  const user = mockUsers.find((u) => u.username === username)
  if (!user) return null

  return {
    username: user.username,
    bio: user.bio,
    avatar_url: user.avatar,
    banner_url: user.banner,
    city: user.city,
    region: user.region,
    interests: user.interests,
    instagram: user.instagram,
    website: user.website,
    followers_count: user.followers_count,
    following_count: user.following_count,
    created_at: user.created_at,
    badges: user.badges,
    stats: user.stats,
    weekProgress: user.weekProgress,
  }
}
