/**
 * Forbidden : Page 403 "Acces refuse" (NG-021)
 *
 * Affichee pour les acces refuses generiques (espace reserve, ressource privee).
 *
 * Note securite : l'acces a /admin sans role admin NE passe PAS par ici. AdminGuard
 * redirige silencieusement vers /home pour ne PAS reveler l'existence de /admin
 * (anti-leak). Aucune raison technique du refus n'est exposee ici non plus. noindex.
 *
 * Composant rendu DANS le router : <Link> et hooks react-router OK.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, LogIn } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useNoIndex } from '@/hooks/useNoIndex'
import hermineIcon from '@/assets/images/hermine-icon.png'

export default function Forbidden() {
  const { t } = useTranslation()
  usePageTitle(t('forbidden.title', { defaultValue: 'Cet espace est reserve' }))
  useNoIndex()

  return (
    <main
      id="main-content"
      className="flex flex-col items-center justify-center min-h-screen min-h-[100svh] gap-8 px-4 py-12 text-center bg-[var(--color-bg-secondary)]"
    >
      <div className="relative" aria-hidden="true">
        <div
          className="absolute inset-0 -m-12 rounded-full blur-[60px] opacity-50"
          style={{
            background: `radial-gradient(circle, var(--color-action-default) 0%, transparent 70%)`,
          }}
        />
        <div className="relative size-32 rounded-full bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] flex items-center justify-center shadow-lg">
          <img src={hermineIcon} alt="" className="size-16" width={64} height={64} />
        </div>
      </div>

      <div className="flex flex-col gap-3 max-w-md">
        <p
          className="text-sm font-bold tracking-widest text-[var(--color-action-default)] uppercase"
          aria-label="Erreur 403"
        >
          403 · {t('forbidden.eyebrow', { defaultValue: 'Acces refuse' })}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
          {t('forbidden.title', { defaultValue: 'Cet espace est reserve' })}
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          {t('forbidden.description', {
            defaultValue:
              "Tu n'as pas acces a cette page. Reviens sur tes pas, on te ramene en terrain connu.",
          })}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
        <Link
          to="/"
          className="btn-press btn-press-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto h-12 px-6 rounded-full bg-[var(--color-action-default)] text-[var(--color-text-white)] font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-action-default)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('forbidden.backHome', { defaultValue: "Retour a l'accueil" })}
        </Link>
        <Link
          to="/login"
          className="btn-press btn-press-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto h-12 px-6 rounded-full bg-[var(--color-bg-primary)] border-[0.5px] border-[var(--color-border)] text-foreground font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-action-default)]"
        >
          <LogIn className="size-4" aria-hidden="true" />
          {t('forbidden.login', { defaultValue: 'Se connecter' })}
        </Link>
      </div>
    </main>
  )
}
