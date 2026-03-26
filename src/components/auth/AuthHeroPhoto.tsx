/**
 * AuthHeroPhoto — Colonne photo héro partagée entre les formulaires d'authentification
 *
 * Point de configuration unique : modifier HERO_PHOTO_CONFIG pour mettre à jour
 * la photo sur tous les écrans auth (SignupForm, LoginForm, VerificationForm).
 *
 * Gère :
 *   - Activation/désactivation (flag `active`)
 *   - Fallback si l'image ne charge pas (erreur réseau / asset manquant)
 *   - Crédit photo + lien Instagram cliquable (si instagramUrl fourni)
 *   - Masquage du crédit si photographerName est null
 *
 * TODO [BACKEND] — Photo communautaire dynamique :
 *   - Remplacer la config statique par un appel à `mediaService.getCommunityHeroPhoto()`
 *     qui retourne { src, alt, photographerName, instagramUrl, active }
 *   - La photo du mois peut être gérée via une table `community_photos` dans Supabase
 *     avec rotation programmée choisie par l'équipe (un seul enregistrement `is_active = true`)
 *   - Ajouter un flag `consentGiven` : ne pas afficher sans le consentement explicite
 *     du photographe (stocker dans `community_photos.consent_verified`)
 */

import { useState } from 'react'
import heroPhotoDefault from '@/assets/images/mission-observer.png'

// ─── Config centralisée ──────────────────────────────────────────────────────
// Un seul endroit pour changer la photo sur tous les écrans auth.
// TODO [BACKEND] — Remplacer par une lecture depuis `community_photos` (Supabase).

const HERO_PHOTO_CONFIG = {
  /** Activer la photo héro (false = colonne masquée, formulaire pleine largeur) */
  active: true,
  /** Asset importé — remplacer l'import en haut du fichier pour changer la photo */
  src: heroPhotoDefault,
  /** Texte alternatif accessible */
  alt: 'Photographie nature — communauté Naturegraph',
  /**
   * Nom du photographe affiché dans le crédit (null = pas de crédit).
   * TODO [BACKEND] — Lire depuis `community_photos.photographer_name`
   */
  photographerName: '@emie_photographie_nature' as string | null,
  /**
   * URL Instagram du photographe (null = nom affiché sans lien).
   * TODO [BACKEND] — Lire depuis `community_photos.instagram_url`
   */
  instagramUrl: 'https://www.instagram.com/emie_photographie_nature' as string | null,
}

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
  const [hasError, setHasError] = useState(false)
  const { active, src, alt, photographerName, instagramUrl } = HERO_PHOTO_CONFIG

  // Masquer si désactivé dans la config
  if (!active) return null

  return (
    <div className="hidden lg:flex relative h-full shrink-0 w-[512px]">
      <img
        src={hasError ? heroPhotoDefault : src}
        alt={alt}
        onError={() => setHasError(true)}
        className="absolute inset-0 w-full h-full object-cover rounded-r-[32px]"
      />

      {/* Crédit photo — affiché uniquement si photographerName est renseigné */}
      {photographerName && (
        <div className="absolute bg-[rgba(12,12,20,0.32)] bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg whitespace-nowrap">
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
        </div>
      )}
    </div>
  )
}
