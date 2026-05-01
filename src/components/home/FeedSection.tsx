/**
 * FeedSection — Section centrale du feed
 *
 * Tabs : Récent · Populaire · Pour vous
 *   - Récent    : chronologique, accessible à tous
 *   - Populaire : tri par score d'engagement (30j), accessible à tous
 *   - Pour vous : personnalisé (intérêts + follows + localisation), connecté requis
 *     → non connecté : tab visible disabled + modale discovery douce au clic
 *
 * Source de données : Supabase via useFeed() (React Query → postService.getFeed())
 *
 * L'adaptateur postFeedItemToMockPost() fait le bridge entre PostFeedItem
 * (type DB) et MockPost (type UI). À supprimer quand FeedPost sera
 * refactorisé pour accepter PostFeedItem directement.
 */

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LayoutList, LayoutGrid, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FeedPost } from './FeedPost'
import { FeedGallery } from './FeedGallery'
import { FeedFilterPanel, DEFAULT_FILTERS } from './FeedFilterPanel'
import { ForYouDiscoveryModal } from './ForYouDiscoveryModal'
import type { FeedFilters } from './FeedFilterPanel'
import type { MockPost } from './FeedPost'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import { useSpecies } from '@/contexts/SpeciesContext'
import { useFeed, FEED_QUERY_KEY } from '@/hooks/useFeed'
import { useHiddenPostIds } from '@/hooks/useHiddenPosts'
import { useLocationCTA } from '@/hooks/useLocationCTA'
import { useToggleReaction } from '@/hooks/usePost'
import { LocationPermissionModal } from '@/components/location/LocationPermissionModal'
import { requestBrowserLocation } from '@/lib/location/geocoding'
import type { PostFeedItem, ReactionType } from '@/types/database'
import type { LocationFormData } from '@/types/location'
import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

/**
 * Tabs du feed — ordre : Récent · Populaire · Pour vous
 * "for-you" nécessite d'être connecté (tab disabled + modale discovery sinon)
 */
export type FeedTab = 'recent' | 'popular' | 'for-you'

// Source de vérité unique des emojis catégorie — second-agent/09.
// Tous les emojis du produit (onboarding, feed, contribute, badges, profil)
// passent par CATEGORY_EMOJIS dans @/utils/badgeHelpers — DRY + cohérence.
import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'

/** Fallback emoji pour la catégorie 'other' (absente de CATEGORY_EMOJIS). */
const OTHER_EMOJI = '✨'

/** Lookup tolérant — accepte tout TaxonomicGroup, retourne l'emoji officiel. */
function getTaxonomicEmoji(group: string | null | undefined): string {
  if (!group) return OTHER_EMOJI
  if (group in CATEGORY_EMOJIS) {
    return CATEGORY_EMOJIS[group as keyof typeof CATEGORY_EMOJIS]
  }
  return OTHER_EMOJI
}

// ─── Adaptateur PostFeedItem → MockPost ──────────────────────────────────────
//
// Bridge temporaire pour éviter de refactoriser FeedPost.
// À supprimer lors du refacto FeedPost vers PostFeedItem.

/**
 * Dérive le format d'affichage du post depuis le ratio width/height de la
 * cover. Seuils larges pour absorber les écarts EXIF :
 *   · ratio < 0.85 → portrait (3:4 letterboxé, fond clair)
 *   · ratio > 1.15 → 16:9 (cadre plein, object-cover)
 *   · sinon         → 1:1 (carré)
 * Sans dimensions connues → fallback 16:9 (l'historique du feed est en paysage).
 */
/**
 * Override déterministe du format pour le visuel feed (3 formats Figma) —
 * distribue paysage / portrait / carré sur les posts via un round-robin
 * simple. Conservé tant que la BDD n'a pas une variété de `display_format`.
 */
function pickTempFormat(index: number): MockPost['format'] {
  const FORMATS: MockPost['format'][] = ['16:9', 'portrait', '1:1']
  return FORMATS[index % FORMATS.length]
}

