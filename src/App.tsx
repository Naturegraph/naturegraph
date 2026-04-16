import { Outlet } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { LocationProvider } from '@/contexts/LocationContext'
import { SpeciesProvider } from '@/contexts/SpeciesContext'

export default function App() {
  return (
    // reducedMotion="user" : toutes les animations motion/react respectent prefers-reduced-motion (WCAG AA)
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <LocationProvider>
            {/* SpeciesProvider — Species Context Layer (PRD Recherche §3.4) */}
            <SpeciesProvider>
              <NotificationProvider>
                {/* Skip link global — pointe vers l'id="main-content" de chaque page */}
                <a href="#main-content" className="skip-link">
                  Aller au contenu principal
                </a>
                <Outlet />
              </NotificationProvider>
            </SpeciesProvider>
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
