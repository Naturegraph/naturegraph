/**
 * AuthHeroPhoto — Colonne photo héro partagée entre les formulaires d'authentification
 *
 * Source de vérité : table `community_photos` dans Supabase.
 * Règles :
 *   - Un seul enregistrement `is_active = true` + `consent_verified = true` à la fois
 *   - Si aucune photo active en base → fallback sur l'asset local (kingfisher)
 *   - Si l'image ne charge pas (erreur réseau) → même fallback
 *
 * Pour changer la photo d'un membre :
 *   1. Upload l'image dans Supabase Storage (bucket 'community-photos')
 *   2. Insérer une ligne dans `community_photos` avec is_active=true, consent_verified=true
 *   3. Mettre is_active=false sur l'ancienne ligne
 *   → Le composant se met à jour sans toucher au code
 *
 * Pour ajouter un crédit photographe :
 *   → Renseigner photographer_name et instagram_url dans la ligne Supabase
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCommunityHeroPhoto } from '@/services'
import heroPhotoFallback from '@/assets/images/cta-kingfisher.png'

// ─── Icône Instagram ──────────────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="text-text-light shrink-0"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function AuthHeroPhoto() {
  const [imgError, setImgError] = useState(false)

  // Fetch depuis Supabase — staleTime long car la photo change rarement
  const { data: communityPhoto } = useQuery({
    queryKey: ['communityHeroPhoto'],
    queryFn: getCommunityHeroPhoto,
    staleTime: 1000 * 60 * 60, // 1h
    retry: false,
  })

  // Fallback : asset local si pas de photo en base ou src vide
  const src = !imgError && communityPhoto?.src ? communityPhoto.src : heroPhotoFallback

  const alt = communityPhoto?.alt ?? 'Martin-pêcheur — Naturegraph'
  const tagline = communityPhoto?.tagline ?? 'Partageons nos émotions'
  const photographerName = communityPhoto?.photographerName ?? null
  const instagramUrl = communityPhoto?.instagramUrl ?? null

  return (
    <div className="hidden lg:flex relative h-full shrink-0 w-[512px]">
      <img
        src={src}
        alt={alt}
        onError={() => setImgError(true)}
        className="absolute inset-0 w-full h-full object-cover rounded-r-[32px]"
      />

      {/* Crédit photographe (si renseigné) ou tagline de marque */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-[rgba(12,12,20,0.32)] whitespace-nowrap">
        {photographerName ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-2 items-center">
              <InstagramIcon />
              <p className="italic text-text-light text-[12px] tracking-wide">Crédit photo</p>
            </div>
            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-text-light text-sm underline hover:opacity-80 transition-opacity"
              >
                {photographerName}
              </a>
            ) : (
              <span className="font-bold text-text-light text-sm">{photographerName}</span>
            )}
          </div>
        ) : (
          <p className="text-text-light text-sm font-semibold tracking-wide italic">{tagline}</p>
        )}
      </div>
    </div>
  )
}
