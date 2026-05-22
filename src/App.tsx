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
                  <Outlet />
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
