/**
 * Router — Configuration des routes de l'application Naturegraph
 *
 * Organisation des routes :
 * - / : Landing page (publique, pas de header/footer)
 * - /signup, /login, /verify : Auth (PublicRoute — redirige si déjà connecté)
 * - /onboarding : Onboarding post-inscription (ProtectedRoute)
 * - /home, /explore, /profile : App principale (ProtectedRoute + MainLayout)
 * - * : Page 404
 *
 * Toutes les pages utilisent React.lazy() pour le code splitting (éco-conception).
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { MainLayout } from '@/components/layout'
import { ProtectedRoute, PublicRoute } from '@/components/guards'

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
const NotFound = lazy(() => import('./pages/NotFound'))

/**
 * Wrapper Suspense pour les pages lazy-loaded.
 * Affiche un spinner centré pendant le chargement du chunk JS.
 */
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

// ─── Définition des routes ─────────────────────────────────────────

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      // Landing page — publique, sans header/footer
      {
        path: '/',
        element: (
          <LazyPage>
            <Landing />
          </LazyPage>
        ),
      },

      // Auth — signup et login via AuthPage unifiée
      // La vérification OTP et l'onboarding sont gérés en interne par AuthPage.
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

      // Onboarding standalone — fallback pour les accès directs
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

      // App principale — authentification requise + layout avec header/footer
      {
        element: (
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: 'home',
            element: (
              <LazyPage>
                <Home />
              </LazyPage>
            ),
          },
          {
            path: 'explore',
            element: (
              <LazyPage>
                <Explore />
              </LazyPage>
            ),
          },
          {
            path: 'profile',
            element: (
              <LazyPage>
                <Profile />
              </LazyPage>
            ),
          },
        ],
      },

      // Pages légales — publiques, standalone
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

      // 404 — page non trouvée
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
])
