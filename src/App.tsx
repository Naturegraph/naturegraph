import { Outlet } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { LocationProvider } from '@/contexts/LocationContext'

export default function App() {
  return (
    // reducedMotion="user" : toutes les animations motion/react respectent prefers-reduced-motion (WCAG AA)
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <LocationProvider>
            <NotificationProvider>
              {/* Skip link global — pointe vers l'id="main-content" de chaque page */}
              <a href="#main-content" className="skip-link">
                Aller au contenu principal
              </a>
              <Outlet />
            </NotificationProvider>
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
