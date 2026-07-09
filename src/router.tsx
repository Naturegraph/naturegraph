/**
 * Router : Configuration des routes de l'application Naturegraph
 *
 * Organisation (BATCH 62 : defense en profondeur Beta Gate, decision Nicolas) :
 *
 *   ┌─ PUBLIC (sans BetaAccessGuard) ──────────────────────────────────┐
 *   │  /welcome  : entry point beta (porte d'entree)                   │
 *   │  /waitlist : inscription liste d'attente (public intentionnel)   │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 *   ┌─ ADMIN (gate propre AdminGuard + RLS, pas de BetaAccessGuard) ───┐
 *   │  /admin/*                                                        │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 *   ┌─ BETA GATED (toutes les autres routes via <BetaGatedLayout>) ────┐
 *   │  /, /signup, /login, /onboarding, /home, /contribute,            │
 *   │  /profile, /profile/:username, /notifications, /settings,        │
 *   │  /explore, /contact, /privacy, /legal, /* (404)                  │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * BATCH 62 : le `<BetaGatedLayout>` factorise <BetaAccessGuard> en parent
 * route. Toute nouvelle route ajoutee comme enfant herite automatiquement
 * du gate : il est STRUCTURELLEMENT IMPOSSIBLE d'oublier la protection.
 *
 * Defense en profondeur :
 *   - Frontend : BetaAccessGuard (localStorage gate, TTL 30j)
 *   - Backend  : RLS Postgres + RPC SECURITY DEFINER (auth.uid())
 *   - Auth     : ProtectedRoute redirige vers /login (lui-meme gated)
 *   - Beta key : claim atomique au signup (max_uses=1)
 *
 * BetaAccessGuard : verifie localStorage 'naturegraph-beta-access'.
 *   - Si vide ou expire -> redirect /welcome (preserve from path)
 *   - Sinon -> render children via <Outlet />
 *
 * Toutes les pages utilisent React.lazy() pour le code splitting (eco-conception).
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import App from './App'
import { MainLayout } from '@/components/layout'
import { ProtectedRoute, PublicRoute, OnboardingGuard } from '@/components/guards'
import { BetaAccessGuard } from '@/components/guards/BetaAccessGuard'
import { AdminGuard } from '@/components/admin/AdminGuard'
import { AppLoader } from '@/components/ui/AppLoader'

// ─── Lazy-loaded pages (code splitting pour éco-conception) ────────

const Landing = lazy(() => import('./pages/Landing'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Home = lazy(() => import('./pages/Home'))
const Explore = lazy(() => import('./pages/Explore'))
const Profile = lazy(() => import('./pages/Profile'))
const Contact = lazy(() => import('./pages/Contact'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Legal = lazy(() => import('./pages/Legal'))
const Contribute = lazy(() => import('./pages/Contribute'))
// Settings.tsx (legacy page form) supprimee, le vrai Paramètres est le
// SettingsPanel slide-over ouvert depuis le profil.
const SettingsHidden = lazy(() => import('./pages/SettingsHidden'))
const SettingsBlocked = lazy(() => import('./pages/SettingsBlocked'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Forbidden = lazy(() => import('./pages/Forbidden'))
const Waitlist = lazy(() => import('./pages/Waitlist'))
const PostDetail = lazy(() => import('./pages/PostDetail'))
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'))

// Admin (BATCH 31-32) : chunks separes (eco-conception : code admin lazy)
const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'))
const AdminBeta = lazy(() => import('./pages/Admin/AdminBeta'))
const AdminUsers = lazy(() => import('./pages/Admin/AdminUsers'))
const AdminModeration = lazy(() => import('./pages/Admin/AdminModeration'))
const AdminAuditLogs = lazy(() => import('./pages/Admin/AdminAuditLogs'))
const AdminAnalytics = lazy(() => import('./pages/Admin/AdminAnalytics'))

/**
 * Wrapper Suspense pour les pages lazy-loaded.
 * Affiche un spinner centré pendant le chargement du chunk JS.
 */
// eslint-disable-next-line react-refresh/only-export-components
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<AppLoader size="md" />}>{children}</Suspense>
}

/**
 * Layout parent qui applique BetaAccessGuard a toutes ses routes enfants.
 * Permet de factoriser le gate et garantir qu'aucune route ne peut etre
 * ajoutee sans protection (defense en profondeur architecturale).
 */
