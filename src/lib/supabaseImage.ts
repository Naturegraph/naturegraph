/**
 * supabaseImage, Helpers Supabase Storage Image Transformations
 * ===============================================================
 *
 * Pro plan inclut les transformations d images a la volee sur les URLs
 * Supabase Storage. On peut resize, recadrer, changer le format sans
 * regenerer les fichiers source. Gain perf enorme sur mobile :
 *   - Avatar 56px : 2 MB original to 8 KB transforme
 *   - Post feed 800px : 5 MB original to 180 KB transforme
 *
 * Format URL :
 *   /storage/v1/object/public/<bucket>/<path>?width=400&height=400&resize=cover&quality=80
 *
 * Note : seules les URLs Supabase Storage acceptent ces parametres. Pour
 * les URLs externes (avatar OAuth, photos profil GBIF), les helpers
 * retournent l URL d origine sans modification.
 *
 * Reference : https://supabase.com/docs/guides/storage/serving/image-transformations
 *
 * Mise en place : 2026-05-24, Phase A Supabase Pro roadmap.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageTransformOptions {
  /** Largeur cible en pixels. Si seul `width` fourni, hauteur ajustee auto. */
  width?: number
  /** Hauteur cible en pixels. */
  height?: number
  /**
   * Mode de redimensionnement :
   *   - `cover` (default) : recadre pour remplir, sans deformation
   *   - `contain` : adapte sans recadrer, conserve les proportions
   *   - `fill` : etire pour remplir, peut deformer
   */
  resize?: 'cover' | 'contain' | 'fill'
  /** Qualite JPEG/WebP 20-100. Default 80, bon compromis taille/qualite. */
  quality?: number
  /**
   * Format de sortie. `origin` garde le format du fichier source. Pour la
   * conversion WebP/AVIF, le navigateur recoit via `Accept` header le meilleur
   * format supporte, donc inutile de forcer ici dans 99% des cas.
   */
  format?: 'origin'
}

// ─── Detection URL Supabase Storage ──────────────────────────────────────────

/**
 * Verifie si l URL est servie par Supabase Storage. Seules ces URLs supportent
 * les query params de transformation. Pour les autres (CDN externe, OAuth
 * provider, GBIF media), on laisse l URL intacte.
 *
 * On match `/storage/v1/object/` qui est commun aux endpoints public et
 * authentifies, sans coupler le helper a un project ref specifique.
 */
function isSupabaseStorageUrl(url: string): boolean {
  return typeof url === 'string' && url.includes('/storage/v1/object/')
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Transforme une URL Supabase Storage en ajoutant les query params de
 * redimensionnement. Si l URL n est pas Supabase, retourne l URL d origine.
 *
 * Retourne aussi l URL d origine si `url` est null/undefined/vide pour
 * faciliter l usage : `<img src={transformImageUrl(user.avatar_url, ...)}>`.
 *
 * @example
 *   transformImageUrl(avatarUrl, { width: 56, height: 56, resize: 'cover' })
 *   transformImageUrl(bannerUrl, { width: 1200, quality: 75 })
 */
export function transformImageUrl(
  url: string | null | undefined,
  opts: ImageTransformOptions = {},
): string {
  if (!url) return ''
  if (!isSupabaseStorageUrl(url)) return url

  // Reuse URL parser pour ne pas casser les query params eventuels (token,
  // signature pour les buckets prives, etc.)
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url // URL invalide, on retourne tel quel sans crash
  }

  if (opts.width !== undefined) parsed.searchParams.set('width', String(opts.width))
  if (opts.height !== undefined) parsed.searchParams.set('height', String(opts.height))
  if (opts.resize) parsed.searchParams.set('resize', opts.resize)
  if (opts.quality !== undefined) {
    // Garde-fou : Supabase clampe deja 20-100 mais on previent au cas ou
    const q = Math.max(20, Math.min(100, opts.quality))
    parsed.searchParams.set('quality', String(q))
  }
  if (opts.format) parsed.searchParams.set('format', opts.format)

  return parsed.toString()
}

// ─── Presets metier Naturegraph ──────────────────────────────────────────────

/**
 * Presets prets a l emploi pour les usages courants. Chaque preset documente
 * le contexte UI et la taille DOM cible (pour eviter de servir du 2000px sur
 * un avatar 56px).
 *
 * Multiplie x2 implicite pour ecrans Retina via le navigateur, on garde donc
 * la taille DOM en input ici.
 */
export const ImagePresets = {
  /** Avatar header / profil 40-56px, ratio 1:1 cover */
  avatarSmall: (url: string | null | undefined) =>
    transformImageUrl(url, { width: 96, height: 96, resize: 'cover', quality: 80 }),

  /** Avatar grosse taille profil 80-128px */
  avatarLarge: (url: string | null | undefined) =>
    transformImageUrl(url, { width: 192, height: 192, resize: 'cover', quality: 85 }),

  /** Banner profil header, ratio ~5:2, max 1200px de large */
  banner: (url: string | null | undefined) =>
    transformImageUrl(url, { width: 1200, resize: 'cover', quality: 75 }),

  /** Photo dans feed mobile/desktop, ratio variable, ~800-1000px */
  feedPhoto: (url: string | null | undefined) =>
    transformImageUrl(url, { width: 1000, resize: 'cover', quality: 80 }),

  /** Thumbnail (galerie posts, NotificationsPanel, SearchPanel) ~120-200px */
  thumbnail: (url: string | null | undefined) =>
    transformImageUrl(url, { width: 240, height: 240, resize: 'cover', quality: 75 }),

  /** Photo pleine resolution (lightbox, detail post zoom), ~1600-2000px */
  fullSize: (url: string | null | undefined) =>
    transformImageUrl(url, { width: 2000, quality: 90 }),
} as const
