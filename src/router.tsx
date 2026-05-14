/**
 * Router — Configuration des routes de l'application Naturegraph
 *
 * Organisation des routes (BATCH 45 — Beta Access Gate total) :
 * - /welcome : Welcome screen beta (entry point, public)
 * - /waitlist : Inscription liste d'attente (public)
 * - / : Landing page (Gated par BetaAccessGuard)
 * - /signup, /login : Auth (Gated)
 * - /home, /explore, /profile, etc : App principale (Gated + ProtectedRoute)
 * - /admin : Admin (AdminGuard, pas besoin de BetaAccessGuard)
 *
 * BetaAccessGuard : verifie localStorage 'naturegraph-beta-access'.
 *   - Si vide ou expire -> redirect /welcome
 *   - Sinon -> render children
 *
 * Routes publiques (sans BetaAccessGuard) : /welcome, /waitlist uniquement.
 * Routes legales (/contact /privacy /legal) sont sous BetaAccessGuard mais
 * accessibles via lien direct (l'utilisateur peut les lire post-validation).
 *
 * Toutes les pages utilisent React.lazy() pour le code splitting (éco-conception).
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
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
const Settings = lazy(() => import('./pages/Settings'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Waitlist = lazy(() => import('./pages/Waitlist'))

// Admin (BATCH 31-32) — chunks separes (eco-conception : code admin lazy)
const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'))
const AdminBeta = lazy(() => import('./pages/Admin/AdminBeta'))
const AdminUsers = lazy(() => import('./pages/Admin/AdminUsers'))
const AdminModeration = lazy(() => import('./pages/Admin/AdminModeration'))
const AdminAuditLogs = lazy(() => import('./pages/Admin/AdminAuditLogs'))

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

// ─── Définition des routes ─────────────────────────────────────────

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
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

      // Landing page — gated par BetaAccessGuard (BATCH 45)
      {
        path: '/',
        element: (
          <LazyPage>
            <BetaAccessGuard>
              <Landing />
            </BetaAccessGuard>
          </LazyPage>
        ),
      },

      // Auth — signup et login (gated par BetaAccessGuard)
      // La vérification OTP et l'onboarding sont gérés en interne par AuthPage.
      {
        path: 'signup',
        element: (
          <LazyPage>
            <BetaAccessGuard>
              <PublicRoute>
                <AuthPage initialMode="signup" />
              </PublicRoute>
            </BetaAccessGuard>
          </LazyPage>
        ),
      },
      {
        path: 'login',
        element: (
          <LazyPage>
            <BetaAccessGuard>
              <PublicRoute>
                <AuthPage initialMode="login" />
              </PublicRoute>
            </BetaAccessGuard>
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

      // Waitlist — accessible sans auth (BATCH 30 / BETA_STRATEGY Phase 1)
      // Affiche le formulaire d'inscription a la liste d'attente.
      // Redirigee depuis BetaKeyGate quand le quota est plein.
      {
        path: 'waitlist',
        element: (
          <LazyPage>
            <Waitlist />
          </LazyPage>
        ),
      },

      // Home — accessible sans auth (mode invité), mais force l'onboarding pour les users authentifiés
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

      // Contributions — authentification requise, layout autonome (header propre au formulaire)
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

      // Profil — layout autonome (header intégré dans la page)
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

      // Notifications — page dédiée avec filtres + pagination curseur
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

      // Paramètres — authentification requise, layout autonome
      {
        path: 'settings',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <Settings />
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

      // Pages légales — gated par BetaAccessGuard (BATCH 45 — beta privee)
      // Note : si tu veux les rendre publiques au launch, retire le BetaAccessGuard.
      {
        path: 'contact',
        element: (
          <LazyPage>
            <BetaAccessGuard>
              <Contact />
            </BetaAccessGuard>
          </LazyPage>
        ),
      },
      {
        path: 'privacy',
        element: (
          <LazyPage>
            <BetaAccessGuard>
              <Privacy />
            </BetaAccessGuard>
          </LazyPage>
        ),
      },
      {
        path: 'legal',
        element: (
          <LazyPage>
            <BetaAccessGuard>
              <Legal />
            </BetaAccessGuard>
          </LazyPage>
        ),
      },

      // Admin section (BATCH 31-32) — protege par AdminGuard
      // Defense en profondeur : RLS Postgres bloque aussi l'access aux donnees.
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
        ],
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
