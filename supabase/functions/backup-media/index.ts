/**
 * backup-media : miroir append-only des fichiers storage (NG-037)
 * =============================================================================
 *
 * Pourquoi : les sauvegardes Supabase ne contiennent PAS les fichiers du
 * Storage (constaté sur la page Backups le 2026-07-22). Restaurer la base après
 * une perte de fichiers rendrait des publications pointant vers des images
 * disparues. Or les photos sont la donnée irremplaçable du projet.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GARANTIE DE SÛRETÉ : cette fonction ne supprime RIEN, jamais.
 *
 * Elle n'appelle aucune API de suppression (pas de .remove(), pas de delete).
 * Les seules opérations effectuées sont :
 *   - lire la liste des fichiers à copier (fonction SQL en lecture seule)
 *   - télécharger un fichier source
 *   - le déposer dans le bucket media-backup avec upsert:false, donc sans
 *     jamais écraser une copie existante
 *   - journaliser la copie
 *
 * Conséquence voulue : si un fichier disparaît de la source, sa copie reste
 * dans le miroir. C'est exactement le but d'une sauvegarde.
 * Toute évolution future de ce fichier doit respecter cette règle.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Marche par vagues (`limit`), car télécharger puis re-déposer des fichiers
 * prend du temps et une Edge Function a une durée d'exécution bornée.
 * Mode `dry_run` pour vérifier ce qui serait copié sans rien écrire.
 *
 * Sécurité : interne, authentifiée par x-cron-secret. verify_jwt = false.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const BUCKET_SAUVEGARDE = 'media-backup'

interface Pending {
  source_bucket: string
  source_path: string
  taille: number | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: JSON_HEADERS })
  }

  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: JSON_HEADERS,
    })
  }

  let body: { limit?: number; dry_run?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const limit = Math.min(Math.max(body.limit ?? 20, 1), 50)
  const dryRun = body.dry_run === true

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const { data, error } = await admin.rpc('list_media_backup_pending', { p_limit: limit })
    if (error) throw error
    const aCopier = (data ?? []) as Pending[]

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          a_copier_dans_cette_vague: aCopier.length,
          apercu: aCopier.slice(0, 5).map((f) => `${f.source_bucket}/${f.source_path}`),
        }),
        { status: 200, headers: JSON_HEADERS },
      )
    }

    let copies = 0
    let deja = 0
    const erreurs: string[] = []

    for (const fichier of aCopier) {
      const cheminSauvegarde = `${fichier.source_bucket}/${fichier.source_path}`

      // 1. Lecture du fichier source (aucune modification de la source).
      const { data: blob, error: errDl } = await admin.storage
        .from(fichier.source_bucket)
        .download(fichier.source_path)

      if (errDl || !blob) {
        erreurs.push(`${cheminSauvegarde}: lecture impossible (${errDl?.message ?? 'vide'})`)
        continue
      }

      // 2. Dépôt dans le miroir. upsert:false => on n'écrase jamais une copie
      //    déjà présente.
      const { error: errUp } = await admin.storage
        .from(BUCKET_SAUVEGARDE)
        .upload(cheminSauvegarde, blob, {
          upsert: false,
          contentType: blob.type || 'application/octet-stream',
        })

      // Un fichier déjà présent dans le miroir mais absent du journal (par
      // exemple si une vague précédente s'est interrompue entre les deux) n'est
      // pas une erreur : on le journalise et on passe.
      const dejaPresent = !!errUp && /exists|duplicate|409/i.test(errUp.message ?? '')

      if (errUp && !dejaPresent) {
        erreurs.push(`${cheminSauvegarde}: copie impossible (${errUp.message})`)
        continue
      }
      if (dejaPresent) deja += 1

      // 3. Journalisation (idempotente grâce à l'index unique).
      const { error: errLog } = await admin.from('media_backup_log').insert({
        source_bucket: fichier.source_bucket,
        source_path: fichier.source_path,
        backup_path: cheminSauvegarde,
        taille_octets: fichier.taille,
      })
      if (errLog && errLog.code !== '23505') {
        erreurs.push(`${cheminSauvegarde}: journal impossible (${errLog.message})`)
        continue
      }

      if (!dejaPresent) copies += 1
    }

    return new Response(
      JSON.stringify({
        ok: erreurs.length === 0,
        copies,
        deja_presents: deja,
        traites: aCopier.length,
        erreurs: erreurs.length ? erreurs : undefined,
      }),
      { status: 200, headers: JSON_HEADERS },
    )
  } catch (err) {
    console.error('[backup-media] erreur:', err)
    return new Response(
      JSON.stringify({
        ok: false,
        reason: 'internal_error',
        detail: err instanceof Error ? err.message : 'unknown',
      }),
      { status: 500, headers: JSON_HEADERS },
    )
  }
})
