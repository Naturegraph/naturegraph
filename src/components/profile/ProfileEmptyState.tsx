/**
 * ProfileEmptyState : État vide commun à tous les onglets du profil
 * ===================================================================
 *
 * Card centrée bordered avec illustration hermine + titre H3 + sous-titre muted.
 * Utilisé par :
 *   - ProfileFeed (Journal nature vide)
 *   - ProfileInspirations (collection vide)
 *   - ProfileCommunity (Migrateurs / Migrations vides)
 *   - ProfileStats (placeholder Bientôt)
 *
 * Auparavant ce pattern était dupliqué 5×. Centraliser ici garantit la
 * cohérence DS (même padding, même typo, même border) et facilite les
 * évolutions (ex: ajout d'un CTA en bas, changement d'illustration).
 *
 * Variant `compact` = card plus serrée (utile dans ProfileStats où le
 * contenu environnant est moins riche).
 */

import hermineEmptyState from '@/assets/images/hermine-empty-state.png'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ProfileEmptyStateProps {
  /** Titre principal (H3, font-title bold) */
  title: string
  /** Sous-titre descriptif (sm muted-foreground) */
  subtitle?: string
  /** Variant compact pour les zones plus restreintes */
  compact?: boolean
  /** Children optionnels rendus sous le subtitle (ex: CTA button) */
  children?: React.ReactNode
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ProfileEmptyState({
  title,
  subtitle,
  compact = false,
  children,
}: ProfileEmptyStateProps) {
  return (
    <div
      className={`bg-background rounded-md border-[0.5px] border-border flex flex-col items-center justify-center px-6 gap-4 ${
        compact ? 'py-8' : 'py-12'
      }`}
      role="status"
    >
      <img
        src={hermineEmptyState}
        alt=""
        className={`h-auto object-contain ${compact ? 'w-28 md:w-32' : 'w-40 md:w-48'}`}
        loading="lazy"
        // Dimensions intrinsèques de l'image (PNG hermine 320×320 environ).
        // h-auto + object-contain préservent le ratio natif quoi qu'il arrive.
        width={compact ? 128 : 192}
        height={compact ? 128 : 192}
      />
      <div className="flex flex-col items-center gap-2 text-center max-w-md">
        <h3 className="font-title font-bold text-lg text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
