import { Outlet } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          {/* Skip link global — pointe vers l'id="main-content" de chaque page */}
          <a href="#main-content" className="skip-link">
            Aller au contenu principal
          </a>
          <Outlet />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
