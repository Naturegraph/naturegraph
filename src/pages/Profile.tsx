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
import { usePageTitle } from '@/hooks/usePageTitle'
import { useProfile, useProfileByUsername, useUpdateProfile } from '@/hooks/useProfile'
import { useUserPosts } from '@/hooks/usePost'
import { useSavedPostsPage } from '@/hooks/useSavedPosts'
import { useToast } from '@/contexts/ToastContext'
import { HomeNavbar } from '@/components/home/HomeNavbar'
import { MobileNavLayer } from '@/components/home/MobileNavLayer'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import type { ProfileDisplayData } from '@/components/profile/ProfileHeader'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import { ProfileAboutCard } from '@/components/profile/ProfileAboutCard'
import { ProfileDNACard } from '@/components/profile/ProfileDNACard'
import { EditProfilePanel } from '@/components/profile/EditProfilePanel'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
// SharePopover du feed réutilisé pour cohérence (Nicolas 2026-05-01).
import { SharePopover } from '@/components/home/SharePopover'
import { postFeedItemToMockPost } from '@/components/home/FeedSection'
import type { MockPost } from '@/components/home/FeedPost'
import type { Profile } from '@/types/database'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

// ─── Adaptateur Profile DB → ProfileDisplayData ───────────────────────────────
//
// Comble l'écart entre le type DB (flat) et le type UI (enrichi).
// Les champs sans équivalent DB (badges, species, streak, weekProgress)
// seront branchés sur statsService en Sprint 4.

