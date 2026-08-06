/**
 * ProfileInspirations : Onglet "Inspirations" du profil (collection sauvegardée)
 *
 * Affiche les observations d'autres utilisateurs sauvegardées par ce profil
 * (table `saved_posts` côté backend) avec EXACTEMENT le même rendu que la vue
 * galerie du feed home : on délègue à <FeedGallery /> sans rien dupliquer.
 *
 *   - Layout masonry 2/3/4 colonnes selon breakpoint (.gallery-masonry)
 *   - Hover gradient + auteur + titre identiques au feed home
 *   - Badge multi-photos (Images icon + count) si post.images.length > 1
 *   - Clic → PhotoLightbox plein écran avec navigation
 *
 * État vide : card hermine + titre/sous-titre, même style que ProfileFeed.
 *
 * TODO [BACKEND] : Remplacer par savedPostService.getSavedPostsByUser(userId).
 *   Schéma : `saved_posts (user_id, post_id, created_at)` + JOIN sur `posts`.
 */

import { useTranslation } from 'react-i18next'
import { FeedGallery } from '@/components/home/FeedGallery'
import type { MockPost } from '@/components/home/FeedPost'
import { ProfileEmptyState } from '../ProfileEmptyState'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileInspirationsProps {
  /** Posts sauvegardés par l'utilisateur (collection / bookmarks) */
  savedPosts: MockPost[]
  /** Username pour les labels d'accessibilité (aria-label de la galerie) */
  username: string
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ProfileInspirations({ savedPosts, username }: ProfileInspirationsProps) {
  const { t } = useTranslation()

  // ─── État vide ──────────────────────────────────────────────────────────────
  if (savedPosts.length === 0) {
    return (
      <ProfileEmptyState
        title={t('profile.inspirations.emptyTitle', {
          defaultValue: 'Aucune inspiration sauvegardée',
        })}
        subtitle={t('profile.inspirations.emptySubtitle', {
          defaultValue:
            "Les observations qu'on sauvegarde apparaîtront ici pour s'en inspirer plus tard.",
        })}
      />
    )
  }

  // ─── Galerie masonry : réutilise FeedGallery du feed home ──────────────────
  // `-mx-4 md:mx-0` : annule le padding latéral du parent sur mobile pour que
  // la galerie touche les bords de l'écran (cohérence avec la vue grid du home).
  return (
    <div
      className="-mx-4 md:mx-0"
      aria-label={t('profile.inspirations.aria', {
        defaultValue: 'Collection de {{username}}',
        username,
      })}
    >
      <FeedGallery posts={savedPosts} />
    </div>
  )
}