// eslint-disable-next-line react-refresh/only-export-components
function BetaGatedLayout() {
  return (
    <BetaAccessGuard>
      <Outlet />
    </BetaAccessGuard>
  )
}

// ─── Définition des routes ─────────────────────────────────────────

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      // ════════════════════════════════════════════════════════════════
      // ROUTES PUBLIQUES (sans BetaAccessGuard : exceptions intentionnelles)
      // ════════════════════════════════════════════════════════════════

      // Welcome (ex ecran code beta) SUPPRIME : acces ouvert (NG-029). Toute
      // visite de /welcome, y compris les anciens liens ?code=, repart vers la
      // landing. L'ecran code n'existe plus.
      {
        path: 'welcome',
        element: <Navigate to="/" replace />,
      },

      // Waitlist : accessible sans auth (BATCH 30 / BETA_STRATEGY Phase 1)
      // Affiche le formulaire d'inscription a la liste d'attente.
      {
        path: 'waitlist',
        element: (
          <LazyPage>
            <Waitlist />
          </LazyPage>
        ),
      },

      // Desabonnement email (NG-045) : cible de la redirection 302 de l'Edge
      // Function email-unsubscribe. PUBLIQUE (pas de BetaAccessGuard, pas
      // d'auth) : l'utilisateur clique depuis son client mail. Le
      // desabonnement est deja fait cote serveur, cette page ne fait
      // qu'afficher la confirmation.
      {
        path: 'desabonnement',
        element: (
          <LazyPage>
            <Unsubscribe />
          </LazyPage>
        ),
      },

      // ════════════════════════════════════════════════════════════════
      // ADMIN : gate propre (AdminGuard + RLS), pas de BetaAccessGuard
      // L'admin a son systeme d'auth distinct, et la RLS bloque l'acces
      // aux donnees meme en cas de bypass cote client.
      // ════════════════════════════════════════════════════════════════
      {
        path: 'admin',
        element: (
          <LazyPage>
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          </LazyPage>
        ),
        children: [
          {
            index: true,
            element: (
              <LazyPage>
                <AdminDashboard />
              </LazyPage>
            ),
          },
          {
            path: 'users',
            element: (
              <LazyPage>
                <AdminUsers />
              </LazyPage>
            ),
          },
          {
            path: 'moderation',
            element: (
              <LazyPage>
                <AdminModeration />
              </LazyPage>
            ),
          },
          {
            path: 'beta',
            element: (
              <LazyPage>
                <AdminBeta />
              </LazyPage>
            ),
          },
          {
            path: 'audit',
            element: (
              <LazyPage>
                <AdminAuditLogs />
              </LazyPage>
            ),
          },
          {
            path: 'analytics',
            element: (
              <LazyPage>
                <AdminAnalytics />
              </LazyPage>
            ),
          },
        ],
      },

      // ════════════════════════════════════════════════════════════════
      // BETA GATED : toutes les autres routes
      // <BetaGatedLayout> applique <BetaAccessGuard> sur tous les enfants.
      // Toute nouvelle route ajoutee ici herite automatiquement du gate.
      // ════════════════════════════════════════════════════════════════
      {
        element: <BetaGatedLayout />,
        children: [
          // Landing page (BATCH 45)
          // Nicolas 2026-05-25 : PublicRoute ajoute pour eviter qu un user
          // authentifie tombe sur la landing en pressant back depuis /home
          // (sort de son contexte app, friction UX mobile). Avec PublicRoute,
          // un user auth est immediatement redirige vers /home (ou /onboarding
          // si pas encore complete) en mode replace, donc le back button
          // ne revient pas sur la landing.
          {
            path: '/',
            element: (
              <LazyPage>
                <PublicRoute>
                  <Landing />
                </PublicRoute>
              </LazyPage>
            ),
          },

          // Auth : signup et login
          // La verification OTP et l'onboarding sont geres en interne par AuthPage.
          {
            path: 'signup',
            element: (
              <LazyPage>
                <PublicRoute>
                  <AuthPage initialMode="signup" />
                </PublicRoute>
              </LazyPage>
            ),
          },
          {
            path: 'login',
            element: (
              <LazyPage>
                <PublicRoute>
                  <AuthPage initialMode="login" />
                </PublicRoute>
              </LazyPage>
            ),
          },

          // Onboarding standalone : fallback pour les acces directs
          {
            path: 'onboarding',
            element: (
              <LazyPage>
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              </LazyPage>
            ),
          },

          // Home : accessible sans auth (mode invite), mais force l'onboarding
          // pour les users authentifies. Le BetaAccessGuard parent garantit
          // qu'aucun mode invite ne peut bypasser la beta fermee.
          {
            path: 'home',
            element: (
              <LazyPage>
                <OnboardingGuard>
                  <Home />
                </OnboardingGuard>
              </LazyPage>
            ),
          },

          // Contributions : authentification requise, layout autonome
          {
            path: 'contribute',
            element: (
              <LazyPage>
                <ProtectedRoute>
                  <Contribute />
                </ProtectedRoute>
              </LazyPage>
            ),
          },

          // Profil : layout autonome (header integre dans la page)
          {
            path: 'profile',
            element: (
              <LazyPage>
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              </LazyPage>
            ),
          },
          {
            path: 'profile/:username',
            element: (
              <LazyPage>
                <OnboardingGuard>
                  <Profile />
                </OnboardingGuard>
              </LazyPage>
            ),
          },

          // Deep-link post : accessible aux utilisateurs ayant passé le beta
          // gate (route sous BetaGatedLayout). OnboardingGuard plutôt que
          // Nicolas 2026-05-25 : ProtectedRoute ajoute pour interdire l acces aux
          // non-authentifies. Avant, OnboardingGuard seul laissait un visiteur avec
          // beta key consulter un post detail sans avoir de compte. Maintenant on
          // exige une session valide, sinon redirect /welcome via la chaine
          // BetaAccessGuard / ProtectedRoute.
          {
            path: 'post/:postId',
            element: (
              <LazyPage>
                <ProtectedRoute>
                  <PostDetail />
                </ProtectedRoute>
              </LazyPage>
            ),
          },

          // Notifications : page dediee avec filtres + pagination curseur
          {
            path: 'notifications',
            element: (
              <LazyPage>
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              </LazyPage>
            ),
          },

          // Le vrai Parametres est le SettingsPanel slide-over ouvert depuis
          // le ProfileHeader. Plus de route /settings dediee (la page form
          // legacy ayant ete supprimee, Nicolas 2026-05-24).

          // Confidentialite, sous-pages dediees (Nicolas 2026-05-24)
          // Gestion user-side des publications masquees et comptes bloques,
          // action inverse de "Masquer ce post" / "Bloquer cet utilisateur".
          {
            path: 'settings/hidden',
            element: (
              <LazyPage>
                <ProtectedRoute>
                  <SettingsHidden />
                </ProtectedRoute>
              </LazyPage>
            ),
          },
          {
            path: 'settings/blocked',
            element: (
              <LazyPage>
                <ProtectedRoute>
                  <SettingsBlocked />
                </ProtectedRoute>
              </LazyPage>
            ),
          },

          // App principale : authentification requise + layout avec header/footer
          {
            element: (
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            ),
            children: [
              {
                path: 'explore',
                element: (
                  <LazyPage>
                    <Explore />
                  </LazyPage>
                ),
              },
            ],
          },

          // Pages legales : gated par BetaAccessGuard (BATCH 45 : beta privee)
          // Note : si tu veux les rendre publiques au launch, sortir du groupe
          // <BetaGatedLayout> et les remettre au niveau racine.
          {
            path: 'contact',
            element: (
              <LazyPage>
                <Contact />
              </LazyPage>
            ),
          },
          {
            path: 'privacy',
            element: (
              <LazyPage>
                <Privacy />
              </LazyPage>
            ),
          },
          {
            path: 'legal',
            element: (
              <LazyPage>
                <Legal />
              </LazyPage>
            ),
          },

          // 403 : acces refuse (NG-021). Route dediee pour les acces refuses generiques
          // (l'acces /admin sans role passe par AdminGuard -> redirect silencieux, anti-leak).
          {
            path: '403',
            element: (
              <LazyPage>
                <Forbidden />
              </LazyPage>
            ),
          },

          // 404 : page non trouvee (BATCH 62 : gated pour eviter bypass)
          // Un user qui tape une URL random sans code beta est renvoye vers /welcome
          // au lieu de voir directement la 404.
          {
            path: '*',
            element: (
              <LazyPage>
                <NotFound />
              </LazyPage>
            ),
          },
        ],
      },
    ],
  },
])
