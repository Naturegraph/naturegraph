/**
 * PostDetail : Page d'un post unique (deep-link partageable)
 * ============================================================
 *
 * Route : /post/:postId
 *
 * Cible :
 *   1. Permettre le partage de lien direct vers un post (SharePopover).
 *   2. Offrir une URL stable indexable par les crawlers OG (WhatsApp,
 *      Facebook, Twitter) : le rendu côté serveur des meta tags Open
 *      Graph est délégué à une Vercel Edge Function (cf. `api/post-og.ts`).
 *   3. Garder l'utilisateur dans le contexte de l'app : avec navbar +
 *      sidebar pour qu'il puisse continuer son exploration depuis le post.
 *
 * Beta gate (PRD §5) :
 *   - Cette route est sous `BetaGatedLayout` du router → un visiteur sans
 *     clé d'accès est redirigé sur /welcome.
 *   - Le `BetaAccessGuard` mémorise l'URL d'origine pour ramener
 *     l'utilisateur ici après la saisie de sa clé.
 *
 * États visuels :
 *   - Loading : skeleton du post (cohérence FeedSection).
 *   - Not found : carte explicite avec retour /home.
 *   - Error : message générique avec hint réessayer.
 *
 * Accessibilité :
 *   - Lien "Retour au feed" en début de page (premier focus clavier).
 *   - <main id="main-content"> pour le skip-link global.
 *   - Annonce live polite du status loading/error/loaded pour les lecteurs
 *     d'écran.
 */

import { Suspense, lazy, useRef, useEffect } from 'react'
import { Link, useParams, useNavigate, useNavigationType } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import {
  getPostById,
  getRelatedPosts,
  getUserReactions,
  getReactionsBreakdown,
} from '@/services/postService'
import { postFeedItemToMockPost } from '@/components/home/FeedSection'
import { extractPostId } from '@/lib/postSlug'
import { HomeNavbar } from '@/components/home/HomeNavbar'
import { MobileNavLayer } from '@/components/home/MobileNavLayer'
import { GuestSidebar } from '@/components/home/GuestSidebar'
import { ProfileSidebar } from '@/components/home/ProfileSidebar'
import { RelatedPostCard } from '@/components/home/RelatedPostCard'
import { useToggleReaction } from '@/hooks/usePost'
import { useEditPostFlow } from '@/hooks/useEditPostFlow'
import type { ReactionType, PostFeedItem } from '@/types/database'

// FeedPost lazy : composant lourd, on évite le coût bundle si on
// arrive sur une 404 ou un état d'erreur.
const FeedPost = lazy(() =>
  import('@/components/home/FeedPost').then((m) => ({ default: m.FeedPost })),
)

// Sidebar droite (Impact + Tendances) : meme composant que Home, lazy : on ne
// paye le chunk que sur ecran XL (>=1280px) ou la colonne est visible.
const StatsSidebar = lazy(() =>
  import('@/components/home/StatsSidebar').then((m) => ({ default: m.StatsSidebar })),
)

// ─── États visuels ────────────────────────────────────────────────────────────

/** Skeleton minimal d'un post : cohérent avec le LoadingState du feed. */
function PostSkeleton() {
  return (
    <div className="rounded-card bg-background border-[0.5px] border-border p-5 animate-pulse motion-reduce:animate-none">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-12 rounded-full bg-muted" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-3 w-32 bg-muted rounded-full" />
          <div className="h-2.5 w-20 bg-muted rounded-full" />
        </div>
      </div>
      <div className="aspect-video w-full rounded-md bg-muted" />
    </div>
  )
}

