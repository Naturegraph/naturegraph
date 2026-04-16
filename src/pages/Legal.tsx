/**
 * Legal — Mentions légales (en cours de développement)
 * ======================================================
 * Placeholder temporaire — contenu et design fournis ultérieurement.
 */

import { Link } from 'react-router-dom'
import { ArrowLeft, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Legal() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col items-center justify-center px-6 text-center">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        <div className="w-16 h-16 rounded-full bg-[var(--color-highlight-primary)]/10 flex items-center justify-center">
          <Wrench size={28} className="text-[var(--color-highlight-primary)]" />
        </div>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text-primary)]">
          {t('common.comingSoon', 'Bientôt disponible')}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
          {t(
            'common.pageInDevelopment',
            'Cette page est en cours de développement. Le contenu sera disponible très prochainement.',
          )}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-highlight-primary)] hover:underline mt-2"
        >
          <ArrowLeft size={16} />
          {t('common.backHome', "Retour à l'accueil")}
        </Link>
      </div>
    </div>
  )
}
