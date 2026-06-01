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
import { LayoutList, LayoutGrid, Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui'
import { FeedPost } from './FeedPost'
import { FeedGallery } from './FeedGallery'
import { FeedFilterPanel, DEFAULT_FILTERS } from './FeedFilterPanel'
// BATCH 74 : ForYouDiscoveryModal supprime de la beta (decision Nicolas)
// import { ForYouDiscoveryModal } from './ForYouDiscoveryModal'
import type { FeedFilters } from './FeedFilterPanel'
import type { MockPost } from './FeedPost'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import { useSpecies } from '@/contexts/SpeciesContext'
import { useQueryClient } from '@tanstack/react-query'
import { useFeed, FEED_QUERY_KEY } from '@/hooks/useFeed'
import { useHiddenPostIds } from '@/hooks/useHiddenPosts'
import { useToggleReaction } from '@/hooks/usePost'
// LocationPermissionModal + useLocationCTA + requestBrowserLocation retirés
// de la Phase 1 (Nicolas 2026-05-19) — peu de données, modale prématurée.
// Réactiver Phase 2 quand le volume justifiera le CTA géoloc.
// import { useLocationCTA } from '@/hooks/useLocationCTA'
// import { LocationPermissionModal } from '@/components/location/LocationPermissionModal'
// import { requestBrowserLocation } from '@/lib/location/geocoding'
// import type { LocationFormData } from '@/types/location'
import type { PostFeedItem, ReactionType } from '@/types/database'
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
function derivePostFormat(width?: number, height?: number): MockPost['format'] {
  if (!width || !height) return '16:9'
  const ratio = width / height
  if (ratio < 0.85) return 'portrait'
  if (ratio > 1.15) return '16:9'
  return '1:1'
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

/**
 * Adaptateur PostFeedItem → MockPost (UI).
 *
 * Exporté pour être réutilisé dans `Profile.tsx` (onglet Journal nature) et
 * partout où on rend des posts via `<FeedPost>`. Évite de dupliquer la
 * logique de mapping (titre, location, format, reactions, etc.).
 */
export function postFeedItemToMockPost(item: PostFeedItem, _index = 0): MockPost {
  // Le pseudo (username) est la source de vérité pour l'affichage du nom
  // d'auteur — il suit instantanément les changements de pseudo via la
  // jointure DB profiles!user_id. On a abandonné la concat
  // « first_name + last_name » qui restait figée à l'ancienne valeur quand
  // le pseudo changeait (Nicolas 2026-05-24 : « pas logique »).
  // Si pour une raison rare le username est vide, fallback first/last.
  const authorName =
    item.author?.username?.trim() ||
    `${item.author?.first_name ?? ''} ${item.author?.last_name ?? ''}`.trim() ||
    'Utilisateur'

  // Titre : on PRIORISE le titre DB s'il existe (saisie utilisateur explicite).
  // Fallback : si pas de titre, premiere phrase de la description (max 80 chars).
  // Bug fix 2026-05-04 : avant on derivait toujours le titre de la description,
  // ce qui ignorait totalement le vrai titre saisi par l'utilisateur dans le
  // formulaire Encounter et donnait l'impression que les posts "se melangeaient".
  const explicitTitle = item.title?.trim() ?? ''
  let title: string
  if (explicitTitle.length > 0) {
    title = explicitTitle.slice(0, 80)
  } else {
    const firstSentence = item.description.split(/[.!?]/)[0].trim()
    title = firstSentence.length > 0 ? firstSentence.slice(0, 80) : item.description.slice(0, 80)
  }

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
      // `username` est la SOURCE DE VÉRITÉ pour les liens /profile/:username.
      // Récupéré via la jointure profiles!user_id donc toujours à jour — un
      // user qui change son pseudo voit instantanément ses anciens posts
      // pointer vers le bon nouveau profil (Nicolas 2026-05-24 bug fix).
      username: item.author?.username ?? '',
      avatar: item.author?.avatar_url ?? '',
      // Badge "préférence #1" — emoji du premier centre d'intérêt de l'auteur
      // (second-agent/08). Affiché en bas-droite de l'avatar dans FeedPost.
      badge: getAuthorPreferenceEmoji(
        (item.author as { interests?: string[] } | undefined)?.interests,
      ),
    },
    date: formatPostDate(item.created_at),
    // NG-009 (2026-05-31) : date reelle d observation, calculee uniquement si
    // elle differe vraiment du jour de publication (sinon FeedPost masque le
    // bloc pour ne pas dupliquer l info). encounter_date est stocke en YYYY-MM-DD
    // par le formulaire d encounter, created_at est un timestamp complet, donc
    // on compare uniquement la partie date.
    encounterDate: item.encounter_date
      ? item.encounter_date.slice(0, 10) !== item.created_at.slice(0, 10)
        ? formatPostDate(item.encounter_date)
        : undefined
      : undefined,
    // Règle de confidentialité (Nicolas 2026-05-24 — v3 mobile-friendly) :
    //  - location_hidden = true → uniquement le **pays** (« France », « Canada »)
    //    pour donner un repère biogéographique sans compromettre la vie privée.
    //  - location_hidden = false → « Ville, Région » (sans pays) pour tenir
    //    sur une ligne en mobile. Ex « Lévis, Québec » ou « Couëron, Pays de
    //    la Loire ». Si la région manque on retombe sur la ville seule, puis
    //    sur le pays en dernier recours.
    //  - Aucune donnée → chaîne vide → le bullet « date • lieu » disparaît.
    location: item.location_hidden
      ? (item.country ?? '')
      : Array.from(new Set([item.city, item.region].filter(Boolean))).join(', ') ||
        (item.country ?? ''),
    title,
    content: item.description,
    weather: item.weather ?? undefined,
    timeOfDay: item.time_of_day ?? undefined,
    habitat: item.habitat ?? undefined,
    category: {
      icon: getTaxonomicEmoji(item.taxonomic_group),
      label: item.taxonomic_group ?? 'Autre',
    },
    // Pas de fallback hardcodé : si null, FeedPost gère via i18n
    // (second-agent/06 — règle catégorie + espèce unifiée).
    species: item.species_name ?? null,
    // Nicolas 2026-05-22 : `posts.individuals_count` désormais en DB → on le
    // mappe directement (avant : toujours undefined faute de colonne). FeedPost
    // affiche un suffixe « (N) » sur le chip espèce quand > 1.
    individualsCount: (item as { individuals_count?: number }).individuals_count ?? undefined,
    scientific_name: item.scientific_name ?? null,
    taxref_id: item.taxref_id ?? null,
    taxonomic_group: item.taxonomic_group ?? null,
    // Format Figma (Figma 6385:47324) — préférence utilisateur saisie à
    // l'étape 1 du formulaire de contribution. Fallback ratio-based si la
    // colonne est absente (legacy posts pré-migration 20260429).
    //
    // 2026-05-04 : retrait du pickTempFormat (override round-robin temp) car
    // les utilisateurs reels ont maintenant des display_format distincts en DB.
    // L'override causait l'inversion paysage/carre dans le feed.
    format:
      ((item as { display_format?: MockPost['format'] }).display_format as
        | MockPost['format']
        | undefined) ??
      derivePostFormat(item.media?.[0]?.width ?? undefined, item.media?.[0]?.height ?? undefined),
    images: (item.media ?? []).map((m) => ({
      url: m.url,
      alt: m.alt ?? '',
      width: m.width ?? undefined,
      height: m.height ?? undefined,
    })),
    // Répartition réelle par type — agrégée serveur (Nicolas 2026-05-22).
    // Avant : approximation côté client qui dumpait tout dans `love` →
    // affichage incohérent (« ❤️ 3 » au lieu de « ❤️ 2 / 😱 1 »).
    // Maintenant : compteurs réels depuis la table `reactions`, calculés
    // dans `getReactionsBreakdown()` puis injectés par `useFeed`.
    reactions: (() => {
      const bd = item.reactions_breakdown
      return {
        love: bd?.love ?? 0,
        admire: bd?.admire ?? 0,
        fire: bd?.fire ?? 0,
        wow: bd?.wow ?? 0,
        curious: bd?.curious ?? 0,
      }
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
  /**
   * V1.1.4 QA round 4 : remontee du COMPTE de filtres actifs (0..N) pour
   * que la HomeNavbar puisse afficher un vrai badge chiffre coherent
   * desktop/mobile (au lieu d un simple point rond).
   */
  onHasActiveFiltersChange: (count: number) => void
  /** Callback pour ouvrir le panel "Rencontre Nature" depuis le CTA empty state.
   *  Géré au niveau Home (qui contrôle activePanelType). */
  onContributeClick?: () => void
  /**
   * Callback édition post — remonté à Home pour ouvrir le panel
   * Encounter/Instant pré-rempli avec les données du post existant
   * (Nicolas 2026-05-24 : permet aux users de corriger leurs obs).
   */
  onEditPost?: (postId: string, postType: 'nature_encounter' | 'nature_instant') => void
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function FeedSection({
  viewMode,
  onViewModeChange,
  showFilters,
  onShowFiltersChange,
  onHasActiveFiltersChange,
  onContributeClick,
  onEditPost,
}: FeedSectionProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  // updateLocation retiré avec la LocationPermissionModal (Phase 1) — n'est
  // plus déclenché qu'au signup/onboarding et via les Settings.
  // Nicolas 2026-05-22 : quand l'utilisateur est localisé, on applique
  // AUTOMATIQUEMENT son rayon de filtrage (sans qu'il doive ouvrir le panel
  // filtres). C'est le comportement attendu : « je suis localisé donc je
  // vois ce qui est autour de moi ». `locationDistance` (75-250 km) prend
  // le pas sur `filters.radius` (0 par défaut) si l'utilisateur est localisé.
  const { locationCoords, locationLabel, locationDistance } = useLocation()
  const isLocalized = !!(locationLabel && locationCoords)
  const queryClient = useQueryClient()
  // Species Context Layer, filtre global active depuis la recherche (PRD §3.4 / §6.1)
  // V1.1.4 : seule l espece passe par ce contexte. La categorie passe par
  // FeedFilters (panel filtres + badge compteur), cf. onSelectCategory plus bas.
  const { activeSpecies, clearActiveSpecies } = useSpecies()
  const [activeTab, setActiveTab] = useState<FeedTab>('recent')
  const [filters, setFilters] = useState<FeedFilters>({ ...DEFAULT_FILTERS })
  const [page, setPage] = useState(1)

  // BATCH 74 : suppression de la modale discovery "Pour vous" (decision Nicolas).
  // Le tab "Pour vous" reste disable visuellement pour les non-connectes
  // (cf. requiresAuth: true sur le tab) — aucun pop-up ne s'affiche, c'est
  // simplement non-cliquable. Plus simple et moins intrusif pour la beta.
  const handleTabClick = useCallback(
    (tabId: FeedTab) => {
      // Tab "Pour vous" requiert auth → si pas connecte, on ignore le clic.
      if (tabId === 'for-you' && !isAuthenticated) return
      setActiveTab(tabId)
    },
    [isAuthenticated],
  )

  // CTA localisation retiré de la Phase 1 (Nicolas 2026-05-19) — peu de
  // données au démarrage rend la modale prématurée. La géoloc reste
  // disponible via l'onboarding et le LocationModal dans la navbar header.

  // Map des onglets UI → paramètres postService
  const tabToServiceTab: Record<FeedTab, 'recent' | 'popular' | 'for_you'> = {
    recent: 'recent',
    popular: 'popular',
    'for-you': 'for_you',
  }

  // Construction du payload filtres → params backend
  // On omet shareTypes si les deux sont cochés (par défaut = tous types) pour
  // éviter des requêtes inutiles et une clé de cache qui change inutilement.
  // Si l'utilisateur est localisé, on force le rayon à `locationDistance`
  // (75-250 km défini dans LocationModal) — sauf si l'utilisateur a déjà
  // choisi un rayon plus restrictif dans le panel filtres. Sans localisation
  // active, on retombe sur `filters.radius` (0 = pas de filtre géographique).
  const effectiveRadius = isLocalized && filters.radius === 0 ? locationDistance : filters.radius

  const feedFilters = {
    categories: filters.categories,
    helpOnly: filters.helpOnly,
    // V1.1.4 NG-022 (Nicolas 2026-06-01) : propagation du Species Context Layer
    // au backend. Avant ce fix, activeSpecies n affichait qu un bandeau visuel
    // mais le feed retournait quand meme TOUS les posts -> l user pensait que
    // la recherche etait cassee. Maintenant on filtre reellement par taxref_id.
    taxrefId: activeSpecies?.taxref_id ?? undefined,
    shareTypes:
      filters.shareTypes.encounter && filters.shareTypes.instant ? undefined : filters.shareTypes,
    period: filters.period,
    radiusKm: effectiveRadius,
  }

  // useFeed — données Supabase via React Query, avec filtres appliqués
  const {
    data: feedData,
    isLoading: isFeedLoading,
    isError: isFeedError,
    refetch: refetchFeed,
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
    // V1.1.4 QA round 4 : on remonte le count (0..N) pour le badge chiffre
    onHasActiveFiltersChange(activeFiltersCount)
  }, [activeFiltersCount, onHasActiveFiltersChange])

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
       * V1.1.4 NG-023 ext final (Nicolas 2026-06-01) :
       * Banniere "Feed filtre" RETIREE. Le filtre actif est desormais materialise
       * directement dans le bouton recherche de la HomeNavbar (pill avec nom +
       * croix X). Permet de garder l espace feed clean et integre l indication
       * de filtre la ou l user attend de la voir : dans la barre de recherche.
       * Cf. HomeNavbar.tsx pour l affichage du pill actif.
       */}

      {/* V1.1.4 QA round 6 (Nicolas 2026-06-01) : pill recherche active mobile
          sticky sous la navbar. Click sur le pill -> ouvre le SearchPanel
          pour changer d espece. X clear le filtre. */}
      {activeSpecies && (
        <div className="md:hidden sticky top-[72px] z-30 px-4 pt-3 pb-2 mb-2 bg-cream-lighter/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 bg-cream-lighter border border-border rounded-full pl-3 pr-2 py-2">
            <button
              type="button"
              onClick={() => {
                // Ouvre le SearchPanel via un event que MobileNavLayer ecoute
                window.dispatchEvent(new CustomEvent('naturegraph:open-search'))
              }}
              className="flex-1 flex items-center gap-2 min-w-0 focus-visible:outline-none rounded-full"
              aria-label="Modifier la recherche"
            >
              <Search
                className="size-4 text-primary shrink-0"
                strokeWidth={3}
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-foreground truncate text-left">
                {activeSpecies.common_name ?? activeSpecies.scientific_name}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearActiveSpecies()
              }}
              aria-label="Retirer le filtre"
              className="shrink-0 size-7 flex items-center justify-center rounded-full hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4 text-foreground" aria-hidden="true" />
            </button>
          </div>
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

      {/* État erreur — utilise la primitive ErrorState (BATCH 6 / T-020).
          Ajoute un bouton "Réessayer" qui declenche refetch() — UX amelioree. */}
      {isError_ && (
        <div className="bg-background md:rounded-card rounded-none">
          <ErrorState
            title={t('home.feed.loadErrorTitle', { defaultValue: 'Impossible de charger le feed' })}
            description={t('home.feed.loadError', {
              defaultValue:
                'Réessaie dans un instant. Si le probleme persiste, verifie ta connexion.',
            })}
            onRetry={() => refetchFeed()}
            retryLabel={t('common.retry', { defaultValue: 'Réessayer' })}
          />
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
              <p className="text-lg font-bold text-foreground">
                {isLocalized
                  ? t('home.feed.emptyLocationTitle', {
                      defaultValue: 'Aucune observation dans ce rayon',
                    })
                  : t('home.feed.emptyTitle')}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isLocalized
                  ? t('home.feed.emptyLocationDesc', {
                      defaultValue:
                        'Aucune observation publique trouvée dans un rayon de {{km}} km autour de {{city}}. Élargis ton rayon ou contribue pour démarrer la dynamique locale.',
                      km: effectiveRadius,
                      city: locationLabel,
                    })
                  : t('home.feed.emptyDesc')}
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
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    // Ouvre directement le panel Rencontre Nature (cas d'usage
                    // le plus fréquent depuis l'empty state du feed). Si non
                    // câblé par le parent, fallback sur la route /contribute.
                    if (onContributeClick) onContributeClick()
                    else navigate('/contribute')
                  }}
                >
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
              {posts.map((post, idx) => (
                <FeedPost
                  key={post.id}
                  {...post}
                  canInteract={isAuthenticated}
                  isOwnPost={!!user?.id && post.authorId === user.id}
                  onReact={handleReact}
                  onEditPost={onEditPost}
                  /* V1.1.4 NG-023 ext : click chip categorie -> coche dans
                     filters.categories (badge "1" naturel via FeedFilterPanel).
                     L user reset via le panneau filtres standard.
                     QA Nicolas 2026-06-01 : scroll up auto, l user etait
                     laisse au milieu de la page apres click ce qui etait
                     perturbant ("je suis ou ?"). */
                  onSelectCategory={(group) => {
                    setFilters((prev) =>
                      prev.categories.includes(group)
                        ? prev
                        : { ...prev, categories: [...prev.categories, group] },
                    )
                    window.scrollTo({ top: 0, behavior: 'auto' })
                  }}
                  /* Dernier item du feed : on retire la bordure de fin pour
                     éviter une barre orpheline en bas de liste. */
                  hideEndBorder={idx === posts.length - 1}
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
          onApply={(next) => {
            setFilters(next)
            // Force invalidation TOUT le cache 'feed' — défensif au cas où
            // React Query reste sur des données stale après changement de
            // filtres (Nicolas 2026-05-22 : retour beta « rien ne change »).
            queryClient.invalidateQueries({ queryKey: ['feed'] })
          }}
          onClose={() => onShowFiltersChange(false)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* BATCH 74 : modale discovery "Pour vous" supprimee de la beta. */}
      {/* LocationPermissionModal retirée Phase 1 (Nicolas 2026-05-19) —
          composant conservé dans /components/location pour réactivation Phase 2. */}
    </section>
  )
}

// Export de la clé de cache pour invalidation externe (ContributeForm)
export { FEED_QUERY_KEY }
