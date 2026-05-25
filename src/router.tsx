/**
 * Router — Configuration des routes de l'application Naturegraph
 *
 * Organisation (BATCH 62 — defense en profondeur Beta Gate, decision Nicolas) :
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
 * du gate — il est STRUCTURELLEMENT IMPOSSIBLE d'oublier la protection.
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
import { createBrowserRouter, Outlet } from 'react-router-dom'
import App from './App'
import { MainLayout } from '@/components/layout'
import { ProtectedRoute, PublicRoute, OnboardingGuard } from '@/components/guards'
import { BetaAccessGuard } from '@/components/guards/BetaAccessGuard'
import { AdminGuard } from '@/components/admin/AdminGuard'

// ─── Lazy-loaded pages (code splitting pour éco-conception) ────────

const Welcome = lazy(() => import('./pages/Welcome'))
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
const Waitlist = lazy(() => import('./pages/Waitlist'))
const PostDetail = lazy(() => import('./pages/PostDetail'))

// Admin (BATCH 31-32) — chunks separes (eco-conception : code admin lazy)
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
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div
            className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"
            role="status"
            aria-label="Chargement"
          />
        </div>
      }
    >
      {children}
    </Suspense>
  )
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
      // ROUTES PUBLIQUES (sans BetaAccessGuard — exceptions intentionnelles)
      // ════════════════════════════════════════════════════════════════

      // Welcome screen — entry point beta privee (BATCH 45)
      // Aucun guard : c'est la porte d'entree.
      {
        path: 'welcome',
        element: (
          <LazyPage>
            <Welcome />
          </LazyPage>
        ),
      },

      // Waitlist — accessible sans auth (BATCH 30 / BETA_STRATEGY Phase 1)
      // Affiche le formulaire d'inscription a la liste d'attente.
      {
        path: 'waitlist',
        element: (
          <LazyPage>
            <Waitlist />
          </LazyPage>
        ),
      },

      // ════════════════════════════════════════════════════════════════
      // ADMIN — gate propre (AdminGuard + RLS), pas de BetaAccessGuard
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
      // BETA GATED — toutes les autres routes
      // <BetaGatedLayout> applique <BetaAccessGuard> sur tous les enfants.
      // Toute nouvelle route ajoutee ici herite automatiquement du gate.
      // ════════════════════════════════════════════════════════════════
      {
        element: <BetaGatedLayout />,
        children: [
          // Landing page (BATCH 45)
          {
            path: '/',
            element: (
              <LazyPage>
                <Landing />
              </LazyPage>
            ),
          },

          // Auth — signup et login
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

          // Onboarding standalone — fallback pour les acces directs
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

          // Home — accessible sans auth (mode invite), mais force l'onboarding
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

          // Contributions — authentification requise, layout autonome
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

          // Profil — layout autonome (header integre dans la page)
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

          // Deep-link post — accessible aux utilisateurs ayant passé le beta
          // gate (route sous BetaGatedLayout). OnboardingGuard plutôt que
          // ProtectedRoute pour rester cohérent avec /profile/:username : un
          // visiteur invité ayant validé sa clé d'accès peut consulter un
          // post sans avoir un compte complet (TODO Phase 2 : ouvrir aux non
          // authentifiés une fois le mode "visite sans compte" en place).
          // Nicolas 2026-05-22 : avant cette route, le bouton « Copier le
          // lien » du SharePopover générait une URL en 404.
          {
            path: 'post/:postId',
            element: (
              <LazyPage>
                <OnboardingGuard>
                  <PostDetail />
                </OnboardingGuard>
              </LazyPage>
            ),
          },

          // Notifications — page dediee avec filtres + pagination curseur
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

          // App principale — authentification requise + layout avec header/footer
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

          // Pages legales — gated par BetaAccessGuard (BATCH 45 — beta privee)
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

          // 404 — page non trouvee (BATCH 62 : gated pour eviter bypass)
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
