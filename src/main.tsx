import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { queryClient } from './lib/queryClient'
import { initMonitoring } from './lib/monitoring'
import { router } from './router'
import { AppErrorBoundary } from './components/layout/AppErrorBoundary'
import './i18n'
import './styles/main.scss'
import './index.css'

// Initialise Sentry si VITE_SENTRY_DSN est defini (no-op sinon)
void initMonitoring()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* NG-004 : filet global pour les erreurs de rendu. Sans ca, une erreur
        dans un composant leaf detruit toute la page (ecran blanc). */}
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {/* Vercel Web Analytics — pageviews + visiteurs uniques, no-op en dev.
            Minimum suffisant pour suivre la beta fermée (Nicolas 2026-05-24).
            Aucun cookie, conforme RGPD/Loi 25 QC. */}
        <Analytics />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
