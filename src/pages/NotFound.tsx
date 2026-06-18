/**
 * NotFound : Page 404 "Page introuvable"
 *
 * BATCH 116 (V1 patch) : refonte moderne mobile-first.
 *   - Illustration décorative (hermine + leaves) au lieu d'un simple "404" géant
 *   - Animation discrète (Motion fade-in respectant prefers-reduced-motion)
 *   - 2 actions claires : retour accueil + recherche
 *   - Suggestion de pages utiles (rich helper plutôt que cul-de-sac)
 *   - Responsive 360px → desktop, WCAG 2.5.5 touch targets
 *
 * Cas d'usage :
 *   - URL tapée à la main inexistante (catch-all `*` dans le router)
 *   - Lien partagé devenu obsolète (post supprimé, profil banni, etc.)
 *   - Bypass tentative de routes admin sans être logged in
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, Search, Home, Compass } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import hermineIcon from '@/assets/images/hermine-icon.png'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

export default function NotFound() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  usePageTitle(t('notFound.title', { defaultValue: 'Page introuvable' }))

  // Si l'utilisateur a désactivé les animations système, on n'anime pas
  const initial = reduceMotion ? 'visible' : 'hidden'

  return (
    <main
      id="main-content"
      className="flex flex-col items-center justify-center min-h-screen min-h-[100svh] gap-8 px-4 py-12 text-center bg-[var(--color-bg-secondary)]"
    >
      {/* Illustration décorative : hermine sur badge + orbe gradient.
          aria-hidden car uniquement décoratif (le texte porte le sens). */}
      <motion.div
        initial={initial}
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative"
        aria-hidden="true"
      >
        {/* Orbe blur derrière l'icône (cohérent style Hero) */}
        <div
          className="absolute inset-0 -m-12 rounded-full blur-[60px] opacity-50"
          style={{
            background: `radial-gradient(circle, var(--color-action-default) 0%, transparent 70%)`,
          }}
        />
        <div className="relative size-32 rounded-full bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] flex items-center justify-center shadow-lg">
          <img src={hermineIcon} alt="" className="size-16" width={64} height={64} />
        </div>
      </motion.div>

      {/* Bloc texte */}
      <motion.div
        initial={initial}
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className="flex flex-col gap-3 max-w-md"
      >
        <p
          className="text-sm font-bold tracking-widest text-[var(--color-action-default)] uppercase"
          aria-label="Erreur 404"
        >
          404 · {t('notFound.eyebrow', { defaultValue: 'Page introuvable' })}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
          {t('notFound.title', {
            defaultValue: 'Cette page a migré ailleurs',
          })}
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          {t('notFound.description', {
            defaultValue:
              "L'adresse que tu cherches n'existe pas ou a été déplacée. Pas de panique, on te ramène en terrain connu.",
          })}
        </p>
      </motion.div>

      {/* Actions principales : 2 CTA mobile-first */}
      <motion.div
        initial={initial}
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
        className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm"
      >
        <Link
          to="/"
          className="btn-press btn-press-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto h-12 px-6 rounded-full bg-[var(--color-action-default)] text-[var(--color-text-white)] font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-action-default)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('notFound.backHome', { defaultValue: "Retour à l'accueil" })}
        </Link>
        <Link
          to="/home"
          className="btn-press btn-press-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto h-12 px-6 rounded-full bg-[var(--color-bg-primary)] border-[0.5px] border-[var(--color-border)] text-foreground font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-action-default)]"
        >
          <Compass className="size-4" aria-hidden="true" />
          {t('notFound.exploreFeed', { defaultValue: 'Explorer le feed' })}
        </Link>
      </motion.div>

      {/* Suggestions rapides : quick links pour ne pas laisser l'user sans option */}
      <motion.nav
        initial={initial}
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
        aria-label={t('notFound.suggestionsLabel', {
          defaultValue: 'Suggestions de pages',
        })}
        className="flex flex-col gap-2 w-full max-w-sm"
      >
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {t('notFound.tryThese', { defaultValue: 'Ou essaie ces pages' })}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <SuggestionTile
            to="/search"
            icon={<Search className="size-4" aria-hidden="true" />}
            label={t('notFound.search', { defaultValue: 'Rechercher' })}
          />
          <SuggestionTile
            to="/notifications"
            icon={<Home className="size-4" aria-hidden="true" />}
            label={t('notFound.notifications', {
              defaultValue: 'Notifications',
            })}
          />
        </div>
      </motion.nav>
    </main>
  )
}

// ─── Sub-component : tuile suggestion ────────────────────────────────────────

function SuggestionTile({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm font-medium text-foreground hover:border-[var(--color-action-default)] hover:bg-[var(--color-bg-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)]"
    >
      <span className="size-8 rounded-full bg-primary-light text-primary inline-flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  )
}