/** Carte « post introuvable » : message clair + CTA retour au feed. */
function PostNotFound({ backLabel }: { backLabel: string }) {
  return (
    <div className="rounded-card bg-background border-[0.5px] border-border p-8 flex flex-col items-center gap-4 text-center">
      <h1 className="font-title font-bold text-xl text-foreground">Ce post n&apos;existe plus</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Le post que tu cherches a peut-être été supprimé par son auteur, ou il est en visibilité
        restreinte.
      </p>
      <Link
        to="/home"
        className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {backLabel}
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PostDetail() {
  const { t } = useTranslation()
  const { postId: routeParam } = useParams<{ postId: string }>()
  const { isAuthenticated, profile, user } = useAuth()

  // Le segment `:postId` peut être :
  //   - un UUID nu (anciens liens) → on l'utilise tel quel
  //   - un slug-uuid (« grand-duc-amerique-{uuid} ») → on extrait l'UUID en fin
  // extractPostId() gère les deux cas via regex.
  const postId = extractPostId(routeParam)

  // Nicolas 2026-06-06 : forcer le scroll en HAUT a l'ouverture de la page
  // detail. Sans ca, en SPA, la fenetre garde la position de scroll de la page
  // precedente (ex: galerie scrollee tout en bas) -> on arrivait en bas de la
  // page detail. On reset aussi au changement de post (clic sur une
  // recommandation "Observations susceptibles de t'interesser").
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [postId])

  // « Retour au fil » : on fait un VRAI retour (navigate(-1)) quand on est
  // arrive depuis l'app (clic feed/galerie/reco = navigation PUSH). Cela
  // declenche un POP -> Home restaure la position de scroll ET la vue galerie.
  // En acces direct / deep-link (pas d'historique app), on va simplement au
  // feed. cameFromApp est capture une seule fois (au montage).
  const navigate = useNavigate()
  const cameFromAppRef = useRef(useNavigationType() === 'PUSH')
  function handleBackToFeed() {
    if (cameFromAppRef.current) navigate(-1)
    else navigate('/home')
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    // V1.1.5 (Nicolas 2026-06-04) : getPostById ne renvoie PAS user_reaction ni
    // reactions_breakdown. Sans enrichissement, les reactions ne s'affichaient
    // pas et "disparaissaient" au refetch (onSettled invalide ['post', id]).
    // On enrichit donc le post comme le font le feed (useFeed) et le profil
    // (useUserPosts) : reaction du viewer + repartition par type. Resultat :
    // reactions fonctionnelles et persistantes sur la page detail.
    queryFn: async () => {
      if (!postId) return null
      const p = await getPostById(postId)
      if (!p) return null
      const [userReactions, breakdown] = await Promise.all([
        user?.id
          ? getUserReactions(user.id, [p.id])
          : Promise.resolve({} as Record<string, ReactionType>),
        getReactionsBreakdown([p.id]),
      ])
      return {
        ...p,
        user_reaction: userReactions[p.id] ?? null,
        reactions_breakdown: breakdown[p.id] ?? null,
      }
    },
    enabled: !!postId,
    staleTime: 60 * 1000,
  })

  const post = data ? postFeedItemToMockPost(data) : null
  const isOwnPost = !!post && !!profile && post.authorId === profile.id

  // V1.1.5 NG-028 : observations a decouvrir (recommandations). Meme espece >
  // meme groupe taxonomique > recents (cf getRelatedPosts). Charge seulement
  // une fois le post connu. Accessible aussi aux visiteurs non connectes
  // (RLS posts_public : publics publies uniquement).
  const relatedQueryKey = ['related-posts', postId] as const
  const { data: relatedRaw } = useQuery({
    queryKey: relatedQueryKey,
    queryFn: () =>
      data
        ? getRelatedPosts({
            excludePostId: data.id,
            taxrefId: data.taxref_id ?? null,
            taxonomicGroup: data.taxonomic_group ?? null,
            // V1.1.5 QA (Nicolas) : 4 posts similaires en carrousel.
            limit: 4,
          })
        : Promise.resolve([]),
    enabled: !!data,
    staleTime: 5 * 60 * 1000,
  })
  // Regle produit (Nicolas 2026-06-04) : jamais de carte sans photo dans les
  // recommandations. getRelatedPosts filtre deja en amont ; ce filtre est une
  // securite cote client (au cas ou un post perdrait ses medias).
  const relatedPosts = (relatedRaw ?? [])
    .map((p, i) => postFeedItemToMockPost(p, i))
    .filter((p) => p.images.length > 0)

  // Reactions sur PostDetail - meme behavior que feed/profil (coherence
  // produit V1.1.3). useToggleReaction invalide feed + posts.by-user + post.byId
  // dans onSettled donc le changement est propage partout.
  const reactionMutation = useToggleReaction(user?.id)
  const detailQueryKey = ['post', postId] as const
  function handleReact(targetPostId: string, type: ReactionType) {
    reactionMutation.mutate({
      postId: targetPostId,
      type,
      currentReaction: ((data as PostFeedItem | null)?.user_reaction ??
        null) as ReactionType | null,
      feedQueryKey: detailQueryKey,
    })
  }

  // Edition rendue directement dans PostDetail via le hook partage (meme
  // experience que Home et Profile : pas de redirect, l user reste sur sa page).
  const { onEditPost, panelNode: editPanelNode } = useEditPostFlow()

  // V1.1.5 QA (Nicolas) : carrousel horizontal pour la section recommandations.
  // Les chevrons du header font defiler d'environ une largeur de viewport.
  const carouselRef = useRef<HTMLDivElement>(null)
  function scrollCarousel(dir: 1 | -1) {
    const el = carouselRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream-lighter">
      {/* Navbar masquee en mobile (Nicolas 2026-06-04) : sur la page detail,
          le bouton "Retour au fil" en haut sert de navigation globale et
          remplace la navbar pour une experience focus sur l'observation. La
          navbar reste affichee des md (tablette/desktop). */}
      <div className="hidden md:block">
        <HomeNavbar />
      </div>

      <div className="flex flex-1 w-full">
        <div className="w-full xl:max-w-[1440px] mx-auto flex md:gap-6 gap-0 md:px-6 px-0 md:py-6 pb-20 md:pb-6">
          {/* Colonne gauche : Profile / Guest (cohérence Home, dès lg) */}
          <aside className="hidden lg:block w-[320px] shrink-0">
            {isAuthenticated ? <ProfileSidebar /> : <GuestSidebar />}
          </aside>

          {/* Colonne centrale : Post détail.
              Marges mobiles (Nicolas 2026-06-04) : un seul gouttiere de 16px
              (px-4) appliquee par bloc, JAMAIS cumulee. Le post principal
              (FeedPost) porte deja sa propre marge interne, donc il reste en
              pleine largeur (px-0) ; le bouton retour, le titre de section et
              le carrousel sont alignes a 16px du bord. */}
          <main id="main-content" className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Bouton retour en variant secondary (coherence DS). En mobile il
                remplace la navbar : FIXE au scroll (sticky top-0) pour pouvoir
                revenir au fil sans remonter en haut. Fond + blur pour rester
                lisible au-dessus du contenu qui defile. Statique des md (la
                navbar reprend ce role). */}
            <div className="sticky top-0 z-30 bg-cream-lighter/95 backdrop-blur-sm px-4 pt-4 pb-3 md:static md:bg-transparent md:backdrop-blur-none md:px-0 md:pt-0 md:pb-0">
              <Button
                onClick={handleBackToFeed}
                variant="secondary"
                size="sm"
                icon={<ArrowLeft size={16} aria-hidden="true" />}
              >
                {t('post.backToFeed', { defaultValue: 'Retour au fil' })}
              </Button>
            </div>

            <div aria-live="polite">
              {isLoading && (
                <div className="px-4 md:px-0">
                  <PostSkeleton />
                </div>
              )}
              {!isLoading && (isError || !post) && (
                <div className="px-4 md:px-0">
                  <PostNotFound
                    backLabel={t('post.backToFeed', { defaultValue: 'Retour au fil' })}
                  />
                </div>
              )}
              {!isLoading && post && (
                <Suspense fallback={<PostSkeleton />}>
                  <FeedPost
                    {...post}
                    canInteract={isAuthenticated}
                    isOwnPost={isOwnPost}
                    onReact={handleReact}
                    onEditPost={isOwnPost ? onEditPost : undefined}
                    hideEndBorder
                    linkToDetail={false}
                    // V1.1.5 (Nicolas) : sur la page detail, description complete
                    // (pas de "Voir plus") + chips categorie/espece passifs.
                    expandContent
                    disableChipFilters
                  />
                </Suspense>
              )}
              {/* Le fil d'Echanges (NG-049) est rendu PAR FeedPost, a l'interieur
                  de la carte : le feed et la page detail se comportent alors
                  exactement pareil, sans que cette page ait a recabler quoi que
                  ce soit. */}
            </div>

            {/* NG-028 : section "Observations susceptibles de t'interesser".
                Jusqu'a 4 observations similaires (meme espece > groupe >
                recents), en CARROUSEL horizontal (scroll-snap). Chevrons de
                navigation a droite du titre. Chaque carte (RelatedPostCard) est
                allegee (header + titre + description 2 lignes + chips + photo)
                et ENTIEREMENT cliquable vers la page detail = exploration
                continue. Jamais de post sans photo ici. */}
            {!isLoading && post && relatedPosts.length > 0 && (
              <section
                aria-label={t('post.related.title', {
                  defaultValue: 'Observations susceptibles de t’intéresser',
                })}
                className="mt-2 px-4 md:px-0"
              >
                {/* Separateur (Nicolas 2026-06-04) : un filet discret cree une
                    respiration entre le post principal et la section reco. */}
                <hr className="border-0 border-t-[0.5px] border-border mb-6" />
                {/* Header : titre + chevrons de navigation du carrousel */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-bold text-foreground">
                    {t('post.related.title', {
                      defaultValue: 'Observations susceptibles de t’intéresser',
                    })}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => scrollCarousel(-1)}
                      aria-label={t('post.related.prev', { defaultValue: 'Précédent' })}
                      className="size-8 rounded-full border-[0.5px] border-border flex items-center justify-center text-foreground hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCarousel(1)}
                      aria-label={t('post.related.next', { defaultValue: 'Suivant' })}
                      className="size-8 rounded-full border-[0.5px] border-border flex items-center justify-center text-foreground hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Carrousel scroll-snap : ~1 carte/vue mobile (peek), ~2 desktop.
                    La premiere carte s'aligne sur la gouttiere 16px de la section
                    (pas de -mx negatif qui collait les cartes au bord). On laisse
                    la derniere carte deborder a droite (-mr-4) pour suggerer le
                    scroll, tout en gardant 16px de marge a gauche. */}
                <div
                  ref={carouselRef}
                  className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth -mr-4 pr-4 md:mr-0 md:pr-0 pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
                >
                  {relatedPosts.map((rp) => (
                    <div key={rp.id} className="snap-start shrink-0 w-[85%] sm:w-[60%] lg:w-[48%]">
                      <RelatedPostCard {...rp} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* Colonne droite : Impact & Tendances : visible uniquement XL desktop
              (>=1280px), comme sur Home, pour ne pas creer un grand vide a
              droite du post (Nicolas 2026-06-04). Lazy : chunk charge seulement
              quand la colonne est rendue. */}
          <aside className="hidden xl:block w-[320px] shrink-0">
            <Suspense fallback={<div className="w-[320px] h-96 bg-muted/20 rounded-lg" />}>
              <StatsSidebar />
            </Suspense>
          </aside>
        </div>
      </div>

      {/* Bottom nav mobile */}
      <MobileNavLayer />

      {/* Panneau edition (meme hook que Home et Profile) */}
      {editPanelNode}
    </div>
  )
}
