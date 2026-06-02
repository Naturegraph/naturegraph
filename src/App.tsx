import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { LocationProvider } from '@/contexts/LocationContext'
import { SpeciesProvider } from '@/contexts/SpeciesContext'
import { AccessibilityProvider } from '@/contexts/AccessibilityContext'
import { CookieBanner } from '@/components/layout/CookieBanner'
import { InstallPromptBanner } from '@/components/layout/InstallPromptBanner'
import loadingVideo from '@/assets/branding/app-loading.webm'

/**
 * V1.1.4 QA round 9 (Nicolas 2026-06-02) : BootSplash systematique au
 * premier mount avec video webm en grand format mobile (presque pleine
 * largeur) et raisonnable en desktop. Duree augmentee a 1800ms pour
 * laisser le temps de voir l animation complete (Nicolas : "il faut une
 * loupe pour voir le loader"). Si le feed est pret avant, on attend
 * quand meme la fin de la boucle pour ne pas couper.
 */
/**
 * V1.1.4 QA round 11 (Nicolas 2026-06-02) :
 * - Mobile : video EN PLEIN ECRAN (object-cover w-screen h-screen)
 * - Desktop : video 600px centree (taille "grand telephone" sur ecran)
 * - Affiche UNIQUEMENT au boot (pas a chaque refresh route). Utilise un
 *   flag sessionStorage : si deja vu cette session, on skip.
 *   Le flag est purge au sign out via AuthContext pour que le user voit
 *   le splash apres connexion (effet "bienvenue").
 */
const SPLASH_SEEN_KEY = 'naturegraph-splash-seen'

function BootSplash({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.sessionStorage.getItem(SPLASH_SEEN_KEY) !== '1'
    } catch {
      return true
    }
  })
  useEffect(() => {
    if (!show) return
    try {
      window.sessionStorage.setItem(SPLASH_SEEN_KEY, '1')
    } catch {
      // ignore (mode prive Safari)
    }
    const t = setTimeout(() => setShow(false), 1800)
    return () => clearTimeout(t)
  }, [show])
  if (show) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-cream-lighter overflow-hidden">
        <video
          src={loadingVideo}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          // Mobile : couvre tout l ecran (object-cover crop au besoin pour
          // remplir, comme une vraie splash screen native).
          // Desktop (sm+) : 600px centre, object-contain pour garder ratio.
          className="w-full h-full object-cover sm:w-[600px] sm:h-[600px] sm:object-contain"
        />
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  return (
    // reducedMotion="user" : toutes les animations motion/react respectent prefers-reduced-motion (WCAG AA)
    <MotionConfig reducedMotion="user">
      {/* AccessibilityProvider : gère taille du texte + contraste renforcé (localStorage + data-* sur <html>) */}
      <AccessibilityProvider>
        <ThemeProvider>
          <AuthProvider>
            <LocationProvider>
              {/* SpeciesProvider — Species Context Layer (PRD Recherche §3.4) */}
              <SpeciesProvider>
                <ToastProvider>
                  {/* Skip link global — pointe vers l'id="main-content" de chaque page */}
                  <a href="#main-content" className="skip-link">
                    Aller au contenu principal
                  </a>
                  {/* BootSplash : loader Naturegraph visible 900ms au tout premier
                      mount (cohérent avec branding sur boot PWA / mobile web). */}
                  <BootSplash>
                    <Outlet />
                  </BootSplash>
                  {/* InstallPromptBanner — propose l'installation PWA en haut
                      (Chrome beforeinstallprompt OU guide iOS Safari).
                      Affiché ~3 sec après chargement, dismissible 30 j. */}
                  <InstallPromptBanner />
                  {/* CookieBanner global — RGPD/ePrivacy/Loi 25 information layer.
                      Affiché une seule fois par navigateur (localStorage). */}
                  <CookieBanner />
                </ToastProvider>
              </SpeciesProvider>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </MotionConfig>
  )
}