function profileToDisplayData(profile: Profile): ProfileDisplayData {
  return {
    id: profile.id,
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
    // Objectif observations hebdomadaire — colonne week_goal de la DB
    // (Nicolas 2026-05-22). `current` = 0 jusqu'à ce que le statsService
    // calcule l'avancement réel cette semaine.
    weekProgress: {
      current: 0,
      goal: (profile as Profile & { week_goal?: number | null }).week_goal ?? 5,
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
      <MobileNavLayer />
    </div>
  )
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { t } = useTranslation()
  const { username } = useParams<{ username: string }>()
  const { profile: authProfile, refreshProfile } = useAuth()

  // BATCH 10 / QW-UX1 : titre dynamique pour onglet navigateur
  // (utilise le username quand on visite un profil tiers, sinon "Profil").
  usePageTitle(username ? `@${username}` : t('nav.profile'))

  // Sécurité : un visiteur déconnecté ne doit JAMAIS être traité comme owner.
  // Auparavant `!username || authProfile?.username === username` → un user
  // déconnecté visitant /profile (sans username) tombait à `true`.
  // Maintenant : owner ssi auth ET (URL sans username OU username matche).
  const isOwnProfile = Boolean(authProfile && (!username || authProfile.username === username))

  // Panneaux superposés
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)

  // ── Hooks Supabase ────────────────────────────────────────────────────────
  // Tous les hooks DOIVENT être appelés inconditionnellement (rules of hooks).
  // Les queries sont gérées via `enabled: !!id` — pas d'appel réseau si l'ID
  // n'est pas encore connu.
  const { data: supabaseOwnProfile } = useProfile(isOwnProfile ? authProfile?.id : undefined)
  const {
    data: supabaseVisitorProfile,
    isLoading: isVisitorLoading,
    isError: isVisitorError,
  } = useProfileByUsername(!isOwnProfile ? username : undefined)

  // Toast pour feedback succès / erreur (handleSave et autres mutations).
  const toast = useToast()
  const updateProfileMutation = useUpdateProfile(authProfile?.id ?? '')

  // ── Sélection des données profil ──────────────────────────────────────────

  let profileData: ProfileDisplayData | null = null
  let profileId: string | undefined
  let isLoading = false

  if (isOwnProfile) {
    // Propre profil : préfère la version fraîche de useProfile, fallback sur authProfile
    const source = supabaseOwnProfile ?? authProfile
    profileData = source ? profileToDisplayData(source as Profile) : null
    profileId = (source as Profile | null | undefined)?.id
  } else {
    isLoading = isVisitorLoading
    profileData = supabaseVisitorProfile ? profileToDisplayData(supabaseVisitorProfile) : null
    profileId = supabaseVisitorProfile?.id
  }

  // ── Posts publiés par cet utilisateur (onglet "Journal nature") ───────────
  // Tri chronologique inverse, limite 20. RLS : seuls les posts publics et
  // publiés sont retournés (cohérent avec le feed home).
  const { data: userPostsRaw } = useUserPosts(profileId)
  const userPosts: MockPost[] = (userPostsRaw ?? []).map((p, i) => postFeedItemToMockPost(p, i))

  // ── Calcul ADN d'observateur ──────────────────────────────────────────────
  // Pourcentages calculés côté client depuis les posts réels (taxonomic_group)
  // — Nicolas 2026-05-24 : sans ça, la card ADN affichait toujours « Aucune
  // observation » car les `percent` étaient hardcodés à 0. Désormais la
  // première observation déclenche l'apparition d'une barre.
  if (profileData && userPostsRaw && userPostsRaw.length > 0) {
    const counts = new Map<string, number>()
    for (const p of userPostsRaw) {
      const g = p.taxonomic_group ?? 'other'
      counts.set(g, (counts.get(g) ?? 0) + 1)
    }
    const total = userPostsRaw.length
    // On garde les intérêts déclarés à l'onboarding ET on ajoute les groupes
    // observés effectivement mais non déclarés (utile : un user peut observer
    // des oiseaux sans l'avoir coché à l'onboarding). Tri par % décroissant
    // côté ProfileDNACard.
    const declared = new Set(profileData.interests.map((i) => i.id))
    const merged: typeof profileData.interests = profileData.interests.map((i) => ({
      id: i.id,
      percent: Math.round(((counts.get(i.id) ?? 0) / total) * 100),
    }))
    for (const [id, count] of counts) {
      if (!declared.has(id)) {
        merged.push({ id, percent: Math.round((count / total) * 100) })
      }
    }
    profileData = { ...profileData, interests: merged }
  }

  // ── Posts sauvegardés (onglet "Collection") ───────────────────────────────
  // Visible uniquement sur le propre profil (RLS saved_posts owner-only).
  // Pour un visiteur on retourne tableau vide → ProfileTabs masque l'onglet.
  const { data: savedPostsResult } = useSavedPostsPage(1, 20)
  const savedPosts: MockPost[] = isOwnProfile
    ? (savedPostsResult?.data ?? []).map((p, i) => postFeedItemToMockPost(p, i))
    : []

  /**
   * Appelé par EditProfilePanel lors de la sauvegarde (mode owner uniquement).
   * Mappe les champs ProfileDisplayData → UpdateProfilePayload et déclenche
   * la mutation. Cache React Query mis à jour automatiquement par le hook.
   */
  async function handleSave(data: Partial<ProfileDisplayData>) {
    if (!authProfile?.id) return
    try {
      await updateProfileMutation.mutateAsync({
        username: data.username,
        bio: data.bio ?? undefined,
        city: data.city ?? undefined,
        region: data.region ?? undefined,
        instagram: data.instagram ?? undefined,
        website: data.website ?? undefined,
        // `null` autorisé pour supprimer la photo (cas EditPhotoTab Supprimer).
        avatar_url: data.avatar_url === undefined ? undefined : data.avatar_url,
        banner_url: data.banner_url === undefined ? undefined : data.banner_url,
        // `interests` peut venir de EditPrefsTab (sélection des centres d'intérêt)
        interests: data.interests?.map((i) => i.id),
        // Objectif hebdo — propagé depuis EditInfoTab.weekProgress.goal
        // (la colonne DB s'appelle `week_goal`, pas `weekProgress`).
        week_goal: data.weekProgress?.goal,
      })
      // Nicolas 2026-05-25 : sync le state AuthContext.profile (utilise par
      // HomeNavbar, MobileBottomNav, ProfileMenu pour l avatar). Sans ca, le
      // nouvel avatar/banner ne s affiche pas dans la nav apres upload.
      await refreshProfile()
      toast.success(t('profile.edit.saveSuccess', { defaultValue: 'Profil mis à jour' }))
    } catch (err) {
      console.error('[Profile] update failed', err)
      toast.error(
        t('profile.edit.saveError', {
          defaultValue: "Impossible d'enregistrer pour l'instant.",
        }),
        err instanceof Error ? err.message : undefined,
      )
    }
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
        <MobileNavLayer />
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
        <MobileNavLayer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream-lighter">
      <HomeNavbar />

      <main id="main-content" className="flex-1 w-full pb-20 md:pb-6">
        {/* Header pleine largeur */}
        <ProfileHeader
          profile={profileData}
          isOwnProfile={isOwnProfile}
          onEditProfile={() => setShowEditPanel(true)}
          onSettings={() => setShowSettingsPanel(true)}
          onShare={() => setShowShareSheet(true)}
        />

        {/* Container principal — même structure que la branche mock pour
            que le rendu prod soit identique au mock (cards About+DNA visibles
            sur desktop, tabs alignées via md:px-12). */}
        <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 mt-6">
          {/* Cards "À propos" + "ADN observateur" — DESKTOP UNIQUEMENT.
              Sur mobile + tablette ces cards sont rendues à l'intérieur du tab "À propos".
              BATCH 114 : md→lg pour ne pas écraser sur iPad portrait (768px). */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_320px] gap-4 mb-6 lg:px-12 items-start">
            <ProfileAboutCard profile={profileData} />
            <ProfileDNACard interests={profileData.interests} />
          </div>

          {/* Tabs (4 desktop / 5 mobile avec "À propos") + contenu actif */}
          <div className="md:px-12">
            <ProfileTabs
              profileId={profileId ?? ''}
              profile={profileData}
              userPosts={userPosts}
              savedPosts={savedPosts}
              isOwnProfile={isOwnProfile}
            />
          </div>
        </div>
      </main>

      <MobileNavLayer />

      {showEditPanel && (
        <EditProfilePanel
          profile={profileData}
          onClose={() => setShowEditPanel(false)}
          onSave={handleSave}
        />
      )}

      {showSettingsPanel && <SettingsPanel onClose={() => setShowSettingsPanel(false)} />}

      {showShareSheet && (
        <SharePopover
          shareUrl={`${window.location.origin}/profile/${profileData.username}`}
          title={`Découvre le profil de @${profileData.username} sur Naturegraph`}
          onClose={() => setShowShareSheet(false)}
        />
      )}
    </div>
  )
}
