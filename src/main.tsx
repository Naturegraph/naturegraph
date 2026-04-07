import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { initMonitoring } from './lib/monitoring'
import { router } from './router'
import './i18n'
import './styles/main.scss'
import './index.css'

// Initialise Sentry si VITE_SENTRY_DSN est defini (no-op sinon)
void initMonitoring()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
