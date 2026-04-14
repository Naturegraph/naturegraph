/**
 * Profile — Page profil utilisateur
 *
 * Accessible via :
 *   /profile           → propre profil (connecté)
 *   /profile/:username → profil visiteur (autre utilisateur)
 *
 * Source de données : Supabase via useProfile / useProfileByUsername (React Query)
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

  // ── Requêtes Supabase ───────────────────────────────────────────────────

  // Propre profil : on a déjà authProfile depuis le contexte, on l'enrichit
  const { data: supabaseOwnProfile } = useProfile(isOwnProfile ? authProfile?.id : undefined)

  // Profil visiteur : cherche par username
  const {
    data: supabaseVisitorProfile,
    isLoading: isVisitorLoading,
    isError: isVisitorError,
  } = useProfileByUsername(!isOwnProfile ? username : undefined)

  // ── Sélection des données ─────────────────────────────────────────────────

  let profileData: ProfileDisplayData | null = null
  let isLoading = false

  if (isOwnProfile) {
    // Propre profil : préfère la version fraîche de useProfile, fallback sur authProfile
    const source = supabaseOwnProfile ?? authProfile
    profileData = source ? profileToDisplayData(source as Profile) : null
  } else {
    isLoading = isVisitorLoading
    profileData = supabaseVisitorProfile ? profileToDisplayData(supabaseVisitorProfile) : null
  }

  // TODO [BACKEND] — Brancher postService.getPostsByUser(profile.id) via useQuery
  const userPosts: import('@/components/home/FeedPost').MockPost[] = []

  // TODO [BACKEND] — Ajouter champ inspiration_photos dans la table profiles
  const inspirationPhotos: string[] = []

  /** Appelé par EditProfilePanel lors de la sauvegarde */
  function handleSave(data: Partial<ProfileDisplayData>) {
    // useUpdateProfile dans EditProfilePanel gère la mutation via React Query
    void data
  }

  // ── États spéciaux ────────────────────────────────────────────────────────

  if (isLoading) return <ProfileSkeleton />

  if (isVisitorError || (!isLoading && !profileData && !isOwnProfile)) {
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
            onOptions={() => {
              /* TODO: menu options */
            }}
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
