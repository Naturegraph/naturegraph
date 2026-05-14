/**
 * validateImageMagic — Verification des magic numbers d'une image
 * ============================================================================
 *
 * Refs : T-062 (MASTER_TODO) + BATCH 24
 *
 * Pourquoi ?
 *   `file.type` (MIME) est inferre par le navigateur a partir de l'extension
 *   ou du upload header — facilement contournable. Un attaquant peut renommer
 *   un .exe en .jpg et le MIME sera quand meme `image/jpeg`.
 *
 * Solution : lire les premiers octets du fichier (magic numbers) qui sont
 * imposes par les standards de format. Tout fichier dont le MIME ne matche
 * pas la signature est rejete.
 *
 * Magic numbers verifies :
 *   JPEG  : FF D8 FF
 *   PNG   : 89 50 4E 47 0D 0A 1A 0A
 *   WebP  : RIFF....WEBP (offset 8)
 *   GIF   : 47 49 46 38 (rejete en MVP, pas dans whitelist)
 *
 * Note serveur :
 *   Cette validation client-side complete la verification MIME mais ne
 *   remplace PAS une validation serveur. Pour MVP : Edge Function
 *   `validate-upload` a deployer (cf. T-061).
 */

export type SupportedImageType = 'image/jpeg' | 'image/png' | 'image/webp'

/**
 * Verifie qu'un File a bien la signature magique correspondant a son MIME.
 * Retourne le MIME confirme ou null si invalide.
 */
export async function validateImageMagicNumber(file: File): Promise<SupportedImageType | null> {
  // On lit les 12 premiers octets — suffisant pour JPEG/PNG/WebP.
  const buffer = await file.slice(0, 12).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // JPEG : FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return file.type === 'image/jpeg' ? 'image/jpeg' : null
  }

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return file.type === 'image/png' ? 'image/png' : null
  }

  // WebP : RIFF (0-3) ... WEBP (8-11)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return file.type === 'image/webp' ? 'image/webp' : null
  }

  // Magic number ne matche aucun format supporte → rejet
  return null
}