/**
 * Badge "préférence #1" affiché en bas-droite de l'avatar auteur
 * (second-agent/08). Mappe le premier centre d'intérêt sur l'emoji
 * de TAXONOMIC_GROUP_CONFIG. Retourne undefined si la liste est vide
 * ou indéfinie (rare — onboarding force au moins un choix).
 */
function getAuthorPreferenceEmoji(interests: string[] | undefined | null): string | undefined {
  if (!interests || interests.length === 0) return undefined
  const first = interests[0]
  return first in CATEGORY_EMOJIS
    ? CATEGORY_EMOJIS[first as keyof typeof CATEGORY_EMOJIS]
    : undefined
}

/** Formate une date ISO en format lisible (ex: "10/04/2026") */
function formatPostDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}

function postFeedItemToMockPost(item: PostFeedItem, index = 0): MockPost {
  const authorName = item.author
    ? `${item.author.first_name} ${item.author.last_name}`.trim() || item.author.username
    : 'Utilisateur'

  // Titre = première phrase de la description (max 80 chars) ou la description entière
  const firstSentence = item.description.split(/[.!?]/)[0].trim()
  const title =
    firstSentence.length > 0 ? firstSentence.slice(0, 80) : item.description.slice(0, 80)

  return {
    id: item.id,
    // Auteur du post — comparé à user.id côté parent pour `isOwnPost`
    // (second-agent/12 — menu adapté selon le contexte).
    authorId: item.user_id,
    // Règle globale (second-agent/04) : conditionne l'icône + couleur d'en-tête
    // dans FeedPost. Default = nature_encounter pour les rares posts legacy
    // qui auraient un type inconnu.
    postType: item.type === 'nature_instant' ? 'nature_instant' : 'nature_encounter',
    author: {
      name: authorName,
      avatar: item.author?.avatar_url ?? '',
      // Badge "préférence #1" — emoji du premier centre d'intérêt de l'auteur
      // (second-agent/08). Affiché en bas-droite de l'avatar dans FeedPost.
      badge: getAuthorPreferenceEmoji(
        (item.author as { interests?: string[] } | undefined)?.interests,
      ),
    },
    date: formatPostDate(item.created_at),
    // Règle de confidentialité (second-agent/29) :
    //  - Si `location_hidden = true` (défaut) → AUCUNE info location (pas même
    //    la région ou le pays). Le post n'affiche alors que la date.
    //  - Sinon → uniquement la **ville** (jamais l'adresse / lieu-dit / région /
    //    pays). La table `posts` stocke `city` calculée par reverse-geocoding
    //    serveur ; si elle est null on retombe sur rien (pas de fallback texte).
    location: item.location_hidden ? '' : (item.city ?? ''),
    title,
    content: item.description,
    weather: item.weather ?? undefined,
    timeOfDay: item.time_of_day ?? undefined,
    category: {
      icon: getTaxonomicEmoji(item.taxonomic_group),
      label: item.taxonomic_group ?? 'Autre',
    },
    // Pas de fallback hardcodé : si null, FeedPost gère via i18n
    // (second-agent/06 — règle catégorie + espèce unifiée).
    species: item.species_name ?? null,
    multipleObservations: item.multiple_observations ?? false,
    scientific_name: item.scientific_name ?? null,
    taxref_id: item.taxref_id ?? null,
    taxonomic_group: item.taxonomic_group ?? null,
    // Format Figma (Figma 6385:47324) — préférence utilisateur saisie à
    // l'étape 1 du formulaire de contribution. Fallback ratio-based si la
    // colonne est absente (legacy posts pré-migration 20260429).
    //
    // [TEMP — second-agent/01-feed-formats-temp-override.md]
    // Tant que tous les posts en BDD ont display_format='16:9', on alterne
    // les 3 formats sur l'id du post pour permettre la validation visuelle.
    // À RETIRER dès que la BDD contient des posts avec différents formats.
    format: pickTempFormat(index),
    // Valeur réelle (sera utilisée quand le TEMP sera retiré) :
    //   (item as { display_format?: MockPost['format'] }).display_format ??
    //   derivePostFormat(item.media?.[0]?.width, item.media?.[0]?.height)
    images: (item.media ?? []).map((m) => ({
      url: m.url,
      alt: m.alt ?? '',
      width: m.width ?? undefined,
      height: m.height ?? undefined,
    })),
    // Répartition par type — MVP : on isole la réaction de l'utilisateur courant
    // dans son propre bucket pour qu'elle s'affiche correctement (badge + couleur).
    // Le reste des likes est consolidé dans 'love' jusqu'à ce qu'un agrégat SQL
    // par type soit ajouté (post-MVP — vue matérialisée reactions_by_type).
    //
    // Bug fix (second-agent/10) : si userType === 'love', on ne doit PAS écraser
    // le compteur après l'avoir incrémenté de 1 — sinon il devient (total - 1)
    // ce qui peut donner 0 quand l'user est le seul à avoir liké.
    reactions: (() => {
      const total = item.likes_count
      const userType = item.user_reaction ?? null
      const buckets = { love: 0, admire: 0, fire: 0, wow: 0, curious: 0 }
      if (!userType || total === 0) {
        buckets.love = total
      } else if (userType === 'love') {
        // L'user a réagi avec love : tous les likes restent dans le bucket love
        buckets.love = total
      } else {
        // L'user a réagi avec un autre type : 1 dans son bucket, le reste dans love
        buckets[userType] = 1
        buckets.love = Math.max(0, total - 1)
      }
      return buckets
    })(),
    userReaction: item.user_reaction ?? null,
    totalReactions: item.likes_count,
    comments: item.comments_count,
  }
}

