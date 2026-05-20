/**
 * CookieBanner — Information cookies essentiels (RGPD + ePrivacy + Loi 25)
 * =========================================================================
 *
 * Naturegraph n'utilise QUE des cookies strictement nécessaires (session
 * Supabase Auth, préférences langue, anti-spam Cloudflare). Selon les
 * lignes directrices CNIL, ces cookies ne nécessitent PAS de consentement
 * actif, mais l'utilisateur DOIT être informé de leur usage.
 *
 * Ce banner satisfait l'obligation d'information (sans bloquer l'expérience
 * comme un opt-in obligatoire le ferait). Si à l'avenir on ajoute des
 * cookies non essentiels (analytics, marketing), il faudra évoluer vers
 * un vrai cookie consent UI granulaire.
 *
 * Persistance : `localStorage['naturegraph-cookies-acknowledged']` = 'v1'
 *   - Aucun cookie tiers déposé pour mémoriser le choix
 *   - Survit au refresh, ne s'affiche qu'une fois par navigateur
 *   - Versionné (`v1`) pour pouvoir re-déclencher si la politique change
 *
 * Conformité :
 *   - RGPD Art. 12-13 (information transparente)
 *   - ePrivacy Directive 2009/136/EC (information sur les cookies)
 *   - Lignes directrices CNIL "cookies & traceurs" (2020 + maj 2023)
 *   - Loi 25 Art. 8.3 (transparence)
 *
 * Accessibilité :
 *   - Rôle `region` + `aria-label` (annoncé par screen readers)
 *   - Bouton focusable, `aria-label` explicite
 *   - Échap pour fermer (alt clavier, en plus du bouton)
 *   - `aria-live="polite"` pour annonce d'apparition
 *   - Position `bottom` non-bloquante (n'empêche pas la nav du contenu)
 *   - Contraste WCAG AA via tokens DS
 *
 * Éco-conception :
 *   - Aucune dépendance externe (Cookie banner libs = 30+ KB inutiles)
 *   - useEffect minimal (lecture localStorage 1 fois au mount)
 *   - Composant ~70 lignes, ~1 KB gzip
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Heading } from '@/components/ui/Heading'

const STORAGE_KEY = 'naturegraph-cookies-acknowledged'
const STORAGE_VERSION = 'v1'

/**
 * Lit le state d'acceptation depuis le localStorage.
 * Try/catch car localStorage peut être désactivé (mode privé Safari, etc.).
 */
function readAcknowledged(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === STORAGE_VERSION
  } catch {
    return false
  }
}

/**
 * Persiste l'acceptation dans le localStorage.
 * Silencieux si localStorage indisponible — pas de raison de bloquer l'UX.
 */
function writeAcknowledged(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, STORAGE_VERSION)
  } catch {
    /* localStorage désactivé : accepter pour la session courante uniquement */
  }
}

export function CookieBanner() {
  const { t } = useTranslation()
  // Lazy initial state — lu une seule fois au montage côté client.
  // Évite un useEffect avec setState (anti-pattern + erreur ESLint).
  // `typeof window` est défensif (Vite SPA n'a pas de SSR mais bonne pratique).
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return !readAcknowledged()
  })

  // handleAccept stable via useCallback pour pouvoir l'inclure dans les deps
  // de l'effet Escape sans déclencher de re-bind à chaque render.
  const handleAccept = useCallback(() => {
    writeAcknowledged()
    setOpen(false)
  }, [])

  // Ferme le banner sur Escape (accessibilité clavier complète)
  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleAccept()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, handleAccept])

  if (!open) return null

  return (
    <div
      role="region"
      aria-label={t('cookies.banner.ariaRegion', {
        defaultValue: 'Information sur les cookies',
      })}
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-50 bg-[var(--color-bg-primary)] border-t border-[var(--color-border)] shadow-lg"
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1 min-w-0">
          {/* Titre via primitive Heading h4 (DS) — coherence visuelle avec le reste de l'app */}
          <Heading level="h4" as="h2" color="primary" className="mb-1">
            {t('cookies.banner.title', { defaultValue: 'Cookies essentiels uniquement' })}
          </Heading>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {t('cookies.banner.message', {
              defaultValue:
                "Naturegraph utilise uniquement des cookies strictement nécessaires (session, préférences). Aucun cookie publicitaire ou de traçage n'est utilisé.",
            })}
            {/* Lien "En savoir plus" retiré (Nicolas 2026-05-20) : il pointait
                vers /privacy sans valeur ajoutée immédiate pour ce message
                déjà clair et autoporteur. */}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto">
          {/* Bouton primary (variant Button DS) — coherence avec tous les CTA primary de l'app */}
          <Button variant="primary" size="sm" onClick={handleAccept}>
            {t('cookies.banner.accept', { defaultValue: "J'ai compris" })}
          </Button>
          <button
            type="button"
            onClick={handleAccept}
            aria-label={t('cookies.banner.accept', { defaultValue: "J'ai compris" })}
            className="size-10 inline-flex items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover,rgba(0,0,0,0.05))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2 md:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
