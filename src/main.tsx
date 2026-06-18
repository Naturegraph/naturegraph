import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { queryClient } from './lib/queryClient'
import { initMonitoring } from './lib/monitoring'
import { router } from './router'
import { AppErrorBoundary } from './components/layout/AppErrorBoundary'
import { OnlineStatusBanner } from './components/layout/OnlineStatusBanner'
import './i18n'
import './styles/main.scss'
import './index.css'

// Initialise Sentry si VITE_SENTRY_DSN est defini (no-op sinon)
void initMonitoring()

/**
 * Recuperation des chunks perimes apres un deploiement (Nicolas 2026-06-04).
 *
 * Probleme : a chaque deploiement, Vite regenere des noms de fichiers hashes
 * (ex: NotFound-BEHJZ5di.js). Un onglet reste ouvert avec l'ancien index.html
 * en cache tente alors de charger un chunk dont le hash n'existe plus sur le
 * serveur -> 404 -> "Failed to fetch dynamically imported module" -> ecran
 * d'erreur. Tres frequent en beta ou on deploie souvent.
 *
 * Solution : Vite emet l'event `vite:preloadError` quand un import dynamique
 * echoue. On recharge la page UNE fois pour recuperer le nouvel index.html et
 * les bons chunks. Garde anti-boucle via sessionStorage : si un rechargement
 * recent n'a pas resolu (ex: vraie panne reseau), on laisse l'erreur remonter
 * a l'AppErrorBoundary au lieu de boucler indefiniment.
 */
window.addEventListener('vite:preloadError', (event) => {
  const RELOAD_KEY = 'ng:chunk-reload-at'
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? '0')
  if (Date.now() - last < 10_000) return // deja tente il y a moins de 10s
  event.preventDefault()
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* NG-004 : filet global pour les erreurs de rendu. Sans ca, une erreur
        dans un composant leaf detruit toute la page (ecran blanc). */}
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* V1.1.4 NG-004 Phase 1 : bandeau hors ligne global. Visible des
            que la connexion tombe, masque le reste du temps. */}
        <OnlineStatusBanner />
        <RouterProvider router={router} />
        {/* Vercel Web Analytics : pageviews + visiteurs uniques, no-op en dev.
            Minimum suffisant pour suivre la beta fermée (Nicolas 2026-05-24).
            Aucun cookie, conforme RGPD/Loi 25 QC. */}
        <Analytics />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