// ─── Skeleton de chargement ──────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="flex flex-col md:gap-4 gap-0" aria-busy="true" aria-label="Chargement du feed">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-background md:rounded-card rounded-none overflow-hidden animate-pulse"
        >
          <div className="p-4 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="h-2 bg-muted rounded w-1/4" />
            </div>
          </div>
          <div className="h-56 bg-muted mx-4 rounded-xl mb-4" />
          <div className="px-4 pb-4 space-y-2">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface FeedSectionProps {
  viewMode: 'list' | 'grid'
  onViewModeChange: (mode: 'list' | 'grid') => void
  showFilters: boolean
  onShowFiltersChange: (show: boolean) => void
  onHasActiveFiltersChange: (has: boolean) => void
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function FeedSection({
  viewMode,
  onViewModeChange,
  showFilters,
  onShowFiltersChange,
  onHasActiveFiltersChange,
}: FeedSectionProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { updateLocation, locationCoords } = useLocation()
  // Species Context Layer — filtre global activé depuis la recherche (PRD §3.4 / §6.1)
  const { activeSpecies, clearActiveSpecies } = useSpecies()
  const [activeTab, setActiveTab] = useState<FeedTab>('recent')
  const [filters, setFilters] = useState<FeedFilters>({ ...DEFAULT_FILTERS })
  const [page, setPage] = useState(1)

  // ─── Modale discovery "Pour vous" (non connecté) ──────────────
  // Affichée au clic sur "Pour vous" quand l'utilisateur n'est pas connecté.
  // Propose l'inscription sans forcer — CTA secondaire "Continuer à découvrir".
  const [showForYouModal, setShowForYouModal] = useState(false)

  /**
   * Clic sur un tab :
   *   - "Pour vous" non connecté → ouvre la modale discovery, reste sur Récent
   *   - sinon → change l'onglet normalement
   */
  const handleTabClick = useCallback(
    (tabId: FeedTab) => {
      if (tabId === 'for-you' && !isAuthenticated) {
        setShowForYouModal(true)
        return
      }
      setActiveTab(tabId)
    },
    [isAuthenticated],
  )

  /** Ferme la modale discovery et ramène sur Récent */
  const handleForYouModalClose = useCallback(() => {
    setShowForYouModal(false)
    setActiveTab('recent')
  }, [])

  // ─── CTA localisation (pour les utilisateurs connectés non-localisés) ─────
  // Modale affichée 1x/session — triggered depuis le tab "Pour vous"
  const { showModal, dismissModal } = useLocationCTA()

  /**
   * Handler "Activer" de la modale localisation — tente la géoloc navigateur.
   * Ferme la modale et sauvegarde la localisation si succès.
   */
  const handleActivateLocation = useCallback(async () => {
    dismissModal()
    const city = await requestBrowserLocation()
    if (city) {
      const locationData: LocationFormData = {
        city,
        radiusKm: 75,
        visibility: 'region',
        consentSource: 'browser',
      }
      await updateLocation(locationData).catch(() => {
        // Erreur non-bloquante — l'utilisateur peut réessayer depuis les Settings
      })
    }
  }, [dismissModal, updateLocation])

  // Map des onglets UI → paramètres postService
  const tabToServiceTab: Record<FeedTab, 'recent' | 'popular' | 'for_you'> = {
    recent: 'recent',
    popular: 'popular',
    'for-you': 'for_you',
  }

  // Construction du payload filtres → params backend
  // On omet shareTypes si les deux sont cochés (par défaut = tous types) pour
  // éviter des requêtes inutiles et une clé de cache qui change inutilement.
  const feedFilters = {
    categories: filters.categories,
    helpOnly: filters.helpOnly,
    shareTypes:
      filters.shareTypes.encounter && filters.shareTypes.instant ? undefined : filters.shareTypes,
    period: filters.period,
    radiusKm: filters.radius,
  }

  // useFeed — données Supabase via React Query, avec filtres appliqués
  const {
    data: feedData,
    isLoading: isFeedLoading,
    isError: isFeedError,
  } = useFeed(
    {
      tab: tabToServiceTab[activeTab],
      page,
      limit: 20,
      filters: feedFilters,
      // Pour vous : filtre côté serveur sur les utilisateurs suivis (follows).
      currentUserId: user?.id,
    },
    locationCoords,
  )

  // Comptage des filtres actifs — affiché en badge numérique sur l'icône entonnoir.
  // Règle : chaque groupe de filtre "modifié" par rapport au défaut compte pour 1.
  //  - Catégories : 1 si au moins une est sélectionnée
  //  - Demandes d'aide : 1 si cochée
  //  - Types de partage : 1 si l'un des deux est décoché (subset)
  //  - Rayon : 1 si différent de 0
  //  - Période : 1 si différente de 'all'
  const activeFiltersCount =
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.helpOnly ? 1 : 0) +
    (!filters.shareTypes.encounter || !filters.shareTypes.instant ? 1 : 0) +
    (filters.radius !== 0 ? 1 : 0) +
    (filters.period !== 'all' ? 1 : 0)
  const hasActiveFilters = activeFiltersCount > 0

  useEffect(() => {
    onHasActiveFiltersChange(hasActiveFilters)
  }, [hasActiveFilters, onHasActiveFiltersChange])

  // Remettre à la page 1 quand l'onglet ou les filtres changent (reset synchrone via useState).
  const [prevTab, setPrevTab] = useState(activeTab)
  if (prevTab !== activeTab) {
    setPrevTab(activeTab)
    setPage(1)
  }
  const filtersKey = JSON.stringify(filters)
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey)
  if (prevFiltersKey !== filtersKey) {
    setPrevFiltersKey(filtersKey)
    setPage(1)
  }

  const isLoading_ = isFeedLoading
  const isError_ = isFeedError

  // Filtrage côté client : masquer les posts cachés individuellement
  // (table hidden_posts) — second-agent/22. Les posts d'utilisateurs bloqués
  // sont déjà filtrés par les RLS DB (table blocks).
  const { data: hiddenIds } = useHiddenPostIds()
  const hiddenSet = new Set(hiddenIds ?? [])

  const posts: MockPost[] = (feedData?.data ?? [])
    .filter((item) => !hiddenSet.has(item.id))
    .map((item, idx) => postFeedItemToMockPost(item, idx))

  // Clé de cache du feed courant — passée au hook de réaction pour l'optimistic update
  // Doit inclure les filtres pour matcher exactement l'entrée cache de useFeed.
  const currentFeedQueryKey = FEED_QUERY_KEY({
    tab: tabToServiceTab[activeTab],
    page,
    limit: 20,
    filters: feedFilters,
    currentUserId: user?.id,
  })

  // ── Mutation réaction ──────────────────────────────────────────────────
  const reactionMutation = useToggleReaction(user?.id)

  /** Callback passé à chaque FeedPost — déclenche la mutation optimiste */
  function handleReact(postId: string, type: ReactionType) {
    const sourcePosts = feedData?.data ?? []
    const post = sourcePosts.find((p: PostFeedItem) => p.id === postId)
    reactionMutation.mutate({
      postId,
      type,
      currentReaction: post?.user_reaction ?? null,
      feedQueryKey: currentFeedQueryKey,
    })
  }

  /**
   * Ordre PRD validé : Récent · Populaire · Pour vous
   * "Pour vous" est toujours visible — disabled si non connecté (conversion).
   */
  const TABS: { id: FeedTab; label: string; requiresAuth: boolean }[] = [
    { id: 'recent', label: t('home.feed.recent'), requiresAuth: false },
    { id: 'popular', label: t('home.feed.popular'), requiresAuth: false },
    { id: 'for-you', label: t('home.feed.forYou'), requiresAuth: true },
  ]

  function handleResetFilters() {
    setFilters({ ...DEFAULT_FILTERS })
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <section aria-label="Feed des observations">
      {/*
       * Bannière Species Context Layer — visible quand une espèce est active (PRD §6.1).
       * Informe l'utilisateur que le feed est filtré + permet de revenir au feed global.
       */}
      {activeSpecies && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center gap-3 rounded-xl bg-primary-light border border-primary/20 px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {activeSpecies.common_name ?? activeSpecies.scientific_name}
            </p>
            <p className="text-xs text-muted-foreground italic truncate">
              {activeSpecies.scientific_name}
            </p>
          </div>
          <span className="text-xs text-primary font-medium shrink-0">Feed filtré</span>
          <button
            type="button"
            onClick={clearActiveSpecies}
            aria-label="Revenir au feed global"
            className="size-7 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            <X className="size-4 text-foreground" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Header tabs + contrôles — desktop seulement */}
      {/*
        Bandeau des tabs + contrôles vue/filtres — sticky pour rester accessible
        au scroll (second-agent/24).
        - top-[72px] : juste sous la HomeNavbar (header h-[72px] sticky top-0)
        - bg-background avec léger backdrop-blur pour lisibilité quand le feed
          défile derrière
        - z-30 : sous la navbar (z-40) mais au-dessus des cartes posts
        - py-2 -mx-4 px-4 : étend le fond pour couvrir la pleine largeur sans
          gap visible quand sticky
      */}
      <div className="hidden md:flex gap-3 items-center justify-between mb-4 sticky top-[72px] z-30 bg-cream-lighter/95 backdrop-blur-sm py-2 -mx-2 px-2 rounded-full">
        <div
          role="tablist"
          aria-label={t('home.feed.filterFeed')}
          className="relative rounded-full border-[0.5px] border-border"
        >
          <div className="flex items-center p-1">
            {TABS.map((tab) => {
              const isDisabled = tab.requiresAuth && !isAuthenticated
              const isActive = activeTab === tab.id && !isDisabled
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  aria-selected={isActive}
                  aria-disabled={isDisabled}
                  title={isDisabled ? t('home.feed.forYouModal.tabDisabledHint') : undefined}
                  className={[
                    'flex h-8 items-center justify-center gap-1.5 px-4 rounded-full transition-colors text-base',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : isDisabled
                        ? 'bg-transparent text-muted-foreground cursor-pointer opacity-60'
                        : 'bg-transparent text-foreground hover:bg-muted/50',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="relative rounded-full border-[0.5px] border-border">
          <div className="flex items-center gap-2 p-1">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-pressed={viewMode === 'list'}
              aria-label={t('home.feed.listView')}
              className={[
                'flex items-center justify-center rounded-full size-[34px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <LayoutList className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label={t('home.feed.gridView')}
              className={[
                'flex items-center justify-center rounded-full size-[34px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
            </button>
            <div aria-hidden="true" className="w-px h-5 bg-border" />
            <button
              type="button"
              onClick={() => onShowFiltersChange(true)}
              aria-label={t('home.feed.filterObs')}
              aria-expanded={showFilters}
              className={[
                'relative flex items-center justify-center rounded-full size-[34px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                showFilters
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <Filter className="size-4" aria-hidden="true" />
              {hasActiveFilters && (
                <span
                  aria-label={t('home.feed.activeFiltersCount', {
                    count: activeFiltersCount,
                    defaultValue: '{{count}} filtre(s) actif(s)',
                  })}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary-light text-primary text-[11px] font-bold leading-none border border-background"
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* État chargement */}
      {isLoading_ && <FeedSkeleton />}

      {/* État erreur */}
      {isError_ && (
        <div role="alert" className="bg-background md:rounded-card rounded-none p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('home.feed.loadError', {
              defaultValue: 'Impossible de charger le feed. Réessaie dans un instant.',
            })}
          </p>
        </div>
      )}

      {/* État vide */}
      {!isLoading_ && !isError_ && posts.length === 0 && (
        <div className="bg-background relative md:rounded-card rounded-none overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute md:border-border md:border-[0.5px] border-border border-b-4 inset-0 pointer-events-none md:rounded-card"
          />
          <div className="flex flex-col items-center gap-5 px-6 py-12 text-center">
            <img src={hermineEmptyState} alt="" className="w-48 opacity-80" aria-hidden="true" />
            <div className="flex flex-col gap-2 max-w-sm">
              <p className="text-lg font-bold text-foreground">{t('home.feed.emptyTitle')}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('home.feed.emptyDesc')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {/* Boutons alignés sur le design system : variant secondary (outline teal)
                  pour l'action secondaire et primary (violet solid) pour le CTA principal.
                  Effet btn-press 3D géré par le composant Button. */}
              {hasActiveFilters && (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  {t('home.feed.emptyReset')}
                </Button>
              )}
              {isAuthenticated ? (
                <Button variant="primary" size="sm" onClick={() => navigate('/contribute')}>
                  {t('home.feed.emptyContribute')}
                </Button>
              ) : (
                <Button variant="primary" size="sm" to="/signup">
                  {t('home.feed.guestLimitCreate')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Liste des posts */}
      {!isLoading_ && !isError_ && posts.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <FeedGallery posts={posts} />
          ) : (
            <div className="flex flex-col md:gap-4 gap-0">
              {posts.map((post) => (
                <FeedPost
                  key={post.id}
                  {...post}
                  canInteract={isAuthenticated}
                  isOwnPost={!!user?.id && post.authorId === user.id}
                  onReact={handleReact}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {feedData && feedData.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!feedData.pagination.hasPrevious}
                className="h-9 px-4 rounded-full border border-border text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('common.previous', { defaultValue: 'Précédent' })}
              </button>
              <span className="h-9 px-4 flex items-center text-sm text-muted-foreground">
                {page} / {feedData?.pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!feedData?.pagination.hasNext}
                className="h-9 px-4 rounded-full border border-border text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('common.next', { defaultValue: 'Suivant' })}
              </button>
            </div>
          )}
        </>
      )}

      {/* Panneau de filtres */}
      {showFilters && (
        <FeedFilterPanel
          filters={filters}
          onApply={setFilters}
          onClose={() => onShowFiltersChange(false)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Modale discovery "Pour vous" — visiteurs non connectés */}
      <ForYouDiscoveryModal isOpen={showForYouModal} onContinue={handleForYouModalClose} />

      {/* Modale permission géolocalisation — utilisateurs connectés non-localisés (1x/session) */}
      <LocationPermissionModal
        isOpen={showModal}
        onActivate={handleActivateLocation}
        onSkip={dismissModal}
      />
    </section>
  )
}

// Export de la clé de cache pour invalidation externe (ContributeForm)
export { FEED_QUERY_KEY }
