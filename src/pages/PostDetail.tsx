/**
 * PostDetail — Page d'un post unique (deep-link partageable)
 * ============================================================
 *
 * Route : /post/:postId
 *
 * Cible :
 *   1. Permettre le partage de lien direct vers un post (SharePopover).
 *   2. Offrir une URL stable indexable par les crawlers OG (WhatsApp,
 *      Facebook, Twitter) — le rendu côté serveur des meta tags Open
 *      Graph est délégué à une Vercel Edge Function (cf. `api/post-og.ts`).
 *   3. Garder l'utilisateur dans le contexte de l'app — avec navbar +
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

import { Suspense, lazy } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { getPostById } from '@/services/postService'
import { postFeedItemToMockPost } from '@/components/home/FeedSection'
import { extractPostId } from '@/lib/postSlug'
import { HomeNavbar } from '@/components/home/HomeNavbar'
import { MobileNavLayer } from '@/components/home/MobileNavLayer'
import { GuestSidebar } from '@/components/home/GuestSidebar'
import { ProfileSidebar } from '@/components/home/ProfileSidebar'

// FeedPost lazy — composant lourd, on évite le coût bundle si on
// arrive sur une 404 ou un état d'erreur.
const FeedPost = lazy(() =>
  import('@/components/home/FeedPost').then((m) => ({ default: m.FeedPost })),
)

// ─── États visuels ────────────────────────────────────────────────────────────

/** Skeleton minimal d'un post — cohérent avec le LoadingState du feed. */
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

/** Carte « post introuvable » — message clair + CTA retour au feed. */
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
  const { isAuthenticated, profile } = useAuth()

  // Le segment `:postId` peut être :
  //   - un UUID nu (anciens liens) → on l'utilise tel quel
  //   - un slug-uuid (« grand-duc-amerique-{uuid} ») → on extrait l'UUID en fin
  // extractPostId() gère les deux cas via regex.
  const postId = extractPostId(routeParam)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => (postId ? getPostById(postId) : Promise.resolve(null)),
    enabled: !!postId,
    staleTime: 60 * 1000,
  })

  const post = data ? postFeedItemToMockPost(data) : null
  const isOwnPost = !!post && !!profile && post.authorId === profile.id

  return (
    <div className="min-h-screen flex flex-col bg-cream-lighter">
      <HomeNavbar />

      <div className="flex flex-1 w-full">
        <div className="w-full xl:max-w-[1440px] mx-auto flex md:gap-6 gap-0 md:px-6 px-0 md:py-6 pb-20 md:pb-6">
          {/* Colonne gauche — Profile / Guest (cohérence Home, dès lg) */}
          <aside className="hidden lg:block w-[320px] shrink-0">
            {isAuthenticated ? <ProfileSidebar /> : <GuestSidebar />}
          </aside>

          {/* Colonne centrale — Post détail */}
          <main id="main-content" className="flex-1 min-w-0 flex flex-col gap-4 px-4 md:px-0">
            <Link
              to="/home"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded w-fit"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t('post.backToFeed', { defaultValue: 'Retour au fil' })}
            </Link>

            <div aria-live="polite">
              {isLoading && <PostSkeleton />}
              {!isLoading && (isError || !post) && (
                <PostNotFound backLabel={t('post.backToFeed', { defaultValue: 'Retour au fil' })} />
              )}
              {!isLoading && post && (
                <Suspense fallback={<PostSkeleton />}>
                  <FeedPost {...post} canInteract={isAuthenticated} isOwnPost={isOwnPost} />
                </Suspense>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Bottom nav mobile */}
      <MobileNavLayer />
    </div>
  )
}
