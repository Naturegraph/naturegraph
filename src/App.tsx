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
import { AppLoader } from '@/components/ui/AppLoader'

/**
 * V1.1.4 QA round 8 (Nicolas 2026-06-01) : BootSplash systematique au
 * premier mount pour materialiser le branding (AppLoader webm Naturegraph)
 * et masquer les eventuels lags de boot session/lazy chunks. Duree min
 * 900ms, pas plus -> branding sans frustration.
 */
function BootSplash({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 900)
    return () => clearTimeout(t)
  }, [])
  if (show) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-cream-lighter">
        <AppLoader size="lg" />
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
