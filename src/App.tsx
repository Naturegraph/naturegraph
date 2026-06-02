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
function BootSplash({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1800)
    return () => clearTimeout(t)
  }, [])
  if (show) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-cream-lighter overflow-hidden">
        {/* QA round 10 (Nicolas 2026-06-02) : video DIRECTEMENT en grand
            sans wrapper AppLoader qui le contraignait. Mobile : h-[60vh]
            (60% hauteur ecran). Desktop : 480px max. */}
        <video
          src={loadingVideo}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          className="h-[60vh] w-auto max-w-[90vw] sm:h-[480px] sm:max-w-[480px] object-contain"
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
