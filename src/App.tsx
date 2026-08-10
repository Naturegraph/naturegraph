import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { LocationProvider } from '@/contexts/LocationContext'
import { SpeciesProvider } from '@/contexts/SpeciesContext'
import { AccessibilityProvider } from '@/contexts/AccessibilityContext'
import { NotebookProvider } from '@/contexts/NotebookContext'
import { CookieBanner } from '@/components/layout/CookieBanner'
import { InstallPromptBanner } from '@/components/layout/InstallPromptBanner'
import { AppBadgeSync } from '@/components/layout/AppBadgeSync'
import { ActivityHeartbeat } from '@/components/layout/ActivityHeartbeat'
import { SentryRouteTracker } from '@/components/layout/SentryRouteTracker'
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
// V1.1.4 NG-004B MAJ (Nicolas 2026-06-03) : duree mini de la video splash
// (animation pleine boucle). Avant on relachait toujours apres ce timeout
// sans verifier l'etat d'auth, ce qui creait une race condition au boot
// PWA : le Router decidait Landing avant que la session ne soit restored.
const SPLASH_MIN_DURATION_MS = 1800
// Fail-safe absolu : meme si l'auth ne resout pas (reseau coupe, Supabase
// down, etc), on libere le splash pour ne pas figer l'app indefiniment.
// 6s permet d'absorber le cold start Supabase (5s timeout AuthContext + 1s
// marge) sur reseau mobile lent (3G/4G rurale Quebec).
const SPLASH_MAX_DURATION_MS = 6000

function BootSplash({ children }: { children: React.ReactNode }) {
  // V1.1.4 NG-004B MAJ : on consulte aussi l'etat d'auth. Le splash reste
  // visible tant que la session n'est pas resolue (isLoading=true cote
  // AuthContext), pour eviter que le Router decide Landing alors que la
  // session Supabase est en cours de restore.
  const { isLoading: isAuthLoading } = useAuth()
  const [skipSplash] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      // Le splash video ne sert QU'AU lancement mobile / PWA (retour Nicolas
      // 2026-08-10). Sur desktop (et a chaque refresh), le carton creme "pollue"
      // visuellement entre le loader et le squelette. Desktop = viewport large ->
      // JAMAIS de splash, l'app rend directement (chaque route gere son loader).
      // Mobile (browser ou PWA installee) = viewport etroit -> splash au 1er
      // lancement de la session uniquement (flag ci-dessous).
      const isMobile = window.matchMedia('(max-width: 767px)').matches
      if (!isMobile) return true
      return window.sessionStorage.getItem(SPLASH_SEEN_KEY) === '1'
    } catch {
      return true
    }
  })
  const [animFinished, setAnimFinished] = useState(false)
  const [forceHide, setForceHide] = useState(false)

  useEffect(() => {
    if (skipSplash) return
    try {
      window.sessionStorage.setItem(SPLASH_SEEN_KEY, '1')
    } catch {
      // ignore (mode prive Safari)
    }
    const animTimer = setTimeout(() => setAnimFinished(true), SPLASH_MIN_DURATION_MS)
    const maxTimer = setTimeout(() => {
      console.warn('[BootSplash] fail-safe : auth toujours en cours apres 6s, on relache')
      setForceHide(true)
    }, SPLASH_MAX_DURATION_MS)
    return () => {
      clearTimeout(animTimer)
      clearTimeout(maxTimer)
    }
  }, [skipSplash])

  // V1.1.4 NG-004B MAJ : si skipSplash=true (refresh dans la meme session),
  // on considere l'animation comme deja "finie" et on attend juste auth.
  // Sinon, on attend min 1800ms (animation video) ET auth resolu.
  // Le fail-safe (forceHide) libere apres 6s dans tous les cas.
  // REFRESH / navigation dans la MEME session : le splash ne sert QU'AU tout
  // premier lancement de l'app ("on l'utilise uniquement pour lancer l'app",
  // Nicolas). Ici on ne remet AUCUN ecran de chargement par-dessus : l'app rend
  // directement, et chaque route gere son propre etat (ProtectedRoute ->
  // AppLoader, Home -> squelette du feed). Avant, un ecran vide s'ajoutait au
  // squelette = "deux loaders" + un residu blanc au refresh (2026-07-30).
  if (skipSplash) return <>{children}</>

  // Tout premier lancement de la session : splash video branded, le temps de
  // l'animation ET de la resolution d'auth (evite que le Router decide Landing
  // avant que la session Supabase soit restauree, NG-004B).
  const shouldBlock = !forceHide && (isAuthLoading || !animFinished)

  if (shouldBlock) {
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
              {/* SpeciesProvider : Species Context Layer (PRD Recherche §3.4) */}
              <SpeciesProvider>
                {/* NotebookProvider V1.2.0 (NG-005/006) : gere le carnet
                    d observations actif (mode terrain). Recovery au boot
                    si l user avait un carnet draft/active cote serveur. */}
                <NotebookProvider>
                  <ToastProvider>
                    {/* Skip link global : pointe vers l'id="main-content" de chaque page */}
                    <a href="#main-content" className="skip-link">
                      Aller au contenu principal
                    </a>
                    {/* BootSplash : loader Naturegraph visible 900ms au tout premier
                      mount (cohérent avec branding sur boot PWA / mobile web). */}
                    <BootSplash>
                      {/* Bandeau sticky mode carnet (NG-006) RETIRE le 2026-06-08
                          (Nicolas : peu utile + visuellement lourd ; refonte
                          produit a venir). Le carnet reste accessible via le
                          menu "+ Contribuer". Composant conserve pour reprise. */}
                      <Outlet />
                    </BootSplash>
                    {/* InstallPromptBanner : propose l'installation PWA en haut
                      (Chrome beforeinstallprompt OU guide iOS Safari).
                      Affiché ~3 sec après chargement, dismissible 30 j. */}
                    <InstallPromptBanner />
                    {/* CookieBanner global : RGPD/ePrivacy/Loi 25 information layer.
                      Affiché une seule fois par navigateur (localStorage). */}
                    <CookieBanner />
                    {/* AppBadgeSync : pastille "non lues" sur l'icône PWA, pilotée
                      au niveau app (active sur toutes les pages, pas seulement Home). */}
                    <AppBadgeSync />
                    <ActivityHeartbeat />
                    {/* Tag Sentry `route` a chaque navigation (triage par ecran). */}
                    <SentryRouteTracker />
                  </ToastProvider>
                </NotebookProvider>
              </SpeciesProvider>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </MotionConfig>
  )
}
