/**
 * Profile — Page profil utilisateur
 *
 * Accessible via :
 *   /profile           → propre profil (connecté)
 *   /profile/:username → profil visiteur (autre utilisateur)
 *
 * Source de données :
 *  - Supabase configuré  → useProfile / useProfileByUsername (React Query)
 *  - Mode démo           → mockUsers (comportement inchangé)
 *
 * Note : ProfileDisplayData inclut des champs UI enrichis (badges, stats, weekProgress)
 * non encore stockés en DB. Ils sont construits avec des valeurs par défaut
 * jusqu'à l'implémentation du statsService (Sprint 4).
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile, useProfileByUsername } from '@/hooks/useProfile'
import { isSupabaseConfigured } from '@/lib/supabase'
import { mockUsers } from '@/data/mock/mockUsers'
import { mockPosts } from '@/data/mock/mockPosts'
import { HomeNavbar } from '@/components/home/HomeNavbar'
import { MobileBottomNav } from '@/components/home/MobileBottomNav'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import type { ProfileDisplayData } from '@/components/profile/ProfileHeader'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import { EditProfilePanel } from '@/components/profile/EditProfilePanel'
import { ShareProfileSheet } from '@/components/profile/ShareProfileSheet'
import type { Profile } from '@/types/database'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

// ─── Adaptateur Profile DB → ProfileDisplayData ───────────────────────────────
//
// Comble l'écart entre le type DB (flat) et le type UI (enrichi).
// Les champs sans équivalent DB (badges, species, streak, weekProgress)
// seront branchés sur statsService en Sprint 4.

function profileToDisplayData(profile: Profile): ProfileDisplayData {
  return {
    username: profile.username,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    banner_url: profile.banner_url,
    city: profile.city,
    region: profile.region,
    // Convertit string[] → { id, percent }[] pour l'affichage des badges intérêts
    interests: (profile.interests ?? []).map((id) => ({ id, percent: 0 })),
    instagram: profile.instagram,
    website: profile.website,
    followers_count: profile.followers_count,
    following_count: profile.following_count,
    created_at: profile.created_at,
    // Sprint 4 : badges, species, streak depuis statsService
    badges: [],
    stats: {
      observations: profile.posts_count,
      species: 0,
      streak: 0,
    },
  }
}

// ─── Skeleton chargement ──────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-cream-lighter" aria-busy="true">
      <HomeNavbar />
      <div className="w-full animate-pulse">
        <div className="h-40 bg-muted w-full" />
        <div className="max-w-2xl mx-auto px-4 -mt-8 flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-muted border-4 border-cream-lighter" />
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-3 bg-muted rounded w-48" />
          <div className="flex gap-8 mt-2">
            <div className="h-10 w-16 bg-muted rounded" />
            <div className="h-10 w-16 bg-muted rounded" />
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { t } = useTranslation()
  const { username } = useParams<{ username: string }>()
  const { profile: authProfile } = useAuth()

  const isOwnProfile = !username || authProfile?.username === username

  // Panneaux superposés
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)

  // ── Requêtes Supabase (actives uniquement si configuré) ───────────────────

  // Propre profil : on a déjà authProfile depuis le contexte, on l'enrichit
  const { data: supabaseOwnProfile } = useProfile(
    isOwnProfile && isSupabaseConfigured ? authProfile?.id : undefined,
  )

  // Profil visiteur : cherche par username
  const {
    data: supabaseVisitorProfile,
    isLoading: isVisitorLoading,
    isError: isVisitorError,
  } = useProfileByUsername(
    !isOwnProfile && isSupabaseConfigured ? username : undefined,
  )

  // ── Sélection des données selon le mode ───────────────────────────────────

  let profileData: ProfileDisplayData | null = null
  let isLoading = false

  if (isSupabaseConfigured) {
    if (isOwnProfile) {
      // Propre profil : préfère la version fraîche de useProfile, fallback sur authProfile
      const source = supabaseOwnProfile ?? authProfile
      profileData = source ? profileToDisplayData(source as Profile) : null
    } else {
      isLoading = isVisitorLoading
      profileData = supabaseVisitorProfile ? profileToDisplayData(supabaseVisitorProfile) : null
    }
  } else {
    // Mode démo — comportement mock original
    profileData = isOwnProfile
      ? buildOwnProfile(authProfile)
      : buildVisitorProfile(username)
  }

  // Posts de cet utilisateur
  // TODO [S3] : remplacer par postService.getPostsByUser(profile.id) via useQuery
  const userPosts = mockPosts.filter((p) => p.author.name === profileData?.username)

  // Photos d'inspiration depuis mockUsers si disponible (champ non encore en DB)
  const mockUser = mockUsers.find((u) => u.username === profileData?.username)
  const inspirationPhotos = mockUser?.inspiration_photos ?? []

  /** Appelé par EditProfilePanel lors de la sauvegarde */
  function handleSave(data: Partial<ProfileDisplayData>) {
    // En mode Supabase, React Query invalidera automatiquement via useUpdateProfile
    // Pour le mode démo, on garde la mise à jour locale
    if (!isSupabaseConfigured) {
      // pas de setState ici car profileData vient des mocks — le composant re-render via authProfile
    }
    // Inutilisé en mode Supabase : useUpdateProfile dans EditProfilePanel gère la mutation
    void data
  }

  // ── États spéciaux ────────────────────────────────────────────────────────

  if (isLoading) return <ProfileSkeleton />

  if (isVisitorError || (!isLoading && !profileData && isSupabaseConfigured && !isOwnProfile)) {
    return (
      <div className="min-h-screen bg-cream-lighter flex flex-col">
        <HomeNavbar />
        <main id="main-content" className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <img src={hermineEmptyState} alt="" className="w-32 opacity-60" width={128} height={128} />
          <h1 className="text-xl font-bold text-foreground">{t('profile.userNotFound')}</h1>
          <p className="text-sm text-muted-foreground text-center">{t('profile.userNotFoundDesc')}</p>
          <Link to="/home" className="text-sm text-primary font-medium hover:underline">
            {t('profile.backToFeed')}
          </Link>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-cream-lighter flex flex-col">
        <HomeNavbar />
        <main id="main-content" className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <img src={hermineEmptyState} alt="" className="w-32 opacity-60" width={128} height={128} />
          <h1 className="text-xl font-bold text-foreground">{t('profile.userNotFound')}</h1>
          <p className="text-sm text-muted-foreground text-center">{t('profile.userNotFoundDesc')}</p>
          <Link to="/home" className="text-sm text-primary font-medium hover:underline">
            {t('profile.backToFeed')}
          </Link>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream-lighter">
      <HomeNavbar />

      <main id="main-content" className="flex-1 w-full pb-20 md:pb-6">
        <div className="w-full">
          <ProfileHeader
            profile={profileData}
            isOwnProfile={isOwnProfile}
            onEditProfile={() => setShowEditPanel(true)}
            onShare={() => setShowShareSheet(true)}
            onOptions={() => {/* TODO: menu options */}}
          />
        </div>

        <div className="w-full max-w-2xl mx-auto mt-2">
          <ProfileTabs
            profile={profileData}
            userPosts={userPosts}
            inspirationPhotos={inspirationPhotos}
          />
        </div>
      </main>

      <MobileBottomNav />

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

// ─── Helpers mode démo ────────────────────────────────────────────────────────

function buildOwnProfile(
  authProfile: ReturnType<typeof useAuth>['profile'],
): ProfileDisplayData | null {
  if (!authProfile) return null
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
